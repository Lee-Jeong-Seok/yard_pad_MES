// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: transfer.js
// 설명: [3] 야드 이송 및 Double-Scan 로케이션 매핑 REST API 라우터
// =============================================================================

const express = require('express');
const router = express.Router();
const { sql, getPool, isMock, mockDb } = require('../config/db');

// 1. 야드 로케이션 목록 및 현황 조회
router.get('/locations', async (req, res) => {
  try {
    if (isMock()) {
      return res.json({ success: true, data: mockDb.locations });
    }

    const pool = getPool();
    const result = await pool.request().query('SELECT * FROM TB_YARD_LOCATION ORDER BY ZONE, LOC_CODE');
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('로케이션 목록 조회 오류:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. 야드 이송 Double-Scan 처리 (자재 바코드 -> 목적지 로케이션)
router.post('/move', async (req, res) => {
  try {
    const { barcode, toLocation, worker } = req.body;

    if (!barcode || !toLocation) {
      return res.status(400).json({ success: false, message: '자재 바코드 및 이동할 로케이션 코드는 필수입니다.' });
    }

    if (isMock()) {
      const material = mockDb.orders.find(o => o.BARCODE === barcode);
      if (!material) {
        return res.status(404).json({ success: false, message: '해당 바코드의 자재를 찾을 수 없습니다.' });
      }

      const fromLocation = material.CURRENT_LOC || 'UNASSIGNED';

      // 이송 이력 저장
      mockDb.transfers.push({
        TRANSFER_ID: mockDb.transfers.length + 1,
        BARCODE: barcode,
        FROM_LOC: fromLocation,
        TO_LOC: toLocation,
        WORKER: worker || '현장이송자',
        TRANSFER_DATE: new Date().toISOString()
      });

      // 자재 현재 위치 갱신
      material.CURRENT_LOC = toLocation;

      return res.json({
        success: true,
        message: `자재 [${barcode}]의 위치가 [${fromLocation}] -> [${toLocation}] (으)로 실시간 갱신되었습니다.`,
        data: { barcode, fromLocation, toLocation }
      });
    }

    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1) 기존 위치 확인
      const checkRes = await transaction.request()
        .input('barcode', sql.NVarChar, barcode)
        .query('SELECT TOP 1 CURRENT_LOC FROM TB_YARD_MATERIAL WHERE BARCODE = @barcode');

      if (checkRes.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: '해당 바코드의 자재를 찾을 수 없습니다.' });
      }

      const fromLocation = checkRes.recordset[0].CURRENT_LOC || 'UNASSIGNED';

      // 2) 이송 이력 기록
      await transaction.request()
        .input('barcode', sql.NVarChar, barcode)
        .input('fromLoc', sql.NVarChar, fromLocation)
        .input('toLoc', sql.NVarChar, toLocation)
        .input('worker', sql.NVarChar, worker || '현장이송자')
        .query(`
          INSERT INTO TB_YARD_STOCK_LOC (BARCODE, FROM_LOC, TO_LOC, WORKER, TRANSFER_DATE)
          VALUES (@barcode, @fromLoc, @toLoc, @worker, GETDATE())
        `);

      // 3) 자재 위치 갱신
      await transaction.request()
        .input('barcode', sql.NVarChar, barcode)
        .input('toLoc', sql.NVarChar, toLocation)
        .query(`
          UPDATE TB_YARD_MATERIAL 
          SET CURRENT_LOC = @toLoc, UPD_DATE = GETDATE()
          WHERE BARCODE = @barcode
        `);

      await transaction.commit();
      res.json({
        success: true,
        message: `자재 위치가 [${fromLocation}]에서 [${toLocation}]로 성공적으로 변경되었습니다.`
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('야드 이송 처리 오류:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
