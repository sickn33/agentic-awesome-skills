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
    panel.toggleAttribute("inert", !open);
    panel.inert = !open;
    panelToggle.setAttribute("aria-expanded", String(open));
    if (open) panelClose.focus();
  }

  setPanel(panel.dataset.open === "true");
  panelToggle.addEventListener("click", () => setPanel(panel.dataset.open !== "true"));
  panelClose.addEventListener("click", () => {
    setPanel(false);
    panelToggle.focus();
  });
  exportButton.addEventListener("click", downloadParameters);
  copyButton.addEventListener("click", copyParameters);

  const isMobileViewport = () => window.matchMedia("(max-width: 760px)").matches;
  let sidebarOpen = sidebar.dataset.open === "true";
  function setSidebar(open) {
    sidebarOpen = Boolean(open);
    const mobile = isMobileViewport();
    const visible = !mobile || sidebarOpen;
    sidebar.dataset.open = String(visible);
    sidebar.setAttribute("aria-hidden", String(!visible));
    sidebar.toggleAttribute("inert", !visible);
    sidebar.inert = !visible;
    menuButton.setAttribute("aria-expanded", String(mobile && sidebarOpen));
    menuButton.setAttribute("aria-label", visible ? "关闭导航菜单" : "打开导航菜单");
  }
  setSidebar(sidebarOpen);
  window.addEventListener("resize", () => setSidebar(sidebarOpen), { passive: true });

  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let motionPausedByUser = false;
  let motionEnabled = false;
  function applyMotion(announceChange = false) {
    motionEnabled = !motionPreference.matches && !motionPausedByUser;
    const enabled = motionEnabled;
    field.setMotion(enabled);
    motionButton.setAttribute("aria-pressed", String(!enabled));
    motionButton.disabled = motionPreference.matches;
    motionButton.querySelector("span").textContent = motionPreference.matches
      ? "系统减少动态"
      : enabled ? "暂停环境" : "恢复环境";
    if (announceChange) {
      announce(motionPreference.matches
        ? "已遵循系统减少动态偏好"
        : enabled ? "环境动画已恢复" : "环境动画已暂停");
    }
  }
  motionButton.addEventListener("click", () => {
    motionPausedByUser = motionEnabled;
    applyMotion(true);
  });
  motionPreference.addEventListener("change", () => applyMotion(true));
  applyMotion();

  menuButton.addEventListener("click", () => {
    setSidebar(!sidebarOpen);
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((item) => item.removeAttribute("aria-current"));
      button.setAttribute("aria-current", "page");
      document.querySelector("#page-location").textContent = button.dataset.location;
      if (isMobileViewport()) setSidebar(false);
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

  const tabs = Array.from(document.querySelectorAll("[role='tab']"));
  function activateTab(tab, focus = false) {
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    document.querySelector("#detail-copy").textContent = tab.dataset.copy;
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      activateTab(tab);
    });
    tab.addEventListener("keydown", (event) => {
      let targetIndex = null;
      if (event.key === "ArrowRight") targetIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") targetIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") targetIndex = 0;
      if (event.key === "End") targetIndex = tabs.length - 1;
      if (targetIndex === null) return;
      event.preventDefault();
      activateTab(tabs[targetIndex], true);
    });
  });
  const selectedTab = tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0];
  if (selectedTab) activateTab(selectedTab);

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
