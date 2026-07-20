import type { Page, TestInfo } from '@playwright/test';

export type DiagnosticEntry = {
  kind: 'console' | 'pageerror' | 'requestfailed' | 'http';
  message: string;
  url?: string;
  status?: number;
};

const SECRET_PATTERN = /(authorization|accessToken|refreshToken|password)(["'=:\s]+)([^\s",}]+)/gi;

function redact(value: string): string {
  return value.replace(SECRET_PATTERN, '$1$2[REDACTED]');
}

export function collectDiagnostics(page: Page): DiagnosticEntry[] {
  const entries: DiagnosticEntry[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      entries.push({ kind: 'console', message: redact(message.text()) });
    }
  });

  page.on('pageerror', (error) => {
    entries.push({ kind: 'pageerror', message: redact(error.message) });
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown request failure';
    if (!failure.includes('ERR_ABORTED')) {
      entries.push({
        kind: 'requestfailed',
        message: redact(failure),
        url: request.url(),
      });
    }
  });

  page.on('response', (response) => {
    if (response.status() >= 400) {
      entries.push({
        kind: 'http',
        message: `HTTP ${response.status()} ${response.statusText()}`,
        url: response.url(),
        status: response.status(),
      });
    }
  });

  return entries;
}

export async function attachDiagnostics(
  testInfo: TestInfo,
  entries: DiagnosticEntry[],
): Promise<void> {
  await testInfo.attach('browser-diagnostics.json', {
    body: Buffer.from(JSON.stringify(entries, null, 2), 'utf8'),
    contentType: 'application/json',
  });
}

export async function dismissViteCheckerOverlay(
  page: Page,
  testInfo: TestInfo,
  options: { attachEvidence?: boolean } = {},
): Promise<string | null> {
  const overlay = page.locator('vite-plugin-checker-error-overlay');
  await page.waitForTimeout(300);

  if ((await overlay.count()) === 0) return null;

  const message = await overlay.evaluate((element) => {
    const text = (element.shadowRoot?.textContent ?? element.textContent ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    const marker = text.indexOf('[TypeScript]');
    return marker >= 0 ? text.slice(marker) : text;
  });

  if (options.attachEvidence ?? true) {
    await testInfo.attach('vite-checker-overlay.txt', {
      body: Buffer.from(redact(message), 'utf8'),
      contentType: 'text/plain',
    });
    await testInfo.attach('vite-checker-overlay.png', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  }

  const closeButton = page.getByRole('button', { name: 'Close' });
  if (await closeButton.isVisible()) await closeButton.click();

  return redact(message);
}

export function formatDiagnostics(entries: DiagnosticEntry[]): string {
  return entries
    .map((entry) => {
      const location = entry.url ? ` (${entry.url})` : '';
      return `[${entry.kind}] ${entry.message}${location}`;
    })
    .join('\n');
}
