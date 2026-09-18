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
import examplePlan from '../../../../../docs/examples/workflows/mcp-contract/plan.json';

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
        profile: stack.value.profile,
      },
    };

    expect(reviewWorkbenchPair(stack.value, matchingPlan, stackDigest)).toEqual({
      status: 'consistent',
      checks: [
        { id: 'manifestDigest', label: 'Manifest digest', status: 'match' },
        { id: 'catalog', label: 'Catalog identity', status: 'match' },
        { id: 'skills', label: 'Selected skills', status: 'match' },
        { id: 'target', label: 'Plan target', status: 'match' },
        { id: 'profile', label: 'Project profile', status: 'match' },
      ],
    });

    const mismatchedPlan = structuredClone(matchingPlan);
    mismatchedPlan.payload.desiredSkills = ['other-skill'];
    mismatchedPlan.payload.target = { host: 'claude', scope: 'user' };
    mismatchedPlan.payload.profile = { ...stack.value.profile, goals: ['different goal'] };
    const mismatch = reviewWorkbenchPair(stack.value, mismatchedPlan, stackDigest);
    expect(mismatch.status).toBe('inconsistent');
    expect(mismatch.checks.filter((check) => check.status === 'mismatch').map((check) => check.id)).toEqual(['skills', 'target', 'profile']);
  });

  it('accepts the public stack shape and rejects duplicate skill IDs', () => {
    expect(parseWorkbenchArtifact(JSON.stringify(validStack()), 'stack').kind).toBe('stack');
    const withoutProjectType = validStack();
    const emptyProfile = withoutProjectType.profile as Record<string, unknown>;
    delete emptyProfile.projectType;
    emptyProfile.languages = [];
    emptyProfile.frameworks = [];
    emptyProfile.constraints = [];
    expect(parseWorkbenchArtifact(JSON.stringify(withoutProjectType), 'stack').kind).toBe('stack');
    const stack = validStack();
    stack.skills = [{ id: 'same' }, { id: 'same' }];
    expect(() => parseWorkbenchArtifact(JSON.stringify(stack), 'stack')).toThrow('duplicate IDs');
  });

  it('enforces the published profile limits for stack and plan artifacts', () => {
    const emptyGoals = validStack();
    (emptyGoals.profile as Record<string, unknown>).goals = [];
    expect(() => parseWorkbenchArtifact(JSON.stringify(emptyGoals), 'stack')).toThrow('must contain 1 to 32 items');

    const longGoal = validStack();
    (longGoal.profile as Record<string, unknown>).goals = ['x'.repeat(129)];
    expect(() => parseWorkbenchArtifact(JSON.stringify(longGoal), 'stack')).toThrow('at most 128 characters');

    const longProjectType = validStack();
    (longProjectType.profile as Record<string, unknown>).projectType = 'x'.repeat(257);
    expect(() => parseWorkbenchArtifact(JSON.stringify(longProjectType), 'stack')).toThrow('at most 256 characters');

    const plan = structuredClone(examplePlan) as unknown as { payload: { profile: { goals: string[] } } };
    plan.payload.profile.goals = [];
    expect(() => parseWorkbenchArtifact(JSON.stringify(plan), 'plan')).toThrow('must contain 1 to 32 items');
  });

  it('accepts plan identity strings allowed by the plan schema without relaxing stack rules', () => {
    const plan = structuredClone(examplePlan) as unknown as {
      payload: {
        catalog: { package: string; version: string };
        runtime: { package: string; version: string };
        versions: { protocolVersion: string; coreVersion: string; catalogSchemaVersion: string };
      };
    };
    plan.payload.catalog.package = 'catalog identity with spaces';
    plan.payload.catalog.version = 'release/2026';
    plan.payload.runtime.package = 'runtime identity with spaces';
    plan.payload.runtime.version = 'channel/2026';
    plan.payload.versions.protocolVersion = 'p'.repeat(65);
    plan.payload.versions.coreVersion = 'c'.repeat(65);
    plan.payload.versions.catalogSchemaVersion = 's'.repeat(65);
    expect(parseWorkbenchArtifact(JSON.stringify(plan), 'plan').kind).toBe('plan');

    const stack = validStack();
    (stack.catalog as Record<string, unknown>).package = 'catalog identity with spaces';
    expect(() => parseWorkbenchArtifact(JSON.stringify(stack), 'stack')).toThrow('valid package name');
  });

  it('rejects duplicate JSON properties before their overwritten values disappear', () => {
    const input = JSON.stringify(validStack());
    for (const ambiguous of [
      input.replace('"schemaVersion":2', '"schemaVersion":1,"schemaVersion":2'),
      input.replace('"version":"15.0.0"', '"version":"1.0.0","version":"15.0.0"'),
      input.replace('"version":"15.0.0"', String.raw`"ver\u0073ion":"1.0.0","version":"15.0.0"`),
    ]) expect(() => parseWorkbenchArtifact(ambiguous, 'stack')).toThrow('duplicate JSON property');
    const stack = validStack();
    (stack.profile as Record<string, unknown>).goals = ['braces {}, colon : and comma , in strings', 'escaped "quote"'];
    stack.targets = [{ host: 'codex', scope: 'project' }, { host: 'claude', scope: 'user' }];
    expect(parseWorkbenchArtifact(JSON.stringify(stack), 'stack').kind).toBe('stack');
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
