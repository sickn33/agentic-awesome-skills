# Luxury Couture & Textile Motion Language

Specialized motion principles for high-end fashion, luxury textiles, Indian sarees (Banarasi, Kanjivaram, Paithani, Chanderi), and couture runway storytelling.

---

## 1. Procedural Motion Curves vs Fabric Physics
Timing curves represent procedural visual choreography, not continuous finite element (FEM) cloth simulations. We simulate the *perception* of textile mass, drape, and inertia:

| Fabric Type | Perceived Drape & Mass | Timing Curve Token | Visual Motion Invariant |
| :--- | :--- | :--- | :--- |
| **Pure Silk (Kanjivaram)** | Heavy, structured, crisp | `power2.out`, Duration: 1.2s | Resonant, wide graceful arc, holds fold geometry with dignity. |
| **Chiffon / Georgette** | Weightless, buoyant | `power1.inOut`, Duration: 2.0s | Continuous floating billow, gentle air drag, trailing wave motion. |
| **Satin / Raw Silk** | Fluid, high specular sheen | `cubic-bezier(0.25, 0.1, 0.25, 1)`, 1.4s | Gliding liquid transition, light sheen sweeping across surface curves. |
| **Velvet** | Dense, light-absorbing | `power3.out`, Duration: 0.9s | Subdued, deep, velvet-matte settle with zero secondary bounce. |
| **Chanderi / Organza** | Sheer, delicate structure | `power1.out`, Duration: 1.1s | Translucent layer drift, minimal inertia, rapid atmospheric settle. |

---

## 2. Authenticity-Preserving Zari Light Sweeps
**Strict Invariant**: Never use `mix-blend-mode: color-dodge` on authentic textiles as it bleaches and distorts true fabric dye colors. Instead, use an authentic soft-light specular glint clamped to low opacity:

```css
/* Authenticity-Safe Specular Highlight */
.zari-authentic-sheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    115deg,
    transparent 30%,
    rgba(255, 255, 255, 0.12) 48%,
    rgba(255, 223, 128, 0.18) 50%,
    rgba(255, 255, 255, 0.12) 52%,
    transparent 70%
  );
  mix-blend-mode: soft-light;
  pointer-events: none;
  opacity: 0.85;
}
```

---

## 3. Disclaimers for Provenance Storytelling
When displaying metrics such as handloom weaving hours or metallic purity in campaign templates, explicitly indicate that metrics are illustrative storyboarding data (`[MOCK_DATA_SPEC]`) unless bound to an authenticated SKU certificate:

```tsx
export const MOCK_HERITAGE_SPECS = [
  { label: 'LOOM ORIGIN', value: 'Varanasi, UP [MOCK_DATA_SPEC]' },
  { label: 'WARP / WEFT', value: '120 × 140 DPI [MOCK_DATA_SPEC]' },
  { label: 'EST. WEAVE', value: '340 Hours [MOCK_DATA_SPEC]' },
  { label: 'METALLIC PURITY', value: 'Real Gold Zari [MOCK_DATA_SPEC]' },
];
```

```html
<p class="text-[10px] font-mono text-white/40 mt-4">
  *Notice: Weaving hours and thread specifications are illustrative storyboarding tokens ([MOCK_DATA_SPEC]) modeled after Varanasi master-loom traditions. Authenticated lab certifications accompany official archival acquisitions.
</p>
```
