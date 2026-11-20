# GSAP Animation Engineering (Version 3.12+ & React 19)

Master architecture for building production-ready, interruptible, leak-free GreenSock animations with `matchMedia`, `Flip`, dynamic keyboard focus traps, React 19 boolean `inert` compatibility, and full reduced-motion branches.

---

## 1. Context-Safe Mouse Tracking & Visibility Pausing
```tsx
// hooks/use-cursor-follow.ts
'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function useCursorFollow() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cursorRef.current;
    if (!el) return;

    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reducedMotion) return;

    const xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });

    const handleMouseMove = (e: MouseEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        gsap.set(el, { opacity: 0 });
      } else {
        gsap.set(el, { opacity: 1 });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      gsap.killTweensOf(el);
    };
  }, []);

  return cursorRef;
}
```

---

## 2. Accessible Reversible Menu with Dynamic Focus Trap & React 19 Inertness
Features a robust keyboard focus trap that handles dynamically updated or disabled links, returns focus to the trigger on close, uses standard React 19 boolean `inert={!isOpen}`, and provides an instant reduced-motion branch:

```tsx
// components/motion/accessible-menu.tsx
'use client';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export function AccessibleMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuTl = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (isReduced) {
        // Reduced motion: instantaneous state switches without duration/staggers
        menuTl.current = gsap
          .timeline({ paused: true })
          .set('.menu-curtain', { yPercent: 0 })
          .set('.menu-link', { y: 0, opacity: 1 });
      } else {
        menuTl.current = gsap
          .timeline({ paused: true })
          .to('.menu-curtain', { yPercent: 0, duration: 0.6, ease: 'power4.inOut' })
          .from('.menu-link', { y: 30, opacity: 0, stagger: 0.08, duration: 0.4 }, '-=0.2');
      }
    },
    { scope: containerRef }
  );

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    menuTl.current?.reverse();
    triggerRef.current?.focus();
  }, []);

  const openMenu = useCallback(() => {
    setIsOpen(true);
    menuTl.current?.play();
  }, []);

  const toggleMenu = () => {
    if (isOpen) closeMenu();
    else openMenu();
  };

  // Robust Keyboard Escape & Dynamic Tab Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const nav = navRef.current;
    if (!nav) return;

    const getFocusableElements = () => {
      const candidates = nav.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      return Array.from(candidates).filter(
        (el) => el.offsetParent !== null && el.getAttribute('aria-hidden') !== 'true'
      );
    };

    const focusables = getFocusableElements();
    focusables[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        return;
      }

      if (e.key === 'Tab') {
        const currentElements = getFocusableElements();
        if (currentElements.length === 0) {
          e.preventDefault();
          return;
        }

        const first = currentElements[0];
        const last = currentElements[currentElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeMenu]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        aria-expanded={isOpen}
        aria-controls="main-menu"
        onClick={toggleMenu}
        className="fixed top-8 right-8 z-[10001] px-4 py-2 bg-white text-black font-mono text-xs tracking-widest rounded shadow-xl focus-visible:ring-2 focus-visible:ring-[#C9A86A] focus-visible:outline-none"
      >
        {isOpen ? 'CLOSE ✕' : 'MENU ☰'}
      </button>

      <nav
        ref={navRef}
        id="main-menu"
        aria-hidden={!isOpen}
        inert={!isOpen}
        className="menu-curtain fixed inset-0 z-[10000] bg-black text-white -translate-y-full flex flex-col justify-center items-center"
      >
        <div className="flex flex-col gap-8 text-center">
          <a
            href="/archive"
            onClick={closeMenu}
            className="menu-link text-4xl md:text-6xl font-serif text-white hover:text-[#C9A86A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A86A]"
          >
            Archive
          </a>
          <a
            href="/atelier"
            onClick={closeMenu}
            className="menu-link text-4xl md:text-6xl font-serif text-white hover:text-[#C9A86A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A86A]"
          >
            Atelier
          </a>
          <a
            href="/contact"
            onClick={closeMenu}
            className="menu-link text-4xl md:text-6xl font-serif text-white hover:text-[#C9A86A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A86A]"
          >
            Contact
          </a>
        </div>
      </nav>
    </div>
  );
}
```
