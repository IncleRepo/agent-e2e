import { expect, test as base } from '@playwright/test';
import { project } from './project';

type SafetyFixtures = {
  readOnlyGuard: void;
};

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const test = base.extend<SafetyFixtures>({
  readOnlyGuard: [async ({ page }, use) => {
    const violations: string[] = [];
    await page.route('**/*', async (route) => {
      const request = route.request();
      const method = request.method().toUpperCase();
      if (READ_METHODS.has(method)) {
        await route.continue();
        return;
      }
      const pathname = new URL(request.url()).pathname;
      const allowed = project.safety.allowedWrites.some(
        (item) => item.method === method && pathname === item.pathname,
      );
      if (allowed) {
        await route.continue();
        return;
      }
      violations.push(`${method} ${pathname}`);
      await route.abort('blockedbyclient');
    });

    await use();
    expect(violations, `Read-only safety guard blocked write requests:\n${violations.join('\n')}`).toEqual([]);
  }, { auto: true }],
});

export { expect };
