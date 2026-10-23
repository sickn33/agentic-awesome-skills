---
name: animated-github-profile
description: Build high-impact, animated GitHub profile READMEs that play like mini-movies using pure SVG, CSS, and SMIL animations. Covers dark/light theme switching, swinging lanyard ID badges, tech orbits, local stat cards, and automated contribution graphs.
category: development
risk: safe
source: self
source_type: self
date_added: "2026-10-22"
author: Shivam Namdev
tags:
  - github
  - profile-readme
  - svg-animation
  - smil
  - css-animation
  - portfolio
tools:
  - claude
  - cursor
  - gemini
license: MIT
metadata:
  version: 1.0.0
---

# Animated GitHub Profile Skill

A comprehensive guide and agent instruction set for designing, generating, and deploying animated GitHub profile READMEs that work within GitHub's JavaScript restrictions using pure SVG and CSS/SMIL animations.

---

## When to Use This Skill

- Use when designing, revamping, or generating an animated GitHub profile README (`username/username`).
- Use when working within GitHub's Markdown HTML sanitization to render interactive or motion elements using pure SVG, CSS `@keyframes`, and SMIL.
- Use when creating theme-adaptive assets (dark/light mode) using `<picture>` elements.
- Use when automating dynamic contribution graphs, snakes, or 3D cityscapes via GitHub Actions.

---

## Why SVG Animations?

1. **GitHub Security Model**: GitHub sanitizes all Markdown files and strips out all `<script>` tags, inline JavaScript, and iframes. Normal web motion libraries (Framer Motion, GSAP, Three.js) cannot execute in a GitHub README.
2. **Native SVG Motion**: Pure SVG with `@keyframes` CSS and SMIL (`<animate>`, `<animateTransform>`) is one animation option; animated GIFs are another, and SVG animation support varies by browser and image context.
3. **Zero Third-Party Downtime**: Unlike external status generators (e.g., `github-readme-stats`, `shields.io`) that frequently fail when GitHub API rate-limits are reached, self-contained SVGs committed to the profile repository avoid a live third-party generator dependency, though rendering and cache behavior still need testing.

---

## Architectural Layout

A top-tier animated profile combines the following modules stacked vertically in `README.md`:

```text
┌────────────────────────────────────────────────────────┐
│ 1. HERO BANNER (Dark / Light Auto-Switching via <picture>)
│    - Typing terminal prompt & blinking cursor          │
│    - Shimmering gradient name (letter-by-letter reveal)│
│    - Cycling typed role headlines                      │
│    - Hologram scanline laser sweep                     │
│    - Live code editor typing real project snippet      │
├──────────────────────────┬─────────────────────────────┤
│ 2. SWINGING LANYARD      │ 3. 3D TECH ORBIT            │
│    - Damped pendulum     │    - Satellites orbiting    │
│      swing physics       │      an atomic core         │
│    - Holographic glare   │    - Categorized capability │
│    - Avatar & barcode    │      matrix                 │
├──────────────────────────┴─────────────────────────────┤
│ 4. FEATURED ENGINEERING & WORKFLOW PROJECTS (Markdown) │
├────────────────────────────────────────────────────────┤
│ 5. AUTOMATED CONTRIBUTION VISUALIZER                   │
│    - Snake eating contribution dots (Platane/snk) OR   │
│    - 3D Isometric Night Skyline City                   │
├────────────────────────────────────────────────────────┤
│ 6. VERIFIED TECH BADGES & CONNECT LINKS                │
└────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation Workflow

### Step 1: Character Art / Avatar Generation

Prompt any AI image generator (ChatGPT/DALL-E, Midjourney, Gemini) to generate a clean character illustration. A pure white or transparent background is critical for clean cutouts.

#### Master Character Prompt:
```text
High-quality anime-style digital illustration of a young developer sitting relaxed in a sleek modern ergonomic chair with a dark laptop on their lap, softly smiling at the viewer. Sunglasses resting on head, wearing a cozy dark zip-up hoodie over a tech t-shirt, jeans. Beside them on a small glass-top table: a stack of programming books with spines reading "Python", "Agentic AI", "Docker", "System Architecture"; a takeaway coffee cup with "Code. Coffee. Repeat." written on it; and a small potted desk plant. Pure white background, warm soft rim lighting, clean detailed anime art style, vibrant colors, high resolution, full body in frame.
```

*Tip: Generate 3–4 variations and select the one with the cleanest edges and clearest facial crop for the lanyard badge.*

---

### Step 2: Generate Core Animated SVGs

Use the master prompts below with an AI coding assistant to create standalone SVG files.

#### 1. Hero Banner (`banner.svg` & `banner-light.svg`)
* **Dimensions**: `viewBox="0 0 1200 480"` (responsive, width="100%").
* **Left Section**:
  * macOS window control dots (`#ef4444`, `#f59e0b`, `#10b981`).
  * Live status pill with pulsing green indicator (`OPEN TO COLLABS`).
  * Terminal greeting `$ whoami --verbose`.
  * Bold name with animated multi-stop SVG gradient shimmer.
  * Cycling role headlines using CSS `@keyframes` with staggered opacities.
  * Value proposition and meta pills (Location, Experience, Roles).
* **Right Section**:
  * Simulated IDE code editor window (`0.95` opacity).
  * Syntax-highlighted code snippet typing out core domain logic (e.g. Python, Agentic AI, TypeScript).
  * Blinking rectangular cursor (`#22d3ee`).
* **Motion FX**:
  * Full-width laser scanner bar sweeping top-to-bottom on a 4.5s loop.
  * Ambient blurred background orbs with subtle breathing animations.
* **Light Palette Variant (`banner-light.svg`)**:
  * Background: `#ffffff` to `#f8fafc` with slate grid.
  * Shimmer colors: `#0284c7` to `#7c3aed` to `#db2777`.
  * Code card: Crisp light theme with high contrast dark text.

#### 2. Swinging Lanyard ID Badge (`lanyard.svg`)
* **Dimensions**: `viewBox="0 0 460 380"`.
* **Visual Components**:
  * Woven fabric strap entering from above the canvas.
  * Metallic clasp, swivel ring, and badge slot hole.
  * Glassmorphic card body with rounded corners (`rx="16"`).
  * Golden smart-card chip IC.
  * Neon-bordered avatar circle.
  * Developer metadata (Name, Title, Clearance Level, City).
  * Vector barcode lines with unique serial tag (`SN-007-PASS`).
* **Physics & Motion**:
  * Damped pendulum swing on initial load:
    ```css
    @keyframes lanyardSwing {
      0%   { transform: rotate(11deg); }
      15%  { transform: rotate(-8deg); }
      30%  { transform: rotate(5.5deg); }
      45%  { transform: rotate(-3.5deg); }
      60%  { transform: rotate(2deg); }
      75%  { transform: rotate(-1deg); }
      100% { transform: rotate(0deg); }
    }
    ```
  * Infinite subtle ambient drift (`±0.8deg`).
  * Diagonal holographic glare bar moving across the card every 4s.

#### 3. Tech Orbit System (`stack.svg`)
* **Dimensions**: `viewBox="0 0 680 380"`.
* **Visual Components**:
  * Glowing central core representing the developer's primary specialization.
  * Three concentric elliptical orbits (Inner, Middle, Outer) with dashed orbital paths.
  * Planetary satellites (Python, Docker, TypeScript, Playwright, CI/CD) revolving at independent speeds (`18s`, `26s`, `36s`).
  * Right-side capability matrix detailing core architectural pillars and experience metrics.

---

### Step 3: Setup Contribution Visualizer Workflows

Create automated GitHub Actions to regenerate contribution activity on a daily schedule.

#### Option A: Contribution Snake (`.github/workflows/snake.yml`)
```yaml
name: Generate Snake Contribution Animation

on:
  schedule:
    - cron: "0 0 * * *" # Runs daily at midnight UTC
  workflow_dispatch:
  push:
    branches:
      - main

permissions:
  contents: write

jobs:
  generate:
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Generate snake.svg
        uses: Platane/snk/svg-only@d8f6715049803e982ee5ff501b6b9b7d5deeb09b
        with:
          github_user_name: ${{ github.repository_owner }}
          outputs: |
            dist/github-contribution-grid-snake.svg
            dist/github-contribution-grid-snake-dark.svg?palette=github-dark&color_snake=#38bdf8&color_dots=#161b22,#0e4429,#006d32,#26a641,#39d353
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Push snake animation to output branch
        uses: crazy-max/ghaction-github-pages@c0d7ff0487ee0415efb7f32dab10ea880330b1dd
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### Option B: 3D Contribution City Skyline (`.github/workflows/profile-3d.yml`)
```yaml
name: GitHub 3D Contribution Calendar

on:
  schedule:
    - cron: "0 18 * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
        with:
          persist-credentials: true # Required only for this authorized generated-asset push.
      - uses: yoshi389111/github-profile-3d-contrib@f4cf497614310d7b45ab3e000a523e47c524b14f
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          USERNAME: ${{ github.repository_owner }}
      - name: Commit & Push
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add -- profile-3d-contrib
          if git diff --cached --quiet; then exit 0; fi
          git commit -m "Generated 3D Profile Calendar"
          git push
```

---

### Step 4: Assembling the `README.md`

Use HTML `<picture>` elements for native dark/light mode switching and add cache-busting queries:

```markdown
<div align="center">

  <!-- Responsive Auto-switching Hero Banner -->
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="banner.svg?v=1">
    <source media="(prefers-color-scheme: light)" srcset="banner-light.svg?v=1">
    <img src="banner.svg?v=1" width="100%" alt="Hero Banner">
  </picture>

  <br><br>

  <!-- Lanyard ID Badge & Capabilities Orbit -->
  <p align="center">
    <img src="lanyard.svg?v=1" width="41%" alt="ID Badge">
    <img src="stack.svg?v=1" width="57%" alt="Tech Orbit">
  </p>

</div>

---

### ⚡ About Me
> **[Your Role / Identity Headline]**  
> [Concise 2-sentence summary of your specialization, experience, and passions].

- 🤖 **Current Focus:** [Core projects or frameworks]
- 🎓 **Education & Mentorship:** [Courses, teaching, or open source curricula]
- 💬 **Ask Me About:** [Key technical domains]

---

### 🚀 Featured Engineering Projects

| Repository | Focus & Capabilities | Tech Stack | Link |
| :--- | :--- | :--- | :---: |
| [**Project 1**](https://github.com/user/project1) | Brief high-impact description of the problem solved. | `Python` `AI` `Docker` | [**Explore Repo →**](https://github.com/user/project1) |
| [**Project 2**](https://github.com/user/project2) | Educational tutorial or platform tool. | `TypeScript` `Playwright` | [**Explore Repo →**](https://github.com/user/project2) |

---

### 🐍 Contribution Activity

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/<USER>/<USER>/output/github-contribution-grid-snake-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/<USER>/<USER>/output/github-contribution-grid-snake.svg">
    <img src="https://raw.githubusercontent.com/<USER>/<USER>/output/github-contribution-grid-snake.svg" alt="Contribution Snake" width="100%">
  </picture>
</div>

---

### 📫 Connect & Collaborate

<p align="center">
  <a href="https://linkedin.com/in/<username>"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" /></a>
  &nbsp;&nbsp;
  <a href="mailto:<email>"><img src="https://img.shields.io/badge/Email-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" /></a>
  &nbsp;&nbsp;
  <a href="https://github.com/<username>"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" /></a>
</p>
```

---

## Critical Rules & Technical Gotchas

### 1. The GitHub CDN Cache-Busting Rule (`?v=1` ➔ `?v=2`)
* GitHub can proxy and cache externally hosted images through Camo (`camo.githubusercontent.com`).
* **Symptom**: You update an SVG file, push to GitHub, and the profile displays the old version.
* **Fix**: Always append a query version parameter to local links in `README.md` (`banner.svg?v=1`). Whenever you edit an SVG, bump the parameter (`?v=2`).
* **Order of Operations**:
  1. Commit and push the updated SVG files first.
  2. Commit and push the `README.md` with the bumped version number second.

### 2. Base64 Image Encoding (PNG over WebP)
* When embedding portraits, cutouts, or textures into an SVG via `<image href="data:image/png;base64,..." />`, always use **PNG** format.
* Safari (especially on iOS / older macOS) fails to decode Base64 WebP inside standalone SVGs.

### 3. XML Entity Escaping
* Standalone SVGs are strictly parsed as XML documents.
* Escape ampersands and less-than signs in XML text/attributes; greater-than usually need not be escaped except in restricted sequences. XML comments cannot contain `--`. CSS inside XML style text still needs escaping or CDATA.
* Always escape them (`&amp;`, `&lt;`, `&gt;`) or wrap `<style>` blocks in `<![CDATA[ ... ]]>`.

### 4. Generous Text Reveal Windows (No Font Clipping)
* Operating systems compute font line-heights and ascender/descender metrics differently (macOS vs Windows vs Linux).
* When creating typing reveal clipping paths (`<clipPath>`), ensure height and padding around the text are generous (at least 8–12px padding above and below) so letters like `g`, `y`, `p`, and `j` are never sliced off.

### 5. Fallback States for Animation-Disabled Environments
* Some clients disable CSS animations (e.g. `prefers-reduced-motion` or static vector viewers).
* Define a complete visible static state, then animate from it. `animation-fill-mode` alone does not disable motion. Add `@media (prefers-reduced-motion: reduce)` rules to disable CSS animations; SMIL requires its own static fallback/version.

### 6. Unique ID Namespacing
* If multiple SVGs share identical gradient IDs (e.g. `<linearGradient id="bg-grad">`), IDs can collide when SVGs are inlined into one document; separate `<img>` documents isolate them.
* Namespace all IDs per file: e.g. `banner-bg-grad`, `lanyard-card-grad`, `orbit-core-grad`.

---

## Limitations

- **No Arbitrary Script Execution**: GitHub's HTML sanitizer permanently strips inline `<script>` tags, event listeners (`onclick`), and external JavaScript libraries; interactive games or dynamic DOM manipulation within markdown are not supported.
- **Camo CDN Caching**: Dynamically updated external SVGs may experience caching delays unless appropriate `Cache-Control` headers are served or query parameters are bumped.
- **Rendering Performance**: Large numbers of complex SVG filter primitives (e.g., `<feGaussianBlur>` with high radius) or deeply nested SMIL loops can increase client CPU and battery usage on mobile devices.

---

## Security & Safety Notes

- When using GitHub Actions to push generated assets to a profile repository, grant least-privilege token permissions (`contents: write`).
- Verify third-party action SHAs and avoid exposing private tokens or email addresses in public SVG configs.

---

## Checklist for Production Release

- [ ] Repository created with exact username match (`username/username`).
- [ ] Character image generated with high contrast and transparent/white background.
- [ ] `banner.svg` and `banner-light.svg` tested locally in both dark and light modes.
- [ ] All SVGs validated through an XML parser with 0 syntax errors.
- [ ] All IDs in SVGs properly namespaced to prevent style collisions.
- [ ] Write permissions limited to the generation job; repository branch rules and third-party action revisions reviewed before enabling the workflow.
- [ ] Contribution workflow executed successfully and `output` branch populated.
- [ ] Version query parameter (`?v=1`) verified on all image links in `README.md`.
- [ ] Profile links (LinkedIn, Email, featured repos) verified with active URLs.

---

## Related Skills

- `@github-presence` — Comprehensive README structure, SEO, and discoverability.
- `@github-actions` — Building and debugging automated CI/CD workflows.

The SVG prompts are design specifications, not bundled working assets. Test through the hosted README image path, not only a locally opened SVG. Keep descriptive alt text and a static readable fallback. Do not fabricate clearance, employment or contribution claims. The city example writes to its current branch and may be blocked by protection; publish generated assets through an approved branch/PR workflow instead of weakening protection. Review each pinned third-party action and its output paths before granting write access; a pinned SHA alone is not a safety audit.
