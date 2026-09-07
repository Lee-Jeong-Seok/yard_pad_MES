// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: db.js
// 설명: 사내 MS-SQL Server 커넥션 풀 관리 모듈 (실제 MES DB 직접 연동)
// =============================================================================

const sql = require('mssql');

const sqlConfig = {
  user: process.env.DB_USER || 'mes_user',
  password: process.env.DB_PASSWORD || 'mes_password!',
  database: process.env.DB_NAME || 'MES_DB',
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false'
  }
};

let pool = null;

async function initDb() {
  try {
    console.log(`🔌 [DB] 사내 MS-SQL 서버 연결 시도 (${sqlConfig.server}:${sqlConfig.port}/${sqlConfig.database})...`);
    pool = await sql.connect(sqlConfig);
    console.log('✅ [DB] 사내 MS-SQL 데이터베이스에 성공적으로 연결되었습니다.');
  } catch (err) {
    console.error(`❌ [DB] 사내 MS-SQL 연결 실패: ${err.message}`);
    console.warn('⚠️ [DB] DB 연결 설정(.env) 또는 사내 MS-SQL 서버 구동 상태를 확인해 주십시오.');
    pool = null;
  }
}

function getPool() {
  return pool;
}

function isDbConnected() {
  return pool !== null && pool.connected;
}

module.exports = {
  sql,
  initDb,
  getPool,
  isDbConnected
};

