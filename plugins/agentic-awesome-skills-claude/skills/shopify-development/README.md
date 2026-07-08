# Shopify Development Skill

Comprehensive skill for building on Shopify platform: apps, extensions, themes, and API integrations.

## Features

- **App Development** - OAuth authentication, GraphQL Admin API, webhooks, billing integration
- **UI Extensions** - Checkout, Admin, POS customizations with Polaris components
- **Theme Development** - Liquid templating, sections, snippets
- **Shopify Functions** - Custom discounts, payment, delivery rules

## Structure

```
shopify-development/
├── SKILL.md              # Main skill file (AI-optimized)
├── README.md             # This file
├── references/
│   ├── app-development.md    # OAuth, API, webhooks, billing
│   ├── extensions.md         # UI extensions, Functions
│   └── themes.md             # Liquid, theme architecture
└── scripts/
    ├── shopify_init.py       # Interactive project scaffolding
    ├── shopify_graphql.py    # GraphQL utilities & templates
    └── tests/                # Unit tests
```

## Validated GraphQL

All GraphQL queries and mutations in this skill have been validated against Shopify Admin API 2026-01 schema using the official Shopify MCP.

## Quick Start

```bash
# Install Shopify CLI
npm install -g @shopify/cli@latest

# Create new app
shopify app init

# Start development
shopify app dev
```

## Usage Triggers

This skill activates when the user mentions:

- "shopify app", "shopify extension", "shopify theme"
- "checkout extension", "admin extension", "POS extension"
- "liquid template", "polaris", "shopify graphql"
- "shopify webhook", "shopify billing", "metafields"

## API Version

Current: **2026-01** (Quarterly releases with 12-month support)

## License

MIT
