---
name: webapp-testing
description: "To test local web applications, write native Python Playwright scripts."
risk: critical
source: community
date_added: "2026-02-27"
---

# Web Application Testing

Catalog modification: source-review-first and state-based waits; server helper bounds/cleanup updated.

To test local web applications, write native Python Playwright scripts.

**Helper Scripts Available**:
- `scripts/with_server.py` - Manages server lifecycle (supports multiple servers)

**Inspect helper source, project scripts and lifecycle hooks before execution.** Use `--help` only after review; even help is code execution. These helpers are convenience scaffolds, not an execution sandbox.

## Decision Tree: Choosing Your Approach

```
User task → Is it static HTML?
    ├─ Yes → Read HTML file directly to identify selectors
    │         ├─ Success → Write Playwright script using selectors
    │         └─ Fails/Incomplete → Treat as dynamic (below)
    │
    └─ No (dynamic webapp) → Is the server already running?
        ├─ No → Run: python scripts/with_server.py --help
        │        Then use the helper + write simplified Playwright script
        │
        └─ Yes → Reconnaissance-then-action:
            1. Navigate and wait for a specific visible application-ready condition
            2. Take screenshot or inspect DOM
            3. Identify selectors from rendered state
            4. Execute actions with discovered selectors
```

## Example: Using with_server.py

To start a server, run `--help` first, then use the helper:

**Single server:**
```bash
python scripts/with_server.py --server "npm run dev" --port 5173 -- python your_automation.py
```

**Multiple servers (e.g., backend + frontend):**
```bash
python scripts/with_server.py \
  --server "cd backend && python server.py" --port 3000 \
  --server "cd frontend && npm run dev" --port 5173 \
  -- python your_automation.py
```

To create an automation script, include only Playwright logic (servers are managed automatically):
```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True) # Always launch chromium in headless mode
    page = browser.new_page()
    page.goto('http://localhost:5173') # Server already running and ready
    page.get_by_role('main').wait_for(state='visible') # replace with actual ready state
    # ... your automation logic
    browser.close()
```

## Reconnaissance-Then-Action Pattern

1. **Inspect rendered DOM**:
   ```python
   page.screenshot(path='APPROVED_PRIVATE_ARTIFACT_DIR/inspect.png', full_page=True)
   content = page.content()
   page.locator('button').all()
   ```

2. **Identify selectors** from inspection results

3. **Execute actions** using discovered selectors

## Common Pitfall

Use locator assertions for the actual application state; networkidle can hang on polling and does not prove hydration or business readiness.

## Best Practices

- **Review bundled scripts before use** - To accomplish a task, consider whether one of the scripts available in `scripts/` can help. Their allowlist is not a security boundary: npm/node/python commands can execute arbitrary project code. Use `--help` to see usage, then invoke directly.
- Use `sync_playwright()` for synchronous scripts
- Always close the browser when done
- Use descriptive selectors: `text=`, `role=`, CSS selectors, or IDs
- Add appropriate waits: `page.wait_for_selector()` or `page.wait_for_timeout()`

## Reference Files

- **examples/** - Examples showing common patterns:
  - `element_discovery.py` - Discovering buttons, links, and inputs on a page
  - `static_html_automation.py` - Using file:// URLs for local HTML
  - `console_logging.py` - Capturing console logs during automation

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Server and test boundaries

Use an authorized isolated test database/account and bind local dev servers to loopback. Read project start/test scripts before running; executable-name and argument checks do not prevent network, lifecycle scripts or arbitrary Python/JavaScript execution. The helper refuses existing listeners, uses bounded waits and discards server stdout/stderr to avoid pipe deadlock; a TCP listener is still only a readiness hint, so verify the expected HTTP/page identity. POSIX cleanup targets the launched process group; Windows child-process tree cleanup is not guaranteed, and any process escaping its group needs explicit cleanup. Test-command timeout does not guarantee descendant termination. Save screenshots/logs in approved private paths and redact credentials/PII; do not overwrite shared /tmp files. The referenced examples directory is absent in this import, so do not claim those scripts are bundled. A passing screenshot/DOM check is not functional, accessibility or security coverage; report exact actions and assertions run, failures and untested paths.
