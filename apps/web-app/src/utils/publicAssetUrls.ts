export interface PublicAssetUrlInput {
  baseUrl: string;
  origin: string;
  pathname: string;
  documentBaseUrl?: string;
}

export type SkillsIndexUrlInput = PublicAssetUrlInput;

export interface SkillMarkdownUrlInput extends PublicAssetUrlInput {
  skillPath: string;
}

function stripLeadingSlashes(path: string): string {
  return path.replace(/^\/+/, '');
}

function decodePathSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

function normalizeSkillsAssetPath(assetPath: string): string | null {
  const normalized = assetPath
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/SKILL\.md$/i, '');

  if (/^[a-z][a-z0-9+.-]*:/i.test(normalized) || normalized.startsWith('//')) {
    return null;
  }

  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0 || segments[0] !== 'skills') {
    return null;
  }

  for (const segment of segments) {
    const decoded = decodePathSegment(segment);
    if (
      decoded === null
      || decoded === '.'
      || decoded === '..'
      || decoded.includes('/')
      || decoded.includes('\\')
      || decoded.includes('\0')
    ) {
      return null;
    }
  }

  return segments.join('/');
}

function normalizePathname(pathname: string): string {
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

function getResolvedDocumentBaseUrl({
  baseUrl,
  origin,
  documentBaseUrl,
}: Pick<PublicAssetUrlInput, 'baseUrl' | 'origin' | 'documentBaseUrl'>): URL {
  if (documentBaseUrl) {
    return new URL(documentBaseUrl);
  }

  return new URL(normalizeBasePath(baseUrl), origin);
}

function getPathCandidateUrls(pathname: string, assetPath: string, origin: string): string[] {
  const pathSegments = normalizePathname(pathname).split('/').filter(Boolean);

  return pathSegments.map((_, index) => {
    const prefix = `/${pathSegments.slice(0, index + 1).join('/')}/`;
    return `${origin}${prefix}${assetPath}`;
  });
}

function uniqueUrls(urls: string[]): string[] {
  return Array.from(new Set(urls));
}

function appendBackupCandidates(urls: string[]): string[] {
  const candidates = new Set<string>();

  urls.forEach((url) => {
    candidates.add(url);

    if (url.endsWith('skills.json')) {
      candidates.add(`${url}.backup`);
    }
  });

  return Array.from(candidates);
}

export function normalizeBasePath(baseUrl: string): string {
  const normalizedSegments = baseUrl
    .trim()
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.');

  const normalizedPath = normalizedSegments.length > 0
    ? `/${normalizedSegments.join('/')}`
    : '/';

  return normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`;
}

export function getAbsolutePublicAssetUrl(
  assetPath: string,
  {
    baseUrl,
    origin,
  }: Pick<PublicAssetUrlInput, 'baseUrl' | 'origin'>,
): string {
  const resolvedAssetPath = stripLeadingSlashes(assetPath.trim());
  return new URL(resolvedAssetPath || '.', new URL(normalizeBasePath(baseUrl), origin)).href;
}

export function getSkillsIndexCandidateUrls({
  baseUrl,
  origin,
  pathname,
  documentBaseUrl,
}: SkillsIndexUrlInput): string[] {
  const assetPath = 'skills.json';

  return appendBackupCandidates(uniqueUrls([
    new URL(assetPath, getResolvedDocumentBaseUrl({ baseUrl, origin, documentBaseUrl })).href,
    new URL(assetPath, new URL(normalizeBasePath(baseUrl), origin)).href,
    `${origin}/${assetPath}`,
    ...getPathCandidateUrls(pathname, assetPath, origin),
  ]));
}

export function getSkillMarkdownCandidateUrls({
  baseUrl,
  origin,
  pathname,
  documentBaseUrl,
  skillPath,
}: SkillMarkdownUrlInput): string[] {
  const normalizedSkillPath = normalizeSkillsAssetPath(skillPath);
  if (!normalizedSkillPath) {
    return [];
  }

  const assetPath = `${normalizedSkillPath}/SKILL.md`;

  return uniqueUrls([
    new URL(assetPath, getResolvedDocumentBaseUrl({ baseUrl, origin, documentBaseUrl })).href,
    new URL(assetPath, new URL(normalizeBasePath(baseUrl), origin)).href,
    `${origin}/${assetPath}`,
    ...getPathCandidateUrls(pathname, assetPath, origin),
  ]);
}
