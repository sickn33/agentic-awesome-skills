#!/usr/bin/env node
/** Webly agent helper: anonymous deploys, local state for new sessions, and MCP setup. Zero dependencies. */
import { mkdir, readFile, writeFile, readdir, open, link, unlink, lstat, stat, rm, rename, realpath } from 'node:fs/promises';
import * as fs from 'node:fs';
import { createReadStream, realpathSync } from 'node:fs';
import { isUtf8 } from 'node:buffer';
import { spawn, spawnSync } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { resolve4, resolveCname } from 'node:dns/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Skill release. scripts/sync-plugin.sh stamps this into the plugin manifests; bump it to ship. */
export const VERSION = '0.14.5';
// The published plugin manifest is what `npx skills`, install.sh and /plugin install all read from.
const LATEST_URL = process.env.WEBLY_VERSION_URL ?? 'https://raw.githubusercontent.com/Webly-AI/webly-plugin/main/plugins/webly/.claude-plugin/plugin.json';
const CREDENTIAL_FILE = process.env.WEBLY_STATE_FILE || join(homedir(), '.webly', 'state.json');
// Where releases before 0.4.0 saved the token; moved to CREDENTIAL_FILE on first read.
const LEGACY_FILE = process.env.WEBLY_STATE_FILE ? null : join(homedir(), '.webly', 'anonymous-credential');
const PENDING_FILE = join(dirname(CREDENTIAL_FILE), 'pending');
// The last VERSION that ran here, so the first run after an update can say so.
const SEEN_FILE = join(dirname(CREDENTIAL_FILE), 'version');
// The head version each site was at after this machine last deployed it: { websiteId: version }.
const DEPLOYS_FILE = join(dirname(CREDENTIAL_FILE), 'deploys.json');
// `webly login`: this machine's OAuth client and refresh token for one API, { api, clientId, refreshToken, accessToken, expiresAt }.
const LOGIN_FILE = join(dirname(CREDENTIAL_FILE), 'login.json');
const PLUGIN_MARKETPLACE = 'Webly-AI/webly-plugin';
// The only server answers that mean the saved secret can never be used again.
const SPENT = new Set(['credential_consumed', 'credential_expired']);
// Mirrors the server's anonymous limits so a too-big folder fails before any request.
const MAX_FILES = 25, MAX_FILE_BYTES = 1024 * 1024, MAX_TOTAL_BYTES = 5 * 1024 * 1024;
// And its limits for a deploy ticket (signed-in static sites): MAX_SOURCE_FILES and MAX_TICKET_DEPLOY_BYTES.
const MAX_TICKET_FILES = 2000, MAX_TICKET_BYTES = 100 * 1024 * 1024;
const TOKEN = /^wa_[A-Za-z0-9_-]{43}$/;

const USAGE = `Usage: webly.mjs <command>
  doctor [--brief]            Saved site, MCP setup and pending step on this machine (never creates anything)
  deploy <dir|file|payload.json> [--name N] [--to E] [--anonymous]
                              Publish the folder to the site it is linked to in .webly/project.json (entry E, default
                              "default"). Unlinked, it updates this machine's anonymous site or creates one, then links the
                              folder. Refuses, without publishing, when the linked site is in an account (begin_deploy over
                              MCP, then --ticket), when the folder is unlinked but this machine is connected to an account (link it first;
                              --anonymous publishes a throwaway site anyway, never over this machine's existing one;
                              replace --anonymous discards that). Edits made to the site elsewhere since this
                              machine's last deploy are replaced and reported as "replaced". A project with a package.json
                              build script is built first and its output folder deployed.
  deploy <dir|file> --ticket T [--message M] [--to E] [--force]
                              Signed in: upload the folder to a static site with the ticket from the begin_deploy MCP tool
                              (5 minutes, one deploy). Makes a draft; publish_website after the person approves. --message
                              says what changed in one line ("Button reads Start here"); the site's History shows it. Up to 2000
                              files; those up to 1 MiB go in one request of up to 100 MiB, bigger ones (images, video)
                              straight to storage, up to the plan's per-file limit and counted toward its storage. Refuses (would_revert) if it would undo changes made to the
                              site since this folder's last deploy, or (with no earlier deploy from here) would remove files the folder
                              lacks (would_remove); --force does it anyway, only with the person's OK. In a clone of the
                              site's git mirror, files in .webly/media.json are kept and the base comes from git history
  link <websiteId> [--as E]   Link the project in this folder to a site (entry E, default "default") in .webly/project.json
  replace <dir|file|payload.json> [--name N]  Swap the site for a new one with a new URL (first 24 hours only); relinks the folder
  upload <file|dir>... [--folder F] [--name N]   Share files without an account: one link per file plus a folder
                              link with Download all (.zip). Folders keep their subfolders and hidden files; over 500
                              files they go up as one zip, served as a folder. Works beside the website;
                              500 MiB in total per token, website included. Live and claimable for 24 hours.
  status                      The saved site's status, URLs, deadlines and next step
  claim <code>                Claim the saved site with a code from the create_claim_code MCP tool (the secret never leaves this helper)
  claim-link [--open]         Open (or print) the page that claims the site into an account
  connect claude|codex        Register the Webly MCP server for this agent host, at user scope
  pending set <intent> | clear   Remember a step to finish after a restart (e.g. claim)
  domain-watch <hostname> [--timeout MIN]   Wait for a custom domain to go live: prints each step (dns, https, live),
                              exits 0 once Webly serves it over HTTPS, 1 after the timeout (default 120). Run it in the background
  login                       Sign in in the browser so \`webly api\` can call the REST API for the person. They pick All my
                              workspaces or one, and an access level, as when connecting MCP. Saved to ~/.webly/login.json (0600)
  api <METHOD> <path> [--workspace W] [--data JSON|@file]
                              Call /v1<path> as the signed-in person and print the JSON (the token never leaves this helper).
                              --workspace names the workspace (slug) for workspace-wide calls; GET /workspaces lists them
  logout                      Revoke the sign-in and delete ~/.webly/login.json
  forget                      Delete the saved token only after the API confirms it is spent
  init                        Create the token without deploying

Env: WEBLY_API_URL (default https://api.webly.ai), WEBLY_STATE_FILE (default ~/.webly/state.json)`;

/**
 * One look at a custom domain from this machine, no credentials needed:
 * 'dns' (no record yet), 'https' (DNS resolves, Webly not serving it over HTTPS yet) or 'live'.
 */
export async function domainStage(host, fetchImpl = fetch) {
  let target;
  try { target = (await resolveCname(host))[0]; }
  catch { try { target = (await resolve4(host))[0]; } catch { return { stage: 'dns', detail: 'no DNS record found yet' }; } }
  try {
    // Judge only this host's own answer: a redirect elsewhere (say, an old host pointing at a
    // Webly site) must not count. Webly's own redirects (canonical 308) carry the header too.
    const response = await fetchImpl(`https://${host}/`, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    if (response.headers.has('x-webly-version')) return { stage: 'live', detail: `https://${host}` };
    const moved = response.status >= 300 && response.status < 400 ? `, redirecting to ${response.headers.get('location')}` : '';
    return { stage: 'https', detail: `DNS points to ${target}, but Webly is not serving it yet (HTTP ${response.status}${moved}); the certificate may still be issuing, or the site is not published` };
  } catch { return { stage: 'https', detail: `DNS points to ${target}; waiting for the HTTPS certificate` }; }
}

/** Delete the saved secret only if it still holds this token, so a newer one saved by a parallel run survives. */
export async function forgetCredential(token, file = CREDENTIAL_FILE) {
  try {
    if (JSON.parse(await readFile(file, 'utf8')).token !== token) return false;
    await unlink(file);
    return true;
  } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

/** The saved token, or null when there is none. Throws if the file is unsafe or for another API. */
export async function savedCredential(api, file = CREDENTIAL_FILE, legacy = file === CREDENTIAL_FILE ? LEGACY_FILE : null) {
  let info;
  try { info = await lstat(file); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if (!legacy) return null;
    // No-replace move, so a racing run or a newer state.json is never overwritten.
    let linked = true;
    try { await link(legacy, file); } catch (e) { if (e.code === 'ENOENT') return null; if (e.code !== 'EEXIST') throw e; linked = false; }
    // A legacy copy left behind would bring the token back after `forget`, so undo our link and fail instead.
    try { await unlink(legacy); } catch (e) { if (e.code !== 'ENOENT') { if (linked) await unlink(file).catch(() => {}); throw e; } }
    return savedCredential(api, file, null);
  }
  if (!info.isFile() || (process.platform !== 'win32' && (info.mode & 0o077))) throw new Error('Credential must be a regular file with mode 0600');
  const saved = JSON.parse(await readFile(file, 'utf8'));
  if (saved.api !== api) throw new Error('Saved credential belongs to another API origin');
  if (!TOKEN.test(saved.token)) throw new Error('Invalid saved credential');
  return saved.token;
}

export async function localCredential(api, file = CREDENTIAL_FILE) {
  const existing = await savedCredential(api, file);
  if (existing) return existing;
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const response = await fetch(`${api}/public/v1/anonymous/credentials`, { method: 'POST', redirect: 'error' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Credential issuance failed');
  if (!TOKEN.test(result.token)) throw new Error('Server returned an invalid credential');
  const temporary = `${file}.${randomUUID()}.tmp`;
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(JSON.stringify({ api, token: result.token }) + '\n');
    await handle.sync();
  } finally { await handle.close(); }
  try {
    // Atomic, no-replace publication. Racing processes all read the winning file.
    await link(temporary, file);
  } catch (error) { if (error.code !== 'EEXIST') throw error; }
  finally { await unlink(temporary); }
  return savedCredential(api, file);
}

// Folder names that say nothing about the site; the project around them names it instead.
const GENERIC_DIRS = new Set(['dist', 'build', 'out', 'public', 'site', 'www', '_site', 'output']);
// Names that would leave the person with a site called "dist" on their dashboard and claim page.
export const isGenericName = (name) => GENERIC_DIRS.has(name.toLowerCase()) || ['index', 'src', 'app', 'web', 'website', 'html', 'tmp', 'temp', 'untitled', 'new folder'].includes(name.toLowerCase());
const BUILD_OUTPUTS = ['dist', 'build', 'out', '_site', 'public'];

/** A project folder with a build script is built, and its output folder is what gets deployed. Otherwise the target itself. */
export async function buildIfProject(target, runner = run) {
  const pkg = await readJson(join(target, 'package.json'));
  if (!pkg?.scripts?.build) return target;
  const pm = await stat(join(target, 'pnpm-lock.yaml')).then(() => 'pnpm', () => stat(join(target, 'yarn.lock')).then(() => 'yarn', () => 'npm'));
  // Output folders only count if this build wrote them; an old dist/ or a source template must not be deployed.
  const started = Date.now() - 2000; // slack for coarse filesystem timestamps
  const steps = [];
  if (!await stat(join(target, 'node_modules')).catch(() => null)) steps.push([pm, ['install']]);
  steps.push([pm, ['run', 'build']]);
  for (const [cmd, args] of steps) {
    console.error(`Webly: running \`${cmd} ${args.join(' ')}\` in ${target}`);
    const result = runner(cmd, args, target);
    if (!result.ok) throw new Error(`\`${cmd} ${args.join(' ')}\` failed:\n${result.output.slice(-2000)}`);
  }
  const fresh = [];
  for (const dir of BUILD_OUTPUTS) {
    const info = await stat(join(target, dir, 'index.html')).catch(() => null);
    if (info && info.mtimeMs >= started) fresh.push(join(target, dir));
  }
  if (fresh.length === 1) { console.error(`Webly: deploying the build output ${fresh[0]}`); return fresh[0]; }
  if (fresh.length > 1) throw new Error(`The build wrote index.html to more than one folder (${fresh.join(', ')}). Run deploy on the output folder you mean.`);
  throw new Error(`Built, but no index.html was written to ${BUILD_OUTPUTS.join('/, ')}/ by this build. Run deploy on the output folder.`);
}

/** The site name: --name, else package.json "name", else the folder, skipping generic ones like dist. */
export async function siteName(target, isFile) {
  if (isFile) return basename(target, extname(target));
  let dir = resolve(target);
  for (let i = 0; i < 2; i++, dir = dirname(dir)) {
    const name = (await readJson(join(dir, 'package.json')))?.name?.replace(/^@[^/]+\//, '');
    if (name) return name;
    if (!GENERIC_DIRS.has(basename(dir))) return basename(dir);
  }
  return basename(resolve(target));
}

/** The files a site is published from, sorted: a single file, or a folder without hidden entries and node_modules. */
async function siteFiles(target, info) {
  const found = [];
  if (info.isFile()) {
    found.push({ path: extname(target) === '.html' ? '/index.html' : `/${basename(target)}`, abs: target });
  } else {
    const walk = async (dir) => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const abs = join(dir, entry.name);
        if (entry.isDirectory()) await walk(abs);
        else if (entry.isFile()) found.push({ path: '/' + relative(target, abs).split(sep).join('/'), abs });
      }
    };
    await walk(target);
  }
  if (!found.length) throw new Error(`No files to publish in ${target}`);
  return found.sort((a, b) => a.path.localeCompare(b.path));
}

/** A deploy ticket's site and head version. It is signed, not encrypted, so the claims are readable. */
export function ticketClaims(ticket) {
  const m = /^wd_([A-Za-z0-9_-]+)\.\d+\.[A-Za-z0-9_-]+$/.exec(ticket ?? '');
  try { const claims = m && JSON.parse(Buffer.from(m[1], 'base64url').toString()); if (typeof claims?.websiteId === 'string') return claims; } catch {}
  throw new Error('That is not a deploy ticket: pass the `ticket` that begin_deploy returned (wd_…).');
}

/**
 * In a git-mirror clone of the site (a remote names its websiteId), the Webly version the checkout
 * was written from: the newest Webly-Version trailer in its history. Null anywhere else or without git.
 */
export function mirrorVersion(dir, websiteId, runner = run) {
  const remotes = runner('git', ['remote', '-v'], dir);
  if (!remotes.ok) return null;
  const name = remotes.output.split('\n').map((l) => l.split(/\s+/)).find(([, url]) => new RegExp(`/${websiteId}(\\.git)?$`).test(url ?? ''))?.[0];
  if (!name) return null;
  // Only history this checkout shares with the site's mirror: another branch's trailers aren't this site's versions.
  const shared = runner('git', ['merge-base', 'HEAD', `refs/remotes/${name}/main`], dir);
  if (!shared.ok) return null;
  const log = runner('git', ['log', '-n', '500', '--format=%(trailers:key=Webly-Version,valueonly)', shared.output.trim()], dir);
  const version = log.ok ? Number(log.output.split('\n').find((line) => line.trim())) : NaN;
  return Number.isInteger(version) && version > 0 ? version : null;
}

/**
 * The files a git-mirror clone lists in .webly/media.json instead of committing (images, video), as
 * `uploaded` entries: the site already stores them, so the deploy keeps them without sending bytes.
 * A file at that path in the folder being deployed (`deployed`, e.g. the build output) wins.
 */
export async function mirrorMedia(dir, deployed = dir) {
  const media = await readJson(join(dir, '.webly', 'media.json'));
  if (!media || typeof media !== 'object' || Array.isArray(media)) return [];
  const out = [];
  for (const [path, f] of Object.entries(media)) {
    if (typeof f?.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(f.sha256) || !Number.isInteger(f.size) || f.size < 1) continue;
    if (await stat(join(deployed, ...path.split('/'))).catch(() => null)) continue;
    out.push({ path: '/' + path.replace(/^\/+/, ''), size: f.size, sha256: f.sha256, ...(typeof f.contentType === 'string' && { contentType: f.contentType }) });
  }
  return out;
}

/** A file's SHA-256 in hex, read in chunks so a large video never sits in memory. */
const sha256Of = (abs, range = {}) => new Promise((ok, fail) => {
  const hash = createHash('sha256');
  createReadStream(abs, range).on('data', (chunk) => hash.update(chunk)).on('error', fail).on('end', () => ok(hash.digest('hex')));
});

/** What a file over SITE_PART_SIZE goes up in: each part's SHA-256, and the file's fingerprint (the SHA-256 of those digests). */
const SITE_PART_SIZE = 100 * 1024 * 1024;
async function fingerprint(abs, size) {
  if (size <= SITE_PART_SIZE) return { sha256: await sha256Of(abs) };
  const partSha256 = [];
  for (let at = 0; at < size; at += SITE_PART_SIZE) partSha256.push(await sha256Of(abs, { start: at, end: Math.min(at + SITE_PART_SIZE, size) - 1 }));
  return { sha256: createHash('sha256').update(Buffer.concat(partSha256.map((h) => Buffer.from(h, 'hex')))).digest('hex'), partSha256 };
}

/**
 * The multipart upload for a signed-in static site, under the server's limits: MAX_TICKET_FILES
 * files and MAX_TICKET_BYTES in all. Files over 1 MiB (images, video) aren't in it: they're
 * returned as `large` to go straight to storage (uploadLarge). Over a limit, nothing is sent.
 */
export async function ticketForm(target, fields = {}) {
  const info = await stat(target);
  const found = await siteFiles(target, info);
  if (found.length > MAX_TICKET_FILES) throw new Error(`${found.length} files found; a deploy takes at most ${MAX_TICKET_FILES}. Nothing was sent.`);
  const form = new FormData();
  const large = [];
  // Each part's multipart header counts too: the server caps the whole request.
  let total = 0;
  for (const { path, abs } of found) {
    const { size } = await stat(abs);
    if (size > MAX_FILE_BYTES) { large.push({ path, abs, size, ...await fingerprint(abs, size) }); continue; }
    const bytes = await readFile(abs);
    total += bytes.length + path.length + 256;
    if (total > MAX_TICKET_BYTES) throw new Error(`The files add up to more than ${MAX_TICKET_BYTES / 1024 / 1024} MiB, the per-deploy limit. Nothing was sent.`);
    // No type: the server sets it from the path.
    form.append('files', new Blob([bytes]), path.slice(1));
  }
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) form.append(key, String(value));
  return { form, count: found.length, large };
}

/**
 * Files over 1 MiB go straight to storage: the server counts them toward the plan (or refuses,
 * before any byte moves), returns an upload URL for each it doesn't already have, and a ticket
 * that outlasts the uploads. Returns that ticket and the `uploaded` list for the deploy.
 */
async function uploadLarge(base, ticket, large) {
  const response = await fetch(`${base}/public/v1/deploys/uploads`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(120_000),
    headers: { Authorization: `Bearer ${ticket}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: large.map(({ path, size, sha256, partSha256 }) => ({ path, size, sha256, ...(partSha256 && { partSha256 }) })) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const d = result.details ?? {};
    if (response.status === 401) throw new Error('Not deployed: the ticket is invalid or expired (they last 5 minutes and work once). Get a new one with begin_deploy and run this again straight away.');
    if (d.reason === 'storage_limit') throw new Error(`Not deployed: ${result.message}`);
    if (d.reason === 'file_too_large') throw new Error(`Not deployed: ${d.file} is larger than this plan's ${Math.floor(d.limit / 1024 / 1024)} MiB per-file limit. Nothing was sent.`);
    throw new Error(`Not deployed: ${result.message || `request failed (${response.status})`}${d.reason ? ` [${d.reason}]` : ''}`);
  }
  const byPath = new Map(large.map((f) => [f.path.replace(/^\/+/, ''), f]));
  // Node < 19.8 has no fs.openAsBlob: read just that range into memory (at most one 100 MiB part).
  const fileBlob = async (abs, start = 0, size) => {
    if (fs.openAsBlob) return (await fs.openAsBlob(abs)).slice(start, size === undefined ? undefined : start + size);
    const fh = await open(abs);
    try {
      const buf = Buffer.alloc(size ?? (await fh.stat()).size);
      const { bytesRead } = await fh.read(buf, 0, buf.length, start);
      return new Blob([buf.subarray(0, bytesRead)]);
    } finally { await fh.close(); }
  };
  // One PUT per file, or per part for files over 100 MiB (only the parts R2 doesn't have yet, so a rerun resumes).
  const jobs = [];
  for (const { path, upload, parts, partSize } of result.files) {
    const file = byPath.get(path.replace(/^\/+/, ''));
    if (upload) jobs.push({ label: path, url: upload.url, headers: Object.fromEntries(Object.entries(upload.headers).filter(([k]) => k.toLowerCase() !== 'content-length')), body: () => fileBlob(file.abs) });
    for (const part of parts ?? []) {
      const start = (part.partNumber - 1) * partSize;
      // Each part's checksum header: storage refuses bytes that don't match it.
      jobs.push({ label: `${path} (part ${part.partNumber})`, url: part.url, headers: part.headers ?? {}, body: () => fileBlob(file.abs, start, part.size) });
    }
  }
  // Two at a time, and each one retried on its own: connection resets happen on big uploads.
  const putOne = async (job) => {
    for (let attempt = 1; ; attempt++) {
      const put = await fetch(job.url, { method: 'PUT', headers: job.headers, body: await job.body() }).catch((error) => ({ ok: false, status: error.message }));
      if (put.ok) return;
      // Network errors, timeouts, rate limits and 5xx pass; a 4xx (expired URL, bad signature, hash mismatch) won't.
      const transient = typeof put.status !== 'number' || put.status === 408 || put.status === 429 || put.status >= 500;
      if (attempt === 3 || !transient) throw new Error(`Not deployed: uploading ${job.label} failed (${put.status}). Run the deploy again with a new ticket from begin_deploy; what already uploaded won't be sent again.`);
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  };
  for (let i = 0; i < jobs.length; i += 2) await Promise.all(jobs.slice(i, i + 2).map(putOne));
  return { ticket: result.ticket, uploaded: result.files.map(({ path, size, hash }) => ({ path, size, sha256: hash })) };
}

/** A folder, a single file, or a ready-made payload.json becomes an anonymous site body. */
export async function payloadFrom(target, name) {
  const info = await stat(target);
  if (info.isFile() && extname(target) === '.json') {
    const payload = JSON.parse(await readFile(target, 'utf8'));
    return name === undefined ? payload : { ...payload, name };
  }
  const found = await siteFiles(target, info);
  if (found.length > MAX_FILES) throw new Error(`${found.length} files found; anonymous sites take at most ${MAX_FILES}. Publish a built output folder, or sign in for larger sites.`);
  let total = 0;
  const files = [];
  for (const { path, abs } of found) {
    const bytes = await readFile(abs);
    if (bytes.length > MAX_FILE_BYTES) throw new Error(`${path} is larger than 1 MiB, the anonymous per-file limit`);
    total += bytes.length;
    if (total > MAX_TOTAL_BYTES) throw new Error('The files add up to more than 5 MiB, the anonymous per-site limit');
    const text = !bytes.includes(0) && isUtf8(bytes);
    files.push(text ? { path, content: bytes.toString('utf8') } : { path, content: bytes.toString('base64'), encoding: 'base64' });
  }
  name ??= await siteName(target, info.isFile());
  return { name: name.slice(0, 200) || 'Website', kind: 'static', files };
}

async function readJson(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; }
}

/**
 * The project a deploy target belongs to: the nearest folder up with a package.json or .git, so the
 * link lives beside the source and not in a build output that gets wiped. Never above $HOME; a
 * target with neither is its own project.
 */
export async function projectRoot(target, home = homedir()) {
  // Real paths, so the HOME stop holds through symlinks (macOS's /var is /private/var).
  const real = (path) => realpath(path).catch(() => resolve(path));
  const start = await real(await stat(target).then(i => i.isDirectory(), () => false) ? target : dirname(target));
  const stop = await real(home);
  for (let dir = start; dir !== stop && dirname(dir) !== dir; dir = dirname(dir)) {
    for (const marker of ['package.json', '.git']) if (await stat(join(dir, marker)).catch(() => null)) return dir;
  }
  return start;
}

export const projectFile = (root) => join(root, '.webly', 'project.json');

/** The project's links, { sites: { entry: { websiteId, name?, url? } } }. A file it can't read is an error, never overwritten. */
export async function readProject(root) {
  const file = projectFile(root);
  let text;
  try { text = await readFile(file, 'utf8'); } catch (error) { if (error.code === 'ENOENT') return { sites: {} }; throw error; }
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
  if (!isObject(data) || (data.sites !== undefined && !(isObject(data.sites) && Object.values(data.sites).every(s => isObject(s) && typeof s.websiteId === 'string')))) {
    throw new Error(`${file} is not a Webly project file (expected {"sites": {"default": {"websiteId": "ws_…"}}}). It was left unchanged: fix or delete it.`);
  }
  return { ...data, sites: data.sites ?? {} };
}

/** Point one entry at a site. Other entries and keys this version doesn't know are kept. */
export async function writeProject(root, entry, site) {
  const data = await readProject(root);
  const previous = data.sites[entry];
  // Fields of a different site don't carry over to the new one.
  data.sites[entry] = previous?.websiteId === site.websiteId ? { ...previous, ...site } : site;
  const file = projectFile(root);
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(data, null, 2) + '\n');
  await rename(temporary, file);
  return file;
}

/** Remember the head version this machine left a site at, and from which project folder. Never fails. */
export async function recordDeploy(websiteId, version, path, file = DEPLOYS_FILE) {
  if (!Number.isInteger(version)) return;
  const all = (await readJson(file)) ?? {};
  all[websiteId] = { version, path };
  const temporary = `${file}.${randomUUID()}.tmp`;
  await mkdir(dirname(file), { recursive: true, mode: 0o700 })
    .then(() => writeFile(temporary, JSON.stringify(all) + '\n'))
    .then(() => rename(temporary, file))
    .catch(() => unlink(temporary).catch(() => {}));
}

/** The version and folder this machine last deployed a site from; releases before 0.8.0 saved a bare version number. */
export async function lastDeploy(websiteId, file = DEPLOYS_FILE) {
  const saved = (await readJson(file))?.[websiteId];
  if (Number.isInteger(saved)) return { version: saved, path: null };
  return Number.isInteger(saved?.version) ? { version: saved.version, path: saved.path ?? null } : null;
}

/** Where this machine's agent hosts have the Webly MCP server registered. Reads config files only. */
export async function mcpSetup(home = homedir()) {
  const claudeDir = process.env.CLAUDE_CONFIG_DIR || join(home, '.claude');
  const claudeJson = await readJson(process.env.CLAUDE_CONFIG_DIR ? join(claudeDir, '.claude.json') : join(home, '.claude.json'));
  const settings = await readJson(join(claudeDir, 'settings.json'));
  const plugin = Object.entries(settings?.enabledPlugins ?? {}).some(([id, on]) => on && id.startsWith('webly@'));
  const userServer = Boolean(claudeJson?.mcpServers?.webly);
  const projectServer = Boolean(claudeJson?.projects?.[process.cwd()]?.mcpServers?.webly);
  const codexToml = await readFile(join(process.env.CODEX_HOME || join(home, '.codex'), 'config.toml'), 'utf8').catch(() => '');
  return {
    claudeCode: { configured: plugin || userServer || projectServer, via: plugin ? 'plugin' : userServer ? 'user' : projectServer ? 'project' : null },
    codex: { configured: /^\s*\[mcp_servers\.webly\]/m.test(codexToml) },
  };
}

const newer = (a, b) => {
  const [x, y] = [a, b].map(v => String(v).split('.').map(Number));
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
};

/** A newer published skill, with the command that updates this install, or null. Never fails. */
export async function skillUpdate() {
  if (!LATEST_URL) return null;
  try {
    const latest = (await (await fetch(LATEST_URL, { signal: AbortSignal.timeout(3000) })).json()).version;
    if (!newer(latest, VERSION)) return null;
    const plugin = realpathSync(fileURLToPath(import.meta.url)).includes(`${sep}plugins${sep}`);
    return { installed: VERSION, latest, command: plugin
      ? 'claude plugin update webly@webly (then restart Claude Code or run /reload-plugins)'
      : 'npx skills update webly -g   (no npm: curl -fsSL https://webly.ai/install.sh | bash)' };  // # security-allowlist: curl-pipe-bash
  } catch { return null; }
}

/** The version this replaced if it is the first run since an update, else null. Records VERSION. Never fails. */
export async function justUpdated(file = SEEN_FILE) {
  const seen = (await readFile(file, 'utf8').catch(() => '')).trim();
  if (seen === VERSION) return null;
  await mkdir(dirname(file), { recursive: true, mode: 0o700 }).then(() => writeFile(file, VERSION + '\n')).catch(() => {});
  // ponytail: installs from before 0.4.1 have no file yet, so their first update is recorded silently.
  return seen && newer(VERSION, seen) ? seen : null;
}

async function api(base, path, token, { timeout = 30_000, ...init } = {}) {
  const response = await fetch(`${base}/public/v1/anonymous${path}`, {
    ...init, redirect: 'error', signal: AbortSignal.timeout(timeout), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return { ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) };
}

/** Status calls are what publish a finished build, so poll until it is live or has failed. */
async function settle(base, token, result) {
  for (let i = 0; i < 90 && result.status === 'building'; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const next = await api(base, '/sites/current', token);
    if (!next.ok) return result;
    result = next.body;
  }
  return result;
}

async function openInBrowser(url) {
  const [cmd, ...args] = process.env.WEBLY_OPEN_CMD ? [process.env.WEBLY_OPEN_CMD]
    : process.platform === 'darwin' ? ['open'] : process.platform === 'win32' ? ['cmd', '/c', 'start', '""'] : ['xdg-open'];
  await new Promise((resolve, reject) => {
    // cmd.exe parses the line: an unescaped & would end the command and drop the rest of the URL.
    const target = cmd === 'cmd' ? url.replace(/[&^]/g, '^$&') : url;
    const child = spawn(cmd, [...args, target], { stdio: 'ignore' });
    // Child-process errors and output can contain the secret URL. Only report
    // a fixed diagnostic, and keep the saved credential available for retry.
    const failed = () => reject(new Error('Could not open the claim page. Check your browser opener and retry; the saved token was kept.'));
    const timer = setTimeout(() => { child.kill(); failed(); }, 15_000);
    child.once('error', () => { clearTimeout(timer); failed(); });
    child.once('exit', code => { clearTimeout(timer); code === 0 ? resolve() : failed(); });
  });
}

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', timeout: 600_000, cwd, shell: process.platform === 'win32' });
  return { ok: result.status === 0, output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(), missing: result.error?.code === 'ENOENT' };
}

/**
 * Deploy a folder to a signed-in static site with a ticket from begin_deploy: the bytes go straight
 * to Webly from here, never through a tool call, and no API key is involved. The result is a draft.
 */
async function ticketDeploy(base, { command, argument, root, entryName, entry, ticket, force, message }) {
  if (command !== 'deploy') throw new Error(`--ticket works with deploy, not ${command}.`);
  const { websiteId } = ticketClaims(ticket);
  if (entry && entry.websiteId !== websiteId) {
    throw new Error(`Not deployed: the ticket is for ${websiteId}, but this folder is linked${entryName === 'default' ? '' : ` as "${entryName}"`} to ${entry.websiteId}${entry.name ? ` ("${entry.name}")` : ''} in ${projectFile(root)}. ` +
      `Call begin_deploy with websiteId ${entry.websiteId}, or, if the person wants this folder on the other site, \`webly link ${websiteId}\` first.`);
  }
  const isDir = await stat(argument).then(i => i.isDirectory(), () => false);
  const target = isDir ? await buildIfProject(argument) : argument;
  // The base is only meaningful for deploys from this same project folder, or from a mirror clone's own history.
  const last = await lastDeploy(websiteId);
  const mirrored = isDir ? mirrorVersion(target, websiteId) : null;
  const known = Math.max(last?.path === root ? last.version : 0, mirrored ?? 0) || undefined;
  const baseVersion = force ? undefined : known;
  const { headVersion } = ticketClaims(ticket);
  const pull = mirrored ? ' This folder is a git clone of the site: `git pull` brings in the newer versions, then deploy again.' : '';
  if (mirrored && (known ?? 0) < headVersion) console.error(`Webly: this clone is at version ${known}, the site at ${headVersion}.${pull}`);
  // media.json sits at the clone's root even when the build output (dist/) is what gets deployed.
  const media = isDir ? await mirrorMedia(argument, target) : [];
  const { form, count, large } = await ticketForm(target, { baseVersion, force: force || undefined, message: message || undefined });
  let deployTicket = ticket;
  const uploaded = [...media];
  if (large.length) {
    const sent = await uploadLarge(base, ticket, large);
    deployTicket = sent.ticket;
    uploaded.push(...sent.uploaded);
  }
  if (uploaded.length) form.append('uploaded', JSON.stringify(uploaded));
  const response = await fetch(`${base}/public/v1/deploys`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(120_000),
    headers: { Authorization: `Bearer ${deployTicket}` }, body: form,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const d = result.details ?? {};
    if (d.reason === 'would_revert') {
      throw new Error(`Not deployed: this would undo changes made to the site since this folder last deployed it (version ${d.baseVersion}, now ${d.headVersion}): ${(d.paths ?? []).join(', ')}. ` +
        'Read the live files with read_source_files, merge those changes into the local project, rebuild, then get a new ticket with begin_deploy and deploy again. ' +
        `Or tell the person what would be undone and, only with their OK, deploy again with a new ticket and --force (earlier versions are kept either way).${pull}`);
    }
    if (d.reason === 'would_remove') {
      throw new Error(`Not deployed: the site has files this folder doesn't, and this deploy would remove them: ${(d.paths ?? []).join(', ')}. ` +
        'If they should stay, add them to the folder (read_source_files has their content) and deploy again with a new ticket from begin_deploy. ' +
        `If the folder is the whole site and the person agrees they should go, deploy again with a new ticket and --force (earlier versions are kept either way).${pull}`);
    }
    const listed = media.find((f) => f.path === d.file);
    if (d.reason === 'upload_missing' && listed) {
      throw new Error(`Not deployed: ${d.file} is listed in .webly/media.json, but the site doesn't store that file (removed since, or the clone is of another site). Put the file in the folder, or remove its entry from .webly/media.json.${pull}`);
    }
    if (response.status === 401) throw new Error('Not deployed: the ticket is invalid or expired (they last 5 minutes and work once). Get a new one with begin_deploy and run this again straight away.');
    if (response.status === 409 && d.expectedHeadVersion !== undefined) throw new Error('Not deployed: the site changed after this ticket was issued. Get a new ticket with begin_deploy and deploy again.');
    throw new Error(`Not deployed: ${result.message || `request failed (${response.status})`}${d.reason ? ` [${d.reason}]` : ''}`);
  }
  await recordDeploy(websiteId, result.headVersion, root);
  try {
    const file = await writeProject(root, entryName, { websiteId, url: result.urls?.published ?? result.urls?.draft ?? undefined });
    if (!entry) console.error(`Webly: linked this folder to ${websiteId} in ${file}; commit it so every clone deploys to the same site.`);
  } catch (error) { console.error(`Webly: deployed, but could not save the folder's link: ${error.message}`); }
  return {
    websiteId, version: result.version, headVersion: result.headVersion, publishedVersion: result.publishedVersion, files: count + media.length, urls: result.urls,
    // Without a base the server can't tell an edit made elsewhere from this folder's own last deploy.
    ...(result.replaced && baseVersion !== undefined && { replaced: { ...result.replaced, note: `This draft replaced version ${result.replaced.fromVersion}, which was made somewhere else. Tell the person; earlier versions are kept, so it can be rolled back.` } }),
    next: `This is a draft: show the person ${result.urls?.draft ?? 'the draft URL'} and call publish_website only after they approve it.`,
  };
}

const OAUTH_SCOPES = 'webly:content webly:edit webly:admin offline_access';
// Registered once per API; the loopback port may differ on every login (RFC 8252 §7.3).
const LOOPBACK_REDIRECT = 'http://127.0.0.1/callback';

async function saveLogin(data) {
  await mkdir(dirname(LOGIN_FILE), { recursive: true, mode: 0o700 });
  const temporary = `${LOGIN_FILE}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  await rename(temporary, LOGIN_FILE);
}

async function oauthToken(base, params) {
  const response = await fetch(`${base}/api/auth/oauth2/token`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, resource: `${base}/v1/mcp` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Sign-in failed: ${body.error_description || body.error || response.status}`);
  return body;
}

/**
 * Sign in through the browser: OAuth with PKCE and a loopback redirect, the same login, workspace
 * and consent screens an MCP client gets. Only the refresh token is kept; nothing is printed.
 */
async function login(base) {
  const saved = await readJson(LOGIN_FILE);
  let clientId = saved?.api === base ? saved.clientId : null;
  if (!clientId) {
    const response = await fetch(`${base}/api/auth/oauth2/register`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'Webly CLI', application_type: 'native', redirect_uris: [LOOPBACK_REDIRECT], token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], scope: OAUTH_SCOPES }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.client_id) throw new Error(`Could not register with Webly (${body.error_description || response.status})`);
    clientId = body.client_id;
  }
  const verifier = randomBytes(32).toString('base64url');
  const state = randomBytes(16).toString('base64url');
  const server = createServer();
  await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
  const redirectUri = `http://127.0.0.1:${server.address().port}/callback`;
  try {
    const code = new Promise((done, fail) => {
      const timer = setTimeout(() => fail(new Error('No sign-in within 5 minutes. Run webly login again.')), 300_000);
      server.on('request', (req, res) => {
        const url = new URL(req.url, redirectUri);
        if (url.pathname !== '/callback') { res.writeHead(404).end(); return; }
        const ok = url.searchParams.get('state') === state && url.searchParams.get('code');
        res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/html; charset=utf-8' })
          .end(ok ? '<p>Signed in to Webly. You can close this tab.</p>' : '<p>Sign-in did not finish. Run webly login again.</p>');
        clearTimeout(timer);
        ok ? done(url.searchParams.get('code')) : fail(new Error(`Sign-in did not finish (${url.searchParams.get('error_description') || url.searchParams.get('error') || 'state mismatch'})`));
      });
    });
    const authorize = `${base}/api/auth/oauth2/authorize?${new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: OAUTH_SCOPES, resource: `${base}/v1/mcp`, state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', prompt: 'consent',
    })}`;
    await openInBrowser(authorize).catch(() => console.error(`Open this link to sign in:\n${authorize}`));
    console.error('Waiting for you to finish signing in in the browser…');
    const tokens = await oauthToken(base, { grant_type: 'authorization_code', code: await code, client_id: clientId, redirect_uri: redirectUri, code_verifier: verifier });
    await saveLogin({ api: base, clientId, refreshToken: tokens.refresh_token, accessToken: tokens.access_token, expiresAt: Date.now() + tokens.expires_in * 1000 });
  } finally {
    server.close();
  }
}

/** One refresh at a time across processes: rotating the same refresh token twice revokes the sign-in. */
async function withLoginLock(fn) {
  const lock = `${LOGIN_FILE}.lock`;
  for (let tries = 0; ; tries++) {
    try { await (await open(lock, 'wx')).close(); break; } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      // ponytail: a lock older than 30 s was left by a crashed process.
      const age = Date.now() - ((await stat(lock).catch(() => null))?.mtimeMs ?? Date.now());
      if (age > 30_000) await unlink(lock).catch(() => {});
      else if (tries > 300) throw new Error('Another webly command is refreshing the sign-in; try again.');
      else await new Promise(done => setTimeout(done, 100));
    }
  }
  try { return await fn(); } finally { await unlink(lock).catch(() => {}); }
}

/**
 * A fresh access token for the saved sign-in. Refreshes (saving the rotated refresh token) when it is
 * due or when `stale` was just refused, under a lock, reusing what another process refreshed meanwhile.
 */
async function accessToken(base, { stale } = {}) {
  const usable = (saved) => saved.accessToken && saved.accessToken !== stale && saved.expiresAt - 60_000 > Date.now();
  const read = async () => {
    const saved = await readJson(LOGIN_FILE);
    if (saved?.api !== base || !saved.refreshToken) throw new Error('Not signed in. Run: webly login');
    return saved;
  };
  const first = await read();
  if (usable(first)) return first.accessToken;
  return withLoginLock(async () => {
    const saved = await read();
    if (usable(saved)) return saved.accessToken;
    const tokens = await oauthToken(base, { grant_type: 'refresh_token', refresh_token: saved.refreshToken, client_id: saved.clientId })
      .catch(() => { throw new Error('The sign-in expired or was revoked. Run: webly login'); });
    await saveLogin({ ...saved, refreshToken: tokens.refresh_token ?? saved.refreshToken, accessToken: tokens.access_token, expiresAt: Date.now() + tokens.expires_in * 1000 });
    return tokens.access_token;
  });
}

/** One /v1 call as the signed-in person; retried once with a refreshed token on 401. */
async function rest(base, method, path, { workspace, body } = {}) {
  const call = async (token) => fetch(`${base}/v1${path.replace(/^\/v1(?=\/)/, '')}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(120_000),
    headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(workspace ? { 'X-Webly-Workspace': workspace } : {}) },
    body,
  });
  const token = await accessToken(base);
  let response = await call(token);
  if (response.status === 401) response = await call(await accessToken(base, { stale: token }));
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: response.ok, status: response.status, body: data };
}

async function main() {
  const base = new URL(process.env.WEBLY_API_URL || 'https://api.webly.ai').origin;
  const url = new URL(base);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Use HTTPS (HTTP is allowed only for localhost)');
  const argv = process.argv.slice(2);
  const nameAt = argv.indexOf('--name');
  const nameFlag = nameAt === -1 ? undefined : argv.splice(nameAt, 2)[1];
  const folderAt = argv.indexOf('--folder');
  const folderFlag = folderAt === -1 ? undefined : argv.splice(folderAt, 2)[1];
  const option = (flag) => { const at = argv.indexOf(flag); return at === -1 ? undefined : argv.splice(at, 2)[1]; };
  const toggle = (flag) => { const at = argv.indexOf(flag); if (at !== -1) argv.splice(at, 1); return at !== -1; };
  const toFlag = option('--to'), asFlag = option('--as'), ticketFlag = option('--ticket'), messageFlag = option('--message'), anonymousFlag = toggle('--anonymous'), forceFlag = toggle('--force');
  const [command, argument, extra] = argv;
  const print = (value) => console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  const readPending = async () => (await readFile(PENDING_FILE, 'utf8').catch(() => '')).trim() || null;

  if (command === 'pending') {
    if (argument === 'set' && extra) { await mkdir(dirname(PENDING_FILE), { recursive: true, mode: 0o700 }); await writeFile(PENDING_FILE, extra + '\n'); return print(`Pending: ${extra}`); }
    if (argument === 'clear') { await unlink(PENDING_FILE).catch(() => {}); return print('Pending cleared'); }
    throw new Error('Usage: webly.mjs pending set <intent> | clear');
  }

  if (command === 'link') {
    if (!/^ws_[\w-]+$/.test(argument ?? '')) throw new Error('Usage: webly.mjs link <websiteId> [--as <entry>]  (the id from list_websites, e.g. ws_…)');
    const root = await projectRoot('.');
    const entry = asFlag ?? 'default';
    const file = await writeProject(root, entry, { websiteId: argument });
    return print({ linked: argument, entry, file });
  }

  if (command === 'domain-watch') {
    const host = String(argument ?? '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!host) throw new Error('Usage: webly.mjs domain-watch <hostname> [--timeout MIN]');
    const minutes = extra === '--timeout' ? Number(argv[3]) : 120;
    if (!(Number.isFinite(minutes) && minutes > 0) || (extra !== undefined && extra !== '--timeout')) throw new Error('Usage: webly.mjs domain-watch <hostname> [--timeout MIN]  (MIN is a number of minutes above 0)');
    const deadline = Date.now() + minutes * 60_000;
    // ponytail: fixed 30 s poll of one host; the server re-checks Cloudflare on its own every few minutes.
    for (let last = ''; ;) {
      const { stage, detail } = await domainStage(host);
      if (stage + detail !== last) print(`${new Date().toISOString().slice(11, 19)} ${stage}: ${detail}`);
      last = stage + detail;
      if (stage === 'live') return;
      if (Date.now() > deadline) { process.exitCode = 1; return print(`Still at "${stage}" after ${minutes} min. Run domain-watch again, or call verify_domain for the server's view.`); }
      await new Promise(done => setTimeout(done, 30_000));
    }
  }

  if (command === 'login') {
    await login(base);
    const me = await rest(base, 'GET', '/me');
    const spaces = await rest(base, 'GET', '/workspaces');
    return print({ signedIn: true, workspaces: me.body?.workspaces ?? null, role: me.body?.access?.role ?? null,
      available: (spaces.body?.items ?? []).map(w => ({ slug: w.slug, name: w.name, role: w.role, canUse: w.canUse })) });
  }

  if (command === 'api') {
    const method = String(argument ?? '').toUpperCase();
    if (!/^(GET|POST|PUT|PATCH|DELETE)$/.test(method) || !extra?.startsWith('/')) throw new Error('Usage: webly.mjs api <GET|POST|PUT|PATCH|DELETE> </path> [--workspace W] [--data JSON|@file]');
    const data = option('--data'), workspace = option('--workspace');
    const body = data === undefined ? undefined : data.startsWith('@') ? await readFile(data.slice(1), 'utf8') : data;
    if (body !== undefined) try { JSON.parse(body); } catch { throw new Error('--data must be JSON (or @file with JSON in it)'); }
    const result = await rest(base, method, extra, { workspace, body });
    if (!result.ok) process.exitCode = 1;
    return print(result.ok ? result.body : { status: result.status, ...result.body });
  }

  if (command === 'logout') {
    const saved = await readJson(LOGIN_FILE);
    const revoked = saved?.refreshToken
      ? await fetch(`${saved.api}/api/auth/oauth2/revoke`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: saved.refreshToken, token_type_hint: 'refresh_token', client_id: saved.clientId }) }).then(r => r.ok, () => false)
      : false;
    await unlink(LOGIN_FILE).catch(() => {});
    if (!saved) return print('Not signed in.');
    if (!revoked) process.exitCode = 1;
    return print(revoked ? 'Signed out; the sign-in was revoked.'
      : 'Signed out on this machine, but Webly could not confirm the revocation. Revoke "Webly CLI" in the dashboard under Settings → Agents & keys.');
  }

  if (command === 'doctor') {
    // The session-start hook allows 10 s; the update check runs alongside the status call.
    const brief = argument === '--brief';
    const updateCheck = skillUpdate();
    const report = { version: VERSION, updatedFrom: await justUpdated(), update: null, api: base, credentialFile: CREDENTIAL_FILE, credential: 'none', site: null, siteError: null, mcp: await mcpSetup(), pending: await readPending(),
      signedIn: (await readJson(LOGIN_FILE))?.api === base };
    let token = null;
    try { token = await savedCredential(base); } catch (error) { report.credential = `unusable: ${error.message}`; }
    if (token) {
      report.credential = 'present';
      const current = await api(base, '/sites/current', token, { timeout: brief ? 4000 : 30_000 }).catch(error => ({ ok: false, status: 0, body: { message: `Webly unreachable: ${error.message}` } }));
      if (current.ok) report.site = current.body;
      else {
        report.siteError = { status: current.status, reason: current.body.details?.reason ?? null, message: current.body.message ?? null };
        if (SPENT.has(report.siteError.reason) && await forgetCredential(token)) report.credential = 'none (spent token removed)';
      }
    }
    // A claim can't be pending without a token to claim with.
    if (report.pending === 'claim' && !report.credential.startsWith('present')) { await unlink(PENDING_FILE).catch(() => {}); report.pending = null; }
    try {
      const root = await projectRoot(process.cwd());
      report.project = { root, file: projectFile(root), sites: (await readProject(root)).sites };
    } catch (error) { report.project = { error: error.message }; }
    report.update = await updateCheck;
    if (!brief) return print(report);
    const parts = [];
    const links = Object.entries(report.project.sites ?? {});
    if (links.length) parts.push(`this folder deploys to ${links.map(([entry, s]) => `${s.name ? `"${s.name}" ` : ''}(${s.websiteId}${s.url ? `, ${s.url}` : ''})${entry === 'default' ? '' : ` as "${entry}"`}`).join(', ')}.`);
    if (report.project.error) parts.push(report.project.error);
    if (report.site) {
      const s = report.site;
      parts.push(`anonymous site "${s.name}" is ${s.status}${s.urls.published ? ` at ${s.urls.published}` : ''}. ${s.next?.message ?? ''}`.trim());
    } else if (report.credential === 'present') parts.push(report.siteError?.status === 404 ? 'a token is saved but no site was deployed yet.' : 'an anonymous site is saved on this machine (status unavailable right now).');
    if (report.pending) parts.push(`Unfinished step from an earlier session: ${report.pending}.`);
    if (parts.length) print(`Webly: ${parts.join(' ')} Use the webly skill to continue.`);
    // Hook output reaches the agent, not the person, so say what to pass on.
    if (report.updatedFrom) print(`Webly skill was updated from ${report.updatedFrom} to ${VERSION}. Tell the user in one line.`);
    if (report.update) print(`Webly skill ${report.update.latest} is available (installed ${VERSION}). Tell the user in one line and offer to run: ${report.update.command}`);
    return;
  }

  if (command === 'connect') {
    // Tools registered mid-session aren't callable until a reload; don't block the claim on one.
    const CLAIM_FALLBACK = (hasToken) => hasToken
      ? 'If Webly tools are callable: call create_claim_code, then run `webly claim <code>` (never read the token yourself). If they are not, do not ask for a reload: run `webly claim-link --open` now so the person claims in the browser. MCP loads next session.'
      : 'Webly tools load after /reload-plugins or in the next session.';
    const mcpUrl = `${base}/v1/mcp`;
    const setup = await mcpSetup();
    const hasToken = Boolean(await savedCredential(base).catch(() => null));
    if (hasToken) { await mkdir(dirname(PENDING_FILE), { recursive: true, mode: 0o700 }); await writeFile(PENDING_FILE, 'claim\n'); }
    if (argument === 'claude') {
      if (!setup.claudeCode.configured || setup.claudeCode.via === 'project') {
        const official = base === 'https://api.webly.ai';
        // The plugin reloads mid-session; a plain server entry needs a new session.
        let via = null, log = [];
        if (official) {
          const market = run('claude', ['plugin', 'marketplace', 'add', PLUGIN_MARKETPLACE]);
          if (market.missing) throw new Error('The claude CLI is not on PATH. Run: claude mcp add --scope user --transport http webly ' + mcpUrl);
          // `add` leaves an already-added marketplace at its old clone, which would install a stale plugin.
          log.push(run('claude', ['plugin', 'marketplace', 'update', 'webly']).output);
          const install = run('claude', ['plugin', 'install', 'webly@webly', '--scope', 'user', '-y']);
          log.push(market.output, install.output);
          if (install.ok) {
            via = 'plugin';
            // The plugin ships this skill; a standalone copy (install.sh / npx skills) would load it twice.
            await rm(join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'skills', 'webly'), { recursive: true, force: true });
          }
        }
        if (!via) {
          const add = run('claude', ['mcp', 'add', '--scope', 'user', '--transport', 'http', 'webly', mcpUrl]);
          log.push(add.output);
          if (!add.ok && !/already exists/i.test(add.output)) throw new Error(`Could not register the MCP server:\n${log.filter(Boolean).join('\n')}`);
          via = 'user';
        }
        return print({ connected: 'claude-code', via, mcpUrl, pending: hasToken ? 'claim' : null, next: CLAIM_FALLBACK(hasToken) });
      }
      return print({ connected: 'claude-code', via: setup.claudeCode.via, mcpUrl, pending: hasToken ? 'claim' : null, next: 'Already configured. If Webly tools are loaded, use them. ' + CLAIM_FALLBACK(hasToken) });
    }
    if (argument === 'codex') {
      if (!setup.codex.configured) {
        const add = run('codex', ['mcp', 'add', 'webly', '--url', mcpUrl]);
        if (add.missing) throw new Error('The codex CLI is not on PATH. Add to ~/.codex/config.toml:\n[mcp_servers.webly]\nurl = "' + mcpUrl + '"');
        if (!add.ok) throw new Error(`codex mcp add failed:\n${add.output}`);
      }
      return print({ connected: 'codex', mcpUrl, pending: hasToken ? 'claim' : null,
        next: 'Run `codex mcp login webly` in the foreground and keep it running until the person clicks Allow. Tools load in a new session: the person runs `codex resume --last`.' });
    }
    throw new Error('Usage: webly.mjs connect claude|codex');
  }

  if (command === 'forget') {
    const token = await savedCredential(base);
    if (token) {
      const current = await api(base, '/sites/current', token);
      if (current.ok || !SPENT.has(current.body.details?.reason)) {
        throw new Error('Claim completion is not confirmed. The saved token and pending step were kept; finish claiming in the browser or over MCP, then retry.');
      }
      await forgetCredential(token);
    }
    await unlink(PENDING_FILE).catch(() => {});
    return print(token ? 'Saved token removed' : 'No saved token');
  }

  if (command === 'claim') {
    const token = await savedCredential(base);
    if (!token) throw new Error('No website deployed without an account is saved on this computer, so there is nothing to claim.');
    if (!/^wc_[\w.-]+$/.test(argument ?? '')) throw new Error('Usage: webly.mjs claim <code>  (get the code from the create_claim_code MCP tool)');
    const response = await fetch(`${base}/api/anonymous/claim`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, code: argument }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (SPENT.has(result.details?.reason)) { await forgetCredential(token); await unlink(PENDING_FILE).catch(() => {}); }
      throw new Error(`${result.message || `Claim failed (${response.status})`}${result.details?.reason ? ` [${result.details.reason}]` : ''}`);
    }
    await forgetCredential(token);
    await unlink(PENDING_FILE).catch(() => {});
    return print({ claimed: true, alreadyClaimed: result.alreadyClaimed ?? false, name: result.website?.name, url: result.website?.urls?.published ?? null, claimHeld: result.website?.claimHeld, sharedFiles: result.storage ? true : undefined, dashboardUrl: result.dashboardUrl, billingUrl: result.billingUrl });
  }

  if (!['init', 'deploy', 'replace', 'update', 'status', 'claim-link', 'upload'].includes(command)) throw new Error(USAGE);
  const failedFor = (token) => async (result, fallback) => {
    if (SPENT.has(result.details?.reason) && await forgetCredential(token)) {
      throw new Error(`${result.message || fallback} The saved credential is spent and was removed; the next deploy creates a new one.`);
    }
    const reason = result.details?.reason ? ` [${result.details.reason}]` : '';
    throw new Error(`${result.message || fallback}${reason}`);
  };

  if (['deploy', 'replace', 'update'].includes(command)) {
    if (!argument) throw new Error(`${command} needs a folder, a file or a payload.json`);
    // Which site this folder belongs to is settled before anything is built, created or sent.
    const root = await projectRoot(argument);
    const entryName = toFlag ?? 'default';
    const entry = (await readProject(root)).sites[entryName];
    if (ticketFlag !== undefined) {
      if (anonymousFlag) throw new Error('--ticket deploys to the signed-in site the ticket names; --anonymous makes a throwaway anonymous one. Pass one, not both.');
      return print(await ticketDeploy(base, { command, argument, root, entryName, entry, ticket: ticketFlag, force: forceFlag, message: messageFlag }));
    }
    const setup = await mcpSetup();
    const connected = setup.claudeCode.configured || setup.codex.configured;
    let token = await savedCredential(base);
    let site = null;
    if (token) {
      const found = await api(base, '/sites/current', token);
      // `current` is the shared files when there's no website yet; those never stand in for one.
      if (found.ok) site = found.body.kind === 'storage' ? null : found.body;
      else if (SPENT.has(found.body.details?.reason)) { if (await forgetCredential(token)) token = null; }
      // 404 is "no website yet"; anything else says nothing about which site this is.
      else if (found.status !== 404) throw new Error(`Not deployed: could not read this machine's anonymous site (${found.status}${found.body.message ? `: ${found.body.message}` : ''}). Try again.`);
    }
    const as = entryName === 'default' ? '' : ` as "${entryName}"`;
    if (entry && entry.websiteId !== site?.id) {
      throw new Error(`Not deployed: this folder is linked${as} to the Webly site ${entry.name ? `"${entry.name}" ` : ''}(${entry.websiteId}${entry.url ? `, ${entry.url}` : ''}) in ${projectFile(root)}, ` +
        'and it is not the anonymous site saved on this machine: it was claimed into an account, or the link came from someone else. ' +
        (connected
          ? `Update it over MCP: call begin_deploy with websiteId ${entry.websiteId}, then run \`webly deploy ${argument}${entryName === 'default' ? '' : ` --to ${entryName}`} --ticket <ticket>\` with the ticket it returns ` +
            '(a draft; publish_website after the person approves). Never put an API key in a command or bundle contents in deploy_files. ' +
            'If begin_deploy returns 404, the site is not in this account (a fork, another account, or deleted): ask the person whether to make a new site, then `webly link` it.'
          : 'Sign in to update it: run `webly connect claude` (or `webly connect codex`), then update it over MCP. If the person has no access to it, ask whether to make a new site, then `webly link` it.'));
    }
    if (!entry && connected && !anonymousFlag) {
      throw new Error(`Not deployed: this folder isn't linked to a Webly site yet (${projectFile(root)}), and this machine is connected to a Webly account, so nothing was published anonymously. ` +
        `If the Webly MCP tools are loaded, call list_websites: if one of them is this project, run \`webly link <websiteId>${entryName === 'default' ? '' : ` --as ${entryName}`}\` and deploy again; otherwise create_website (kind "static") and link that. ` +
        'If the tools are not loaded, ask the person to start a new session (or run /reload-plugins). ' +
        (site ? `This machine also has an unclaimed anonymous site "${site.name}" (${site.urls?.published ?? site.id}); claim it only if the person wants that one. ` : '') +
        (site ? `For a throwaway anonymous site anyway, \`webly replace ${argument} --anonymous\` discards that one for a new URL; it takes that site offline, so only with the person's explicit OK.` : 'For a throwaway anonymous site anyway, rerun with --anonymous.'));
    }
    if (!entry && anonymousFlag && site && command !== 'replace') {
      throw new Error(`Not deployed: this machine's one anonymous site is "${site.name}" (${site.urls?.published ?? site.id}), and --anonymous would replace its files. ` +
        `Claim it first if the person wants to keep it. \`webly replace ${argument} --anonymous\` discards it for a new URL and takes it offline: tell the person that and run it only with their explicit OK.`);
    }
    if (!entry && entryName !== 'default') {
      throw new Error(`Not deployed: no site is linked as "${entryName}", and a computer without an account has a single anonymous site. Sign in to Webly for more sites, then \`webly link <websiteId> --as ${entryName}\`.`);
    }
    if (command === 'replace') site = null;
    else if (!site && command === 'update') throw new Error('No site to update');
    // Edits made elsewhere don't block a deploy (every version is kept, so it can be rolled back); the result says what it replaced.
    const last = site ? await lastDeploy(site.id) : null;
    const replaced = last && site.headVersion > last.version
      ? { fromVersion: last.version, toVersion: site.headVersion, note: `"${site.name}" was changed somewhere else after this computer last deployed it (version ${last.version}, then ${site.headVersion}); this deploy replaced those changes. Tell the person: earlier versions are kept, so it can be rolled back.` }
      : undefined;

    const target = await stat(argument).then(i => i.isDirectory(), () => false) ? await buildIfProject(argument) : argument;
    const body = await payloadFrom(target, nameFlag);
    let response;
    if (site) {
      // One live site per token: publishing again updates it in place and keeps its URL.
      const { kind, ...rest } = body;
      response = await api(base, `/sites/${encodeURIComponent(site.id)}`, token, { method: 'PUT', body: JSON.stringify({ ...rest, expectedHeadVersion: site.headVersion }) });
    } else {
      // Only creation takes the name; updates keep whatever the site is already called.
      const named = typeof body.name === 'string' ? body.name.trim() : '';
      if (!nameFlag && (!named || isGenericName(named))) {
        throw new Error(`Not deployed: the site would be ${named ? `named "${named}", which says nothing about it` : 'unnamed'}. Ask the person what this project is called. ` +
          'Make clear it is only the name shown in their Webly dashboard and on the claim page, not the web address: the URL is assigned automatically (https://anon-….webly.site). ' +
          `Then rerun: webly ${command} ${argument} --name "<their answer>"`);
      }
      token ??= await localCredential(base);
      response = await api(base, '/sites', token, { method: 'POST', body: JSON.stringify(command === 'replace' ? { ...body, replace: true } : body) });
    }
    if (!response.ok) await failedFor(token)(response.body, `Request failed (${response.status})`);
    const result = await settle(base, token, response.body);
    await recordDeploy(result.id, result.headVersion, root);
    try {
      const file = await writeProject(root, entryName, { websiteId: result.id, name: result.name, url: result.urls?.published ?? result.urls?.draft ?? undefined });
      if (entry?.websiteId !== result.id) console.error(`Webly: linked this folder to "${result.name}" in ${file}; commit it so every clone deploys to the same site.`);
    } catch (error) { console.error(`Webly: deployed, but could not save the folder's link: ${error.message}`); }
    return print(replaced ? { ...result, replaced } : result);
  }

  const token = await localCredential(base);
  if (command === 'init') return print(`Credential saved to ${CREDENTIAL_FILE}`);
  const failed = failedFor(token);

  if (command === 'claim-link') {
    const current = await api(base, '/sites/current', token);
    if (!current.ok) await failed(current.body, 'Could not find a claimable site');
    // The token rides in the fragment, which browsers never send to a server. Printing it is an explicit choice.
    const link = `${current.body.claimPage}#token=${encodeURIComponent(token)}`;
    if (argument === '--open') { await openInBrowser(link); return print(`Opened the claim page in the browser for "${current.body.name}". Finish sign-in and click Claim website; opening this page does not complete the claim.`); }
    return print(link);
  }

  if (command === 'status') {
    const current = await api(base, '/sites/current', token);
    if (!current.ok) await failed(current.body, `Request failed (${current.status})`);
    return print(current.body);
  }

  return print(await uploadFiles(base, token, argv.slice(1), { folder: folderFlag, name: nameFlag, failed }));
}

const MIME = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', txt: 'text/plain', md: 'text/markdown',
  csv: 'text/csv', json: 'application/json', zip: 'application/zip', html: 'text/html' };

/**
 * Files named on the command line; folders contribute every file, hidden ones included (only
 * macOS's .DS_Store is left out), and keep their structure: `upload ./test` names them
 * "src/main.cpp", and with several arguments a folder's files go under its own name.
 */
async function filesFrom(paths) {
  const out = [];
  const lone = paths.length === 1 && (await stat(paths[0])).isDirectory();
  async function add(path, name) {
    const info = await stat(path);
    if (info.isDirectory()) { for (const entry of await readdir(path)) if (entry !== '.DS_Store' && entry !== '.webly') await add(join(path, entry), name ? `${name}/${entry}` : entry); }
    else if (info.isFile()) out.push({ path, name: name || basename(path), byteSize: info.size, mimeType: MIME[extname(path).slice(1).toLowerCase()] ?? 'application/octet-stream' });
  }
  for (const p of paths) await add(p, lone ? '' : basename(resolve(p)));
  return out;
}

/**
 * Anonymous file sharing: a storage site on this machine's credential (created on first use),
 * one batch per run into its own folder. Bytes go straight to storage with the presigned PUTs.
 */
async function uploadFiles(base, token, paths, { folder, name, failed }) {
  if (!paths.length) throw new Error('Usage: webly.mjs upload <file|dir>... [--folder name] [--name "Shared files"]');
  let files = await filesFrom(paths);
  if (!files.length) throw new Error('No files found to upload');
  // A big folder goes up as one zip the server serves from inside: one upload instead of thousands.
  const archived = files.length > ARCHIVE_OVER ? files.length : 0;
  if (archived) files = [await zipToTemp(files, `${basename(resolve(paths[0]))}.zip`)];
  const results = [];
  const errors = [];
  let first;
  try {
    // Shared files sit beside the website. Once their 24 hours are over, a new storage site starts another 24.
    const current = await api(base, '/sites/storage', token);
    if (!current.ok && current.status !== 404) await failed(current.body, `Could not read the shared files (${current.status})`);
    let site = current.ok && current.body.status !== 'offline' ? current.body : null;
    if (!site) {
      const created = await api(base, '/sites', token, { method: 'POST', body: JSON.stringify({ name: name || 'Shared files', kind: 'storage' }) });
      if (!created.ok) await failed(created.body, `Could not create the storage site (${created.status})`);
      site = created.body;
    }
    // A batch holds up to 1000 files; a bigger folder goes up in several, all into the same folder.
    for (let i = 0; i < files.length; i += 1000) {
      const chunk = files.slice(i, i + 1000);
      const out = await uploadBatch(base, token, site, first?.folder ?? folder, chunk, errors, failed);
      first ??= out.begun;
      results.push(...out.files);
    }
  } finally {
    // The temp zip can be hundreds of MiB: never leave it behind, even when the upload fails.
    if (archived) await rm(files[0].path, { force: true });
  }
  if (archived && results[0]?.ok) return {
    folderUrl: first.folderUrl, zipUrl: first.zipUrl, expiresAt: first.expiresAt,
    archive: { files: archived, note: `Over ${ARCHIVE_OVER} files, so they went up as one zip: the folder link, its subfolders and every file's link work as usual (read-only), and Download all is the zip.` },
    next: 'These links stop working after 24 hours. To keep the files, claim them into a free account (1 GB): webly.mjs claim-link --open, or create_claim_code over MCP then webly.mjs claim <code>.',
  };
  return {
    folderUrl: first.folderUrl, zipUrl: first.zipUrl, expiresAt: first.expiresAt,
    // name is the path inside the folder ("sub/c.txt"), so the structure shows.
    files: results.map((f) => f.ok ? { name: f.path ? f.path.split('/').slice(2).join('/') : f.name, url: f.url, size: f.size } : { id: f.id, error: f.error }),
    ...(errors.length ? { errors } : {}),
    next: 'These links stop working after 24 hours. To keep the files, claim them into a free account (1 GB): webly.mjs claim-link --open, or create_claim_code over MCP then webly.mjs claim <code>.',
  };
}

/** Folders with more files than this upload as one archive zip. */
const ARCHIVE_OVER = 500;

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Writes the files into a store-only zip in the temp folder, one file in memory at a time. Names are
 * the files' paths inside the folder, so the server serves the same structure. Plain zip, not ZIP64:
 * at most 65,535 files and 4 GB, well above the anonymous allowance.
 */
async function zipToTemp(files, name) {
  if (files.length > 0xffff) throw new Error(`${files.length} files; one archive holds at most 65535`);
  const path = join(tmpdir(), `webly-${randomUUID()}.zip`);
  const out = await open(path, 'w');
  const central = [];
  let offset = 0;
  try {
    for (const f of files) {
      const data = await readFile(f.path);
      const fileName = Buffer.from(f.name);
      const header = (size) => Buffer.alloc(size);
      const crc = crc32(data);
      const local = header(30);
      local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6);
      local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(fileName.length, 26);
      const cd = header(46);
      cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x800, 8);
      cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(data.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(fileName.length, 28); cd.writeUInt32LE(offset, 42);
      if (offset + 30 + fileName.length + data.length > 0xffffffff) throw new Error('The folder is over 4 GB; share it in parts');
      await out.write(Buffer.concat([local, fileName, data]));
      central.push(cd, fileName);
      offset += 30 + fileName.length + data.length;
    }
    const cdBytes = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
    end.writeUInt32LE(cdBytes.length, 12); end.writeUInt32LE(offset, 16);
    await out.write(Buffer.concat([cdBytes, end]));
  } finally { await out.close(); }
  return { path, name, byteSize: (await stat(path)).size, mimeType: 'application/zip', archive: true };
}

/** Begin, PUT and finalize one batch of up to 1000 files; what doesn't finish is cancelled. */
async function uploadBatch(base, token, site, folder, files, errors, failed) {
  const begun = await api(base, `/sites/${encodeURIComponent(site.id)}/objects/uploads`, token, { method: 'POST', body: JSON.stringify({ folder, files: files.map(({ name, byteSize, mimeType, archive }) => ({ name, byteSize, mimeType, archive })) }) });
  if (!begun.ok) await failed(begun.body, `Upload refused (${begun.status})`);
  // One PUT per small file, one per 100 MiB part of a larger one (a part is a byte range of the file).
  const queue = [];
  begun.body.files.forEach((f, i) => {
    if (f.upload) queue.push({ name: f.name, url: f.upload.url, headers: { ...f.upload.headers }, path: files[i].path });
    for (const p of f.parts ?? []) queue.push({ name: `${f.name} part ${p.partNumber}`, url: p.url, headers: {}, path: files[i].path, start: (p.partNumber - 1) * f.partSize, size: p.size });
  });
  const bytesOf = async (job) => {
    if (job.start === undefined) return readFile(job.path);
    const handle = await open(job.path, 'r');
    try { const buf = Buffer.alloc(job.size); await handle.read(buf, 0, job.size, job.start); return buf; } finally { await handle.close(); }
  };
  // Two at a time, each retried: large uploads get reset now and then, and a presigned URL can be re-sent.
  await Promise.all(Array.from({ length: 2 }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      // Local servers without presigning take the PUT themselves and want this credential.
      if (job.url.startsWith(base)) job.headers.Authorization = `Bearer ${token}`;
      delete job.headers['Content-Length'];
      const body = await bytesOf(job);
      let response;
      for (let attempt = 1; attempt <= 4; attempt++) {
        response = await fetch(job.url, { method: 'PUT', headers: job.headers, body, signal: AbortSignal.timeout(15 * 60_000) }).catch((e) => ({ ok: false, status: e.message }));
        if (response.ok || (response.status >= 400 && response.status < 500)) break;
        await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      }
      if (!response.ok) errors.push(`${job.name}: upload failed (${response.status})`);
    }
  }));
  const finalized = await api(base, `/sites/${encodeURIComponent(site.id)}/objects/finalize`, token, { method: 'POST', body: JSON.stringify({ ids: begun.body.files.map((f) => f.id) }) });
  // Cancel what didn't finish, so a retry isn't blocked by the abandoned upload.
  const done = new Set(finalized.ok ? finalized.body.files.filter((f) => f.ok).map((f) => f.id) : []);
  for (const f of begun.body.files) if (!done.has(f.id)) await api(base, `/sites/${encodeURIComponent(site.id)}/objects/${encodeURIComponent(f.id)}`, token, { method: 'DELETE' }).catch(() => {});
  if (!finalized.ok) await failed(finalized.body, `Finalize failed (${finalized.status})`);
  return { begun: begun.body, files: finalized.body.files };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  // doctor --brief runs as a session-start hook: it must never break a session.
  const brief = process.argv[2] === 'doctor' && process.argv[3] === '--brief';
  main().catch(error => { if (!brief) { console.error(error.message); process.exitCode = 1; } });
}
