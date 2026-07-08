const VALID_SCOPES = new Set(['route', 'file', 'account']);

export class CandidateContractError extends Error {
  constructor(errors) {
    super(`gate candidate contract failed:\n${errors.map((e) => `- ${e}`).join('\n')}`);
    this.name = 'CandidateContractError';
    this.errors = errors;
  }
}

export function validateCandidates(candidates, ctx = {}) {
  if (!Array.isArray(candidates)) {
    throw new CandidateContractError([`${ctx.source ?? 'gate'}: expected candidate array`]);
  }
  const errors = [];
  for (let i = 0; i < candidates.length; i++) {
    errors.push(...validateCandidate(candidates[i], { ...ctx, index: i }).errors);
  }
  if (errors.length > 0) throw new CandidateContractError(errors);
  return candidates;
}

export function validateCandidate(candidate, ctx = {}) {
  const label = candidateLabel(candidate, ctx);
  const errors = [];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { ok: false, errors: [`${label}: candidate must be an object`] };
  }

  if (!nonEmptyString(candidate.kind)) errors.push(`${label}: kind must be a non-empty string`);
  if (!VALID_SCOPES.has(candidate.scope)) {
    errors.push(`${label}: scope must be one of route, file, account`);
  }
  if (!Number.isFinite(candidate.priority)) errors.push(`${label}: priority must be a finite number`);
  if (!Number.isFinite(candidate.confidence)) errors.push(`${label}: confidence must be a finite number`);
  if (Array.isArray(candidate.files)) {
    if (!candidate.files.every((f) => typeof f === 'string' && f.length > 0)) {
      errors.push(`${label}: files must contain only non-empty strings`);
    }
  } else {
    errors.push(`${label}: files must be an array`);
  }
  if (!nonEmptyString(candidate.reason)) errors.push(`${label}: reason must be a non-empty string`);
  if (!nonEmptyString(candidate.question)) errors.push(`${label}: question must be a non-empty string`);

  if (candidate.scope === 'route') {
    const hasRoute = nonEmptyString(candidate.route);
    const hasHostname = nonEmptyString(candidate.hostname);
    if (!hasRoute && !hasHostname) {
      errors.push(`${label}: route-scoped candidates must set route or hostname`);
    }
  }
  if (candidate.scope === 'file') {
    if (candidate.route != null || candidate.hostname != null) {
      errors.push(`${label}: file-scoped candidates must not set route or hostname`);
    }
    if (!Array.isArray(candidate.files) || candidate.files.length === 0) {
      errors.push(`${label}: file-scoped candidates must include at least one file`);
    }
  }
  if (candidate.scope === 'account') {
    if (candidate.route != null || candidate.hostname != null) {
      errors.push(`${label}: account-scoped candidates must not set route or hostname`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function candidateLabel(candidate, ctx) {
  const source = ctx.source ?? 'gate';
  const index = ctx.index == null ? '?' : ctx.index;
  const kind = candidate?.kind ?? '?';
  return `${source}[${index}] ${kind}`;
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
