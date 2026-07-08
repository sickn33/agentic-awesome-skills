# Advanced Stitch Techniques

Advanced strategies for maximizing Stitch's capabilities and creating production-ready designs.

## Table of Contents

1. [Image-to-UI Workflows](#image-to-ui-workflows)
2. [Design System Integration](#design-system-integration)
3. [Responsive Design Strategies](#responsive-design-strategies)
4. [Accessibility Considerations](#accessibility-considerations)
5. [Performance Optimization](#performance-optimization)
6. [Component Reusability](#component-reusability)

---

## Image-to-UI Workflows

### Converting Sketches to Digital UI

Stitch can interpret hand-drawn sketches, wireframes, and rough mockups.

**Best practices:**

1. **Clear structure** - Draw distinct boxes for components
2. **Label elements** - Annotate buttons, inputs, sections
3. **Show hierarchy** - Use size and position to indicate importance
4. **Include notes** - Add text describing interactions or states

**Example workflow:**
```
1. Sketch wireframe on paper or tablet
2. Take clear photo or scan
3. Upload to Stitch with prompt:
   "Convert this wireframe to a modern web interface with 
   glassmorphic design and purple gradient accents"
4. Refine generated design with annotations
```

### Reference-Based Design

Upload screenshots of existing designs to create similar layouts with your own branding.

**Prompt structure:**
```
Create a [type] similar to this reference image, but with:
- [Your color scheme]
- [Your content/copy]
- [Your brand style]
- [Specific modifications]
```

**Example:**
```
Create a pricing page similar to this reference, but with:
- Navy blue and gold color scheme
- 4 pricing tiers instead of 3
- Annual/monthly toggle
- Feature comparison table below
- Testimonials section at bottom
```

---

## Design System Integration

### Establishing Design Tokens

Define reusable design tokens in your initial prompt for consistency across screens.

**Token categories:**
- Colors (primary, secondary, accent, neutral, semantic)
- Typography (font families, sizes, weights, line heights)
- Spacing (scale: 4px, 8px, 16px, 24px, 32px, 48px, 64px)
- Border radius (none, sm, md, lg, full)
- Shadows (elevation levels)

**Example prompt:**
```
Dashboard using this design system:

Colors:
- Primary: #2563EB (blue)
- Secondary: #7C3AED (purple)
- Success: #10B981 (green)
- Warning: #F59E0B (amber)
- Error: #EF4444 (red)
- Neutral: #6B7280 (gray)

Typography:
- Headings: Inter Bold
- Body: Inter Regular
- Code: JetBrains Mono

Spacing: 8px base unit
Border radius: 8px for cards, 4px for buttons
Shadows: Subtle elevation with 0 4px 6px rgba(0,0,0,0.1)
```

### Component Library Approach

Create a component library by generating individual components first, then composing them into full screens.

**Workflow:**
```
1. Generate base components:
   - Button variants (primary, secondary, outline, ghost)
   - Input fields (text, email, password, search)
   - Cards (basic, with image, with actions)
   - Navigation (header, sidebar, tabs)

2. Document component specs:
   - States (default, hover, active, disabled)
   - Sizes (sm, md, lg)
   - Variants

3. Compose screens using established components:
   "Create a settings page using the button and input 
   components from previous generations"
```

---

## Responsive Design Strategies

### Mobile-First Approach

Start with mobile design, then scale up to tablet and desktop.

**Prompt sequence:**

**Step 1 - Mobile (375px):**
```
Mobile app home screen for recipe platform

Layout:
- Stacked vertical sections
- Full-width cards
- Bottom navigation
- Hamburger menu

Content:
- Search bar at top
- Featured recipe hero card
- Category chips (horizontal scroll)
- Recipe grid (1 column)
```

**Step 2 - Tablet (768px):**
```
Adapt the mobile recipe home screen for tablet:
- 2-column recipe grid
- Persistent sidebar navigation (replaces hamburger)
- Larger featured hero with side-by-side layout
- Category chips remain scrollable
```

**Step 3 - Desktop (1440px):**
```
Adapt for desktop:
- 3-column recipe grid
- Full sidebar with categories expanded
- Hero section with 3 featured recipes
- Top navigation bar with search and user menu
```

### Breakpoint-Specific Prompts

Specify exact breakpoints and layout changes.

**Example:**
```
Responsive product grid:

Mobile (< 640px):
- 1 column
- Full-width cards
- Vertical image orientation

Tablet (640px - 1024px):
- 2 columns
- Square images
- Compact card layout

Desktop (> 1024px):
- 4 columns
- Hover effects with overlay
- Quick view button
```

---

## Accessibility Considerations

### WCAG Compliance Prompts

Include accessibility requirements directly in prompts.

**Key areas to specify:**

1. **Color Contrast**
```
Ensure all text meets WCAG AA standards:
- Normal text: 4.5:1 contrast ratio minimum
- Large text (18pt+): 3:1 contrast ratio minimum
- Interactive elements: clear focus states with 3:1 contrast
```

2. **Touch Targets**
```
All interactive elements minimum 44x44px touch target size
Adequate spacing between clickable elements (8px minimum)
```

3. **Keyboard Navigation**
```
Clear focus indicators on all interactive elements
Logical tab order following visual flow
Skip navigation link for keyboard users
```

4. **Screen Reader Support**
```
Descriptive button labels (not just "Click here")
Alt text for all meaningful images
Form labels properly associated with inputs
Heading hierarchy (H1 → H2 → H3)
```

**Comprehensive accessibility prompt:**
```
Create an accessible contact form:

Fields:
- Name (required, with aria-required)
- Email (required, with validation and error message)
- Subject (dropdown with clear labels)
- Message (textarea with character count)

Accessibility features:
- All inputs have visible labels
- Required fields marked with asterisk and aria-required
- Error messages with role="alert"
- Submit button with descriptive text
- Focus indicators with 3px blue outline
- Color contrast meets WCAG AA
- Touch targets 44x44px minimum

Style: Clean, form-focused, high contrast
Colors: Dark text on light background, red for errors
```

### Inclusive Design Patterns

**Consider diverse users:**

```
Design a video player interface that supports:
- Captions/subtitles toggle
- Audio description option
- Keyboard shortcuts (space to play/pause, arrows to seek)
- Playback speed control
- High contrast mode
- Reduced motion option (disable animations)
```

---

## Performance Optimization

### Optimized Asset Prompts

Request performance-conscious designs from the start.

**Image optimization:**
```
E-commerce product gallery with performance optimization:
- Lazy loading for images below fold
- Thumbnail images (200x200px) for grid
- Full-size images (1200x1200px) only on click
- WebP format with JPEG fallback
- Blur placeholder while loading
```

**Code efficiency:**
```
Generate lightweight HTML/CSS without:
- Unnecessary wrapper divs
- Inline styles (use classes)
- Large external dependencies
- Redundant CSS rules
```

### Progressive Enhancement

Design for core functionality first, then enhance.

**Example:**
```
Create a filterable product list with progressive enhancement:

Base (no JavaScript):
- Server-rendered product grid
- Form-based filters with submit button
- Pagination links

Enhanced (with JavaScript):
- AJAX filter updates without page reload
- Infinite scroll
- Smooth animations
- Real-time search
```

---

## Component Reusability

### Atomic Design Methodology

Build from atoms → molecules → organisms → templates → pages.

**Atoms (basic elements):**
```
Generate design system atoms:
- Button (primary, secondary, outline, ghost, danger)
- Input field (text, email, password, search, textarea)
- Label, Badge, Tag
- Icon set (24x24px, consistent style)
- Avatar (circle, square, with status indicator)
```

**Molecules (simple combinations):**
```
Create molecules using atoms:
- Search bar (input + button + icon)
- Form field (label + input + error message)
- Card header (avatar + name + timestamp + menu)
- Stat card (icon + label + value + trend)
```

**Organisms (complex components):**
```
Build organisms from molecules:
- Navigation bar (logo + search bar + user menu)
- Product card (image + title + price + rating + button)
- Comment thread (avatar + name + timestamp + text + actions)
- Data table (headers + rows + pagination + filters)
```

**Templates (page layouts):**
```
Compose templates from organisms:
- Dashboard layout (sidebar + header + content grid)
- Article layout (header + hero + content + sidebar)
- Checkout flow (progress + form + summary)
```

### Variant Generation

Create systematic variations of components.

**Button variants prompt:**
```
Generate button component with all variants:

Sizes: Small (32px), Medium (40px), Large (48px)

Types:
- Primary (filled, brand color)
- Secondary (filled, gray)
- Outline (border only)
- Ghost (transparent, hover background)
- Danger (filled, red)

States for each:
- Default
- Hover
- Active (pressed)
- Disabled
- Loading (with spinner)

Include: Icon support (left/right), full-width option
```

---

## Advanced Iteration Techniques

### Conditional Variations

Generate multiple versions based on different conditions.

**Example:**
```
Create 3 hero section variants for A/B testing:

Variant A - Image-focused:
- Large background image
- Minimal text overlay
- Single CTA button

Variant B - Text-focused:
- Solid color background
- Detailed copy with bullet points
- Two CTA buttons (primary + secondary)

Variant C - Video-focused:
- Background video
- Minimal text
- Play button + CTA

All variants use same brand colors and maintain mobile responsiveness
```

### State-Based Design

Design for all possible states, not just the happy path.

**Comprehensive state prompt:**
```
Design a data table with all states:

Default state:
- 10 rows of data
- Sortable columns
- Pagination

Loading state:
- Skeleton loaders for rows
- Disabled controls

Empty state:
- Illustration
- "No data found" message
- "Add new" CTA button

Error state:
- Error icon
- Error message
- "Retry" button

Search/Filter active:
- Applied filters shown as chips
- Clear filters option
- Result count

Selected rows:
- Checkbox selection
- Bulk action toolbar
- Select all option
```

---

## Export and Handoff Best Practices

### Preparing for Development

Before exporting, ensure designs are developer-ready.

**Pre-export checklist:**

1. **Naming conventions**
   - Use semantic class names
   - Follow BEM or consistent methodology
   - Name components clearly

2. **Documentation**
   - Add comments for complex interactions
   - Document responsive breakpoints
   - Note any required JavaScript behavior

3. **Asset organization**
   - Export images at correct sizes
   - Provide SVG for icons
   - Include font files or CDN links

4. **Specifications**
   - Document spacing values
   - List color hex codes
   - Specify font sizes and weights

### Figma Integration

Optimize Stitch → Figma workflow.

**Steps:**
```
1. Generate design in Stitch with detailed specifications
2. Use "Paste to Figma" export
3. In Figma:
   - Organize layers with clear naming
   - Create components from repeated elements
   - Set up auto-layout for responsive behavior
   - Define color and text styles
   - Add design system documentation
4. Share with developers using Figma's inspect mode
```

### Code Export Refinement

Improve exported HTML/CSS for production.

**Post-export tasks:**

1. **Semantic HTML**
   - Replace divs with semantic tags (header, nav, main, article, section, footer)
   - Add ARIA labels where needed
   - Ensure proper heading hierarchy

2. **CSS optimization**
   - Extract repeated styles into utility classes
   - Use CSS custom properties for theme values
   - Organize with methodology (BEM, SMACSS, etc.)
   - Add responsive media queries if missing

3. **Accessibility**
   - Add alt text to images
   - Ensure form labels are associated
   - Add focus styles
   - Test with screen reader

4. **Performance**
   - Optimize images
   - Minify CSS
   - Remove unused styles
   - Add loading strategies

---

## Conclusion

These advanced techniques help you move beyond basic Stitch usage to create production-ready, accessible, and performant designs. Combine these strategies with the core prompting principles to maximize your efficiency and output quality.

**Key takeaways:**
- Use images and references to accelerate design
- Establish design systems early for consistency
- Design responsively from the start
- Prioritize accessibility in every prompt
- Think in reusable components
- Plan for all states, not just happy paths
- Refine exports before production use
