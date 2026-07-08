<!DOCTYPE html>
<!--
  vanilla-embed.html
  Minimal production-ready Spline embed — vanilla HTML/JS
  Features: transparent background, mobile skip, GPU check, load timeout fallback, no scroll hijacking
-->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spline Background</title>

  <!-- Preload scene for faster perceived load -->
  <link rel="preload" href="https://prod.spline.design/REPLACE_ME/scene.splinecode" as="fetch" crossorigin>

  <!-- Load Spline viewer web component -->
  <script type="module" src="https://unpkg.com/@splinetool/viewer/build/spline-viewer.js"></script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      /* IMPORTANT: Do NOT set overflow: hidden here.
         Spline's generated code tries to add this — it will break page scroll.
         If it appears anywhere in your CSS, remove it. */
      overflow: auto;
      background: #0a0a0a;
    }

    /* Spline background wrapper */
    .spline-bg {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;

      /* Reserve space to prevent layout shift */
      contain: strict;

      /* Fade in when loaded */
      opacity: 0;
      transition: opacity 0.6s ease;
    }

    .spline-bg.loaded {
      opacity: 1;
    }

    /* Fallback shown before load or on fallback devices */
    .spline-fallback {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      background: #0a0a0a;
      /* Optional: background image fallback
      background: url('fallback.jpg') center/cover no-repeat;
      */
    }

    /* Your actual page content */
    .content {
      position: relative;
      z-index: 1;
      /* Make sure buttons and links are always clickable */
      pointer-events: all;
    }

    spline-viewer {
      width: 100%;
      height: 100%;
      display: block;
    }
  </style>
</head>
<body>

  <!-- Fallback (always rendered — hidden by JS once Spline loads) -->
  <div class="spline-fallback" id="spline-fallback"></div>

  <!-- Spline background (hidden until loaded) -->
  <div class="spline-bg" id="spline-bg">
    <spline-viewer
      id="spline-viewer"
      url="https://prod.spline.design/REPLACE_ME/scene.splinecode"
      events-target="global">
      <!--
        events-target="global" = scene responds to mouse movements anywhere on page
        Remove it if you only want interaction when hovering directly on the scene
      -->
    </spline-viewer>
  </div>

  <!-- Your page content -->
  <div class="content">
    <h1 style="color: white; padding: 40px;">Your Content Here</h1>
  </div>

  <script>
    const splineBg = document.getElementById('spline-bg');
    const splineFallback = document.getElementById('spline-fallback');
    const splineViewer = document.getElementById('spline-viewer');

    // --- Device capability check ---
    function shouldLoadSpline() {
      const isMobile = window.innerWidth < 768;
      const isLowEnd = navigator.hardwareConcurrency <= 2;

      // Check WebGL support
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      const noWebGL = !gl;

      return !isMobile && !isLowEnd && !noWebGL;
    }

    if (!shouldLoadSpline()) {
      // Low-end or mobile — skip Spline entirely, keep fallback visible
      splineBg.remove();
    } else {
      // --- Load timeout fallback ---
      // If Spline hasn't loaded in 8 seconds, give up and show the fallback
      const timeout = setTimeout(() => {
        console.warn('Spline scene timed out — showing fallback');
        splineBg.remove();
        splineFallback.style.opacity = '1';
      }, 8000);

      // --- Detect successful load ---
      // spline-viewer fires a 'load' event when the scene is ready
      splineViewer.addEventListener('load', () => {
        clearTimeout(timeout);
        splineBg.classList.add('loaded');
        // Optionally fade out the fallback
        splineFallback.style.transition = 'opacity 0.6s ease';
        splineFallback.style.opacity = '0';
      });
    }
  </script>

</body>
</html>
