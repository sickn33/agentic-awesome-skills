# Vendor surfaces and link previews

Two kinds of surface the product does not fully render itself: a vendor's components and responses inside the product (sign-in, an organization modal, a pricing table, a billing read), and what a crawler or an unfurler makes of the page without running it (share cards, icons). Both are tested as the outside world sees them, never as the source describes them.

## A vendor's elements

- **A vendor's element keys, state classes and painted surfaces are measured from the rendered DOM — never inferred from types, docs or names.** Locators must account for live counts, actual tabs and readiness conditions. Composite alpha before comparing colours; resolve colour through the browser (a 1×1 canvas handles colour spaces), and poll past transitions. Scope contrast floors to what you set, not a vendor's own muted text. **Certified and invisible is not a fix:** ensure the active affordance survives a repaint. (`2026-09-17`, guessed Clerk locators, colour readings and a disappearing active pill each invented a different defect.)
- **A vendor's API responses are the same: a fake returns the shape the vendor actually sends, captured from a real call, never the shape its types or docs suggest.** A drill on development with the vendor's real test flow (a test-card checkout, a real webhook) finds what a fake cannot, and the fake is then rebuilt from what the drill saw. (`2026-10-23`, a monitoring product: a test-card checkout on development showed the paid plan in billing while the workspace's API calls got the free plan's limits, because the vendor's subscription read carried only a plan's publicly visible features; every test had faked a fuller response. The vendor's recipe is in `clerk-production`.)
- **A vendor's visible wording is not in your tree, so it is not part of the contract.** Locate its controls by their element-key class (on Clerk, `.cl-<elementKey>`), never by their words; the reason and receipt are in `clerk-production`.
- **A wrong measurement reaches more than one file, and the copy outside the gate is the one that ships.** When a fact proves wrong, grep the tree for what it authorized. Retargeting an assertion can repeat the mistake: check whether the colour reaches text or fill, and whether the pairing is already certified. (`2026-09-18`, a false report of signed-out pricing buttons survived in the visual suite after the gate's copy was fixed.)
- **An absence is assertable only when the surface is independently proved present** — loaded root, cards and prices — otherwise it is vacuous. The same rule holds for any "nothing found" assertion: the catalog suite's first assertion is that the product's tables exist (`rules-from-bugs.md § The database`).

## API contracts

- **Parse responses using exactly the bounds, formats and invariants the contract states.** Drop unknown fields and keep outgoing requests strict. Reject extra parser rules during review, especially when one invalid item makes a whole list unavailable. Write one test that walks the contract file. Feed each field its boundary values, every enum value and every allowed format. Use an emoji at the maximum string length where the contract permits it. Add an extra field at every object level. Choose how the product handles unknown enum values, such as rejecting the value, showing a generic label or hiding the item. (`2026-11-18`, six review rounds for a live Q&A product each found another rule stricter than the contract. A widened response enum would have blanked the whole list. The test that walked the contract ended the pattern.)
- **A mock and a co-developed service run the same contract suite.** Build the mock to the contract and run that suite against both the mock and the live development deployment, using fixtures each can reset. Update the mock in the same change as a new service rule, or record the divergence. (`2026-11-18`, the first live run for a live Q&A product exposed an ordering assumption in the suite. Reviews and manual inspection found later service rules the mock missed.)

## Link previews

- **The artifact nobody on the team ever looks at is the one a stranger sees first.** Link previews use the first server response, without JavaScript: **assert the raw response body, never the DOM** — `page.locator("meta")` cannot tell served from hydrated. Samples belong only on pages plainly about the product; a resource's preview must not offer another resource's identifier.
- **On Next.js, no page declares `openGraph` or `twitter`.** Next merges metadata shallowly onto the resolved object, which already holds the segment's file-based image, so a page's `openGraph` can discard it. Use `title` and `description`, file-based images per segment (`opengraph-image`, `twitter-image`), and global root fields, with a source guard that fails on a page declaring either key. `alternates.canonical` goes on each indexed page, never on the root layout. (`2026-09-18`, a pre-implementation response test caught three public cards losing their images.)
- **At a release that touched metadata**, read `og:image` off the raw production response of every public page (`release-gate`).

## Icons

- **A `200` with the right content type is not proof the artifact renders.** A standalone SVG is parsed as strict XML: a `--` inside a comment makes every browser refuse the file while the server still answers `200` with `image/svg+xml`. **Parse what you serve the way the client will** — fetch the icon the page links to and run `DOMParser` on the body, requiring no `parsererror`.
- **Require `/favicon.ico` too**, `200` with an icon content type, because search engines, bookmark tools and link unfurlers ask for it by convention. Next serves it only as a static `src/app/favicon.ico`, never from a route, so it is a checked-in binary rendered from `icon.svg` by a small script; regenerate and commit both whenever the mark changes. (`2026-09-18`, a product had no tab icon in any browser from the day its mark was drawn, while its post-deploy table recorded `/icon.svg` as *200, correct content type*.)

## Generated images

- **A generated image draws its type from disk, never from the network.** `opengraph-image`, `twitter-image` and `apple-icon` (`ImageResponse`, Satori) cannot use `next/font`'s generated assets and cannot decode WOFF2.
  - One server-only module reads the product's static WOFF or TTF files from an installed, pinned package, by explicit `node_modules/...` paths, so Next traces exactly those files into the build; it caches the promise once per process, and every `ImageResponse` passes its fonts.
  - A font fetched while a preview is being served is a network dependency on the request a crawler makes.
  - **A unit test makes `fetch` reject** and asserts it is never called and the promise is reused; **a source test** checks every image route passes the fonts.

  (`2026-09-18`, a product moved its share cards into its own typefaces.)
