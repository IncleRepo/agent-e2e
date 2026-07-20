# Agent E2E 작업 기준

이 저장소는 여러 웹 프로젝트에서 함께 쓰는 Playwright E2E 도구다. 프로젝트별 차이는 `automation/projects/<project-id>/`에 두고, 공통 엔진에는 특정 서비스의 이름이나 경로를 넣지 않는다.

## 작업을 시작할 때

1. `README.md`와 이 파일을 읽는다.
2. `automation/docs/AGENT_WORKFLOW.md`, `automation/docs/SAFETY_RULES.md`를 확인한다.
3. 새 프로젝트는 `automation/docs/PROJECT_ONBOARDING.md` 순서로 연결한다.
4. 기존 프로젝트는 해당 폴더의 `project.json`, `routes.json`, `known-issues.json`, `tests/`부터 살핀다.
5. 손대기 전에 `npm --prefix automation run validate -- --project <id>`로 현재 상태를 확인한다.

새 프로젝트의 시나리오 수는 임의로 정하지 않는다. FE 라우터와 메뉴를 기준으로 정적 경로를 전부 대조하고, 동적 상세, 검색, 필터·탭, 페이지 이동, 다운로드, 핵심 API 계약, 권한별 접근을 각각 `검사함` 또는 `제외함`으로 판단한다. 제외한 항목은 이유를 작업 결과에 남긴다.

## 파일을 나누는 기준

- `automation/core/`: 어느 프로젝트에서나 같은 실행, 진단, 안전장치, 보고서 기능
- `automation/projects/<id>/`: URL, 로그인 방식, 화면 경로, 알려진 이슈, 프로젝트 고유 시나리오
- `reports/report.html`: 사람이 확인하는 가장 최근 결과
- FE/BE 저장소: 원인 파악을 위한 읽기만 허용하며, 요청받지 않은 수정은 하지 않음

두 프로젝트 이상에서 같은 코드가 반복될 때만 `core`로 옮긴다. 그전에는 프로젝트 폴더 안에 둔다.

## 반드시 지킬 것

- 프로젝트명, 메뉴명, API 경로를 `core`에 하드코딩하지 않는다.
- 프로젝트 테스트는 `automation/core/test`에서 `test`를 가져온다. 그래야 읽기 전용 요청 차단이 적용된다.
- 로그인 이후 일반 시나리오에서 토큰 갱신 같은 쓰기 요청이 꼭 필요하면 먼저 사용자에게 알리고, `safety.allowedWrites`에 메서드와 경로를 정확히 적는다.
- 등록, 수정, 삭제, 권한 변경, 결제, 주문, 메시지 전송은 명시적인 승인 없이 실행하지 않는다.
- 실패를 숨기려고 검증을 지우거나 기대값을 현재 오류에 맞추지 않는다.
- 이슈에는 재현 경로와 화면, API, 콘솔 중 하나 이상의 근거를 남긴다.
- 비밀번호, 토큰, 쿠키, 개인정보를 코드·로그·보고서에 기록하지 않는다.
- 제품 문제인지 확실하지 않으면 `검토 필요`로 남기고 판단 근거를 적는다.

## 자주 쓰는 명령

```powershell
npm --prefix automation install
npm --prefix automation run project:init -- --project my-project
npm --prefix automation run validate -- --project my-project
npm --prefix automation run audit -- --project my-project
npm --prefix automation run report:open
```

## 작업을 마치기 전에

1. 프로젝트 프로필 검증과 TypeScript 검사를 통과시킨다.
2. 대상 E2E를 끝까지 실행한다.
3. `reports/report.html`이 생성됐는지 확인한다.
4. 보고서와 증거 파일에 민감정보가 없는지 살핀다.
5. 실행한 시나리오, 실패, 발견 이슈, 검토 항목, 실행하지 못한 범위를 짧게 정리한다.
6. FE 라우터와 `routes.json`의 차이, 조사 체크 항목 중 제외한 범위가 없는지 다시 확인한다.
