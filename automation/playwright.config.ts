import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { authFile } from './core/auth-state';
import { project, projectId, runtime } from './core/project';
import { reportDir } from './core/run-context';

fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(path.dirname(authFile), { recursive: true });

const escapedProject = projectId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default defineConfig({
  testDir: '.',
  testIgnore: ['node_modules/**', 'projects/_template/**'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  outputDir: path.join(reportDir, 'evidence'),
  reporter: [
    ['line'],
    ['./core/reporter.ts', { outputDir: reportDir }],
  ],
  use: {
    baseURL: runtime.feUrl,
    locale: project.report?.locale ?? 'ko-KR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: 'preflight',
      testMatch: /core-tests[\\/]preflight\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'auth-setup',
      testMatch: /core-tests[\\/]auth\.setup\.ts/,
      dependencies: ['preflight'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'audit',
      testMatch: [
        /core-tests[\\/]routes\.spec\.ts/,
        new RegExp(`projects[\\\\/]${escapedProject}[\\\\/]tests[\\\\/].*\\.spec\\.ts`),
      ],
      dependencies: ['auth-setup'],
      use: { ...devices['Desktop Chrome'], storageState: authFile },
    },
  ],
  metadata: {
    projectId,
    projectName: project.name,
    feUrl: runtime.feUrl,
    apiUrl: runtime.apiUrl,
    mode: project.mode,
  },
});

export { reportDir };
