(function (root) {
  'use strict';
  const api = {
    width: 420,
    height: 297,
    margin: 28,
    labelMargin: 78,
    axisDash: '6 1 1 1',
    linework: {
      technical: {outline: .35, edge: .22, detail: .13, texture: .09, axis: .13},
      patent: {outline: .24, edge: .15, detail: .10, texture: .065, axis: .1},
      service: {outline: .5, edge: .28, detail: .16, texture: 0, axis: .16}
    },
    linecap: role => role === 'axis' ? 'butt' : 'round',
    css: preset => Object.entries(api.linework[preset]).map(([role, width]) => `[data-line-role="${role}"]{stroke-width:${width};stroke-linecap:${api.linecap(role)}}`).join('')
      + `[data-line-role="axis"]{stroke-dasharray:${api.axisDash}}`,
    slug: name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TechnicalSheet = api;
})(globalThis);
