-- =============================================================================
-- 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
-- 파일명: 01_schema.sql
-- 설명: MS-SQL Server 기반 데이터베이스 테이블 및 뷰 DDL 스키마
-- =============================================================================

-- 1. 발주 및 입고 대상 마스터 테이블
IF OBJECT_ID('TB_YARD_ORDER_ITEM', 'U') IS NULL
BEGIN
    CREATE TABLE TB_YARD_ORDER_ITEM (
        ORDER_NO NVARCHAR(50) NOT NULL,          -- 발주번호 (예: PO-2026-0901)
        ORDER_SEQ INT NOT NULL DEFAULT 1,        -- 발주순번
        ITEM_CODE NVARCHAR(50) NOT NULL,         -- 품번
        ITEM_NAME NVARCHAR(100) NOT NULL,        -- 품명
        SPEC NVARCHAR(100) NULL,                 -- 규격
        SUPPLIER_CODE NVARCHAR(50) NOT NULL,     -- 공급사 코드
        SUPPLIER_NAME NVARCHAR(100) NOT NULL,    -- 공급사 명
        INBOUND_PLAN_DATE DATE NOT NULL,         -- 입고예정일
        PLAN_QTY DECIMAL(18, 2) NOT NULL,        -- 발주/예정수량
        UNIT NVARCHAR(20) DEFAULT 'EA',          -- 단위
        STATUS NVARCHAR(20) DEFAULT 'WAITING',   -- 상태 (WAITING: 대기, INSPECTED: 검사완료, SORTED: 선별완료)
        DOC_URL NVARCHAR(255) NULL,              -- 도면/사양서 파일 경로
        REG_DATE DATETIME DEFAULT GETDATE(),
        PRIMARY KEY (ORDER_NO, ORDER_SEQ)
    );
END
GO

-- 2. 자재 개별 관리 단위 (바코드/QR 매핑 테이블)
IF OBJECT_ID('TB_YARD_MATERIAL', 'U') IS NULL
BEGIN
    CREATE TABLE TB_YARD_MATERIAL (
        BARCODE NVARCHAR(100) PRIMARY KEY,       -- 바코드/QR (예: MAT-202609-001)
        ORDER_NO NVARCHAR(50) NOT NULL,          -- 연계 발주번호
        ORDER_SEQ INT NOT NULL DEFAULT 1,
        ITEM_CODE NVARCHAR(50) NOT NULL,         -- 품번
        LOT_NO NVARCHAR(50) NOT NULL,            -- Lot 번호
        QTY DECIMAL(18, 2) NOT NULL,             -- 수량
        CURRENT_LOC NVARCHAR(50) DEFAULT 'UNASSIGNED', -- 현재 위치 (예: YD-A-01, UNASSIGNED)
        STATUS NVARCHAR(20) DEFAULT 'INSPECT_WAIT', -- 상태 (INSPECT_WAIT, SORT_WAIT, STOCK, HANDOVER_WAIT, COMPLETED)
        INSP_STATUS NVARCHAR(20) DEFAULT 'NONE', -- 검사 상태 (PASS, FAIL, CONDITIONAL)
        GRADE NVARCHAR(10) NULL,                 -- 등급 (A, B, C 등)
        UPD_DATE DATETIME DEFAULT GETDATE()
    );
END
GO

-- 3. 야드 로케이션 마스터 테이블
IF OBJECT_ID('TB_YARD_LOCATION', 'U') IS NULL
BEGIN
    CREATE TABLE TB_YARD_LOCATION (
        LOC_CODE NVARCHAR(50) PRIMARY KEY,       -- 로케이션 코드 (예: YD-A-01, YD-B-03)
        LOC_NAME NVARCHAR(100) NOT NULL,         -- 로케이션 명 (A구역 1번 야드)
        ZONE NVARCHAR(20) NOT NULL,              -- 구역 (A, B, C, 하역장, 반품장)
        MAX_CAPACITY INT DEFAULT 100,            -- 수용용량
        CURRENT_COUNT INT DEFAULT 0,             -- 현재적재수량
        STATUS NVARCHAR(20) DEFAULT 'ACTIVE',    -- 상태 (ACTIVE, FULL, MAINTENANCE)
        UPD_DATE DATETIME DEFAULT GETDATE()
    );
END
GO

-- 4. [1] 입고검사 결과 기록 테이블
IF OBJECT_ID('TB_YARD_INSP_RESULT', 'U') IS NULL
BEGIN
    CREATE TABLE TB_YARD_INSP_RESULT (
        INSP_ID INT IDENTITY(1,1) PRIMARY KEY,
        BARCODE NVARCHAR(100) NOT NULL,          -- 대상 바코드
        ORDER_NO NVARCHAR(50) NOT NULL,
        INSP_DATE DATETIME DEFAULT GETDATE(),    -- 검사일시
        INSPECTOR NVARCHAR(50) NOT NULL,         -- 검사원
        INSP_QTY DECIMAL(18, 2) NOT NULL,        -- 검사수량
        PASS_QTY DECIMAL(18, 2) NOT NULL,        -- 합격수량
        FAIL_QTY DECIMAL(18, 2) DEFAULT 0,       -- 불량수량
        JUDGMENT NVARCHAR(20) NOT NULL,          -- 종합판정 (PASS, FAIL, SORT_REQ)
        DEFECT_CODE NVARCHAR(50) NULL,           -- 불량코드 (SCRATCH, DIMENSION, CONTAMINATION 등)
        DEFECT_MEMO NVARCHAR(500) NULL,          -- 불량 특이사항
        PHOTO_URLS NVARCHAR(MAX) NULL,           -- 첨부 사진 URL (JSON 배열 또는 콤마 구분)
        REG_DATE DATETIME DEFAULT GETDATE()
    );
END
GO

-- 5. [2] 입고선별 결과 기록 테이블
IF OBJECT_ID('TB_YARD_SORT_RESULT', 'U') IS NULL
BEGIN
    CREATE TABLE TB_YARD_SORT_RESULT (
        SORT_ID INT IDENTITY(1,1) PRIMARY KEY,
        BARCODE NVARCHAR(100) NOT NULL,          -- 대상 바코드
        SORT_DATE DATETIME DEFAULT GETDATE(),    -- 선별일시
        SORTER NVARCHAR(50) NOT NULL,            -- 선별작업자
        GOOD_QTY DECIMAL(18, 2) NOT NULL,        -- 양품 수량
        DEFECT_QTY DECIMAL(18, 2) NOT NULL,      -- 불량 수량
        REWORK_QTY DECIMAL(18, 2) NOT NULL,      -- 재작업 수량
        GRADE NVARCHAR(10) NOT NULL,             -- 등급 (A, B, C)
        NEXT_LOCATION NVARCHAR(50) NULL,         -- 차기 지정 로케이션
        MEMO NVARCHAR(500) NULL,
        REG_DATE DATETIME DEFAULT GETDATE()
    );
END
GO

-- 6. [3] 야드 이송(위치 매핑) 이력 테이블
IF OBJECT_ID('TB_YARD_STOCK_LOC', 'U') IS NULL
BEGIN
    CREATE TABLE TB_YARD_STOCK_LOC (
        TRANSFER_ID INT IDENTITY(1,1) PRIMARY KEY,
        BARCODE NVARCHAR(100) NOT NULL,          -- 자재 바코드
        FROM_LOC NVARCHAR(50) NOT NULL,          -- 이전 위치
        TO_LOC NVARCHAR(50) NOT NULL,            -- 변경 위치
        WORKER NVARCHAR(50) NOT NULL,            -- 작업자
        TRANSFER_DATE DATETIME DEFAULT GETDATE() -- 이송일시
    );
END
GO

-- 7. [4] 공정/물류 인계 및 서명 기록 테이블
IF OBJECT_ID('TB_YARD_HANDOVER', 'U') IS NULL
BEGIN
    CREATE TABLE TB_YARD_HANDOVER (
        HANDOVER_NO NVARCHAR(50) PRIMARY KEY,    -- 인계번호 (예: HO-20260906-001)
        TARGET_DEPT NVARCHAR(50) NOT NULL,       -- 인수부서 (예: 가공1팀, 조립라인, 물류팀)
        RECEIVER_NAME NVARCHAR(50) NOT NULL,     -- 인수자명
        SIGNATURE_DATA NVARCHAR(MAX) NOT NULL,   -- 터치 전자서명 이미지 (Base64 또는 이미지 URL)
        ITEM_COUNT INT NOT NULL,                 -- 인계 품목 건수
        TOTAL_QTY DECIMAL(18, 2) NOT NULL,       -- 총 인계 수량
        BARCODES NVARCHAR(MAX) NOT NULL,         -- 포함된 자재 바코드 목록 (JSON)
        STATUS NVARCHAR(20) DEFAULT 'COMPLETED', -- 상태
        HANDOVER_DATE DATETIME DEFAULT GETDATE() -- 인계일시
    );
END
GO

-- 8. 입고/발주 조회 뷰 (기존 MES 미러링용)
IF OBJECT_ID('VW_YARD_INBOUND_LIST', 'V') IS NOT NULL
    DROP VIEW VW_YARD_INBOUND_LIST;
GO

CREATE VIEW VW_YARD_INBOUND_LIST AS
SELECT 
    O.ORDER_NO,
    O.ORDER_SEQ,
    O.ITEM_CODE,
    O.ITEM_NAME,
    O.SPEC,
    O.SUPPLIER_CODE,
    O.SUPPLIER_NAME,
    O.INBOUND_PLAN_DATE,
    O.PLAN_QTY,
    O.UNIT,
    O.STATUS AS ORDER_STATUS,
    O.DOC_URL,
    M.BARCODE,
    M.LOT_NO,
    ISNULL(M.QTY, O.PLAN_QTY) AS ACTUAL_QTY,
    ISNULL(M.CURRENT_LOC, '하역대기') AS CURRENT_LOC,
    ISNULL(M.STATUS, 'INSPECT_WAIT') AS MATERIAL_STATUS,
    ISNULL(M.INSP_STATUS, 'NONE') AS INSP_STATUS,
    M.GRADE
FROM TB_YARD_ORDER_ITEM O
LEFT JOIN TB_YARD_MATERIAL M 
    ON O.ORDER_NO = M.ORDER_NO AND O.ORDER_SEQ = M.ORDER_SEQ;
GO
