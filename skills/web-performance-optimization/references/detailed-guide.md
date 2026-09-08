# Web Performance Optimization - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Overview

Help developers optimize website and web application performance to improve user experience, SEO rankings, and conversion rates. This skill provides systematic approaches to measure, analyze, and improve loading speed, runtime performance, and Core Web Vitals metrics.


## How It Works

### Step 1: Measure Current Performance

I'll help you establish baseline metrics:
- Run Lighthouse audits
- Measure Core Web Vitals (LCP, FID, CLS)
- Check bundle sizes
- Analyze network waterfall
- Identify performance bottlenecks

### Step 2: Identify Issues

Analyze performance problems:
- Large JavaScript bundles
- Unoptimized images
- Render-blocking resources
- Slow server response times
- Missing caching headers
- Layout shifts
- Long tasks blocking main thread

### Step 3: Prioritize Optimizations

Focus on high-impact improvements:
- Critical rendering path optimization
- Code splitting and lazy loading
- Image optimization
- Caching strategies
- Third-party script optimization

### Step 4: Implement Optimizations

Apply performance improvements:
- Optimize assets (images, fonts, CSS, JS)
- Implement code splitting
- Add caching headers
- Lazy load non-critical resources
- Optimize critical rendering path

### Step 5: Verify Improvements

Measure impact of changes:
- Re-run Lighthouse audits
- Compare before/after metrics
- Monitor real user metrics (RUM)
- Test on different devices and networks


## Best Practices

### ✅ Do This

- **Measure First** - Always establish baseline metrics before optimizing
- **Use Lighthouse** - Run audits regularly to track progress
- **Optimize Images** - Use modern formats (WebP, AVIF) and responsive images
- **Code Split** - Break large bundles into smaller chunks
- **Lazy Load** - Defer non-critical resources
- **Cache Aggressively** - Set proper cache headers for static assets
- **Minimize Main Thread Work** - Keep JavaScript execution under 50ms chunks
- **Preload Critical Resources** - Use `<link rel="preload">` for critical assets
- **Use CDN** - Serve static assets from CDN for faster delivery
- **Monitor Real Users** - Track Core Web Vitals from real users

### ❌ Don't Do This

- **Don't Optimize Blindly** - Measure first, then optimize
- **Don't Ignore Mobile** - Test on real mobile devices and slow networks
- **Don't Block Rendering** - Avoid render-blocking CSS and JavaScript
- **Don't Load Everything Upfront** - Lazy load non-critical resources
- **Don't Forget Dimensions** - Always specify image width/height
- **Don't Use Synchronous Scripts** - Use async or defer attributes
- **Don't Ignore Third-Party Scripts** - They often cause performance issues
- **Don't Skip Compression** - Always compress and minify assets


## Common Pitfalls

### Problem: Optimized for Desktop but Slow on Mobile
**Symptoms:** Good Lighthouse score on desktop, poor on mobile
**Solution:**
- Test on real mobile devices
- Use Chrome DevTools mobile throttling
- Optimize for 3G/4G networks
- Reduce JavaScript execution time
```bash
# Test with throttling
lighthouse https://yoursite.com --throttling.cpuSlowdownMultiplier=4
```

### Problem: Large JavaScript Bundle
**Symptoms:** Long Time to Interactive (TTI), high FID
**Solution:**
- Analyze bundle with webpack-bundle-analyzer
- Remove unused dependencies
- Implement code splitting
- Lazy load non-critical code
```bash
# Analyze bundle
npx webpack-bundle-analyzer dist/stats.json
```

### Problem: Images Causing Layout Shifts
**Symptoms:** High CLS score, content jumping
**Solution:**
- Always specify width and height
- Use aspect-ratio CSS property
- Reserve space with skeleton loaders
```css
img {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
}
```

### Problem: Slow Server Response Time
**Symptoms:** High TTFB (Time to First Byte)
**Solution:**
- Implement server-side caching
- Use CDN for static assets
- Optimize database queries
- Consider static site generation (SSG)
```javascript
// Next.js: Static generation
export async function getStaticProps() {
  const data = await fetchData();
  return {
    props: { data },
    revalidate: 60 // Regenerate every 60 seconds
  };
}
```


## Performance Checklist

### Images
- [ ] Convert to modern formats (WebP, AVIF)
- [ ] Implement responsive images
- [ ] Add lazy loading
- [ ] Specify dimensions (width/height)
- [ ] Compress images (< 200KB each)
- [ ] Use CDN for delivery

### JavaScript
- [ ] Bundle size < 200KB (gzipped)
- [ ] Implement code splitting
- [ ] Lazy load non-critical code
- [ ] Remove unused dependencies
- [ ] Minify and compress
- [ ] Use async/defer for scripts

### CSS
- [ ] Inline critical CSS
- [ ] Defer non-critical CSS
- [ ] Remove unused CSS
- [ ] Minify CSS files
- [ ] Use CSS containment

### Caching
- [ ] Set cache headers for static assets
- [ ] Implement service worker
- [ ] Use CDN caching
- [ ] Cache API responses
- [ ] Version static assets

### Core Web Vitals
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] TTFB < 600ms
- [ ] TTI < 3.8s


## Performance Tools

### Measurement Tools
- **Lighthouse** - Comprehensive performance audit
- **WebPageTest** - Detailed waterfall analysis
- **Chrome DevTools** - Performance profiling
- **PageSpeed Insights** - Real user metrics
- **Web Vitals Extension** - Monitor Core Web Vitals

### Analysis Tools
- **webpack-bundle-analyzer** - Visualize bundle composition
- **source-map-explorer** - Analyze bundle size
- **Bundlephobia** - Check package sizes before installing
- **ImageOptim** - Image compression tool

### Monitoring Tools
- **Google Analytics** - Track Core Web Vitals
- **Sentry** - Performance monitoring
- **New Relic** - Application performance monitoring
- **Datadog** - Real user monitoring


## Related Skills

- `@react-best-practices` - React performance patterns
- `@frontend-dev-guidelines` - Frontend development standards
- `@systematic-debugging` - Debug performance issues
- `@senior-architect` - Architecture for performance


## Additional Resources

- [Web.dev Performance](https://web.dev/performance/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [MDN Performance Guide](https://developer.mozilla.org/en-US/docs/Web/Performance)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Image Optimization Guide](https://web.dev/fast/#optimize-your-images)

---

**Pro Tip:** Focus on Core Web Vitals (LCP, FID, CLS) first - they have the biggest impact on user experience and SEO rankings!
