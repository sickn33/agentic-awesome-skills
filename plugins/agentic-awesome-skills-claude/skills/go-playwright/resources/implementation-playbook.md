# Playwright Go Automation - Implementation Playbook

## Code Examples

### Standard Initialization (Headless + Zap)
```go
package main

import (
    "log"

    "github.com/playwright-community/playwright-go"
    "go.uber.org/zap"
)

func main() {
    // 1. Setup Logger
    logger, _ := zap.NewDevelopment()
    defer logger.Sync()

    // 2. Start Playwright Driver
    pw, err := playwright.Run()
    if err != nil {
        logger.Fatal("could not start playwright", zap.Error(err))
    }
    
    // 3. Launch Browser (Singleton)
    // Use Headless: false and SlowMo for Debugging
    browser, err := pw.Chromium.Launch(playwright.BrowserTypeLaunchOptions{
        Headless: playwright.Bool(false), 
        SlowMo:   playwright.Float(100), // Slow actions by 100ms for visibility
    })
    if err != nil {
        logger.Fatal("could not launch browser", zap.Error(err))
    }
    defer browser.Close() // Graceful cleanup

    // 4. Create Isolated Context (Session)
    context, err := browser.NewContext(playwright.BrowserNewContextOptions{
        UserAgent: playwright.String("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
        Viewport: &playwright.Size{Width: 1920, Height: 1080},
    })
    if err != nil {
        logger.Fatal("could not create context", zap.Error(err))
    }
    defer context.Close()

    // 5. Open Page
    page, _ := context.NewPage()
    
    // ... Implementation ...
    // Example: page.Goto("https://example.com")
}
```

### Human-Like Typing & Interaction
```go
import (
    "math/rand"
    "time"
)

// HumanType simulates a user typing with variable speed
func HumanType(locator playwright.Locator, text string) {
    // Focus the element first (like a human)
    locator.Click()
    
    for _, char := range text {
        // Random delay: 50ms to 150ms
        delay := time.Duration(rand.Intn(100) + 50) * time.Millisecond
        time.Sleep(delay)
        locator.Press(string(char))
    }
}

// HumanClick adds offset and hesitation
func HumanClick(page playwright.Page, selector string) {
    box, _ := page.Locator(selector).BoundingBox()
    if box == nil {
        return
    }
    
    // Calculate center with random offset (jitter)
    // Note: This is an example logic. 
    x := box.X + box.Width/2 + (rand.Float64()*10 - 5)
    y := box.Y + box.Height/2 + (rand.Float64()*10 - 5)
    
    // Move mouse smoothly. 
    // Ideally, implement a Bezier curve function for 'steps' to look truly human.
    page.Mouse().Move(x, y, playwright.MouseMoveOptions{Steps: playwright.Int(10)})
    time.Sleep(100 * time.Millisecond) // Hesitate
    page.Mouse().Click(x, y)
}
```

### Session Management (Save/Load Cookies)

```go
func SaveSession(context playwright.BrowserContext, filepath string) {
    // cookies, _ := context.Cookies()
    // Serialize cookies to JSON and write to 'filepath'
    // Implementation left to user: json.Marshal(cookies) -> os.WriteFile
}

func LoadSession(context playwright.BrowserContext, filepath string) {
    // Read JSON from 'filepath' and deserialize
    // var cookies []playwright.Cookie
    // context.AddCookies(cookies)
}
```
