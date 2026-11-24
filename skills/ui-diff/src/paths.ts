import { realpathSync } from 'node:fs';

/** Physical path (symlinks resolved; on macOS /tmp and /var point into /private) so paths compare correctly; unchanged when missing. */
export function realpathIfExists(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}
