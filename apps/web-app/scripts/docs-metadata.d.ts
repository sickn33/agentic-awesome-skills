export const CANONICAL_SYNC_SUBJECT_PATTERNS: string[];
export function isCanonicalSyncSubject(subject: string): boolean;
export function readLastModifiedDate(sourcePath: string, options?: { cwd?: string }): string;
export function readReproducibleLastmod(options?: { cwd?: string; fallback?: string }): string;
export function getDocsMetadata(): Record<string, { commit: string; modified: string; sourcePath: string }>;
