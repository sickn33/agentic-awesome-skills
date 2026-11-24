---
name: eu-web-compliance
description: Heuristic static scanner and implementation patterns for Next.js, React, and HTML frontends targeting GDPR/CNIL consent gating, EAA/WCAG 2.1 AA, and EU legal footers.
risk: safe
source: https://github.com/Guerrier-florian/eu-web-compliance
source_repo: Guerrier-florian/eu-web-compliance
source_type: community
author: Florian Guerrier
license: MIT
license_source: https://github.com/Guerrier-florian/eu-web-compliance/blob/main/LICENSE
date_added: '2026-11-24'
category: development
tags:
  - gdpr
  - cnil
  - accessibility
  - wcag
  - eaa
  - compliance
  - frontend
---

# EU web compliance

## Operational boundaries

Keep the scope, sandbox, credentials, and approval settings supplied by the user or host. This skill operates strictly on local source files; the bundled audit script is read-only, has zero external dependencies, makes no network requests, and performs no filesystem writes. The script performs heuristic static source scanning only: it cannot establish runtime consent gating, dynamic tag-manager behavior, or full EAA/WCAG accessibility conformance, which require separate browser, network, and assistive-technology testing. Keep security and compliance reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Use this skill when implementing or reviewing EU web compliance patterns in Next.js, React, or static HTML frontends:
- Reviewing cookie consent, tracking scripts, and tag managers against GDPR, ePrivacy, and CNIL patterns.
- Applying accessibility patterns for the European Accessibility Act (EAA 2025) and WCAG 2.1 AA (landmarks, focus order, accessible names, contrast).
- Implementing legal footer links for French / EU regulations (Mentions légales LCEN, Politique de confidentialité, Déclaration d'accessibilité, CGV / DSA).
- Running zero-dependency heuristic static source scans with `audit-compliance.mjs` to flag common markup and script patterns.

## Four-step workflow

1. **Scan the target (heuristic static check).** From this repository or skill directory, run:
   ```sh
   node skills/eu-web-compliance/scripts/audit-compliance.mjs <target-dir>
   ```
   After installation, resolve `scripts/audit-compliance.mjs` relative to this `SKILL.md` and pass the application directory explicitly. Record the command, file count and static findings. An empty scan provides no coverage. If scanning fails, resolve the path or read error and repeat. The script flags heuristic static patterns only (known tracker URLs, un-gated embeds, remote Google Fonts, missing `alt`/`label` attributes, unnamed controls, and clickable `div`/`span` elements); it does not execute code or verify runtime consent state or full WCAG conformance.
2. **Triage static findings by severity.** In static output, **Blocker** flags an un-gated tracker pattern or a critical access barrier such as an unnamed control. **High** flags live third-party embeds or remote Google Fonts. **Medium** flags fragile custom click handlers on `div`/`span`. Escalate a keyboard barrier that prevents checkout to Blocker. Record file/line or route, evidence and proposed fix. Confirm framework bindings, accessible names and vendor gates in the rendered application.
3. **Fix the cause.** Use the [consent patterns](references/gdpr-consent-patterns.md) and [accessibility checklist](references/eaa-accessibility-checklist.md). Apply the footer contract below. Make essential routes work with optional processing refused. For dynamically loaded resources verify SSR markup, hydration, navigation and the tag manager configuration.
4. **Re-scan and perform runtime checks.** Run the static scanner again to confirm before/after counts. Then inspect the live browser network/storage on fresh entry, refusal, per-purpose acceptance and withdrawal, and test keyboard-only journeys, accessible names, contrast and legal links. Report before/after static counts, outstanding High/Medium findings, any static false positives with evidence, and manual checks performed or pending. A clean static scan (nonempty file count and zero reported static Blockers) is only a baseline pre-check; it does not establish runtime consent gating or accessibility conformance. Track confirmed runtime and manual findings separately and resolve them before sign-off.

## Footer contract

Render ordinary links in the shared footer, one click from every public page including checkout. Use stable URLs, descriptive localized link text and public server-renderable content. This project uses four page slots. Record the reason for any inapplicable slot in the audit.

| Page | Supply from the operator |
| --- | --- |
| Legal notice (Mentions légales) | Identify the publisher, legal form, registration, contact, publication director and host as applicable under French law. |
| Privacy policy (Politique de confidentialité) | Identify controller, purposes, lawful bases, recipients, transfers, retention, rights, complaint and contact channels. Link to the relevant notice at each collection point. |
| Accessibility statement (Déclaration d’accessibilité) | Identify scope, assessment date/method, known barriers, alternatives, feedback and applicable recourse. For EAA-covered services, also explain service accessibility in the terms or equivalent document. Use verified audit results. |
| Terms of sale (CGV) | For applicable sales flows cover seller, prices, payment, delivery, withdrawal, guarantees and disputes. Surface terms before the order is placed. |

For a French consumer storefront, render the applicable destinations in the base layout. Give each destination its own title, h1, dated content and contact route. Verify each URL returns the intended page with optional scripts disabled.

```html
<footer lang="fr">
  <nav aria-label="Informations légales">
    <a href="/mentions-legales">Mentions légales</a>
    <a href="/confidentialite">Politique de confidentialité</a>
    <a href="/accessibilite">Déclaration d’accessibilité</a>
    <a href="/conditions-generales-de-vente">Conditions générales de vente</a>
  </nav>
</footer>
```

Inspect the operator's jurisdiction. LCEN is French. Check DSA intermediary status before adding points of contact, terms on moderation or notice-and-action mechanisms. An ordinary merchant selling its own products and a marketplace can have different duties. Assess EAA service scope and exemptions, including service-providing microenterprises. Ask the owner for missing facts and flag incomplete content before release.

## Prohibited anti-patterns

- Fetching optional scripts, tag managers, pixels, thumbnails or embeds during SSR, hydration or prefetch before the relevant grant. An inert placeholder has no live network URL.
- Loading Google Fonts from its CDN without a deliberate consent gate. Prefer local font files and local CSS. Remove vendor preconnects.
- Preselecting optional checkboxes, accepting on scroll/dismissal, bundling unrelated purposes, or hiding “Reject all” behind settings. Give refusal and acceptance equal first-layer prominence.
- Treating a clickable div or span as a button. Use native buttons for actions and links for navigation. A role alone supplies no keyboard behavior.
- Removing focus outlines without a visible replacement, trapping focus outside a modal, or inventing conformance claims and legal identities.

## Authorities

Use the official guidance for the applicable service and country. [French website disclosures](https://entreprendre.service-public.gouv.fr/vosdroits/F37351) · [French online sales](https://entreprendre.service-public.gouv.fr/vosdroits/F23455) · [GDPR transparency](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence) · [Digital Services Act, Articles 11–16](https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng) · [European Accessibility Act, Articles 2, 4, 13 and Annex V](https://eur-lex.europa.eu/eli/dir/2019/882/oj/eng) · [French accessibility statement](https://accessibilite.numerique.gouv.fr/obligations/declaration-accessibilite/)
