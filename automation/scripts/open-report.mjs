import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const automationRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportFile = path.resolve(automationRoot, '..', 'reports', 'report.html');
if (!fs.existsSync(reportFile)) throw new Error('No report found. Run an audit first.');

const result = process.platform === 'win32'
  ? spawnSync('cmd.exe', ['/c', 'start', '', reportFile], { stdio: 'ignore' })
  : process.platform === 'darwin'
    ? spawnSync('open', [reportFile], { stdio: 'ignore' })
    : spawnSync('xdg-open', [reportFile], { stdio: 'ignore' });
process.exit(result.status ?? 0);
