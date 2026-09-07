// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: api.js
// 설명: 백엔드 REST API 통신 클라이언트 (사내 MS-SQL 직접 연동)
// =============================================================================

const API = {
  baseUrl: window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? '' // 같은 호스트/포트 서빙
    : '',

  // 공통 Fetch 래퍼 (타임아웃 5초)
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}/api${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const config = {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options
    };

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `서버 에러 (${response.status})`);
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`[API] ${endpoint} 통신 실패:`, err.message);
      throw err;
    }
  },

  // 시스템 헬스체크
  async checkHealth() {
    return this.request('/health');
  },

  // [1] 입고검사 관련
  async getInboundList(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/inbound?${query}`);
  },

  async getInboundItem(barcode) {
    return this.request(`/inbound/${encodeURIComponent(barcode)}`);
  },

  async submitInspection(data) {
    return this.request('/inbound/inspect', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // [2] 입고선별 관련
  async getSortingList() {
    return this.request('/sorting');
  },

  async submitSorting(data) {
    return this.request('/sorting/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // [3] 야드 이송 관련
  async getLocations() {
    return this.request('/transfer/locations');
  },

  async submitTransfer(data) {
    return this.request('/transfer/move', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // [4] 공정 인계 관련
  async getHandoverList() {
    return this.request('/handover/items');
  },

  async submitHandover(data) {
    return this.request('/handover/submit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // 사진/파일 업로드
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/files/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('파일 업로드 실패');
    }
    return await response.json();
  }
};
