import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const automationRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectsRoot = path.join(automationRoot, 'projects');
const argument = process.argv.find((value) => value.startsWith('--project='));
const argumentIndex = process.argv.indexOf('--project');
const projectId = argument?.split('=')[1]
  ?? (argumentIndex >= 0 ? process.argv[argumentIndex + 1] : undefined)
  ?? process.env.E2E_PROJECT
  ?? '_template';

if (projectId !== '_template' && !/^[a-z0-9][a-z0-9-_]*$/i.test(projectId)) throw new Error(`Invalid project id: ${projectId}`);
const projectDir = path.resolve(projectsRoot, projectId);
if (!projectDir.startsWith(`${projectsRoot}${path.sep}`)) throw new Error(`Unsafe project path: ${projectDir}`);

const readJson = (filename) => {
  const file = path.join(projectDir, filename);
  if (!fs.existsSync(file)) throw new Error(`Missing required file: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const config = readJson('project.json');
const routes = readJson('routes.json');
const knownIssues = readJson('known-issues.json');
const errors = [];

if (config.schemaVersion !== 1) errors.push('project.json schemaVersion must be 1.');
if (config.id !== projectId) errors.push(`project.json id must be ${projectId}.`);
if (config.mode !== 'read-only') errors.push('Only read-only mode is allowed.');
for (const key of ['frontendDefault', 'apiDefault']) {
  try { new URL(config.urls?.[key]); } catch { errors.push(`urls.${key} must be an absolute URL.`); }
}
if (!config.auth?.loginPath?.startsWith('/')) errors.push('auth.loginPath must start with /.');
if (!config.auth?.successPath?.startsWith('/')) errors.push('auth.successPath must start with /.');
if (!Array.isArray(config.safety?.allowedWrites)) errors.push('safety.allowedWrites must be an array.');
if (!Array.isArray(routes) || routes.length === 0) errors.push('routes.json must contain at least one route.');

const seenPaths = new Set();
for (const [index, route] of (Array.isArray(routes) ? routes : []).entries()) {
  if (!route.majorMenu || !route.menu) errors.push(`routes[${index}] requires majorMenu and menu.`);
  if (typeof route.path !== 'string' || !route.path.startsWith('/')) errors.push(`routes[${index}].path must start with /.`);
  if (seenPaths.has(route.path)) errors.push(`Duplicate route path: ${route.path}`);
  seenPaths.add(route.path);
}

for (const [index, issue] of (Array.isArray(knownIssues) ? knownIssues : []).entries()) {
  if (!issue.id || !issue.change || !issue.development) errors.push(`known-issues[${index}] is incomplete.`);
  if (!Array.isArray(issue.fingerprints) || issue.fingerprints.length === 0) errors.push(`known-issues[${index}] requires fingerprints.`);
}

const testsDir = path.join(projectDir, 'tests');
if (fs.existsSync(testsDir)) {
  const entries = fs.readdirSync(testsDir, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.spec.ts')) continue;
    const file = path.join(entry.parentPath, entry.name);
    const source = fs.readFileSync(file, 'utf8');
    if (!source.includes('/core/test')) errors.push(`${path.relative(projectDir, file)} must import test from core/test.`);
  }
}

if (config.auth?.usernameValue || config.auth?.passwordValue || config.auth?.tokenValue) {
  errors.push('Do not store literal credentials in project.json; use environment variable names.');
}

if (errors.length > 0) {
  console.error(`Project validation failed: ${projectId}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Project profile is valid: ${projectId} (${routes.length} routes, ${knownIssues.length} known issues)`);
