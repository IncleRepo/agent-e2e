import path from 'node:path';
import { expect } from '@playwright/test';
import { restoreSessionStorage } from './auth-state';
import type { AuditRoute, RouteAudit } from './audit-types';
import {
  attachDiagnostics,
  collectDiagnostics,
  dismissViteCheckerOverlay,
  formatDiagnostics,
} from './diagnostics';
import { matchKnownOverlay } from './known-issues';
import { project } from './project';
import type { Page, TestInfo } from '@playwright/test';

const INVALID_TEXT_PATTERN = new RegExp(project.ui.invalidTextPattern, 'g');
const LOADING_PATTERN = new RegExp(project.ui.loadingTexts.join('|'), 'i');

type AuditOptions = {
  workflow?: string;
  action?: (page: Page) => Promise<void>;
  attachOverlayEvidence?: boolean;
  navigationPath?: string;
};

export async function runPageAudit(
  page: Page,
  testInfo: TestInfo,
  route: AuditRoute,
  options: AuditOptions = {},
): Promise<RouteAudit> {
  const diagnostics = collectDiagnostics(page);
  const audit: RouteAudit = {
    route,
    finalPath: '',
    mainVisible: false,
    errorBoundaryVisible: false,
    loadingVisible: false,
    loadingIndicators: [],
    invalidTexts: [],
    diagnostics,
    knownIssues: [],
    unknownOverlays: [],
    workflow: options.workflow,
  };

  try {
    await restoreSessionStorage(page);
    await page.goto(options.navigationPath ?? route.path);

    const overlay = await dismissViteCheckerOverlay(page, testInfo, {
      attachEvidence: options.attachOverlayEvidence ?? false,
    });
    if (overlay) {
      const knownIssue = matchKnownOverlay(overlay);
      if (knownIssue) audit.knownIssues.push(knownIssue);
      else audit.unknownOverlays.push(overlay);
    }

    await page.waitForTimeout(1_000);
    audit.finalPath = new URL(page.url()).pathname;
    audit.mainVisible = await page.locator('#main-content').isVisible();

    if (options.action) {
      try {
        await options.action(page);
        await page.waitForTimeout(750);
      } catch (error) {
        audit.workflowError = error instanceof Error ? error.message : String(error);
      }
    }

    audit.errorBoundaryVisible = await page.locator('#main-content').evaluate(
      (element, texts) => texts.some((text) => element.textContent?.includes(text)),
      project.ui.errorBoundaryTexts,
    ).catch(() => false);

    const loading = page
      .locator('#main-content')
      .getByRole('status', { name: LOADING_PATTERN });
    try {
      await expect(loading).toHaveCount(0, { timeout: 8_000 });
    } catch {
      audit.loadingVisible = true;
      audit.loadingIndicators = await loading.evaluateAll((elements) =>
        elements.slice(0, 10).map((element) =>
          element.getAttribute('aria-label')
          || element.textContent?.replace(/\s+/g, ' ').trim()
          || element.tagName.toLowerCase(),
        ),
      );
    }

    const bodyText = await page.locator('#main-content').innerText().catch(() => '');
    audit.invalidTexts = [...new Set(bodyText.match(INVALID_TEXT_PATTERN) ?? [])];
  } catch (error) {
    audit.navigationError = error instanceof Error ? error.message : String(error);
    audit.finalPath = new URL(page.url()).pathname;
  } finally {
    audit.diagnostics = diagnostics;
    await attachDiagnostics(testInfo, diagnostics);
    await testInfo.attach('route-audit.json', {
      body: Buffer.from(JSON.stringify(audit, null, 2), 'utf8'),
      contentType: 'application/json',
    });
  }

  const fatalFindings = [
    audit.navigationError ? `[navigation] ${audit.navigationError}` : null,
    audit.finalPath !== route.path
      ? `[redirect] expected=${route.path} actual=${audit.finalPath}`
      : null,
    !audit.mainVisible ? '[render] #main-content is not visible' : null,
    audit.errorBoundaryVisible ? '[render] error boundary is visible' : null,
    audit.invalidTexts.length > 0 ? `[display] ${audit.invalidTexts.join(', ')}` : null,
    audit.unknownOverlays.length > 0 ? `[overlay] ${audit.unknownOverlays.join('\n')}` : null,
    audit.workflowError ? `[workflow] ${audit.workflowError}` : null,
    diagnostics.length > 0 ? formatDiagnostics(diagnostics) : null,
  ].filter((finding): finding is string => Boolean(finding));

  if (fatalFindings.length > 0 || audit.loadingVisible) {
    const screenshotPath = testInfo.outputPath(
      fatalFindings.length > 0 ? 'route-finding.png' : 'route-review.png',
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await testInfo.attach(path.basename(screenshotPath), {
      path: screenshotPath,
      contentType: 'image/png',
    });
  }

  expect(fatalFindings, fatalFindings.join('\n')).toEqual([]);
  return audit;
}
