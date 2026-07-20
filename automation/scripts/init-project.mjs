import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const automationRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectsRoot = path.join(automationRoot, 'projects');
const argumentIndex = process.argv.indexOf('--project');
const projectId = argumentIndex >= 0 ? process.argv[argumentIndex + 1] : undefined;
if (!projectId || !/^[a-z0-9][a-z0-9-_]*$/i.test(projectId) || projectId === '_template') {
  console.error('Usage: npm run project:init -- --project <project-id>');
  process.exit(1);
}

const source = path.join(projectsRoot, '_template');
const target = path.resolve(projectsRoot, projectId);
if (!target.startsWith(`${projectsRoot}${path.sep}`)) throw new Error(`Unsafe project path: ${target}`);
if (fs.existsSync(target)) throw new Error(`Project already exists: ${target}`);

fs.cpSync(source, target, { recursive: true });
const projectFile = path.join(target, 'project.json');
const config = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
config.id = projectId;
config.name = projectId;
fs.writeFileSync(projectFile, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log(`Created project profile: ${target}`);
