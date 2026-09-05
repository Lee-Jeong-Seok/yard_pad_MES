// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: scanner.js
// 설명: 카메라 실시간 바코드/QR 스캐너 및 모의 바코드 시뮬레이터
// =============================================================================

const BarcodeScanner = {
  html5QrCode: null,
  isOpen: false,
  onScanSuccessCallback: null,

  // 오디오 비프음 생성 (Web Audio API)
  playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);

      if (navigator.vibrate) {
        navigator.vibrate(80);
      }
    } catch (e) {
      console.log('Audio beep fallback', e);
    }
  },

  // 모달 열기 및 스캔 시작
  open(onSuccess) {
    this.onScanSuccessCallback = onSuccess;
    const modal = document.getElementById('scannerModal');
    if (modal) {
      modal.classList.add('open');
      this.isOpen = true;
    }

    // HTML5 QRCode 객체가 로드되어 있다면 카메라 구동 시도
    if (window.Html5Qrcode) {
      this.startCameraScan();
    } else {
      console.log('📷 Html5Qrcode 라이브러리 미탑재 또는 오프라인 모드: 가상 스캐너 모드로 동작');
    }
  },

  // 카메라 스캔 시작
  async startCameraScan() {
    try {
      if (!this.html5QrCode) {
        this.html5QrCode = new Html5Qrcode('qrReader');
      }

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.6
      };

      await this.html5QrCode.start(
        { facingMode: 'environment' }, // 후면 카메라 우선
        config,
        (decodedText) => {
          this.handleSuccess(decodedText);
        },
        (errorMessage) => {
          // 스캔 프레임 단위 실패 로그는 무시
        }
      );
    } catch (err) {
      console.warn('카메라 스캐너 구동 실패 (권한 또는 지원 불가):', err);
      const notice = document.getElementById('cameraNotice');
      if (notice) {
        notice.textContent = '카메라를 켤 수 없습니다. 하단 모의/수동 입력을 이용하세요.';
      }
    }
  },

  // 성공 처리
  handleSuccess(barcodeText) {
    const cleanText = barcodeText.trim();
    if (!cleanText) return;

    this.playBeep();
    this.close();

    if (this.onScanSuccessCallback) {
      this.onScanSuccessCallback(cleanText);
    }
  },

  // 모달 닫기 및 카메라 정지
  async close() {
    if (this.html5QrCode && this.html5QrCode.isScanning) {
      try {
        await this.html5QrCode.stop();
      } catch (e) {
        console.warn('카메라 정지 중 오류:', e);
      }
    }

    const modal = document.getElementById('scannerModal');
    if (modal) {
      modal.classList.remove('open');
    }
    this.isOpen = false;
  }
};
