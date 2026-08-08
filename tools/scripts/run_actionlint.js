#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const https = require("https");
const path = require("path");
const { spawnSync } = require("child_process");

const { findProjectRoot } = require("../lib/project-root");

function platformKey(platform = process.platform, arch = process.arch) {
  const osName = { darwin: "darwin", linux: "linux" }[platform];
  const archName = { x64: "amd64", arm64: "arm64" }[arch];
  if (!osName || !archName) {
    throw new Error(`Unsupported actionlint platform: ${platform}/${arch}`);
  }
  return `${osName}-${archName}`;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function download(url, destination, redirects = 5) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { "user-agent": "agentic-awesome-skills-actionlint" } }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        if (redirects <= 0) {
          reject(new Error(`Too many redirects downloading ${url}`));
          return;
        }
        download(response.headers.location, destination, redirects - 1).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Download failed (${response.statusCode}) for ${url}`));
        return;
      }
      const stream = fs.createWriteStream(destination, { mode: 0o600 });
      response.pipe(stream);
      stream.on("finish", () => stream.close(resolve));
      stream.on("error", reject);
    });
    request.on("error", reject);
  });
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }
}

async function ensureActionlint(projectRoot) {
  const config = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "tools", "config", "actionlint.json"), "utf8"),
  );
  const key = platformKey();
  const expectedHash = config.artifacts[key];
  if (!/^[a-f0-9]{64}$/.test(String(expectedHash || ""))) {
    throw new Error(`Missing SHA-256 for actionlint platform ${key}`);
  }

  const [osName, archName] = key.split("-");
  const cacheDir = path.join(projectRoot, ".tmp", "actionlint", config.version, key);
  const binaryPath = path.join(cacheDir, "actionlint");
  const archiveName = `actionlint_${config.version}_${osName}_${archName}.tar.gz`;
  const archivePath = path.join(cacheDir, archiveName);
  fs.mkdirSync(cacheDir, { recursive: true });

  if (!fs.existsSync(archivePath) || sha256(archivePath) !== expectedHash) {
    fs.rmSync(archivePath, { force: true });
    const url = `https://github.com/rhysd/actionlint/releases/download/v${config.version}/${archiveName}`;
    console.log(`[actionlint] Downloading pinned v${config.version} for ${key}`);
    await download(url, archivePath);
  }
  const actualHash = sha256(archivePath);
  if (actualHash !== expectedHash) {
    fs.rmSync(archivePath, { force: true });
    throw new Error(`actionlint checksum mismatch: expected ${expectedHash}, got ${actualHash}`);
  }

  // Always recreate the executable from the verified archive so a stale or
  // tampered cache entry cannot become the verifier.
  fs.rmSync(binaryPath, { force: true });
  run("tar", ["-xzf", archivePath, "-C", cacheDir, "actionlint"], projectRoot);
  fs.chmodSync(binaryPath, 0o755);

  return binaryPath;
}

async function main() {
  const projectRoot = findProjectRoot(__dirname);
  const binary = await ensureActionlint(projectRoot);
  run(binary, ["-color"], projectRoot);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[actionlint] ${error.message}`);
    process.exit(1);
  });
}

module.exports = { download, ensureActionlint, platformKey, sha256 };
