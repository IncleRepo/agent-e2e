# 시나리오 작성 기준

## 화면 진입만 확인할 때

정적 경로는 `routes.json`에 추가한다. 공통 감사 엔진이 본문 표시, 오류 화면, 끝나지 않는 로딩, 콘솔 오류, HTTP 실패, `NaN` 같은 비정상 문자열을 함께 확인한다.

## 사용자 행동을 확인할 때

검색, 필터, 탭 전환, 상세 이동, 다운로드처럼 조작이 필요한 검사는 프로젝트의 `tests/*.spec.ts`에 작성한다.

```ts
import { expect, test } from '../../../core/test';
import { runPageAudit } from '../../../core/page-audit';

test('보고서 > 월별 조회', async ({ page }, testInfo) => {
  await runPageAudit(page, testInfo, {
    majorMenu: '보고서',
    menu: '월별 조회',
    path: '/reports',
    access: 'user',
  }, {
    workflow: '월을 바꾸면 화면과 API의 조회 기간이 함께 바뀐다',
    action: async (currentPage) => {
      await expect(currentPage.locator('#main-content')).toBeVisible();
    },
  });
});
```

## 좋은 시나리오의 기준

- 한 시나리오에서는 한 가지 사용자 목적만 확인한다.
- 테스트 이름에 메뉴와 행동을 드러낸다.
- DB의 고정 ID 대신 현재 목록이나 API 응답에서 대상을 고른다.
- 내부 CSS 클래스보다 접근성 역할, 화면 이름, URL, API 계약을 우선한다.
- 데이터가 없을 때 억지로 통과시키지 않는다. 필요한 전제조건을 결과에 남긴다.
- 화면이 보인다는 사실만으로 끝내지 않고, 사용자가 기대하는 데이터나 상태까지 확인한다.
