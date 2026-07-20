# Agent E2E

Codex, Claude 같은 AI 에이전트를 통해 여러 웹 프로젝트의 읽기 전용 E2E를 일관된 방식으로 구축하고 실행하는 Playwright 프레임워크다.

사용자가 평소 확인할 것은 이 README와 `reports/report.html`뿐이다. 테스트 코드와 설정은 `automation` 안에 모아 둔다.

## 처음 사용할 때

```powershell
npm --prefix automation install
npm --prefix automation run project:init -- --project my-project
```

프로젝트가 생성되면 AI 에이전트에게 다음처럼 요청한다.

```text
AGENTS.md를 먼저 읽고 my-project를 온보딩해줘.
FE 소스는 C:\path\to\frontend, BE 소스는 C:\path\to\backend야.
FE 주소는 http://localhost:3000, API 주소는 http://localhost:8080/api야.
읽기 전용 범위에서 메뉴와 API를 조사하고 초기 E2E 시나리오를 구축해줘.
```

## 평소 실행

```powershell
npm --prefix automation run audit -- --project my-project
npm --prefix automation run report:open
```

결과는 항상 다음 파일 하나로 정리된다.

```text
reports/report.html
```

## AI에게 요청하는 예시

새 기능 검사:

```text
my-project에 월별 보고서 조회가 추가됐어.
관련 FE/BE 코드를 확인하고 읽기 전용 E2E 시나리오를 추가한 뒤 전체 검사를 실행해줘.
```

회귀 검사:

```text
my-project 전체 E2E를 실행하고 report.html에서 새로 발견된 이슈만 설명해줘.
```

프로젝트 추가:

```text
AGENTS.md와 온보딩 문서를 읽고 new-service 프로젝트 프로필을 만들어줘.
쓰기 동작은 포함하지 말고 화면, API, 콘솔, 데이터 표출을 점검해줘.
```

## 저장소 구조

```text
agent-e2e/
├─ reports/                 사용자 결과
├─ automation/              자동화 내부 구현
│  ├─ core/                 공통 엔진
│  ├─ core-tests/           공통 사전 검사
│  ├─ projects/             프로젝트별 어댑터와 시나리오
│  ├─ docs/                 에이전트 작업 규격
│  └─ scripts/              초기화, 검증, 실행
├─ AGENTS.md                공통 에이전트 기준
├─ CLAUDE.md                Claude 진입 안내
└─ README.md                사용자 안내
```

내부 구조를 직접 수정하지 않아도 된다. 사용자는 프로젝트 정보와 기대 동작을 AI 에이전트에게 설명하고, 생성된 보고서를 읽는 역할에 집중한다.
