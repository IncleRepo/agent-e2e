<div align="center">

# Agent E2E

**AI 에이전트와 함께 구축하고, 한 장의 보고서로 확인하는 Playwright E2E 도구**

![Playwright](https://img.shields.io/badge/Playwright-1.61-2EAD33?logo=playwright&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript&logoColor=white)
![Safety](https://img.shields.io/badge/default-read--only-087F72)
![Report](https://img.shields.io/badge/output-report.html-172126)

</div>

Agent E2E는 여러 웹 프로젝트의 E2E 점검을 같은 방식으로 운영하기 위한 작은 프레임워크입니다. Codex나 Claude가 프로젝트 구조를 살펴보고 시나리오를 관리하며, Playwright가 실제 화면과 API를 검증합니다.

테스트 결과는 `reports/report.html` 한 파일에 모입니다. 실행 현황부터 발견된 이슈와 추가 검토 항목까지 위에서 아래로 읽으면 됩니다.

![통합 E2E 보고서 미리보기](automation/docs/assets/report-preview.png)

## 이런 흐름으로 씁니다

```text
프로젝트 정보 전달
        ↓
AI 에이전트가 프로필과 시나리오 작성
        ↓
Playwright가 화면 · API · 콘솔 · 데이터 표출 점검
        ↓
reports/report.html 확인
```

- **프로젝트별 분리**: URL, 로그인 방식, 라우트, 고유 시나리오는 `automation/projects/<project-id>/`에만 둡니다.
- **읽기 전용 기본값**: 등록, 수정, 삭제 요청은 별도로 허용하지 않는 한 브라우저 단계에서 차단합니다.
- **한 장의 결과물**: 시나리오 현황과 이슈 목록을 각각 찾아다닐 필요가 없습니다.
- **에이전트 독립성**: `AGENTS.md`를 기준으로 Codex와 Claude가 같은 절차를 따릅니다.

## 빠른 시작

Node.js 20 이상이 필요합니다. 저장소를 클론한 뒤 루트에서 실행하세요.

```powershell
npm --prefix automation install
npm --prefix automation run project:init -- --project my-project
```

이제 AI 에이전트에게 프로젝트 정보를 알려 줍니다.

```text
AGENTS.md를 읽고 my-project를 온보딩해줘.
FE 소스는 C:\path\to\frontend, BE 소스는 C:\path\to\backend야.
FE는 http://localhost:3000, API는 http://localhost:8080/api에서 실행 중이야.
쓰기 동작은 제외하고 메뉴와 API를 조사해서 첫 E2E 시나리오를 만들어줘.
```

직접 설정할 때는 `automation/projects/my-project/`의 세 파일부터 수정합니다.

| 파일 | 담는 내용 |
| --- | --- |
| `project.json` | URL, 로그인 선택자, 오류·로딩 기준, 허용할 요청 |
| `routes.json` | 공통 점검을 적용할 화면 경로 |
| `known-issues.json` | 이미 알고 있어 중복 등록하지 않을 이슈 |

검색, 필터, 상세 조회처럼 동작이 필요한 시나리오는 `tests/*.spec.ts`에 추가합니다.

## 실행과 결과 확인

```powershell
npm --prefix automation run audit -- --project my-project
npm --prefix automation run report:open
```

`audit`는 프로필 검증, 서버 상태 확인, 로그인, 시나리오 실행, 보고서 생성을 차례로 처리합니다. 결과는 다음 위치에 덮어씁니다.

```text
reports/report.html
```

보고서에는 다음 내용이 한 화면에 정리됩니다.

- 전체 시나리오와 메뉴별 통과 현황
- 실패한 단계와 브라우저 진단
- 자동으로 추출한 이슈 목록
- 결함으로 단정하지 않은 검토 항목
- 실패 시 남긴 스크린샷과 Trace
- 스프레드시트에 붙여 넣을 수 있는 TSV 다운로드

## AI에게 요청하는 예시

**새 기능을 검사할 때**

```text
my-project에 월별 보고서 조회가 추가됐어.
관련 FE/BE 코드를 확인하고 읽기 전용 시나리오를 추가한 다음 전체 E2E를 실행해줘.
```

**회귀 검사를 돌릴 때**

```text
my-project 전체 E2E를 실행하고 report.html 기준으로 새로 발견된 이슈만 정리해줘.
```

**새 서비스를 연결할 때**

```text
AGENTS.md와 온보딩 문서를 읽고 new-service 프로필을 만들어줘.
등록이나 수정은 건드리지 말고 화면, API, 콘솔, 데이터 표출을 점검해줘.
```

## 저장소 구조

```text
agent-e2e/
├─ reports/                 가장 최근 통합 보고서
├─ automation/
│  ├─ core/                 실행·진단·안전·보고서 공통 엔진
│  ├─ core-tests/           서버와 로그인 사전 점검
│  ├─ projects/             프로젝트별 프로필과 시나리오
│  ├─ docs/                 운영 기준과 작성 규칙
│  └─ scripts/              초기화·검증·실행 명령
├─ AGENTS.md                모든 AI 에이전트가 따르는 기준
├─ CLAUDE.md                Claude 진입 파일
└─ README.md
```

루트에는 사람이 자주 볼 파일만 남기고, 실행에 필요한 코드는 `automation` 아래에 모았습니다.

## 더 자세한 문서

| 문서 | 언제 읽으면 좋은가 |
| --- | --- |
| [프로젝트 온보딩](automation/docs/PROJECT_ONBOARDING.md) | 새 프로젝트를 처음 연결할 때 |
| [시나리오 작성 기준](automation/docs/SCENARIO_STANDARD.md) | 고유 사용자 흐름을 추가할 때 |
| [안전 규칙](automation/docs/SAFETY_RULES.md) | 로그인을 포함한 쓰기 요청을 다룰 때 |
| [보고서 규격](automation/docs/REPORT_STANDARD.md) | 결과가 어떻게 집계되는지 확인할 때 |
| [구조 원칙](automation/docs/ARCHITECTURE.md) | 공통 엔진을 수정하려 할 때 |

## 저장소에 올리지 않는 것

실제 인증정보와 실행 결과는 로컬에만 남습니다.

- `automation/.env.e2e.local`
- `automation/projects/*/.auth/`
- `reports/report.html`
- `reports/evidence/`
- `automation/node_modules/`

프로젝트 프로필에는 환경변수 이름만 기록하고, 비밀번호나 토큰 값은 넣지 마세요.
