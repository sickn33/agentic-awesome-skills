# Authentication Patterns

> Choose auth pattern based on use case.

## Selection Guide

| Pattern | Best For |
|---------|----------|
| **JWT** | Stateless, microservices |
| **Session** | Traditional web, simple |
| **OAuth 2.0** | Third-party integration |
| **API Keys** | Server-to-server, public APIs |
| **Passkey** | Passwordless user authentication |

## JWT Principles

```
Important:
├── Always verify signature
├── Allow only the expected algorithm and validate issuer/audience
├── Require and check expiration
├── Include minimal claims
├── Use short expiry + refresh tokens
└── Never store sensitive data in JWT
```
