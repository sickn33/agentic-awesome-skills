import type { SeoJsonLdValue, SeoMeta, TwitterCard, Skill } from '../types';
import { getAbsolutePublicAssetUrl } from './publicAssetUrls';

export const DEFAULT_TOP_SKILL_COUNT = 40;
export const DEFAULT_SOCIAL_IMAGE = 'social-card.svg';
const SITE_NAME = 'Antigravity Awesome Skills';
const REPOSITORY_URL = 'https://github.com/sickn33/antigravity-awesome-skills';
const HOSTED_CATALOG_URL = 'https://sickn33.github.io/antigravity-awesome-skills/';
const FAQ_ITEMS = [
  {
    question: 'What is Antigravity Awesome Skills?',
    answer:
      'Antigravity Awesome Skills is an installable GitHub library of 1,550+ reusable SKILL.md playbooks for AI coding assistants. It supports Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and related hosts through direct skill installs, specialized plugins, bundles, workflows, and a searchable catalog.',
  },
  {
    question: 'How do I install Antigravity Awesome Skills?',
    answer:
      'Install the library with npx antigravity-awesome-skills. Use tool-specific flags such as --codex, --cursor, --gemini, --claude, or --antigravity when you want the installer to target a specific skills directory already used by your assistant runtime.',
  },
  {
    question: 'What are AAS specialized plugins?',
    answer:
      'AAS specialized plugins are focused, domain-specific distributions of the skill library. They package relevant skills for web apps, security, data analytics, documents, DevOps, QA, OSS maintenance, and agent or MCP work so users can start with the right surface instead of activating the entire catalog.',
  },
  {
    question: 'What is the difference between skills and MCP tools?',
    answer:
      'Skills are reusable playbooks that tell an AI assistant how to execute a workflow. MCP tools expose external systems or callable actions. Skills guide behavior, context, constraints, and output quality; MCP tools provide the external capabilities an assistant may need while following those instructions.',
  },
  {
    question: 'How are plugins, bundles, and workflows different?',
    answer:
      'Plugins are installable packaging surfaces, bundles are curated skill recommendations, and workflows are ordered execution playbooks. Start with a plugin when the domain is clear, use bundles to compare adjacent skills, and use workflows when sequencing planning, coding, testing, auditing, or release work matters.',
  },
] as const;

export function toCanonicalPath(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }

  const prefixed = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const compacted = prefixed.replace(/\/{2,}/g, '/');
  const normalized = compacted.endsWith('/') ? compacted.slice(0, -1) : compacted;
  return normalized || '/';
}

export function getCanonicalUrl(canonicalPath: string, siteBaseUrl?: string): string {
  const base = toCanonicalPath(canonicalPath);
  const siteBase = siteBaseUrl?.trim() || window.location.origin;
  const normalizedBase = siteBase.replace(/\/+$/, '');
  return `${normalizedBase}${base === '/' ? '/' : base}`;
}

export function getAssetCanonicalUrl(canonicalPath: string): string {
  return getAbsolutePublicAssetUrl(toCanonicalPath(canonicalPath), {
    baseUrl: import.meta.env.BASE_URL || '/',
    origin: window.location.origin,
  });
}

export function getAbsoluteAssetUrl(assetPath: string): string {
  return getAbsolutePublicAssetUrl(toCanonicalPath(assetPath), {
    baseUrl: import.meta.env.BASE_URL || '/',
    origin: window.location.origin,
  });
}

function getCatalogBaseUrl(canonicalUrl: string): string {
  try {
    const parsed = new URL(canonicalUrl);
    const strippedSkillPath = parsed.pathname.replace(/\/skill\/[^/]+\/?$/, '/');
    const normalizedPath = strippedSkillPath.endsWith('/') ? strippedSkillPath : `${strippedSkillPath}/`;
    const normalizedCatalog = normalizedPath === '' ? '/' : normalizedPath;
    return `${parsed.origin}${normalizedCatalog}`;
  } catch {
    return canonicalUrl;
  }
}

function buildOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${REPOSITORY_URL}#organization`,
    name: SITE_NAME,
    url: REPOSITORY_URL,
    sameAs: [
      'https://x.com/AASkills_',
      'https://www.npmjs.com/package/antigravity-awesome-skills',
      HOSTED_CATALOG_URL,
    ],
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
  };
}

function buildWebSiteSchema(canonicalUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: getCatalogBaseUrl(canonicalUrl),
    sameAs: REPOSITORY_URL,
    inLanguage: 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${getCatalogBaseUrl(canonicalUrl).replace(/\/+$/, '')}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

function buildSoftwareSourceCodeSchema(canonicalUrl: string, visibleCount: number): Record<string, unknown> {
  const visibleCountLabel = visibleCount > 0
    ? `${visibleCount.toLocaleString('en-US')} agentic skills`
    : 'agentic skills';

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: SITE_NAME,
    description: `Installable GitHub library of ${visibleCountLabel}, specialized plugins, bundles, and workflows for AI coding assistants.`,
    url: REPOSITORY_URL,
    sameAs: [
      canonicalUrl,
      HOSTED_CATALOG_URL,
      'https://www.npmjs.com/package/antigravity-awesome-skills',
    ],
    mainEntityOfPage: canonicalUrl,
    codeRepository: REPOSITORY_URL,
    applicationCategory: 'DeveloperApplication',
    keywords: [
      'AI coding assistant skills',
      'Claude Code skills',
      'Codex CLI skills',
      'Cursor skills',
      'Gemini CLI skills',
      'Antigravity skills',
      'specialized plugins',
      'SKILL.md',
    ],
    isAccessibleForFree: true,
    programmingLanguage: {
      '@type': 'ComputerLanguage',
      name: 'Markdown',
      url: 'https://en.wikipedia.org/wiki/Markdown',
    },
    license: `${REPOSITORY_URL}/blob/main/LICENSE`,
  };
}

function buildHomeFaqSchema(canonicalUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: canonicalUrl,
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function getHomeFaqItems(): Array<{ question: string; answer: string }> {
  return [...FAQ_ITEMS];
}

function ensureMetaTag(name: string, content: string, attributeName: 'name' | 'property'): void {
  const selector = `meta[${attributeName}="${name}"]`;
  let tag = document.querySelector(selector) as HTMLMetaElement | null;

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attributeName, name);
    document.head.appendChild(tag);
  }

  tag.setAttribute('content', content);
}

function resolveJsonLdValue(value: SeoJsonLdValue, canonicalUrl: string): Array<Record<string, unknown>> | null {
  if (typeof value === 'function') {
    const resolved = value(canonicalUrl);

    if (Array.isArray(resolved)) {
      return resolved as Array<Record<string, unknown>>;
    }

    return resolved ? [resolved] : null;
  }

  if (Array.isArray(value)) {
    return value as Array<Record<string, unknown>>;
  }

  return value ? [value as Record<string, unknown>] : null;
}

function ensureJsonLdTag(rawJsonLd: Record<string, unknown>): void {
  const serialized = JSON.stringify(rawJsonLd);
  const tag = document.createElement('script');
  tag.type = 'application/ld+json';
  tag.setAttribute('data-seo-jsonld', 'true');
  tag.textContent = serialized;
  document.head.appendChild(tag);
}

export function setPageMeta(meta: SeoMeta): void {
  const title = meta.title.trim();
  const description = meta.description.trim();
  const canonicalPath = toCanonicalPath(meta.canonicalPath);
  const canonical = getAssetCanonicalUrl(canonicalPath);
  const jsonLdEntries = meta.jsonLd ? (Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd]) : [];
  const ogTitle = meta.ogTitle?.trim() || title;
  const ogDescription = meta.ogDescription?.trim() || description;
  const twitterCard: TwitterCard = meta.twitterCard || 'summary_large_image';
  const ogImage = (meta.ogImage || DEFAULT_SOCIAL_IMAGE).trim();

  document.title = title;
  ensureMetaTag('description', description, 'name');

  ensureMetaTag('og:type', 'website', 'property');
  ensureMetaTag('og:title', ogTitle, 'property');
  ensureMetaTag('og:description', ogDescription, 'property');
  ensureMetaTag('og:site_name', SITE_NAME, 'property');
  ensureMetaTag('og:url', canonical, 'property');

  ensureMetaTag('twitter:card', twitterCard, 'name');
  ensureMetaTag('twitter:title', ogTitle, 'name');
  ensureMetaTag('twitter:description', ogDescription, 'name');
  ensureMetaTag('twitter:image:alt', `${meta.ogTitle || title} preview`, 'name');
  ensureMetaTag('og:image', getAbsoluteAssetUrl(ogImage), 'property');
  ensureMetaTag('twitter:image', getAbsoluteAssetUrl(ogImage), 'name');

  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }

  canonicalLink.setAttribute('href', canonical);

  const jsonLdElements = Array.from(document.querySelectorAll('script[data-seo-jsonld="true"]')) as HTMLScriptElement[];
  jsonLdElements.forEach((element) => {
    element.remove();
  });

  for (const jsonLdValue of jsonLdEntries) {
    const resolvedValues = resolveJsonLdValue(jsonLdValue, canonical);
    if (!resolvedValues) {
      continue;
    }

    for (const resolved of resolvedValues) {
      ensureJsonLdTag(resolved);
    }
  }

  ensureMetaTag('robots', 'index, follow', 'name');
}

export function parseDateString(dateValue: string | undefined): number {
  if (!dateValue) return 0;
  const ts = Date.parse(dateValue);
  return Number.isNaN(ts) ? 0 : ts;
}

export function selectTopSkills(skills: ReadonlyArray<Skill>, limit = DEFAULT_TOP_SKILL_COUNT): Skill[] {
  const maxLimit = Math.max(limit, 0);

  if (maxLimit === 0) {
    return [];
  }

  return [...skills]
    .map((skill, index) => {
      const stars = Number((skill as Skill & { stars?: number }).stars) || 0;
      const dateWeight = parseDateString(skill.date_added);
      return {
        skill,
        index,
        stars,
        dateWeight,
      };
    })
    .sort((a, b) => {
      if (a.stars !== b.stars) {
        return b.stars - a.stars;
      }

      if (a.dateWeight !== b.dateWeight) {
        return b.dateWeight - a.dateWeight;
      }

      const nameCompare = a.skill.name.localeCompare(b.skill.name, undefined, { sensitivity: 'base' });
      if (nameCompare !== 0) {
        return nameCompare;
      }

      return a.index - b.index;
    })
    .slice(0, maxLimit)
    .map(({ skill }) => skill);
}

export function isTopSkill(skillId: string, skills: ReadonlyArray<Skill>, limit = DEFAULT_TOP_SKILL_COUNT): boolean {
  return selectTopSkills(skills, limit).some((entry) => entry.id === skillId);
}

export function buildHomeMeta(skillCount: number): SeoMeta {
  const visibleCount = Math.max(skillCount, 0);
  const visibleCountLabel = visibleCount > 0 ? `${visibleCount.toLocaleString('en-US')}+` : '';
  const title = visibleCount > 0
    ? `Antigravity Awesome Skills | ${visibleCountLabel} AI coding skills and plugins`
    : 'Antigravity Awesome Skills | AI coding skills and plugins';
  const description = visibleCount > 0
    ? `Explore ${visibleCount.toLocaleString('en-US')} installable agentic skills, specialized plugins, bundles, and workflows for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and other AI coding assistants.`
    : 'Explore installable agentic skills, specialized plugins, bundles, and workflows for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and other AI coding assistants.';
  return {
    title,
    description,
    canonicalPath: '/',
    ogTitle: title,
    ogDescription: description,
    ogImage: DEFAULT_SOCIAL_IMAGE,
    twitterCard: 'summary_large_image',
    jsonLd: (canonicalUrl: string) => [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Antigravity Awesome Skills',
        description,
        url: canonicalUrl,
        isPartOf: buildWebSiteSchema(canonicalUrl),
        sameAs: REPOSITORY_URL,
        about: buildSoftwareSourceCodeSchema(canonicalUrl, visibleCount),
        mainEntity: {
          '@type': 'ItemList',
          name: 'Antigravity Awesome Skills catalog',
        },
      },
      buildOrganizationSchema(),
      buildWebSiteSchema(canonicalUrl),
      buildSoftwareSourceCodeSchema(canonicalUrl, visibleCount),
      buildHomeFaqSchema(canonicalUrl),
    ],
  };
}

export function buildPluginsMeta(pluginCount: number): SeoMeta {
  const countLabel = pluginCount > 0 ? `${pluginCount.toLocaleString('en-US')} ` : '';
  const title = `AAS Specialized Plugins | ${countLabel}AI coding workflow packs`;
  const description = `Compare ${countLabel}specialized plugin packs for web apps, security, data analytics, documents, DevOps, QA, OSS maintenance, mobile apps, automation, and agent or MCP systems.`;

  return {
    title,
    description,
    canonicalPath: '/plugins',
    ogTitle: 'AAS Specialized Plugins | AI coding workflow packs',
    ogDescription: description,
    ogImage: DEFAULT_SOCIAL_IMAGE,
    twitterCard: 'summary_large_image',
    jsonLd: (canonicalUrl: string) => [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'AAS Specialized Plugins',
        description,
        url: canonicalUrl,
        isPartOf: buildWebSiteSchema(canonicalUrl),
        mainEntity: {
          '@type': 'ItemList',
          name: 'AAS specialized plugin packs',
          numberOfItems: pluginCount,
        },
      },
      buildOrganizationSchema(),
      buildWebSiteSchema(canonicalUrl),
    ],
  };
}

export function buildSkillMeta(skill: Skill, isPriority = false, canonicalPath = '/'): SeoMeta {
  const safeName = skill.name || 'Unnamed skill';
  const safeDescription = skill.description || 'Installable AI skill';
  const safeCategory = skill.category || 'Tools';
  const safeSource = skill.source || 'community contributors';
  const added = skill.date_added ? `Added ${skill.date_added}. ` : '';
  const trust = isPriority ? ` Prioritized in our catalog for quality and reuse. ` : ' ';
  const title = `${safeName} | Antigravity Awesome Skills`;
  const description = `${added}Use the @${safeName} skill for ${safeDescription} (${safeCategory}, ${safeSource}).${trust}Install and run quickly with your CLI workflow.`;
  return {
    title,
    description: description.trim(),
    canonicalPath,
    ogTitle: `@${safeName} | Antigravity Awesome Skills`,
    ogDescription: description,
    ogImage: DEFAULT_SOCIAL_IMAGE,
    twitterCard: 'summary',
    jsonLd: (canonicalUrl: string) => [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        '@id': canonicalUrl,
        name: `@${safeName}`,
        applicationCategory: safeCategory,
        description: description.trim(),
        url: canonicalUrl,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
        provider: {
          '@type': 'Organization',
          name: 'Antigravity Awesome Skills',
        },
        keywords: [safeCategory, safeSource],
        inLanguage: 'en',
        operatingSystem: 'Cross-platform',
        isPartOf: {
          '@type': 'CollectionPage',
          name: 'Antigravity Awesome Skills',
          url: getCatalogBaseUrl(canonicalUrl),
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: safeName,
        inLanguage: 'en',
        isPartOf: {
          '@type': 'WebSite',
          '@id': getCatalogBaseUrl(canonicalUrl),
          name: SITE_NAME,
        },
      },
      buildOrganizationSchema(),
      buildWebSiteSchema(canonicalUrl),
    ],
  };
}

export function buildSkillFallbackMeta(skillId: string): SeoMeta {
  const safeId = skillId || 'skill';
  return {
    title: `${safeId} | Antigravity Awesome Skills`,
    description: 'Installable AI skill details are loading. Browse the catalog and launch the right skill with the antigravity-awesome-skills CLI.',
    canonicalPath: `/skill/${encodeURIComponent(safeId)}`,
    ogTitle: `@${safeId} | Antigravity Awesome Skills`,
    ogDescription: 'Installable AI skill details are loading. Browse the catalog and launch the right skill quickly.',
    ogImage: DEFAULT_SOCIAL_IMAGE,
    twitterCard: 'summary',
    jsonLd: (canonicalUrl: string) => [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        '@id': canonicalUrl,
        name: `@${safeId}`,
        description: 'Installable AI skill details are loading. Browse the catalog and launch the right skill quickly.',
        url: canonicalUrl,
        provider: {
          '@type': 'Organization',
          name: 'Antigravity Awesome Skills',
        },
        inLanguage: 'en',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `@${safeId}`,
        isPartOf: {
          '@type': 'WebSite',
          '@id': getCatalogBaseUrl(canonicalUrl),
          name: SITE_NAME,
        },
      },
      buildOrganizationSchema(),
      buildWebSiteSchema(canonicalUrl),
    ],
  };
}
