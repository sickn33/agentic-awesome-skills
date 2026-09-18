(function () {
  "use strict";

  const MAX_COLORS = 12;

  const VERTEX_SHADER = `
    attribute vec2 aPosition;
    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const FRAGMENT_SHADER = `
    precision highp float;

    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uSeed;
    uniform float uMode;
    uniform float uOverall;
    uniform float uScale;
    uniform float uOctaves;
    uniform float uWarp;
    uniform float uDither;
    uniform float uLuminanceCap;
    uniform vec3 uBase;
    uniform vec3 uColors[12];
    uniform float uStrengths[12];
    uniform float uFieldScales[12];
    uniform vec2 uPhases[12];
    uniform float uColorCount;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32 + uSeed * 0.00013);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.52;
      mat2 rotation = mat2(0.80, 0.60, -0.60, 0.80);
      for (int i = 0; i < 5; i++) {
        float enabled = 1.0 - step(uOctaves, float(i) + 0.5);
        value += amplitude * noise(p) * enabled;
        p = rotation * p * 2.03 + vec2(13.1, 7.7);
        amplitude *= 0.48;
      }
      return value;
    }

    float colorField(vec2 p, vec2 phase, float index, float fieldScale) {
      float angle = 0.43 + index * 1.0472 + phase.x * 0.54;
      vec2 direction = vec2(cos(angle), sin(angle));
      float cloud = fbm(p * fieldScale + phase * 6.0);
      float riverNoise = fbm(p * 0.48 + phase * 3.7);
      float river = 0.5 + 0.5 * sin(
        dot(p, direction) * (1.15 + fieldScale * 0.56)
        + phase.y * 6.2832
        + riverNoise * 3.4
      );
      return clamp(cloud * 0.54 + river * 0.62 - 0.12, 0.0, 1.0);
    }

    vec3 toneMap(vec3 c) {
      return c / (1.0 + max(c - 1.0, 0.0));
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
      p *= uScale;

      float time = uTime;
      vec2 driftA = vec2(cos(time * 0.71), sin(time * 0.63)) * 0.11;
      vec2 driftB = vec2(sin(time * 0.47), cos(time * 0.57)) * 0.09;
      vec2 q = vec2(
        fbm(p + vec2(0.0, 0.0) + driftA),
        fbm(p + vec2(5.2, 1.3) - driftB)
      );
      vec2 r = vec2(
        fbm(p + uWarp * q * 2.3 + vec2(1.7, 8.2) + driftB),
        fbm(p + uWarp * q * 2.3 + vec2(8.3, 2.8) - driftA)
      );
      vec2 warped = p + uWarp * (q - 0.5) * 2.1 + uWarp * 0.72 * (r - 0.5);

      vec3 colorSum = vec3(0.0);
      float weightSum = 0.0;
      float energySum = 0.0;
      float strongestBand = 0.0;
      float spectralFlow = fract(
        fbm(warped * 0.92 + q * 0.42) * 2.05
        + dot(warped, vec2(0.72, -0.49))
        + uSeed * 0.000017
      );
      for (int i = 0; i < 12; i++) {
        float field = colorField(
          warped + q * (0.21 + float(i) * 0.025),
          uPhases[i],
          float(i),
          uFieldScales[i]
        );
        float softBand = smoothstep(0.22, 0.78, field);
        float active = step(float(i) + 0.5, uColorCount);
        float hueStop = float(i) / max(uColorCount, 1.0);
        float hueDistance = abs(spectralFlow - hueStop);
        hueDistance = min(hueDistance, 1.0 - hueDistance);
        float hueBand = 1.0 - smoothstep(0.035, 0.205, hueDistance);
        float shapedBand = pow(hueBand, 2.2) * (0.64 + softBand * 0.36);
        float weight = shapedBand * sqrt(max(uStrengths[i], 0.0)) * active;
        colorSum += uColors[i] * weight;
        weightSum += weight;
        energySum += shapedBand * uStrengths[i] * active;
        strongestBand = max(strongestBand, shapedBand);
      }

      vec3 palette = weightSum > 0.0001 ? colorSum / weightSum : uBase;
      float globalField = fbm(warped * 0.58 + q * 0.3);
      float fieldEnergy = clamp(energySum * 3.6 + strongestBand * 0.18 + globalField * 0.12, 0.0, 1.0);
      float mixAmount;

      if (uMode < 0.5) {
        mixAmount = clamp(uOverall * (0.08 + fieldEnergy * 0.46), 0.0, 0.62);
      } else {
        mixAmount = clamp(uOverall * (0.10 + fieldEnergy * 0.92), 0.0, 0.92);
      }

      vec3 color = mix(uBase, palette, mixAmount);

      if (uMode > 0.5) {
        float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
        if (luminance > uLuminanceCap) {
          color *= uLuminanceCap / max(luminance, 0.0001);
        }
      }

      float dither = hash21(floor(gl_FragCoord.xy) + vec2(uSeed, -uSeed)) - 0.5;
      color += dither * (uDither / 255.0);
      color = toneMap(max(color, 0.0));
      color = pow(color, vec3(1.0 / 2.2));
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function oklchToLinearRgb(color) {
    const angle = (color.h * Math.PI) / 180;
    const a = color.c * Math.cos(angle);
    const b = color.c * Math.sin(angle);
    const l_ = color.l + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = color.l - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = color.l - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    return [
      Math.max(0, 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      Math.max(0, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      Math.max(0, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
    ];
  }

  function clamp01(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 0;
  }

  function hexToRgba(hex, alpha) {
    const normalized = String(hex || "").replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(normalized)) {
      return "rgba(128, 128, 128, " + alpha.toFixed(3) + ")";
    }
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);
    return "rgba(" + [red, green, blue, alpha.toFixed(3)].join(", ") + ")";
  }

  function fallbackBackground(config) {
    const colors = Array.isArray(config.colors) ? config.colors.slice(0, MAX_COLORS) : [];
    const overall = clamp01(config.overallColorIntensity);
    const seed = Number(config.seed) || 0;
    const layers = [];

    colors.forEach((entry, index) => {
      const strength = clamp01(entry.intensity) * clamp01(entry.peakOpacity) * overall;
      if (strength <= 0) return;
      const angle = Math.round((index * 137.5) + (seed * 0.11));
      const alpha = Math.min(0.82, strength * 0.95);
      layers.push(
        "linear-gradient(" + angle + "deg, transparent 6%, " +
        hexToRgba(entry.srgbFallback, alpha * 0.35) + " 28%, " +
        hexToRgba(entry.srgbFallback, alpha) + " 48%, " +
        hexToRgba(entry.srgbFallback, alpha * 0.32) + " 68%, transparent 90%)"
      );
    });

    layers.push("var(--app-canvas)");
    return layers.join(", ");
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${message}`);
    }
    return shader;
  }

  function createProgram(gl) {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Shader link failed: ${gl.getProgramInfoLog(program)}`);
    }
    return program;
  }

  function uniform(gl, program, name) {
    return gl.getUniformLocation(program, name);
  }

  class SpectralField {
    constructor(canvas, config) {
      this.canvas = canvas;
      this.config = config;
      this.applyFallbackConfig(config);
      this.available = false;
      this.error = null;
      this.motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.motionEnabled = !this.motionPreference.matches;
      this.visible = !document.hidden;
      this.startTime = performance.now();
      this.phaseTime = null;
      this.lastFrame = 0;
      this.frameHandle = 0;
      try {
        this.gl = canvas.getContext("webgl", {
          alpha: false,
          antialias: false,
          depth: false,
          stencil: false,
          powerPreference: "low-power",
          preserveDrawingBuffer: true
        });
        if (!this.gl) throw new Error("WebGL context unavailable");

        this.program = createProgram(this.gl);
        this.gl.useProgram(this.program);
        const buffer = this.gl.createBuffer();
        if (!buffer) throw new Error("WebGL buffer creation failed");
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(
          this.gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
          this.gl.STATIC_DRAW
        );
        const position = this.gl.getAttribLocation(this.program, "aPosition");
        if (position < 0) throw new Error("WebGL position attribute unavailable");
        this.gl.enableVertexAttribArray(position);
        this.gl.vertexAttribPointer(position, 2, this.gl.FLOAT, false, 0, 0);

        this.locations = {
          resolution: uniform(this.gl, this.program, "uResolution"),
          time: uniform(this.gl, this.program, "uTime"),
          seed: uniform(this.gl, this.program, "uSeed"),
          mode: uniform(this.gl, this.program, "uMode"),
          overall: uniform(this.gl, this.program, "uOverall"),
          colorCount: uniform(this.gl, this.program, "uColorCount"),
          scale: uniform(this.gl, this.program, "uScale"),
          octaves: uniform(this.gl, this.program, "uOctaves"),
          warp: uniform(this.gl, this.program, "uWarp"),
          dither: uniform(this.gl, this.program, "uDither"),
          luminanceCap: uniform(this.gl, this.program, "uLuminanceCap"),
          base: uniform(this.gl, this.program, "uBase"),
          colors: uniform(this.gl, this.program, "uColors[0]"),
          strengths: uniform(this.gl, this.program, "uStrengths[0]"),
          fieldScales: uniform(this.gl, this.program, "uFieldScales[0]"),
          phases: uniform(this.gl, this.program, "uPhases[0]")
        };

        this.onResize = () => this.resize();
        this.onVisibility = () => {
          const now = performance.now();
          if (document.hidden) {
            this.capturePhase(now);
            this.visible = false;
            if (this.frameHandle) {
              cancelAnimationFrame(this.frameHandle);
              this.frameHandle = 0;
            }
            return;
          }

          this.visible = true;
          if (this.motionEnabled) {
            const speed = this.config.field.motionSpeed;
            this.startTime = speed > 0 && this.phaseTime !== null
              ? now - (this.phaseTime / speed) * 1000
              : now;
          }
          this.render(now, true);
          this.schedule();
        };
        this.onMotionPreference = (event) => this.setMotion(!event.matches);
        window.addEventListener("resize", this.onResize, { passive: true });
        document.addEventListener("visibilitychange", this.onVisibility);
        this.motionPreference.addEventListener("change", this.onMotionPreference);
        this.available = true;
        this.resize();
        this.uploadConfig();
        this.schedule();
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
        this.available = false;
        this.gl = null;
        document.documentElement.classList.add("field-fallback");
      }
    }

    resize() {
      if (!this.available) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(this.canvas.clientWidth * pixelRatio));
      const height = Math.max(1, Math.round(this.canvas.clientHeight * pixelRatio));
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
      }
    }

    applyFallbackConfig(config) {
      document.documentElement.style.setProperty("--field-fallback-background", fallbackBackground(config));
    }

    uploadConfig() {
      if (!this.available) return;
      const gl = this.gl;
      const config = this.config;
      const sourceColors = Array.isArray(config.colors) ? config.colors.slice(0, MAX_COLORS) : [];
      const fallbackColor = sourceColors[0] || {
        oklch: config.base.oklch,
        intensity: 0,
        peakOpacity: 0,
        fieldScale: config.field.scale,
        phase: [0, 0]
      };
      const colors = sourceColors.slice();
      while (colors.length < MAX_COLORS) colors.push(fallbackColor);
      const colorValues = colors.flatMap((entry) => oklchToLinearRgb(entry.oklch));
      const strengthValues = colors.map((entry) => entry.intensity * entry.peakOpacity * 3.0);
      const fieldScaleValues = colors.map((entry) => entry.fieldScale);
      const phaseValues = colors.flatMap((entry) => entry.phase);
      gl.useProgram(this.program);
      gl.uniform1f(this.locations.seed, config.seed);
      gl.uniform1f(this.locations.mode, config.mode === "obsidian" ? 1 : 0);
      gl.uniform1f(this.locations.overall, config.overallColorIntensity);
      gl.uniform1f(this.locations.colorCount, sourceColors.length);
      gl.uniform1f(this.locations.scale, config.field.scale);
      gl.uniform1f(this.locations.octaves, config.field.octaves);
      gl.uniform1f(this.locations.warp, config.field.warpStrength);
      gl.uniform1f(this.locations.dither, config.field.ditherStrength);
      gl.uniform1f(this.locations.luminanceCap, config.field.luminanceCap);
      gl.uniform3fv(this.locations.base, new Float32Array(oklchToLinearRgb(config.base.oklch)));
      gl.uniform3fv(this.locations.colors, new Float32Array(colorValues));
      gl.uniform1fv(this.locations.strengths, new Float32Array(strengthValues));
      gl.uniform1fv(this.locations.fieldScales, new Float32Array(fieldScaleValues));
      gl.uniform2fv(this.locations.phases, new Float32Array(phaseValues));
    }

    capturePhase(now) {
      if (this.motionEnabled) {
        this.phaseTime = ((now - this.startTime) / 1000) * this.config.field.motionSpeed;
      } else if (this.phaseTime === null) {
        this.phaseTime = this.config.field.staticTime;
      }
      return this.phaseTime;
    }

    updateConfig(config) {
      const now = performance.now();
      this.capturePhase(now);
      this.config = config;
      this.applyFallbackConfig(config);
      this.uploadConfig();
      this.render(now, true);
    }

    setMotion(enabled) {
      if (enabled === this.motionEnabled) {
        const now = performance.now();
        if (!enabled) this.capturePhase(now);
        this.render(now, true);
        return;
      }
      const now = performance.now();
      const phase = this.capturePhase(now);
      this.motionEnabled = enabled;
      if (enabled) {
        const speed = this.config.field.motionSpeed;
        this.startTime = speed > 0 ? now - (phase / speed) * 1000 : now;
        this.schedule();
      } else {
        this.render(now, true);
      }
    }

    schedule() {
      if (!this.available || !this.visible || this.frameHandle) return;
      this.frameHandle = requestAnimationFrame((now) => {
        this.frameHandle = 0;
        this.render(now, false);
        if (this.motionEnabled) this.schedule();
      });
    }

    render(now, force) {
      if (!this.available) return;
      if (!force && now - this.lastFrame < 50) {
        this.schedule();
        return;
      }
      this.lastFrame = now;
      this.resize();
      const elapsed = this.capturePhase(now);
      this.gl.uniform2f(this.locations.resolution, this.canvas.width, this.canvas.height);
      this.gl.uniform1f(this.locations.time, elapsed);
      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
  }

  window.SpectralField = SpectralField;
})();
