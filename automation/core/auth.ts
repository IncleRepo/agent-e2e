import fs from 'node:fs';
import path from 'node:path';
import { expect } from '@playwright/test';
import { authFile, saveSessionStorage } from './auth-state';
import { project, runtime, type LocatorSpec } from './project';
import type { Locator, Page } from '@playwright/test';

function locate(page: Page, spec: LocatorSpec): Locator {
  if (spec.type === 'label') return page.getByLabel(spec.value, { exact: true });
  if (spec.type === 'placeholder') return page.getByPlaceholder(spec.value, { exact: true });
  if (spec.type === 'testId') return page.getByTestId(spec.value);
  if (!spec.role) throw new Error(`Role locator requires role: ${spec.value}`);
  return page.getByRole(spec.role as Parameters<Page['getByRole']>[0], { name: spec.value, exact: true });
}

export function requireCredentials(): void {
  const missing = [
    !runtime.loginId && project.auth.usernameEnv,
    !runtime.loginPassword && project.auth.passwordEnv,
  ].filter(Boolean);
  if (missing.length > 0) throw new Error(`Missing authentication environment variables: ${missing.join(', ')}`);
}

export async function authenticate(page: Page): Promise<void> {
  requireCredentials();
  await page.goto(project.auth.loginPath);
  await locate(page, project.auth.username).fill(runtime.loginId);
  await locate(page, project.auth.password).fill(runtime.loginPassword);
  await locate(page, project.auth.submit).click();
  await page.waitForURL((url) => url.pathname === project.auth.successPath, { timeout: 20_000 });
  await expect(page).toHaveURL((url) => url.pathname === project.auth.successPath);
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
  await saveSessionStorage(page);
}
