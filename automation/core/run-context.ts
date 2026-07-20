import path from 'node:path';
import { workspaceRoot } from './project';

export const reportDir = path.join(workspaceRoot, 'reports');
process.env.AGENT_E2E_REPORT_DIR = reportDir;
