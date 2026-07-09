import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectTopSkillEntries } from './generate-sitemap.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const TEMPLATE_PATH = path.join(DIST_DIR, 'index.html');
const SKILLS_PATH = path.join(PUBLIC_DIR, 'skills.json');
const SEO_LANDING_PAGES_PATH = path.join(ROOT_DIR, 'src', 'data', 'seoLandingPages.json');

const HOME_CATALOG_COUNT_FALLBACK = 1935;
const PRERENDER_SOCIAL_IMAGE = 'social-card.png';
const SITE_NAME = 'Agentic Awesome Skills';
const REPOSITORY_URL = 'https://github.com/sickn33/agentic-awesome-skills';
const HOSTED_CATALOG_URL = 'https://sickn33.github.io/agentic-awesome-skills/';
const FAQ_ITEMS = [
  {
    question: 'What is Agentic Awesome Skills?',
    answer: (countLabel) =>
      `Agentic Awesome Skills is an installable GitHub library of ${countLabel} reusable SKILL.md playbooks for AI coding assistants. It supports Claude Code, Cursor, Codex CLI, Autohand Code, Gemini CLI, Antigravity, and related hosts through direct skill installs, specialized plugins, bundles, workflows, and a searchable catalog.`,
  },
  {
    question: 'How do I install Agentic Awesome Skills?',
    answer:
      'Install the library with npx github:sickn33/agentic-awesome-skills. Use tool-specific flags such as --codex, --cursor, --gemini, --claude, or --antigravity when you want the installer to target a specific skills directory already used by your assistant runtime.',
  },
  {
    question: 'Is Agentic Awesome Skills a GitHub repository?',
    answer:
      'Yes. The GitHub repository at https://github.com/sickn33/agentic-awesome-skills is the canonical source for the skill library, installer, specialized plugins, bundles, workflows, and documentation. The hosted catalog is the searchable browsing surface for that repository.',
  },
  {
    question: 'What are AAS specialized plugins?',
    answer:
      'AAS specialized plugins are focused, domain-specific distributions of the skill library. They package relevant skills for web apps, security, data analytics, documents, DevOps, QA, OSS maintenance, and agent or MCP work so users can start with the right surface instead of activating the entire catalog.',
  },
  {
    question: 'How are plugins, bundles, and workflows different?',
    answer:
      'Plugins are installable packaging surfaces, bundles are curated skill recommendations, and workflows are ordered execution playbooks. Start with a plugin when the domain is clear, use bundles to compare adjacent skills, and use workflows when sequencing planning, coding, testing, auditing, or release work matters.',
  },
];

function buildFaqItems(countLabel) {
  return FAQ_ITEMS.map((item) => ({
    question: item.question,
    answer: typeof item.answer === 'function' ? item.answer(countLabel) : item.answer,
  }));
}

function parseCount(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : fallback;
}

function getSiteBaseUrl() {
  const seoSiteUrl = (process.env.SEO_SITE_URL || '').trim().replace(/\/+$/, '');
  if (seoSiteUrl) {
    return seoSiteUrl;
  }

  return HOSTED_CATALOG_URL.replace(/\/+$/, '');
}

function ensureDirectory(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function normalizeRoute(routePath) {
  const withLeadingSlash = routePath.startsWith('/') ? routePath : `/${routePath}`;
  return withLeadingSlash === '//' ? '/' : withLeadingSlash;
}

function routeToUrl(routePath, siteBaseUrl) {
  const normalizedRoute = normalizeRoute(routePath);
  const normalizedBase = siteBaseUrl.replace(/\/+$/, '');
  const indexableRoute = normalizedRoute === '/' || normalizedRoute.endsWith('/')
    ? normalizedRoute
    : `${normalizedRoute}/`;
  return `${normalizedBase}${indexableRoute}`;
}

function routeToFilePath(routePath) {
  if (routePath === '/') {
    return path.join(DIST_DIR, 'index.html');
  }

  const normalized = normalizeRoute(routePath).replace(/^\//, '');
  const segments = normalized.split('/').filter(Boolean);

  return path.join(DIST_DIR, ...segments, 'index.html');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeScriptJson(value) {
  return String(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function removeExistingJsonLdScripts(html) {
  const marker = 'data-seo-jsonld="true"';
  let remaining = html;
  let lowered = html.toLowerCase();

  while (true) {
    const markerIndex = lowered.indexOf(marker);
    if (markerIndex === -1) {
      return remaining;
    }

    const openTagStart = lowered.lastIndexOf('<script', markerIndex);
    if (openTagStart === -1) {
      return remaining;
    }

    const openTagEnd = lowered.indexOf('>', markerIndex);
    if (openTagEnd === -1) {
      return remaining;
    }

    const closeTagStart = lowered.indexOf('</script', openTagEnd + 1);
    if (closeTagStart === -1) {
      return remaining;
    }

    const closeTagEnd = lowered.indexOf('>', closeTagStart + 8);
    if (closeTagEnd === -1) {
      return remaining;
    }

    remaining = `${remaining.slice(0, openTagStart)}${remaining.slice(closeTagEnd + 1)}`;
    lowered = remaining.toLowerCase();
  }
}

function replaceHtmlTag(html, pattern, replacement, insertionPoint) {
  if (pattern.test(html)) {
    return html.replace(pattern, replacement);
  }

  return html.replace(insertionPoint, `${replacement}\n${insertionPoint}`);
}

function setMetaTag(html, attributeName, attributeValue, content) {
  const attributeEscaped = escapeRegExp(attributeValue);
  const pattern = new RegExp(`<meta\\s+[^>]*${attributeName}=["']${attributeEscaped}["'][^>]*>`, 'i');
  const replacement = `<meta ${attributeName}="${attributeValue}" content="${escapeHtml(content)}" />`;
  return replaceHtmlTag(html, pattern, replacement, '</head>');
}

function setLinkTag(html, relation, href) {
  const pattern = new RegExp(`<link\\s+[^>]*rel=["']${escapeRegExp(relation)}["'][^>]*>`, 'i');
  const replacement = `<link rel="${relation}" href="${escapeHtml(href)}" />`;
  return replaceHtmlTag(html, pattern, replacement, '</head>');
}

function setTitleTag(html, title) {
  const pattern = /<title[^>]*>[\s\S]*?<\/title>/i;
  const replacement = `<title>${escapeHtml(title)}</title>`;
  return replaceHtmlTag(html, pattern, replacement, '</head>');
}

function setJsonLdTag(html, payload) {
  const cleaned = removeExistingJsonLdScripts(html);
  const tag = `<script type="application/ld+json" data-seo-jsonld="true">${escapeScriptJson(JSON.stringify(payload))}</script>`;
  return cleaned.replace('</head>', `\n${tag}\n</head>`);
}

function safeText(value) {
  return String(value || '').trim();
}

function normalizeMatchText(value) {
  return safeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getLandingPageMatchTerms(page) {
  return [
    page.slug,
    page.eyebrow,
    page.h1,
    page.summary,
    page.primaryIntent,
    ...(Array.isArray(page.keywords) ? page.keywords : []),
    ...(Array.isArray(page.relatedTerms) ? page.relatedTerms : []),
  ];
}

function scoreLandingPageForSkill(page, skill) {
  const haystack = normalizeMatchText([
    skill.id,
    skill.name,
    skill.description,
    skill.category,
    skill.source,
    skill.path,
  ].filter(Boolean).join(' '));
  const category = normalizeMatchText(skill.category);
  const relatedCategories = Array.isArray(page.relatedCategories)
    ? page.relatedCategories.map(normalizeMatchText)
    : [];
  let score = relatedCategories.includes(category) ? 12 : 0;

  for (const term of getLandingPageMatchTerms(page)) {
    const normalizedTerm = normalizeMatchText(term);

    if (!normalizedTerm || normalizedTerm.length < 3) {
      continue;
    }

    if (haystack.includes(normalizedTerm)) {
      score += Math.min(12, 3 + normalizedTerm.split(' ').length * 2);
      continue;
    }

    const matchedTokens = normalizedTerm
      .split(' ')
      .filter((token) => token.length >= 4 && haystack.includes(token));

    score += Math.min(6, matchedTokens.length);
  }

  return score;
}

function getRelatedLandingPagesForSkill(landingPages, skill, limit = 3) {
  const maxItems = Math.max(0, limit);

  if (maxItems === 0) {
    return [];
  }

  const scoredPages = landingPages
    .map((page, index) => ({
      page,
      index,
      score: scoreLandingPageForSkill(page, skill),
    }))
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      return a.index - b.index;
    });
  const selected = scoredPages.filter(({ score }) => score > 0).map(({ page }) => page);

  for (const { page } of scoredPages) {
    if (selected.length >= maxItems) {
      break;
    }

    if (!selected.includes(page)) {
      selected.push(page);
    }
  }

  return selected.slice(0, maxItems);
}

function buildStaticLinkList(links) {
  return links
    .map((link) => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`)
    .join('');
}

function buildPrerenderFallback({ heading, description, links }) {
  const items = buildStaticLinkList(links);

  return [
    '<main data-prerender-fallback="true">',
    `<h1>${escapeHtml(heading)}</h1>`,
    `<p>${escapeHtml(description)}</p>`,
    items ? `<nav aria-label="Related topic guides"><ul>${items}</ul></nav>` : '',
    '</main>',
  ].join('');
}

function buildTopicFallback({ page, landingPages, siteBaseUrl }) {
  const relatedLinks = landingPages
    .filter((landing) => landing.slug && landing.slug !== page.slug)
    .slice(0, 3)
    .map((landing) => ({
      href: routeToUrl(`/topics/${encodeURIComponent(landing.slug)}`, siteBaseUrl),
      label: landing.h1,
    }));

  return buildPrerenderFallback({
    heading: page.h1,
    description: page.summary,
    links: relatedLinks,
  });
}

function buildSkillFallback({ skill, landingPages, siteBaseUrl }) {
  const relatedLinks = getRelatedLandingPagesForSkill(landingPages, skill).map((page) => ({
    href: routeToUrl(`/topics/${encodeURIComponent(page.slug)}`, siteBaseUrl),
    label: page.h1,
  }));

  return buildPrerenderFallback({
    heading: `@${safeText(skill.name) || safeText(skill.id) || 'Skill'}`,
    description: safeText(skill.description) || 'Installable skill from Agentic Awesome Skills.',
    links: relatedLinks,
  });
}

function setRootFallback(html, fallbackHtml) {
  const rootPattern = /<div\s+id=["']root["']><\/div>/i;

  if (!fallbackHtml || !rootPattern.test(html)) {
    return html;
  }

  return html.replace(rootPattern, `<div id="root">${fallbackHtml}</div>`);
}

function buildHomeMeta({ catalogCount, imageUrl, canonicalUrl }) {
  const visibleCount = Math.max(catalogCount, HOME_CATALOG_COUNT_FALLBACK);
  const formattedCount = visibleCount.toLocaleString('en-US');
  const title = `Agentic Awesome Skills GitHub | ${formattedCount}+ AI coding skills`;
  const description = `Explore the GitHub library of ${formattedCount}+ installable agentic skills, specialized plugins, bundles, and workflows for Claude Code, Cursor, Codex CLI, Autohand Code, Gemini CLI, Antigravity, and other AI coding assistants.`;
  const catalogBaseUrl = canonicalUrl.replace(/\/$/, '');
  const sourceCodeEntity = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: SITE_NAME,
    description: `Installable GitHub library of ${formattedCount}+ agentic skills, specialized plugins, bundles, and workflows for AI coding assistants.`,
    url: REPOSITORY_URL,
    sameAs: [
      canonicalUrl,
      HOSTED_CATALOG_URL,
      'https://www.npmjs.com/package/agentic-awesome-skills',
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
      'Antigravity CLI skills',
      'GitHub AI skills repository',
      'AI agent skills GitHub',
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

  return {
    title,
    description,
    canonicalUrl,
    ogTitle: title,
    ogDescription: description,
    ogImage: imageUrl,
    twitterCard: 'summary_large_image',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: SITE_NAME,
        description,
        url: canonicalUrl,
        sameAs: REPOSITORY_URL,
        about: sourceCodeEntity,
        isPartOf: {
          '@type': 'WebSite',
          name: SITE_NAME,
          url: catalogBaseUrl,
        },
        mainEntity: {
          '@type': 'ItemList',
          name: `${SITE_NAME} catalog`,
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${REPOSITORY_URL}#organization`,
        name: SITE_NAME,
        url: REPOSITORY_URL,
        sameAs: [
          'https://x.com/AASkills_',
          'https://www.npmjs.com/package/agentic-awesome-skills',
          HOSTED_CATALOG_URL,
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: catalogBaseUrl,
        sameAs: REPOSITORY_URL,
        inLanguage: 'en',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${catalogBaseUrl}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      sourceCodeEntity,
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        url: canonicalUrl,
        mainEntity: buildFaqItems(`${formattedCount}+`).map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
  };
}

function buildSkillMeta({ skill, isPriority, imageUrl, canonicalUrl }) {
  const safeName = safeText(skill.name) || 'Unnamed skill';
  const safeDescription = safeText(skill.description) || 'Installable AI skill';
  const safeCategory = safeText(skill.category) || 'Tools';
  const safeSource = safeText(skill.source) || 'community contributors';
  const added = skill.date_added ? `Added ${skill.date_added}. ` : '';
  const trust = isPriority ? ' Prioritized in our catalog for quality and reuse. ' : ' ';

  const title = `${safeName} | ${SITE_NAME}`;
  const description = `${added}Use the @${safeName} skill for ${safeDescription} (${safeCategory}, ${safeSource}).${trust}Install and run quickly with your CLI workflow.`;

  return {
    title,
    description,
    canonicalUrl,
    ogTitle: `@${safeName} | ${SITE_NAME}`,
    ogDescription: description,
    ogImage: imageUrl,
    twitterCard: 'summary',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      '@id': canonicalUrl,
      name: `@${safeName}`,
      applicationCategory: safeCategory,
      description,
      url: canonicalUrl,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
      provider: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
      keywords: [safeCategory, safeSource],
      inLanguage: 'en',
      operatingSystem: 'Cross-platform',
      isPartOf: {
        '@type': 'CollectionPage',
        name: SITE_NAME,
      },
    },
  };
}

function buildPluginsMeta({ pluginCount, imageUrl, canonicalUrl }) {
  const countLabel = pluginCount > 0 ? `${pluginCount.toLocaleString('en-US')} ` : '';
  const description = `Compare ${countLabel}specialized plugin packs for web apps, security, data analytics, documents, DevOps, QA, OSS maintenance, mobile apps, automation, and agent or MCP systems.`;

  return {
    title: `AAS Specialized Plugins | ${countLabel}AI coding workflow packs`,
    description,
    canonicalUrl,
    ogTitle: 'AAS Specialized Plugins | AI coding workflow packs',
    ogDescription: description,
    ogImage: imageUrl,
    twitterCard: 'summary_large_image',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'AAS Specialized Plugins',
        description,
        url: canonicalUrl,
        isPartOf: {
          '@type': 'WebSite',
          name: SITE_NAME,
          url: canonicalUrl.replace(/\/plugins\/?$/, ''),
          sameAs: REPOSITORY_URL,
        },
        mainEntity: {
          '@type': 'ItemList',
          name: 'AAS specialized plugin packs',
          numberOfItems: pluginCount,
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${REPOSITORY_URL}#organization`,
        name: SITE_NAME,
        url: REPOSITORY_URL,
      },
    ],
  };
}

function buildTopicLandingMeta({ page, imageUrl, canonicalUrl }) {
  const catalogBaseUrl = canonicalUrl.replace(/\/topics\/[^/]+\/?$/, '');
  const keywords = Array.isArray(page.keywords) ? page.keywords.join(', ') : '';
  const sourceCodeEntity = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: SITE_NAME,
    description: 'Installable GitHub library of agentic skills, specialized plugins, bundles, and workflows for AI coding assistants.',
    url: REPOSITORY_URL,
    sameAs: [
      canonicalUrl,
      HOSTED_CATALOG_URL,
      'https://www.npmjs.com/package/agentic-awesome-skills',
    ],
    mainEntityOfPage: canonicalUrl,
    codeRepository: REPOSITORY_URL,
    applicationCategory: 'DeveloperApplication',
    keywords: [
      ...(Array.isArray(page.keywords) ? page.keywords : []),
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

  return {
    title: page.title,
    description: page.description,
    canonicalUrl,
    ogTitle: page.title,
    ogDescription: page.description,
    ogImage: imageUrl,
    twitterCard: 'summary_large_image',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: page.h1,
        headline: page.h1,
        description: page.description,
        url: canonicalUrl,
        isPartOf: {
          '@type': 'WebSite',
          name: SITE_NAME,
          url: catalogBaseUrl,
          sameAs: REPOSITORY_URL,
        },
        about: sourceCodeEntity,
        keywords,
        mainEntity: {
          '@type': 'ItemList',
          name: `${page.eyebrow} topics`,
          itemListElement: Array.isArray(page.sections)
            ? page.sections.map((section, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: section.heading,
              description: section.body,
            }))
            : [],
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: SITE_NAME,
            item: HOSTED_CATALOG_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: page.h1,
            item: canonicalUrl,
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${REPOSITORY_URL}#organization`,
        name: SITE_NAME,
        url: REPOSITORY_URL,
        sameAs: [
          'https://x.com/AASkills_',
          'https://www.npmjs.com/package/agentic-awesome-skills',
          HOSTED_CATALOG_URL,
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: catalogBaseUrl,
        sameAs: REPOSITORY_URL,
        inLanguage: 'en',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${catalogBaseUrl}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      sourceCodeEntity,
    ],
  };
}

function applySeoMeta(templateHtml, meta) {
  let output = templateHtml;
  const title = safeText(meta.title);
  const description = safeText(meta.description);
  const canonical = safeText(meta.canonicalUrl);
  const ogTitle = safeText(meta.ogTitle || title);
  const ogDescription = safeText(meta.ogDescription || description);
  const ogImage = safeText(meta.ogImage);

  output = setTitleTag(output, title);
  output = setMetaTag(output, 'name', 'description', description);
  output = setMetaTag(output, 'property', 'og:type', 'website');
  output = setMetaTag(output, 'property', 'og:title', ogTitle);
  output = setMetaTag(output, 'property', 'og:description', ogDescription);
  output = setMetaTag(output, 'property', 'og:site_name', SITE_NAME);
  output = setMetaTag(output, 'property', 'og:url', canonical);
  output = setMetaTag(output, 'name', 'twitter:card', safeText(meta.twitterCard || 'summary'));
  output = setMetaTag(output, 'name', 'twitter:title', ogTitle);
  output = setMetaTag(output, 'name', 'twitter:description', ogDescription);
  output = setMetaTag(output, 'name', 'twitter:image:alt', `${ogTitle} preview`);
  output = setMetaTag(output, 'property', 'og:image', ogImage);
  output = setMetaTag(output, 'name', 'twitter:image', ogImage);
  output = setLinkTag(output, 'canonical', canonical);
  output = setJsonLdTag(output, meta.jsonLd);
  return output;
}

function writePrerenderedRoute(routePath, templateHtml, meta, fallbackHtml = '') {
  const filePath = routeToFilePath(routePath);
  const rendered = setRootFallback(applySeoMeta(templateHtml, meta), fallbackHtml);
  const directory = path.dirname(filePath);
  ensureDirectory(directory);
  fs.writeFileSync(filePath, rendered, 'utf-8');
}

function readCatalog() {
  if (!fs.existsSync(SKILLS_PATH)) {
    throw new Error(`Skills catalog not found at ${SKILLS_PATH}`);
  }

  const raw = fs.readFileSync(SKILLS_PATH, 'utf-8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('Skills catalog must be an array.');
  }

  return parsed;
}

function readSeoLandingPages() {
  if (!fs.existsSync(SEO_LANDING_PAGES_PATH)) {
    return [];
  }

  const raw = fs.readFileSync(SEO_LANDING_PAGES_PATH, 'utf-8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('SEO landing pages data must be an array.');
  }

  return parsed;
}

function main() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Built index file not found at ${TEMPLATE_PATH}. Run npm run build before prerender.`);
  }

  const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const skills = readCatalog();
  const landingPages = readSeoLandingPages();
  const siteBaseUrl = getSiteBaseUrl();
  const topCount = parseCount(process.env.PRERENDER_TOP_SKILL_COUNT || process.env.TOP_SKILL_COUNT, 40);
  const topSkillPaths = selectTopSkillEntries(skills, topCount);
  const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
  const topSkillSet = new Set(topSkillPaths.map((routePath) => routePath.replace(/^\/skill\//, '')));
  const socialImage = `${siteBaseUrl.replace(/\/+$/, '')}/${PRERENDER_SOCIAL_IMAGE}`;

  const homeCanonical = routeToUrl('/', siteBaseUrl);
  const homeMeta = buildHomeMeta({
    catalogCount: skills.length,
    imageUrl: socialImage,
    canonicalUrl: homeCanonical,
  });
  writePrerenderedRoute('/', template, homeMeta);

  const pluginsCanonical = routeToUrl('/plugins', siteBaseUrl);
  const pluginsMeta = buildPluginsMeta({
    pluginCount: 15,
    imageUrl: socialImage,
    canonicalUrl: pluginsCanonical,
  });
  writePrerenderedRoute('/plugins', template, pluginsMeta);

  for (const page of landingPages) {
    if (!page?.slug) {
      continue;
    }

    const routePath = `/topics/${encodeURIComponent(page.slug)}`;
    const canonicalUrl = routeToUrl(routePath, siteBaseUrl);
    const landingMeta = buildTopicLandingMeta({
      page,
      imageUrl: socialImage,
      canonicalUrl,
    });
    writePrerenderedRoute(
      routePath,
      template,
      landingMeta,
      buildTopicFallback({ page, landingPages, siteBaseUrl }),
    );
  }

  for (const skillRoute of topSkillPaths) {
    const decodedId = decodeURIComponent(skillRoute.replace(/^\/skill\//, ''));
    const skill = skillMap.get(decodedId);
    if (!skill) {
      continue;
    }

    const canonicalUrl = routeToUrl(skillRoute, siteBaseUrl);
    const skillMeta = buildSkillMeta({
      skill,
      isPriority: topSkillSet.has(encodeURIComponent(decodedId)),
      imageUrl: socialImage,
      canonicalUrl,
    });
    writePrerenderedRoute(
      skillRoute,
      template,
      skillMeta,
      buildSkillFallback({ skill, landingPages, siteBaseUrl }),
    );
  }
}

main();
