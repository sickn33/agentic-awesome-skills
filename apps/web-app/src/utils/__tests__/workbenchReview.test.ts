import { describe, expect, it } from 'vitest';
import {
  WORKBENCH_MAX_IMPORT_BYTES,
  WORKBENCH_MAX_JSON_DEPTH,
  WorkbenchImportError,
  parseWorkbenchArtifact,
  readWorkbenchFile,
} from '../workbenchReview';

const D = `sha256-${'a'.repeat(64)}`;

function validStack(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    name: 'safe-stack',
    catalog: { package: 'agentic-awesome-skills', version: '15.0.0', integrity: D },
    targets: [{ host: 'codex', scope: 'project' }],
    intent: { goals: ['build'] },
    policy: { allowedRisk: ['safe'], requireKnownSource: true, allowManualSetup: false },
    skills: [{ id: 'react-best-practices' }],
  };
}

describe('workbenchReview', () => {
  it('accepts the public stack shape and rejects duplicate skill IDs', () => {
    expect(parseWorkbenchArtifact(JSON.stringify(validStack()), 'stack').kind).toBe('stack');
    const stack = validStack();
    stack.skills = [{ id: 'same' }, { id: 'same' }];
    expect(() => parseWorkbenchArtifact(JSON.stringify(stack), 'stack')).toThrow('duplicate IDs');
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
    stack.intent = JSON.parse('{"goals":["build"],"__proto__":"secret-canary"}') as unknown;
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
