// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: handover.js
// 설명: [4] 공정/물류 인계 및 터치 전자서명 REST API 라우터
// =============================================================================

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sql, getPool, isMock, mockDb } = require('../config/db');

const uploadDir = path.resolve(__dirname, '../../uploads');

// 1. 인계 대상 품목 목록 조회
router.get('/items', async (req, res) => {
  try {
    if (isMock()) {
      const list = mockDb.orders.filter(item => 
        item.MATERIAL_STATUS === 'HANDOVER_WAIT' || 
        item.MATERIAL_STATUS === 'STOCK'
      );
      return res.json({ success: true, data: list, count: list.length });
    }

    const pool = getPool();
    const result = await pool.request().query(`
      SELECT * FROM VW_YARD_INBOUND_LIST 
      WHERE MATERIAL_STATUS IN ('HANDOVER_WAIT', 'STOCK')
      ORDER BY INBOUND_PLAN_DATE DESC
    `);

    res.json({ success: true, data: result.recordset, count: result.recordset.length });
  } catch (err) {
    console.error('인계 대상 품목 조회 오류:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. 인계 완료 처리 및 터치 전자서명 저장
router.post('/submit', async (req, res) => {
  try {
    const {
      targetDept,
      receiverName,
      signatureData,   // Base64 Data URL 또는 이미지 경로
      items            // Array of barcodes [{ barcode, qty }]
    } = req.body;

    if (!targetDept || !receiverName || !signatureData || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: '인수부서, 인수자 성명, 전자서명 및 1개 이상의 인계 품목이 필요합니다.'
      });
    }

    // Base64 서명 이미지를 PNG 파일로 저장
    let signatureUrl = signatureData;
    if (signatureData.startsWith('data:image/')) {
      const matches = signatureData.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1] === 'png' ? 'png' : 'jpg';
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `sign_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, buffer);
        signatureUrl = `/uploads/${filename}`;
      }
    }

    const handoverNo = `HO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const barcodes = items.map(it => it.barcode);
    const totalQty = items.reduce((sum, it) => sum + (parseFloat(it.qty) || 0), 0);

    if (isMock()) {
      mockDb.handovers.push({
        HANDOVER_NO: handoverNo,
        TARGET_DEPT: targetDept,
        RECEIVER_NAME: receiverName,
        SIGNATURE_DATA: signatureUrl,
        ITEM_COUNT: items.length,
        TOTAL_QTY: totalQty,
        BARCODES: JSON.stringify(barcodes),
        STATUS: 'COMPLETED',
        HANDOVER_DATE: new Date().toISOString()
      });

      // 대상 자재 상태 변경
      barcodes.forEach(bc => {
        const mat = mockDb.orders.find(o => o.BARCODE === bc);
        if (mat) {
          mat.MATERIAL_STATUS = 'COMPLETED';
          mat.CURRENT_LOC = `투입:${targetDept}`;
        }
      });

      return res.json({
        success: true,
        message: `공정 인계 및 전자서명 날인이 완료되었습니다. (인계번호: ${handoverNo})`,
        data: {
          handoverNo,
          signatureUrl,
          totalQty,
          itemCount: items.length
        }
      });
    }

    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1) 인계 마스터 테이블 INSERT
      await transaction.request()
        .input('handoverNo', sql.NVarChar, handoverNo)
        .input('targetDept', sql.NVarChar, targetDept)
        .input('receiverName', sql.NVarChar, receiverName)
        .input('signatureData', sql.NVarChar, signatureUrl)
        .input('itemCount', sql.Int, items.length)
        .input('totalQty', sql.Decimal(18, 2), totalQty)
        .input('barcodes', sql.NVarChar, JSON.stringify(barcodes))
        .query(`
          INSERT INTO TB_YARD_HANDOVER 
          (HANDOVER_NO, TARGET_DEPT, RECEIVER_NAME, SIGNATURE_DATA, ITEM_COUNT, TOTAL_QTY, BARCODES, STATUS, HANDOVER_DATE)
          VALUES 
          (@handoverNo, @targetDept, @receiverName, @signatureData, @itemCount, @totalQty, @barcodes, 'COMPLETED', GETDATE())
        `);

      // 2) 자재 상태를 공정 투입 완료('COMPLETED')로 갱신
      for (const bc of barcodes) {
        await transaction.request()
          .input('barcode', sql.NVarChar, bc)
          .input('targetDept', sql.NVarChar, `투입:${targetDept}`)
          .query(`
            UPDATE TB_YARD_MATERIAL 
            SET STATUS = 'COMPLETED', CURRENT_LOC = @targetDept, UPD_DATE = GETDATE()
            WHERE BARCODE = @barcode
          `);
      }

      await transaction.commit();
      res.json({
        success: true,
        message: `공정 인계 및 전자서명이 확정 저장되었습니다. (인계번호: ${handoverNo})`,
        data: { handoverNo, signatureUrl }
      });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('공정 인계 처리 오류:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
