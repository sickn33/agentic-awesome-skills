import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const { resolveSafeRealPath } = require('../../tools/lib/symlink-safety');
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const UPSTREAM_REPO = 'https://github.com/sickn33/antigravity-awesome-skills.git';
const UPSTREAM_NAME = 'upstream';
const REPO_TAR_URL = 'https://github.com/sickn33/antigravity-awesome-skills/archive/refs/heads/main.tar.gz';
const REPO_ZIP_URL = 'https://github.com/sickn33/antigravity-awesome-skills/archive/refs/heads/main.zip';
const COMMITS_API_URL = 'https://api.github.com/repos/sickn33/antigravity-awesome-skills/commits/main';
const SHA_FILE = path.join(__dirname, '.last-sync-sha');

// ─── Utility helpers ───

const MIME_TYPES = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.md': 'text/markdown', '.txt': 'text/plain',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    '.yaml': 'text/yaml', '.yml': 'text/yaml', '.xml': 'text/xml',
    '.py': 'text/plain', '.sh': 'text/plain', '.bat': 'text/plain',
};

/** Check if git is available on this system. Cached after first check. */
let _gitAvailable = null;
function isGitAvailable() {
    if (_gitAvailable !== null) return _gitAvailable;
    try {
        execSync('git --version', { stdio: 'ignore' });
        // Also check we're inside a git repo
        execSync('git rev-parse --git-dir', { cwd: ROOT_DIR, stdio: 'ignore' });
        _gitAvailable = true;
    } catch {
        _gitAvailable = false;
    }
    return _gitAvailable;
}

function normalizeHost(hostValue = '') {
    return String(hostValue).trim().toLowerCase().replace(/^\[|\]$/g, '');
}

function isLoopbackHost(hostname) {
    const host = normalizeHost(hostname);
    return host === 'localhost'
        || host === '::1'
        || host.startsWith('127.');
}

function isLoopbackRemoteAddress(remoteAddress) {
    const address = normalizeHost(remoteAddress);
    return address === '::1'
        || address.startsWith('127.')
        || address.startsWith('::ffff:127.');
}

function getRequestHost(req) {
    const hostHeader = req.headers?.host || '';

    if (!hostHeader) {
        return '';
    }

    try {
        return new URL(`http://${hostHeader}`).hostname;
    } catch {
        return normalizeHost(hostHeader);
    }
}

function getRequestRemoteAddress(req) {
    return req.socket?.remoteAddress || req.connection?.remoteAddress || '';
}

function isDevLoopbackRequest(req) {
    return isLoopbackRemoteAddress(getRequestRemoteAddress(req));
}

function isTokenAuthorized(req) {
    const expectedToken = (process.env.SKILLS_REFRESH_TOKEN || '').trim();

    if (!expectedToken) {
        return true;
    }

    const providedToken = req.headers?.['x-skills-refresh-token'];
    if (typeof providedToken !== 'string' || !providedToken) {
        return false;
    }

    const expected = Buffer.from(expectedToken);
    const provided = Buffer.from(providedToken);

    if (expected.length !== provided.length) {
        return false;
    }

    return crypto.timingSafeEqual(expected, provided);
}

/** Run a git command in the project root. */
function git(cmd) {
    return execSync(`git ${cmd}`, { cwd: ROOT_DIR, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function isAllowedDevOrigin(req) {
    const host = req.headers?.host;
    const origin = req.headers?.origin;

    if (!host || !origin) {
        return false;
    }

    try {
        return new URL(origin).host === host;
    } catch {
        return false;
    }
}

/** Ensure the upstream remote exists. */
function ensureUpstream() {
    const remotes = git('remote');
    if (!remotes.split('\n').includes(UPSTREAM_NAME)) {
        git(`remote add ${UPSTREAM_NAME} ${UPSTREAM_REPO}`);
        console.log(`[Sync] Added upstream remote: ${UPSTREAM_REPO}`);
    }
}

/** Download a file following HTTP redirects. */
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = (url) => {
            https.get(url, { headers: { 'User-Agent': 'antigravity-skills-app' } }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    request(res.headers.location);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`Download failed with status ${res.statusCode}`));
                    return;
                }
                res.pipe(file);
                file.on('finish', () => { file.close(); resolve(); });
            }).on('error', (err) => { fs.unlink(dest, () => { }); reject(err); });
        };
        request(url);
    });
}

/** Check latest commit SHA via GitHub API. */
function checkRemoteSha() {
    return new Promise((resolve) => {
        https.get(COMMITS_API_URL, {
            headers: { 'User-Agent': 'antigravity-skills-app', 'Accept': 'application/vnd.github.v3+json' },
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        resolve(JSON.parse(body).sha || null);
                    } else {
                        resolve(null);
                    }
                } catch {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

// ─── Sync strategies ───

/**
 * FAST PATH: Use git fetch + merge (only downloads delta).
 * Typically completes in 5-15 seconds.
 */
async function syncWithGit() {
    ensureUpstream();

    const headBefore = git('rev-parse HEAD');

    console.log('[Sync] Fetching from upstream (git)...');
    git(`fetch ${UPSTREAM_NAME} main`);

    const upstreamHead = git(`rev-parse ${UPSTREAM_NAME}/main`);

    if (headBefore === upstreamHead) {
        return { upToDate: true };
    }

    console.log('[Sync] Merging updates...');
    try {
        git(`merge ${UPSTREAM_NAME}/main --ff-only`);
    } catch (error) {
        throw new Error(
            `Fast-forward sync failed. Resolve local divergence manually before retrying. ${error.message}`,
        );
    }

    return { upToDate: false };
}

/**
 * FALLBACK: Download archive when git is not available.
 * Tries tar.gz first (faster), falls back to zip if tar isn't available.
 */
async function syncWithArchive() {
    // Check SHA first to skip if up to date
    const remoteSha = await checkRemoteSha();
    if (remoteSha) {
        let storedSha = null;
        if (fs.existsSync(SHA_FILE)) {
            storedSha = fs.readFileSync(SHA_FILE, 'utf-8').trim();
        }
        if (storedSha === remoteSha) {
            return { upToDate: true };
        }
    }

    const tempDir = path.join(ROOT_DIR, 'update_temp');

    // Try tar first, fall back to zip
    let useTar = true;
    try {
        execSync('tar --version', { stdio: 'ignore' });
    } catch {
        useTar = false;
    }

    const archivePath = path.join(ROOT_DIR, useTar ? 'update.tar.gz' : 'update.zip');

    try {
        // 1. Download
        console.log(`[Sync] Downloading (${useTar ? 'tar.gz' : 'zip'})...`);
        await downloadFile(useTar ? REPO_TAR_URL : REPO_ZIP_URL, archivePath);

        // 2. Extract
        console.log('[Sync] Extracting...');
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        fs.mkdirSync(tempDir, { recursive: true });

        if (useTar) {
            execSync(`tar -xzf "${archivePath}" -C "${tempDir}"`, { stdio: 'ignore' });
        } else if (globalThis.process?.platform === 'win32') {
            execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${tempDir}' -Force"`, { stdio: 'ignore' });
        } else {
            execSync(`unzip -o "${archivePath}" -d "${tempDir}"`, { stdio: 'ignore' });
        }

        // 3. Move skills to root
        const extractedRoot = path.join(tempDir, 'antigravity-awesome-skills-main');
        const srcSkills = path.join(extractedRoot, 'skills');
        const srcIndex = path.join(extractedRoot, 'skills_index.json');
        const destSkills = path.join(ROOT_DIR, 'skills');
        const destIndex = path.join(ROOT_DIR, 'skills_index.json');

        if (!fs.existsSync(srcSkills)) {
            throw new Error('Skills folder not found in downloaded archive.');
        }

        console.log('[Sync] Updating skills...');
        if (fs.existsSync(destSkills)) fs.rmSync(destSkills, { recursive: true, force: true });
        fs.renameSync(srcSkills, destSkills);
        if (fs.existsSync(srcIndex)) fs.copyFileSync(srcIndex, destIndex);

        // Save SHA
        if (remoteSha) fs.writeFileSync(SHA_FILE, remoteSha, 'utf-8');

        return { upToDate: false };

    } finally {
        if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

// ─── Vite Plugin ───

export default function refreshSkillsPlugin() {
    return {
        name: 'refresh-skills',
        configureServer(server) {
            // Serve /skills.json directly from ROOT_DIR
            server.middlewares.use('/skills.json', (req, res, next) => {
                const filePath = path.join(ROOT_DIR, 'skills_index.json');
                if (fs.existsSync(filePath)) {
                    res.setHeader('Content-Type', 'application/json');
                    fs.createReadStream(filePath).pipe(res);
                } else {
                    next();
                }
            });

            // Serve /skills/* directly from ROOT_DIR/skills/
            server.middlewares.use((req, res, next) => {
                if (!req.url || !req.url.startsWith('/skills/')) return next();

                const relativePath = decodeURIComponent(req.url.replace(/\?.*$/, ''));
                const filePath = path.join(ROOT_DIR, relativePath);
                const safeRealPath = fs.existsSync(filePath)
                    ? resolveSafeRealPath(path.join(ROOT_DIR, 'skills'), filePath)
                    : null;

                if (!safeRealPath) return next();

                if (fs.statSync(safeRealPath).isFile()) {
                    const ext = path.extname(filePath).toLowerCase();
                    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
                    fs.createReadStream(safeRealPath).pipe(res);
                } else {
                    next();
                }
            });

            // Sync API endpoint
            server.middlewares.use('/api/refresh-skills', async (req, res) => {
                res.setHeader('Content-Type', 'application/json');

                if (req.method !== 'POST') {
                    res.statusCode = 405;
                    res.setHeader('Allow', 'POST');
                    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
                    return;
                }

                if (!req.headers?.host || !req.headers?.origin) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ success: false, error: 'Missing request host or origin headers' }));
                    return;
                }

                if (!isDevLoopbackRequest(req)) {
                    res.statusCode = 403;
                    res.end(JSON.stringify({ success: false, error: 'Only local loopback requests are allowed' }));
                    return;
                }

                if (!isAllowedDevOrigin(req)) {
                    res.statusCode = 403;
                    res.end(JSON.stringify({ success: false, error: 'Forbidden origin' }));
                    return;
                }

                if (!isTokenAuthorized(req)) {
                    res.statusCode = 401;
                    res.end(JSON.stringify({ success: false, error: 'Invalid or missing refresh token' }));
                    return;
                }

                try {
                    let result;

                    if (isGitAvailable()) {
                        console.log('[Sync] Using git (fast path)...');
                        result = await syncWithGit();
                    } else {
                        console.log('[Sync] Git not available, using archive download (slower)...');
                        result = await syncWithArchive();
                    }

                    if (result.upToDate) {
                        console.log('[Sync] ✅ Already up to date!');
                        res.end(JSON.stringify({ success: true, upToDate: true }));
                        return;
                    }

                    // Count skills
                    const indexPath = path.join(ROOT_DIR, 'skills_index.json');
                    let count = 0;
                    if (fs.existsSync(indexPath)) {
                        const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
                        count = Array.isArray(data) ? data.length : 0;
                    }

                    console.log(`[Sync] ✅ Successfully synced ${count} skills!`);
                    res.end(JSON.stringify({ success: true, upToDate: false, count }));

                } catch (err) {
                    console.error('[Sync] ❌ Failed:', err.message);
                    res.statusCode = 500;
                    res.end(JSON.stringify({ success: false, error: err.message }));
                }
            });
        }
    };
}

export { isAllowedDevOrigin };
