---
title: Prevent Hydration Mismatch Without Flickering
impact: MEDIUM
impactDescription: avoids visual flicker and hydration errors
tags: rendering, ssr, hydration, localStorage, flicker
---

## Render Consistent Theme State

Render the same authorized theme on server and first client render. When a validated non-sensitive theme cookie is available, select it on the server. Otherwise start with the same default on both sides, read storage in an Effect with try/catch, allow only known theme values and accept a possible theme flash.

A framework-supported pre-hydration theme script can reduce flicker, but requires CSP nonce/hash handling and intentional hydration configuration. Mutating an arbitrary div before hydration does not by itself prevent a hydration mismatch. Never interpolate untrusted storage into executable code, enable unsafe-inline globally, or derive authentication from client storage.

**Example (deterministic initial render):**

```tsx
'use client'
import { useEffect, useState } from 'react'
export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('light')
  useEffect(() => {
    try {
      const value = localStorage.getItem('theme')
      if (value === 'light' || value === 'dark') setTheme(value)
    } catch { /* denied storage: retain the default */ }
  }, [])
  return <div className={theme}>{children}</div>
}
```

**Limitation:** This fallback can flash the default theme. Test hydration, CSP, preference changes and accessibility in the actual framework.
