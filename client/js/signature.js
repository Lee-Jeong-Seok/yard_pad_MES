// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: signature.js
// 설명: 터치/S펜 전자서명 캔버스 핸들러 (오프라인 HTML5 Canvas 듀얼 지원)
// =============================================================================

const DigitalSignature = {
  canvas: null,
  ctx: null,
  isDrawing: false,
  hasSignature: false,
  onCompleteCallback: null,

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.setupEvents();
    this.resizeCanvas();
  },

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    this.clear();
  },

  setupEvents() {
    const canvas = this.canvas;

    const startDraw = (x, y) => {
      this.isDrawing = true;
      this.hasSignature = true;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.strokeStyle = '#1e293b';
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    };

    const draw = (x, y) => {
      if (!this.isDrawing) return;
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    };

    const stopDraw = () => {
      this.isDrawing = false;
      this.ctx.closePath();
    };

    // 마우스 이벤트
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      startDraw(e.clientX - rect.left, e.clientY - rect.top);
    });
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      draw(e.clientX - rect.left, e.clientY - rect.top);
    });
    window.addEventListener('mouseup', stopDraw);

    // 터치/펜 이벤트
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      startDraw(touch.clientX - rect.left, touch.clientY - rect.top);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      draw(touch.clientX - rect.left, touch.clientY - rect.top);
    }, { passive: false });

    canvas.addEventListener('touchend', stopDraw);
  },

  clear() {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
    this.hasSignature = false;
  },

  open(onComplete) {
    this.onCompleteCallback = onComplete;
    const modal = document.getElementById('signatureModal');
    if (modal) {
      modal.classList.add('open');
      setTimeout(() => this.resizeCanvas(), 50);
    }
  },

  close() {
    const modal = document.getElementById('signatureModal');
    if (modal) {
      modal.classList.remove('open');
    }
  },

  confirm() {
    if (!this.hasSignature) {
      alert('서명을 작성해 주세요.');
      return;
    }

    const dataUrl = this.canvas.toDataURL('image/png');
    this.close();

    if (this.onCompleteCallback) {
      this.onCompleteCallback(dataUrl);
    }
  }
};
