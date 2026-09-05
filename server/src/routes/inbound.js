// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: inbound.js
// 설명: [1] 입고검사 REST API 라우터
// =============================================================================

const express = require('express');
const router = express.Router();
const { sql, getPool, isMock, mockDb } = require('../config/db');

// 1. 입고검사 대상 목록 조회
router.get('/', async (req, res) => {
  try {
    const { fromDate, toDate, supplier, keyword } = req.query;

    if (isMock()) {
      let list = mockDb.orders.filter(item => item.MATERIAL_STATUS === 'INSPECT_WAIT' || item.MATERIAL_STATUS === 'SORT_WAIT' || item.MATERIAL_STATUS === 'STOCK');
      
      if (supplier) {
        list = list.filter(item => item.SUPPLIER_NAME.includes(supplier) || item.SUPPLIER_CODE.includes(supplier));
      }
      if (keyword) {
        const kw = keyword.toLowerCase();
        list = list.filter(item => 
          item.ITEM_CODE.toLowerCase().includes(kw) ||
          item.ITEM_NAME.toLowerCase().includes(kw) ||
          item.BARCODE.toLowerCase().includes(kw) ||
          (item.LOT_NO && item.LOT_NO.toLowerCase().includes(kw))
        );
      }
      return res.json({ success: true, data: list, count: list.length });
    }

    const pool = getPool();
    let query = 'SELECT * FROM VW_YARD_INBOUND_LIST WHERE 1=1';
    const request = pool.request();

    if (fromDate) {
      query += ' AND INBOUND_PLAN_DATE >= @fromDate';
      request.input('fromDate', sql.Date, fromDate);
    }
    if (toDate) {
      query += ' AND INBOUND_PLAN_DATE <= @toDate';
      request.input('toDate', sql.Date, toDate);
    }
    if (supplier) {
      query += ' AND (SUPPLIER_NAME LIKE @supplier OR SUPPLIER_CODE LIKE @supplier)';
      request.input('supplier', sql.NVarChar, `%${supplier}%`);
    }
    if (keyword) {
      query += ' AND (ITEM_CODE LIKE @keyword OR ITEM_NAME LIKE @keyword OR BARCODE LIKE @keyword OR LOT_NO LIKE @keyword)';
      request.input('keyword', sql.NVarChar, `%${keyword}%`);
    }

    const result = await request.query(query);
    res.json({ success: true, data: result.recordset, count: result.recordset.length });
  } catch (err) {
    console.error('입고검사 목록 조회 오류:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. 바코드 단일 항목 상세 조회
router.get('/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;

    if (isMock()) {
      const item = mockDb.orders.find(o => o.BARCODE === barcode);
      if (!item) {
        return res.status(404).json({ success: false, message: '해당 바코드 품목을 찾을 수 없습니다.' });
      }
      return res.json({ success: true, data: item });
    }

    const pool = getPool();
    const result = await pool.request()
      .input('barcode', sql.NVarChar, barcode)
      .query('SELECT TOP 1 * FROM VW_YARD_INBOUND_LIST WHERE BARCODE = @barcode');

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: '해당 바코드 품목을 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('바코드 조회 오류:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. 입고검사 결과 등록 (확정)
router.post('/inspect', async (req, res) => {
  try {
    const {
      barcode,
      orderNo,
      inspector,
      inspQty,
      passQty,
      failQty,
      judgment,      // 'PASS', 'FAIL', 'SORT_REQ'
      defectCode,
      defectMemo,
      photoUrls      // Array of photo paths
    } = req.body;

    if (!barcode || !judgment) {
      return res.status(400).json({ success: false, message: '바코드 및 판정 결과는 필수입니다.' });
    }

    const photoUrlsStr = Array.isArray(photoUrls) ? JSON.stringify(photoUrls) : (photoUrls || '');
    const nextStatus = judgment === 'PASS' ? 'STOCK' : (judgment === 'SORT_REQ' ? 'SORT_WAIT' : 'REJECT_WAIT');

    if (isMock()) {
      // 1) 검사 이력 추가
      mockDb.inspResults.push({
        INSP_ID: mockDb.inspResults.length + 1,
        BARCODE: barcode,
        ORDER_NO: orderNo,
        INSP_DATE: new Date().toISOString(),
        INSPECTOR: inspector || '현장검사원',
        INSP_QTY: inspQty,
        PASS_QTY: passQty,
        FAIL_QTY: failQty,
        JUDGMENT: judgment,
        DEFECT_CODE: defectCode,
        DEFECT_MEMO: defectMemo,
        PHOTO_URLS: photoUrlsStr,
        REG_DATE: new Date().toISOString()
      });

      // 2) 자재 마스터 상태 변경
      const target = mockDb.orders.find(o => o.BARCODE === barcode);
      if (target) {
        target.MATERIAL_STATUS = nextStatus;
        target.INSP_STATUS = judgment;
        if (judgment === 'PASS') {
          target.GRADE = 'A';
          target.CURRENT_LOC = 'YD-A-01';
        } else if (judgment === 'SORT_REQ') {
          target.CURRENT_LOC = 'YD-B-01';
        } else {
          target.CURRENT_LOC = 'YD-REJECT-01';
        }
      }

      return res.json({
        success: true,
        message: `검사 결과가 성공적으로 반영되었습니다. (${judgment} -> ${target ? target.CURRENT_LOC : '이동'})`,
        data: { barcode, status: nextStatus }
      });
    }

    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1) 검사 결과 등록
      await transaction.request()
        .input('barcode', sql.NVarChar, barcode)
        .input('orderNo', sql.NVarChar, orderNo || '')
        .input('inspector', sql.NVarChar, inspector || '현장검사원')
        .input('inspQty', sql.Decimal(18, 2), inspQty || 0)
        .input('passQty', sql.Decimal(18, 2), passQty || 0)
        .input('failQty', sql.Decimal(18, 2), failQty || 0)
        .input('judgment', sql.NVarChar, judgment)
        .input('defectCode', sql.NVarChar, defectCode || null)
        .input('defectMemo', sql.NVarChar, defectMemo || null)
        .input('photoUrls', sql.NVarChar, photoUrlsStr)
        .query(`
          INSERT INTO TB_YARD_INSP_RESULT 
          (BARCODE, ORDER_NO, INSPECTOR, INSP_QTY, PASS_QTY, FAIL_QTY, JUDGMENT, DEFECT_CODE, DEFECT_MEMO, PHOTO_URLS)
          VALUES 
          (@barcode, @orderNo, @inspector, @inspQty, @passQty, @failQty, @judgment, @defectCode, @defectMemo, @photoUrls)
        `);

      // 2) 자재 상태 갱신
      await transaction.request()
        .input('barcode', sql.NVarChar, barcode)
        .input('status', sql.NVarChar, nextStatus)
        .input('inspStatus', sql.NVarChar, judgment)
        .query(`
          UPDATE TB_YARD_MATERIAL
          SET STATUS = @status, INSP_STATUS = @inspStatus, UPD_DATE = GETDATE()
          WHERE BARCODE = @barcode
        `);

      await transaction.commit();
      res.json({ success: true, message: '검사 결과가 MS-SQL에 확정 저장되었습니다.' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('검사 결과 등록 오류:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
