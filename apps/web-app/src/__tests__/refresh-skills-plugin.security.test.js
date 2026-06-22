import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const execSync = vi.fn((command) => {
  if (command === 'git --version') return '';
  if (command === 'git rev-parse --git-dir') return '.git';
  if (command === 'git remote') return 'origin\nupstream\n';
  if (command === 'git rev-parse HEAD') return 'abc123';
  if (command === 'git fetch upstream main') return '';
  if (command === 'git rev-parse upstream/main') return 'abc123';
  return '';
});

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    execSync,
    default: {
      ...actual,
      execSync,
    },
  };
});

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(payload) {
      this.body = payload;
    },
  };
}

function writeOctal(buffer, offset, length, value) {
  const text = value.toString(8).padStart(length - 1, '0');
  buffer.write(text.slice(-(length - 1)), offset, length - 1, 'ascii');
  buffer[offset + length - 1] = 0;
}

function createTarHeader(name, { type = '0', data = Buffer.alloc(0), linkName = '' } = {}) {
  const header = Buffer.alloc(512, 0);
  header.write(name, 0, Math.min(Buffer.byteLength(name), 100), 'utf8');
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, data.length);
  writeOctal(header, 136, 12, 0);
  header.fill(0x20, 148, 156);
  header.write(type, 156, 1, 'ascii');
  header.write(linkName, 157, Math.min(Buffer.byteLength(linkName), 100), 'utf8');
  header.write('ustar', 257, 5, 'ascii');
  header.write('00', 263, 2, 'ascii');
  let checksum = 0;
  for (const byte of header) checksum += byte;
  const checksumText = checksum.toString(8).padStart(6, '0');
  header.write(checksumText, 148, 6, 'ascii');
  header[154] = 0;
  header[155] = 0x20;
  return header;
}

function createTarGzip(entries) {
  const blocks = [];
  for (const entry of entries) {
    const data = Buffer.from(entry.data || '');
    blocks.push(createTarHeader(entry.name, { ...entry, data }));
    if (data.length) {
      blocks.push(data);
      const padding = (512 - (data.length % 512)) % 512;
      if (padding) blocks.push(Buffer.alloc(padding, 0));
    }
  }
  blocks.push(Buffer.alloc(1024, 0));
  return zlib.gzipSync(Buffer.concat(blocks));
}

function createPaxRecord(key, value) {
  let record = ` ${key}=${value}\n`;
  let length = Buffer.byteLength(record);
  while (true) {
    const next = `${length}${record}`;
    const nextLength = Buffer.byteLength(next);
    if (nextLength === length) return next;
    length = nextLength;
  }
}

async function loadRefreshHandler() {
  const { default: refreshSkillsPlugin } = await import('../../refresh-skills-plugin.js');
  const registrations = [];
  const server = {
    middlewares: {
      use(pathOrHandler, maybeHandler) {
        if (typeof pathOrHandler === 'string') {
          registrations.push({ path: pathOrHandler, handler: maybeHandler });
          return;
        }
        registrations.push({ path: null, handler: pathOrHandler });
      },
    },
  };

  refreshSkillsPlugin().configureServer(server);
  const apiHandlers = registrations
    .filter((item) => item.path === '/api/refresh-skills')
    .map((item) => item.handler);
  if (!apiHandlers.length) {
    throw new Error('refresh-skills handler not registered');
  }
  return async (req, res) => {
    let index = 0;
    const next = async () => {
      const handler = apiHandlers[index++];
      if (handler) await handler(req, res, next);
    };
    await next();
  };
}

describe('refresh-skills plugin security', () => {
  beforeEach(() => {
    execSync.mockClear();
    delete process.env.SKILLS_REFRESH_TOKEN;
  });

  it('rejects GET requests for the sync endpoint', async () => {
    const handler = await loadRefreshHandler();
    const req = {
      method: 'GET',
      headers: {
        host: 'localhost:5173',
        origin: 'http://localhost:5173',
      },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
  });

  it('rejects cross-origin POST requests for the sync endpoint', async () => {
    const handler = await loadRefreshHandler();
    const req = {
      method: 'POST',
      headers: {
        host: 'localhost:5173',
        origin: 'http://evil.test',
      },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
  });

  it('rejects non-loopback POST requests for the sync endpoint', async () => {
    const handler = await loadRefreshHandler();
    const req = {
      method: 'POST',
      headers: {
        host: '192.168.1.1:5173',
        origin: 'http://192.168.1.1:5173',
      },
      socket: {
        remoteAddress: '192.168.1.1',
      },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch('loopback');
  });

  it('rejects requests from a non-loopback remote address even when host headers look local', async () => {
    const handler = await loadRefreshHandler();
    const req = {
      method: 'POST',
      headers: {
        host: 'localhost:5173',
        origin: 'http://localhost:5173',
      },
      socket: {
        remoteAddress: '203.0.113.7',
      },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toMatch('loopback');
  });

  it('rejects token-less requests when refresh token is configured', async () => {
    process.env.SKILLS_REFRESH_TOKEN = 'super-secret-token';
    const handler = await loadRefreshHandler();
    const req = {
      method: 'POST',
      headers: {
        host: 'localhost:5173',
        origin: 'http://localhost:5173',
      },
      socket: {
        remoteAddress: '127.0.0.1',
      },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
  });

  it('accepts local requests by default without a refresh token', async () => {
    const handler = await loadRefreshHandler();
    const req = {
      method: 'POST',
      headers: {
        host: 'localhost:5173',
        origin: 'http://localhost:5173',
      },
      socket: {
        remoteAddress: '127.0.0.1',
      },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('accepts IPv6 loopback requests by default without a refresh token', async () => {
    const handler = await loadRefreshHandler();
    const req = {
      method: 'POST',
      headers: {
        host: '[::1]:5173',
        origin: 'http://[::1]:5173',
      },
      socket: {
        remoteAddress: '::1',
      },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('does not reset local repository state when fast-forward sync fails', async () => {
    execSync.mockImplementation((command) => {
      if (command === 'git --version') return '';
      if (command === 'git rev-parse --git-dir') return '.git';
      if (command === 'git remote') return 'origin\nupstream\n';
      if (command === 'git rev-parse HEAD') return 'abc123';
      if (command === 'git fetch upstream main') return '';
      if (command === 'git rev-parse upstream/main') return 'def456';
      if (command === 'git merge upstream/main --ff-only') {
        throw new Error('Not possible to fast-forward');
      }
      if (command.startsWith('git reset --hard')) {
        throw new Error('reset should not be called');
      }
      return '';
    });

    const handler = await loadRefreshHandler();
    const req = {
      method: 'POST',
      headers: {
        host: 'localhost:5173',
        origin: 'http://localhost:5173',
      },
      socket: {
        remoteAddress: '127.0.0.1',
      },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error).toMatch('Fast-forward sync failed');
    expect(execSync).not.toHaveBeenCalledWith(
      expect.stringContaining('git reset --hard'),
      expect.anything(),
    );
  });

  it('rejects POST requests with missing host/origin headers', async () => {
    const handler = await loadRefreshHandler();
    const req = {
      method: 'POST',
      headers: {
        host: 'localhost:5173',
      },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
  });

  it('rejects unsafe archive entry paths before fallback extraction', async () => {
    const {
      assertSafeArchiveEntries,
      validateArchiveEntryName,
    } = await import('../../refresh-skills-plugin.js');

    expect(validateArchiveEntryName('antigravity-awesome-skills-main/skills/demo/SKILL.md')).toBe(true);
    expect(validateArchiveEntryName('../outside')).toBe(false);
    expect(validateArchiveEntryName('/tmp/outside')).toBe(false);
    expect(validateArchiveEntryName('other-root/skills/demo/SKILL.md')).toBe(false);
    expect(() => assertSafeArchiveEntries(['antigravity-awesome-skills-main/../../outside'])).toThrow(
      'Unsafe archive entry path',
    );
  });

  it('rejects symlink entries in tar archive listings', async () => {
    const { assertSafeArchiveEntries } = await import('../../refresh-skills-plugin.js');

    expect(() =>
      assertSafeArchiveEntries(
        ['antigravity-awesome-skills-main/skills/demo -> /tmp/outside'],
        { rejectSymlinks: true },
      ),
    ).toThrow('Unsafe archive symlink entry');
  });

  it('reads tar.gz entries to safe archive entry names without verbose tar parsing', async () => {
    const {
      assertSafeArchiveEntries,
      readTarGzipEntries,
    } = await import('../../refresh-skills-plugin.js');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-entry-test-'));
    const archivePath = path.join(tempDir, 'safe.tar.gz');

    try {
      fs.writeFileSync(
        archivePath,
        createTarGzip([
          { name: 'antigravity-awesome-skills-main/' },
          { name: 'antigravity-awesome-skills-main/skills/demo/SKILL.md', data: 'demo' },
        ]),
      );
      const entries = readTarGzipEntries(archivePath);

      expect(entries.map((entry) => entry.name)).toEqual([
        'antigravity-awesome-skills-main/',
        'antigravity-awesome-skills-main/skills/demo/SKILL.md',
      ]);
      expect(() => assertSafeArchiveEntries(entries, { rejectLinks: true })).not.toThrow();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects tar.gz symlink entries before fallback extraction', async () => {
    const {
      assertSafeArchiveEntries,
      readTarGzipEntries,
    } = await import('../../refresh-skills-plugin.js');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-link-test-'));
    const archivePath = path.join(tempDir, 'link.tar.gz');

    try {
      fs.writeFileSync(
        archivePath,
        createTarGzip([
          {
            name: 'antigravity-awesome-skills-main/link',
            type: '2',
            linkName: '/tmp/outside',
          },
        ]),
      );
      const entries = readTarGzipEntries(archivePath);

      expect(entries[0].type).toBe('2');
      expect(() => assertSafeArchiveEntries(entries, { rejectLinks: true })).toThrow(
        'Unsafe archive link entry',
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('prefers PAX tar paths over GNU long names before validation', async () => {
    const {
      assertSafeArchiveEntries,
      readTarGzipEntries,
    } = await import('../../refresh-skills-plugin.js');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-pax-test-'));
    const archivePath = path.join(tempDir, 'pax.tar.gz');

    try {
      fs.writeFileSync(
        archivePath,
        createTarGzip([
          {
            name: 'pax-header',
            type: 'x',
            data: createPaxRecord('path', '../outside'),
          },
          {
            name: '././@LongLink',
            type: 'L',
            data: 'antigravity-awesome-skills-main/skills/demo/SKILL.md\0',
          },
          {
            name: 'antigravity-awesome-skills-main/skills/demo/SKILL.md',
            data: 'demo',
          },
        ]),
      );
      const entries = readTarGzipEntries(archivePath);

      expect(entries[0].name).toBe('../outside');
      expect(() => assertSafeArchiveEntries(entries, { rejectLinks: true })).toThrow(
        'Unsafe archive entry path',
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
