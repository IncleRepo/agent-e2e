import type { DiagnosticEntry } from './diagnostics';

export type AuditRoute = {
  majorMenu: string;
  menu: string;
  path: string;
  access: string;
};

export type KnownIssue = {
  id: string;
  development: 'FE' | 'BE' | 'FE, BE' | 'DB';
  change: string;
  type: string;
  note: string;
  fingerprints?: string[];
};

export type RouteAudit = {
  route: AuditRoute;
  finalPath: string;
  mainVisible: boolean;
  errorBoundaryVisible: boolean;
  loadingVisible: boolean;
  loadingIndicators: string[];
  invalidTexts: string[];
  diagnostics: DiagnosticEntry[];
  knownIssues: KnownIssue[];
  unknownOverlays: string[];
  navigationError?: string;
  workflow?: string;
  workflowError?: string;
};
