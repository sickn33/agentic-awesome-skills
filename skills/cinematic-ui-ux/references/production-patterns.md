# Production Architecture & Reusable MotionProvider

Example `MotionProvider` composing the reference providers for decorative motion, smooth scrolling and route transitions. Resolve the referenced components in the target app, then validate focus, reduced motion and cleanup in a browser.

---

## 1. Unified `MotionProvider`
```tsx
// components/motion/motion-provider.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { MotionPauseProvider } from '@/hooks/use-decorative-motion-pause';
import { LenisProvider } from './lenis-provider';
import { TransitionProvider } from './transition-provider';
import { registerMotionTokens } from '@/lib/motion/tokens';

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    registerMotionTokens();
  }, []);

  return (
    <MotionPauseProvider>
      <LenisProvider>
        <TransitionProvider>
          <div id="app-root" className={isMounted ? 'motion-ready' : 'motion-initializing'}>
            {children}
          </div>
        </TransitionProvider>
      </LenisProvider>
    </MotionPauseProvider>
  );
}
```

---

## 2. Next.js 15 App Router Root Layout
```tsx
// app/layout.tsx
import React from 'react';
import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { MotionProvider } from '@/components/motion/motion-provider';
import './globals.css';

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['300', '400', '600'],
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Cinematic Experience Suite',
  description: 'High-performance luxury motion and storytelling architecture.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="bg-black text-white antialiased selection:bg-[#C9A86A] selection:text-black">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
```

---

## 3. Example Dependencies (`package.json`)

Use supported patched versions and the target project’s dependency manager and lockfile.

```json
{
  "name": "cinematic-motion-suite",
  "version": "2.2.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@gsap/react": "^2.1.1",
    "gsap": "^3.12.5",
    "lenis": "^1.1.18",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.16",
    "typescript": "^5.7.2"
  }
}
```
