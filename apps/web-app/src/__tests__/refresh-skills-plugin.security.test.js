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
  const registration = registrations.find((item) => item.path === '/api/refresh-skills');
  if (!registration) {
    throw new Error('refresh-skills handler not registered');
  }
  return registration.handler;
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
});
