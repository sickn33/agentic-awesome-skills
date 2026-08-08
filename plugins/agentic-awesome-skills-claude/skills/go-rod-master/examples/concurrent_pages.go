package main

import (
	"fmt"
	"sync"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/stealth"
)

// concurrent_pages demonstrates using rod.PagePool for concurrent scraping
// with stealth-enabled pages.
func main() {
	browser := rod.New().
		Timeout(2 * time.Minute).
		MustConnect()
	defer browser.MustClose()

	// URLs to scrape concurrently
	urls := []string{
		"https://example.com",
		"https://example.org",
		"https://www.iana.org/domains/reserved",
		"https://www.iana.org/about",
	}

	// Create a page pool with max 3 concurrent pages
	pool := rod.NewPagePool(3)

	// Factory function: creates stealth-enabled pages in isolated incognito contexts
	create := func() *rod.Page {
		// MustIncognito creates an isolated browser context (separate cookies, storage)
		page := stealth.MustPage(browser.MustIncognito())
		return page
	}

	// Collect results safely using a mutex
	var mu sync.Mutex
	results := make(map[string]string)

	// Scrape all URLs concurrently
	var wg sync.WaitGroup
	for _, url := range urls {
		wg.Add(1)
		go func(u string) {
			defer wg.Done()

			// Get a page from the pool (blocks if pool is full)
			page := pool.MustGet(create)
			defer pool.Put(page) // return page to pool when done

			// Navigate and wait for the page to stabilize
			page.MustNavigate(u).MustWaitStable()

			// Extract the page title
			title := page.MustInfo().Title

			// Store result
			mu.Lock()
			results[u] = title
			mu.Unlock()

			fmt.Printf("[done] %s → %s\n", u, title)
		}(url)
	}

	// Wait for all goroutines to complete
	wg.Wait()

	// Clean up the pool
	pool.Cleanup(func(p *rod.Page) {
		p.MustClose()
	})

	// Print summary
	fmt.Printf("\n--- Results (%d pages scraped) ---\n", len(results))
	for url, title := range results {
		fmt.Printf("  %s: %s\n", url, title)
	}
}
