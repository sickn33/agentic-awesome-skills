# Testing Guide - Backend Testing Strategies

> Scope: independent illustrative fragments, not a supplied runnable application. Private project paths, helpers, DTOs and Prisma models must be implemented/adapted in the target repository. Pin and check installed Express/Sentry/Zod/Prisma versions. Authentication does not grant object/tenant access; authorize before reads/writes, enforce CSRF for cookie authentication, allowlist DTOs and project public response fields. Capture unexpected errors once at an approved, redacted boundary; never send raw request bodies, credentials or personal data to telemetry.


Complete guide to testing backend services with Jest and best practices.

## Table of Contents

- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [Mocking Strategies](#mocking-strategies)
- [Test Data Management](#test-data-management)
- [Testing Authenticated Routes](#testing-authenticated-routes)
- [Coverage Targets](#coverage-targets)

---

## Unit Testing

### Test Structure

```typescript
// services/userService.test.ts
import { UserService } from './userService';
import { UserRepository } from '../repositories/UserRepository';

jest.mock('../repositories/UserRepository');

describe('UserService', () => {
    let service: UserService;
    let mockRepository: jest.Mocked<UserRepository>;

    beforeEach(() => {
        mockRepository = {
            findByEmail: jest.fn(),
            create: jest.fn(),
        } as any;

        service = new UserService(mockRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should throw error if email exists', async () => {
            mockRepository.findByEmail.mockResolvedValue({ id: '123' } as any);

            await expect(
                service.create({ email: 'test@test.com' })
            ).rejects.toThrow('Email already in use');
        });

        it('should create user if email is unique', async () => {
            mockRepository.findByEmail.mockResolvedValue(null);
            mockRepository.create.mockResolvedValue({ id: '123' } as any);

            const user = await service.create({
                email: 'test@test.com',
                firstName: 'John',
                lastName: 'Doe',
            });

            expect(user).toBeDefined();
            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'test@test.com'
                })
            );
        });
    });
});
```

---

## Integration Testing

### Test with an Isolated Test Database

Before any create/delete fixture, assert the exact test database identity, least-privilege credentials and isolated schema. Never run these examples on production. Use unique fixture IDs and finally cleanup only owned rows.

```typescript
import { PrismaService } from '@project-lifecycle-portal/database';

describe('UserService Integration', () => {
    let testUser: any;

    beforeAll(async () => {
        // Create test data
        testUser = await PrismaService.main.user.create({
            data: {
                email: 'test@test.com',
                profile: { create: { firstName: 'Test', lastName: 'User' } },
            },
        });
    });

    afterAll(async () => {
        // Cleanup
        await PrismaService.main.user.delete({ where: { id: testUser.id } });
    });

    it('should find user by email', async () => {
        const user = await userService.findByEmail('test@test.com');
        expect(user).toBeDefined();
        expect(user?.email).toBe('test@test.com');
    });
});
```

---

## Mocking Strategies

### Mock PrismaService

```typescript
jest.mock('@project-lifecycle-portal/database', () => ({
    PrismaService: {
        main: {
            user: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
        },
        isAvailable: true,
    },
}));
```

### Mock Services

```typescript
const mockUserService = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
} as jest.Mocked<UserService>;
```

---

## Test Data Management

### Setup and Teardown

```typescript
describe('PermissionService', () => {
    let instanceId: number;

    beforeAll(async () => {
        // Create test post
        const post = await PrismaService.main.post.create({
            data: { title: 'Test Post', content: 'Test', authorId: 'test-user' },
        });
        instanceId = post.id;
    });

    afterAll(async () => {
        // Cleanup
        await PrismaService.main.post.delete({
            where: { id: instanceId },
        });
    });

    beforeEach(() => {
        // Clear caches
        permissionService.clearCache();
    });

    it('should check permissions', async () => {
        const hasPermission = await permissionService.checkPermission(
            'user-id',
            instanceId,
            'VIEW_WORKFLOW'
        );
        expect(hasPermission).toBeDefined();
    });
});
```

---

## Testing Authenticated Routes

### Authenticated endpoint checks

No test-auth-route script is supplied by this bundle. Use the target repository’s existing HTTP test harness against an isolated test app. Mocking identity tests downstream logic only: add independent tests for expired/wrong-issuer/wrong-audience tokens, forbidden object access, tenant boundaries and CSRF.

### Mock Authentication in Tests

```typescript
// Mock auth middleware
jest.mock('../middleware/SSOMiddleware', () => ({
    SSOMiddlewareClient: {
        verifyLoginStatus: (req, res, next) => {
            res.locals.claims = {
                sub: 'test-user-id',
                preferred_username: 'testuser',
            };
            next();
        },
    },
}));
```

---

## Coverage Targets

### Recommended Coverage

- **Unit Tests**: 70%+ coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Happy paths covered

### Run Coverage

```bash
npm test -- --coverage
```

---

**Related Files:**
- SKILL.md
- [services-and-repositories.md](services-and-repositories.md)
- [complete-examples.md](complete-examples.md)
