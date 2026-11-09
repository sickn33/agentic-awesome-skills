const drawings = JSON.parse(document.getElementById('drawing-data').textContent);
const $ = id => document.getElementById(id), ns = 'http://www.w3.org/2000/svg';
const SHEET = TechnicalSheet;
const RENDER_DELAY = 120, PLAY_DURATION = 700;
const viewport = $('viewport'), stage = $('stage'), drawing = $('drawing'), selection = $('selection'), selectionBox = $('selection-box');
const GRAPHITE = '#202020', DEFAULT_HUE = 250, HUE_INK = {lightness: .52, maxChroma: .2};
const geometryKeys = ['params', 'explosion', 'isolated', 'annotate'];
const storageKey = 'teardown-colors';

const defaultInk = d => ({
  base: null,
  parts: {...d?.colors?.hues},
  filled: [...(d?.colors?.fills ?? [])]
});
const defaultParams = d => Object.fromEntries(d.parameters.map(p => [p.key, p.default]));
const previewFit = explosion => Math.max(explosion, 1);

function linearRgb(hue, chroma) {
  const angle = hue * Math.PI / 180, a = chroma * Math.cos(angle), b = chroma * Math.sin(angle);
  const l = (HUE_INK.lightness + .3963377774 * a + .2158037573 * b) ** 3;
  const m = (HUE_INK.lightness - .1055613458 * a - .0638541728 * b) ** 3;
  const s = (HUE_INK.lightness - .0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s];
}

function inkFromHue(hue) {
  let low = 0, high = HUE_INK.maxChroma;
  for (let i = 0; i < 20; i++) {
    const chroma = (low + high) / 2;
    if (linearRgb(hue, chroma).every(x => x >= -1e-4 && x <= 1 + 1e-4)) low = chroma;
    else high = chroma;
  }
  const linear = linearRgb(hue, low);
  return '#' + linear.map(x => {
    const v = x <= .0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - .055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  }).join('');
}
const inkColor = hue => hue === null ? GRAPHITE : inkFromHue(hue);
const isFilled = (ink, part) => ink.filled.includes(part);
const hasFill = ink => ink.filled.length > 0;
const tint = hex => '#' + [1, 3, 5].map(i => Math.round(255 - (255 - parseInt(hex.slice(i, i + 2), 16)) * .18).toString(16).padStart(2, '0')).join('');
const resolveInk = ink => ({base: inkColor(ink.base), parts: Object.fromEntries(Object.entries(ink.parts).map(([part, hue]) => [part, inkFromHue(hue)]))});
const HUE_STOPS = Array.from({length: 13}, (_, i) => inkFromHue(i * 30)).join(', ');
const initialState = d => ({
  params: defaultParams(d),
  explosion: (d.initialView ?? (d.parts.length === 1 ? 'assembled' : 'exploded')) === 'assembled' ? 0 : 1,
  preset: 'technical',
  annotate: false,
  selectedPart: 'all',
  isolated: null
});

let preferences = {};
try { preferences = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch {}
const states = new Map(drawings.map(d => [d.id, initialState(d)]));
let selected = drawings.find(d => d.id === location.hash.slice(1)) || drawings[0];
let zoom = 1, svg = null, geometry = null, drawingStatus = 'rendering', exportBusy = false, messageTimer, playback = null;

const workerSource = new Blob([JSON.parse($('drawing-worker').textContent)], {type: 'text/javascript'});
function spawnWorker() {
  const url = URL.createObjectURL(workerSource), worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
}
const renderer = DrawingRenderQueue.create(spawnWorker());
const flipbook = DrawingFlipbook.create(spawnWorker, {
  size: Math.min(Math.max((navigator.hardwareConcurrency || 4) - 2, 2), 6),
  ease: DrawingFlipbook.easeInOutCubic
});

const state = () => states.get(selected.id);
function colors() {
  const ink = preferences[selected.id] ??= defaultInk(selected);
  ink.filled ??= defaultInk(selected).filled;
  return ink;
}

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch {}
}

function announce(text, persistent = false) {
  clearTimeout(messageTimer);
  $('message').textContent = text;
  if (!persistent) messageTimer = setTimeout(() => { $('message').textContent = ''; }, 5000);
}

function createSvg(name, attributes = {}) {
  const node = document.createElementNS(ns, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

function requestGeometry(subject, target, fitExplosion, options) {
  return renderer.request({id: subject.id, parameters: target.params, explosion: target.explosion, fitExplosion, isolated: target.isolated, fill: target.fill, annotate: target.annotate}, options);
}

function mountGeometry(result, subject, target) {
  const node = createSvg('svg', {
    xmlns: ns, width: SHEET.width + 'mm', height: SHEET.height + 'mm', viewBox: `0 0 ${SHEET.width} ${SHEET.height}`,
    role: 'img', 'aria-labelledby': 'art-title art-description'
  });
  const part = subject.parts.find(p => p.id === target.isolated);
  const title = createSvg('title', {id: 'art-title'});
  title.textContent = subject.title + ' · ' + (part ? part.name : (target.explosion ? 'exploded' : 'assembled') + ' view');
  const desc = createSvg('desc', {id: 'art-description'});
  desc.textContent = subject.description + (part ? ' Isolated component: ' + part.name + '.' : '');
  const group = createSvg('g', {id: 'geometry'});
  group.innerHTML = result.markup;
  node.append(title, desc, createSvg('rect', {id: 'paper', width: SHEET.width, height: SHEET.height, fill: 'white'}), group);
  return {node, group};
}

function styleGeometry(group, preset, ink, fills) {
  const weights = SHEET.linework[preset], inkFor = el => ink.parts[el.closest('[data-item]')?.dataset.item] || ink.base;
  for (const el of group.querySelectorAll('[data-annotation]')) el.setAttribute('font-family', getComputedStyle(drawing).getPropertyValue('--annotation-font').trim() || 'Inter, Arial, sans-serif');
  for (const el of group.querySelectorAll('[data-fill]')) {
    const color = ink.parts[el.dataset.fill] || ink.base, filled = isFilled(fills, el.dataset.fill);
    const paper = !filled && (el.dataset.covers || '').split(' ').some(part => isFilled(fills, part));
    const paint = filled ? tint(color) : paper ? 'white' : 'none';
    el.style.setProperty('--drawing-ink', color);
    if (filled || paper) el.dataset.filled = filled ? 'tint' : 'paper';
    else delete el.dataset.filled;
    el.setAttribute('fill', paint);
    el.setAttribute('stroke', paint);
    el.setAttribute('stroke-width', .1);
    el.setAttribute('stroke-linejoin', 'round');
  }
  group.style.setProperty('--drawing-ink', ink.base);
  for (const part of group.querySelectorAll('[data-item]')) part.style.setProperty('--drawing-ink', ink.parts[part.dataset.item] || ink.base);
  for (const el of group.querySelectorAll('[data-ink-fill]')) {
    el.style.removeProperty('fill');
    el.setAttribute('fill', inkFor(el));
  }
  for (const el of group.querySelectorAll('[data-line-role]')) {
    const weight = weights[el.dataset.lineRole] ?? weights.detail;
    el.style.removeProperty('stroke');
    el.setAttribute('stroke', inkFor(el));
    el.setAttribute('stroke-width', weight);
    el.setAttribute('stroke-linecap', SHEET.linecap(el.dataset.lineRole));
    el.setAttribute('stroke-linejoin', 'round');
    if (el.dataset.lineRole === 'axis') el.setAttribute('stroke-dasharray', SHEET.axisDash);
    el.style.display = weight ? '' : 'none';
  }
}

function stripPreviewHooks(node) {
  node.removeAttribute('role');
  node.removeAttribute('aria-labelledby');
  for (const el of node.querySelectorAll('[data-ink-fill]')) el.removeAttribute('data-ink-fill');
  for (const el of node.querySelectorAll('[data-fill]')) {
    if (!el.dataset.filled) el.remove();
    el.removeAttribute('data-covers');
    el.removeAttribute('data-filled');
  }
  for (const el of node.querySelectorAll('[style]')) {
    el.style.removeProperty('--drawing-ink');
    if (!el.style.length) el.removeAttribute('style');
  }
  return node;
}

function setDrawingStatus(status) {
  drawingStatus = status;
  viewport.setAttribute('aria-busy', String(status === 'rendering'));
  $('render-status').textContent = status === 'rendering' ? 'Updating drawing' : status === 'ready' ? 'Drawing updated' : '';
  updateAvailability();
}

async function render(delay = 0) {
  const subject = selected;
  stopPlayback();
  setDrawingStatus('rendering');
  try {
    const target = {...structuredClone(state()), fill: hasFill(colors())};
    const result = await requestGeometry(subject, target, previewFit(target.explosion), {preview: true, delay});
    if (playback) return;
    const mounted = mountGeometry(result, subject, target);
    svg = mounted.node;
    geometry = mounted.group;
    drawing.replaceChildren(svg, selection);
    styleGeometry(geometry, state().preset, resolveInk(colors()), colors());
    document.title = subject.title + ' · Technical drawing';
    setDrawingStatus('ready');
    updateSelection();
    renderZoom();
    if (subject.parts.length > 1 && target.isolated === null) {
      flipbook.prepare(flipbookKey(subject, target), {id: subject.id, parameters: target.params, isolated: null, fill: target.fill, annotate: target.annotate});
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error(error);
    announce('Could not update the drawing. Restore the settings and try again.', true);
    setDrawingStatus('failed');
  }
}

const flipbookKey = (subject, target) => JSON.stringify([subject.id, target.params, target.fill, target.annotate]);

function stopPlayback() {
  if (!playback) return;
  cancelAnimationFrame(playback.frame);
  playback = null;
  drawing.toggleAttribute('data-playing', false);
  svg?.querySelector('[data-leaving]')?.remove();
}

function play(to) {
  const s = state(), target = {...s, fill: hasFill(colors())};
  const frames = s.isolated === null && geometry ? flipbook.ready(flipbookKey(selected, target)) : null;
  if (!frames || matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (!playback && s.explosion !== 0 && s.explosion !== 1) return false;
  const last = frames.length - 1, start = playback?.value ?? s.explosion * last, end = to * last;
  cancelAnimationFrame(playback?.frame);
  svg.querySelector('[data-leaving]')?.remove();
  const labels = to === 0 && !playback && geometry.querySelector('[data-annotations]');
  if (labels) {
    const leaving = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    leaving.setAttribute('data-leaving', '');
    leaving.append(...labels.cloneNode(true).childNodes);
    geometry.after(leaving);
  }
  const duration = PLAY_DURATION * Math.abs(end - start) / last;
  const current = {value: start, frame: 0};
  let began = null;
  playback = current;
  drawing.toggleAttribute('data-playing', true);
  const step = now => {
    began ??= now;
    const progress = duration ? Math.min(1, (now - began) / duration) : 1;
    current.value = start + (end - start) * progress;
    geometry.innerHTML = frames[Math.round(current.value)];
    styleGeometry(geometry, state().preset, resolveInk(colors()), colors());
    if (progress < 1) current.frame = requestAnimationFrame(step);
    else render();
  };
  // Switching into playback restyles the whole drawing. Starting the clock
  // after that frame has painted keeps its cost from skipping frames.
  current.frame = requestAnimationFrame(() => { current.frame = requestAnimationFrame(step); });
  return true;
}

function update(patch, {delay = 0} = {}) {
  Object.assign(state(), patch);
  syncControls();
  if (geometryKeys.some(key => key in patch)) render(delay);
  else restyle();
}

function restyle() {
  if (geometry) styleGeometry(geometry, state().preset, resolveInk(colors()), colors());
  updateSelection();
  updateColorControls();
}

function editColors(change) {
  const filled = hasFill(colors());
  change(colors());
  if (hasFill(colors()) !== filled) render();
  else restyle();
  updateColorControls();
  save();
}

function updateAvailability() {
  const noPart = state().selectedPart === 'all', unavailable = drawingStatus !== 'ready' || exportBusy;
  for (const button of document.querySelectorAll('.export-choice[data-format]')) button.disabled = unavailable;
  $('download-part').disabled = unavailable || noPart;
  $('isolate-part').disabled = noPart || exportBusy;
  $('color-part').disabled = noPart;
}

function syncControls() {
  const s = state(), isolated = s.isolated !== null;
  $('linework').value = s.preset;
  $('annotate').checked = s.annotate;
  $('explosion').value = s.explosion * 100;
  $('explosion-value').value = Math.round(s.explosion * 100) + '%';
  for (const option of $('view').children) {
    const checked = option.dataset.view === (s.explosion === 0 ? 'assembled' : 'exploded');
    option.setAttribute('aria-checked', String(checked));
    option.tabIndex = checked ? 0 : -1;
  }
  $('part-target').value = s.selectedPart;
  $('isolate-part').setAttribute('aria-pressed', String(isolated));
  $('isolate-part').textContent = isolated ? 'Isolated' : 'Isolate';
  $('parts-toggle').setAttribute('aria-pressed', String(s.selectedPart !== 'all'));
  for (const p of selected.parameters) {
    const input = $('parameter-' + p.key);
    input.value = s.params[p.key];
    $('value-' + p.key).textContent = input.value + (p.unit ? ' ' + p.unit : '');
  }
  updateAvailability();
}

function refresh() {
  syncControls();
  updateColorControls();
  render();
}

function updateSelection() {
  const s = state(), part = s.isolated === null ? geometry?.querySelector(`[data-item="${s.selectedPart}"]`) : null;
  selection.toggleAttribute('hidden', !part);
  if (!part) return;
  const box = part.getBBox();
  for (const [name, value] of Object.entries({x: box.x - 2, y: box.y - 2, width: box.width + 4, height: box.height + 4})) {
    selectionBox.setAttribute(name, value);
  }
}

function updateColorControls() {
  const target = $('color-target').value, c = colors(), hue = target === 'all' ? c.base : (c.parts[target] ?? c.base);
  const mixed = target === 'all' && Object.values(c.parts).some(value => value !== c.base);
  $('hue').value = (mixed ? null : hue) ?? DEFAULT_HUE;
  const fills = target === 'all' ? selected.parts.map(p => isFilled(c, p.id)) : [isFilled(c, target)];
  $('fill').checked = fills.every(Boolean);
  $('fill').indeterminate = !$('fill').checked && fills.some(Boolean);
  $('color-dot').style.background = Object.keys(c.parts).length ? `conic-gradient(${HUE_STOPS})` : inkColor(c.base);
}

function setHue(hue) {
  const target = $('color-target').value;
  editColors(c => {
    if (target === 'all') {
      c.base = hue;
      c.parts = {};
    } else {
      c.parts[target] = hue;
    }
  });
}

function choosePart(id) {
  update(state().isolated === null ? {selectedPart: id} : {selectedPart: id, isolated: id === 'all' ? null : id});
}

function buildParameterControls() {
  $('parameters').replaceChildren();
  for (const id of ['parameter-divider', 'reset-parameters']) $(id).hidden = !selected.parameters.length;
  for (const p of selected.parameters) {
    const field = document.createElement('div');
    field.className = 'field';
    const row = document.createElement('div');
    row.className = 'field-title';
    const label = document.createElement('label');
    label.htmlFor = 'parameter-' + p.key;
    label.textContent = p.label;
    const value = document.createElement('output');
    value.id = 'value-' + p.key;
    value.htmlFor = 'parameter-' + p.key;
    const input = document.createElement('input');
    Object.assign(input, {type: 'range', id: 'parameter-' + p.key, min: p.min, max: p.max, step: p.step || 1});
    input.addEventListener('input', () => {
      update({params: {...state().params, [p.key]: Number(input.value)}}, {delay: RENDER_DELAY});
    });
    row.append(label, value);
    field.append(row, input);
    $('parameters').append(field);
  }
}

function selectDrawing(id) {
  selected = drawings.find(d => d.id === id) || drawings[0];
  zoom = 1;
  $('subject').value = selected.id;
  for (const control of [$('color-target'), $('part-target')]) {
    control.replaceChildren(new Option('All parts', 'all'), ...selected.parts.map(p => new Option(p.name, p.id)));
  }
  const assembly = selected.parts.length > 1;
  for (const control of ['view', 'spacing-field']) $(control).hidden = !assembly;
  buildParameterControls();
  refresh();
  history.replaceState(null, '', '#' + selected.id);
}

function renderZoom(reset = false) {
  const pad = innerWidth <= 740 ? 12 : 24, bar = $('controls').getBoundingClientRect();
  viewport.style.height = Math.max(100, bar.top - 20) + 'px';
  document.documentElement.style.setProperty('--popup-bottom', (innerHeight - bar.top + 12) + 'px');
  const fit = Math.min((viewport.clientWidth - pad * 2) / SHEET.width, (viewport.clientHeight - pad * 2) / SHEET.height);
  const w = SHEET.width * fit * zoom, h = SHEET.height * fit * zoom;
  drawing.style.width = w + 'px';
  drawing.style.height = h + 'px';
  stage.style.width = w + pad * 2 + 'px';
  stage.style.height = h + pad * 2 + 'px';
  viewport.style.overflow = zoom > 1 ? 'auto' : 'hidden';
  viewport.toggleAttribute('data-pannable', zoom > 1);
  $('zoom-level').value = Math.round(zoom * 100) + '%';
  $('zoom-out').disabled = zoom <= .25;
  $('zoom-in').disabled = zoom >= 4;
  if (reset) {
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;
  }
}

function setZoom(value) {
  const center = [
    (viewport.scrollLeft + viewport.clientWidth / 2) / stage.offsetWidth,
    (viewport.scrollTop + viewport.clientHeight / 2) / stage.offsetHeight
  ];
  zoom = Math.max(.25, Math.min(4, value));
  renderZoom();
  viewport.scrollLeft = center[0] * stage.offsetWidth - viewport.clientWidth / 2;
  viewport.scrollTop = center[1] * stage.offsetHeight - viewport.clientHeight / 2;
}

function fitZoom() {
  zoom = 1;
  renderZoom(true);
}

function resetDrawing() {
  states.set(selected.id, initialState(selected));
  Object.assign(colors(), defaultInk(selected));
  save();
  $('color-target').value = 'all';
  refresh();
  fitZoom();
}

async function download(format, partOnly = false) {
  if (drawingStatus !== 'ready' || exportBusy) return;
  exportBusy = true;
  updateAvailability();
  const subject = selected, target = {...structuredClone(state()), fill: hasFill(colors())}, filled = [...colors().filled], ink = resolveInk(colors());
  const crop = partOnly || $('tight-crop').checked, transparent = $('transparent').checked;
  try {
    let source;
    if (partOnly) {
      target.isolated = target.selectedPart;
      const mounted = mountGeometry(await requestGeometry(subject, target, target.explosion), subject, target);
      styleGeometry(mounted.group, target.preset, ink, {filled});
      source = mounted.node;
    } else {
      source = svg.cloneNode(true);
    }
    const part = subject.parts.find(p => p.id === target.isolated);
    const filename = [
      subject.id,
      part ? SHEET.slug(part.name) : (target.explosion ? 'exploded' : 'assembled'),
      target.preset,
      crop ? 'cropped' : null,
      transparent ? 'transparent' : null
    ].filter(Boolean).join('-');
    const metadata = {
      subject: subject.id, concept: subject.concept !== false, parameters: target.params, explosion: target.explosion,
      linework: target.preset, annotate: target.annotate, isolated: target.isolated, colors: ink,
      fills: subject.parts.map(p => p.id).filter(id => filled.includes(id))
    };
    await DrawingExport.save(stripPreviewHooks(source), format, {filename, crop, transparent, metadata});
    announce(format.toUpperCase() + ' saved');
  } catch (error) {
    console.error(error);
    announce('The ' + format.toUpperCase() + ' export failed. Please try again.', true);
  } finally {
    exportBusy = false;
    updateAvailability();
  }
}

$('hue').style.background = `linear-gradient(to right, ${HUE_STOPS})`;
selection.setAttribute('viewBox', `0 0 ${SHEET.width} ${SHEET.height}`);

$('subject').addEventListener('change', event => selectDrawing(event.target.value));
function setView(option) {
  const explosion = option.dataset.view === 'assembled' ? 0 : 1;
  if (!play(explosion)) {
    update({explosion});
    return;
  }
  state().explosion = explosion;
  syncControls();
}
$('view').addEventListener('click', event => {
  const option = event.target.closest('[role=radio]');
  if (option) setView(option);
});
$('view').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  const other = [...$('view').children].find(option => option.getAttribute('aria-checked') !== 'true');
  setView(other);
  other.focus();
});
$('linework').addEventListener('change', event => update({preset: event.target.value}));
$('annotate').addEventListener('change', event => update({annotate: event.target.checked}));
$('explosion').addEventListener('input', event => update({explosion: Number(event.target.value) / 100}, {delay: RENDER_DELAY}));
$('reset-parameters').addEventListener('click', () => update({params: defaultParams(selected)}));
$('part-target').addEventListener('change', event => choosePart(event.target.value));
$('isolate-part').addEventListener('click', () => update({isolated: state().selectedPart === 'all' ? null : state().selectedPart}));
$('show-all').addEventListener('click', () => update({isolated: null, selectedPart: 'all'}));
$('color-part').addEventListener('click', () => {
  $('color-target').value = state().selectedPart;
  updateColorControls();
  $('color-panel').showPopover();
});
$('download-part').addEventListener('click', () => download('svg', true));
const DRAG_THRESHOLD = 4;
let drag = null;
viewport.addEventListener('pointerdown', event => {
  drag = null;
  if (zoom <= 1 || event.pointerType !== 'mouse' || event.button !== 0) return;
  drag = {x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop, moved: false};
});
viewport.addEventListener('pointermove', event => {
  if (!drag || event.buttons !== 1) return;
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
  if (!drag.moved) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    viewport.setPointerCapture(event.pointerId);
    viewport.toggleAttribute('data-panning', true);
  }
  viewport.scrollLeft = drag.left - dx;
  viewport.scrollTop = drag.top - dy;
});
for (const type of ['pointerup', 'pointercancel']) {
  viewport.addEventListener(type, () => viewport.toggleAttribute('data-panning', false));
}
drawing.addEventListener('click', event => {
  if (drawingStatus === 'rendering' || drag?.moved) return;
  const part = event.target.closest('[data-item]')?.dataset.item ?? event.target.closest('[data-filled=tint]')?.dataset.fill;
  if (!part) return;
  choosePart(part);
  $('parts-panel').showPopover();
});

$('color-target').addEventListener('change', updateColorControls);
$('hue').addEventListener('input', event => setHue(Number(event.target.value)));
$('fill').addEventListener('change', event => {
  const target = $('color-target').value, filled = event.target.checked;
  editColors(c => {
    const changed = target === 'all' ? selected.parts.map(p => p.id) : [target];
    const rest = c.filled.filter(id => !changed.includes(id));
    c.filled = filled ? [...rest, ...changed] : rest;
  });
});
$('reset-colors').addEventListener('click', () => editColors(c => Object.assign(c, defaultInk(selected))));

const stepZoom = steps => setZoom((Math.round(zoom * 100) + steps * 5) / 100);
$('zoom-in').addEventListener('click', () => stepZoom(1));
$('zoom-out').addEventListener('click', () => stepZoom(-1));
$('reset-drawing').addEventListener('click', resetDrawing);
viewport.addEventListener('keydown', event => {
  if (!['+', '=', '-', '0'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === '0') fitZoom();
  else stepZoom(event.key === '-' ? -1 : 1);
});

for (const panel of document.querySelectorAll('[popover]')) {
  panel.addEventListener('toggle', () => {
    if (!panel.matches(':popover-open')) return;
    const trigger = $(panel.id.replace('-panel', '-toggle')).getBoundingClientRect();
    panel.style.left = Math.max(12, Math.min(innerWidth - panel.offsetWidth - 12, trigger.right - panel.offsetWidth)) + 'px';
    panel.style.right = 'auto';
  });
}
new ResizeObserver(() => renderZoom()).observe($('controls'));
window.addEventListener('resize', () => renderZoom());

$('tight-crop').addEventListener('change', () => { $('pdf-size').textContent = $('tight-crop').checked ? 'Cropped vector' : 'A3 vector'; });
for (const button of document.querySelectorAll('.export-choice[data-format]')) button.addEventListener('click', () => download(button.dataset.format));

DrawingTheme.subscribe((mode, theme) => {
  $('appearance').value = mode;
  $('theme-toggle').setAttribute('aria-pressed', String(theme === 'dark'));
  $('theme-toggle').title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
});
$('theme-toggle').addEventListener('click', () => DrawingTheme.set(DrawingTheme.theme === 'dark' ? 'light' : 'dark'));
$('appearance').addEventListener('change', event => DrawingTheme.set(event.target.value));

$('subject').replaceChildren(...drawings.map(d => new Option(d.title, d.id)));
$('subject').hidden = drawings.length === 1;
selectDrawing(selected.id);
