# Agent E2E 작업 규칙

이 저장소는 여러 웹 프로젝트에 재사용하는 Playwright E2E 프레임워크다. AI 에이전트는 공통 엔진을 임의로 제품에 종속시키지 않고, 프로젝트별 차이는 `automation/projects/<project-id>/`에만 추가한다.

## 작업 시작 순서

1. 이 파일과 `README.md`를 읽는다.
2. `automation/docs/AGENT_WORKFLOW.md`와 `automation/docs/SAFETY_RULES.md`를 읽는다.
3. 신규 프로젝트라면 `automation/docs/PROJECT_ONBOARDING.md`를 따른다.
4. 기존 프로젝트라면 해당 `project.json`, `routes.json`, `known-issues.json`, `tests/`를 먼저 읽는다.
5. 변경 전 `npm --prefix automation run validate -- --project <id>`를 실행한다.

## 경계

- `automation/core/`: 프로젝트 독립적인 실행, 진단, 안전, 보고서 기능만 둔다.
- `automation/projects/<id>/`: URL, 인증 규칙, 화면 경로, 알려진 이슈, 고유 시나리오를 둔다.
- `reports/report.html`: 사용자가 보는 최신 결과물이다.
- FE/BE 소스는 기본적으로 읽기와 원인 조사만 허용한다.

## 필수 원칙

- 프로젝트명, 메뉴명, API 경로 같은 종속 요소를 `core`에 하드코딩하지 않는다.
- 프로젝트 시나리오는 `automation/core/test`에서 `test`를 가져와 읽기 전용 요청 차단을 적용한다.
- 로그인 외 쓰기 요청이 필요하면 사용자 확인 후 `project.json`의 `safety.allowedWrites`에 정확한 메서드와 경로만 추가한다.
- 등록, 수정, 삭제, 권한 변경, 결제, 메시지 전송은 명시적 승인 없이 자동화하지 않는다.
- 실패를 통과시키기 위해 검증을 삭제하거나 기대값을 현재 오류에 맞춰 변경하지 않는다.
- 모든 이슈는 재현 경로와 화면/API/콘솔 증거를 가져야 한다.
- 비밀번호, 토큰, 쿠키, 개인정보는 코드, 로그, 보고서에 기록하지 않는다.

## 기본 명령

```powershell
npm --prefix automation install
npm --prefix automation run project:init -- --project my-project
npm --prefix automation run validate -- --project my-project
npm --prefix automation run audit -- --project my-project
npm --prefix automation run report:open
```

## 완료 조건

- 프로젝트 프로필 검증 통과
- TypeScript 검사 통과
- 대상 E2E 실행 완료
- `reports/report.html` 생성 확인
- 보고서 민감정보 미포함 확인
- 사용자에게 시나리오 성공/실패, 발견 이슈, 검토 필요 항목을 요약
