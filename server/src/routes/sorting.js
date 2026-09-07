// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: sorting.js
// 설명: [2] 입고선별 REST API 라우터 (사내 MS-SQL 직접 연동)
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

// 1. 선별 대상 품목 목록 조회
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT * FROM VW_YARD_INBOUND_LIST 
      WHERE MATERIAL_STATUS = 'SORT_WAIT' OR INSP_STATUS = 'CONDITIONAL'
      ORDER BY INBOUND_PLAN_DATE DESC
    `);

    res.json({ success: true, data: result.recordset, count: result.recordset.length });
  } catch (err) {
    console.error('선별 대상 조회 오류:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. 선별 결과 등록 및 수량 분할 확정
router.post('/submit', async (req, res) => {
  try {
    const {
      barcode,
      sorter,
      goodQty,
      defectQty,
      reworkQty,
      grade,           // 'A', 'B', 'C'
      nextLocation,    // 로케이션 코드 (예: YD-A-01, YD-REJECT-01)
      memo
    } = req.body;

    if (!barcode || goodQty === undefined) {
      return res.status(400).json({ success: false, message: '바코드 및 양품 수량은 필수입니다.' });
    }

    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1) 선별 결과 테이블 INSERT
      await transaction.request()
        .input('barcode', sql.NVarChar, barcode)
        .input('sorter', sql.NVarChar, sorter || '현장선별원')
        .input('goodQty', sql.Decimal(18, 2), goodQty)
        .input('defectQty', sql.Decimal(18, 2), defectQty || 0)
        .input('reworkQty', sql.Decimal(18, 2), reworkQty || 0)
        .input('grade', sql.NVarChar, grade || 'A')
        .input('nextLocation', sql.NVarChar, nextLocation || 'YD-A-01')
        .input('memo', sql.NVarChar, memo || null)
        .query(`
          INSERT INTO TB_YARD_SORT_RESULT 
          (BARCODE, SORTER, GOOD_QTY, DEFECT_QTY, REWORK_QTY, GRADE, NEXT_LOCATION, MEMO)
          VALUES 
          (@barcode, @sorter, @goodQty, @defectQty, @reworkQty, @grade, @nextLocation, @memo)
        `);

      // 2) 자재 마스터 상태 및 로케이션 갱신
      await transaction.request()
        .input('barcode', sql.NVarChar, barcode)
        .input('grade', sql.NVarChar, grade || 'A')
        .input('nextLocation', sql.NVarChar, nextLocation || 'YD-A-01')
        .query(`
          UPDATE TB_YARD_MATERIAL
          SET STATUS = 'STOCK', GRADE = @grade, CURRENT_LOC = @nextLocation, UPD_DATE = GETDATE()
          WHERE BARCODE = @barcode
        `);

      await transaction.commit();
      res.json({ success: true, message: '선별 데이터가 사내 MS-SQL에 성공적으로 확정 저장되었습니다.' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('선별 결과 등록 오류:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
