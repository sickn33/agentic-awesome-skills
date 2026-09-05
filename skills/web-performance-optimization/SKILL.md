---
name: web-performance-optimization
description: "Optimize website and web application performance including loading speed, Core Web Vitals, bundle size, caching strategies, and runtime performance"
risk: critical
source: community
date_added: "2026-02-27"
---

# Web Performance Optimization

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

- Use when website or app is loading slowly
- Use when optimizing for Core Web Vitals (LCP, FID, CLS)
- Use when reducing JavaScript bundle size
- Use when improving Time to Interactive (TTI)
- Use when optimizing images and assets
- Use when implementing caching strategies
- Use when debugging performance bottlenecks
- Use when preparing for performance audits

## Examples

### Example 1: Optimizing Core Web Vitals

```markdown
## Performance Audit Results

### Current Metrics (Before Optimization)
- **LCP (Largest Contentful Paint):** 4.2s ❌ (should be < 2.5s)
- **FID (First Input Delay):** 180ms ❌ (should be < 100ms)
- **CLS (Cumulative Layout Shift):** 0.25 ❌ (should be < 0.1)
- **Lighthouse Score:** 62/100

### Issues Identified

1. **LCP Issue:** Hero image (2.5MB) loads slowly
2. **FID Issue:** Large JavaScript bundle (850KB) blocks main thread
3. **CLS Issue:** Images without dimensions cause layout shifts

### Optimization Plan

#### Fix LCP (Largest Contentful Paint)

**Problem:** Hero image is 2.5MB and loads slowly

**Solutions:**
\`\`\`html
<!-- Before: Unoptimized image -->
<img src="/hero.jpg" alt="Hero">

<!-- After: Optimized with modern formats -->
<picture>
  <source srcset="/hero.avif" type="image/avif">
  <source srcset="/hero.webp" type="image/webp">
  <img 
    src="/hero.jpg" 
    alt="Hero"
    width="1200" 
    height="600"
    loading="eager"
    fetchpriority="high"
  >
</picture>
\`\`\`

**Additional optimizations:**
- Compress image to < 200KB
- Use CDN for faster delivery
- Preload hero image: `<link rel="preload" as="image" href="/hero.avif">`

#### Fix FID (First Input Delay)

**Problem:** 850KB JavaScript bundle blocks main thread

**Solutions:**

1. **Code Splitting:**
\`\`\`javascript
// Before: Everything in one bundle
import { HeavyComponent } from './HeavyComponent';
import { Analytics } from './analytics';
import { ChatWidget } from './chat';

// After: Lazy load non-critical code
const HeavyComponent = lazy(() => import('./HeavyComponent'));
const ChatWidget = lazy(() => import('./chat'));

// Load analytics after page interactive
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    import('./analytics').then(({ Analytics }) => {
      Analytics.init();
    });
  });
}
\`\`\`

2. **Remove Unused Dependencies:**
\`\`\`bash
# Analyze bundle
npx webpack-bundle-analyzer

# Remove unused packages
npm uninstall moment  # Use date-fns instead (smaller)
npm install date-fns
\`\`\`

3. **Defer Non-Critical Scripts:**
\`\`\`html
<!-- Before: Blocks rendering -->
<script src="/analytics.js"></script>

<!-- After: Deferred -->
<script src="/analytics.js" defer></script>
\`\`\`

#### Fix CLS (Cumulative Layout Shift)

**Problem:** Images without dimensions cause layout shifts

**Solutions:**
\`\`\`html
<!-- Before: No dimensions -->
<img src="/product.jpg" alt="Product">

<!-- After: With dimensions -->
<img 
  src="/product.jpg" 
  alt="Product"
  width="400" 
  height="300"
  style="aspect-ratio: 4/3;"
>
\`\`\`

**For dynamic content:**
\`\`\`css
/* Reserve space for content that loads later */
.skeleton-loader {
  min-height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
\`\`\`

### Results After Optimization

- **LCP:** 1.8s ✅ (improved by 57%)
- **FID:** 45ms ✅ (improved by 75%)
- **CLS:** 0.05 ✅ (improved by 80%)
- **Lighthouse Score:** 94/100 ✅
```

### Example 2: Reducing JavaScript Bundle Size

```markdown
## Bundle Size Optimization

### Current State
- **Total Bundle:** 850KB (gzipped: 280KB)
- **Main Bundle:** 650KB
- **Vendor Bundle:** 200KB
- **Load Time (3G):** 8.2s

### Analysis

\`\`\`bash
# Analyze bundle composition
npx webpack-bundle-analyzer dist/stats.json
\`\`\`

**Findings:**
1. Moment.js: 67KB (can replace with date-fns: 12KB)
2. Lodash: 72KB (using entire library, only need 5 functions)
3. Unused code: ~150KB of dead code
4. No code splitting: Everything in one bundle

### Optimization Steps

#### 1. Replace Heavy Dependencies

\`\`\`bash
# Remove moment.js (67KB) → Use date-fns (12KB)
npm uninstall moment
npm install date-fns

# Before
import moment from 'moment';
const formatted = moment(date).format('YYYY-MM-DD');

# After
import { format } from 'date-fns';
const formatted = format(date, 'yyyy-MM-dd');
\`\`\`

**Savings:** 55KB

#### 2. Use Lodash Selectively

\`\`\`javascript
// Before: Import entire library (72KB)
import _ from 'lodash';
const unique = _.uniq(array);

// After: Import only what you need (5KB)
import uniq from 'lodash/uniq';
const unique = uniq(array);

// Or use native methods
const unique = [...new Set(array)];
\`\`\`

**Savings:** 67KB

#### 3. Implement Code Splitting

\`\`\`javascript
// Next.js example
import dynamic from 'next/dynamic';

// Lazy load heavy components
const Chart = dynamic(() => import('./Chart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false
});

const AdminPanel = dynamic(() => import('./AdminPanel'), {
  loading: () => <div>Loading...</div>
});

// Route-based code splitting (automatic in Next.js)
// pages/admin.js - Only loaded when visiting /admin
// pages/dashboard.js - Only loaded when visiting /dashboard
\`\`\`

#### 4. Remove Dead Code

\`\`\`javascript
// Enable tree shaking in webpack.config.js
module.exports = {
  mode: 'production',
  optimization: {
    usedExports: true,
    sideEffects: false
  }
};

// In package.json
{
  "sideEffects": false
}
\`\`\`

#### 5. Optimize Third-Party Scripts

\`\`\`html
<!-- Before: Loads immediately -->
<script src="https://analytics.com/script.js"></script>

<!-- After: Load after page interactive -->
<script>
  window.addEventListener('load', () => {
    const script = document.createElement('script');
    script.src = 'https://analytics.com/script.js';
    script.async = true;
    document.body.appendChild(script);
  });
</script>
\`\`\`

### Results

- **Total Bundle:** 380KB ✅ (reduced by 55%)
- **Main Bundle:** 180KB ✅
- **Vendor Bundle:** 80KB ✅
- **Load Time (3G):** 3.1s ✅ (improved by 62%)
```

### Example 3: Image Optimization Strategy

```markdown
## Image Optimization

### Current Issues
- 15 images totaling 12MB
- No modern formats (WebP, AVIF)
- No responsive images
- No lazy loading

### Optimization Strategy

#### 1. Convert to Modern Formats

\`\`\`bash
# Install image optimization tools
npm install sharp

# Conversion script (optimize-images.js)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeImage(inputPath, outputDir) {
  const filename = path.basename(inputPath, path.extname(inputPath));
  
  // Generate WebP
  await sharp(inputPath)
    .webp({ quality: 80 })
    .toFile(path.join(outputDir, \`\${filename}.webp\`));
  
  // Generate AVIF (best compression)
  await sharp(inputPath)
    .avif({ quality: 70 })
    .toFile(path.join(outputDir, \`\${filename}.avif\`));
  
  // Generate optimized JPEG fallback
  await sharp(inputPath)
    .jpeg({ quality: 80, progressive: true })
    .toFile(path.join(outputDir, \`\${filename}.jpg\`));
}

// Process all images
const images = fs.readdirSync('./images');
images.forEach(img => {
  optimizeImage(\`./images/\${img}\`, './images/optimized');
});
\`\`\`

#### 2. Implement Responsive Images

\`\`\`html
<!-- Responsive images with modern formats -->
<picture>
  <!-- AVIF for browsers that support it (best compression) -->
  <source 
    srcset="
      /images/hero-400.avif 400w,
      /images/hero-800.avif 800w,
      /images/hero-1200.avif 1200w
    "
    type="image/avif"
    sizes="(max-width: 768px) 100vw, 50vw"
  >
  
  <!-- WebP for browsers that support it -->
  <source 
    srcset="
      /images/hero-400.webp 400w,
      /images/hero-800.webp 800w,
      /images/hero-1200.webp 1200w
    "
    type="image/webp"
    sizes="(max-width: 768px) 100vw, 50vw"
  >
  
  <!-- JPEG fallback -->
  <img 
    src="/images/hero-800.jpg"
    srcset="
      /images/hero-400.jpg 400w,
      /images/hero-800.jpg 800w,
      /images/hero-1200.jpg 1200w
    "
    sizes="(max-width: 768px) 100vw, 50vw"
    alt="Hero image"
    width="1200"
    height="600"
    loading="lazy"
  >
</picture>
\`\`\`

#### 3. Lazy Loading

\`\`\`html
<!-- Native lazy loading -->
<img 
  src="/image.jpg" 
  alt="Description"
  loading="lazy"
  width="800"
  height="600"
>

<!-- Eager loading for above-the-fold images -->
<img 
  src="/hero.jpg" 
  alt="Hero"
  loading="eager"
  fetchpriority="high"
>
\`\`\`

#### 4. Next.js Image Component

\`\`\`javascript
import Image from 'next/image';

// Automatic optimization
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority  // For above-the-fold images
  quality={80}
/>

// Lazy loaded
<Image
  src="/product.jpg"
  alt="Product"
  width={400}
  height={300}
  loading="lazy"
/>
\`\`\`

### Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total Image Size | 12MB | 1.8MB | 85% reduction |
| LCP | 4.5s | 1.6s | 64% faster |
| Page Load (3G) | 18s | 4.2s | 77% faster |
```

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
