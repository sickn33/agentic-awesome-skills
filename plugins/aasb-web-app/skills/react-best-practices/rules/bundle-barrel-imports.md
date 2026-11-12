---
title: Avoid Barrel File Imports
impact: CRITICAL
impactDescription: workload-dependent import overhead
tags: bundle, imports, tree-shaking, barrel-files, performance
---

## Use Public Package Exports and Measure Imports

Barrel entry points can increase module graph analysis or cold-start work, especially for externalized packages. Tree-shaking and package-import transforms can remove unused exports in supported bundlers; measure the production build before changing imports.

**Example:**

```tsx
// Use documented public exports; do not reach into package-private dist paths.
import { Check, X, Menu } from 'lucide-react'
import Button from '@mui/material/Button'
```

Next.js optimizePackageImports configuration and built-in optimized package lists vary by version. Check the installed framework’s documentation rather than assuming a manual configuration is needed. No generic timing or size reduction is promised.

Reference: https://vercel.com/blog/how-we-optimized-package-imports-in-next-js
