import { test } from '@playwright/test';
import { authenticate } from '../core/auth';
import { attachDiagnostics, collectDiagnostics, dismissViteCheckerOverlay } from '../core/diagnostics';

test('프로젝트 설정에 따라 로그인 상태를 생성한다', async ({ page }, testInfo) => {
  const diagnostics = collectDiagnostics(page);
  try {
    await authenticate(page);
    await dismissViteCheckerOverlay(page, testInfo, { attachEvidence: false });
  } finally {
    await attachDiagnostics(testInfo, diagnostics);
  }
});
