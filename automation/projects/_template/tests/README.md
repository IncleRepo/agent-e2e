# 프로젝트 시나리오

화면 진입만 확인한다면 상위 `routes.json`에 경로를 추가한다. 검색, 필터, 상세 이동, 다운로드처럼 조작이 필요한 검사는 이 폴더에 `*.spec.ts`로 작성한다.

읽기 전용 안전장치가 빠지지 않도록 `test`와 `expect`는 반드시 다음 모듈에서 가져온다.

```ts
import { expect, test } from '../../../core/test';
```

화면 진입과 브라우저 진단을 함께 수집하려면 `runPageAudit`을 사용한다. 전체 예시는 `automation/docs/SCENARIO_STANDARD.md`에 있다.
