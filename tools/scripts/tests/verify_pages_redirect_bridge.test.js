const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { generateBridge } = require('../generate-pages-redirect-bridge');
const { verifyLiveDeployment, verifyLocalDeployment } = require('../verify-pages-redirect-bridge');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-pages-redirect-'));
const current = 'https://example.github.io/agentic-awesome-skills/';
const legacy = 'https://example.github.io/antigravity-awesome-skills/';

async function run() {
  const sitemapPath = path.join(root, 'sitemap.xml');
  const skillsIndexPath = path.join(root, 'skills.json');
  const googleVerificationPath = path.join(root, 'google5815fd8827d2319c.html');
  const deploymentRoot = path.join(root, 'deployment');
  fs.writeFileSync(sitemapPath, `<?xml version="1.0"?><urlset><url><loc>${current}</loc></urlset>`);
  fs.writeFileSync(skillsIndexPath, JSON.stringify([{ id: 'alpha' }, { id: 'beta' }]));
  fs.writeFileSync(googleVerificationPath, 'google-site-verification: google5815fd8827d2319c.html');
  const generatorOptions = {
    sitemapPath,
    skillsIndexPath,
    googleVerificationPath,
    currentBase: current,
    legacyBase: legacy,
    expectedRoutes: 1,
    expectedSkills: 2,
  };
  const manifest = generateBridge({ ...generatorOptions, outputDirectory: deploymentRoot });
  const verified = verifyLocalDeployment({ ...generatorOptions, deploymentRoot });
  assert.strictEqual(verified.manifest.route_count, manifest.route_count);

  const rootHtmlPath = path.join(deploymentRoot, 'antigravity-awesome-skills/index.html');
  const originalRoot = fs.readFileSync(rootHtmlPath);
  fs.appendFileSync(rootHtmlPath, '\ndrift');
  assert.throws(() => verifyLocalDeployment({ ...generatorOptions, deploymentRoot }), /mismatched=/);
  fs.writeFileSync(rootHtmlPath, originalRoot);

  const stalePath = path.join(deploymentRoot, 'antigravity-awesome-skills/stale.txt');
  fs.writeFileSync(stalePath, 'stale');
  assert.throws(() => verifyLocalDeployment({ ...generatorOptions, deploymentRoot }), /unexpected=.*stale\.txt/);
  fs.unlinkSync(stalePath);

  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith('/agentic-awesome-skills/')) return new Response('current destination', { status: 200 });
    const relative = parsed.pathname.replace(/^\//, '');
    let filePath = path.join(deploymentRoot, relative);
    if (parsed.pathname.endsWith('/')) filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath)) return new Response('missing', { status: 404 });
    return new Response(fs.readFileSync(filePath), { status: 200 });
  };
  const live = await verifyLiveDeployment({
    deploymentRoot,
    liveRoot: 'https://example.github.io/',
    liveMode: 'all',
    fetchImpl,
  });
  assert.strictEqual(live.checked_redirects, manifest.route_count);

  await assert.rejects(() => verifyLiveDeployment({
    deploymentRoot,
    liveRoot: 'https://example.github.io/',
    concurrency: 0,
    fetchImpl,
  }), /concurrency must be an integer from 1 to 64/);

  const missingBingFetch = async (url, init) => {
    if (new URL(url).pathname === '/antigravity-awesome-skills/') {
      return new Response(fs.readFileSync(rootHtmlPath, 'utf8').replace('msvalidate.01', 'missing-bing'), { status: 200 });
    }
    return fetchImpl(url, init);
  };
  await assert.rejects(() => verifyLiveDeployment({
    deploymentRoot,
    liveRoot: 'https://example.github.io/',
    fetchImpl: missingBingFetch,
  }), /exact Bing verification meta tag/);

  const mismatchedFetch = async (url, init) => {
    if (new URL(url).pathname === '/redirect-manifest.json') return new Response('{}\n', { status: 200 });
    return fetchImpl(url, init);
  };
  await assert.rejects(() => verifyLiveDeployment({
    deploymentRoot,
    liveRoot: 'https://example.github.io/',
    fetchImpl: mismatchedFetch,
  }), /live redirect manifest differs/);
}

run()
  .then(() => console.log('verify_pages_redirect_bridge tests passed'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => fs.rmSync(root, { recursive: true, force: true }));
