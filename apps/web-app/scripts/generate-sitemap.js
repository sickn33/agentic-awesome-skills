import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const SKILLS_JSON = path.join(PUBLIC_DIR, 'skills.json');
const SEO_LANDING_PAGES_JSON = path.join(ROOT_DIR, 'src', 'data', 'seoLandingPages.json');
const OUTPUT_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');
const BASE_PATH =
  (process.env.VITE_BASE_PATH || '/').trim().replace(/\/+$/, '');
const NORMALIZED_BASE_PATH = BASE_PATH && BASE_PATH !== '/' ? BASE_PATH : '';
const DEFAULT_SITE_URL = `http://localhost${NORMALIZED_BASE_PATH}`;

const SITE_URL = (process.env.SEO_SITE_URL || process.env.WEBSITE_BASE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
const TOP_SKILL_COUNT = Number.parseInt(process.env.TOP_SKILL_COUNT || '40', 10);
const DEFAULT_LASTMOD = new Date().toISOString().slice(0, 10);

function getTopSkillCount() {
  return Number.isFinite(TOP_SKILL_COUNT) ? Math.max(TOP_SKILL_COUNT, 0) : 40;
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function getDateScore(dateValue) {
  if (!dateValue) return 0;

  const parsed = Date.parse(dateValue);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeSkillId(skillId) {
  return encodeURIComponent(String(skillId).trim());
}

export function selectTopSkillEntries(skills, topCount = TOP_SKILL_COUNT) {
  const max = Math.max(Number.parseInt(topCount, 10) || 0, 0);
  if (!Array.isArray(skills) || max === 0) {
    return [];
  }

  const sorted = [...skills]
    .map((skill, index) => ({
      id: skill.id,
      index,
      stars: Number(skill?.stars) || 0,
      date: getDateScore(skill?.date_added),
    }))
    .filter((item) => Boolean(item.id))
    .sort((a, b) => {
      if (a.stars !== b.stars) return b.stars - a.stars;
      if (a.date !== b.date) return b.date - a.date;

      const nameCompare = String(a.id).localeCompare(String(b.id), undefined, { sensitivity: 'base' });
      if (nameCompare !== 0) return nameCompare;

      return a.index - b.index;
    })
    .slice(0, max);

  const dedupedEntries = [];
  const seen = new Set();

  for (const item of sorted) {
    if (!item.id || seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    dedupedEntries.push(`/skill/${normalizeSkillId(item.id)}`);
    if (dedupedEntries.length >= max) {
      break;
    }
  }

  return dedupedEntries;
}

export function getSeoLandingPaths() {
  if (!fs.existsSync(SEO_LANDING_PAGES_JSON)) {
    return [];
  }

  const raw = fs.readFileSync(SEO_LANDING_PAGES_JSON, 'utf-8');
  const pages = JSON.parse(raw);

  if (!Array.isArray(pages)) {
    return [];
  }

  return pages
    .map((page) => String(page?.slug || '').trim())
    .filter(Boolean)
    .map((slug) => `/topics/${encodeURIComponent(slug)}`);
}

export function generateSitemapXml({ baseUrl, paths, lastmod = DEFAULT_LASTMOD }) {
  const normalizedBase = String(baseUrl).replace(/\/$/, '');
  const uniquePaths = [...new Set(paths)];

  const urlsXml = uniquePaths
    .map((pathName) => {
      const href = `${normalizedBase}${pathName}`;
      return `  <url>\n    <loc>${escapeXml(href)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${pathName === '/' ? 'daily' : 'weekly'}</changefreq>\n    <priority>${pathName === '/' ? '1.0' : '0.7'}</priority>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlsXml}\n</urlset>\n`;
}

function readSkillsCatalog() {
  if (!fs.existsSync(SKILLS_JSON)) {
    throw new Error(`Skills catalog not found at ${SKILLS_JSON}`);
  }

  const raw = fs.readFileSync(SKILLS_JSON, 'utf-8');
  return JSON.parse(raw);
}

export function buildSitemap(skills, topCount = TOP_SKILL_COUNT, baseUrl = SITE_URL) {
  const topSkillPaths = selectTopSkillEntries(skills, topCount);
  const landingPaths = getSeoLandingPaths();
  return generateSitemapXml({
    baseUrl,
    paths: ['/', '/plugins', ...landingPaths, ...topSkillPaths],
  });
}

function writeSitemap() {
  const skills = readSkillsCatalog();
  const xml = buildSitemap(skills, getTopSkillCount(), SITE_URL);
  fs.writeFileSync(OUTPUT_PATH, xml, 'utf-8');
  console.log(`sitemap.xml generated at ${OUTPUT_PATH}`);
}

if (process.argv[1] && process.argv[1].endsWith('generate-sitemap.js')) {
  writeSitemap();
}
