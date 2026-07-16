import { canonicalizeRoute } from '../route-normalize.mjs';

export const FLAGS_ENDPOINT = '/.well-known/vercel/flags';
export const VERCEL_FLAGS_PACKAGES = [
  '@vercel/flags',
  '@vercel/flags/next',
  '@vercel/flags/sveltekit',
  '@vercel/flags/nuxt',
];
export const WORKFLOW_ENDPOINT_PREFIXES = [
  '/.well-known/workflow',
  '/api/.well-known/workflow',
];

export function applyHardGates(candidates, signals = {}) {
  const allowed = [];
  const gated = [];
  for (const candidate of candidates) {
    if (isFlagsEndpointCandidate(candidate)) {
      gated.push({
        ...candidate,
        gatedReason: flagsEndpointReason(signals),
      });
      continue;
    }
    if (isWorkflowRuntimeEndpointCandidate(candidate)) {
      gated.push({
        ...candidate,
        gatedReason: workflowEndpointReason(signals),
      });
      continue;
    }
    allowed.push(candidate);
  }
  return { allowed, gated };
}

export function isFlagsEndpointCandidate(candidate) {
  if (!candidate || candidate.scope === 'account') return false;
  const route = normalizeRoute(candidate.route);
  return route === FLAGS_ENDPOINT;
}

export function isWorkflowRuntimeEndpointCandidate(candidate) {
  if (!candidate || candidate.scope === 'account') return false;
  const route = normalizeRoute(candidate.route);
  if (!route) return false;
  return WORKFLOW_ENDPOINT_PREFIXES.some((prefix) => (
    route === prefix || route.startsWith(`${prefix}/`)
  ));
}

function normalizeRoute(route) {
  if (typeof route !== 'string') return null;
  const normalized = canonicalizeRoute(route).replace(/\/+$/, '');
  return normalized === '' ? '/' : normalized;
}

function flagsEndpointReason(signals) {
  const packages = signals.stack?.vercelFlagsPackages;
  if (Array.isArray(packages) && packages.length > 0) {
    return `hardGated: ${FLAGS_ENDPOINT} is the Vercel Flags endpoint (${packages.join(', ')} detected), not an optimization target`;
  }
  return `hardGated: ${FLAGS_ENDPOINT} is the Vercel Flags endpoint, not an optimization target`;
}

function workflowEndpointReason(signals) {
  const packages = signals.stack?.workflowPackages;
  if (Array.isArray(packages) && packages.length > 0) {
    return `hardGated: Vercel Workflow runtime endpoint (${packages.join(', ')} detected); long-running step/flow requests are expected orchestration, not an app-route optimization target`;
  }
  return 'hardGated: Vercel Workflow runtime endpoint; long-running step/flow requests are expected orchestration, not an app-route optimization target';
}
