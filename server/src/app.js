// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: app.js
// 설명: Express REST API 서버 진입점 및 클라이언트 정적 서빙
// =============================================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, isDbConnected } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3300;

// 1. 미들웨어 설정
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// 2. 정적 파일 서빙
const clientDir = path.resolve(__dirname, '../../client');
const uploadDir = path.resolve(__dirname, '../uploads');

app.use(express.static(clientDir));
app.use('/uploads', express.static(uploadDir));

// 3. API 라우터 등록
app.use('/api/inbound', require('./routes/inbound'));
app.use('/api/sorting', require('./routes/sorting'));
app.use('/api/transfer', require('./routes/transfer'));
app.use('/api/handover', require('./routes/handover'));
app.use('/api/files', require('./routes/files'));

// 4. 시스템 헬스체크 API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    system: 'Yard Pad MES Server',
    dbConnected: isDbConnected(),
    timestamp: new Date().toISOString()
  });
});

// 5. SPA 라우팅 폴백 (client/index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

// 6. 서버 기동 및 DB 커넥션 초기화
async function startServer() {
  await initDb();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 Yard Pad MES 서버가 포트 ${PORT}에서 정상 구동 중입니다.`);
    console.log(`📱 로컬 접속: http://localhost:${PORT}`);
    console.log(`⚙️  DB 상태: ${isDbConnected() ? '사내 MS-SQL 정상 연결' : '사내 MS-SQL 미연결 (환경변수/네트워크 확인 필요)'}`);
    console.log(`=======================================================`);
  });
}

startServer();

module.exports = app;
