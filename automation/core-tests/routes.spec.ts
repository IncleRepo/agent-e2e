import { test } from '../core/test';
import { runPageAudit } from '../core/page-audit';
import { routes } from '../core/project';

for (const route of routes) {
  test(`${route.majorMenu} > ${route.menu}`, async ({ page }, testInfo) => {
    await runPageAudit(page, testInfo, route, { attachOverlayEvidence: route.path === '/' });
  });
}
