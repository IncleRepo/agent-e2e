import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import type { AuditRoute, KnownIssue } from './audit-types';

export type LocatorSpec = {
  type: 'label' | 'placeholder' | 'testId' | 'role';
  value: string;
  role?: string;
};

export type ProjectConfig = {
  schemaVersion: 1;
  id: string;
  name: string;
  mode: 'read-only';
  urls: {
    frontendEnv: string;
    frontendDefault: string;
    apiEnv: string;
    apiDefault: string;
    healthPath: string;
  };
  source?: {
    frontendEnv?: string;
    backendEnv?: string;
  };
  auth: {
    loginPath: string;
    usernameEnv: string;
    passwordEnv: string;
    username: LocatorSpec;
    password: LocatorSpec;
    submit: LocatorSpec;
    successPath: string;
  };
  ui: {
    errorBoundaryTexts: string[];
    loadingTexts: string[];
    invalidTextPattern: string;
  };
  safety: {
    allowedWrites: Array<{ method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; pathname: string }>;
  };
  report?: {
    locale?: string;
  };
};

export const automationRoot = path.resolve(process.cwd());
export const workspaceRoot = path.resolve(automationRoot, '..');

dotenv.config({ path: path.join(automationRoot, '.env.e2e.local'), override: false, quiet: true });

export const projectId = process.env.E2E_PROJECT ?? '_template';
if (projectId !== '_template' && !/^[a-z0-9][a-z0-9-_]*$/i.test(projectId)) {
  throw new Error(`Invalid E2E_PROJECT: ${projectId}`);
}

export const projectDir = path.resolve(automationRoot, 'projects', projectId);
const projectsRoot = path.resolve(automationRoot, 'projects');
if (!projectDir.startsWith(`${projectsRoot}${path.sep}`)) {
  throw new Error(`Unsafe project directory: ${projectDir}`);
}

dotenv.config({ path: path.join(projectDir, '.env.e2e.local'), override: true, quiet: true });

function readJson<T>(filename: string): T {
  const file = path.join(projectDir, filename);
  if (!fs.existsSync(file)) throw new Error(`Missing project file: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export const project = readJson<ProjectConfig>('project.json');
if (project.id !== projectId) {
  throw new Error(`project.json id (${project.id}) does not match E2E_PROJECT (${projectId}).`);
}
if (project.mode !== 'read-only') {
  throw new Error('Only read-only project profiles are supported by the generic runner.');
}

export const routes = readJson<AuditRoute[]>('routes.json');
export const knownIssues = readJson<KnownIssue[]>('known-issues.json');

const envValue = (name: string, fallback = ''): string => process.env[name] || fallback;

export const runtime = {
  feUrl: envValue(project.urls.frontendEnv, project.urls.frontendDefault).replace(/\/$/, ''),
  apiUrl: envValue(project.urls.apiEnv, project.urls.apiDefault).replace(/\/$/, ''),
  loginId: envValue(project.auth.usernameEnv),
  loginPassword: envValue(project.auth.passwordEnv),
  feSource: project.source?.frontendEnv ? envValue(project.source.frontendEnv) : '',
  beSource: project.source?.backendEnv ? envValue(project.source.backendEnv) : '',
};
