import { version } from '../../../../package.json';

import { releaseFileUrl as resolveReleaseFileUrl, skillSourcePath } from './releaseLinks.js';
export const catalogVersion = version;
export { skillSourcePath };

export function releaseFileUrl(path: string, from = '', image = false): string {
  return resolveReleaseFileUrl(path, from, image, version);
}

export function skillBundleUrl(path: string): string {
  const source = skillSourcePath(path);
  return source ? releaseFileUrl(source).replace('/blob/', '/tree/').replace(/\/SKILL\.md$/, '') : '';
}
