# Go-Rod API Quick Reference

Cheat sheet for the most-used `go-rod/rod` and `go-rod/stealth` APIs.
Every `Must*` method has a corresponding error-returning version (without the `Must` prefix).

---

## Browser (`rod.Browser`)

| Method | Description |
|:-------|:------------|
| `rod.New().MustConnect()` | Launch new browser and connect |
| `rod.New().ControlURL(url).MustConnect()` | Connect to existing browser via WebSocket URL |
| `browser.MustClose()` | Close browser and all pages |
| `browser.MustPage(url)` | Create new page (tab) and navigate |
| `browser.MustPage()` | Create blank page |
| `browser.MustIncognito()` | Create isolated incognito context |
| `browser.MustIgnoreCertErrors(true)` | Ignore SSL certificate errors |
| `browser.MustHandleAuth(user, pass)` | Handle HTTP basic/proxy auth |
| `browser.HijackRequests()` | Create request interceptor router |
| `browser.MustWaitDownload()` | Wait for a file download to complete |
| `browser.ServeMonitor("")` | Start visual monitoring server |
| `browser.Trace(true)` | Enable verbose tracing |
| `browser.SlowMotion(duration)` | Add delay between actions |
| `rod.NewPagePool(n)` | Create pool of max `n` reusable pages |
| `rod.NewBrowserPool(n)` | Create pool of max `n` reusable browsers |

## Page (`rod.Page`)

| Method | Description |
|:-------|:------------|
| `page.MustNavigate(url)` | Navigate to URL |
| `page.MustWaitLoad()` | Wait for `load` event |
| `page.MustWaitStable()` | Wait until page DOM is stable |
| `page.MustWaitRequestIdle()` | Wait until no pending network requests |
| `page.MustWaitIdle()` | Wait for both load and request idle |
| `page.MustWait(js)` | Wait for JS expression to return truthy |
| `page.MustElement(selector)` | Find element by CSS selector (auto-wait) |
| `page.MustElementR(selector, regex)` | Find element by CSS + text regex |
| `page.MustElementX(xpath)` | Find element by XPath |
| `page.MustElements(selector)` | Find all matching elements |
| `page.MustSearch(query)` | Search across iframes + shadow DOM |
| `page.MustEval(js, args...)` | Execute JavaScript on page |
| `page.MustEvalOnNewDocument(js)` | Inject JS before any page script runs |
| `page.MustScreenshot(path)` | Take PNG screenshot |
| `page.MustPDF(path)` | Export page as PDF |
| `page.ScrollScreenshot(opts)` | Full-page scroll screenshot |
| `page.MustInfo()` | Get page info (title, URL) |
| `page.Timeout(duration)` | Set timeout for chained operations |
| `page.CancelTimeout()` | Remove timeout for subsequent operations |
| `page.Race()` | Start race selector (multiple outcomes) |
| `page.Keyboard` | Access keyboard controller |
| `page.Mouse` | Access mouse controller |
| `page.WaitEvent(proto)` | Wait for specific CDP event |
| `page.EachEvent(handler)` | Subscribe to events continuously |
| `page.Event()` | Channel-based event stream |

## Element (`rod.Element`)

| Method | Description |
|:-------|:------------|
| `el.MustClick()` | Click the element |
| `el.MustInput(text)` | Clear and type text into input |
| `el.MustType(keys...)` | Simulate key presses |
| `el.MustText()` | Get text content |
| `el.MustHTML()` | Get outer HTML |
| `el.MustProperty(name)` | Get JS property value |
| `el.MustAttribute(name)` | Get HTML attribute value |
| `el.MustWaitStable()` | Wait until position/size stable |
| `el.MustWaitVisible()` | Wait until element is visible |
| `el.MustWaitInvisible()` | Wait until element is hidden |
| `el.MustParents(selector)` | Find parent elements matching selector |
| `el.MustElements(selector)` | Find child elements |
| `el.MustMatches(selector)` | Check if element matches selector |
| `el.MustEval(js)` | Eval JS with `this` = element |
| `el.MustScreenshot(path)` | Screenshot just this element |

## Input (`rod/lib/input`)

| Constant | Description |
|:---------|:------------|
| `input.Enter` | Enter key |
| `input.Escape` | Escape key |
| `input.Tab` | Tab key |
| `input.Slash` | `/` key |
| `input.ControlLeft` | Left Ctrl |
| `input.ShiftLeft` | Left Shift |
| `input.KeyA` — `input.KeyZ` | Letter keys |
| `input.MouseLeft` | Left mouse button |

## Launcher (`rod/lib/launcher`)

| Method | Description |
|:-------|:------------|
| `launcher.New()` | Create new launcher |
| `l.Headless(bool)` | Enable/disable headless mode |
| `l.Devtools(bool)` | Auto-open DevTools |
| `l.Proxy(addr)` | Set proxy server |
| `l.Set(flag, value)` | Set Chrome CLI flag |
| `l.Delete(flag)` | Remove Chrome CLI flag |
| `l.MustLaunch()` | Launch browser, return control URL |
| `l.Cleanup()` | Kill browser process |
| `launcher.NewBrowser().MustGet()` | Download browser binary |
| `launcher.Open(url)` | Open URL in system browser |

## Stealth (`go-rod/stealth`)

| API | Description |
|:----|:------------|
| `stealth.MustPage(browser)` | Create stealth page (panics on error) |
| `stealth.Page(browser)` | Create stealth page (returns error) |
| `stealth.JS` | Raw JS string with all stealth evasions |

**What stealth.JS injects:**
- Removes `navigator.webdriver` detection
- Spoofs WebGL vendor/renderer to real GPU values
- Fixes Chrome plugin array (`PluginArray` type, count=3)
- Patches permissions API (returns `"prompt"`)
- Sets realistic languages (`en-US,en`)
- Fixes broken image dimensions (16x16 instead of 0x0)

## Network Hijacking (`rod.Hijack`)

| Method | Description |
|:-------|:------------|
| `router.MustAdd(pattern, handler)` | Add URL pattern handler |
| `router.Run()` | Start intercepting (call with `go`) |
| `router.MustStop()` | Stop intercepting |
| `ctx.Request.Req()` | Access `*http.Request` |
| `ctx.Request.URL()` | Get request URL |
| `ctx.LoadResponse(client, true)` | Load response from server |
| `ctx.MustLoadResponse()` | Load response (panics on error) |
| `ctx.Response.Body()` | Get response body |
| `ctx.Response.SetBody(s)` | Modify response body |
| `ctx.Response.Fail(reason)` | Block the request |
| `ctx.Response.Payload()` | Get response metadata |

## Direct CDP (`rod/lib/proto`)

```go
// Call any CDP method directly
proto.PageSetAdBlockingEnabled{Enabled: true}.Call(page)

// Or via generic JSON API
page.Call(ctx, "", "Page.setAdBlockingEnabled", map[string]bool{"enabled": true})
```

Full CDP protocol reference: https://chromedevtools.github.io/devtools-protocol/
