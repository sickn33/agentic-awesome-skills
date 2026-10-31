import { buildFaqItems } from '../src/utils/catalogFaq.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectTopSkillEntries } from './generate-sitemap.js';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import { getDocsMetadata } from './docs-metadata.js';
import { remarkHeadings } from '../src/utils/markdownHeadings.js';
import remarkGfm from 'remark-gfm';
import { renderSkillBody, setRootFallback } from './render-skill-body.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const TEMPLATE_PATH = path.join(DIST_DIR, 'index.html');
const SKILLS_PATH = path.join(PUBLIC_DIR, 'skills.json');
const SEO_LANDING_PAGES_PATH = path.join(ROOT_DIR, 'src', 'data', 'seoLandingPages.json');

const HOME_CATALOG_COUNT_FALLBACK = 1969;
const PRERENDER_SOCIAL_IMAGE = 'social-card.png';
const SITE_NAME = 'Agentic Awesome Skills';
const REPOSITORY_URL = 'https://github.com/sickn33/agentic-awesome-skills';
const HOSTED_CATALOG_URL = 'https://aaskills.tech/';
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

function getCuratedSkillsForLandingPage(page, skills, limit = 12) {
  const maxItems = Math.max(0, limit);
  if (maxItems === 0 || !Array.isArray(skills)) return [];

  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  const editorial = (Array.isArray(page.featuredSkillIds) ? page.featuredSkillIds : [])
    .map((id) => byId.get(id))
    .filter(Boolean);
  const selectedIds = new Set(editorial.map((skill) => skill.id));
  const scored = skills
    .map((skill, index) => ({ skill, index, score: scoreLandingPageForSkill(page, skill) }))
    .filter(({ skill, score }) => score > 0 && !selectedIds.has(skill.id))
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      const idCompare = safeText(a.skill.id).localeCompare(safeText(b.skill.id), undefined, { sensitivity: 'base' });
      return idCompare || a.index - b.index;
    })
    .map(({ skill }) => skill);

  return [...editorial, ...scored].slice(0, maxItems);
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

function buildLandingFallback({ siteBaseUrl, catalogCount }) {
  const links = [
    { href: routeToUrl('/docs/codex-cli-skills', siteBaseUrl), label: 'Codex setup' },
    { href: routeToUrl('/docs/claude-code-skills', siteBaseUrl), label: 'Claude Code setup' },
    { href: routeToUrl('/core', siteBaseUrl), label: 'Explore the skill catalog' },
    { href: routeToUrl('/docs/aas-core', siteBaseUrl), label: 'Core, CLI and MCP reference' },
  ];
  return `<main data-prerender-fallback="true"><h1>Agentic Awesome Skills</h1><h2>Reusable skills for your AI coding agent.</h2><p>Explore ${catalogCount.toLocaleString('en-US')} reusable SKILL.md playbooks for Claude Code, Codex, Cursor and other coding agents. AAS Core lets your agent inspect the catalog, record its selection and preview a plan locally.</p><section id="recorded-example"><h2>Recorded example · Preview only</h2><p>Review an MCP contract. The agent chooses exact IDs; Core records and validates the choice. Review the plan before any separate installation.</p></section><section id="get-started"><h2>Start with your agent</h2><nav>${buildStaticLinkList(links)}</nav></section></main>`;
}

function buildHomeFallback({ landingPages, siteBaseUrl, skills }) {
  const links = [
    { href: routeToUrl('/directory', siteBaseUrl), label: 'Browse all skills A–Z' },
    { href: routeToUrl('/workbench', siteBaseUrl), label: 'Review an AAS stack and plan' },
    { href: routeToUrl('/plugins', siteBaseUrl), label: 'Compare specialized plugin packs' },
    ...landingPages.filter((page) => page.slug).map((page) => ({
      href: routeToUrl(`/topics/${encodeURIComponent(page.slug)}`, siteBaseUrl),
      label: page.h1,
    })),
  ];

  return [
    '<main data-prerender-fallback="true">',
    '<h1>Find the skills for your next project.</h1>',

    '<p>Explore reusable playbooks, inspect requirements and sources, and compare candidates.</p>',
    `<nav aria-label="Catalog hubs"><ul>${buildStaticLinkList(links)}</ul></nav>`,
    `<section aria-label="Catalog questions">${buildFaqItems(`${skills.length.toLocaleString('en-US')}+`).map((item) => `<h2>${escapeHtml(item.question)}</h2><p>${escapeHtml(item.answer)}</p>`).join('')}</section>`,
    '</main>',
  ].join('');
}

function buildTopicFallback({ page, landingPages, skills, siteBaseUrl }) {
  const curatedSkills = getCuratedSkillsForLandingPage(page, skills);
  const skillLinks = curatedSkills.map((skill) => ({
    href: routeToUrl(`/skill/${encodeURIComponent(skill.id)}`, siteBaseUrl),
    label: `@${safeText(skill.name) || safeText(skill.id)}`,
  }));
  const relatedLinks = landingPages
    .filter((landing) => landing.slug && landing.slug !== page.slug)
    .slice(0, 3)
    .map((landing) => ({
      href: routeToUrl(`/topics/${encodeURIComponent(landing.slug)}`, siteBaseUrl),
      label: landing.h1,
    }));

  const sections = (Array.isArray(page.sections) ? page.sections : [])
    .map((section) => `<section><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p></section>`)
    .join('');

  return [
    '<main data-prerender-fallback="true">',
    `<h1>${escapeHtml(page.h1)}</h1>`,
    `<p>${escapeHtml(page.summary)}</p>`,
    sections,
    skillLinks.length > 0 ? `<nav aria-label="Recommended skills"><h2>Recommended skills</h2><ul>${buildStaticLinkList(skillLinks)}</ul></nav>` : '',
    `<nav aria-label="Related topic guides"><h2>Related topic guides</h2><ul>${buildStaticLinkList(relatedLinks)}</ul></nav>`,
    '</main>',
  ].join('');
}

function buildSkillFallback({ skill, landingPages, siteBaseUrl }) {
  const relatedLinks = getRelatedLandingPagesForSkill(landingPages, skill).map((page) => ({
    href: routeToUrl(`/topics/${encodeURIComponent(page.slug)}`, siteBaseUrl),
    label: page.h1,
  }));

  const sourcePath = path.resolve(ROOT_DIR, '../..', skill.path, 'SKILL.md');
  const skillsRoot = path.resolve(ROOT_DIR, '../../skills') + path.sep;
  if (!fs.realpathSync(sourcePath).startsWith(skillsRoot)) throw new Error(`Skill source outside catalog: ${skill.id}`);
  const body = renderSkillBody(fs.readFileSync(sourcePath, 'utf8'), skill.path, routeToUrl(`/skill/${encodeURIComponent(skill.id)}`, siteBaseUrl));
  return buildPrerenderFallback({
    heading: `@${safeText(skill.name) || safeText(skill.id) || 'Skill'}`,
    description: safeText(skill.description) || 'Installable skill from Agentic Awesome Skills.',
    links: [{ href: routeToUrl('/directory', siteBaseUrl), label: 'All skills A–Z' }, ...relatedLinks],
  }).replace('</main>', () => `<article class="markdown-body">${body}</article></main>`);
}

function buildLandingMeta({ catalogCount, imageUrl, canonicalUrl }) {
  const visibleCount = Math.max(catalogCount, 0);
  const formattedCount = visibleCount > 0
    ? visibleCount.toLocaleString('en-US')
    : HOME_CATALOG_COUNT_FALLBACK.toLocaleString('en-US');
  const countLabel = `${formattedCount}+`;
  const title = 'Agentic Awesome Skills | AI Skills & AAS Core';
  const description = `Explore ${countLabel} reusable skills for Claude Code, Codex and Cursor. AAS Core records your agent’s catalog selection and previews a plan locally.`;
  const catalogBaseUrl = canonicalUrl.replace(/\/$/, '');

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
        '@type': 'WebPage',
        name: SITE_NAME,
        description,
        url: canonicalUrl,
        sameAs: REPOSITORY_URL,
        isPartOf: {
          '@type': 'WebSite',
          name: SITE_NAME,
          url: catalogBaseUrl,
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
      },
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: SITE_NAME,
        description,
        url: REPOSITORY_URL,
        sameAs: [...new Set([canonicalUrl, HOSTED_CATALOG_URL, 'https://www.npmjs.com/package/agentic-awesome-skills'])],
        mainEntityOfPage: canonicalUrl,
        codeRepository: REPOSITORY_URL,
        applicationCategory: 'DeveloperApplication',
        isAccessibleForFree: true,
      },
    ],
  };
}

function buildHomeMeta({ catalogCount, imageUrl, canonicalUrl }) {
  const visibleCount = Math.max(catalogCount, HOME_CATALOG_COUNT_FALLBACK);
  const formattedCount = visibleCount.toLocaleString('en-US');
  const title = `Skill Catalog | ${formattedCount}+ reusable skills | AAS`;
  const description = `Explore ${formattedCount}+ reusable agent skills. Search, inspect requirements and sources, compare candidates, and hand exact IDs to your coding agent.`;
  const catalogBaseUrl = canonicalUrl.replace(/\/core\/?$/, '/').replace(/\/$/, '');
  const sourceCodeEntity = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: SITE_NAME,
    description: `AAS Core preview is a local agent-first boundary for neutral catalog retrieval, exact agent-owned selection, validation, and planning, backed by ${formattedCount}+ agentic skills.`,
    url: REPOSITORY_URL,
    sameAs: [...new Set([
      canonicalUrl,
      HOSTED_CATALOG_URL,
      'https://www.npmjs.com/package/agentic-awesome-skills',
    ])],
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
      'AAS Core',
      'agent-selected skill stack',
      'agent stack',
      'Model Context Protocol',
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
          target: `${catalogBaseUrl}/core/?q={search_term_string}`,
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

function buildWorkbenchMeta({ imageUrl, canonicalUrl }) {
  const title = 'AAS Core Stack Review | Agentic Awesome Skills';
  const description = 'Review an AAS Core stack manifest and immutable preview plan locally in your browser. Imports stay in memory and cannot install or apply changes.';
  const catalogBaseUrl = canonicalUrl.replace(/\/workbench\/?$/, '');
  const catalogRootUrl = `${catalogBaseUrl}/`;
  const sourceCodeEntity = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: SITE_NAME,
    description: 'Canonical source for AAS Core, its local MCP and CLI, and the supporting skills catalog and registry evidence.',
    url: REPOSITORY_URL,
    sameAs: [canonicalUrl, catalogRootUrl, 'https://www.npmjs.com/package/agentic-awesome-skills'],
    mainEntityOfPage: canonicalUrl,
    codeRepository: REPOSITORY_URL,
    applicationCategory: 'DeveloperApplication',
    isAccessibleForFree: true,
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
        '@type': 'WebPage',
        name: 'Agentic Awesome Skills Workbench',
        headline: 'Review what your agent selected',
        description,
        url: canonicalUrl,
        mainEntityOfPage: canonicalUrl,
        isPartOf: {
          '@type': 'WebSite',
          name: SITE_NAME,
          url: catalogBaseUrl,
          sameAs: REPOSITORY_URL,
        },
        about: sourceCodeEntity,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: catalogRootUrl },
          { '@type': 'ListItem', position: 2, name: 'Skill Workbench', item: canonicalUrl },
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
          catalogRootUrl,
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
          target: `${catalogBaseUrl}/core/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      sourceCodeEntity,
    ],
  };
}

function buildTopicLandingMeta({ page, featuredSkills = [], imageUrl, canonicalUrl }) {
  const catalogBaseUrl = canonicalUrl.replace(/\/topics\/[^/]+\/?$/, '');
  const keywords = Array.isArray(page.keywords) ? page.keywords.join(', ') : '';
  const sourceCodeEntity = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: SITE_NAME,
    description: 'AAS Core preview is a local agent-first control plane backed by an evidence-rich catalog of agentic skills.',
    url: REPOSITORY_URL,
    sameAs: [...new Set([
      canonicalUrl,
      HOSTED_CATALOG_URL,
      'https://www.npmjs.com/package/agentic-awesome-skills',
    ])],
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
          name: `${page.eyebrow} recommended skills`,
          numberOfItems: featuredSkills.length || (Array.isArray(page.sections) ? page.sections.length : 0),
          itemListElement: featuredSkills.length > 0
            ? featuredSkills.map((skill, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: safeText(skill.name) || safeText(skill.id),
              description: safeText(skill.description),
              url: routeToUrl(`/skill/${encodeURIComponent(skill.id)}`, catalogBaseUrl),
            }))
            : (Array.isArray(page.sections) ? page.sections.map((section, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: section.heading,
              description: section.body,
            })) : []),
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
          target: `${catalogBaseUrl}/core/?q={search_term_string}`,
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
  const topCount = parseCount(process.env.PRERENDER_TOP_SKILL_COUNT || process.env.TOP_SKILL_COUNT, 180);
  const topSkillPaths = selectTopSkillEntries(skills, topCount);
  const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
  const topSkillSet = new Set(topSkillPaths.map((routePath) => routePath.replace(/^\/skill\//, '')));
  const socialImage = `${siteBaseUrl.replace(/\/+$/, '')}/${PRERENDER_SOCIAL_IMAGE}`;
  const docs = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'src/data/docs.json'), 'utf8'));
  const docsMetadata = getDocsMetadata();
  const socialGuides = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'src/data/docs-social.json'), 'utf8'));
  const docsNavigation = `<nav aria-label="Documentation">${docs.map((doc) => `<p><a href="${escapeHtml(routeToUrl(`/docs/${doc.slug}`, siteBaseUrl))}">${escapeHtml(doc.title)}</a></p>`).join('')}</nav>`;
  for (const doc of [null, ...docs]) {
    const metadata = doc ? docsMetadata[doc.slug] : null;
    const routePath = doc ? `/docs/${doc.slug}` : '/docs';
    const title = `${doc?.title || 'Documentation'} | ${SITE_NAME}`;
    const content = doc ? fs.readFileSync(path.join(ROOT_DIR, `../../docs/users/${doc.slug}.md`), 'utf8') : '';
    const sourceRoot = `${REPOSITORY_URL}/blob/${metadata?.commit || 'main'}/`;
    const fallback = doc ? renderToStaticMarkup(createElement(Markdown, {
      remarkPlugins: [remarkGfm, remarkHeadings],
      urlTransform: (url, key) => {
        if (key === 'href' && url.startsWith('#')) return `${routeToUrl(routePath, siteBaseUrl)}${url}`;
        if (/^https?:\/\//i.test(url) || (key === 'href' && /^mailto:/i.test(url))) return url;
        if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//') || url.includes('\\')) return '';
        const resolved = new URL(url, `${sourceRoot}docs/users/${doc.slug}.md`);
        if (!resolved.href.startsWith(sourceRoot)) return '';
        const match = resolved.pathname.match(/\/docs\/users\/([^/]+)\.md$/);
        if (key === 'href' && match && docs.some((entry) => entry.slug === match[1])) return `${routeToUrl(`/docs/${match[1]}`, siteBaseUrl)}${resolved.hash}`;
        return key === 'src' ? resolved.href.replace(`${REPOSITORY_URL}/blob/`, 'https://raw.githubusercontent.com/sickn33/agentic-awesome-skills/') : resolved.href;
      },
    }, content)) : `<h1>Documentation</h1><p>Start with AAS Core, explore integrations, and put your skills to work.</p>${docsNavigation}`;
    writePrerenderedRoute(routePath, template, {
      title,
      description: doc ? `${doc.title}: guides and reference for Agentic Awesome Skills.` : 'Learn AAS Core, install skills, configure integrations, and follow practical workflows.',
      canonicalUrl: routeToUrl(routePath, siteBaseUrl),
      ogImage: doc && socialGuides.includes(doc.slug) ? `${siteBaseUrl.replace(/\/+$/, '')}/social/docs/${doc.slug}.png` : socialImage,
      jsonLd: [{
        '@context': 'https://schema.org',
        '@type': doc ? ['WebPage', 'TechArticle'] : 'WebPage',
        name: title,
        headline: title,
        ...(metadata ? { dateModified: metadata.modified, version: metadata.commit } : {}),
        description: doc ? `${doc.title}: guides and reference for Agentic Awesome Skills.` : 'Learn AAS Core, install skills, configure integrations, and follow practical workflows.',
        url: routeToUrl(routePath, siteBaseUrl),
        mainEntityOfPage: routeToUrl(routePath, siteBaseUrl),
      }, {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: routeToUrl('/', siteBaseUrl) },
          { '@type': 'ListItem', position: 2, name: 'Documentation', item: routeToUrl('/docs', siteBaseUrl) },
          ...(doc ? [{ '@type': 'ListItem', position: 3, name: doc.title, item: routeToUrl(routePath, siteBaseUrl) }] : []),
        ],
      }],
    }, `<main><a href="${escapeHtml(routeToUrl('/docs', siteBaseUrl))}">Documentation</a>${fallback}</main>`);
  }

  const landingCanonical = routeToUrl('/', siteBaseUrl);
  const landingMeta = buildLandingMeta({
    catalogCount: skills.length,
    imageUrl: socialImage,
    canonicalUrl: landingCanonical,
  });
  writePrerenderedRoute('/', template, landingMeta, buildLandingFallback({ siteBaseUrl, catalogCount: skills.length }));

  writePrerenderedRoute('/aas-core', template, { ...landingMeta, canonicalUrl: landingCanonical }, `<main><h1>AAS Core</h1><p>The product overview is now on the homepage.</p><a href="${escapeHtml(landingCanonical)}">Open AAS Core</a></main>`);

  const homeCanonical = routeToUrl('/core', siteBaseUrl);
  const homeMeta = buildHomeMeta({
    catalogCount: skills.length,
    imageUrl: socialImage,
    canonicalUrl: homeCanonical,
  });
  writePrerenderedRoute('/core', template, homeMeta, buildHomeFallback({ landingPages, siteBaseUrl, skills }));

  const directoryLinks = [...skills].sort((a, b) => a.id.localeCompare(b.id, 'en')).map((skill) => ({ href: routeToUrl(`/skill/${encodeURIComponent(skill.id)}`, siteBaseUrl), label: skill.id }));
  writePrerenderedRoute('/directory', template, {
    title: 'All skills A–Z | Agentic Awesome Skills',
    description: 'Browse the complete alphabetical directory of reusable AI agent skills.',
    canonicalUrl: routeToUrl('/directory', siteBaseUrl), ogImage: socialImage, jsonLd: [],
  }, `<main><h1>All skills A–Z</h1><p>Browse the complete alphabetical directory of reusable AI agent skills.</p><a href="${escapeHtml(homeCanonical)}">Search and filter the catalog</a><ul>${buildStaticLinkList(directoryLinks)}</ul></main>`);
  // Shared selections are client state, but their entry route must remain reachable.
  writePrerenderedRoute('/share', setMetaTag(template, 'name', 'robots', 'noindex, follow'), { ...homeMeta, title: 'Shared skill selection | Agentic Awesome Skills', description: 'Inspect a shared skill selection and prepare a brief for your coding agent.', canonicalUrl: routeToUrl('/share', siteBaseUrl), jsonLd: [] }, '<main><h1>Shared skill selection</h1><p>Open the selection in the catalog.</p></main>');
  const notFound = setRootFallback(applySeoMeta(template, {
    title: 'Page not found | Agentic Awesome Skills', description: 'The requested catalog page does not exist.',
    canonicalUrl: routeToUrl('/404', siteBaseUrl), ogImage: socialImage, jsonLd: [],
  }), '<main><h1>Page not found</h1><p>The requested catalog page does not exist or has moved.</p><a href="' + escapeHtml(homeCanonical) + '">Browse skills</a></main>');
  fs.writeFileSync(path.join(DIST_DIR, '404.html'), setMetaTag(notFound, 'name', 'robots', 'noindex, follow'));

  const informationPages = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'src/data/informationPages.json'), 'utf8'));
  for (const page of informationPages) {
    const fallback = `<main><p>${escapeHtml(page.title)}</p><h1>${escapeHtml(page.intro)}</h1><p>${escapeHtml(page.lede)}</p>${page.sections.map((section, index) => `<section id="section-${index}"><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body)}</p>${section.links.map((link) => `<a href="${escapeHtml(link.href.startsWith('/') ? routeToUrl(link.href, siteBaseUrl) : link.href)}">${escapeHtml(link.label)}</a>`).join(' ')}</section>`).join('')}</main>`;
    writePrerenderedRoute(page.path, template, {
      title: `${page.title} | ${SITE_NAME}`,
      description: page.description,
      canonicalUrl: routeToUrl(page.path, siteBaseUrl),
      ogImage: socialImage,
      jsonLd: [{
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: page.title,
        headline: page.title,
        description: page.description,
        url: routeToUrl(page.path, siteBaseUrl),
        mainEntityOfPage: routeToUrl(page.path, siteBaseUrl),
        isPartOf: {
          '@type': 'WebSite',
          name: SITE_NAME,
          url: siteBaseUrl,
        },
      }],
    }, fallback);
  }

  const pluginsCanonical = routeToUrl('/plugins', siteBaseUrl);
  const pluginsMeta = buildPluginsMeta({
    pluginCount: JSON.parse(fs.readFileSync(path.join(ROOT_DIR, '../../data/editorial-bundles.json'), 'utf8')).bundles.length,
    imageUrl: socialImage,
    canonicalUrl: pluginsCanonical,
  });
  writePrerenderedRoute('/plugins', template, pluginsMeta);

  const workbenchCanonical = routeToUrl('/workbench', siteBaseUrl);
  const workbenchMeta = buildWorkbenchMeta({
    imageUrl: socialImage,
    canonicalUrl: workbenchCanonical,
  });
  writePrerenderedRoute('/workbench', template, workbenchMeta);

  for (const page of landingPages) {
    if (!page?.slug) {
      continue;
    }

    const routePath = `/topics/${encodeURIComponent(page.slug)}`;
    const canonicalUrl = routeToUrl(routePath, siteBaseUrl);
    const landingMeta = buildTopicLandingMeta({
      page,
      featuredSkills: getCuratedSkillsForLandingPage(page, skills),
      imageUrl: socialImage,
      canonicalUrl,
    });
    writePrerenderedRoute(
      routePath,
      template,
      landingMeta,
      buildTopicFallback({ page, landingPages, skills, siteBaseUrl }),
    );
  }

  const allSkillPaths = skills
    .filter((skill) => skill && skill.id)
    .map((skill) => `/skill/${encodeURIComponent(skill.id)}`)
    .sort();

  for (const skillRoute of allSkillPaths) {
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
