globalThis.DrawingTheme = (() => {
  const key = 'teardown-appearance', root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)'), listeners = new Set();
  const valid = value => ['system', 'light', 'dark'].includes(value);
  let mode = 'system';
  try {
    const saved = localStorage.getItem(key);
    if (valid(saved)) mode = saved;
  } catch {}
  const theme = () => (mode === 'system' ? (system.matches ? 'dark' : 'light') : mode);
  function apply() {
    root.dataset.theme = theme();
    document.querySelector('meta[name="theme-color"]').content = theme() === 'dark' ? '#191919' : '#ffffff';
    for (const listener of listeners) listener(mode, theme());
  }
  system.addEventListener('change', () => {
    if (mode === 'system') apply();
  });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    mode = valid(event.newValue) ? event.newValue : 'system';
    apply();
  });
  apply();
  return {
    get mode() {
      return mode;
    },
    get theme() {
      return theme();
    },
    set(value) {
      if (!valid(value)) return;
      mode = value;
      try {
        if (mode === 'system') localStorage.removeItem(key);
        else localStorage.setItem(key, mode);
      } catch {}
      apply();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(mode, theme());
      return () => listeners.delete(listener);
    }
  };
})();
