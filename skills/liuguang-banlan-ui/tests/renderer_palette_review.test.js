'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..', 'assets', 'starter');
const source = fs.readFileSync(path.join(root, 'shared/spectral-field.js'), 'utf8');
for (const colorCount of [3, 7, 12]) {
  const sent = new Map();
  const shaders = [];
  const gl = {
    createShader: () => ({}), shaderSource: (_, text) => shaders.push(text),
    compileShader() {}, getShaderParameter: () => true,
    createProgram: () => ({}), attachShader() {}, linkProgram() {},
    getProgramParameter: () => true, useProgram() {},
    createBuffer: () => ({}), bindBuffer() {}, bufferData() {},
    getAttribLocation: () => 0, enableVertexAttribArray() {}, vertexAttribPointer() {},
    getUniformLocation: (_, name) => name, getParameter: () => 8,
    viewport() {}, uniform1f: (name, value) => sent.set(name,value),
    uniform3fv: (name, value) => sent.set(name,Array.from(value)),
    uniform1fv: (name, value) => sent.set(name,Array.from(value)),
    uniform2fv: (name, value) => sent.set(name,Array.from(value)),
  };
  const context = {
    window: {matchMedia: () => ({matches:false}), addEventListener() {}, devicePixelRatio:1},
    document: {hidden:false, documentElement:{style:{setProperty(){}}, classList:{add(){}}}, addEventListener(){}},
    requestAnimationFrame: () => 1, Float32Array,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'opal/theme-config.js'),'utf8'),context);
  const config = context.window.SPECTRAL_THEME;
  const template = structuredClone(config.colors[0]);
  config.colors = Array.from({length:colorCount}, (_,i)=>({...structuredClone(template),id:'color'+i,intensity:(i+1)/colorCount}));
  vm.runInContext(source,context);
  new context.window.SpectralField({getContext:()=>gl,clientWidth:100,clientHeight:100,addEventListener(){}},config);
  assert.equal(sent.get('uColorCount'),colorCount);
  const strengths = sent.get('uStrengths[0]');
  assert.ok(strengths[colorCount-1] > 0, 'final configured color must reach GPU');
  assert.equal(strengths.length,12);
  for(let i=colorCount;i<12;i++) assert.equal(strengths[i],0,'unused slots must not duplicate the last color');
  assert.ok(shaders.some(text=>text.includes('uColorCount')&&text.includes('uColors[12]')));
}
console.log('Renderer palette upload regression passed (mock GL; no GPU/visual certification).');
