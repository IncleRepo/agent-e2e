import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { projectDir } from './project';

export const authFile = path.join(projectDir, '.auth', 'browser-state.json');
export const sessionStorageFile = path.join(projectDir, '.auth', 'session-storage.json');

export async function saveSessionStorage(page: Page): Promise<void> {
  const state = await page.evaluate(() => ({ ...sessionStorage }));
  fs.mkdirSync(path.dirname(sessionStorageFile), { recursive: true });
  fs.writeFileSync(sessionStorageFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export async function restoreSessionStorage(page: Page): Promise<void> {
  if (!fs.existsSync(sessionStorageFile)) return;
  const state = JSON.parse(fs.readFileSync(sessionStorageFile, 'utf8')) as Record<string, string>;
  await page.addInitScript((storedState) => {
    for (const [key, value] of Object.entries(storedState)) sessionStorage.setItem(key, value);
  }, state);
}
