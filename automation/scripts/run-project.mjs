import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const automationRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argument = process.argv.find((value) => value.startsWith('--project='));
const argumentIndex = process.argv.indexOf('--project');
const projectId = argument?.split('=')[1] ?? (argumentIndex >= 0 ? process.argv[argumentIndex + 1] : undefined);
if (!projectId || projectId === '_template') {
  console.error('Usage: npm run audit -- --project <project-id>');
  process.exit(1);
}

const env = { ...process.env, E2E_PROJECT: projectId };
const validate = spawnSync(process.execPath, [path.join(automationRoot, 'scripts', 'validate-project.mjs'), '--project', projectId], {
  cwd: automationRoot,
  env,
  stdio: 'inherit',
});
if (validate.status !== 0) process.exit(validate.status ?? 1);

const cli = path.join(automationRoot, 'node_modules', '@playwright', 'test', 'cli.js');
const run = spawnSync(process.execPath, [cli, 'test', '--project=audit'], {
  cwd: automationRoot,
  env,
  stdio: 'inherit',
});

if (run.status === 0) {
  spawnSync(process.execPath, [path.join(automationRoot, 'scripts', 'cleanup-evidence.mjs')], {
    cwd: automationRoot,
    env,
    stdio: 'inherit',
  });
}
process.exit(run.status ?? 1);
