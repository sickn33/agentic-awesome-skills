# Database Selection (2025)

> Choose database based on context, not default.

## Decision Tree

```
What are your requirements?
│
├── Full relational features needed
│   ├── Self-hosted → PostgreSQL
│   └── Serverless → Neon, Supabase
│
├── Edge deployment / Ultra-low latency
│   └── Turso (edge SQLite)
│
├── AI / Vector search
│   └── PostgreSQL + pgvector
│
├── Simple / Embedded / Local
│   └── SQLite
│
└── Global distribution
    └── PlanetScale, CockroachDB, Turso
```

## Comparison

| Database | Best For | Trade-offs |
|----------|----------|------------|
| **PostgreSQL** | Full features, complex queries | Needs hosting |
| **Neon** | Serverless PG, branching | PG complexity |
| **Turso** | Edge, low latency | SQLite limitations |
| **SQLite** | Simple, embedded, local | Single-writer |
| **PlanetScale** | Managed relational offerings | Engine, sharding and enabled constraints must be verified for the actual deployment |

## Questions to Ask

1. What's the deployment environment?
2. How complex are the queries?
3. Is edge/serverless important?
4. Vector search needed?
5. Global distribution required?
