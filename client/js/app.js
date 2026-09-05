// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: app.js
// 설명: 메인 애플리케이션 컨트롤러 (4대 업무 통합 제어 및 터치 이벤트 바인딩)
// =============================================================================

const App = {
  currentTab: 'inspection', // 'inspection', 'sorting', 'transfer', 'handover'
  selectedItem: null,
  currentItems: [],
  capturedPhotos: [], // [{ blob, dataUrl, name }]
  
  // [야드 이송] Double-Scan 상태
  transferState: {
    materialBarcode: '',
    materialItem: null,
    targetLocation: ''
  },

  // [공정 인계] 인계 대상 목록
  handoverItems: [],

  // 1. 시스템 초기화
  async init() {
    console.log('🚀 [Yard Pad MES] 애플리케이션 초기화 시작');

    this.setupNetworkMonitor();
    this.setupEventListeners();
    DigitalSignature.init('signatureCanvas');

    // 서비스 워커 등록
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('SW 등록 실패:', err);
      });
    }

    // 서버 헬스체크 및 DB 상태 표시
    this.checkServerStatus();

    // 초기 탭 로드
    this.switchTab('inspection');
  },

  // 2. 네트워크 상태 모니터링
  setupNetworkMonitor() {
    const wifiPill = document.getElementById('wifiStatusPill');
    const updateWifi = () => {
      if (navigator.onLine) {
        wifiPill.className = 'status-pill';
        wifiPill.innerHTML = '<span class="status-dot"></span> Wi-Fi 정상';
      } else {
        wifiPill.className = 'status-pill offline';
        wifiPill.innerHTML = '<span class="status-dot"></span> Wi-Fi 오프라인';
      }
    };

    window.addEventListener('online', updateWifi);
    window.addEventListener('offline', updateWifi);
    updateWifi();
  },

  // 서버 및 DB 상태 체크
  async checkServerStatus() {
    const dbPill = document.getElementById('dbStatusPill');
    try {
      const res = await API.checkHealth();
      if (res.mockMode) {
        dbPill.className = 'status-pill mock';
        dbPill.innerHTML = '<span class="status-dot"></span> MOCK DB';
      } else {
        dbPill.className = 'status-pill';
        dbPill.innerHTML = '<span class="status-dot"></span> MS-SQL 연동';
      }
    } catch (e) {
      dbPill.className = 'status-pill offline';
      dbPill.innerHTML = '<span class="status-dot"></span> 서버 미연결';
    }
  },

  // 3. 탭 전환
  switchTab(tabName) {
    this.currentTab = tabName;
    this.selectedItem = null;
    this.capturedPhotos = [];

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // 툴바 및 마스터-디테일 제목 업데이트
    const masterTitle = document.getElementById('masterGridTitle');
    const detailTitle = document.getElementById('detailPanelTitle');

    if (tabName === 'inspection') {
      masterTitle.textContent = '입고검사 대상 품목 목록';
      detailTitle.textContent = '검사 상세 입력 및 판정';
      this.loadInboundData();
    } else if (tabName === 'sorting') {
      masterTitle.textContent = '입고선별 대상 (조건부/선별대기) 목록';
      detailTitle.textContent = '수량 분할 및 등급 지정';
      this.loadSortingData();
    } else if (tabName === 'transfer') {
      masterTitle.textContent = '야드 로케이션 및 보관 자재 현황';
      detailTitle.textContent = 'Double-Scan 위치 매핑';
      this.loadTransferData();
    } else if (tabName === 'handover') {
      masterTitle.textContent = '공정 인계 대상 자재 목록';
      detailTitle.textContent = '실물 검수 및 디지털 전자서명';
      this.loadHandoverData();
    }
  },

  // =============================================================================
  // [1] 입고검사 로직
  // =============================================================================
  async loadInboundData() {
    try {
      const fromDate = document.getElementById('filterFromDate')?.value;
      const toDate = document.getElementById('filterToDate')?.value;
      const supplier = document.getElementById('filterSupplier')?.value;
      const keyword = document.getElementById('filterKeyword')?.value;

      const res = await API.getInboundList({ fromDate, toDate, supplier, keyword });
      this.currentItems = res.data || [];
      this.renderInboundGrid();

      if (this.currentItems.length > 0) {
        this.selectItem(this.currentItems[0]);
      } else {
        this.renderEmptyDetail('조회된 입고검사 대상이 없습니다.');
      }
    } catch (err) {
      console.error('입고 데이터 로드 실패:', err);
    }
  },

  renderInboundGrid() {
    const tableBody = document.getElementById('masterTableBody');
    const thead = document.getElementById('masterTableHead');

    thead.innerHTML = `
      <tr>
        <th style="width: 40px;">#</th>
        <th>발주번호</th>
        <th>바코드/QR</th>
        <th>품번</th>
        <th>품명</th>
        <th>규격</th>
        <th>공급사</th>
        <th>예정수량</th>
        <th>위치</th>
        <th>상태</th>
      </tr>
    `;

    tableBody.innerHTML = this.currentItems.map((item, idx) => `
      <tr data-barcode="${item.BARCODE}" onclick="App.selectItemByBarcode('${item.BARCODE}')" class="${this.selectedItem?.BARCODE === item.BARCODE ? 'selected' : ''}">
        <td>${idx + 1}</td>
        <td><strong>${item.ORDER_NO}</strong></td>
        <td><span style="font-family: monospace; color:#60a5fa;">${item.BARCODE}</span></td>
        <td>${item.ITEM_CODE}</td>
        <td><strong>${item.ITEM_NAME}</strong></td>
        <td>${item.SPEC || '-'}</td>
        <td>${item.SUPPLIER_NAME}</td>
        <td><strong>${item.ACTUAL_QTY || item.PLAN_QTY} ${item.UNIT || 'EA'}</strong></td>
        <td><span class="badge badge-loc">${item.CURRENT_LOC || '하역대기'}</span></td>
        <td>${this.getStatusBadge(item.MATERIAL_STATUS, item.INSP_STATUS)}</td>
      </tr>
    `).join('');
  },

  selectItem(item) {
    this.selectedItem = item;
    this.capturedPhotos = [];

    // 그리드 행 하이라이트
    document.querySelectorAll('#masterTableBody tr').forEach(tr => {
      tr.classList.toggle('selected', tr.dataset.barcode === item.BARCODE);
    });

    if (this.currentTab === 'inspection') {
      this.renderInspectionDetail(item);
    } else if (this.currentTab === 'sorting') {
      this.renderSortingDetail(item);
    }
  },

  selectItemByBarcode(barcode) {
    const item = this.currentItems.find(it => it.BARCODE === barcode);
    if (item) {
      this.selectItem(item);
    }
  },

  renderInspectionDetail(item) {
    const container = document.getElementById('detailContent');
    const actions = document.getElementById('detailActions');

    container.innerHTML = `
      <!-- 품목 정보 카드 -->
      <div class="spec-card">
        <div class="spec-title">
          <span>${item.ITEM_NAME}</span>
          <button class="btn btn-secondary" style="height:32px; padding:0 10px; font-size:0.8rem;" onclick="DocumentViewer.open('${item.DOC_URL}', App.selectedItem)">
            📄 규격서/도면
          </button>
        </div>
        <div class="spec-grid">
          <div class="spec-item">
            <span class="spec-label">발주번호</span>
            <span class="spec-value">${item.ORDER_NO}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">바코드</span>
            <span class="spec-value" style="color:#60a5fa;">${item.BARCODE}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">품번/LotNo</span>
            <span class="spec-value">${item.ITEM_CODE} / ${item.LOT_NO || '-'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">공급사</span>
            <span class="spec-value">${item.SUPPLIER_NAME}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">규격</span>
            <span class="spec-value">${item.SPEC || '-'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">입고예정량</span>
            <span class="spec-value" style="color:#34d399;">${item.ACTUAL_QTY || item.PLAN_QTY} ${item.UNIT || 'EA'}</span>
          </div>
        </div>
      </div>

      <!-- 검사 수량 입력 -->
      <div class="form-section">
        <div class="section-title">⚖️ 검사 및 합격 수량 입력</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label class="filter-label">검사 수량</label>
            <input type="number" id="inputInspQty" class="touch-input" value="${item.ACTUAL_QTY || item.PLAN_QTY}">
          </div>
          <div>
            <label class="filter-label">합격 수량</label>
            <input type="number" id="inputPassQty" class="touch-input" value="${item.ACTUAL_QTY || item.PLAN_QTY}">
          </div>
        </div>
      </div>

      <!-- 판정 원터치 토글 -->
      <div class="form-section">
        <div class="section-title">🎯 종합 판정</div>
        <div class="judgment-group">
          <button type="button" id="btnJudgePass" class="btn-judge btn-judge-pass active" onclick="App.setJudgment('PASS')">
            ✓ 합격 (양품)
          </button>
          <button type="button" id="btnJudgeFail" class="btn-judge btn-judge-fail" onclick="App.setJudgment('FAIL')">
            ✕ 불합격 (선별요청)
          </button>
        </div>

        <!-- 불합격 시 상세 입력창 -->
        <div id="defectArea" style="display:none; margin-top:12px; gap:10px; flex-direction:column;">
          <div>
            <label class="filter-label">불량 유형 코드</label>
            <select id="selectDefectCode" class="filter-select" style="width:100%; height:44px;">
              <option value="SCRATCH">외관 스크래치 / 흠집</option>
              <option value="DIMENSION">치수 및 공차 미달</option>
              <option value="CONTAMINATION">녹 발생 및 이물질 부착</option>
              <option value="DEFORMATION">변형 및 휨 결함</option>
              <option value="ETC">기타 결함 (특이사항 기재)</option>
            </select>
          </div>
          <div>
            <label class="filter-label">불량 사유 / 특이사항</label>
            <input type="text" id="inputDefectMemo" class="touch-input" placeholder="불량 상태를 기재하세요" style="font-size:0.95rem;">
          </div>
        </div>
      </div>

      <!-- 사진 촬영 및 압축 첨부 -->
      <div class="form-section">
        <div class="section-title" style="justify-content:space-between;">
          <span>📷 현장 불량/실물 사진 (Canvas 자동 압축)</span>
          <button type="button" class="btn btn-secondary" style="height:34px; padding:0 12px; font-size:0.8rem;" onclick="document.getElementById('photoFileInput').click()">
            + 사진 촬영/추가
          </button>
        </div>
        <input type="file" id="photoFileInput" accept="image/*" capture="environment" style="display:none;" onchange="App.handlePhotoCapture(event)">
        <div class="photo-strip" id="photoStrip">
          <span style="font-size:0.8rem; color:var(--text-dim); padding:10px 0;">첨부된 사진이 없습니다. (카메라 촬영 시 200KB대로 자동 압축)</span>
        </div>
      </div>
    `;

    actions.innerHTML = `
      <button class="btn btn-secondary" style="flex:1;" onclick="App.quickPassAll()">전체 합격</button>
      <button class="btn btn-confirm" onclick="App.submitInspection()">확정 / MES 반영</button>
    `;

    this.currentJudgment = 'PASS';
  },

  setJudgment(judgment) {
    this.currentJudgment = judgment;
    const btnPass = document.getElementById('btnJudgePass');
    const btnFail = document.getElementById('btnJudgeFail');
    const defectArea = document.getElementById('defectArea');
    const inputPassQty = document.getElementById('inputPassQty');
    const totalQty = parseFloat(this.selectedItem.ACTUAL_QTY || this.selectedItem.PLAN_QTY);

    if (judgment === 'PASS') {
      btnPass.classList.add('active');
      btnFail.classList.remove('active');
      defectArea.style.display = 'none';
      if (inputPassQty) inputPassQty.value = totalQty;
    } else {
      btnFail.classList.add('active');
      btnPass.classList.remove('active');
      defectArea.style.display = 'flex';
      if (inputPassQty) inputPassQty.value = 0;
    }
  },

  async handlePhotoCapture(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await ImageCompressor.compress(file);
      this.capturedPhotos.push(result);
      this.renderPhotoStrip();
    } catch (err) {
      alert('사진 압축 처리 중 오류가 발생했습니다: ' + err.message);
    }
  },

  renderPhotoStrip() {
    const strip = document.getElementById('photoStrip');
    if (!strip) return;

    if (this.capturedPhotos.length === 0) {
      strip.innerHTML = '<span style="font-size:0.8rem; color:var(--text-dim); padding:10px 0;">첨부된 사진이 없습니다.</span>';
      return;
    }

    strip.innerHTML = this.capturedPhotos.map((photo, idx) => `
      <div style="position:relative; display:inline-block;">
        <img src="${photo.dataUrl}" class="photo-thumb" onclick="window.open('${photo.dataUrl}')">
        <button type="button" onclick="App.removePhoto(${idx})" style="position:absolute; top:-4px; right:-4px; background:#ef4444; color:#fff; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:12px;">✕</button>
      </div>
    `).join('');
  },

  removePhoto(idx) {
    this.capturedPhotos.splice(idx, 1);
    this.renderPhotoStrip();
  },

  quickPassAll() {
    this.setJudgment('PASS');
    this.submitInspection();
  },

  async submitInspection() {
    if (!this.selectedItem) return;

    const inspQty = parseFloat(document.getElementById('inputInspQty')?.value || 0);
    const passQty = parseFloat(document.getElementById('inputPassQty')?.value || 0);
    const failQty = inspQty - passQty;
    const judgment = this.currentJudgment;
    const defectCode = judgment === 'FAIL' ? document.getElementById('selectDefectCode')?.value : null;
    const defectMemo = judgment === 'FAIL' ? document.getElementById('inputDefectMemo')?.value : null;

    const payload = {
      barcode: this.selectedItem.BARCODE,
      orderNo: this.selectedItem.ORDER_NO,
      inspector: '김현장 작업자',
      inspQty,
      passQty,
      failQty,
      judgment: judgment === 'FAIL' ? 'SORT_REQ' : 'PASS',
      defectCode,
      defectMemo,
      photoUrls: this.capturedPhotos.map(p => p.dataUrl)
    };

    try {
      const res = await API.submitInspection(payload);
      alert('✓ ' + (res.message || '검사가 성공적으로 확정되었습니다.'));
      this.loadInboundData();
    } catch (err) {
      alert('검사 전송 실패: ' + err.message);
    }
  },

  // =============================================================================
  // [2] 입고선별 로직
  // =============================================================================
  async loadSortingData() {
    try {
      const res = await API.getSortingList();
      this.currentItems = res.data || [];
      this.renderSortingGrid();

      if (this.currentItems.length > 0) {
        this.selectItem(this.currentItems[0]);
      } else {
        this.renderEmptyDetail('선별 대기 중인 자재가 없습니다.');
      }
    } catch (err) {
      console.error('선별 데이터 로드 실패:', err);
    }
  },

  renderSortingGrid() {
    const tableBody = document.getElementById('masterTableBody');
    const thead = document.getElementById('masterTableHead');

    thead.innerHTML = `
      <tr>
        <th style="width: 40px;">#</th>
        <th>바코드/QR</th>
        <th>품번</th>
        <th>품명</th>
        <th>총 입고수량</th>
        <th>현재위치</th>
        <th>검사상태</th>
      </tr>
    `;

    tableBody.innerHTML = this.currentItems.map((item, idx) => `
      <tr data-barcode="${item.BARCODE}" onclick="App.selectItemByBarcode('${item.BARCODE}')" class="${this.selectedItem?.BARCODE === item.BARCODE ? 'selected' : ''}">
        <td>${idx + 1}</td>
        <td><strong style="font-family: monospace; color:#60a5fa;">${item.BARCODE}</strong></td>
        <td>${item.ITEM_CODE}</td>
        <td>${item.ITEM_NAME}</td>
        <td><strong>${item.ACTUAL_QTY || item.PLAN_QTY} ${item.UNIT || 'EA'}</strong></td>
        <td><span class="badge badge-loc">${item.CURRENT_LOC}</span></td>
        <td><span class="badge badge-sort">선별대기</span></td>
      </tr>
    `).join('');
  },

  renderSortingDetail(item) {
    const container = document.getElementById('detailContent');
    const actions = document.getElementById('detailActions');
    const totalQty = parseFloat(item.ACTUAL_QTY || item.PLAN_QTY);

    container.innerHTML = `
      <div class="spec-card">
        <div class="spec-title">
          <span>${item.ITEM_NAME}</span>
          <button class="btn btn-secondary" style="height:32px; padding:0 10px; font-size:0.8rem;" onclick="DocumentViewer.open('${item.DOC_URL}', App.selectedItem)">
            📄 도면/규격
          </button>
        </div>
        <div class="spec-grid">
          <div class="spec-item"><span class="spec-label">바코드</span><span class="spec-value" style="color:#60a5fa;">${item.BARCODE}</span></div>
          <div class="spec-item"><span class="spec-label">품번</span><span class="spec-value">${item.ITEM_CODE}</span></div>
          <div class="spec-item"><span class="spec-label">공급사</span><span class="spec-value">${item.SUPPLIER_NAME}</span></div>
          <div class="spec-item"><span class="spec-label">선별 대상 총수량</span><span class="spec-value" style="color:#fbbf24;">${totalQty} ${item.UNIT || 'EA'}</span></div>
        </div>
      </div>

      <div class="form-section">
        <div class="section-title">📊 수량 분할 입력</div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
          <div>
            <label class="filter-label">양품 수량</label>
            <input type="number" id="sortGoodQty" class="touch-input" value="${totalQty}" style="color:#34d399;">
          </div>
          <div>
            <label class="filter-label">불량 수량</label>
            <input type="number" id="sortDefectQty" class="touch-input" value="0" style="color:#f87171;">
          </div>
          <div>
            <label class="filter-label">재작업 수량</label>
            <input type="number" id="sortReworkQty" class="touch-input" value="0" style="color:#fbbf24;">
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="section-title">🏷️ 등급 부여 및 차기 로케이션 지정</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label class="filter-label">품질 등급</label>
            <select id="sortGrade" class="filter-select" style="width:100%; height:48px; font-size:1.05rem;">
              <option value="A">A등급 (최우수)</option>
              <option value="B">B등급 (양호)</option>
              <option value="C">C등급 (조건부)</option>
            </select>
          </div>
          <div>
            <label class="filter-label">차기 보관 로케이션</label>
            <select id="sortNextLoc" class="filter-select" style="width:100%; height:48px; font-size:1.05rem;">
              <option value="YD-A-01">YD-A-01 (A구역 강판야드)</option>
              <option value="YD-A-02">YD-A-02 (A구역 빔/형강)</option>
              <option value="YD-B-02">YD-B-02 (가공부품 대기)</option>
              <option value="YD-REJECT-01">YD-REJECT-01 (불량반품장)</option>
            </select>
          </div>
        </div>
      </div>
    `;

    actions.innerHTML = `
      <button class="btn btn-confirm" onclick="App.submitSorting()">선별 확정 / 로케이션 이동</button>
    `;
  },

  async submitSorting() {
    if (!this.selectedItem) return;

    const goodQty = parseFloat(document.getElementById('sortGoodQty')?.value || 0);
    const defectQty = parseFloat(document.getElementById('sortDefectQty')?.value || 0);
    const reworkQty = parseFloat(document.getElementById('sortReworkQty')?.value || 0);
    const grade = document.getElementById('sortGrade')?.value || 'A';
    const nextLocation = document.getElementById('sortNextLoc')?.value || 'YD-A-01';

    try {
      const res = await API.submitSorting({
        barcode: this.selectedItem.BARCODE,
        sorter: '김현장 작업자',
        goodQty,
        defectQty,
        reworkQty,
        grade,
        nextLocation
      });

      alert('✓ ' + (res.message || '선별이 완료되었습니다.'));
      this.loadSortingData();
    } catch (err) {
      alert('선별 등록 오류: ' + err.message);
    }
  },

  // =============================================================================
  // [3] 야드 이송 (Double-Scan) 로직
  // =============================================================================
  async loadTransferData() {
    try {
      const res = await API.getLocations();
      this.renderTransferGrid(res.data || []);
      this.renderTransferDetail();
    } catch (err) {
      console.error('로케이션 데이터 로드 실패:', err);
    }
  },

  renderTransferGrid(locations) {
    const tableBody = document.getElementById('masterTableBody');
    const thead = document.getElementById('masterTableHead');

    thead.innerHTML = `
      <tr>
        <th>로케이션 코드</th>
        <th>로케이션 명칭</th>
        <th>구역</th>
        <th>적재현황 / 수용용량</th>
        <th>상태</th>
        <th>선택</th>
      </tr>
    `;

    tableBody.innerHTML = locations.map(loc => `
      <tr onclick="App.setTransferTargetLocation('${loc.LOC_CODE}')">
        <td><strong style="font-family:monospace; color:#22d3ee;">${loc.LOC_CODE}</strong></td>
        <td><strong>${loc.LOC_NAME}</strong></td>
        <td>${loc.ZONE}</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="flex:1; background:#334155; height:8px; border-radius:4px; overflow:hidden;">
              <div style="width:${Math.min(100, (loc.CURRENT_COUNT / loc.MAX_CAPACITY) * 100)}%; background:#3b82f6; height:100%;"></div>
            </div>
            <span>${loc.CURRENT_COUNT} / ${loc.MAX_CAPACITY}</span>
          </div>
        </td>
        <td><span class="badge badge-pass">${loc.STATUS}</span></td>
        <td><button class="btn btn-secondary" style="height:32px; padding:0 10px; font-size:0.8rem;">이동지정</button></td>
      </tr>
    `).join('');
  },

  renderTransferDetail() {
    const container = document.getElementById('detailContent');
    const actions = document.getElementById('detailActions');
    const s = this.transferState;

    container.innerHTML = `
      <div class="form-section">
        <div class="section-title">📦 Step 1: 이동할 자재 바코드 스캔</div>
        <div style="display:flex; gap:8px;">
          <input type="text" id="transferMatInput" class="touch-input" placeholder="자재 바코드 스캔 또는 입력" value="${s.materialBarcode}">
          <button class="btn btn-scan" onclick="App.scanForTransferMaterial()">📷 스캔</button>
        </div>
        ${s.materialItem ? `
          <div style="margin-top:10px; padding:10px; background:#1e293b; border-radius:6px; font-size:0.85rem;">
            <div><strong>품명:</strong> ${s.materialItem.ITEM_NAME}</div>
            <div><strong>현재 위치:</strong> <span style="color:#fbbf24;">${s.materialItem.CURRENT_LOC}</span></div>
          </div>
        ` : ''}
      </div>

      <div class="form-section">
        <div class="section-title">📍 Step 2: 목적지 로케이션 바코드 스캔</div>
        <div style="display:flex; gap:8px;">
          <input type="text" id="transferLocInput" class="touch-input" placeholder="로케이션 바코드 스캔 (예: YD-A-01)" value="${s.targetLocation}">
          <button class="btn btn-scan" onclick="App.scanForTransferLocation()">📷 스캔</button>
        </div>
      </div>

      <!-- 이송 매핑 시각화 -->
      <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:16px; text-align:center;">
        <div style="display:flex; align-items:center; justify-content:space-around;">
          <div>
            <div style="font-size:0.8rem; color:#94a3b8;">현재 위치</div>
            <div style="font-size:1.1rem; font-weight:700; color:#fbbf24;">${s.materialItem?.CURRENT_LOC || '미지정'}</div>
          </div>
          <div style="font-size:1.5rem; color:#3b82f6;">➔</div>
          <div>
            <div style="font-size:0.8rem; color:#94a3b8;">이동 목적지</div>
            <div style="font-size:1.1rem; font-weight:700; color:#34d399;">${s.targetLocation || '미선택'}</div>
          </div>
        </div>
      </div>
    `;

    actions.innerHTML = `
      <button class="btn btn-confirm" onclick="App.submitTransfer()">위치 매핑 완료 / MSSQL 갱신</button>
    `;
  },

  scanForTransferMaterial() {
    BarcodeScanner.open(async (barcode) => {
      this.transferState.materialBarcode = barcode;
      try {
        const res = await API.getInboundItem(barcode);
        this.transferState.materialItem = res.data;
      } catch (e) {
        this.transferState.materialItem = { ITEM_NAME: '자재 ' + barcode, CURRENT_LOC: '하역장' };
      }
      this.renderTransferDetail();
    });
  },

  scanForTransferLocation() {
    BarcodeScanner.open((locBarcode) => {
      this.setTransferTargetLocation(locBarcode);
    });
  },

  setTransferTargetLocation(locCode) {
    this.transferState.targetLocation = locCode;
    this.renderTransferDetail();
  },

  async submitTransfer() {
    const s = this.transferState;
    const barcode = document.getElementById('transferMatInput')?.value || s.materialBarcode;
    const toLocation = document.getElementById('transferLocInput')?.value || s.targetLocation;

    if (!barcode || !toLocation) {
      alert('자재 바코드와 목적지 로케이션을 모두 지정해야 합니다.');
      return;
    }

    try {
      const res = await API.submitTransfer({
        barcode,
        toLocation,
        worker: '김현장 작업자'
      });

      alert('✓ ' + (res.message || '자재 위치가 갱신되었습니다.'));
      this.transferState = { materialBarcode: '', materialItem: null, targetLocation: '' };
      this.loadTransferData();
    } catch (err) {
      alert('이송 처리 오류: ' + err.message);
    }
  },

  // =============================================================================
  // [4] 공정/물류 인계 및 서명 로직
  // =============================================================================
  async loadHandoverData() {
    try {
      const res = await API.getHandoverList();
      this.currentItems = res.data || [];
      this.handoverItems = [...this.currentItems];
      this.renderHandoverGrid();
      this.renderHandoverDetail();
    } catch (err) {
      console.error('인계 데이터 로드 실패:', err);
    }
  },

  renderHandoverGrid() {
    const tableBody = document.getElementById('masterTableBody');
    const thead = document.getElementById('masterTableHead');

    thead.innerHTML = `
      <tr>
        <th style="width:40px;">선택</th>
        <th>바코드/QR</th>
        <th>품번</th>
        <th>품명</th>
        <th>수량</th>
        <th>현재위치</th>
        <th>검사/등급</th>
      </tr>
    `;

    tableBody.innerHTML = this.currentItems.map((item, idx) => `
      <tr>
        <td style="text-align:center;">
          <input type="checkbox" checked onchange="App.toggleHandoverItem('${item.BARCODE}', this.checked)" style="width:20px; height:20px;">
        </td>
        <td><strong style="font-family:monospace; color:#60a5fa;">${item.BARCODE}</strong></td>
        <td>${item.ITEM_CODE}</td>
        <td><strong>${item.ITEM_NAME}</strong></td>
        <td><strong>${item.ACTUAL_QTY || item.PLAN_QTY} ${item.UNIT || 'EA'}</strong></td>
        <td><span class="badge badge-loc">${item.CURRENT_LOC}</span></td>
        <td><span class="badge badge-pass">A등급</span></td>
      </tr>
    `).join('');
  },

  toggleHandoverItem(barcode, checked) {
    if (checked) {
      const item = this.currentItems.find(it => it.BARCODE === barcode);
      if (item && !this.handoverItems.some(it => it.BARCODE === barcode)) {
        this.handoverItems.push(item);
      }
    } else {
      this.handoverItems = this.handoverItems.filter(it => it.BARCODE !== barcode);
    }
    this.renderHandoverDetail();
  },

  renderHandoverDetail() {
    const container = document.getElementById('detailContent');
    const actions = document.getElementById('detailActions');
    const totalQty = this.handoverItems.reduce((sum, it) => sum + parseFloat(it.ACTUAL_QTY || it.PLAN_QTY || 0), 0);

    container.innerHTML = `
      <div class="spec-card">
        <div class="spec-title">
          <span>인계 집계 현황</span>
          <span style="color:#34d399; font-size:1.1rem;">총 ${this.handoverItems.length}건 / ${totalQty} 수량</span>
        </div>
        <div style="font-size:0.85rem; color:#94a3b8;">
          인계 대상 자재 목록이 실물과 일치하는지 확인 후 인수자 서명을 날인합니다.
        </div>
      </div>

      <div class="form-section">
        <div class="section-title">🏢 인수 정보 입력</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label class="filter-label">인수 부서</label>
            <select id="handoverDept" class="filter-select" style="width:100%; height:48px; font-size:1rem;">
              <option value="가공1팀">가공1팀 (절단/성형)</option>
              <option value="조립2팀">조립2팀 (메인용접)</option>
              <option value="물류출하팀">물류출하팀</option>
            </select>
          </div>
          <div>
            <label class="filter-label">인수자 성명</label>
            <input type="text" id="handoverReceiver" class="touch-input" placeholder="인수자 이름 입력" value="박가공 반장">
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="section-title" style="justify-content:space-between;">
          <span>✍️ 터치 전자서명 날인</span>
          <button class="btn btn-secondary" style="height:32px; padding:0 10px; font-size:0.8rem;" onclick="DigitalSignature.open((dataUrl) => App.onSignatureDone(dataUrl))">
            서명하기 (Sign)
          </button>
        </div>
        <div id="signaturePreviewBox" style="height:110px; background:#1e293b; border:1px dashed #475569; border-radius:6px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="DigitalSignature.open((dataUrl) => App.onSignatureDone(dataUrl))">
          <span style="color:#94a3b8; font-size:0.9rem;">여기를 터치하여 전자서명을 날인하세요.</span>
        </div>
      </div>
    `;

    actions.innerHTML = `
      <button class="btn btn-confirm" onclick="App.submitHandover()">인계 완료 및 전산 확정</button>
    `;
  },

  onSignatureDone(dataUrl) {
    this.currentSignature = dataUrl;
    const box = document.getElementById('signaturePreviewBox');
    if (box) {
      box.innerHTML = `<img src="${dataUrl}" style="max-height:90px; max-width:90%; object-fit:contain; background:#fff; padding:4px; border-radius:4px;">`;
    }
  },

  async submitHandover() {
    if (this.handoverItems.length === 0) {
      alert('인계할 품목을 1개 이상 선택해 주세요.');
      return;
    }
    if (!this.currentSignature) {
      alert('인수자 전자서명이 날인되지 않았습니다. [서명하기]를 진행해 주세요.');
      return;
    }

    const targetDept = document.getElementById('handoverDept')?.value || '가공1팀';
    const receiverName = document.getElementById('handoverReceiver')?.value || '인수자';

    const items = this.handoverItems.map(it => ({
      barcode: it.BARCODE,
      qty: it.ACTUAL_QTY || it.PLAN_QTY
    }));

    try {
      const res = await API.submitHandover({
        targetDept,
        receiverName,
        signatureData: this.currentSignature,
        items
      });

      alert('✓ ' + (res.message || '인계가 성공적으로 완료되었습니다.'));
      this.currentSignature = null;
      this.loadHandoverData();
    } catch (err) {
      alert('인계 처리 오류: ' + err.message);
    }
  },

  // =============================================================================
  // 공통 UI 유틸리티
  // =============================================================================
  getStatusBadge(materialStatus, inspStatus) {
    if (materialStatus === 'COMPLETED') return '<span class="badge badge-pass">인계완료</span>';
    if (materialStatus === 'STOCK') return '<span class="badge badge-pass">입고완료</span>';
    if (materialStatus === 'SORT_WAIT' || inspStatus === 'CONDITIONAL') return '<span class="badge badge-sort">선별대기</span>';
    if (inspStatus === 'FAIL') return '<span class="badge badge-fail">불합격</span>';
    return '<span class="badge badge-waiting">검사대기</span>';
  },

  renderEmptyDetail(message) {
    document.getElementById('detailContent').innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-dim); gap:12px;">
        <span style="font-size:2.5rem;">📋</span>
        <p>${message}</p>
      </div>
    `;
    document.getElementById('detailActions').innerHTML = '';
  },

  // 툴바 이벤트 및 글로벌 바코드 스캔
  setupEventListeners() {
    // 툴바 [조회]
    document.getElementById('btnSearch')?.addEventListener('click', () => {
      this.switchTab(this.currentTab);
    });

    // 툴바 [초기화]
    document.getElementById('btnReset')?.addEventListener('click', () => {
      document.getElementById('filterKeyword').value = '';
      document.getElementById('filterSupplier').value = '';
      this.switchTab(this.currentTab);
    });

    // 툴바 [📷 바코드 스캔] 플로팅/고정 버튼
    document.getElementById('btnGlobalScan')?.addEventListener('click', () => {
      BarcodeScanner.open((scannedBarcode) => {
        console.log('스캔된 바코드:', scannedBarcode);
        const matchItem = this.currentItems.find(it => it.BARCODE === scannedBarcode);
        if (matchItem) {
          this.selectItem(matchItem);
          const row = document.querySelector(`tr[data-barcode="${scannedBarcode}"]`);
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.classList.add('scanned-highlight');
          }
        } else {
          alert(`스캔된 바코드 [${scannedBarcode}] 품목을 현재 목록에서 찾을 수 없습니다.`);
        }
      });
    });
  }
};

// DOM 로드 완료 시 애플리케이션 가동
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
