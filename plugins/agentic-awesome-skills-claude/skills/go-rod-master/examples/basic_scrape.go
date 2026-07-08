package main

import (
	"fmt"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/input"
)

// basic_scrape demonstrates a minimal go-rod scraping workflow:
// Launch browser → navigate → extract text → close.
func main() {
	// Launch and connect to a new browser instance.
	// Rod auto-downloads Chromium if not present.
	browser := rod.New().
		Timeout(time.Minute). // global timeout for the browser
		MustConnect()
	defer browser.MustClose()

	// Navigate to the target page and wait for it to stabilize
	page := browser.MustPage("https://github.com").MustWaitStable()

	// Extract the page title via JavaScript evaluation
	title := page.MustElement("title").MustEval(`() => this.innerText`).String()
	fmt.Println("Page title:", title)

	// Use CSS selector to find elements
	links := page.MustElements("a[href]")
	fmt.Printf("Found %d links on the page\n", len(links))

	// Use keyboard shortcut to trigger search
	page.Keyboard.MustType(input.Slash)

	// Type into the search input and press Enter
	page.MustElement("#query-builder-test").MustInput("go-rod").MustType(input.Enter)

	// Wait for results — MustElementR matches by CSS selector + text regex
	result := page.MustElementR("span", "DevTools Protocol").MustText()
	fmt.Println("Found result:", result)
}
