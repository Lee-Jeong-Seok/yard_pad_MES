// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: compressor.js
// 설명: 현장 사진 실시간 브라우저 캔버스 리사이즈 및 자동 압축 엔진
// =============================================================================

const ImageCompressor = {
  // 기본 압축 옵션
  defaultOptions: {
    maxWidth: 1600,
    maxHeight: 1200,
    quality: 0.8,
    mimeType: 'image/jpeg'
  },

  /**
   * File 객체 또는 Blob을 입력받아 압축된 Blob 및 Data URL 반환
   * @param {File|Blob} file 
   * @param {Object} options 
   * @returns {Promise<{ blob: Blob, dataUrl: string, originalSize: number, compressedSize: number }>}
   */
  async compress(file, options = {}) {
    const opts = { ...this.defaultOptions, ...options };
    const originalSize = file.size;
    const startTime = performance.now();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // 비율 유지하며 최대 해상도 제한
          if (width > height) {
            if (width > opts.maxWidth) {
              height = Math.round((height * opts.maxWidth) / width);
              width = opts.maxWidth;
            }
          } else {
            if (height > opts.maxHeight) {
              width = Math.round((width * opts.maxHeight) / height);
              height = opts.maxHeight;
            }
          }

          // Offscreen / Hidden Canvas 생성
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          // 이미지 보정 및 렌더링
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Blob 추출
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Canvas 압축 Blob 변환 실패'));
              }

              const dataUrl = canvas.toDataURL(opts.mimeType, opts.quality);
              const duration = (performance.now() - startTime).toFixed(1);

              console.log(`📸 [사진 압축] 원본: ${(originalSize / 1024 / 1024).toFixed(2)}MB -> 압축: ${(blob.size / 1024).toFixed(1)}KB (${duration}ms 소요)`);

              resolve({
                blob,
                dataUrl,
                originalSize,
                compressedSize: blob.size,
                durationMs: duration
              });
            },
            opts.mimeType,
            opts.quality
          );
        };
        img.onerror = () => reject(new Error('이미지 파일 로드 실패'));
        img.src = event.target.result;
      };
      reader.onerror = () => reject(new Error('파일 읽기 실패'));
      reader.readAsDataURL(file);
    });
  }
};
