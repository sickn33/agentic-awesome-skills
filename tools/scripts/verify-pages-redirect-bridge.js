#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { generateBridge } = require('./generate-pages-redirect-bridge');

function listFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filePath);
      else if (entry.isFile()) files.push(path.relative(root, filePath));
      else throw new Error(`managed bridge contains a non-file entry: ${path.relative(root, filePath)}`);
    }
  }
  visit(root);
  return files;
}

function managedFiles(root, legacyBase) {
  const required = ['.nojekyll', 'redirect-manifest.json'];
  const legacyDirectory = path.join(root, ...new URL(legacyBase).pathname.split('/').filter(Boolean));
  if (!fs.existsSync(legacyDirectory) || !fs.statSync(legacyDirectory).isDirectory()) {
    throw new Error(`missing managed legacy directory: ${legacyDirectory}`);
  }
  return [...required, ...listFiles(legacyDirectory).map((file) => path.join(path.relative(root, legacyDirectory), file))]
    .map((file) => file.split(path.sep).join('/'))
    .sort();
}

function compareManagedTrees(expectedRoot, actualRoot, legacyBase) {
  const expectedFiles = managedFiles(expectedRoot, legacyBase);
  const actualFiles = managedFiles(actualRoot, legacyBase);
  const expectedSet = new Set(expectedFiles);
  const actualSet = new Set(actualFiles);
  const missing = expectedFiles.filter((file) => !actualSet.has(file));
  const unexpected = actualFiles.filter((file) => !expectedSet.has(file));
  const mismatched = expectedFiles.filter((file) => actualSet.has(file)
    && !fs.readFileSync(path.join(expectedRoot, file)).equals(fs.readFileSync(path.join(actualRoot, file))));
  if (missing.length || unexpected.length || mismatched.length) {
    throw new Error(`managed bridge drift detected: missing=${missing.join(',') || '-'} unexpected=${unexpected.join(',') || '-'} mismatched=${mismatched.join(',') || '-'}`);
  }
  return { file_count: expectedFiles.length };
}

function generateExpected(options) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-redirect-verify-'));
  const outputDirectory = path.join(temporaryRoot, 'bridge');
  try {
    const manifest = generateBridge({ ...options, outputDirectory });
    return { temporaryRoot, outputDirectory, manifest };
  } catch (error) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
}

function verifyLocalDeployment(options) {
  if (!options.deploymentRoot) throw new Error('--deployment-root is required');
  const deploymentRoot = path.resolve(options.deploymentRoot);
  const generated = generateExpected(options);
  try {
    const result = compareManagedTrees(generated.outputDirectory, deploymentRoot, generated.manifest.legacy_base);
    return { ...result, manifest: generated.manifest };
  } finally {
    fs.rmSync(generated.temporaryRoot, { recursive: true, force: true });
  }
}

function selectRedirects(redirects, mode) {
  if (mode === 'all') return redirects;
  if (mode !== 'sample') throw new Error('--live-mode must be sample or all');
  const indexes = new Set([0, redirects.length - 1]);
  const sampleSize = Math.min(25, redirects.length);
  for (let index = 0; index < sampleSize; index += 1) {
    indexes.add(Math.floor((index * (redirects.length - 1)) / Math.max(1, sampleSize - 1)));
  }
  return [...indexes].sort((left, right) => left - right).map((index) => redirects[index]);
}

async function fetchText(url, fetchImpl, timeoutMs) {
  const response = await fetchImpl(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  const body = await response.text();
  if (response.status !== 200) throw new Error(`live probe failed: ${url} returned ${response.status}`);
  return body;
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

async function verifyLiveDeployment(options) {
  const deploymentRoot = path.resolve(options.deploymentRoot);
  const liveRoot = new URL(options.liveRoot);
  if (liveRoot.protocol !== 'https:' || !liveRoot.pathname.endsWith('/')) {
    throw new Error('--live-root must be an HTTPS URL ending with a slash');
  }
  const fetchImpl = options.fetchImpl || global.fetch;
  const timeoutMs = Number(options.timeoutMs ?? 15000);
  const concurrency = Number(options.concurrency ?? 16);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) {
    throw new Error('--timeout-ms must be an integer from 1 to 60000');
  }
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 64) {
    throw new Error('--concurrency must be an integer from 1 to 64');
  }
  const manifestSource = fs.readFileSync(path.join(deploymentRoot, 'redirect-manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestSource);
  const liveManifest = await fetchText(new URL('redirect-manifest.json', liveRoot), fetchImpl, timeoutMs);
  if (liveManifest !== manifestSource) throw new Error('live redirect manifest differs from the protected deployment');

  const googlePath = manifest.webmaster_verification.google.legacy_file;
  const expectedGoogle = fs.readFileSync(path.join(deploymentRoot, googlePath), 'utf8');
  const liveGoogle = await fetchText(new URL(googlePath, liveRoot), fetchImpl, timeoutMs);
  if (liveGoogle !== expectedGoogle) throw new Error('live Google verification file differs from the protected deployment');

  const expectedSitemap = fs.readFileSync(path.join(deploymentRoot, manifest.legacy_sitemap), 'utf8');
  const liveSitemap = await fetchText(new URL(manifest.legacy_sitemap, liveRoot), fetchImpl, timeoutMs);
  if (liveSitemap !== expectedSitemap) throw new Error('live legacy sitemap differs from the protected deployment');

  const bing = manifest.webmaster_verification.bing;
  const liveLegacyRoot = await fetchText(manifest.legacy_base, fetchImpl, timeoutMs);
  const bingMeta = `name="${bing.meta_name}" content="${bing.token}"`;
  if ((liveLegacyRoot.match(new RegExp(bingMeta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length !== 1) {
    throw new Error('live legacy root does not expose the exact Bing verification meta tag');
  }

  const redirects = selectRedirects(manifest.redirects, options.liveMode || 'sample');
  await runPool(redirects, concurrency, async (redirect) => {
    const legacyHtml = await fetchText(redirect.from, fetchImpl, timeoutMs);
    if (!legacyHtml.includes(`http-equiv="refresh" content="0; url=${redirect.to}"`)
      || !legacyHtml.includes(`rel="canonical" href="${redirect.to}"`)) {
      throw new Error(`live redirect markup mismatch: ${redirect.from}`);
    }
    await fetchText(redirect.to, fetchImpl, timeoutMs);
  });
  return { checked_redirects: redirects.length, route_count: manifest.route_count };
}

function parseArgs(argv) {
  const options = {};
  const aliases = {
    '--deployment-root': 'deploymentRoot',
    '--sitemap': 'sitemapPath',
    '--skills-index': 'skillsIndexPath',
    '--google-verification': 'googleVerificationPath',
    '--current-base': 'currentBase',
    '--legacy-base': 'legacyBase',
    '--expected-routes': 'expectedRoutes',
    '--expected-skills': 'expectedSkills',
    '--live-root': 'liveRoot',
    '--live-mode': 'liveMode',
    '--concurrency': 'concurrency',
    '--timeout-ms': 'timeoutMs',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const key = aliases[arg];
    const value = argv[index + 1];
    if (!key || !value || value.startsWith('--')) throw new Error(`unknown option or missing value: ${arg}`);
    options[key] = value;
    index += 1;
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const local = verifyLocalDeployment(options);
  process.stdout.write(`Verified ${local.file_count} managed bridge files for ${local.manifest.route_count} routes\n`);
  if (options.liveRoot) {
    const live = await verifyLiveDeployment(options);
    process.stdout.write(`Verified ${live.checked_redirects}/${live.route_count} live redirect pairs\n`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`redirect bridge verification failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  compareManagedTrees,
  parseArgs,
  selectRedirects,
  verifyLiveDeployment,
  verifyLocalDeployment,
};
