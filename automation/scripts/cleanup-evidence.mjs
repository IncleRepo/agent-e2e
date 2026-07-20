import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const automationRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportsDir = path.resolve(automationRoot, '..', 'reports');
const evidenceDir = path.resolve(reportsDir, 'evidence');
if (!evidenceDir.startsWith(`${reportsDir}${path.sep}`) || !fs.existsSync(evidenceDir)) process.exit(0);

const entries = fs.readdirSync(evidenceDir, { recursive: true, withFileTypes: true });
const meaningful = entries.filter((entry) => entry.isFile() && entry.name !== '.last-run.json');
if (meaningful.length === 0) {
  const lastRun = path.join(evidenceDir, '.last-run.json');
  if (fs.existsSync(lastRun)) fs.unlinkSync(lastRun);
  const directories = entries.filter((entry) => entry.isDirectory())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort((left, right) => right.length - left.length);
  for (const directory of directories) if (fs.existsSync(directory)) fs.rmdirSync(directory);
  fs.rmdirSync(evidenceDir);
}
