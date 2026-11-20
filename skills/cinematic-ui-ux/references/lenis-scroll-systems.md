# Lenis & Advanced Scroll Engineering

Complete integration blueprint for the official `lenis` package (`^1.1.18`) coupled with GSAP ScrollTrigger. Implements strict Rules-of-Hooks compliance, true ownership enforcement, symmetric teardown on reduced-motion changes, instant native fallback scrolling, and coordinated anchor focus management.

---

## 1. Application-Level Lenis Provider (Ownership & Rules-of-Hooks Invariant)
To comply strictly with React's Rules of Hooks, conditional nesting checks are decoupled from hook execution by using an outer wrapper and inner provider. If an existing `LenisContext` is present, the wrapper reuses it without re-invoking hooks. Furthermore, a global singleton token guarantees that only one active controller runs across the browser window.

```tsx
// components/motion/lenis-provider.tsx
'use client';
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css'; // Official stylesheet
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface LenisContextType {
  lenis: Lenis | null;
  scrollTo: (
    target: string | HTMLElement,
    options?: { offset?: number; duration?: number; immediate?: boolean; onComplete?: () => void }
  ) => void;
  lockScroll: () => void;
  unlockScroll: () => void;
  isLocked: boolean;
}

const LenisContext = createContext<LenisContextType | null>(null);

// Global active controller flag enforcing single authority across roots
let globalActiveLenisController: Lenis | null = null;

function InnerLenisProvider({ children }: { children: React.ReactNode }) {
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const lockCountRef = useRef(0);
  const isLockedRef = useRef(false);
  const previousOverflowRef = useRef<string>('');
  const previousPaddingRightRef = useRef<string>('');
  const lenisRef = useRef<Lenis | null>(null);
  const tickerCbRef = useRef<((time: number) => void) | null>(null);

  // Synchronize lock ref with state
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  // 1. Symmetric Lifecycle Management
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const teardownInstance = () => {
      // Clean up ticker
      if (tickerCbRef.current) {
        gsap.ticker.remove(tickerCbRef.current);
        tickerCbRef.current = null;
      }

      // Destroy active Lenis instance
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
        globalActiveLenisController = null;
        setLenisInstance(null);
      }
    };

    const setupLenis = () => {
      // Symmetric teardown of any existing instance before initializing
      teardownInstance();

      // Check reduced motion: under reduced motion, Lenis is bypassed entirely
      if (mediaQuery.matches) {
        return;
      }

      if (globalActiveLenisController) {
        console.warn('[LenisProvider] Competing Lenis controller detected. Enforcing singleton ownership.');
        return;
      }

      const instance = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.5,
        autoRaf: false, // Driven exclusively by GSAP ticker authority
      });

      lenisRef.current = instance;
      globalActiveLenisController = instance;
      setLenisInstance(instance);

      // Synchronize scroll-lock state if component was locked before instance creation
      if (lockCountRef.current > 0 || isLockedRef.current) {
        instance.stop();
      }

      // Coordinate with GSAP ScrollTrigger updates
      instance.on('scroll', ScrollTrigger.update);

      const tickerCb = (time: number) => {
        instance.raf(time * 1000);
      };
      tickerCbRef.current = tickerCb;
      gsap.ticker.add(tickerCb);
    };

    setupLenis();

    const handleMotionChange = () => {
      setupLenis();
    };
    mediaQuery.addEventListener('change', handleMotionChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange);
      teardownInstance();

      // Clean up body styles if unmounting while locked
      if (lockCountRef.current > 0) {
        document.body.style.overflow = previousOverflowRef.current;
        document.body.style.paddingRight = previousPaddingRightRef.current;
        lockCountRef.current = 0;
      }
    };
  }, []);

  // 2. Use an instant native fallback when reduced motion or a completion callback applies.
  const scrollTo = useCallback(
    (
      target: string | HTMLElement,
      options?: { offset?: number; duration?: number; immediate?: boolean; onComplete?: () => void }
    ) => {
      const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (lenisInstance && !isReduced) {
        lenisInstance.scrollTo(target, {
          offset: options?.offset ?? 0,
          duration: options?.duration ?? 1.2,
          immediate: options?.immediate ?? false,
          onComplete: options?.onComplete,
        });
      } else {
        // Safe Native Fallback: handle selector errors and enforce instant scroll under reduced motion
        let element: HTMLElement | null = null;
        if (typeof target === 'string') {
          try {
            element = document.querySelector<HTMLElement>(target);
          } catch {
            if (target.startsWith('#')) {
              element = document.getElementById(target.substring(1));
            }
          }
        } else {
          element = target;
        }

        if (element) {
          const top = element.getBoundingClientRect().top + window.scrollY + (options?.offset ?? 0);
          window.scrollTo({
            top,
            behavior: isReduced || options?.immediate || options?.onComplete ? 'instant' : 'smooth',
          });
          if (options?.onComplete) {
            requestAnimationFrame(() => options.onComplete?.());
          }
        }
      }
    },
    [lenisInstance]
  );

  // 3. Reference-Counted Scroll Lock with Exact Padding Compensation
  const lockScroll = useCallback(() => {
    if (lockCountRef.current === 0) {
      previousOverflowRef.current = document.body.style.overflow;
      previousPaddingRightRef.current = document.body.style.paddingRight;

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      const computedPaddingRight = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;

      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;
      }

      document.body.style.overflow = 'hidden';
      lenisInstance?.stop();
      setIsLocked(true);
    }
    lockCountRef.current += 1;
  }, [lenisInstance]);

  const unlockScroll = useCallback(() => {
    if (lockCountRef.current === 0) return;

    lockCountRef.current -= 1;

    if (lockCountRef.current === 0) {
      document.body.style.overflow = previousOverflowRef.current;
      document.body.style.paddingRight = previousPaddingRightRef.current;
      lenisInstance?.start();
      setIsLocked(false);
    }
  }, [lenisInstance]);

  return (
    <LenisContext.Provider
      value={{
        lenis: lenisInstance,
        scrollTo,
        lockScroll,
        unlockScroll,
        isLocked,
      }}
    >
      {children}
    </LenisContext.Provider>
  );
}

/**
 * Public Root LenisProvider:
 * Complies with Rules of Hooks by keeping conditional context checks outside the hook scope.
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const existingContext = useContext(LenisContext);
  if (existingContext) {
    return <>{children}</>;
  }
  return <InnerLenisProvider>{children}</InnerLenisProvider>;
}

export function useLenisContext(): LenisContextType {
  const context = useContext(LenisContext);
  if (!context) {
    throw new Error('useLenisContext must be used within a LenisProvider');
  }
  return context;
}
```

---

## 2. Accessible Anchor Navigation with Completion-Coordinated Focus
Ensures that focus is transferred and browser history is updated only when the smooth scroll animation has actually concluded:

```tsx
// components/motion/accessible-anchor-link.tsx
'use client';
import React from 'react';
import { useLenisContext } from './lenis-provider';

interface AnchorLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  offset?: number;
  children: React.ReactNode;
}

export function AccessibleAnchorLink({
  href,
  offset = -80,
  children,
  className = '',
  onClick,
  ...props
}: AnchorLinkProps) {
  const { scrollTo } = useLenisContext();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    if (e.defaultPrevented) return;

    if (href.startsWith('#')) {
      e.preventDefault();
      const targetId = href.substring(1);
      const targetEl = document.getElementById(targetId);

      if (targetEl) {
        scrollTo(targetEl, {
          offset,
          duration: 1.0,
          onComplete: () => {
            window.history.pushState(null, '', href);

            const originalTabIndex = targetEl.getAttribute('tabindex');
            targetEl.setAttribute('tabindex', '-1');
            targetEl.focus({ preventScroll: true });

            const onBlur = () => {
              if (originalTabIndex !== null) {
                targetEl.setAttribute('tabindex', originalTabIndex);
              } else {
                targetEl.removeAttribute('tabindex');
              }
              targetEl.removeEventListener('blur', onBlur);
            };
            targetEl.addEventListener('blur', onBlur);
          },
        });
      }
    }
  };

  return (
    <a href={href} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}
```
