import { describe, expect, it } from 'vitest';
import {
  WORKBENCH_MAX_IMPORT_BYTES,
  WORKBENCH_MAX_JSON_DEPTH,
  WorkbenchImportError,
  type WorkbenchPairPlan,
  parseWorkbenchArtifact,
  readWorkbenchFile,
  reviewWorkbenchPair,
} from '../workbenchReview';

const D = `sha256-${'a'.repeat(64)}`;

function validStack(): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name: 'safe-stack',
    catalog: { package: 'agentic-awesome-skills', version: '15.0.0', integrity: D },
    targets: [{ host: 'codex', scope: 'project' }],
    profile: {
      goals: ['build'],
      projectType: 'React web application',
      languages: ['typescript'],
      frameworks: ['react'],
      constraints: [],
    },
    skills: [{ id: 'react-best-practices' }],
  };
}

describe('workbenchReview', () => {
  it('compares manifest digest, catalog, desired skills, and target across a stack-plan pair', async () => {
    const stack = parseWorkbenchArtifact(JSON.stringify(validStack()), 'stack');
    expect(stack.kind).toBe('stack');
    if (stack.kind !== 'stack') throw new Error('expected stack');
    const stackDigest = `sha256-${'b'.repeat(64)}`;
    const matchingPlan: WorkbenchPairPlan = {
      payload: {
        manifestDigest: stackDigest,
        catalog: stack.value.catalog,
        desiredSkills: ['react-best-practices'],
        target: { host: 'codex', scope: 'project' },
      },
    };

    expect(reviewWorkbenchPair(stack.value, matchingPlan, stackDigest)).toEqual({
      status: 'consistent',
      checks: [
        { id: 'manifestDigest', label: 'Manifest digest', status: 'match' },
        { id: 'catalog', label: 'Catalog identity', status: 'match' },
        { id: 'skills', label: 'Selected skills', status: 'match' },
        { id: 'target', label: 'Plan target', status: 'match' },
      ],
    });

    const mismatchedPlan = structuredClone(matchingPlan);
    mismatchedPlan.payload.desiredSkills = ['other-skill'];
    mismatchedPlan.payload.target = { host: 'claude', scope: 'user' };
    const mismatch = reviewWorkbenchPair(stack.value, mismatchedPlan, stackDigest);
    expect(mismatch.status).toBe('inconsistent');
    expect(mismatch.checks.filter((check) => check.status === 'mismatch').map((check) => check.id)).toEqual(['skills', 'target']);
  });

  it('accepts the public stack shape and rejects duplicate skill IDs', () => {
    expect(parseWorkbenchArtifact(JSON.stringify(validStack()), 'stack').kind).toBe('stack');
    const withoutProjectType = validStack();
    const emptyProfile = withoutProjectType.profile as Record<string, unknown>;
    delete emptyProfile.projectType;
    emptyProfile.goals = [];
    emptyProfile.languages = [];
    emptyProfile.frameworks = [];
    emptyProfile.constraints = [];
    expect(parseWorkbenchArtifact(JSON.stringify(withoutProjectType), 'stack').kind).toBe('stack');
    const stack = validStack();
    stack.skills = [{ id: 'same' }, { id: 'same' }];
    expect(() => parseWorkbenchArtifact(JSON.stringify(stack), 'stack')).toThrow('duplicate IDs');
  });

  it('rejects the retired v1 policy shape', () => {
    const stack = validStack();
    stack.schemaVersion = 1;
    stack.policy = { allowedRisk: ['safe'], requireKnownSource: true, allowManualSetup: false };
    delete stack.profile;
    expect(() => parseWorkbenchArtifact(JSON.stringify(stack), 'stack')).toThrow('unsupported property "policy"');
  });

  it('rejects an artifact of the wrong expected kind', () => {
    expect(() => parseWorkbenchArtifact(JSON.stringify(validStack()), 'plan')).toThrow('plan contains unsupported property');
  });

  it('measures UTF-8 bytes rather than JavaScript characters', () => {
    const multibyte = '€'.repeat(Math.ceil(WORKBENCH_MAX_IMPORT_BYTES / 3));
    expect(multibyte.length).toBeLessThan(WORKBENCH_MAX_IMPORT_BYTES);
    expect(() => parseWorkbenchArtifact(multibyte, 'stack')).toThrow('byte limit');
  });

  it('accepts the exact byte limit and rejects one byte more', () => {
    const serialized = JSON.stringify(validStack());
    const exact = serialized + ' '.repeat(WORKBENCH_MAX_IMPORT_BYTES - new TextEncoder().encode(serialized).byteLength);
    expect(parseWorkbenchArtifact(exact, 'stack').kind).toBe('stack');
    expect(() => parseWorkbenchArtifact(`${exact} `, 'stack')).toThrow('byte limit');
  });

  it('rejects excessive JSON depth before schema projection', () => {
    let nested: unknown = 'value';
    for (let index = 0; index < WORKBENCH_MAX_JSON_DEPTH + 2; index += 1) nested = { child: nested };
    expect(() => parseWorkbenchArtifact(JSON.stringify(nested), 'stack')).toThrow('nesting exceeds');
  });

  it('rejects forbidden object keys and does not echo their values', () => {
    const stack = validStack();
    stack.profile = JSON.parse('{"goals":["build"],"projectType":"web","languages":[],"frameworks":[],"constraints":[],"__proto__":"secret-canary"}') as unknown;
    try {
      parseWorkbenchArtifact(JSON.stringify(stack), 'stack');
      throw new Error('expected rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(WorkbenchImportError);
      expect((error as Error).message).not.toContain('secret-canary');
    }
  });

  it('rejects an oversized file before reading its bytes', async () => {
    const file = {
      size: WORKBENCH_MAX_IMPORT_BYTES + 1,
      arrayBuffer: () => Promise.reject(new Error('must not read')),
    } as unknown as File;
    await expect(readWorkbenchFile(file)).rejects.toThrow('byte limit');
  });

  it('rejects invalid UTF-8 selected files', async () => {
    const bytes = new Uint8Array([0xc3, 0x28]);
    const file = {
      size: bytes.length,
      arrayBuffer: () => Promise.resolve(bytes.buffer),
    } as unknown as File;
    await expect(readWorkbenchFile(file)).rejects.toThrow('valid UTF-8');
  });
});
