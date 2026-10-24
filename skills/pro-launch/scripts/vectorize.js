// usage: node vectorize.js in.png out.svg   (needs: npm i @neplex/vectorizer svgo  -> see cutout_vector.sh)
// Colour PNG -> layered SVG with vtracer (via @neplex/vectorizer), then svgo. Settings that survived real use:
// stacked layers, spline mode, speckle filter 8, 6-bit colour; flat illustrations only (not photos).
const v = require('@neplex/vectorizer'), fs = require('fs'), { optimize } = require('svgo');
(async () => {
  const [inp, out] = process.argv.slice(2);
  if (!out) { console.error('usage: node vectorize.js in.png out.svg'); process.exit(1); }
  const raw = await v.vectorize(fs.readFileSync(inp), {
    colorMode: v.ColorMode.Color, hierarchical: v.Hierarchical.Stacked, mode: v.PathSimplifyMode.Spline,
    filterSpeckle: 8, colorPrecision: 6, layerDifference: 24, cornerThreshold: 60,
    lengthThreshold: 4, maxIterations: 10, spliceThreshold: 45, pathPrecision: 2 });
  const svg = optimize(raw, { multipass: true }).data;
  fs.writeFileSync(out, svg);
  console.log('ok', out, Math.round(svg.length / 1024) + ' KB');
})();
