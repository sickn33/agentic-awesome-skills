package main

import (
	"fmt"
	"net/http"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"
	"github.com/go-rod/stealth"
)

// request_hijacking demonstrates intercepting and modifying network requests
// using Rod's HijackRequests API.
func main() {
	browser := rod.New().
		Timeout(time.Minute).
		MustConnect()
	defer browser.MustClose()

	// --- Example 1: Block image requests to save bandwidth ---
	router := browser.HijackRequests()
	defer router.MustStop()

	// Block all PNG and JPEG image requests
	router.MustAdd("*.png", func(ctx *rod.Hijack) {
		ctx.Response.Fail(proto.NetworkErrorReasonBlockedByClient)
	})
	router.MustAdd("*.jpg", func(ctx *rod.Hijack) {
		ctx.Response.Fail(proto.NetworkErrorReasonBlockedByClient)
	})

	// Modify request headers for API calls
	router.MustAdd("*api.*", func(ctx *rod.Hijack) {
		ctx.Request.Req().Header.Set("X-Custom-Header", "go-rod")
		ctx.Request.Req().Header.Set("Authorization", "Bearer my-token")

		// Load the actual response from the server
		if err := ctx.LoadResponse(http.DefaultClient, true); err != nil {
			fmt.Printf("Failed to load response: %v\n", err)
			return
		}

		fmt.Printf("API response status: %d\n", ctx.Response.Payload().ResponseCode)
	})

	// Inject JavaScript into every JS file loaded
	router.MustAdd("*.js", func(ctx *rod.Hijack) {
		if err := ctx.LoadResponse(http.DefaultClient, true); err != nil {
			return
		}
		// Append tracking code to all JavaScript files
		body := ctx.Response.Body()
		ctx.Response.SetBody(body + "\n// Monitored by go-rod")
	})

	// IMPORTANT: Start the router in a goroutine
	go router.Run()

	// Use stealth page for anti-detection
	page := stealth.MustPage(browser)
	page.MustNavigate("https://example.com").MustWaitLoad()

	fmt.Println("Page loaded with request hijacking active")
	fmt.Println("Title:", page.MustElement("title").MustText())

	// --- Example 2: Capture and log all network requests ---
	// (Using a separate page to show different patterns)
	page2 := stealth.MustPage(browser)

	// Enable network domain for request logging
	proto.NetworkEnable{}.Call(page2)

	// Listen for network responses
	go page2.EachEvent(func(e *proto.NetworkResponseReceived) {
		fmt.Printf("  [%d] %s %s\n",
			e.Response.Status,
			e.Type.String(),
			e.Response.URL,
		)
	})()

	page2.MustNavigate("https://example.com").MustWaitLoad()
	fmt.Println("\nNetwork log above shows all requests captured")
}
