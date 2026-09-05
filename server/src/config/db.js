// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: db.js
// 설명: MS-SQL Server 커넥션 풀 및 Mock DB 자동 폴백 핸들러
// =============================================================================

const sql = require('mssql');
const mockDb = require('../mock/sampleData');

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
let isMockMode = process.env.USE_MOCK_DB === 'true';

async function initDb() {
  if (isMockMode) {
    console.log('📌 [DB] USE_MOCK_DB가 활성화되어 인메모리 Mock 데이터베이스 모드로 동작합니다.');
    return;
  }

  try {
    console.log(`🔌 [DB] MS-SQL 서버 연결 시도 (${sqlConfig.server}:${sqlConfig.port}/${sqlConfig.database})...`);
    pool = await sql.connect(sqlConfig);
    console.log('✅ [DB] MS-SQL 데이터베이스에 성공적으로 연결되었습니다.');
  } catch (err) {
    console.warn(`⚠️ [DB] MS-SQL 연결 실패 (${err.message}). Mock 데이터베이스로 자동 전환합니다.`);
    isMockMode = true;
  }
}

function getPool() {
  return pool;
}

function isMock() {
  return isMockMode;
}

module.exports = {
  sql,
  initDb,
  getPool,
  isMock,
  mockDb
};
