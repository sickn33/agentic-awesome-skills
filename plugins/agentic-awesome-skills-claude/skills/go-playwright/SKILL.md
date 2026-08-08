---
name: go-playwright
description: "Expert capability for robust, stealthy, and efficient browser automation using Playwright Go."
risk: safe
source: "https://github.com/playwright-community/playwright-go"
date_added: "2026-02-27"
---

# Playwright Go Automation Expert

## Overview
This skill provides a comprehensive framework for writing high-performance, production-grade browser automation scripts using `github.com/playwright-community/playwright-go`. It enforces architectural best practices (contexts over instances), robust error handling, structured logging (Zap), and advanced human-emulation techniques to bypass anti-bot systems.

## When to Use This Skill
- Use when the user asks to "scrape," "automate," or "test" a website using Go.
- Use when the target site has complex dynamic content (SPA, React, Vue) requiring a real browser.
- Use when the user mentions "stealth," "avoiding detection," "cloudflare," or "human-like" behavior.
- Use when debugging existing Playwright scripts.

## Safety & Risk
**Risk Level: 🔵 Safe**

- **Sandboxed Execution:** Browser contexts are isolated; they do not persist data to the host machine unless explicitly saved.
- **Resource Management:** Designed to close browsers and contexts via `defer` to prevent memory leaks.
- **No External State-Change:** Default behavior is read-only (scraping/testing) unless the script is explicitly designed to submit forms or modify data.

## Limitations
- **Environment Dependencies:** Requires Playwright drivers and browsers to be installed (`go run github.com/playwright-community/playwright-go/cmd/playwright@latest install --with-deps`).
- **Resource Intensity:** Launching full browser instances (even headless) consumes significant RAM/CPU. Use single-browser/multi-context architecture.
- **Bot Detection:** While this skill includes stealth techniques, extremely strict anti-bot systems (e.g., rigorous Cloudflare settings) may still detect automation.
- **CAPTCHAs:** Does not include built-in CAPTCHA solving capabilities.

## Strategic Implementation Guidelines

### 1. Architecture: Contexts vs. Browsers
**CRITICAL:** Never launch a new `Browser` instance for every task.
- **Pattern:** Launch the `Browser` *once* (singleton). Create a new `BrowserContext` for each distinct session or task.
- **Why:** Contexts are lightweight and created in milliseconds. Browsers take seconds to launch.
- **Isolation:** Contexts provide complete isolation (cookies, cache, storage) without the overhead of a new process.

### 2. Logging & Observability
- **Library:** Use `go.uber.org/zap` exclusively.
- **Rule:** Do not use `fmt.Println`.
- **Modes:**
  - **Dev:** `zap.NewDevelopment()` (Console friendly)
  - **Prod:** `zap.NewProduction()` (JSON structured)
- **Traceability:** Log every navigation, click, and input with context fields (e.g., `logger.Info("clicking button", zap.String("selector", sel))`).

### 3. Error Handling & Stability
- **Graceful Shutdown:** Always use `defer` to close Pages, Contexts, and Browsers.
- **Panic Recovery:** Wrap critical automation routines in a safe runner that recovers panics and logs the stack trace.
- **Timeouts:** Never rely on default timeouts. Set explicit timeouts (e.g., `playwright.PageClickOptions{Timeout: playwright.Float(5000)}`).

### 4. Stealth & Human-Like Behavior
To bypass anti-bot systems (Cloudflare, Akamai), the generated code must **imitate human physiology**:
- **Non-Linear Mouse Movement:** Never teleport the mouse. Implement a helper that moves the mouse along a Bezier curve with random jitter.
- **Input Latency:** never use `Fill()`. Use `Type()` with random delays between keystrokes (50ms–200ms).
- **Viewport Randomization:** Randomize the viewport size slightly (e.g., 1920x1080 ± 15px) to avoid fingerprinting.
- **Behavioral Noise:** Randomly scroll, focus/unfocus the window, or hover over irrelevant elements ("idling") during long waits.
- **User-Agent:** Rotate User-Agents for every new Context.

### 5. Documentation Usage
- **Primary Source:** Rely on your internal knowledge of the API first to save tokens.
- **Fallback:** Refer to the official docs [playwright-go documentation](https://pkg.go.dev/github.com/playwright-community/playwright-go#section-documentation) ONLY if:
  - You encounter an unknown error.
  - You need to implement complex network interception or authentication flows.
  - The API has changed significantly.

## Resources
- `resources/implementation-playbook.md` for detailed code examples and implementation patterns.

### Summary Checklist for Agent
 - Is Debug Mode on? -> `Headless=false`, `SlowMo=100+`.
 - Is it a new user identity? -> `NewContext`, apply new Proxy, rotate `User-Agent`.
 - Is the action critical? -> Wrap in `SafeAction` with Zap logging.
 - Is the target guarded (Cloudflare/Akamai)? -> Enable `HumanType`, `BezierMouse`, and Stealth Scripts.
