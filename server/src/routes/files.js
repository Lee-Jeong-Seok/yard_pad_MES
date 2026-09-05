// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: files.js
// 설명: 현장 사진 및 도면/문서 업로드 REST API 라우터
// =============================================================================

const express = require('express');
const router = express.Router();
const upload = require('../config/upload');

// 단일 파일 업로드
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '업로드된 파일이 없습니다.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl
      }
    });
  } catch (err) {
    console.error('파일 업로드 오류:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 복수 사진 업로드 (최대 5장)
router.post('/upload-multiple', upload.array('photos', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: '업로드된 사진이 없습니다.' });
    }

    const fileUrls = req.files.map(f => `/uploads/${f.filename}`);
    res.json({
      success: true,
      data: {
        count: req.files.length,
        urls: fileUrls
      }
    });
  } catch (err) {
    console.error('다중 사진 업로드 오류:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
