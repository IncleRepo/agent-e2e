# 시나리오 작성 규격

## 정적 화면

단순 화면 진입은 `routes.json`에 작성한다. 공통 감사 엔진이 본문, 오류 경계, 로딩, 콘솔, HTTP 실패, 비정상 문자열을 검사한다.

## 행동 시나리오

검색, 필터, 상세 이동, 다운로드처럼 행동이 필요한 검사는 프로젝트 `tests/*.spec.ts`에 작성한다.

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
    workflow: '월 변경 시 화면과 API 조회 기간이 함께 변경',
    action: async (currentPage) => {
      // 사용자에게 보이는 역할과 이름을 우선 사용한다.
      await expect(currentPage.locator('#main-content')).toBeVisible();
    },
  });
});
```

## 판정 기준

- 하나의 시나리오는 하나의 사용자 목적을 검증한다.
- 테스트 이름에 대메뉴와 행동을 포함한다.
- 고정 DB ID 대신 목록 또는 API에서 현재 대상을 선택한다.
- 내부 CSS 클래스보다 접근성 역할, 이름, URL, API 계약을 우선한다.
- 데이터가 없으면 무조건 통과시키지 않고 전제조건 부족을 명시한다.
