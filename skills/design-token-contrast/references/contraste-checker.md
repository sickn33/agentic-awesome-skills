# Checker source

`design-token-contrast` ships its checker as source so the review stays auditable and
dependency-free. Save the block below as `contraste.mjs` somewhere you can run Node 18+
from, then invoke it with `node contraste.mjs`. No dependencies.

```javascript
#!/usr/bin/env node
// Calcula el contraste WCAG 2.x entre los colores de tus tokens y sugiere un ajuste cuando un par
// no llega al mínimo. Lee variables CSS (--color-*) en hex, rgb(), hsl() u oklch(), y resuelve
// alias var(--otro-token). No necesita dependencias.
//
// Uso:
//   node contraste.mjs                               # busca src/styles/tokens.css
//   node contraste.mjs --tokens ruta/tokens.css
//   node contraste.mjs --pares .kit/contraste.json   # pares explícitos
//   node contraste.mjs --todos                       # matriz con todas las combinaciones
//   node contraste.mjs --json informe.json
//
// Formato de --pares: [{"texto": "--color-texto", "fondo": "--color-fondo", "tipo": "texto"}]
//   tipo: "texto" (4,5:1), "texto-grande" (3:1, desde 24 px o 18,66 px en negrita), "ui" (3:1,
//   bordes de campos, íconos, indicador de foco: criterio 1.4.11).
// Sale con código 1 si algún par falla, y con código 2 si no pudo medir nada o algún par quedó sin
// medir (un token que no existe o no es un color): un informe incompleto nunca dice «todo cumple».

import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const op = { tokens: null, pares: null, todos: false, json: null };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--tokens') op.tokens = argv[++i];
  else if (a === '--pares') op.pares = argv[++i];
  else if (a === '--todos') op.todos = true;
  else if (a === '--json') op.json = argv[++i];
  else if (a === '--ayuda' || a === '-h') { console.log('Uso: node contraste.mjs [--tokens archivo.css] [--pares pares.json] [--todos] [--json salida.json]'); process.exit(0); }
}

function buscarTokens() {
  const candidatos = ['src/styles/tokens.css', 'src/styles/global.css', 'src/app/globals.css', 'app/globals.css', 'src/index.css', 'styles/tokens.css'];
  for (const c of candidatos) if (fs.existsSync(c)) return c;
  return null;
}
const archivo = op.tokens || buscarTokens();
if (!archivo || !fs.existsSync(archivo)) {
  console.error('No encontré el archivo de tokens. Indícalo con --tokens ruta/al/archivo.css');
  process.exit(2);
}
const css = fs.readFileSync(archivo, 'utf8');

// ---------- Lectura de variables por bloque ----------
// Separamos las variables del tema claro (por defecto) de las de modo oscuro.
const DECLARACION = /(--[\w-]+)\s*:\s*([^;{}]+)/g;
// Un selector es de modo oscuro si nombra .dark o [data-theme="dark"] en cualquier posición
// (.dark, .dark:root, :root.dark, html[data-theme=dark]), salvo dentro de :not(...).
const esSelectorOscuro = (sel) => /\[data-theme=["']?dark["']?\]|\.dark(?![\w-])/.test(sel.replace(/:not\([^)]*\)/g, ''));
function leerVariables(texto) {
  const claro = new Map();
  const oscuro = new Map();
  let resto = texto.replace(/\/\*[\s\S]*?\*\//g, '');
  // 1) @media (prefers-color-scheme: dark) { ... } completo, con todos sus bloques internos.
  for (const m of resto.matchAll(/@media[^{]*prefers-color-scheme:\s*dark[^{]*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g)) {
    for (const v of m[1].matchAll(DECLARACION)) oscuro.set(v[1], v[2].trim());
    resto = resto.replace(m[0], '');
  }
  // 2) Bloques cuyo selector es de modo oscuro.
  for (const m of resto.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if (!esSelectorOscuro(m[1])) continue;
    for (const v of m[2].matchAll(DECLARACION)) oscuro.set(v[1], v[2].trim());
    resto = resto.replace(m[0], '');
  }
  for (const v of resto.matchAll(DECLARACION)) claro.set(v[1], v[2].trim());
  return { claro, oscuro };
}

// ---------- Conversión de color ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const srgbALineal = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linealASrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function oklabARgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    linealASrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linealASrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linealASrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}
function rgbAOklab(r, g, b) {
  const R = srgbALineal(r), G = srgbALineal(g), B = srgbALineal(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function hslARgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}
const num = (t, escala = 1) => (t.trim().endsWith('%') ? parseFloat(t) / 100 : parseFloat(t) / escala);
// Ángulos de CSS en grados: deg (o sin unidad), rad, grad y turn. Los componentes no finitos se rechazan.
function angulo(t) {
  const x = parseFloat(t);
  if (!Number.isFinite(x)) return NaN;
  if (/grad$/.test(t)) return x * 0.9;
  if (/rad$/.test(t)) return x * 180 / Math.PI;
  if (/turn$/.test(t)) return x * 360;
  return x;
}

// Devuelve { r, g, b, a } en 0..1 o null si no se puede interpretar.
function parsearColor(valor, vars, profundidad = 0) {
  try {
    const c = parsearColorInterno(valor, vars, profundidad);
    return c && [c.r, c.g, c.b, c.a].every(Number.isFinite) ? c : null;
  } catch { return null; }
}
function parsearColorInterno(valor, vars, profundidad = 0) {
  if (!valor || profundidad > 10) return null;
  // El nombre dentro de var() distingue mayúsculas, como en el navegador: se busca tal cual.
  const alias = valor.trim().match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/i);
  if (alias) {
    const destino = vars.get(alias[1]);
    return parsearColor(destino ?? alias[2], vars, profundidad + 1);
  }
  const v = valor.trim().toLowerCase();
  if (v === 'white') return { r: 1, g: 1, b: 1, a: 1 };
  if (v === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  if (v === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  let m = v.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
  }
  m = v.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    return { r: num(p[0], 255), g: num(p[1], 255), b: num(p[2], 255), a: p[3] ? num(p[3]) : 1 };
  }
  m = v.match(/^hsla?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    // Saturación y luminosidad: con % o como número de 0 a 100 (sintaxis moderna).
    const [r, g, b] = hslARgb(angulo(p[0]), num(p[1], 100), num(p[2], 100));
    return { r, g, b, a: p[3] ? num(p[3]) : 1 };
  }
  m = v.match(/^oklch\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[\s/]+/).filter(Boolean);
    const L = num(p[0]);
    const C = p[1].trim().endsWith('%') ? parseFloat(p[1]) / 100 * 0.4 : (parseFloat(p[1]) || 0); // 100% = 0,4
    const H = angulo(p[2]) * Math.PI / 180;
    const [r, g, b] = oklabARgb(L, C * Math.cos(H), C * Math.sin(H));
    return { r: clamp(r), g: clamp(g), b: clamp(b), a: p[3] ? num(p[3]) : 1, fueraDeGama: [r, g, b].some((x) => x < -0.001 || x > 1.001) };
  }
  return null;
}

const luminancia = ({ r, g, b }) => 0.2126 * srgbALineal(r) + 0.7152 * srgbALineal(g) + 0.0722 * srgbALineal(b);
function componer(frente, fondo) {
  const a = frente.a ?? 1;
  return { r: frente.r * a + fondo.r * (1 - a), g: frente.g * a + fondo.g * (1 - a), b: frente.b * a + fondo.b * (1 - a), a: 1 };
}
function contraste(c1, c2) {
  const fondo = c2.a < 1 ? componer(c2, { r: 1, g: 1, b: 1 }) : c2;
  const frente = c1.a < 1 ? componer(c1, fondo) : c1;
  const L1 = luminancia(frente), L2 = luminancia(fondo);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}
const aHex = ({ r, g, b }) => '#' + [r, g, b].map((x) => Math.round(clamp(x) * 255).toString(16).padStart(2, '0')).join('');

// Busca la luminosidad OKLCH más cercana a la original que cumpla el mínimo contra TODOS los fondos
// dados, manteniendo tono y croma.
function sugerirTodos(frente, fondos, minimo) {
  if (![frente, ...fondos].every(c => [c.r, c.g, c.b, c.a].every(Number.isFinite)) || !Number.isFinite(minimo)) return null;
  const [L, a, b] = rgbAOklab(frente.r, frente.g, frente.b);
  const C = Math.hypot(a, b);
  const H = Math.atan2(b, a);
  let mejor = null;
  for (const dir of [-1, 1]) {
    for (let paso = 1; paso <= 400; paso++) { // recorre todo el rango hasta 0 o 1
      const L2 = L + dir * paso * 0.0025;
      if (L2 < 0 || L2 > 1) break;
      let c = C;
      let rgb = oklabARgb(L2, c * Math.cos(H), c * Math.sin(H));
      while (rgb.some((x) => x < 0 || x > 1) && c > 0) { c -= 0.005; rgb = oklabARgb(L2, c * Math.cos(H), c * Math.sin(H)); }
      const cand = { r: clamp(rgb[0]), g: clamp(rgb[1]), b: clamp(rgb[2]), a: 1 };
      if (fondos.every((f) => contraste(cand, f) >= minimo + 0.05)) {
        if (!mejor || paso < mejor.paso) mejor = { paso, color: cand, oklch: `oklch(${(L2 * 100).toFixed(1)}% ${c.toFixed(3)} ${((H * 180 / Math.PI + 360) % 360).toFixed(1)})` };
        break;
      }
    }
  }
  return mejor;
}

// Busca la luminosidad OKLCH más cercana a la original que cumpla el mínimo, manteniendo tono y croma.
function sugerir(frente, fondo, minimo) {
  if (![frente, fondo].every(c => [c.r, c.g, c.b, c.a].every(Number.isFinite)) || !Number.isFinite(minimo)) return null;
  const [L, a, b] = rgbAOklab(frente.r, frente.g, frente.b);
  const C = Math.hypot(a, b);
  const H = Math.atan2(b, a);
  let mejor = null;
  for (const dir of [-1, 1]) {
    for (let paso = 1; paso <= 400; paso++) { // recorre todo el rango hasta 0 o 1
      const L2 = L + dir * paso * 0.005;
      if (L2 < 0 || L2 > 1) break;
      let c = C;
      let rgb = oklabARgb(L2, c * Math.cos(H), c * Math.sin(H));
      while (rgb.some((x) => x < 0 || x > 1) && c > 0) { c -= 0.005; rgb = oklabARgb(L2, c * Math.cos(H), c * Math.sin(H)); }
      const candidato = { r: clamp(rgb[0]), g: clamp(rgb[1]), b: clamp(rgb[2]), a: 1 };
      if (contraste(candidato, fondo) >= minimo + 0.05) {
        if (!mejor || paso < mejor.paso) mejor = { paso, color: candidato, oklch: `oklch(${(L2 * 100).toFixed(1)}% ${c.toFixed(3)} ${((H * 180 / Math.PI + 360) % 360).toFixed(1)})` };
        break;
      }
    }
  }
  return mejor;
}

// ---------- Pares a revisar ----------
const MINIMOS = { texto: 4.5, 'texto-grande': 3, ui: 3 };
const esFrente = (n) => /texto|text|foreground|\bfg\b|-fg|contraste?|on-|tinta|ink|titulo|heading|foco|focus|borde-(campo|fuerte|control|input)|border-(input|strong)|icono|icon|enlace|link/.test(n);
const esFondo = (n) => /fondo|background|\bbg\b|-bg|superficie|surface|base|lienzo|canvas|tarjeta|card|(acento|accent|primario|primary|marca|brand)-(suave|tinte|weak|subtle|light|50|100)/.test(n);

// Un nombre que dice explícitamente que va encima (-foreground, -fg, on-, -texto, -contraste) es
// frente aunque también nombre un fondo: --color-card-foreground, --color-on-surface.
const esFrenteExplicito = (n) => /foreground$|-fg$|(^--|-)on-|-(texto|text)$|-contraste?$|-contrast$/.test(n);

function paresPorNombre(colores) {
  const nombres = [...colores.keys()];
  const frentes = nombres.filter((n) => esFrente(n) && (!esFondo(n) || esFrenteExplicito(n)));
  const fondos = nombres.filter((n) => esFondo(n) && !frentes.includes(n));
  const pares = [];
  for (const f of frentes) {
    const tipo = /foco|focus|borde-|border-|icono|icon/.test(f) ? 'ui' : 'texto';
    if (/-contraste?$|-on-|-(foreground|fg)$/.test(f)) {
      // --color-acento-contraste (o --color-accent-contrast) va sobre --color-acento; --color-on-primary,
      // sobre --color-primary; --color-card-foreground, sobre --color-card.
      const candidatos = [f.replace(/-contraste?$/, ''), f.replace('-on-', '-'), f.replace(/-(foreground|fg)$/, '')].filter((n) => colores.has(n) && n !== f);
      if (candidatos.length) { pares.push({ texto: f, fondo: candidatos[0], tipo }); continue; }
    }
    for (const b of fondos) pares.push({ texto: f, fondo: b, tipo });
  }
  return pares;
}

function evaluar(variables, etiqueta) {
  const colores = new Map();
  const noLeidos = [];
  for (const [nombre, valor] of variables) {
    if (!/^--colou?r-/.test(nombre)) continue;
    const c = parsearColor(valor, variables);
    if (c) colores.set(nombre, c); else noLeidos.push(`${nombre}: ${valor}`);
  }
  if (colores.size === 0) return null;
  let pares;
  if (op.pares) pares = PARES_ARCHIVO;
  else if (op.todos) {
    pares = [];
    const lista = [...colores.keys()];
    for (const a of lista) for (const b of lista) if (a !== b) pares.push({ texto: a, fondo: b, tipo: 'texto' });
  } else pares = paresPorNombre(colores);

  const filas = [];
  for (const p of pares) {
    const f = colores.get(p.texto), b = colores.get(p.fondo);
    if (!f || !b) { filas.push({ ...p, error: 'token no encontrado o no es un color' }); continue; }
    const ratio = contraste(f, b);
    const minimo = MINIMOS[p.tipo] ?? 4.5;
    const fila = { ...p, ratio: Math.round(ratio * 100) / 100, minimo, pasa: ratio >= minimo, frente: aHex(f), fondoHex: aHex(b) };
    if (!fila.pasa) {
      const s = sugerir(f, b.a < 1 ? componer(b, { r: 1, g: 1, b: 1 }) : b, minimo);
      if (s) fila.sugerencia = `${s.oklch} (${aHex(s.color)}) → ${contraste(s.color, b).toFixed(2)}:1`;
    }
    if (f.fueraDeGama || b.fueraDeGama) fila.nota = 'algún color oklch() queda fuera de sRGB y se recortó';
    filas.push(fila);
  }
  // Una sugerencia por token que falla, que pase contra todos los fondos con los que se mide.
  const unicas = [];
  const porToken = new Map();
  for (const f of filas) if (f.pasa === false) porToken.set(f.texto, [...(porToken.get(f.texto) || []), f]);
  for (const [token, fallas] of porToken) {
    const todas = filas.filter((x) => x.texto === token && !x.error);
    const fondos = todas.map((x) => { const b = colores.get(x.fondo); return b.a < 1 ? componer(b, { r: 1, g: 1, b: 1 }) : b; });
    const minimo = Math.max(...todas.map((x) => x.minimo));
    const s = sugerirTodos(colores.get(token), fondos, minimo);
    if (s) unicas.push({ token, sugerencia: `${s.oklch} (${aHex(s.color)})`, peor: Math.min(...fondos.map((f) => contraste(s.color, f))).toFixed(2), fondos: todas.length });
  }
  return { etiqueta, colores: colores.size, noLeidos, filas, unicas };
}

// El archivo de pares se lee una sola vez (así también funciona con <(...) en la terminal).
const PARES_ARCHIVO = op.pares ? JSON.parse(fs.readFileSync(op.pares, 'utf8')) : null;
const { claro, oscuro } = leerVariables(css);
const resultados = [evaluar(claro, 'tema claro (por defecto)')];
if (oscuro.size) resultados.push(evaluar(new Map([...claro, ...oscuro]), 'modo oscuro'));

let fallas = 0, incompletos = 0, medidos = 0;
console.log(`Archivo: ${archivo}`);
if (!resultados.some(Boolean)) console.log('\nNo encontré ninguna variable --color-* que pueda leer como color.');
for (const r of resultados.filter(Boolean)) {
  console.log(`\n== ${r.etiqueta}: ${r.colores} colores leídos ==`);
  if (r.filas.length === 0) console.log('No pude armar pares por nombre. Usa --pares o --todos.');
  const ordenadas = r.filas;
  for (const f of ordenadas) {
    if (f.error) { console.log(`  ?  ${f.texto} sobre ${f.fondo}: ${f.error}`); incompletos++; continue; }
    medidos++;
    if (op.todos && f.pasa) continue;
    const marca = f.pasa ? 'OK ' : 'NO ';
    console.log(`  ${marca} ${f.ratio.toFixed(2)}:1 (mín. ${f.minimo}) ${f.texto} ${f.frente} sobre ${f.fondo} ${f.fondoHex}${f.nota ? '  [' + f.nota + ']' : ''}`);
    if (f.sugerencia) console.log(`       sugerencia para ${f.texto}: ${f.sugerencia}`);
    if (!f.pasa) fallas++;
  }
  if (op.todos) console.log(`  (con --todos solo se listan las combinaciones que no pasan 4,5:1; ${r.filas.filter((f) => f.pasa).length} sí pasan)`);
  for (const u of r.unicas || []) console.log(`  → Un solo valor para ${u.token} que pasa en sus ${u.fondos} fondos: ${u.sugerencia} (peor caso ${u.peor}:1)`);
  if (r.noLeidos.length) console.log(`  No interpretados: ${r.noLeidos.join(' · ')}`);
}
if (fallas) console.log(`\n${fallas} pares no llegan al mínimo de WCAG 2.2 AA.`);
if (incompletos) console.log(`\n${incompletos} pares no se pudieron medir: revisa que esos tokens existan y sean colores.`);
if (!medidos) console.log('\nNo se midió ningún par: el informe no dice nada sobre tu contraste.');
else if (!fallas && !incompletos) console.log('\nTodos los pares revisados cumplen WCAG 2.2 AA.');
console.log('Ojo: esto mide los tokens. Un texto sobre una imagen o un degradado hay que revisarlo en pantalla.');
if (op.json) fs.writeFileSync(op.json, JSON.stringify(resultados, null, 2));
process.exit(fallas && !op.todos ? 1 : (incompletos || !medidos ? 2 : 0));
```
