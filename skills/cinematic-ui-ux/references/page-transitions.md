# Page Transitions & Navigation State Machine

Production-grade page and route transitions for Next.js App Router with isolated Suspense boundaries, strict URL sanitization, unique navigation ID verification, robust error recovery, and a declarative `<TransitionLink>` component.

---

## 1. URL Security Sanitization
This example accepts root-relative internal links for known routes. Use native links for static external links or fragment-only navigation. Validate the link before rendering it and before handing it to the router.

```typescript
// lib/motion/sanitize-url.ts
const LOCAL_ORIGIN = 'https://navigation.invalid';

export function sanitizeNavigationUrl(href: string): string | null {
  if (typeof href !== 'string') return null;
  const value = href.trim();
  const path = value.split(/[?#]/, 1)[0];
  const internalPath = /^\/(?!\/)[a-zA-Z0-9_\-./~]*$/;
  if (!internalPath.test(path)) return null;

  try {
    const parsed = new URL(value, LOCAL_ORIGIN);
    if (parsed.origin !== LOCAL_ORIGIN || !internalPath.test(parsed.pathname)) {
      return null;
    }
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return null;
  }
}

export function matchesDestination(href: string, pathname: string, query: string): boolean {
  const target = new URL(href, LOCAL_ORIGIN);
  return target.pathname === pathname &&
    target.searchParams.toString() === new URLSearchParams(query).toString();
}
```

---

## 2. Production Navigation State Machine Provider
Isolates the search parameter consumer into `<RouteListener>` within an empty Suspense boundary so page content remains completely unblocked. Implements strict navigation identity guards in all delayed callbacks and preserves error state during timeouts.

```tsx
// components/motion/transition-provider.tsx
'use client';
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  Suspense,
} from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { matchesDestination, sanitizeNavigationUrl } from '@/lib/motion/sanitize-url';

gsap.registerPlugin(ScrollToPlugin);

export type TransitionState =
  | 'IDLE'
  | 'EXITING'
  | 'WAITING_DESTINATION'
  | 'SLOW_LOADING'
  | 'ENTERING'
  | 'FAILED_FALLBACK'
  | 'CANCELLED';

export interface TransitionContextType {
  state: TransitionState;
  activeNavId: number;
  errorMessage: string | null;
  navigate: (href: string) => void;
  notifyPageReady: (navId: number) => void;
  retryNavigation: () => void;
  cancelNavigation: () => void;
}

const TransitionContext = createContext<TransitionContextType | null>(null);

function RouteListener({
  onRouteChange,
}: {
  onRouteChange: (pathname: string, searchParamsString: string) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    onRouteChange(pathname, searchParams ? searchParams.toString() : '');
  }, [pathname, searchParams, onRouteChange]);

  return null;
}

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<TransitionState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const curtainRef = useRef<HTMLDivElement>(null);
  const activeNavIdRef = useRef<number>(0);
  const targetHrefRef = useRef<string>('');
  const previousHrefRef = useRef<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLockedRef = useRef<boolean>(false);
  const activeTweensRef = useRef<gsap.core.Tween[]>([]);
  const previousPointerEventsRef = useRef<string>('');

  useEffect(() => {
    return () => {
      activeTweensRef.current.forEach((t) => t.kill());
      activeTweensRef.current = [];
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (slowLoadingTimeoutRef.current) clearTimeout(slowLoadingTimeoutRef.current);
      document.body.style.pointerEvents = previousPointerEventsRef.current;
      document.getElementById('app-root')?.removeAttribute('inert');
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (isLockedRef.current) {
        cancelNavigation();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const finalizeTransition = useCallback((navId: number, isError = false) => {
    if (navId !== activeNavIdRef.current) return;

    if (curtainRef.current) {
      gsap.set(curtainRef.current, { clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)' });
    }
    document.body.style.pointerEvents = previousPointerEventsRef.current;
    isLockedRef.current = false;

    if (!isError) {
      setState('IDLE');
    }

    const appRoot = document.getElementById('app-root');
    appRoot?.removeAttribute('inert');

    const main = document.querySelector('main');
    if (main) {
      const originalTabIndex = main.getAttribute('tabindex');
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });

      const onBlur = () => {
        if (originalTabIndex !== null) {
          main.setAttribute('tabindex', originalTabIndex);
        } else {
          main.removeAttribute('tabindex');
        }
        main.removeEventListener('blur', onBlur);
      };
      main.addEventListener('blur', onBlur);
    }
  }, []);

  const revealCurtain = useCallback(
    (navId: number, isError = false) => {
      if (navId !== activeNavIdRef.current) return;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (slowLoadingTimeoutRef.current) clearTimeout(slowLoadingTimeoutRef.current);

      if (!isError) {
        setState('ENTERING');
      }

      const curtain = curtainRef.current;
      if (!curtain) {
        finalizeTransition(navId, isError);
        return;
      }

      const tween = gsap.to(curtain, {
        clipPath: 'polygon(0 0%, 100% 0%, 100% 0%, 0 0%)',
        duration: 0.6,
        ease: 'power4.inOut',
        delay: 0.05,
        onComplete: () => {
          finalizeTransition(navId, isError);
        },
      });

      activeTweensRef.current.push(tween);
    },
    [finalizeTransition]
  );

  const notifyPageReady = useCallback(
    (navId: number) => {
      if (typeof navId !== 'number') {
        console.error('[Navigation] notifyPageReady requires a valid numeric navId.');
        return;
      }
      if (navId !== activeNavIdRef.current || !targetHrefRef.current) return;
      if (!matchesDestination(targetHrefRef.current, window.location.pathname, window.location.search)) return;

      if (state === 'WAITING_DESTINATION' || state === 'SLOW_LOADING') {
        revealCurtain(navId, false);
      }
    },
    [state, revealCurtain]
  );

  const handleRouteChange = useCallback(
    (newPath: string, newQuery: string) => {
      if (state === 'WAITING_DESTINATION' || state === 'SLOW_LOADING') {
        if (targetHrefRef.current && matchesDestination(targetHrefRef.current, newPath, newQuery)) {
          revealCurtain(activeNavIdRef.current, false);
        }
      }
    },
    [state, revealCurtain]
  );

  const cancelNavigation = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (slowLoadingTimeoutRef.current) clearTimeout(slowLoadingTimeoutRef.current);
    activeTweensRef.current.forEach((t) => t.kill());
    activeTweensRef.current = [];

    const navId = activeNavIdRef.current;
    setState('CANCELLED');

    if (curtainRef.current) {
      gsap.to(curtainRef.current, {
        clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)',
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          finalizeTransition(navId, false);
          if (previousHrefRef.current && typeof window !== 'undefined') {
            router.replace(previousHrefRef.current);
          }
        },
      });
    } else {
      finalizeTransition(navId, false);
      if (previousHrefRef.current && typeof window !== 'undefined') {
        router.replace(previousHrefRef.current);
      }
    }
  }, [finalizeTransition, router]);

  const navigate = useCallback(
    (href: string) => {
      const safeHref = sanitizeNavigationUrl(href);
      if (!safeHref) return;

      if (isLockedRef.current) return;
      const curtain = curtainRef.current;
      if (!curtain || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        router.push(safeHref);
        return;
      }
      isLockedRef.current = true;

      activeNavIdRef.current += 1;
      const currentNavId = activeNavIdRef.current;
      targetHrefRef.current = safeHref;
      if (typeof window !== 'undefined') {
        previousHrefRef.current = window.location.pathname + window.location.search;
      }
      setErrorMessage(null);
      setState('EXITING');

      previousPointerEventsRef.current = document.body.style.pointerEvents || '';
      document.body.style.pointerEvents = 'none';

      const appRoot = document.getElementById('app-root');
      appRoot?.setAttribute('inert', 'true');

      const tween = gsap.to(curtain, {
        clipPath: 'polygon(0 0%, 100% 0%, 100% 100%, 0 100%)',
        duration: 0.55,
        ease: 'power4.inOut',
        onComplete: () => {
          if (activeNavIdRef.current !== currentNavId) return;

          setState('WAITING_DESTINATION');
          gsap.set(window, { scrollTo: 0 });

          slowLoadingTimeoutRef.current = setTimeout(() => {
            if (activeNavIdRef.current === currentNavId) {
              setState('SLOW_LOADING');
            }
          }, 1800);

          timeoutRef.current = setTimeout(() => {
            if (activeNavIdRef.current === currentNavId) {
              console.error('[Navigation] Destination route timed out after 4000ms.');
              setState('FAILED_FALLBACK');
              setErrorMessage('Destination took too long to respond. You can retry or return.');
              revealCurtain(currentNavId, true);
            }
          }, 4000);

          router.push(safeHref);
        },
      });

      activeTweensRef.current.push(tween);
    },
    [router, revealCurtain]
  );

  const retryNavigation = useCallback(() => {
    if (targetHrefRef.current) {
      setErrorMessage(null);
      isLockedRef.current = false;
      navigate(targetHrefRef.current);
    }
  }, [navigate]);

  return (
    <TransitionContext.Provider
      value={{
        state,
        activeNavId: activeNavIdRef.current,
        errorMessage,
        navigate,
        notifyPageReady,
        retryNavigation,
        cancelNavigation,
      }}
    >
      <Suspense fallback={null}>
        <RouteListener onRouteChange={handleRouteChange} />
      </Suspense>

      {children}

      <div
        ref={curtainRef}
        data-transition-curtain="true"
        aria-hidden={state === 'IDLE'}
        className="transition-curtain fixed inset-0 z-[10000] bg-[#0A0A0A] pointer-events-none"
        style={{
          clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)',
          willChange: 'clip-path',
        }}
      />

      {state === 'SLOW_LOADING' && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto fixed bottom-6 right-6 z-[10002] bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded font-mono text-xs shadow-2xl flex items-center gap-3"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>Loading destination assets...</span>
          <button
            onClick={cancelNavigation}
            className="ml-2 underline text-white/70 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {state === 'FAILED_FALLBACK' && errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="pointer-events-auto fixed bottom-6 right-6 z-[10002] bg-red-950/90 border border-red-500/50 text-white px-5 py-3 rounded font-mono text-xs shadow-2xl flex items-center gap-4"
        >
          <span>{errorMessage}</span>
          <button
            onClick={retryNavigation}
            className="px-2.5 py-1 bg-red-500 text-white font-bold rounded hover:bg-red-400"
          >
            Retry
          </button>
          <button
            onClick={cancelNavigation}
            className="text-white/60 hover:text-white underline text-xs"
          >
            Cancel
          </button>
        </div>
      )}
    </TransitionContext.Provider>
  );
}

export function usePageTransition() {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error('usePageTransition must be used within a TransitionProvider');
  }
  return context;
}
```

---

## 3. Declarative `<TransitionLink>` Component
Use this component for internal links. Modifier keys, non-default targets, and downloads keep their native link behavior after URL validation.

```tsx
// components/motion/transition-link.tsx
'use client';
import React from 'react';
import { usePageTransition } from './transition-provider';
import { sanitizeNavigationUrl } from '@/lib/motion/sanitize-url';

interface TransitionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

export function TransitionLink({ href, children, className = '', onClick, ...props }: TransitionLinkProps) {
  const { navigate } = usePageTransition();
  const safeHref = sanitizeNavigationUrl(href);
  if (!safeHref) return <span className={className}>{children}</span>;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    if (e.defaultPrevented) return;

    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    if ((props.target && props.target !== '_self') || props.download !== undefined) return;

    e.preventDefault();
    navigate(safeHref);
  };

  return (
    <a {...props} href={safeHref} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
```

---

## 4. Destination Resource Readiness Verification
The provider above can reveal when the route matches. If the target app requires a resource-based reveal, gate it on both the route match and a readiness signal. The example below reports readiness after waiting for fonts and attempting image decoding. Treat decode failures according to the app’s fallback policy:

```tsx
// app/work/[slug]/page.tsx
'use client';
import { useEffect } from 'react';
import { usePageTransition } from '@/components/motion/transition-provider';

export default function ProjectPage() {
  const { notifyPageReady, activeNavId } = usePageTransition();

  useEffect(() => {
    let isMounted = true;

    async function verifyCriticalResources() {
      // 1. Verify font metrics
      await document.fonts.ready;

      // 2. Decode critical above-the-fold hero images
      const heroImages = Array.from(document.querySelectorAll<HTMLImageElement>('img[data-critical="true"]'));
      await Promise.all(
        heroImages.map((img) => {
          if (img.complete) return Promise.resolve();
          return img.decode().catch(() => {});
        })
      );

      // 3. Notify transition provider that destination is ready
      if (isMounted) {
        notifyPageReady(activeNavId);
      }
    }

    verifyCriticalResources();
    return () => {
      isMounted = false;
    };
  }, [notifyPageReady, activeNavId]);

  return (
    <main className="min-h-screen px-8 py-24">
      <h1 className="text-4xl font-serif">Project Experience</h1>
      <img
        src="/images/hero-project.webp"
        data-critical="true"
        alt="Hero Showcase"
        className="w-full max-w-4xl h-auto mt-8 rounded-lg"
      />
    </main>
  );
}
```
