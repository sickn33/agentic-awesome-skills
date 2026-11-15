# Accessibility Audit and Testing Implementation Playbook

These are integration sketches requiring project-local, lockfile-pinned tools, real component fixtures and an authorized test target. Browser navigation may fetch remote subresources; do not use private records or real credentials. A DOM heuristic or zero automated violations does not establish WCAG/legal conformance. Keep manual, assistive-technology and incomplete checks explicit.

## Instructions

### 1. Automated Testing with axe-core

```javascript
// accessibility-test.js
const { AxePuppeteer } = require("@axe-core/puppeteer");
const puppeteer = require("puppeteer");

class AccessibilityAuditor {
  constructor(options = {}) {
    this.wcagLevel = options.wcagLevel || "AA";
    if (this.wcagLevel !== "AA") throw new Error("This automated illustration targets AA only");
    this.viewport = options.viewport || { width: 1920, height: 1080 };
  }

  async runFullAudit(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    try {
    await page.setViewport(this.viewport);
    await page.goto(url, { waitUntil: "networkidle2" });

    const results = await new AxePuppeteer(page)
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    return {
      url,
      timestamp: new Date().toISOString(),
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => ({
          html: n.html,
          target: n.target,
          failureSummary: n.failureSummary,
        })),
      })),
      scope: "automated checks only",
      incomplete: results.incomplete,
      manualChecks: "not_run",
    };
    } finally { await browser.close(); }
  }


}

// Component testing with jest-axe
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

describe("Accessibility Tests", () => {
  it("should have no violations", async () => {
    const { container } = render(<MyComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 2. Color Contrast Validation

```javascript
// color-contrast.js
class ColorContrastAnalyzer {
    constructor() {
        this.wcagLevels = {
            'AA': { normal: 4.5, large: 3 },
            'AAA': { normal: 7, large: 4.5 }
        };
    }

    async analyzePageContrast(page) {
        const elements = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('*'))
                .filter(el => el.innerText && el.innerText.trim())
                .map(el => {
                    const styles = window.getComputedStyle(el);
                    return {
                        text: el.innerText.trim().substring(0, 50),
                        color: styles.color,
                        backgroundColor: styles.backgroundColor,
                        fontSize: parseFloat(styles.fontSize),
                        fontWeight: styles.fontWeight
                    };
                });
        });

        return elements
            .map(el => {
                const contrast = this.calculateContrast(el.color, el.backgroundColor);
                const isLarge = this.isLargeText(el.fontSize, el.fontWeight);
                const required = isLarge ? this.wcagLevels.AA.large : this.wcagLevels.AA.normal;

                if (contrast < required) {
                    return {
                        text: el.text,
                        currentContrast: contrast.toFixed(2),
                        requiredContrast: required,
                        foreground: el.color,
                        background: el.backgroundColor
                    };
                }
                return null;
            })
            .filter(Boolean);
    }

    calculateContrast(fg, bg) {
        const l1 = this.relativeLuminance(this.parseColor(fg));
        const l2 = this.relativeLuminance(this.parseColor(bg));
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    relativeLuminance(rgb) {
        const [r, g, b] = rgb.map(val => {
            val = val / 255;
            return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
}

// High contrast CSS
@media (prefers-contrast: high) {
    :root {
        --text-primary: #000;
        --bg-primary: #fff;
        --border-color: #000;
    }
    a { text-decoration: underline !important; }
    button, input { border: 2px solid var(--border-color) !important; }
}
```

### 3. Keyboard Navigation Testing

```javascript
// keyboard-navigation.js
class KeyboardNavigationTester {
  async testKeyboardNavigation(page) {
    const results = {
      focusableElements: [],
      missingFocusIndicators: [],
      keyboardTraps: [],
    };

    // Get all focusable elements
    const focusable = await page.evaluate(() => {
      const selector =
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
      return Array.from(document.querySelectorAll(selector)).map((el) => ({
        tagName: el.tagName.toLowerCase(),
        text: el.innerText || el.value || el.placeholder || "",
        tabIndex: el.tabIndex,
      }));
    });

    results.focusableElements = focusable;

    // Test tab order and focus indicators
    for (let i = 0; i < focusable.length; i++) {
      await page.keyboard.press("Tab");

      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el.tagName.toLowerCase(),
          hasFocusIndicator: window.getComputedStyle(el).outline !== "none",
        };
      });

      if (!focused.hasFocusIndicator) {
        results.missingFocusIndicators.push(focused);
      }
    }

    return results;
  }
}

// Enhance keyboard accessibility
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = document.querySelector(".modal.open");
    if (modal) closeModal(modal);
  }
});

// Make div clickable accessible
document.querySelectorAll("[onclick]").forEach((el) => {
  if (!["a", "button", "input"].includes(el.tagName.toLowerCase())) {
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        el.click();
        e.preventDefault();
      }
    });
  }
});
```

### 4. Screen Reader Testing

```javascript
// screen-reader-test.js
class ScreenReaderTester {
  async testScreenReaderCompatibility(page) {
    return {
      landmarks: await this.testLandmarks(page),
      headings: await this.testHeadingStructure(page),
      images: await this.testImageAccessibility(page),
      forms: await this.testFormAccessibility(page),
    };
  }

  async testHeadingStructure(page) {
    const headings = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
      ).map((h) => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent.trim(),
        isEmpty: !h.textContent.trim(),
      }));
    });

    const issues = [];
    let previousLevel = 0;

    headings.forEach((heading, index) => {
      if (heading.level > previousLevel + 1 && previousLevel !== 0) {
        issues.push({
          type: "skipped-level",
          message: `Heading level ${heading.level} skips from level ${previousLevel}`,
        });
      }
      if (heading.isEmpty) {
        issues.push({ type: "empty-heading", index });
      }
      previousLevel = heading.level;
    });

    if (!headings.some((h) => h.level === 1)) {
      issues.push({ type: "missing-h1", message: "Page missing h1 element" });
    }

    return { headings, issues };
  }

  async testFormAccessibility(page) {
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("form")).map((form) => {
        const inputs = form.querySelectorAll("input, textarea, select");
        return {
          fields: Array.from(inputs).map((input) => ({
            type: input.type || input.tagName.toLowerCase(),
            id: input.id,
            hasLabel: input.id
              ? !!document.querySelector(`label[for="${input.id}"]`)
              : !!input.closest("label"),
            hasAriaLabel: !!input.getAttribute("aria-label"),
            required: input.required,
          })),
        };
      });
    });

    const issues = [];
    forms.forEach((form, i) => {
      form.fields.forEach((field, j) => {
        if (!field.hasLabel && !field.hasAriaLabel) {
          issues.push({ type: "missing-label", form: i, field: j });
        }
      });
    });

    return { forms, issues };
  }
}

// ARIA patterns
const ariaPatterns = {
  modal: `
<div role="dialog" aria-labelledby="modal-title" aria-modal="true">
    <h2 id="modal-title">Modal Title</h2>
    <button aria-label="Close">×</button>
</div>`,

  tabs: `
<div role="tablist" aria-label="Navigation">
    <button id="tab-1" role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">Content</div>`,

  form: `
<label for="name">Name <span aria-label="required">*</span></label>
<input id="name" required aria-required="true" aria-describedby="name-error">
<span id="name-error" role="alert" aria-live="polite"></span>`,
};
```

### 5. Manual Testing Checklist

```markdown
## Manual Accessibility Testing

### Keyboard Navigation

- [ ] All interactive elements accessible via Tab
- [ ] Buttons activate with Enter/Space
- [ ] Esc key closes modals
- [ ] Focus indicator always visible
- [ ] No keyboard traps
- [ ] Logical tab order

### Screen Reader

- [ ] Page title descriptive
- [ ] Headings create logical outline
- [ ] Images have alt text
- [ ] Form fields have labels
- [ ] Error messages announced
- [ ] Dynamic updates announced

### Visual

- [ ] Text resizes to 200% without loss
- [ ] Color not sole means of info
- [ ] Focus indicators have sufficient contrast
- [ ] Content reflows at 320px
- [ ] Animations can be paused

### Cognitive

- [ ] Instructions clear and simple
- [ ] Error messages helpful
- [ ] No time limits on forms
- [ ] Navigation consistent
- [ ] Important actions reversible
```

### 6. Remediation Examples

```javascript
// Do not auto-fill missing alt text with "Image" or infer decoration from ancestry.
// Inspect the image's actual purpose and supply reviewed text; use alt="" only
// for a genuinely decorative image. Labels must reflect the real field purpose,
// not blindly copy a placeholder. Native semantic controls are preferred.

// React accessible components
const AccessibleButton = ({ children, onClick, ariaLabel, ...props }) => (
  <button onClick={onClick} aria-label={ariaLabel} {...props}>
    {children}
  </button>
);

const LiveRegion = ({ message, politeness = "polite" }) => (
  <div
    role="status"
    aria-live={politeness}
    aria-atomic="true"
    className="sr-only"
  >
    {message}
  </div>
);
```

### 7. CI/CD Integration

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on: [push, pull_request]

jobs:
  a11y-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install and build
        run: |
          npm ci
          npm run build

      - name: Start server
        run: |
          npm start &
          ./node_modules/.bin/wait-on http://localhost:3000 --timeout 30000

      - name: Run axe tests
        run: npm run test:a11y

      - name: Run pa11y
        run: ./node_modules/.bin/pa11y http://localhost:3000 --standard WCAG2AA --threshold 0

      - name: Upload report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: a11y-report
          path: a11y-report.html
```

### 8. Reporting

```javascript
// Render findings as text, not trusted HTML. Pure helper; no browser/network needed.
function escapeReportText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}
function renderFindings(violations) {
  return violations.map(v => `<section><h2>${escapeReportText(v.help)}</h2>` +
    `<p>${escapeReportText(v.description)}</p>` +
    `<p>Impact: ${escapeReportText(v.impact)}</p></section>`).join("");
}
```

Retain the target, tool/version, scanned pages, exclusions (with reasons), incomplete automated checks, manual checks and actual evidence references. Do not render arbitrary finding HTML/URLs or award a 100-point compliance score. The contrast and keyboard classes above have missing application adapters and are partial heuristics, not complete validators or screen-reader simulations.

## Output Format

1. **Audit Scope**: WCAG edition/level, actual tools, tested pages and untested coverage
2. **Violation Report**: Detailed issues with severity and fixes
3. **Test Results**: Automated and manual test outcomes
4. **Remediation Guide**: Step-by-step fixes for each issue
5. **Code Examples**: Accessible component implementations

Focus on creating inclusive experiences that work for all users, regardless of their abilities or assistive technologies.
