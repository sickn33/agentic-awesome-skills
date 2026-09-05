import { describe, expect, it } from 'vitest';
import { parseWorkbenchArtifact, reviewWorkbenchEvidencePair, verifySelectionEvidence } from '../workbenchReview';
import { hash, selectionFixture } from './selectionEvidenceFixture';

describe('selection evidence import', () => {
  it('verifies digests and binds catalog, manifest and ordered selection independently', async () => {
    const { stack, evidence } = selectionFixture();
    expect(parseWorkbenchArtifact(JSON.stringify(evidence), 'evidence').kind).toBe('evidence');
    await expect(verifySelectionEvidence(evidence)).resolves.toBeUndefined();
    expect(reviewWorkbenchEvidencePair(stack, evidence, hash(stack)).status).toBe('consistent');
    const other = structuredClone(stack);
    other.skills = [{ id: 'other' }];
    other.catalog.version = '15.0.0';
    expect(reviewWorkbenchEvidencePair(other, evidence, hash(other)).checks.filter((check) => check.status === 'mismatch').map((check) => check.id)).toEqual(['evidenceManifest', 'evidenceCatalog', 'evidenceSkills']);
  });
  it('rejects tampering, unsafe paths, broken references and missing factual inspection even with a rehashed payload', async () => {
    const changed = selectionFixture().evidence;
    changed.payload.catalog.version = '15.0.0';
    await expect(verifySelectionEvidence(changed)).rejects.toThrow('digest');
    for (const mutate of [
      (e: typeof changed) => { e.payload.project.files[0].path = '../private'; },
      (e: typeof changed) => { e.payload.project.fingerprint = hash('other'); },
      (e: typeof changed) => { e.payload.capabilities[0].evidence[0].sha256 = hash('other'); },
      (e: typeof changed) => { e.payload.processTrace.calls.pop(); },
      (e: typeof changed) => { e.payload.dimensions[1].id = e.payload.dimensions[0].id; },
    ]) {
      const evidence = selectionFixture().evidence;
      mutate(evidence); evidence.digest = hash(evidence.payload);
      await expect(verifySelectionEvidence(evidence)).rejects.toThrow();
    }
  });
  it('rejects unsupported schema fields before rendering without echoing sensitive values', () => {
    const evidence = selectionFixture().evidence;
    expect(() => parseWorkbenchArtifact(JSON.stringify({ ...evidence, secret: 'sensitive-canary' }), 'evidence')).toThrow('supported selection-evidence schema');
  });
});
