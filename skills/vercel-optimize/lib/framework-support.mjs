export const CORE_SUPPORTED_FRAMEWORKS = ['next', 'sveltekit', 'nuxt'];
export const LIMITED_FRAMEWORKS = ['astro'];

const LABELS = {
  next: 'Next.js',
  sveltekit: 'SvelteKit',
  nuxt: 'Nuxt',
  astro: 'Astro',
  hono: 'Hono',
  remix: 'Remix',
  unknown: 'unknown framework',
};

export function frameworkLabel(framework) {
  return LABELS[normalizeFramework(framework)] ?? String(framework ?? 'unknown');
}

export function classifyFrameworkSupport(stack = {}) {
  const framework = normalizeFramework(stack.framework);
  const label = frameworkLabel(framework);
  const supportedLabels = CORE_SUPPORTED_FRAMEWORKS.map(frameworkLabel);
  const limitedLabels = LIMITED_FRAMEWORKS.map(frameworkLabel);

  if (CORE_SUPPORTED_FRAMEWORKS.includes(framework)) {
    return {
      ok: true,
      status: 'supported',
      blocker: null,
      framework,
      label,
      supportedFrameworks: supportedLabels,
      limitedFrameworks: limitedLabels,
      detail: `${label} is supported for metric-backed route-to-file investigations.`,
    };
  }

  if (LIMITED_FRAMEWORKS.includes(framework)) {
    return {
      ok: true,
      status: 'limited',
      blocker: null,
      framework,
      label,
      supportedFrameworks: supportedLabels,
      limitedFrameworks: limitedLabels,
      detail: `${label} support is limited. The skill can use Vercel metrics and generic platform checks, but framework-specific route-to-file recommendations may be sparse.`,
    };
  }

  return {
    ok: false,
    status: 'unsupported',
    blocker: 'unsupported_framework',
    framework,
    label,
    supportedFrameworks: supportedLabels,
    limitedFrameworks: limitedLabels,
    detail: `${label} is not supported for metric-backed route-to-file investigations. Supported frameworks: ${supportedLabels.join(', ')}. Limited support: ${limitedLabels.join(', ')}.`,
  };
}

function normalizeFramework(value) {
  const raw = String(value ?? 'unknown').trim().toLowerCase();
  if (raw === 'nextjs' || raw === 'next.js') return 'next';
  if (raw === 'svelte' || raw === 'svelte-kit') return 'sveltekit';
  return raw || 'unknown';
}
