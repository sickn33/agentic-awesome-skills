# Authentication and Authorization Implementation Patterns Implementation Playbook

These are integration sketches, not a complete authentication service. Supply project-specific database adapters, validated configuration, request types, error handling and tests before use. Check the installed library versions; never paste an example into production without exercising the rejection cases below.

## Core Concepts

### 1. Authentication vs Authorization

**Authentication (AuthN)**: Who are you?
- Verifying identity (username/password, OAuth, biometrics)
- Issuing credentials (sessions, tokens)
- Managing login/logout

**Authorization (AuthZ)**: What can you do?
- Permission checking
- Role-based access control (RBAC)
- Resource ownership validation
- Policy enforcement

### 2. Authentication Strategies

**Session-Based:**
- Server stores session state
- Session ID in cookie
- Traditional, simple, stateful

**Token-Based (JWT):**
- Stateless, self-contained
- Scales horizontally
- Can store claims

**OAuth2/OpenID Connect:**
- OAuth delegates authorization; OpenID Connect adds identity verification
- Social login (Google, GitHub)
- Enterprise SSO

## JWT Authentication

### Pattern 1: JWT Implementation

```typescript
// JWT structure: header.payload.signature
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    iat: number;
    exp: number;
}

// Generate JWT
function generateTokens(userId: string, email: string, role: string) {
    const accessToken = jwt.sign(
        { userId, email, role },
        process.env.JWT_SECRET!,
        { expiresIn: '15m', algorithm: 'HS256', issuer: 'example-auth', audience: 'example-api' }
    );

    const refreshToken = jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d', algorithm: 'HS256', issuer: 'example-auth', audience: 'example-refresh' }
    );

    return { accessToken, refreshToken };
}

// Verify JWT
function verifyToken(token: string): JWTPayload {
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!, {
            algorithms: ['HS256'], issuer: 'example-auth', audience: 'example-api',
        });
        if (typeof payload === 'string' || typeof payload.userId !== 'string'
            || typeof payload.email !== 'string' || typeof payload.role !== 'string'
            || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp)
            || Number(payload.exp) <= Number(payload.iat)) {
            throw new Error('Invalid claims');
        }
        return payload as JWTPayload;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid token');
        }
        throw error;
    }
}

// Middleware
function authenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    try {
        const payload = verifyToken(token);
        req.user = payload;  // Attach user to request
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Usage
app.get('/api/profile', authenticate, (req, res) => {
    res.json({ user: req.user });
});
```

### Pattern 2: Refresh Token Flow

A signed refresh token is not sufficient revocation state. The access and refresh audiences above are deliberately distinct. Prefer the identity provider's implemented refresh flow; if the application owns it, implement this transaction contract with project-specific adapters:

```text
Validate the refresh signature, fixed algorithm, issuer, refresh audience and expiry.
Compute a deterministic keyed digest of the high-entropy token; never store its raw value.
In one database transaction, lock the token record and check expiry/revocation/user status.
Mark the old token consumed, create a new refresh token and store its digest in the same family.
Commit before returning the new token pair; a second use must not issue another pair.
On reuse, revoke the token family and require reauthentication according to the recovery policy.
Logout revokes the relevant family; password/account changes invalidate affected sessions.
```

Do not use a freshly salted password hash as a lookup key, or perform check-then-delete outside a transaction. Concurrent refresh, lost responses and reuse handling require integration tests. Cookie-based refresh endpoints also need CSRF defenses. The illustrative `generateTokens` function above only issues tokens; it does not implement storage, rotation or revocation.

## Session-Based Authentication

### Pattern 1: Express Session

```typescript
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';

// Setup Redis for session storage
const redisClient = createClient({
    url: process.env.REDIS_URL,
});
await redisClient.connect();

app.use(
    session({
        store: new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        prefix: 'login-rate:',
    }),
        secret: process.env.SESSION_SECRET!,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',  // HTTPS only
            httpOnly: true,  // No JavaScript access
            maxAge: 24 * 60 * 60 * 1000,  // 24 hours
            sameSite: 'strict',  // Defense in depth; also enforce the app's CSRF policy
        },
    })
);

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await db.users.findOne({ email });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Regenerate after authentication to prevent session fixation.
    req.session.regenerate((err) => {
        if (err) return res.status(500).json({ error: 'Login failed' });
        req.session.userId = user.id;
        req.session.role = user.role;
        req.session.save((saveError) => {
            if (saveError) return res.status(500).json({ error: 'Login failed' });
            res.json({ user: { id: user.id, email: user.email, role: user.role } });
        });
    });
});

// Session middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
}

// Protected route
app.get('/api/profile', requireAuth, async (req, res) => {
    const user = await db.users.findById(req.session.userId);
    res.json({ user });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' });
    });
});
```

## OAuth2 / Social Login

### Browser login callback contract

Use the installed provider SDK's authorization-code flow with state, PKCE and, for OIDC, nonce and ID-token validation as applicable. Bind the callback to the original browser session, use an exact registered redirect URI, and identify an account by the validated issuer/subject pair. Do not automatically link accounts by an unverified email.

```text
Start: create state/nonce/PKCE verifier using the provider SDK and bind them to this browser.
Callback: verify the binding, exchange the code server-side, validate provider identity.
Resolve the local user and current access policy; rotate the server session ID.
Set the protected session cookie, then redirect to a fixed, allowlisted application path.
Expected: no access or refresh token appears in the URL, browser history or redirect logs.
```

The exact SDK setup depends on the provider. Do not treat a bare Passport callback as a complete OIDC implementation. Keep long-lived provider credentials server-side and out of analytics and logs.

## Authorization Patterns

### Pattern 1: Role-Based Access Control (RBAC)

```typescript
enum Role {
    USER = 'user',
    MODERATOR = 'moderator',
    ADMIN = 'admin',
}

const roleHierarchy: Record<Role, Role[]> = {
    [Role.ADMIN]: [Role.ADMIN, Role.MODERATOR, Role.USER],
    [Role.MODERATOR]: [Role.MODERATOR, Role.USER],
    [Role.USER]: [Role.USER],
};

function hasRole(userRole: Role, requiredRole: Role): boolean {
    return roleHierarchy[userRole]?.includes(requiredRole) ?? false;
}

// Middleware
function requireRole(...roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!roles.some(role => hasRole(req.user.role, role))) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
}

// Usage
app.delete('/api/users/:id',
    authenticate,
    requireRole(Role.ADMIN),
    async (req, res) => {
        // Only admins can delete users
        await db.users.delete(req.params.id);
        res.json({ message: 'User deleted' });
    }
);
```

### Pattern 2: Permission-Based Access Control

```typescript
enum Permission {
    READ_USERS = 'read:users',
    WRITE_USERS = 'write:users',
    DELETE_USERS = 'delete:users',
    READ_POSTS = 'read:posts',
    WRITE_POSTS = 'write:posts',
}

const rolePermissions: Record<Role, Permission[]> = {
    [Role.USER]: [Permission.READ_POSTS, Permission.WRITE_POSTS],
    [Role.MODERATOR]: [
        Permission.READ_POSTS,
        Permission.WRITE_POSTS,
        Permission.READ_USERS,
    ],
    [Role.ADMIN]: Object.values(Permission),
};

function hasPermission(userRole: Role, permission: Permission): boolean {
    return rolePermissions[userRole]?.includes(permission) ?? false;
}

function requirePermission(...permissions: Permission[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const hasAllPermissions = permissions.every(permission =>
            hasPermission(req.user.role, permission)
        );

        if (!hasAllPermissions) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
}

// Usage
app.get('/api/users',
    authenticate,
    requirePermission(Permission.READ_USERS),
    async (req, res) => {
        const users = await db.users.findAll();
        res.json({ users });
    }
);
```

### Pattern 3: Resource Ownership

```typescript
// Check if user owns resource
function requireOwnership(
    resourceType: 'post' | 'comment',
    resourceIdParam: string = 'id'
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const resourceId = req.params[resourceIdParam];

        // No implicit administrator bypass: tenant and resource policy still apply.
        // Check ownership
        let resource;
        if (resourceType === 'post') {
            resource = await db.posts.findById(resourceId);
        } else if (resourceType === 'comment') {
            resource = await db.comments.findById(resourceId);
        }

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        if (resource.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        next();
    };
}

// Usage
app.put('/api/posts/:id',
    authenticate,
    requireOwnership('post'),
    async (req, res) => {
        // User can only update their own posts
        // Parse an allowlisted update DTO and include owner/tenant predicates in the write.
        const update = postUpdateSchema.parse(req.body);
        const post = await db.posts.updateOwned(req.params.id, req.user.userId, update);
        res.json({ post });
    }
);
```

## Security Best Practices

### Pattern 1: Password Security

```typescript
import bcrypt from 'bcrypt';
import { z } from 'zod';

// Illustrative single-factor length policy: no mandatory character-class rules.
// Also check a compromised/common-password blocklist. Account recovery and MFA matter.
const passwordSchema = z.string().min(15).max(128);

// Hash password
async function hashPassword(password: string): Promise<string> {
    const saltRounds = 12;  // 2^12 iterations
    // Legacy bcrypt has a 72-byte input limit; never silently truncate.
    if (Buffer.byteLength(password, 'utf8') > 72) throw new Error('Unsupported password length');
    return bcrypt.hash(password, saltRounds);
}

// Verify password
async function verifyPassword(
    password: string,
    hash: string
): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// Registration with password validation
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate password
        passwordSchema.parse(password);

        // Check if user exists
        const existingUser = await db.users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const user = await db.users.create({
            email,
            passwordHash,
        });

        // Generate tokens
        const tokens = generateTokens(user.id, user.email, user.role);

        res.status(201).json({
            user: { id: user.id, email: user.email },
            ...tokens,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(500).json({ error: 'Registration failed' });
    }
});
```

### Pattern 2: Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

// Login rate limiter
const loginLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        prefix: 'login-rate:',
    }),
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,  // 5 attempts
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// API rate limiter
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 100,  // 100 requests per minute
    standardHeaders: true,
});

// Apply to routes
app.post('/api/auth/login', loginLimiter, async (req, res) => {
    // Login logic
});

app.use('/api/', apiLimiter);
```

## Best Practices

1. **Never Store Plain Passwords**: Always hash with bcrypt/argon2
2. **Use HTTPS**: Encrypt data in transit
3. **Short-Lived Access Tokens**: 15-30 minutes max
4. **Secure Cookies**: httpOnly, secure, sameSite flags
5. **Validate All Input**: Email format, password strength
6. **Rate Limit Auth Endpoints**: Prevent brute force attacks
7. **Implement CSRF Protection**: For session-based auth
8. **Rotate Secrets Regularly**: JWT secrets, session secrets
9. **Log Security Events**: Login attempts, failed auth
10. **Use MFA When Possible**: Extra security layer

## Common Pitfalls

- **Weak Passwords**: Enforce strong password policies
- **JWT in localStorage**: Vulnerable to XSS, use httpOnly cookies
- **No Token Expiration**: Tokens should expire
- **Client-Side Auth Checks Only**: Always validate server-side
- **Insecure Password Reset**: Use secure tokens with expiration
- **No Rate Limiting**: Vulnerable to brute force
- **Trusting Client Data**: Always validate on server

## Verification and references

Test expired/wrong-audience/wrong-issuer/wrong-algorithm tokens, unknown roles, cross-tenant ownership, refresh reuse/concurrency, login session-ID rotation, logout invalidation and CSRF rejection. Verify logs and redirect URLs contain no credentials. These are required project checks, not results claimed by this example.

For new password storage use a reviewed scheme that supports the full accepted password length, such as Argon2id; the legacy bcrypt sketch above deliberately rejects oversized inputs and is not a complete modern password policy. See [NIST password guidance](https://pages.nist.gov/800-63-4/sp800-63b.html), [JWT BCP](https://www.rfc-editor.org/rfc/rfc8725.html), [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [express-session](https://expressjs.com/en/resources/middleware/session/), [connect-redis](https://github.com/tj/connect-redis), [rate-limit-redis](https://github.com/express-rate-limit/rate-limit-redis), and [Zod error issues](https://zod.dev/error-customization). No unbundled reference files are implied.
