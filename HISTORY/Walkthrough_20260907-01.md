# Walkthrough - 실제 MES DB 직접 연동을 위한 임의 스키마/시드 및 Mock DB 전면 제거

사용자 요청에 따라 기존에 임의로 구성했던 인터페이스 DDL/시드(`sql/`) 및 백엔드 인메모리 Mock DB를 전면 제거하고, 사내 실제 MS-SQL DB 직접 연동 전용 구조로 재정비했습니다.

---

## 1. 주요 작업 완료 내역

### 1) 데이터베이스 레이어 (`sql/` 제거)
* **`sql/01_schema.sql`, `sql/02_seed_data.sql` 및 `sql/` 폴더 완전 삭제**:
  * 임의 인터페이스 DDL 및 시드 데이터를 완전히 제거했습니다.
  * 추후 사용자께서 별도로 정리하여 제공해주실 **사내 실제 MES 테이블 및 인덱스 정보**에 맞추어 쿼리를 1:1 직접 매핑할 수 있도록 준비했습니다.

### 2) 백엔드 레이어 (`server/`)
* **Mock DB 완전 삭제**:
  * `server/src/mock/sampleData.js` 및 `server/src/mock/` 폴더 완전 삭제
* **MS-SQL 커넥션 모듈 간소화 (`server/src/config/db.js`)**:
  * Mock fallback 및 `USE_MOCK_DB` 제거
  * 순수 MS-SQL 커넥션 풀 관리 (`initDb()`, `getPool()`, `isDbConnected()`, `sql`)로 전환
  * 연결 실패 시 경고 후 Mock 전환 대신 실패 로그 기록 및 `pool = null` 유지
* **서버 진입점 정비 (`server/src/app.js`)**:
  * `/api/health` 응답에 `dbConnected: boolean` 제공
  * 서버 기동 콘솔 로그에서 Mock 모드 관련 안내 소거
* **4대 업무 REST API 라우터 개편**:
  * `inbound.js`, `sorting.js`, `transfer.js`, `handover.js` 내 `isMock()`, `mockDb` 분기 코드 전면 삭제
  * DB 미연결 시 `503 Service Unavailable` 명확한 에러를 반환하도록 가드 미들웨어(`checkDbConnection`) 탑재
* **설정 및 환경변수 정비**:
  * `server/package.json`: description에서 `& Mock Support` 소거
  * `.env.example` 및 `docker-compose.yml`: `USE_MOCK_DB` 설정 소거

### 3) 프론트엔드 레이어 (`client/`)
* **`index.html`**:
  * 스캐너 모달 하단의 임의 모의 바코드 버튼 목록(`MAT-20260906-001`, `YD-A-01` 등) 제거
  * 실시간 카메라 스캔 및 수동 바코드 입력창만 유지하여 가상 데이터 혼선 방지
* **`client/js/app.js`**:
  * `checkServerStatus()`에서 `mockMode` 분기 소거
  * `MS-SQL 연동` 또는 `DB 미연결` 상태만 표시
* **`client/css/style.css`**:
  * 불필요해진 `.status-pill.mock` 스타일 제거

### 4) 지침서 및 이력 관리 (`AGENTS.md`, `README.md`)
* **`AGENTS.md`**:
  * 핵심 아키텍처를 **"사내 MS-SQL Server (기존 MES DB 100% 직접 연동, 임의의 목업/가상 데이터 배제)"**로 갱신
  * 행동 지침 6항 신설: **"목업 및 가상 데이터 생성 절대 금지 원칙: 데이터 혼선 방지를 위해 사용자의 명시적 요청이 없는 한 임의의 목업/시드 데이터를 절대 생성하지 않는다."** 명문화
* **`README.md`**:
  * Mock DB 관련 내용 전면 삭제 및 디렉터리 구조 갱신

---

## 2. 동작 검증 결과

* **잔여 Mock 레퍼런스 검사**:
  * `mock`, `sampleData` 전역 검색 결과 기존 이력 문서를 제외한 모든 소스 코드 및 설정에서 **0건** 확인
* **디렉터리 삭제 검증**:
  * `sql/` 및 `server/src/mock/` 폴더 완전 제거 확인 (`Test-Path: False`)
* **백엔드 서버 기동 검증**:
  * `node src/app.js` 실행 시 에러 없이 MS-SQL 접속 시도 및 정상 구동 로그 출력 확인
* **헬스체크 및 DB 미연결 에러 응답 검증**:
  * `GET /api/health` ➔ `200 OK` (`{"status":"UP","system":"Yard Pad MES Server","dbConnected":false}`)
  * `GET /api/inbound` (DB 미연결 시) ➔ `503 Service Unavailable` (`{"success":false,"message":"사내 MS-SQL 데이터베이스에 연결되어 있지 않습니다. 서버 연결 상태를 확인해 주십시오."}`)
