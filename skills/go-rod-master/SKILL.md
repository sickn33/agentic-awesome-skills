---
name: go-rod-master
description: "Comprehensive guide for browser automation and web scraping with go-rod (Chrome DevTools Protocol) including stealth anti-bot-detection patterns."
risk: safe
source: "https://github.com/go-rod/rod"
date_added: "2026-02-27"
---

# Go-Rod Browser Automation Master

## Overview

[Rod](https://github.com/go-rod/rod) is a high-level Go driver built directly on the [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) for browser automation and web scraping. Unlike wrappers around other tools, Rod communicates with the browser natively via CDP, providing thread-safe operations, chained context design for timeouts/cancellation, auto-wait for elements, correct iframe/shadow DOM handling, and zero zombie browser processes.

The companion library [go-rod/stealth](https://github.com/go-rod/stealth) injects anti-bot-detection evasions based on [puppeteer-extra stealth](https://github.com/nichochar/puppeteer-extra/tree/master/packages/extract-stealth-evasions), hiding headless browser fingerprints from detection systems.

## When to Use This Skill

- Use when the user asks to **scrape**, **automate**, or **test** a website using Go.
- Use when the user needs a **headless browser** for dynamic/SPA content (React, Vue, Angular).
- Use when the user mentions **stealth**, **anti-bot**, **avoiding detection**, **Cloudflare**, or **bot detection bypass**.
- Use when the user wants to work with the **Chrome DevTools Protocol (CDP)** directly from Go.
- Use when the user needs to **intercept** or **hijack** network requests in a browser context.
- Use when the user asks about **concurrent browser scraping** or **page pooling** in Go.
- Use when the user is migrating from **chromedp** or **Playwright Go** and wants a simpler API.

## Safety & Risk

**Risk Level: 🔵 Safe**

- **Read-Only by Default:** Default behavior is navigating and reading page content (scraping/testing).
- **Isolated Contexts:** Browser contexts are sandboxed; cookies and storage do not persist unless explicitly saved.
- **Resource Cleanup:** Designed around Go's `defer` pattern — browsers and pages close automatically.
- **No External Mutations:** Does not modify external state unless the script explicitly submits forms or POSTs data.

## Installation

```bash
# Core rod library
go get github.com/go-rod/rod@latest

# Stealth anti-detection plugin (ALWAYS include for production scraping)
go get github.com/go-rod/stealth@latest
```

Rod auto-downloads a compatible Chromium binary on first run. To pre-download:

```bash
go run github.com/nichochar/go-rod.github.io/cmd/launcher@latest
```

## Core Concepts

### Browser Lifecycle

Rod manages three layers: **Browser → Page → Element**.

```go
// Launch and connect to a browser
browser := rod.New().MustConnect()
defer browser.MustClose()

// Create a page (tab)
page := browser.MustPage("https://example.com")

// Find an element
el := page.MustElement("h1")
fmt.Println(el.MustText())
```

### Must vs Error Patterns

Rod provides two API styles for every operation:

| Style | Method | Use Case |
|:------|:-------|:---------|
| **Must** | `MustElement()`, `MustClick()`, `MustText()` | Scripting, debugging, prototyping. Panics on error. |
| **Error** | `Element()`, `Click()`, `Text()` | Production code. Returns `error` for explicit handling. |

**Production pattern:**

```go
el, err := page.Element("#login-btn")
if err != nil {
    return fmt.Errorf("login button not found: %w", err)
}
if err := el.Click(proto.InputMouseButtonLeft, 1); err != nil {
    return fmt.Errorf("click failed: %w", err)
}
```

**Scripting pattern with Try:**

```go
err := rod.Try(func() {
    page.MustElement("#login-btn").MustClick()
})
if errors.Is(err, context.DeadlineExceeded) {
    log.Println("timeout finding login button")
}
```

### Context & Timeout

Rod uses Go's `context.Context` for cancellation and timeouts. Context propagates recursively to all child operations.

```go
// Set a 5-second timeout for the entire operation chain
page.Timeout(5 * time.Second).
    MustWaitLoad().
    MustElement("title").
    CancelTimeout(). // subsequent calls are not bound by the 5s timeout
    Timeout(30 * time.Second).
    MustText()
```

### Element Selectors

Rod supports multiple selector strategies:

```go
// CSS selector (most common)
page.MustElement("div.content > p.intro")

// CSS selector with text regex matching
page.MustElementR("button", "Submit|Send")

// XPath
page.MustElementX("//div[@class='content']//p")

// Search across iframes and shadow DOM (like DevTools Ctrl+F)
page.MustSearch(".deeply-nested-element")
```

### Auto-Wait

Rod automatically retries element queries until the element appears or the context times out. You do not need manual sleeps:

```go
// This will automatically wait until the element exists
el := page.MustElement("#dynamic-content")

// Wait until the element is stable (position/size not changing)
el.MustWaitStable().MustClick()

// Wait until page has no pending network requests
wait := page.MustWaitRequestIdle()
page.MustElement("#search").MustInput("query")
wait()
```

---

## Stealth & Anti-Bot Detection (go-rod/stealth)

> **IMPORTANT:** For any production scraping or automation against real websites, ALWAYS use `stealth.MustPage()` instead of `browser.MustPage()`. This is the single most important step for avoiding bot detection.

### How Stealth Works

The `go-rod/stealth` package injects JavaScript evasions into every new page that:

- **Remove `navigator.webdriver`** — the primary headless detection signal.
- **Spoof WebGL vendor/renderer** — presents real GPU info (e.g., "Intel Inc." / "Intel Iris OpenGL Engine") instead of headless markers like "Google SwiftShader".
- **Fix Chrome plugin array** — reports proper `PluginArray` type with realistic plugin count.
- **Patch permissions API** — returns `"prompt"` instead of bot-revealing values.
- **Set realistic languages** — reports `en-US,en` instead of empty arrays.
- **Fix broken image dimensions** — headless browsers report 0x0; stealth fixes this to 16x16.

### Usage

**Creating a stealth page (recommended for all production use):**

```go
import (
    "github.com/go-rod/rod"
    "github.com/go-rod/stealth"
)

browser := rod.New().MustConnect()
defer browser.MustClose()

// Use stealth.MustPage instead of browser.MustPage
page := stealth.MustPage(browser)
page.MustNavigate("https://bot.sannysoft.com")
```

**With error handling:**

```go
page, err := stealth.Page(browser)
if err != nil {
    return fmt.Errorf("failed to create stealth page: %w", err)
}
page.MustNavigate("https://example.com")
```

**Using stealth.JS directly (advanced — for custom page creation):**

```go
// If you need to create the page yourself (e.g., with specific options),
// inject stealth.JS manually via EvalOnNewDocument
page := browser.MustPage()
page.MustEvalOnNewDocument(stealth.JS)
page.MustNavigate("https://example.com")
```

### Verifying Stealth

Navigate to a bot detection test page to verify evasions:

```go
page := stealth.MustPage(browser)
page.MustNavigate("https://bot.sannysoft.com")
page.MustScreenshot("stealth_test.png")
```

Expected results for a properly stealth-configured browser:
- **WebDriver**: `missing (passed)`
- **Chrome**: `present (passed)`
- **Plugins Length**: `3` (not `0`)
- **Languages**: `en-US,en`

---

## Implementation Guidelines

### 1. Launcher Configuration

Use the `launcher` package to customize browser launch flags:

```go
import "github.com/go-rod/rod/lib/launcher"

url := launcher.New().
    Headless(true).             // false for debugging
    Proxy("127.0.0.1:8080").    // upstream proxy
    Set("disable-gpu", "").     // custom Chrome flag
    Delete("use-mock-keychain"). // remove a default flag
    MustLaunch()

browser := rod.New().ControlURL(url).MustConnect()
defer browser.MustClose()
```

**Debugging mode (visible browser + slow motion):**

```go
l := launcher.New().
    Headless(false).
    Devtools(true)
defer l.Cleanup()

browser := rod.New().
    ControlURL(l.MustLaunch()).
    Trace(true).
    SlowMotion(2 * time.Second).
    MustConnect()
```

### 2. Proxy Support

```go
// Set proxy at launch
url := launcher.New().
    Proxy("socks5://127.0.0.1:1080").
    MustLaunch()

browser := rod.New().ControlURL(url).MustConnect()

// Handle proxy authentication
go browser.MustHandleAuth("username", "password")()

// Ignore SSL certificate errors (for MITM proxies)
browser.MustIgnoreCertErrors(true)
```

### 3. Input Simulation

```go
import "github.com/go-rod/rod/lib/input"

// Type into an input field (replaces existing value)
page.MustElement("#email").MustInput("user@example.com")

// Simulate keyboard keys
page.Keyboard.MustType(input.Enter)

// Press key combinations
page.Keyboard.MustPress(input.ControlLeft)
page.Keyboard.MustType(input.KeyA)
page.Keyboard.MustRelease(input.ControlLeft)

// Mouse click at coordinates
page.Mouse.MustClick(input.MouseLeft)
page.Mouse.MustMoveTo(100, 200)
```

### 4. Network Request Interception (Hijacking)

```go
router := browser.HijackRequests()
defer router.MustStop()

// Block all image requests
router.MustAdd("*.png", func(ctx *rod.Hijack) {
    ctx.Response.Fail(proto.NetworkErrorReasonBlockedByClient)
})

// Modify request headers
router.MustAdd("*api.example.com*", func(ctx *rod.Hijack) {
    ctx.Request.Req().Header.Set("Authorization", "Bearer token123")
    ctx.MustLoadResponse()
})

// Modify response body
router.MustAdd("*.js", func(ctx *rod.Hijack) {
    ctx.MustLoadResponse()
    ctx.Response.SetBody(ctx.Response.Body() + "\n// injected")
})

go router.Run()
```

### 5. Waiting Strategies

```go
// Wait for page load event
page.MustWaitLoad()

// Wait for no pending network requests (AJAX idle)
wait := page.MustWaitRequestIdle()
page.MustElement("#search").MustInput("query")
wait()

// Wait for element to be stable (not animating)
page.MustElement(".modal").MustWaitStable().MustClick()

// Wait for element to become invisible
page.MustElement(".loading").MustWaitInvisible()

// Wait for JavaScript condition
page.MustWait(`() => document.title === 'Ready'`)

// Wait for specific navigation/event
wait := page.WaitEvent(&proto.PageLoadEventFired{})
page.MustNavigate("https://example.com")
wait()
```

### 6. Race Selectors (Multiple Outcomes)

Handle pages where the result can be one of several outcomes (e.g., login success vs error):

```go
page.MustElement("#username").MustInput("user")
page.MustElement("#password").MustInput("pass").MustType(input.Enter)

// Race between success and error selectors
elm := page.Race().
    Element(".dashboard").MustHandle(func(e *rod.Element) {
        fmt.Println("Login successful:", e.MustText())
    }).
    Element(".error-message").MustDo()

if elm.MustMatches(".error-message") {
    log.Fatal("Login failed:", elm.MustText())
}
```

### 7. Screenshots & PDF

```go
// Full-page screenshot
page.MustScreenshot("page.png")

// Custom screenshot (JPEG, specific region)
img, _ := page.Screenshot(true, &proto.PageCaptureScreenshot{
    Format:  proto.PageCaptureScreenshotFormatJpeg,
    Quality: gson.Int(90),
    Clip: &proto.PageViewport{
        X: 0, Y: 0, Width: 1280, Height: 800, Scale: 1,
    },
})
utils.OutputFile("screenshot.jpg", img)

// Scroll screenshot (captures full scrollable page)
img, _ := page.MustWaitStable().ScrollScreenshot(nil)
utils.OutputFile("full_page.jpg", img)

// PDF export
page.MustPDF("output.pdf")
```

### 8. Concurrent Page Pool

```go
pool := rod.NewPagePool(5) // max 5 concurrent pages

create := func() *rod.Page {
    return browser.MustIncognito().MustPage()
}

var wg sync.WaitGroup
for _, url := range urls {
    wg.Add(1)
    go func(u string) {
        defer wg.Done()

        page := pool.MustGet(create)
        defer pool.Put(page)

        page.MustNavigate(u).MustWaitLoad()
        fmt.Println(page.MustInfo().Title)
    }(url)
}
wg.Wait()

pool.Cleanup(func(p *rod.Page) { p.MustClose() })
```

### 9. Event Handling

```go
// Listen for console.log output
go page.EachEvent(func(e *proto.RuntimeConsoleAPICalled) {
    if e.Type == proto.RuntimeConsoleAPICalledTypeLog {
        fmt.Println(page.MustObjectsToJSON(e.Args))
    }
})()

// Wait for a specific event before proceeding
wait := page.WaitEvent(&proto.PageLoadEventFired{})
page.MustNavigate("https://example.com")
wait()
```

### 10. File Download

```go
wait := browser.MustWaitDownload()

page.MustElementR("a", "Download PDF").MustClick()

data := wait()
utils.OutputFile("downloaded.pdf", data)
```

### 11. JavaScript Evaluation

```go
// Execute JS on the page
page.MustEval(`() => console.log("hello")`)

// Pass parameters and get return value
result := page.MustEval(`(a, b) => a + b`, 1, 2)
fmt.Println(result.Int()) // 3

// Eval on a specific element ("this" = the DOM element)
title := page.MustElement("title").MustEval(`() => this.innerText`).String()

// Direct CDP calls for features Rod doesn't wrap
proto.PageSetAdBlockingEnabled{Enabled: true}.Call(page)
```

### 12. Loading Chrome Extensions

```go
extPath, _ := filepath.Abs("./my-extension")

u := launcher.New().
    Set("load-extension", extPath).
    Headless(false). // extensions require headed mode
    MustLaunch()

browser := rod.New().ControlURL(u).MustConnect()
```

---

## Examples

See the `examples/` directory for complete, runnable Go files:
- `examples/basic_scrape.go` — Minimal scraping example
- `examples/stealth_page.go` — Anti-detection with go-rod/stealth
- `examples/request_hijacking.go` — Intercepting and modifying network requests
- `examples/concurrent_pages.go` — Page pool for concurrent scraping

---

## Best Practices

- ✅ **ALWAYS use `stealth.MustPage(browser)`** instead of `browser.MustPage()` for real-world sites.
- ✅ **ALWAYS `defer browser.MustClose()`** immediately after connecting.
- ✅ Use the error-returning API (not `Must*`) in production code.
- ✅ Set explicit timeouts with `.Timeout()` — never rely on defaults for production.
- ✅ Use `browser.MustIncognito().MustPage()` for isolated sessions.
- ✅ Use `PagePool` for concurrent scraping instead of spawning unlimited pages.
- ✅ Use `MustWaitStable()` before clicking elements that might be animating.
- ✅ Use `MustWaitRequestIdle()` after actions that trigger AJAX calls.
- ✅ Use `launcher.New().Headless(false).Devtools(true)` for debugging.
- ❌ **NEVER** use `time.Sleep()` for waiting — use Rod's built-in wait methods.
- ❌ **NEVER** create a new `Browser` per task — create one Browser, use multiple `Page` instances.
- ❌ **NEVER** use `browser.MustPage()` for production scraping — use `stealth.MustPage()`.
- ❌ **NEVER** ignore errors in production — always handle them explicitly.
- ❌ **NEVER** forget to defer-close browsers, pages, and hijack routers.

## Common Pitfalls

- **Problem:** Element not found even though it exists on the page.
  **Solution:** The element may be inside an iframe or shadow DOM. Use `page.MustSearch()` instead of `page.MustElement()` — it searches across all iframes and shadow DOMs.

- **Problem:** Click doesn't work because the element is animating.
  **Solution:** Call `el.MustWaitStable()` before `el.MustClick()`.

- **Problem:** Bot detection despite using stealth.
  **Solution:** Combine `stealth.MustPage()` with: randomized viewport sizes, realistic User-Agent strings, human-like input delays between keystrokes, and random idle behaviors (scroll, hover).

- **Problem:** Browser process leaks (zombie processes).
  **Solution:** Always `defer browser.MustClose()`. Rod uses [leakless](https://github.com/ysmood/leakless) to kill zombies after main process crash, but explicit cleanup is preferred.

- **Problem:** Timeout errors on slow pages.
  **Solution:** Use chained context: `page.Timeout(30 * time.Second).MustWaitLoad()`. For AJAX-heavy pages, use `MustWaitRequestIdle()` instead of `MustWaitLoad()`.

- **Problem:** HijackRequests router not intercepting requests.
  **Solution:** You must call `go router.Run()` after setting up routes, and `defer router.MustStop()` for cleanup.

## Limitations

- **CAPTCHAs:** Rod does not include CAPTCHA solving. External services (2captcha, etc.) must be integrated separately.
- **Extreme Anti-Bot:** While `go-rod/stealth` handles common detection (WebDriver, plugin fingerprints, WebGL), extremely strict systems (some Cloudflare configurations, Akamai Bot Manager) may still detect automation. Additional measures (residential proxies, human-like behavioral patterns) may be needed.
- **DRM Content:** Cannot interact with DRM-protected media (e.g., Widevine).
- **Resource Usage:** Each browser instance consumes significant RAM (~100-300MB+). Use `PagePool` and limit concurrency on memory-constrained systems.
- **Extensions in Headless:** Chrome extensions do not work in headless mode. Use `Headless(false)` with XVFB for server environments.
- **Platform:** Requires a Chromium-compatible browser. Does not support Firefox or Safari.

## Documentation References

- [Official Documentation](https://go-rod.github.io/) — Guides, tutorials, FAQ
- [Go API Reference](https://pkg.go.dev/github.com/go-rod/rod) — Complete type and method documentation
- [go-rod/stealth](https://github.com/go-rod/stealth) — Anti-bot detection plugin
- [Examples (source)](https://github.com/go-rod/rod/blob/main/examples_test.go) — Official example tests
- [Rod vs Chromedp Comparison](https://github.com/nichochar/go-rod.github.io/blob/main/lib/examples/compare-chromedp) — Migration reference
- [Chrome DevTools Protocol Docs](https://chromedevtools.github.io/devtools-protocol/) — Underlying protocol reference
- [Chrome CLI Flags Reference](https://peter.sh/experiments/chromium-command-line-switches) — Launcher flag documentation
- `references/api-reference.md` — Quick-reference cheat sheet
