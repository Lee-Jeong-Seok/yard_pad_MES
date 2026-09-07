# AGENTS.md - 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES) AI Agent 지침서

이 문서는 **야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)** 개발 프로젝트에 참여하는 모든 AI Agent의 역할, 아키텍처 원칙, 행동 기준 및 개발 루틴을 정의합니다.

---

## 📌 1. 프로젝트 개요 및 핵심 아키텍처

* **프로젝트명**: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
* **목표**: 야드 현장의 4대 핵심 업무(**입고검사, 입고선별, 이송, 인계**)를 모바일 패드 1대로 1개월 내 PoC 테스트 배포하고, 사무실 PC에서도 동일하게 관리할 수 있도록 기존 MES 화면을 1:1 미러링한 반응형 PWA(웹) 시스템 구축
* **핵심 타깃 디바이스**: **삼성 갤럭시 탭 A9+** (11인치, 1920x1200, 16:10 가로 모드 중심) 및 사무실 PC 브라우저
* **시스템 구성**:
  1. **클라이언트**: 반응형 PWA 웹 애플리케이션 (주소창 없는 Standalone 모드, 카메라 바코드/QR 스캔, Canvas 자동 사진 압축, 터치 전자서명 캔버스, 내장 문서 뷰어)
  2. **서버 인프라**: 사내 Rocky Linux 서버 (Docker Compose 기반 Nginx 리버스 프록시 + Node.js Express REST API)
  3. **데이터베이스**: 사내 MS-SQL Server (기존 MES DB 100% 직접 연동, 임의의 목업/가상 데이터 배제)

---

## 🛠️ 2. 기술 스택 (Technology Stack)

* **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+), PWA (Service Worker & Manifest)
  * 바코드/QR 스캐너: `html5-qrcode`
  * 전자서명 패드: `signature_pad`
* **Backend**: Node.js, Express.js, `mssql` (T-SQL 커넥션 풀), `multer` (사진/도면 업로드), `cors`, `dotenv`
* **Infrastructure**: Docker, Docker Compose, Nginx Reverse Proxy
* **Database**: 사내 MS-SQL (MSSQL) Server

---

## 🤖 3. AI Agent 행동 지침 (Behavioral Rules)

1. **사용자 요구사항 및 현장성 최우선**:
   * 현장 작업자의 거친 작업 환경과 장갑 착용 등을 고려하여 터치 친화적 UI(최소 터치 타겟 48px 이상, 직관적인 시각 피드백)를 필히 유지합니다.
2. **Git 명령어 자동 실행 규칙 (필수)**:
   * `git status`, `git pull`, `git add`, `git commit`, `git push` 등 모든 Git 관련 명령어는 **사용자 승인 확인 절차 없이 즉시 자동 수행**합니다.
   * 작업 단위가 완료될 때마다 의미 있는 커밋 메시지와 함께 GitHub 원격 저장소(`origin/main`)에 즉시 자동 푸시합니다.
3. **검증 없는 작업 완료 금지**:
   * 코드 작성/수정 후에는 반드시 구동 테스트, 에러 로그 검사, 화면 렌더링 검증 절차를 완료하고 결과를 보고합니다.
4. **기존 정상 작동 기능 보존 및 사전 영향도 검토**:
   * 정상 동작하던 기존 기능/설정은 임의로 변경하지 않으며, 변경이 필요한 경우 이유와 영향 범위를 명확히 안내합니다.
5. **개발 이력 관리 지침 (HISTORY Routine)**:
   * 중요한 기능 추가나 구조 변경 시 작업 완료 후 `HISTORY/` 폴더 내에 날짜별/순번별 기록 문서(`Implementation Plan_YYYYMMDD-NN.md`, `Walkthrough_YYYYMMDD-NN.md`, `Task_YYYYMMDD-NN.md`)를 작성하고 `HISTORY/INDEX.md`를 업데이트합니다.
6. **목업 및 가상 데이터 생성 절대 금지 원칙 (중요)**:
   * 현장 데이터 혼선 방지를 위해 **사용자의 명시적 요청이 없는 한 임의의 목업(Mock)이나 가상 데이터를 절대 생성하지 않습니다.**
   * 데이터베이스는 사내 실제 MES DB를 1:1로 직접 연동하며, 사용할 테이블과 인덱스는 사용자께서 제공해주신 사내 명세를 기준으로 개발합니다.

---

## 📁 4. 디렉터리 구조 표준

```text
yard_pad_MES/
├── AGENTS.md                          # AI Agent 지침서
├── README.md                          # 프로젝트 안내서
├── implementation_plan.md             # 프로젝트 실행 계획서
├── docker-compose.yml                 # 도커 컴포즈 배포 설정
├── .env.example                       # 환경 변수 예제
├── .gitignore                         # Git 제외 항목
├── HISTORY/                           # 개발 이력 백업 및 인덱스
├── nginx/                             # Nginx 리버스 프록시 설정
├── server/                            # Node.js REST API 백엔드
└── client/                            # 반응형 모바일 PWA 웹 프론트엔드
```

