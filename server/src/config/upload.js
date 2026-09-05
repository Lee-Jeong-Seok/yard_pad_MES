// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: upload.js
// 설명: 사진 및 첨부파일 업로드용 Multer 미들웨어 설정
// =============================================================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.resolve(__dirname, '../../uploads');

// 업로드 디렉터리가 없으면 자동 생성
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    cb(null, `yard_${timestamp}_${random}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024
  }
});

module.exports = upload;
