import { knownIssues } from './project';
import type { KnownIssue } from './audit-types';

export function matchKnownOverlay(message: string): KnownIssue | null {
  return knownIssues.find((issue) => {
    const fingerprints = (issue as KnownIssue & { fingerprints?: string[] }).fingerprints ?? [];
    return fingerprints.length > 0 && fingerprints.every((fingerprint) => message.includes(fingerprint));
  }) ?? null;
}
