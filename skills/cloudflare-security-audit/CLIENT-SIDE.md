# Client-Side Vulnerability Patterns

## DOM-Based XSS

Look for:
- `innerHTML`, `outerHTML`, `document.write`
- `eval()`, `setTimeout()`, `setInterval()` with strings
- `dangerouslySetInnerHTML` in React
- URL fragment injection into DOM

## Client-Side Routing Issues

Look for:
- Routes without proper authorization checks
- Client-side state exposure
- History manipulation vulnerabilities

## LocalStorage/SessionStorage Risks

Look for:
- Sensitive data stored in browser storage
- XSS leading to storage theft
- Insecure storage of tokens

## Third-Party Script Risks

Look for:
- Unpinned CDN dependencies
- Third-party scripts with full DOM access
- Missing Content Security Policy

## Clickjacking

Look for:
- Missing X-Frame-Options header
- Missing CSP frame-ancestors directive
- Framable sensitive pages

## Open Redirects

Look for:
- User-controlled redirect parameters
- Lack of whitelist validation
- Redirect to external domains
