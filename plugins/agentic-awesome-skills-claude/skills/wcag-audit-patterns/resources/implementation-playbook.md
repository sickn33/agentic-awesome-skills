# WCAG Audit Patterns Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

## Core Concepts

### 1. WCAG Conformance Levels

| Level   | Description            | Required For      |
| ------- | ---------------------- | ----------------- |
| **A**   | Minimum accessibility  | Legal baseline    |
| **AA**  | Standard conformance   | Most regulations  |
| **AAA** | Enhanced accessibility | Specialized needs |

### 2. POUR Principles

```
Perceivable:  Can users perceive the content?
Operable:     Can users operate the interface?
Understandable: Can users understand the content?
Robust:       Does it work with assistive tech?
```

### 3. Common Violations by Impact

```
Critical (Blockers):
├── Missing alt text for functional images
├── No keyboard access to interactive elements
├── Missing form labels
└── Auto-playing media without controls

Serious:
├── Insufficient color contrast
├── Missing skip links
├── Inaccessible custom widgets
└── Missing page titles

Moderate:
├── Missing language attribute
├── Unclear link text
├── Missing landmarks
└── Improper heading hierarchy
```

## Audit Checklist

### Perceivable (Principle 1)

````markdown
## 1.1 Text Alternatives

### 1.1.1 Non-text Content (Level A)

- [ ] All images have alt text
- [ ] Decorative images have alt=""
- [ ] Complex images have long descriptions
- [ ] Icons with meaning have accessible names
- [ ] CAPTCHAs have alternatives

Check:

```html
<!-- Good -->
<img src="chart.png" alt="Sales increased 25% from Q1 to Q2" />
<img src="decorative-line.png" alt="" />

<!-- Bad -->
<img src="chart.png" />
<img src="decorative-line.png" alt="decorative line" />
```
````

## 1.2 Time-based Media

### 1.2.1 Audio-only and Video-only (Level A)

- [ ] Audio has text transcript
- [ ] Video has audio description or transcript

### 1.2.2 Captions (Level A)

- [ ] All video has synchronized captions
- [ ] Captions are accurate and complete
- [ ] Speaker identification included

### 1.2.3 Audio Description (Level A)

- [ ] Video has audio description for visual content

## 1.3 Adaptable

### 1.3.1 Info and Relationships (Level A)

- [ ] Headings use proper tags (h1-h6)
- [ ] Lists use ul/ol/dl
- [ ] Tables have headers
- [ ] Form inputs have labels
- [ ] ARIA landmarks present

Check:

```html
<!-- Heading hierarchy -->
<h1>Page Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
<h2>Another Section</h2>

<!-- Table headers -->
<table>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Price</th>
    </tr>
  </thead>
</table>
```

### 1.3.2 Meaningful Sequence (Level A)

- [ ] Reading order is logical
- [ ] CSS positioning doesn't break order
- [ ] Focus order matches visual order

### 1.3.3 Sensory Characteristics (Level A)

- [ ] Instructions don't rely on shape/color alone
- [ ] "Click the red button" → "Click Submit (red button)"

## 1.4 Distinguishable

### 1.4.1 Use of Color (Level A)

- [ ] Color is not only means of conveying info
- [ ] Links distinguishable without color
- [ ] Error states not color-only

### 1.4.3 Contrast (Minimum) (Level AA)

- [ ] Text: 4.5:1 contrast ratio
- [ ] Large text (18pt+): 3:1 ratio
- [ ] UI components: 3:1 ratio

Tools: WebAIM Contrast Checker, axe DevTools

### 1.4.4 Resize Text (Level AA)

- [ ] Text resizes to 200% without loss
- [ ] No horizontal scrolling at 320px
- [ ] Content reflows properly

### 1.4.10 Reflow (Level AA)

- [ ] Content reflows at 400% zoom
- [ ] No two-dimensional scrolling
- [ ] All content accessible at 320px width

### 1.4.11 Non-text Contrast (Level AA)

- [ ] UI components have 3:1 contrast
- [ ] Focus indicators visible
- [ ] Graphical objects distinguishable

### 1.4.12 Text Spacing (Level AA)

- [ ] No content loss with increased spacing
- [ ] Line height 1.5x font size
- [ ] Paragraph spacing 2x font size
- [ ] Letter spacing 0.12x font size
- [ ] Word spacing 0.16x font size

````

### Operable (Principle 2)

```markdown
## 2.1 Keyboard Accessible

### 2.1.1 Keyboard (Level A)
- [ ] All functionality keyboard accessible
- [ ] No keyboard traps
- [ ] Tab order is logical
- [ ] Custom widgets are keyboard operable

Check:
```javascript
// Custom button must be keyboard accessible
<div role="button" tabindex="0"
     onkeydown="if(event.key === 'Enter' || event.key === ' ') activate()">
````

### 2.1.2 No Keyboard Trap (Level A)

- [ ] Focus can move away from all components
- [ ] Modal dialogs trap focus correctly
- [ ] Focus returns after modal closes

## 2.2 Enough Time

### 2.2.1 Timing Adjustable (Level A)

- [ ] Session timeouts can be extended
- [ ] User warned before timeout
- [ ] Option to disable auto-refresh

### 2.2.2 Pause, Stop, Hide (Level A)

- [ ] Moving content can be paused
- [ ] Auto-updating content can be paused
- [ ] Animations respect prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

## 2.3 Seizures and Physical Reactions

### 2.3.1 Three Flashes (Level A)

- [ ] No content flashes more than 3 times/second
- [ ] Flashing area is small (<25% viewport)

## 2.4 Navigable

### 2.4.1 Bypass Blocks (Level A)

- [ ] Skip to main content link present
- [ ] Landmark regions defined
- [ ] Proper heading structure

```html
<a href="#main" class="skip-link">Skip to main content</a>
<main id="main">...</main>
```

### 2.4.2 Page Titled (Level A)

- [ ] Unique, descriptive page titles
- [ ] Title reflects page content

### 2.4.3 Focus Order (Level A)

- [ ] Focus order matches visual order
- [ ] tabindex used correctly

### 2.4.4 Link Purpose (In Context) (Level A)

- [ ] Links make sense out of context
- [ ] No "click here" or "read more" alone

```html
<!-- Bad -->
<a href="report.pdf">Click here</a>

<!-- Good -->
<a href="report.pdf">Download Q4 Sales Report (PDF)</a>
```

### 2.4.6 Headings and Labels (Level AA)

- [ ] Headings describe content
- [ ] Labels describe purpose

### 2.4.7 Focus Visible (Level AA)

- [ ] Focus indicator visible on all elements
- [ ] Custom focus styles meet contrast

```css
:focus {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
}
```

### 2.4.11 Focus Not Obscured (Level AA) - WCAG 2.2

- [ ] Focused element not fully hidden
- [ ] Sticky headers don't obscure focus

````

### Understandable (Principle 3)

```markdown
## 3.1 Readable

### 3.1.1 Language of Page (Level A)
- [ ] HTML lang attribute set
- [ ] Language correct for content

```html
<html lang="en">
````

### 3.1.2 Language of Parts (Level AA)

- [ ] Language changes marked

```html
<p>The French word <span lang="fr">bonjour</span> means hello.</p>
```

## 3.2 Predictable

### 3.2.1 On Focus (Level A)

- [ ] No context change on focus alone
- [ ] No unexpected popups on focus

### 3.2.2 On Input (Level A)

- [ ] No automatic form submission
- [ ] User warned before context change

### 3.2.3 Consistent Navigation (Level AA)

- [ ] Navigation consistent across pages
- [ ] Repeated components same order

### 3.2.4 Consistent Identification (Level AA)

- [ ] Same functionality = same label
- [ ] Icons used consistently

## 3.3 Input Assistance

### 3.3.1 Error Identification (Level A)

- [ ] Errors clearly identified
- [ ] Error message describes problem
- [ ] Error linked to field

```html
<input aria-describedby="email-error" aria-invalid="true" />
<span id="email-error" role="alert">Please enter valid email</span>
```

### 3.3.2 Labels or Instructions (Level A)

- [ ] All inputs have visible labels
- [ ] Required fields indicated
- [ ] Format hints provided

### 3.3.3 Error Suggestion (Level AA)

- [ ] Errors include correction suggestion
- [ ] Suggestions are specific

### 3.3.4 Error Prevention (Level AA)

- [ ] Legal/financial forms reversible
- [ ] Data checked before submission
- [ ] User can review before submit

````

### Robust (Principle 4)

```markdown
## 4.1 Compatible

### 4.1.1 Parsing (Level A) - Obsolete in WCAG 2.2
- [ ] Valid HTML (good practice)
- [ ] No duplicate IDs
- [ ] Complete start/end tags

### 4.1.2 Name, Role, Value (Level A)
- [ ] Custom widgets have accessible names
- [ ] ARIA roles correct
- [ ] State changes announced

```html
<!-- Accessible custom checkbox -->
<div role="checkbox"
     aria-checked="false"
     tabindex="0"
     aria-labelledby="label">
</div>
<span id="label">Accept terms</span>
````

### 4.1.3 Status Messages (Level AA)

- [ ] Status updates announced
- [ ] Live regions used correctly

```html
<div role="status" aria-live="polite">3 items added to cart</div>

<div role="alert" aria-live="assertive">Error: Form submission failed</div>
```

````

## Automated Testing

```javascript
// axe-core integration
const axe = require('axe-core');

async function runAccessibilityAudit(page) {
  await page.addScriptTag({ path: require.resolve('axe-core') });

  const results = await page.evaluate(async () => {
    return await axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']
      }
    });
  });

  return {
    violations: results.violations,
    passes: results.passes,
    incomplete: results.incomplete
  };
}

// Playwright test example
test('should have no accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await runAccessibilityAudit(page);

  expect(results.violations).toHaveLength(0);
});
````

```bash
# CLI tools
npx @axe-core/cli https://example.com
npx pa11y https://example.com
lighthouse https://example.com --only-categories=accessibility
```

## Remediation Patterns

### Fix: Missing Form Labels

```html
<!-- Before -->
<input type="email" placeholder="Email" />

<!-- After: Option 1 - Visible label -->
<label for="email">Email address</label>
<input id="email" type="email" />

<!-- After: Option 2 - aria-label -->
<input type="email" aria-label="Email address" />

<!-- After: Option 3 - aria-labelledby -->
<span id="email-label">Email</span>
<input type="email" aria-labelledby="email-label" />
```

### Fix: Insufficient Color Contrast

```css
/* Before: 2.5:1 contrast */
.text {
  color: #767676;
}

/* After: 4.5:1 contrast */
.text {
  color: #595959;
}

/* Or add background */
.text {
  color: #767676;
  background: #000;
}
```

### Fix: Keyboard Navigation

```javascript
// Make custom element keyboard accessible
class AccessibleDropdown extends HTMLElement {
  connectedCallback() {
    this.setAttribute("tabindex", "0");
    this.setAttribute("role", "combobox");
    this.setAttribute("aria-expanded", "false");

    this.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "Enter":
        case " ":
          this.toggle();
          e.preventDefault();
          break;
        case "Escape":
          this.close();
          break;
        case "ArrowDown":
          this.focusNext();
          e.preventDefault();
          break;
        case "ArrowUp":
          this.focusPrevious();
          e.preventDefault();
          break;
      }
    });
  }
}
```

## Best Practices

### Do's

- **Start early** - Accessibility from design phase
- **Test with real users** - Disabled users provide best feedback
- **Automate what you can** - 30-50% issues detectable
- **Use semantic HTML** - Reduces ARIA needs
- **Document patterns** - Build accessible component library

### Don'ts

- **Don't rely only on automated testing** - Manual testing required
- **Don't use ARIA as first solution** - Native HTML first
- **Don't hide focus outlines** - Keyboard users need them
- **Don't disable zoom** - Users need to resize
- **Don't use color alone** - Multiple indicators needed

## Resources

- [WCAG 2.2 Guidelines](https://www.w3.org/TR/WCAG22/)
- [WebAIM](https://webaim.org/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [axe DevTools](https://www.deque.com/axe/)
