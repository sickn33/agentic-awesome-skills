import { createHash } from 'node:crypto';
import { canonicalWorkbenchJson, type SelectionEvidenceReview, type StackManifestReview } from '../workbenchReview';

export const hash = (value: unknown) => `sha256-${createHash('sha256').update(canonicalWorkbenchJson(value)).digest('hex')}`;
export function selectionFixture(): { stack: StackManifestReview; evidence: SelectionEvidenceReview } {
  const stack: StackManifestReview = {
    schemaVersion: 2, name: 'evidence-test', catalog: { package: 'agentic-awesome-skills', version: '16.7.0', integrity: `sha256-${'a'.repeat(64)}` },
    targets: [{ host: 'codex', scope: 'project' }], profile: { goals: ['test imports'], languages: [], frameworks: [], constraints: [] }, skills: [{ id: 'vitest-skill' }],
  };
  const descriptor = { schemaVersion: 1 as const, files: [{ path: 'src/example.ts', size: 7, sha256: hash('fixture') }] };
  const manifestDigest = hash(stack);
  const selectedSkillIds = ['vitest-skill'];
  const evidence: SelectionEvidenceReview = {
    schemaVersion: 1, kind: 'aas.selection-evidence', digest: '', payload: {
      schemaVersion: 1, kind: 'aas.selection-evidence.payload', project: { ...descriptor, fingerprint: hash(descriptor) },
      catalog: stack.catalog, manifestDigest, selectedSkillIds,
      dimensions: ['architecture-runtime', 'languages-frameworks', 'domain-behavior', 'data-storage', 'external-integrations', 'testing-quality', 'security-privacy', 'user-experience-accessibility', 'deployment-operations', 'maintenance-workflow'].map((id) => ({ id, status: id === 'testing-quality' ? 'applicable' : 'not-applicable', capabilityIds: id === 'testing-quality' ? ['import-review'] : [] })),
      capabilities: [{ id: 'import-review', dimensionId: 'testing-quality', status: 'covered', evidence: [{ path: descriptor.files[0].path, sha256: descriptor.files[0].sha256 }], selectedSkillIds }],
      processTrace: { schemaVersion: 1, calls: [
        { sequence: 1, tool: 'compose_stack', attempt: 1, input: { skillIds: selectedSkillIds }, output: { ok: true, manifestDigest, selectedSkillIds }, canonicalInputBytes: 29, canonicalOutputBytes: 145 },
        { sequence: 2, tool: 'inspect_stack', attempt: 1, input: { manifestDigest }, output: { ok: true, status: 'valid', manifestDigest, selectedSkillIds }, canonicalInputBytes: 92, canonicalOutputBytes: 162 },
      ] },
    },
  };
  evidence.digest = hash(evidence.payload);
  return { stack, evidence };
}
