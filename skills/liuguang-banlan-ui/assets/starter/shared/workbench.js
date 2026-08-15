(function () {
  "use strict";

  const config = window.SPECTRAL_THEME;
  const canvas = document.querySelector("#spectral-field");
  const field = new window.SpectralField(canvas, config);
  const panel = document.querySelector("#parameter-panel");
  const panelToggle = document.querySelector("#parameter-toggle");
  const panelClose = document.querySelector("#parameter-close");
  const controls = document.querySelector("#parameter-controls");
  const exportButton = document.querySelector("#export-parameters");
  const copyButton = document.querySelector("#copy-parameters");
  const motionButton = document.querySelector("#motion-toggle");
  const menuButton = document.querySelector("#menu-toggle");
  const sidebar = document.querySelector("#sidebar");
  const liveStatus = document.querySelector("#live-status");
  const defaultConfig = JSON.parse(JSON.stringify(config));

  function formatNumber(value, digits = 2) {
    return Number(value).toFixed(digits);
  }

  function applyThemeMetadata() {
    document.documentElement.dataset.mode = config.mode;
    document.querySelectorAll("[data-theme-name]").forEach((node) => {
      node.textContent = config.label;
    });
    document.querySelector("#preset-value").textContent = config.preset;
    document.querySelector("#seed-value").textContent = String(config.seed);
    document.querySelector("#renderer-value").textContent = field.available ? "WebGL · live" : "CSS · fallback";
  }

  function renderControls() {
    controls.replaceChildren();

    const overall = document.createElement("div");
    overall.className = "parameter-block parameter-master";
    overall.innerHTML = `
      <div class="parameter-heading">
        <div>
          <span class="parameter-kicker">全局色度预算</span>
          <strong>总体彩色强度</strong>
        </div>
        <output for="overall-intensity">${formatNumber(config.overallColorIntensity)}</output>
      </div>
      <input id="overall-intensity" type="range" min="0" max="1" step="0.01" value="${config.overallColorIntensity}" aria-label="总体彩色强度">
      <div class="range-labels"><span>中性基材</span><span>校准上限</span></div>
    `;
    controls.append(overall);

    const overallInput = overall.querySelector("input");
    overallInput.addEventListener("input", () => {
      config.overallColorIntensity = Number(overallInput.value);
      overall.querySelector("output").value = formatNumber(config.overallColorIntensity);
      field.updateConfig(config);
      announce(`总体彩色强度 ${formatNumber(config.overallColorIntensity)}`);
    });

    config.colors.forEach((color, index) => {
      const row = document.createElement("div");
      row.className = "parameter-block color-parameter";
      row.innerHTML = `
        <div class="parameter-heading">
          <div class="color-name">
            <span class="color-chip" style="--chip:${color.srgbFallback}"></span>
            <div>
              <strong>${color.label}</strong>
              <span class="parameter-kicker">OKLCH ${formatNumber(color.oklch.l)} ${formatNumber(color.oklch.c, 3)} ${formatNumber(color.oklch.h, 0)}</span>
            </div>
          </div>
          <output for="color-${index}">${formatNumber(color.intensity)}</output>
        </div>
        <input id="color-${index}" type="range" min="0" max="1" step="0.01" value="${color.intensity}" aria-label="${color.label}强度">
        <dl class="parameter-facts">
          <div><dt>峰值 α</dt><dd>${formatNumber(color.peakOpacity, 3)}</dd></div>
          <div><dt>空间尺度</dt><dd>${formatNumber(color.fieldScale)}</dd></div>
          <div><dt>相位</dt><dd>${color.phase.map((value) => formatNumber(value)).join(" / ")}</dd></div>
        </dl>
      `;
      controls.append(row);
      const input = row.querySelector("input");
      input.addEventListener("input", () => {
        color.intensity = Number(input.value);
        row.querySelector("output").value = formatNumber(color.intensity);
        field.updateConfig(config);
        announce(`${color.label}强度 ${formatNumber(color.intensity)}`);
      });
    });
  }

  function serializableConfig() {
    return {
      ...config,
      validationCapabilities: {
        modelVision: "runtime-check-required",
        screenshotCapture: "runtime-check-required",
        deterministicPixelMetrics: "runtime-check-required",
        visualVerificationMode: "unverified"
      }
    };
  }

  function downloadParameters() {
    const blob = new Blob([JSON.stringify(serializableConfig(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${config.mode}-parameters.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    announce("参数 JSON 已导出");
  }

  async function copyParameters() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(serializableConfig(), null, 2));
      announce("参数 JSON 已复制");
    } catch (_error) {
      announce("当前环境无法访问剪贴板，请使用导出 JSON");
    }
  }

  function announce(message) {
    liveStatus.textContent = message;
  }

  function setPanel(open) {
    panel.dataset.open = String(open);
    panel.setAttribute("aria-hidden", String(!open));
    panelToggle.setAttribute("aria-expanded", String(open));
    if (open) panelClose.focus();
  }

  panelToggle.addEventListener("click", () => setPanel(panel.dataset.open !== "true"));
  panelClose.addEventListener("click", () => {
    setPanel(false);
    panelToggle.focus();
  });
  exportButton.addEventListener("click", downloadParameters);
  copyButton.addEventListener("click", copyParameters);

  let motionEnabled = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function setMotion(enabled) {
    motionEnabled = enabled;
    field.setMotion(enabled);
    motionButton.setAttribute("aria-pressed", String(!enabled));
    motionButton.querySelector("span").textContent = enabled ? "暂停环境" : "恢复环境";
    announce(enabled ? "环境动画已恢复" : "环境动画已暂停");
  }
  motionButton.addEventListener("click", () => setMotion(!motionEnabled));
  setMotion(motionEnabled);

  menuButton.addEventListener("click", () => {
    const open = sidebar.dataset.open !== "true";
    sidebar.dataset.open = String(open);
    menuButton.setAttribute("aria-expanded", String(open));
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((item) => item.removeAttribute("aria-current"));
      button.setAttribute("aria-current", "page");
      document.querySelector("#page-location").textContent = button.dataset.location;
      if (window.innerWidth < 760) sidebar.dataset.open = "false";
    });
  });

  document.querySelectorAll(".record-row").forEach((row) => {
    row.addEventListener("click", () => {
      document.querySelectorAll(".record-row").forEach((item) => item.removeAttribute("aria-selected"));
      row.setAttribute("aria-selected", "true");
      document.querySelector("#record-title").textContent = row.dataset.title;
      document.querySelector("#record-time").textContent = row.dataset.time;
      announce(`已选择 ${row.dataset.title}`);
    });
  });

  document.querySelectorAll("[role='tab']").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[role='tab']").forEach((item) => item.setAttribute("aria-selected", "false"));
      tab.setAttribute("aria-selected", "true");
      document.querySelector("#detail-copy").textContent = tab.dataset.copy;
    });
  });

  document.querySelector("#reset-parameters").addEventListener("click", () => {
    Object.assign(config, JSON.parse(JSON.stringify(defaultConfig)));
    renderControls();
    field.updateConfig(config);
    announce("参数已恢复为模板预设");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.dataset.open === "true") {
      setPanel(false);
      panelToggle.focus();
    }
  });

  applyThemeMetadata();
  renderControls();
})();
