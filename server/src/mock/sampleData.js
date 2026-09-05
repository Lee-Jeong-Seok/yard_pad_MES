// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: sampleData.js
// 설명: 로컬 개발 및 오프라인 시뮬레이션용 인메모리 Mock 데이터베이스
// =============================================================================

class MockDatabase {
  constructor() {
    this.resetData();
  }

  resetData() {
    // 1. 야드 로케이션
    this.locations = [
      { LOC_CODE: 'YD-UNLOAD-01', LOC_NAME: '하역장 1번 대기구역', ZONE: '하역장', MAX_CAPACITY: 200, CURRENT_COUNT: 15, STATUS: 'ACTIVE' },
      { LOC_CODE: 'YD-A-01', LOC_NAME: 'A구역 1라인 (원자재 강판)', ZONE: 'A구역', MAX_CAPACITY: 50, CURRENT_COUNT: 20, STATUS: 'ACTIVE' },
      { LOC_CODE: 'YD-A-02', LOC_NAME: 'A구역 2라인 (원자재 빔/형강)', ZONE: 'A구역', MAX_CAPACITY: 50, CURRENT_COUNT: 35, STATUS: 'ACTIVE' },
      { LOC_CODE: 'YD-B-01', LOC_NAME: 'B구역 1라인 (선별대기장)', ZONE: 'B구역', MAX_CAPACITY: 40, CURRENT_COUNT: 10, STATUS: 'ACTIVE' },
      { LOC_CODE: 'YD-B-02', LOC_NAME: 'B구역 2라인 (가공부품 대기)', ZONE: 'B구역', MAX_CAPACITY: 60, CURRENT_COUNT: 42, STATUS: 'ACTIVE' },
      { LOC_CODE: 'YD-C-01', LOC_NAME: 'C구역 1라인 (공정 투입대기)', ZONE: 'C구역', MAX_CAPACITY: 80, CURRENT_COUNT: 25, STATUS: 'ACTIVE' },
      { LOC_CODE: 'YD-REJECT-01', LOC_NAME: '반품/불량 집하장', ZONE: '반품장', MAX_CAPACITY: 30, CURRENT_COUNT: 4, STATUS: 'ACTIVE' }
    ];

    // 2. 발주 품목
    this.orders = [
      {
        ORDER_NO: 'PO-2026-0901',
        ORDER_SEQ: 1,
        ITEM_CODE: 'STL-PL-12T',
        ITEM_NAME: '구조용 후판 강판 12T',
        SPEC: '12T x 2438 x 6096 (SS275)',
        SUPPLIER_CODE: 'VND-001',
        SUPPLIER_NAME: '포스코스틸(주)',
        INBOUND_PLAN_DATE: '2026-09-06',
        PLAN_QTY: 15.00,
        UNIT: 'TON',
        ORDER_STATUS: 'WAITING',
        DOC_URL: '/docs/spec_sample.pdf',
        BARCODE: 'MAT-20260906-001',
        LOT_NO: 'LOT-POS-2609-A',
        ACTUAL_QTY: 15.00,
        CURRENT_LOC: 'YD-UNLOAD-01',
        MATERIAL_STATUS: 'INSPECT_WAIT',
        INSP_STATUS: 'NONE',
        GRADE: null
      },
      {
        ORDER_NO: 'PO-2026-0901',
        ORDER_SEQ: 2,
        ITEM_CODE: 'STL-PL-20T',
        ITEM_NAME: '구조용 후판 강판 20T',
        SPEC: '20T x 2438 x 6096 (SM355)',
        SUPPLIER_CODE: 'VND-001',
        SUPPLIER_NAME: '포스코스틸(주)',
        INBOUND_PLAN_DATE: '2026-09-06',
        PLAN_QTY: 25.00,
        UNIT: 'TON',
        ORDER_STATUS: 'WAITING',
        DOC_URL: '/docs/spec_sample.pdf',
        BARCODE: 'MAT-20260906-002',
        LOT_NO: 'LOT-POS-2609-B',
        ACTUAL_QTY: 25.00,
        CURRENT_LOC: 'YD-UNLOAD-01',
        MATERIAL_STATUS: 'INSPECT_WAIT',
        INSP_STATUS: 'NONE',
        GRADE: null
      },
      {
        ORDER_NO: 'PO-2026-0902',
        ORDER_SEQ: 1,
        ITEM_CODE: 'H-BM-300',
        ITEM_NAME: 'H형강 보강재',
        SPEC: 'H-300x150x6.5/9',
        SUPPLIER_CODE: 'VND-002',
        SUPPLIER_NAME: '현대제철(주)',
        INBOUND_PLAN_DATE: '2026-09-06',
        PLAN_QTY: 40.00,
        UNIT: 'EA',
        ORDER_STATUS: 'WAITING',
        DOC_URL: '/docs/spec_sample.pdf',
        BARCODE: 'MAT-20260906-003',
        LOT_NO: 'LOT-HYN-2608-01',
        ACTUAL_QTY: 40.00,
        CURRENT_LOC: 'YD-UNLOAD-01',
        MATERIAL_STATUS: 'INSPECT_WAIT',
        INSP_STATUS: 'NONE',
        GRADE: null
      },
      {
        ORDER_NO: 'PO-2026-0903',
        ORDER_SEQ: 1,
        ITEM_CODE: 'PIP-SMLS-100',
        ITEM_NAME: '무계목 배관 파이프',
        SPEC: 'Sch.40 100A x 6M',
        SUPPLIER_CODE: 'VND-003',
        SUPPLIER_NAME: '동양스틸파이프',
        INBOUND_PLAN_DATE: '2026-09-06',
        PLAN_QTY: 50.00,
        UNIT: 'EA',
        ORDER_STATUS: 'INSPECTED',
        DOC_URL: '/docs/spec_sample.pdf',
        BARCODE: 'MAT-20260906-004',
        LOT_NO: 'LOT-DYP-2607-X',
        ACTUAL_QTY: 50.00,
        CURRENT_LOC: 'YD-B-01',
        MATERIAL_STATUS: 'SORT_WAIT',
        INSP_STATUS: 'CONDITIONAL',
        GRADE: null
      },
      {
        ORDER_NO: 'PO-2026-0904',
        ORDER_SEQ: 1,
        ITEM_CODE: 'BLT-HT-M24',
        ITEM_NAME: '고장력 육각볼트 세트',
        SPEC: 'M24 x 110L (F10T)',
        SUPPLIER_CODE: 'VND-004',
        SUPPLIER_NAME: '삼우특수화스너',
        INBOUND_PLAN_DATE: '2026-09-06',
        PLAN_QTY: 200.00,
        UNIT: 'SET',
        ORDER_STATUS: 'WAITING',
        DOC_URL: '/docs/spec_sample.pdf',
        BARCODE: 'MAT-20260906-005',
        LOT_NO: 'LOT-SAM-2609-F',
        ACTUAL_QTY: 200.00,
        CURRENT_LOC: 'YD-A-01',
        MATERIAL_STATUS: 'STOCK',
        INSP_STATUS: 'PASS',
        GRADE: 'A'
      },
      {
        ORDER_NO: 'PO-2026-0901',
        ORDER_SEQ: 1,
        ITEM_CODE: 'STL-PL-12T',
        ITEM_NAME: '구조용 후판 강판 12T (공정인계대기)',
        SPEC: '12T x 2438 x 6096 (SS275)',
        SUPPLIER_CODE: 'VND-001',
        SUPPLIER_NAME: '포스코스틸(주)',
        INBOUND_PLAN_DATE: '2026-09-05',
        PLAN_QTY: 10.00,
        UNIT: 'TON',
        ORDER_STATUS: 'INSPECTED',
        DOC_URL: '/docs/spec_sample.pdf',
        BARCODE: 'MAT-20260906-006',
        LOT_NO: 'LOT-POS-2608-Z',
        ACTUAL_QTY: 10.00,
        CURRENT_LOC: 'YD-C-01',
        MATERIAL_STATUS: 'HANDOVER_WAIT',
        INSP_STATUS: 'PASS',
        GRADE: 'A'
      }
    ];

    // 3. 검사 결과 이력
    this.inspResults = [];

    // 4. 선별 결과 이력
    this.sortResults = [];

    // 5. 이송 이력
    this.transfers = [];

    // 6. 인계 이력
    this.handovers = [];
  }
}

const mockDb = new MockDatabase();
module.exports = mockDb;
