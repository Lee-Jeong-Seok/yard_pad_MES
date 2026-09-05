-- =============================================================================
-- 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
-- 파일명: 02_seed_data.sql
-- 설명: 로컬 테스트 및 현장 PoC 시뮬레이션용 초기 시드 데이터
-- =============================================================================

-- 1. 야드 로케이션 초기 데이터
INSERT INTO TB_YARD_LOCATION (LOC_CODE, LOC_NAME, ZONE, MAX_CAPACITY, CURRENT_COUNT, STATUS)
VALUES 
('YD-UNLOAD-01', '하역장 1번 대기구역', '하역장', 200, 15, 'ACTIVE'),
('YD-A-01', 'A구역 1라인 (원자재 강판)', 'A구역', 50, 20, 'ACTIVE'),
('YD-A-02', 'A구역 2라인 (원자재 빔/형강)', 'A구역', 50, 35, 'ACTIVE'),
('YD-B-01', 'B구역 1라인 (선별대기장)', 'B구역', 40, 10, 'ACTIVE'),
('YD-B-02', 'B구역 2라인 (가공부품 대기)', 'B구역', 60, 42, 'ACTIVE'),
('YD-C-01', 'C구역 1라인 (공정 투입대기)', 'C구역', 80, 25, 'ACTIVE'),
('YD-REJECT-01', '반품/불량 집하장', '반품장', 30, 4, 'ACTIVE');

-- 2. 발주 품목 초기 데이터
INSERT INTO TB_YARD_ORDER_ITEM (ORDER_NO, ORDER_SEQ, ITEM_CODE, ITEM_NAME, SPEC, SUPPLIER_CODE, SUPPLIER_NAME, INBOUND_PLAN_DATE, PLAN_QTY, UNIT, STATUS, DOC_URL)
VALUES
('PO-2026-0901', 1, 'STL-PL-12T', '구조용 후판 강판 12T', '12T x 2438 x 6096 (SS275)', 'VND-001', '포스코스틸(주)', '2026-09-06', 15.00, 'TON', 'WAITING', '/docs/spec_STL_PL_12T.pdf'),
('PO-2026-0901', 2, 'STL-PL-20T', '구조용 후판 강판 20T', '20T x 2438 x 6096 (SM355)', 'VND-001', '포스코스틸(주)', '2026-09-06', 25.00, 'TON', 'WAITING', '/docs/spec_STL_PL_20T.pdf'),
('PO-2026-0902', 1, 'H-BM-300', 'H형강 보강재', 'H-300x150x6.5/9', 'VND-002', '현대제철(주)', '2026-09-06', 40.00, 'EA', 'WAITING', '/docs/spec_H_BM_300.pdf'),
('PO-2026-0903', 1, 'PIP-SMLS-100', '무계목 배관 파이프', 'Sch.40 100A x 6M', 'VND-003', '동양스틸파이프', '2026-09-06', 50.00, 'EA', 'INSPECTED', '/docs/spec_PIP_SMLS.pdf'),
('PO-2026-0904', 1, 'BLT-HT-M24', '고장력 육각볼트 세트', 'M24 x 110L (F10T)', 'VND-004', '삼우특수화스너', '2026-09-06', 200.00, 'SET', 'WAITING', '/docs/spec_BLT_M24.pdf');

-- 3. 자재 바코드 마스터 초기 데이터
INSERT INTO TB_YARD_MATERIAL (BARCODE, ORDER_NO, ORDER_SEQ, ITEM_CODE, LOT_NO, QTY, CURRENT_LOC, STATUS, INSP_STATUS, GRADE)
VALUES
('MAT-20260906-001', 'PO-2026-0901', 1, 'STL-PL-12T', 'LOT-POS-2609-A', 15.00, 'YD-UNLOAD-01', 'INSPECT_WAIT', 'NONE', NULL),
('MAT-20260906-002', 'PO-2026-0901', 2, 'STL-PL-20T', 'LOT-POS-2609-B', 25.00, 'YD-UNLOAD-01', 'INSPECT_WAIT', 'NONE', NULL),
('MAT-20260906-003', 'PO-2026-0902', 1, 'H-BM-300', 'LOT-HYN-2608-01', 40.00, 'YD-UNLOAD-01', 'INSPECT_WAIT', 'NONE', NULL),
('MAT-20260906-004', 'PO-2026-0903', 1, 'PIP-SMLS-100', 'LOT-DYP-2607-X', 50.00, 'YD-B-01', 'SORT_WAIT', 'CONDITIONAL', NULL),
('MAT-20260906-005', 'PO-2026-0904', 1, 'BLT-HT-M24', 'LOT-SAM-2609-F', 200.00, 'YD-A-01', 'STOCK', 'PASS', 'A'),
('MAT-20260906-006', 'PO-2026-0901', 1, 'STL-PL-12T', 'LOT-POS-2608-Z', 10.00, 'YD-C-01', 'HANDOVER_WAIT', 'PASS', 'A');
