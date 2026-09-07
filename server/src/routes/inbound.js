// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: inbound.js
// 설명: [1] 입고검사 REST API 라우터 (사내 MS-SQL 직접 연동)
// =============================================================================

const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');

// DB 연결 가드 미들웨어
function checkDbConnection(req, res, next) {
  const pool = getPool();
  if (!pool) {
    return res.status(503).json({
      success: false,
      message: '사내 MS-SQL 데이터베이스에 연결되어 있지 않습니다. 서버 연결 상태를 확인해 주십시오.'
    });
  }
  next();
}

router.use(checkDbConnection);

// 1. 입고검사 대상 목록 조회
router.get('/', async (req, res) => {
  try {
    const { fromDate, toDate, supplier, keyword } = req.query;
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
      res.json({ success: true, message: '검사 결과가 사내 MS-SQL에 성공적으로 확정 저장되었습니다.' });
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
