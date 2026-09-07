# [실행 계획] 실제 MES DB 직접 연동을 위한 임의 인터페이스 스키마/시드 및 Mock DB 전면 제거

## 1. 개요 및 배경
사용자 요청에 따라 기존에 임의로 구성했던 인터페이스 DDL/시드 데이터 및 백엔드 인메모리 Mock DB를 전면 제거합니다.
향후 개발은 **사용자께서 별도 정리하여 제공해주실 실제 사내 MES DB의 테이블과 인덱스 정보**를 기준으로 1:1 직접 연동할 것이며, 데이터 혼선을 유발하는 임의의 목업/가상 데이터 생성은 전면 배제합니다.

---

## 2. 사용자 확인 및 검토 필요 사항 (User Review Required)

> [!IMPORTANT]
> **1. 사내 MES 테이블 및 인덱스 정보 제공 대기**
> - `sql/` 폴더 내 임의 DDL(`01_schema.sql`, `02_seed_data.sql`)을 완전히 삭제합니다.
> - 백엔드 라우터(`inbound`, `sorting`, `transfer`, `handover`)의 쿼리는 실제 MES DB의 테이블/컬럼/인덱스 명세서를 전달받는 즉시 해당 스키마에 맞춰 1:1 매핑 갱신될 예정입니다.
> 
> **2. Mock DB 완전 제거 및 에러 응답 체계**
> - `server/src/mock/` 폴더 및 `sampleData.js`를 완전히 삭제합니다.
> - 백엔드 `db.js` 및 라우터에서 `isMock()`, `mockDb` 분기를 완전히 제거하고, MS-SQL 연결 풀만 남깁니다.
> - MS-SQL 서버 미연결 상태에서 API 요청 시, 가상 데이터로 폴백하지 않고 명확하게 `503 Service Unavailable / 500 DB Connection Error`를 반환합니다.
> 
> **3. 향후 가상/목업 데이터 생성 금지 원칙 규정화**
> - `AGENTS.md`의 행동 지침에 "임의의 목업이나 가상 데이터 생성 절대 금지 (사용자 명시적 요청 시에만 예외 허용)" 조항을 신설합니다.

---

## 3. 세부 작업 계획 (Proposed Changes)

### 3.1 데이터베이스 계층 (Database)
- [DELETE] `sql/01_schema.sql` (임의 DDL 스키마 삭제)
- [DELETE] `sql/02_seed_data.sql` (임의 시드 데이터 삭제)
- [DELETE] `sql/` 디렉터리 제거

---

### 3.2 백엔드 계층 (Server)
#### [DELETE] `server/src/mock/sampleData.js` 및 `server/src/mock/`
- 인메모리 Mock DB 클래스 및 데이터 파일 완전 제거

#### [MODIFY] [`server/src/config/db.js`](file:///d:/dev_apps/yard_pad_MES/server/src/config/db.js)
- `mockDb` 및 `USE_MOCK_DB`, `isMock()` 제거
- 순수 MS-SQL 커넥션 풀 초기화 및 관리(`getPool()`, `sql`, `initDb()`, `isDbConnected()`)로 경량화
- 연결 실패 시 경고 후 Mock 전환 로직 제거 (실제 DB 연결 실패 로깅)

#### [MODIFY] [`server/src/app.js`](file:///d:/dev_apps/yard_pad_MES/server/src/app.js)
- `isMock` 참조 제거
- `/api/health` 응답을 `mockMode` 대신 `dbConnected: boolean`으로 정비
- 서버 기동 로그에서 MOCK 모드 관련 문구 소거

#### [MODIFY] 라우터 4종
- [`server/src/routes/inbound.js`](file:///d:/dev_apps/yard_pad_MES/server/src/routes/inbound.js): `isMock()` 및 `mockDb` 분기 완전 제거, MS-SQL 트랜잭션/쿼리 블록만 유지
- [`server/src/routes/sorting.js`](file:///d:/dev_apps/yard_pad_MES/server/src/routes/sorting.js): `isMock()` 및 `mockDb` 분기 완전 제거, MS-SQL 트랜잭션/쿼리 블록만 유지
- [`server/src/routes/transfer.js`](file:///d:/dev_apps/yard_pad_MES/server/src/routes/transfer.js): `isMock()` 및 `mockDb` 분기 완전 제거, MS-SQL 쿼리 블록만 유지
- [`server/src/routes/handover.js`](file:///d:/dev_apps/yard_pad_MES/server/src/routes/handover.js): `isMock()` 및 `mockDb` 분기 완전 제거, 파일 저장 및 MS-SQL 트랜잭션 블록만 유지

#### [MODIFY] [`server/package.json`](file:///d:/dev_apps/yard_pad_MES/server/package.json)
- description에서 `& Mock Support` 문구 소거

---

### 3.3 프론트엔드 계층 (Client)
#### [MODIFY] [`client/index.html`](file:///d:/dev_apps/yard_pad_MES/client/index.html)
- 스캐너 모달 하단의 임의 모의 바코드 버튼 목록(`MAT-20260906-001`, `YD-A-01` 등) 제거
- 실시간 카메라 스캔 및 수동 바코드 입력창(직접 실물 바코드 번호 입력)만 유지

#### [MODIFY] [`client/js/app.js`](file:///d:/dev_apps/yard_pad_MES/client/js/app.js)
- `checkServerStatus()`에서 `mockMode` 분기 소거
- DB 연결 상태를 `MS-SQL 연동` 또는 `DB 미연결`로 단순 명확화

#### [MODIFY] [`client/css/style.css`](file:///d:/dev_apps/yard_pad_MES/client/css/style.css)
- 불필요해진 `.status-pill.mock` 스타일 소거

---

### 3.4 프로젝트 가이드 및 개발 이력 (Rules & History)
#### [MODIFY] [`AGENTS.md`](file:///d:/dev_apps/yard_pad_MES/AGENTS.md)
- 핵심 아키텍처에서 Mock 관련 내용 소거 및 **실제 사내 MES DB 100% 직접 연동** 원칙 반영
- 행동 지침에 **"목업 및 가상 데이터 생성 금지 원칙: 데이터 혼선 방지를 위해 사용자의 명시적 요청이 없는 한 임의의 목업/시드 데이터를 절대 생성하지 않는다."** 명문화

#### [MODIFY] [`README.md`](file:///d:/dev_apps/yard_pad_MES/README.md)
- 아키텍처 및 시작 가이드에서 Mock DB 관련 내용 전면 수정

#### [NEW] `HISTORY/Implementation Plan_20260907-01.md`
- 본 실행 계획서 영구 백업

#### [NEW] `HISTORY/Walkthrough_20260907-01.md`
- 작업 완료 후 상세 개발 보고서 작성

#### [MODIFY] `HISTORY/INDEX.md`
- 타임라인 인덱스 동기화

---

## 4. 검증 계획 (Verification Plan)

### 4.1 소스 검증
- 전체 프로젝트 코드베이스를 대상으로 `mock`, `sampleData` 검색을 수행하여 잔여 레퍼런스가 0건인지 확인
- `server/` 디렉터리 내에서 node 실행 검사:
  - `node src/app.js` 구동 시 에러 없이 MS-SQL 접속 시도 및 정상 구동 로그 출력 확인
  - `/api/health` 호출 시 `{ status: "UP", dbConnected: false, ... }` (DB 미연결 시) 정상 반환 확인

### 4.2 Git 동기화
- `git status`, `git add`, `git commit`, `git push origin main` 자동 수행 및 정상 반영 확인
