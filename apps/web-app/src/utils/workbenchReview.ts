export const WORKBENCH_MAX_IMPORT_BYTES = 256 * 1024;
export const WORKBENCH_MAX_JSON_DEPTH = 24;

const DIGEST_PATTERN = /^sha256-[a-f0-9]{64}$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*$/;
const PACKAGE_PATTERN = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.+-]*$/;
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._ -]*$/;
const HOSTS = new Set(['codex', 'claude']);
const SCOPES = new Set(['project', 'user']);
const OPERATION_KINDS = new Set(['install', 'replaceManaged', 'removeManaged']);
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export type WorkbenchArtifactKind = 'stack' | 'plan';

export interface StackManifestReview {
  schemaVersion: 2;
  name: string;
  catalog: CatalogIdentity;
  targets: Target[];
  profile: ProjectProfile;
  skills: Array<{ id: string }>;
}

export interface PlanReview {
  schemaVersion: 2;
  kind: 'aas.stack-plan';
  digest: string;
  payload: {
    schemaVersion: 2;
    kind: 'aas.stack-plan.payload';
    versions: Versions;
    manifestDigest: string;
    catalog: CatalogIdentity;
    runtime: CatalogIdentity & { closureDigest: string };
    target: Target & { adapterVersion: string; identityDigest: string };
    installedState: {
      digest: string;
      entries: Array<{ skillId: string; treeDigest: string; catalogIntegrity: string }>;
    };
    desiredSkills: string[];
    profile: ProjectProfile;
    operations: PlanOperation[];
    overrides: PlanOverride[];
    stateCommit: { previousDigest: string; nextDigest: string; position: 'final' };
  };
}

export interface CatalogIdentity {
  package: string;
  version: string;
  integrity: string;
}

export interface Target {
  host: 'codex' | 'claude';
  scope: 'project' | 'user';
}

export interface ProjectProfile {
  goals: string[];
  projectType?: string;
  languages: string[];
  frameworks: string[];
  constraints: string[];
}

export interface Versions {
  protocolVersion: string;
  coreVersion: string;
  catalogSchemaVersion: string;
}

export interface PlanOperation {
  kind: 'install' | 'replaceManaged' | 'removeManaged';
  skillId: string;
  sourceTreeDigest: string | null;
  expectedTreeDigest: string | null;
  resultTreeDigest: string | null;
  backupRequired: boolean;
}

export interface PlanOverride {
  kind: 'managedDrift';
  skillId: string;
  reasonCodes: string[];
}

export type ParsedWorkbenchArtifact =
  | { kind: 'stack'; value: StackManifestReview }
  | { kind: 'plan'; value: PlanReview };

export class WorkbenchImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkbenchImportError';
  }
}

function fail(message: string): never {
  throw new WorkbenchImportError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) fail(`${path} must be an object.`);
  return value;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], required: readonly string[], path: string): void {
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) fail(`${path} contains a forbidden property.`);
    if (!allowed.includes(key)) fail(`${path} contains unsupported property "${key.slice(0, 80)}".`);
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) fail(`${path}.${key} is required.`);
  }
}

function text(value: unknown, path: string, maxLength = 256): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    fail(`${path} must be a non-empty string of at most ${maxLength} characters.`);
  }
  return value;
}

function literal<T extends string | number>(value: unknown, expected: T, path: string): T {
  if (value !== expected) fail(`${path} must equal ${JSON.stringify(expected)}.`);
  return expected;
}

function bool(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail(`${path} must be a boolean.`);
  return value;
}

function digest(value: unknown, path: string): string {
  const parsed = text(value, path, 71);
  if (!DIGEST_PATTERN.test(parsed)) fail(`${path} must be a sha256 digest.`);
  return parsed;
}

function id(value: unknown, path: string): string {
  const parsed = text(value, path, 256);
  if (!ID_PATTERN.test(parsed)) fail(`${path} is not a valid AAS identifier.`);
  return parsed;
}

function stringArray(value: unknown, path: string, options: { min?: number; max: number; ids?: boolean }): string[] {
  if (!Array.isArray(value) || value.length < (options.min ?? 0) || value.length > options.max) {
    fail(`${path} must contain ${options.min ?? 0} to ${options.max} items.`);
  }
  const parsed = value.map((entry, index) => options.ids ? id(entry, `${path}[${index}]`) : text(entry, `${path}[${index}]`, 256));
  if (new Set(parsed).size !== parsed.length) fail(`${path} must not contain duplicates.`);
  return parsed;
}

function parseCatalog(value: unknown, path: string, runtime = false): CatalogIdentity & { closureDigest?: string } {
  const entry = record(value, path);
  const keys = runtime ? ['package', 'version', 'integrity', 'closureDigest'] : ['package', 'version', 'integrity'];
  exactKeys(entry, keys, keys, path);
  const packageName = text(entry.package, `${path}.package`, 214);
  const version = text(entry.version, `${path}.version`, 64);
  const integrity = runtime ? text(entry.integrity, `${path}.integrity`, 512) : digest(entry.integrity, `${path}.integrity`);
  if (!PACKAGE_PATTERN.test(packageName)) fail(`${path}.package is not a valid package name.`);
  if (!VERSION_PATTERN.test(version)) fail(`${path}.version is not a valid version.`);
  return runtime
    ? { package: packageName, version, integrity, closureDigest: digest(entry.closureDigest, `${path}.closureDigest`) }
    : { package: packageName, version, integrity };
}

function parseTarget(value: unknown, path: string, planned = false): Target & { adapterVersion?: string; identityDigest?: string } {
  const entry = record(value, path);
  const keys = planned ? ['host', 'scope', 'adapterVersion', 'identityDigest'] : ['host', 'scope'];
  exactKeys(entry, keys, keys, path);
  if (typeof entry.host !== 'string' || !HOSTS.has(entry.host)) fail(`${path}.host must be codex or claude.`);
  if (typeof entry.scope !== 'string' || !SCOPES.has(entry.scope)) fail(`${path}.scope must be project or user.`);
  const base = { host: entry.host as Target['host'], scope: entry.scope as Target['scope'] };
  return planned
    ? { ...base, adapterVersion: text(entry.adapterVersion, `${path}.adapterVersion`, 64), identityDigest: digest(entry.identityDigest, `${path}.identityDigest`) }
    : base;
}

function parseProfile(value: unknown, path: string): ProjectProfile {
  const entry = record(value, path);
  const allowed = ['goals', 'projectType', 'languages', 'frameworks', 'constraints'];
  const required = ['goals', 'languages', 'frameworks', 'constraints'];
  exactKeys(entry, allowed, required, path);
  return {
    goals: stringArray(entry.goals, `${path}.goals`, { max: 32 }),
    ...(entry.projectType === undefined ? {} : { projectType: text(entry.projectType, `${path}.projectType`, 2048) }),
    languages: stringArray(entry.languages, `${path}.languages`, { max: 32 }),
    frameworks: stringArray(entry.frameworks, `${path}.frameworks`, { max: 32 }),
    constraints: stringArray(entry.constraints, `${path}.constraints`, { max: 32 }),
  };
}

function parseVersions(value: unknown, path: string): Versions {
  const entry = record(value, path);
  const keys = ['protocolVersion', 'coreVersion', 'catalogSchemaVersion'];
  exactKeys(entry, keys, keys, path);
  return {
    protocolVersion: text(entry.protocolVersion, `${path}.protocolVersion`, 64),
    coreVersion: text(entry.coreVersion, `${path}.coreVersion`, 64),
    catalogSchemaVersion: text(entry.catalogSchemaVersion, `${path}.catalogSchemaVersion`, 64),
  };
}

function checkDepth(root: unknown): void {
  const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 1 }];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    if (current.depth > WORKBENCH_MAX_JSON_DEPTH) fail(`JSON nesting exceeds ${WORKBENCH_MAX_JSON_DEPTH} levels.`);
    if (Array.isArray(current.value)) {
      for (const child of current.value) stack.push({ value: child, depth: current.depth + 1 });
    } else if (isRecord(current.value)) {
      for (const [key, child] of Object.entries(current.value)) {
        if (FORBIDDEN_KEYS.has(key)) fail('JSON contains a forbidden property.');
        stack.push({ value: child, depth: current.depth + 1 });
      }
    }
  }
}

function parseStack(value: unknown): StackManifestReview {
  const root = record(value, 'stack');
  const keys = ['schemaVersion', 'name', 'catalog', 'targets', 'profile', 'skills'];
  exactKeys(root, keys, keys, 'stack');
  const name = text(root.name, 'stack.name', 128);
  if (!NAME_PATTERN.test(name)) fail('stack.name contains unsupported characters.');
  if (!Array.isArray(root.targets) || root.targets.length < 1 || root.targets.length > 8) fail('stack.targets must contain 1 to 8 targets.');
  const targets = root.targets.map((target, index) => parseTarget(target, `stack.targets[${index}]`));
  const targetKeys = targets.map((target) => `${target.host}:${target.scope}`);
  if (new Set(targetKeys).size !== targetKeys.length) fail('stack.targets must not contain duplicates.');
  if (!Array.isArray(root.skills) || root.skills.length > 128) fail('stack.skills must contain at most 128 entries.');
  const skills = root.skills.map((skill, index) => {
    const entry = record(skill, `stack.skills[${index}]`);
    exactKeys(entry, ['id'], ['id'], `stack.skills[${index}]`);
    return { id: id(entry.id, `stack.skills[${index}].id`) };
  });
  if (new Set(skills.map((skill) => skill.id)).size !== skills.length) fail('stack.skills must not contain duplicate IDs.');
  return {
    schemaVersion: literal(root.schemaVersion, 2, 'stack.schemaVersion'),
    name,
    catalog: parseCatalog(root.catalog, 'stack.catalog') as CatalogIdentity,
    targets: targets as Target[],
    profile: parseProfile(root.profile, 'stack.profile'),
    skills,
  };
}

function nullableDigest(value: unknown, path: string): string | null {
  return value === null ? null : digest(value, path);
}

function parseOperation(value: unknown, path: string): PlanOperation {
  const entry = record(value, path);
  const keys = ['kind', 'skillId', 'sourceTreeDigest', 'expectedTreeDigest', 'resultTreeDigest', 'backupRequired'];
  exactKeys(entry, keys, keys, path);
  if (typeof entry.kind !== 'string' || !OPERATION_KINDS.has(entry.kind)) fail(`${path}.kind is unsupported.`);
  return {
    kind: entry.kind as PlanOperation['kind'],
    skillId: id(entry.skillId, `${path}.skillId`),
    sourceTreeDigest: nullableDigest(entry.sourceTreeDigest, `${path}.sourceTreeDigest`),
    expectedTreeDigest: nullableDigest(entry.expectedTreeDigest, `${path}.expectedTreeDigest`),
    resultTreeDigest: nullableDigest(entry.resultTreeDigest, `${path}.resultTreeDigest`),
    backupRequired: bool(entry.backupRequired, `${path}.backupRequired`),
  };
}

function parseOverride(value: unknown, path: string): PlanOverride {
  const entry = record(value, path);
  const keys = ['kind', 'skillId', 'reasonCodes'];
  exactKeys(entry, keys, keys, path);
  if (entry.kind !== 'managedDrift') fail(`${path}.kind must equal "managedDrift".`);
  return {
    kind: 'managedDrift',
    skillId: id(entry.skillId, `${path}.skillId`),
    reasonCodes: stringArray(entry.reasonCodes, `${path}.reasonCodes`, { min: 1, max: 128 }),
  };
}

function parsePlan(value: unknown): PlanReview {
  const root = record(value, 'plan');
  exactKeys(root, ['schemaVersion', 'kind', 'digest', 'payload'], ['schemaVersion', 'kind', 'digest', 'payload'], 'plan');
  const payload = record(root.payload, 'plan.payload');
  const payloadKeys = ['schemaVersion', 'kind', 'versions', 'manifestDigest', 'catalog', 'runtime', 'target', 'installedState', 'desiredSkills', 'profile', 'operations', 'overrides', 'stateCommit'];
  exactKeys(payload, payloadKeys, payloadKeys, 'plan.payload');

  const installedState = record(payload.installedState, 'plan.payload.installedState');
  exactKeys(installedState, ['digest', 'entries'], ['digest', 'entries'], 'plan.payload.installedState');
  if (!Array.isArray(installedState.entries) || installedState.entries.length > 128) fail('plan.payload.installedState.entries must contain at most 128 entries.');
  const installedEntries = installedState.entries.map((installed, index) => {
    const entry = record(installed, `plan.payload.installedState.entries[${index}]`);
    const keys = ['skillId', 'treeDigest', 'catalogIntegrity'];
    exactKeys(entry, keys, keys, `plan.payload.installedState.entries[${index}]`);
    return {
      skillId: id(entry.skillId, `plan.payload.installedState.entries[${index}].skillId`),
      treeDigest: digest(entry.treeDigest, `plan.payload.installedState.entries[${index}].treeDigest`),
      catalogIntegrity: digest(entry.catalogIntegrity, `plan.payload.installedState.entries[${index}].catalogIntegrity`),
    };
  });

  if (!Array.isArray(payload.operations) || payload.operations.length > 256) fail('plan.payload.operations must contain at most 256 operations.');
  if (!Array.isArray(payload.overrides) || payload.overrides.length > 128) fail('plan.payload.overrides must contain at most 128 overrides.');
  const stateCommit = record(payload.stateCommit, 'plan.payload.stateCommit');
  exactKeys(stateCommit, ['previousDigest', 'nextDigest', 'position'], ['previousDigest', 'nextDigest', 'position'], 'plan.payload.stateCommit');

  return {
    schemaVersion: literal(root.schemaVersion, 2, 'plan.schemaVersion'),
    kind: literal(root.kind, 'aas.stack-plan', 'plan.kind'),
    digest: digest(root.digest, 'plan.digest'),
    payload: {
      schemaVersion: literal(payload.schemaVersion, 2, 'plan.payload.schemaVersion'),
      kind: literal(payload.kind, 'aas.stack-plan.payload', 'plan.payload.kind'),
      versions: parseVersions(payload.versions, 'plan.payload.versions'),
      manifestDigest: digest(payload.manifestDigest, 'plan.payload.manifestDigest'),
      catalog: parseCatalog(payload.catalog, 'plan.payload.catalog') as CatalogIdentity,
      runtime: parseCatalog(payload.runtime, 'plan.payload.runtime', true) as CatalogIdentity & { closureDigest: string },
      target: parseTarget(payload.target, 'plan.payload.target', true) as Target & { adapterVersion: string; identityDigest: string },
      installedState: {
        digest: digest(installedState.digest, 'plan.payload.installedState.digest'),
        entries: installedEntries,
      },
      desiredSkills: stringArray(payload.desiredSkills, 'plan.payload.desiredSkills', { max: 128, ids: true }),
      profile: parseProfile(payload.profile, 'plan.payload.profile'),
      operations: payload.operations.map((operation, index) => parseOperation(operation, `plan.payload.operations[${index}]`)),
      overrides: payload.overrides.map((override, index) => parseOverride(override, `plan.payload.overrides[${index}]`)),
      stateCommit: {
        previousDigest: digest(stateCommit.previousDigest, 'plan.payload.stateCommit.previousDigest'),
        nextDigest: digest(stateCommit.nextDigest, 'plan.payload.stateCommit.nextDigest'),
        position: literal(stateCommit.position, 'final', 'plan.payload.stateCommit.position'),
      },
    },
  };
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function parseWorkbenchArtifact(input: string, expectedKind: WorkbenchArtifactKind): ParsedWorkbenchArtifact {
  const byteLength = utf8ByteLength(input);
  if (byteLength === 0) fail('Paste or select a JSON artifact first.');
  if (byteLength > WORKBENCH_MAX_IMPORT_BYTES) fail(`Artifact exceeds the ${WORKBENCH_MAX_IMPORT_BYTES} byte limit.`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(input) as unknown;
  } catch {
    fail('Artifact is not valid JSON.');
  }
  checkDepth(parsed);
  return expectedKind === 'stack'
    ? { kind: 'stack', value: parseStack(parsed) }
    : { kind: 'plan', value: parsePlan(parsed) };
}

export async function readWorkbenchFile(file: File): Promise<string> {
  if (file.size > WORKBENCH_MAX_IMPORT_BYTES) fail(`Artifact exceeds the ${WORKBENCH_MAX_IMPORT_BYTES} byte limit.`);
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > WORKBENCH_MAX_IMPORT_BYTES) fail(`Artifact exceeds the ${WORKBENCH_MAX_IMPORT_BYTES} byte limit.`);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail('Artifact must use valid UTF-8 encoding.');
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left < right ? -1 : (left > right ? 1 : 0))
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalWorkbenchJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export async function verifyPlanDigest(plan: PlanReview): Promise<boolean> {
  if (!globalThis.crypto?.subtle) fail('This browser cannot verify the plan digest.');
  const bytes = new TextEncoder().encode(canonicalWorkbenchJson(plan.payload));
  const digestBytes = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  const computed = `sha256-${Array.from(digestBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  return computed === plan.digest;
}
