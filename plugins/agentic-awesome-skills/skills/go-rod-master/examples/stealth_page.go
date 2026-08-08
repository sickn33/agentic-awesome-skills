package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
	"github.com/go-rod/rod/lib/utils"
	"github.com/go-rod/stealth"
)

// stealth_page demonstrates using go-rod/stealth to bypass bot detection.
// It creates a stealth-enabled page and verifies evasions against a detection site.
func main() {
	// Ensure the browser binary is downloaded
	launcher.NewBrowser().MustGet()

	// Launch browser with custom launcher settings
	url := launcher.New().
		Headless(true).
		MustLaunch()

	browser := rod.New().
		ControlURL(url).
		Timeout(time.Minute).
		MustConnect()
	defer browser.MustClose()

	// CRITICAL: Use stealth.MustPage instead of browser.MustPage
	// This injects anti-detection JavaScript into every new document
	page := stealth.MustPage(browser)

	// Navigate to a bot detection test page
	page.MustNavigate("https://bot.sannysoft.com")

	// Wait for the detection tests to complete
	page.MustElement("#broken-image-dimensions.passed")

	// Take a screenshot to verify results
	page.MustScreenshot("stealth_result.png")
	fmt.Println("Screenshot saved to stealth_result.png")

	// Print detection results
	printBotDetectionReport(page)

	// ---- Advanced: Using stealth.JS directly ----
	// If you need to create the page manually (e.g., with specific context),
	// you can inject stealth.JS via EvalOnNewDocument:
	advancedPage := browser.MustPage()
	advancedPage.MustEvalOnNewDocument(stealth.JS)
	advancedPage.MustNavigate("https://bot.sannysoft.com")
	advancedPage.MustElement("#broken-image-dimensions.passed")
	fmt.Println("\nAdvanced stealth page also passed detection tests")

	// ---- Production: Error handling pattern ----
	prodPage, err := stealth.Page(browser)
	if err != nil {
		fmt.Printf("Failed to create stealth page: %v\n", err)
		return
	}
	prodPage.MustNavigate("https://example.com")
	title, err := prodPage.MustElement("title").Text()
	if err != nil {
		fmt.Printf("Failed to get title: %v\n", err)
		return
	}
	fmt.Printf("\nProduction page title: %s\n", title)
}

// printBotDetectionReport extracts and prints the detection test results.
func printBotDetectionReport(page *rod.Page) {
	el := page.MustElement("#broken-image-dimensions.passed")
	for _, row := range el.MustParents("table").First().MustElements("tr:nth-child(n+2)") {
		cells := row.MustElements("td")
		key := cells[0].MustProperty("textContent")

		if strings.HasPrefix(key.String(), "User Agent") {
			ua := cells[1].MustProperty("textContent").String()
			passed := !strings.Contains(ua, "HeadlessChrome/")
			fmt.Printf("  %s: %t\n", key, passed)
		} else if strings.HasPrefix(key.String(), "Hairline Feature") {
			continue // machine-dependent, skip
		} else {
			fmt.Printf("  %s: %s\n", key, cells[1].MustProperty("textContent"))
		}
	}

	_ = utils.OutputFile("stealth_result.png", []byte{})
}
