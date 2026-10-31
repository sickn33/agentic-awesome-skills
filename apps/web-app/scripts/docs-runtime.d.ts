import type { Plugin } from 'vite';
export type DocsMetadata = Record<string, { commit: string; modified: string; sourcePath: string }>;
export const DOCS_RUNTIME_SLOT: string;
export function renderDocsRuntime(metadata: DocsMetadata): string;
export function applyDocsRuntime(html: string, metadata: DocsMetadata): string;
export function docsRuntimePlugin(): Plugin;
export function verifyDocsRuntime(dist: string, metadata: DocsMetadata): number;
