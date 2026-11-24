import type { BrowserContext } from 'playwright';
import type { AuthConfig } from './config.js';
import { registerSecret, UiDiffError } from './log.js';

/**
 * Credentials for protected preview deployments (e.g. Vercel Deployment Protection).
 *
 * Values only ever come from environment variables, are registered for log redaction, and are
 * attached only to requests whose origin is allow-listed, so third-party requests made by the page
 * (fonts, analytics, CDNs) never see them. URLs carrying bypass tokens or share links are refused.
 */

export interface ResolvedAuth {
  headers: Record<string, string>;
  cookies: Array<{ name: string; value: string; domain?: string; path: string }>;
  origins: string[];
}

const SENSITIVE_PARAMS = [
  'x-vercel-protection-bypass',
  'x-vercel-set-bypass-cookie',
  '_vercel_share',
  '_vercel_jwt',
  'vercel-share',
  'token',
  'access_token',
  'id_token',
  'auth',
  'jwt',
  'secret',
  'password',
  'passwd',
  'sig',
  'signature',
  'key',
  'api_key',
  'apikey',
  'x-amz-signature',
  'x-goog-signature',
];

export function sensitiveParams(url: URL): string[] {
  return [...url.searchParams.keys()].filter((k) => SENSITIVE_PARAMS.includes(k.toLowerCase()));
}

/** Throws when a preview URL embeds credentials, bypass tokens or share-link tokens. */
export function assertSafePreviewUrl(raw: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UiDiffError(`${label} is not a valid URL`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new UiDiffError(`${label} must be an http(s) URL`);
  const hint =
    'Pass credentials through auth.headers / auth.cookies (values read from environment variables). ui-diff never uses bypass links, share links or tokens in URLs, because URLs end up in logs and PR comments.';
  if (url.username || url.password) throw new UiDiffError(`${label} contains embedded credentials`, { hint });
  const bad = sensitiveParams(url);
  if (bad.length) throw new UiDiffError(`${label} contains a token-like query parameter (${bad.join(', ')})`, { hint });
  return url;
}

/** Removes userinfo and token-like query params; used for anything that is displayed or stored. */
export function sanitizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.username = '';
    url.password = '';
    for (const key of sensitiveParams(url)) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return raw;
  }
}

export function resolveAuth(cfg: AuthConfig | undefined, previewUrls: string[], env: NodeJS.ProcessEnv = process.env): ResolvedAuth | undefined {
  if (!cfg || (cfg.headers.length === 0 && cfg.cookies.length === 0)) return undefined;
  const read = (name: string, what: string): string => {
    const value = env[name];
    if (!value) {
      throw new UiDiffError(`Environment variable ${name} is not set (needed for ${what})`, {
        hint: 'Export it in your shell or CI secrets. Values are never read from the config file.',
      });
    }
    registerSecret(value);
    return value;
  };
  const headers: Record<string, string> = {};
  for (const h of cfg.headers) headers[h.name.toLowerCase()] = `${h.prefix ?? ''}${read(h.env, `header ${h.name}`)}`;
  const cookies = cfg.cookies.map((c) => ({ name: c.name, value: read(c.env, `cookie ${c.name}`), domain: c.domain, path: c.path }));
  const origins = (cfg.origins ?? previewUrls).map((u) => {
    try {
      return new URL(u).origin;
    } catch {
      throw new UiDiffError(`auth.origins entry is not a URL: ${u}`);
    }
  });
  if (origins.length === 0) {
    throw new UiDiffError('auth is configured but there is no preview URL or auth.origins to scope it to', {
      hint: 'Credentials are only sent to explicit origins. Set preview.base/preview.head, --base-url/--head-url or auth.origins.',
    });
  }
  return { headers, cookies, origins: [...new Set(origins)] };
}

export function isCredentialOrigin(requestUrl: string, origins: string[]): boolean {
  try {
    return origins.includes(new URL(requestUrl).origin);
  } catch {
    return false;
  }
}

export async function applyAuth(context: BrowserContext, auth: ResolvedAuth | undefined): Promise<void> {
  if (!auth) return;
  if (auth.cookies.length) {
    const cookies = auth.cookies.flatMap((c) =>
      c.domain
        ? [{ name: c.name, value: c.value, domain: c.domain, path: c.path, secure: true, httpOnly: true, sameSite: 'Lax' as const }]
        : auth.origins.map((origin) => ({
            name: c.name,
            value: c.value,
            domain: new URL(origin).hostname,
            path: c.path,
            secure: origin.startsWith('https:'),
            httpOnly: true,
            sameSite: 'Lax' as const,
          })),
    );
    await context.addCookies(cookies);
  }
  if (Object.keys(auth.headers).length) {
    await context.route('**/*', async (route) => {
      const request = route.request();
      if (!isCredentialOrigin(request.url(), auth.origins)) {
        await route.fallback();
        return;
      }
      await route.continue({ headers: { ...request.headers(), ...auth.headers } });
    });
  }
}
