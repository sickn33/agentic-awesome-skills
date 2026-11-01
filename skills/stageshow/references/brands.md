# Brand marks

Use current real artwork when a scene shows a known product or payment method. Check the official brand source before trusting a third-party icon catalog: catalogs keep outdated colors and logos. `BrandMark` has a small local registry for common integrations and checkout rows. The SVGs ship with the kit, keep their original colors and proportions, and never call an icon service at runtime.

```tsx
import { BrandMark } from './kit'

<BrandMark brand="google-calendar" size={28} />
<BrandMark brand="visa" size={20} tile={false} />
<BrandMark name="Your product" src="/assets/product.svg" size={28} />
```

`size` is the footprint's height. App marks get a square footprint; wide payment marks get a proportionate width. Amex uses its white wordmark on a blue card tile, and its official blue-box logo when bare. A mark that ships as a glyph on a solid square field (Dropbox) is shown as the glyph alone in its brand color, on the same white tile as the other app marks; a sharp blue square inside a rounded white one is never right, and a solid blue tile shouts next to the rest of the row. `width` overrides the footprint when a product row has a fixed track. The artwork is always `object-fit: contain`, never stretched to fill a square. The bundled marks carry optical scale adjustments, so a narrow Figma mark and a full Gmail mark have the same presence.

`surface` follows the Stage's light or dark theme. Pass `surface="light"` for a white card inside a dark Stage. Dark variants are picked automatically where supplied; full-color artwork without one keeps a white tile on a dark surface. If you remove the tile, check the bare mark against its real background. Keep the native colors even in a monochrome UI. Crypto marks are flat, with no coin bevels or metallic shading.

`name` overrides the accessible label. A custom `name` with no artwork keeps the neutral initial tile for a fictional product; never use an initial or a hand-drawn approximation in place of a supplied real mark. Minimal fidelity hides the artwork along with the other content.

A real company named in the scene (Chase, Wells Fargo, Stripe, Slack) carries its real mark from `kit/brands/`, never an initial in a brand-colored tile: that is an invented logo beside a real name, and film flags `invented mark`. The kit carries the payment networks, the common product marks and seven banks (Chase, Wells Fargo, Bank of America, Barclays, HSBC, Monzo, Revolut, in `kit/brands/`, category Banks). If the kit has no mark for the company, name one it has, or a fictional one with the neutral initial tile; a real name and a fake mark together are the one thing never shipped.

| Group | `brand` values |
|---|---|
| Payments | `visa`, `mastercard`, `amex`, `discover`, `paypal`, `stripe` |
| Crypto | `bitcoin`, `ethereum`, `solana`, `usdc`, `tether` |
| Banks | `chase`, `wellsfargo`, `bankofamerica`, `barclays`, `hsbc`, `monzo`, `revolut` |
| Apps | `notion`, `gmail`, `google-calendar`, `google-docs`, `1password`, `figma`, `slack`, `github`, `linear`, `dropbox`, `google-drive`, `google-sheets`, `google-slides`, `google-meet`, `zoom`, `vercel`, `shopify` |

Use only the integrations or payment methods the scene needs. A small row explains a relationship; it does not fill spare space with logos. Keep equal row tracks and align the marks by eye: their different silhouettes are no excuse for ragged labels or uneven gaps.

`examples/brand-marks/` shows every bundled mark on light and dark surfaces. `brandMarks` and `BrandName` are exported for a typed picker or registry lookup. `kit/brands/SOURCES.md` has the pinned artwork sources and licenses.

Inspect the rendered artwork, not just its image box. Tall marks need real air above and below; wide marks must show in full. Give the image a definite box inside a centered flex layout: percentage image dimensions in an intrinsic grid track can grow unexpectedly and leave uneven insets. Check the real light and dark backgrounds, not just their theme attributes.
