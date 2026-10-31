const repository = 'https://github.com/sickn33/agentic-awesome-skills';

function hasControlCharacters(value) {
  return Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
}

/** Resolve repository files within the same release, never against the Pages base. */
export function releaseFileUrl(path, from = '', image = false, version = '') {
  const releaseRoot = `${repository}/blob/v${version}/`;
  if (!path || path.includes('\\') || hasControlCharacters(path) || path.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(path)) return '';
  try {
    const url = new URL(path, `${releaseRoot}${from}`);
    if (!url.href.startsWith(releaseRoot)) return '';
    // Reject encoded separators and nested encodings before the hosting service decodes them.
    for (const segment of url.pathname.split('/')) {
      const decoded = decodeURIComponent(segment);
      if (/[\\/%]/.test(decoded) || hasControlCharacters(decoded)) return '';
    }
    url.search = '';
    if (image) return url.href.replace(`${repository}/blob/`, 'https://raw.githubusercontent.com/sickn33/agentic-awesome-skills/');
    return url.href;
  } catch {
    return '';
  }
}

export function skillSourcePath(path) {
  const normalized = path.startsWith('skills/') ? path : `skills/${path}`;
  if (!/^skills\/[a-z0-9_-]+(?:\/[a-z0-9_-]+)*(?:\/SKILL\.md)?$/.test(normalized)) return '';
  return normalized.endsWith('/SKILL.md') ? normalized : `${normalized}/SKILL.md`;
}
