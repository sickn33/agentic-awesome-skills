import https from 'https';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
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
const ARCHIVE_ROOT = 'antigravity-awesome-skills-main/';

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

function isPathInside(parentPath, childPath) {
    const relative = path.relative(parentPath, childPath);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function normalizeArchiveEntryName(entryName) {
    return String(entryName || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function validateArchiveEntryName(entryName) {
    const normalized = normalizeArchiveEntryName(entryName);
    const parts = normalized.split('/').filter(Boolean);

    if (!normalized || normalized.startsWith('/') || normalized.includes('\0')) {
        return false;
    }
    if (path.isAbsolute(normalized) || parts.some((part) => part === '..' || part === '.')) {
        return false;
    }
    return normalized === ARCHIVE_ROOT.slice(0, -1) || normalized.startsWith(ARCHIVE_ROOT);
}

function archiveEntryName(entry) {
    return typeof entry === 'string' ? entry : entry?.name;
}

function archiveEntryType(entry) {
    return typeof entry === 'string' ? '' : String(entry?.type || '');
}

function assertSafeArchiveEntries(entries, { rejectLinks = false, rejectSymlinks = rejectLinks } = {}) {
    for (const rawEntry of entries) {
        const entry = String(archiveEntryName(rawEntry) || '').trim();
        if (!entry) continue;
        const entryType = archiveEntryType(rawEntry);
        if (rejectSymlinks && typeof rawEntry === 'string' && /\s+->\s+/.test(entry)) {
            throw new Error(`Unsafe archive symlink entry: ${entry}`);
        }
        if (rejectLinks && (entryType === '1' || entryType === '2')) {
            throw new Error(`Unsafe archive link entry: ${entry}`);
        }
        if (!validateArchiveEntryName(entry)) {
            throw new Error(`Unsafe archive entry path: ${entry}`);
        }
    }
}

function readTarString(block, start, length) {
    const bytes = block.subarray(start, start + length);
    const end = bytes.indexOf(0);
    return bytes.subarray(0, end === -1 ? bytes.length : end).toString('utf8');
}

function readTarNumber(block, start, length) {
    const raw = readTarString(block, start, length).trim();
    return raw ? Number.parseInt(raw.replace(/\0/g, '').trim(), 8) || 0 : 0;
}

function parsePaxRecords(buffer) {
    const records = {};
    let offset = 0;

    while (offset < buffer.length) {
        const space = buffer.indexOf(0x20, offset);
        if (space === -1) break;
        const length = Number.parseInt(buffer.subarray(offset, space).toString('ascii'), 10);
        if (!Number.isInteger(length) || length <= 0 || offset + length > buffer.length) break;
        const record = buffer.subarray(space + 1, offset + length - 1).toString('utf8');
        const equals = record.indexOf('=');
        if (equals > 0) {
            records[record.slice(0, equals)] = record.slice(equals + 1);
        }
        offset += length;
    }

    return records;
}

function readTarGzipEntries(archivePath) {
    const archive = zlib.gunzipSync(fs.readFileSync(archivePath));
    const entries = [];
    let offset = 0;
    let pax = {};
    let longName = null;
    let longLink = null;

    while (offset + 512 <= archive.length) {
        const header = archive.subarray(offset, offset + 512);
        if (header.every((byte) => byte === 0)) break;

        const type = String.fromCharCode(header[156] || 0);
        const size = readTarNumber(header, 124, 12);
        const dataStart = offset + 512;
        const dataEnd = dataStart + size;
        const data = archive.subarray(dataStart, Math.min(dataEnd, archive.length));
        const dataBlocks = Math.ceil(size / 512) * 512;

        if (type === 'x' || type === 'g') {
            pax = { ...pax, ...parsePaxRecords(data) };
        } else if (type === 'L') {
            longName = data.toString('utf8').replace(/\0.*$/s, '');
        } else if (type === 'K') {
            longLink = data.toString('utf8').replace(/\0.*$/s, '');
        } else {
            const name = pax.path || longName || [readTarString(header, 345, 155), readTarString(header, 0, 100)]
                .filter(Boolean)
                .join('/');
            const linkName = pax.linkpath || longLink || readTarString(header, 157, 100);
            entries.push({ name, type: type || '0', linkName });
            pax = {};
            longName = null;
            longLink = null;
        }

        offset += 512 + dataBlocks;
    }

    return entries;
}

function findZipEndOfCentralDirectory(buffer) {
    const minOffset = Math.max(0, buffer.length - 22 - 0xffff);
    for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
        if (buffer.readUInt32LE(offset) === 0x06054b50) {
            return offset;
        }
    }
    throw new Error('ZIP end of central directory not found.');
}

function readZipEntries(archivePath) {
    const archive = fs.readFileSync(archivePath);
    const eocd = findZipEndOfCentralDirectory(archive);
    const totalEntries = archive.readUInt16LE(eocd + 10);
    const centralSize = archive.readUInt32LE(eocd + 12);
    const centralOffset = archive.readUInt32LE(eocd + 16);

    if (totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
        throw new Error('ZIP64 archives are not supported by the safe archive validator.');
    }

    const entries = [];
    let offset = centralOffset;
    const centralEnd = centralOffset + centralSize;

    while (offset < centralEnd) {
        if (archive.readUInt32LE(offset) !== 0x02014b50) {
            throw new Error('Invalid ZIP central directory entry.');
        }

        const fileNameLength = archive.readUInt16LE(offset + 28);
        const extraLength = archive.readUInt16LE(offset + 30);
        const commentLength = archive.readUInt16LE(offset + 32);
        const externalAttributes = archive.readUInt32LE(offset + 38);
        const nameStart = offset + 46;
        const name = archive.subarray(nameStart, nameStart + fileNameLength).toString('utf8');
        const unixMode = externalAttributes >>> 16;
        const fileType = unixMode & 0o170000;

        entries.push({
            name,
            type: fileType === 0o120000 ? '2' : name.endsWith('/') ? '5' : '0',
        });

        offset = nameStart + fileNameLength + extraLength + commentLength;
    }

    if (entries.length !== totalEntries) {
        throw new Error('ZIP central directory entry count mismatch.');
    }

    return entries;
}

function assertSafeExtractedTree(extractedRoot, tempDir) {
    const tempRealPath = fs.realpathSync(tempDir);
    const rootRealPath = fs.realpathSync(extractedRoot);

    if (!isPathInside(tempRealPath, rootRealPath)) {
        throw new Error(`Archive extracted outside temporary root: ${extractedRoot}`);
    }

    const stack = [extractedRoot];
    while (stack.length) {
        const current = stack.pop();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const entryPath = path.join(current, entry.name);
            const realPath = fs.realpathSync(entryPath);
            if (!isPathInside(tempRealPath, realPath)) {
                throw new Error(`Archive entry escapes temporary root: ${entryPath}`);
            }
            if (entry.isSymbolicLink()) {
                throw new Error(`Archive contains a symlink entry: ${entryPath}`);
            }
            if (entry.isDirectory()) {
                stack.push(entryPath);
            }
        }
    }
}

function listArchiveEntries(archivePath, useTar) {
    if (useTar) {
        assertSafeArchiveEntries(readTarGzipEntries(archivePath), { rejectLinks: true });
        return;
    }

    assertSafeArchiveEntries(readZipEntries(archivePath), { rejectLinks: true });
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

        // 2. Validate and extract
        console.log('[Sync] Extracting...');
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        fs.mkdirSync(tempDir, { recursive: true });

        listArchiveEntries(archivePath, useTar);

        if (useTar) {
            execSync(`tar -xzf "${archivePath}" --no-same-owner -C "${tempDir}"`, { stdio: 'ignore' });
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

        if (!fs.existsSync(extractedRoot)) {
            throw new Error('Expected archive root folder not found in downloaded archive.');
        }
        assertSafeExtractedTree(extractedRoot, tempDir);

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

export {
    assertSafeArchiveEntries,
    assertSafeExtractedTree,
    normalizeArchiveEntryName,
    readTarGzipEntries,
    readZipEntries,
    validateArchiveEntryName,
};

export { isAllowedDevOrigin };
