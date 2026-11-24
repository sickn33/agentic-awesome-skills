# Accessibility implementation checklist

Use WCAG 2.1 AA as the requested engineering baseline. Map the applicable web requirements to EN 301 549 (for example, clause 9 of V3.2.1). Record the edition and additional clauses required by the contract or national framework. EAA scope, service information and ongoing monitoring need separate assessment. [WCAG 2.1](https://www.w3.org/TR/WCAG21/) · [EN 301 549 V3.2.1](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf) · [European Accessibility Act](https://eur-lex.europa.eu/eli/dir/2019/882/oj/eng)

## Structure and navigation

- [ ] Set the document language and a descriptive, route-specific title. Use a header, named navigation where needed, one visible main landmark and a footer. Use a descriptive page h1, then h2–h6 matching the content hierarchy.
- [ ] Make the first focusable element a skip link. Its target must exist and receive focus. Keep tab order aligned with reading order. Avoid positive tabindex values.
- [ ] Use real links with href for destinations and buttons for actions. Check Tab, Shift+Tab, Enter, Space on buttons and Escape on dismissible layers. Test SPA navigation and focus after route changes.
- [ ] Give every control a meaningful accessible name. Prefer visible text or a linked label. For icon-only buttons use aria-label and hide decorative SVGs from assistive technology. Supply contextual alt text on informative images and empty alt on decorative ones.

```html
<a class="skip" href="#content">Skip to main content</a>
<main id="content" tabindex="-1"><h1>Delivery options</h1></main>
```

```css
.skip { position: absolute; inset-inline-start: 1rem; transform: translateY(-200%); }
.skip:focus { top: 1rem; transform: none; z-index: 10; background: white; color: #151515; }
:focus-visible { outline: 3px solid #1455bd; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .page-transition { animation: none; transition: none; }
}
```

## Forms and errors

- [ ] Match each label's for to a unique id (htmlFor in React). Provide autocomplete for known personal fields. Group related controls in a fieldset with a legend.
- [ ] On failed validation set aria-invalid, reveal a specific correction and connect it via aria-describedby. Preserve earlier hint IDs. Focus the error summary or the first invalid field after submission. Clear the error association when corrected.
- [ ] Make async status updates available through a pre-existing live region. Use text as well as color.

```html
<!-- State after validation failed -->
<label for="email">Email address</label>
<input id="email" type="email" autocomplete="email" required
       aria-invalid="true" aria-describedby="email-hint email-error">
<p id="email-hint">We send the receipt here.</p>
<p id="email-error">Enter a full address such as name@example.com.</p>
```

## Dialogs and focus

- [ ] Use a named native dialog opened via showModal(). Move focus into it, keep background content inert, support Escape and provide a visible close action. Return focus to the trigger or the logical next control.
- [ ] Cycle forward and backward with the keyboard. Verify the page behind the dialog cannot receive focus. For custom dialogs implement inert background, focus containment and restoration explicitly.

```html
<button type="button" id="open-help">Delivery help</button>
<dialog id="help" aria-labelledby="help-title">
  <h2 id="help-title">Delivery help</h2>
  <p>Standard deliveries arrive within five business days.</p>
  <form method="dialog"><button autofocus>Close</button></form>
</dialog>
<script type="module">
  const trigger = document.querySelector('#open-help');
  const dialog = document.querySelector('#help');
  trigger.addEventListener('click', () => dialog.showModal());
  dialog.addEventListener('close', () => trigger.focus());
</script>
```

## Visual and manual acceptance

- [ ] Measure foreground/background contrast in actual themes and states. Target at least 4.5:1 for ordinary text, 3:1 for large text (18 pt regular or 14 pt bold), and 3:1 for essential component boundaries, visual states and graphics. Verify focus rings against adjacent colors.
- [ ] Honor prefers-reduced-motion in CSS and JS, including carousel autoplay and animated route transitions. Preserve state changes and provide pause controls for moving content where required.
- [ ] At 200% text size and 320 CSS px viewport width, verify content reflows, actions remain reachable and sticky elements do not cover focus.
- [ ] Walk through consent, navigation, form errors, modal dismissal, checkout and all applicable footer pages with keyboard and screen reader. Record browser, assistive technology, route, observed result and unresolved defects. Test captions, transcripts and audio description when media requires them.
