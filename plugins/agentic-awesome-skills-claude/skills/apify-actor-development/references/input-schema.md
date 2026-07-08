# Input Schema Reference

The input schema defines the input parameters for an Actor. It's a JSON object comprising various field types supported by the Apify platform.

## Structure

```json
{
    "title": "<INPUT-SCHEMA-TITLE>",
    "type": "object",
    "schemaVersion": 1,
    "properties": {
        /* define input fields here */
    },
    "required": []
}
```

## Example

```json
{
    "title": "E-commerce Product Scraper Input",
    "type": "object",
    "schemaVersion": 1,
    "properties": {
        "startUrls": {
            "title": "Start URLs",
            "type": "array",
            "description": "URLs to start scraping from (category pages or product pages)",
            "editor": "requestListSources",
            "default": [{ "url": "https://example.com/category" }],
            "prefill": [{ "url": "https://example.com/category" }]
        },
        "followVariants": {
            "title": "Follow Product Variants",
            "type": "boolean",
            "description": "Whether to scrape product variants (different colors, sizes)",
            "default": true
        },
        "maxRequestsPerCrawl": {
            "title": "Max Requests per Crawl",
            "type": "integer",
            "description": "Maximum number of pages to scrape (0 = unlimited)",
            "default": 1000,
            "minimum": 0
        },
        "proxyConfiguration": {
            "title": "Proxy Configuration",
            "type": "object",
            "description": "Proxy settings for anti-bot protection",
            "editor": "proxy",
            "default": { "useApifyProxy": false }
        },
        "locale": {
            "title": "Locale",
            "type": "string",
            "description": "Language/country code for localized content",
            "default": "cs",
            "enum": ["cs", "en", "de", "sk"],
            "enumTitles": ["Czech", "English", "German", "Slovak"]
        }
    },
    "required": ["startUrls"]
}
```
