#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_MAX_FILES = 10_000;
const MAX_FILE_BYTES = 512 * 1024;
const SOURCE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".vue",
  ".svelte",
  ".html",
]);
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".output",
  ".svelte-kit",
  ".turbo",
  ".vercel",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "vendor",
]);
const IGNORED_FILE_PREFIXES = [".env", "credentials", "secrets"];

const SIGNALS = [
  {
    kind: "webmcp",
    patterns: [
      /\b(?:navigator|document)\.modelContext\b/,
      /\bregisterTool\s*\(/,
      /\btoolname\s*=/i,
    ],
  },
  {
    kind: "form",
    patterns: [/<form\b/i, /\bonSubmit\s*=/, /\baddEventListener\s*\(\s*["']submit["']/, /\buseForm\s*\(/],
  },
  {
    kind: "server-action",
    patterns: [
      /^[\s]*["']use server["'];?/,
      /\bexport\s+async\s+function\s+(?:action|create|update|delete|submit|send|publish|save)\w*/i,
      /\bserverAction\s*\(/,
    ],
  },
  {
    kind: "route-handler",
    patterns: [
      /\bexport\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)\b/,
      /\b(?:router|app)\.(?:get|post|put|patch|delete)\s*\(/,
      /\b(?:createBrowserRouter|createRoutesFromElements)\s*\(/,
      /<Route\b/,
    ],
  },
  {
    kind: "schema",
    patterns: [
      /\bz\.object\s*\(/,
      /\b(?:yup|Joi)\.object\s*\(/,
      /\b(?:v|valibot)\.object\s*\(/,
      /\bjsonSchema\b/i,
      /\binputSchema\b/,
    ],
  },
  {
    kind: "client-state",
    patterns: [
      /\b(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\s*\(/,
      /\bindexedDB\.(?:open|deleteDatabase)\s*\(/,
      /\blocal[Ff]orage\.(?:getItem|setItem|removeItem|clear)\s*\(/,
      /\batomWithStorage\s*\(/,
    ],
  },
  {
    kind: "network-client",
    patterns: [
      /\bfetch\s*\(/,
      /\baxios\.(?:get|post|put|patch|delete|request)\s*\(/,
      /\b(?:useQuery|useMutation|useLazyQuery)\s*\(/,
      /\b(?:graphql|gql)\s*`/,
    ],
  },
  {
    kind: "capability-function",
    patterns: [
      /\bfunction\s+(?:add|calculate|compute|convert|create|delete|export|fetch|filter|find|get|import|list|load|lookup|move|publish|remove|save|search|send|set|start|submit|toggle|update)\w*\s*\(/i,
      /\b(?:const|let|var)\s+(?:add|calculate|compute|convert|create|delete|export|fetch|filter|find|get|import|list|load|lookup|move|publish|remove|save|search|send|set|start|submit|toggle|update)\w*\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/i,
    ],
  },
  {
    kind: "authorization",
    patterns: [
      /\b(?:authorize|authorization|permission|requireUser|requireAuth|isAdmin|canAccess|csrf|idempotency)\b/i,
    ],
  },
];

const FRAMEWORK_PACKAGES = new Map([
  ["next", "Next.js"],
  ["react", "React"],
  ["react-router", "React Router"],
  ["react-router-dom", "React Router"],
  ["@remix-run/react", "Remix"],
  ["vue", "Vue"],
  ["nuxt", "Nuxt"],
  ["svelte", "Svelte"],
  ["@sveltejs/kit", "SvelteKit"],
  ["vite", "Vite"],
  ["astro", "Astro"],
  ["express", "Express"],
  ["fastify", "Fastify"],
  ["hono", "Hono"],
]);

function usage() {
  return "Usage: scan-codebase.mjs <repository> [--max-files <count>]";
}

function parseArgs(argv) {
  let root;
  let maxFiles = DEFAULT_MAX_FILES;
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--max-files") {
      const parsed = Number(argv[index + 1]);
      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error("--max-files must be a positive integer");
      }
      maxFiles = parsed;
      index += 1;
    } else if (!root) {
      root = value;
    } else {
      throw new Error(`Unexpected argument: ${value}`);
    }
  }
  if (!root) throw new Error(usage());
  return { root: path.resolve(root), maxFiles };
}

function shouldIgnoreFile(name) {
  const lower = name.toLowerCase();
  return IGNORED_FILE_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

async function walk(root, maxFiles) {
  const sourceFiles = [];
  const manifests = [];
  const queue = [root];

  while (queue.length > 0) {
    const directory = queue.shift();
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) queue.push(absolute);
        continue;
      }
      if (!entry.isFile() || shouldIgnoreFile(entry.name)) continue;
      if (entry.name === "package.json") manifests.push(absolute);
      if (!SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;

      const metadata = await stat(absolute);
      if (metadata.size <= MAX_FILE_BYTES) sourceFiles.push(absolute);
      if (sourceFiles.length > maxFiles) {
        throw new Error(`Source file limit exceeded (${maxFiles}). Narrow the target repository or raise --max-files.`);
      }
    }
  }

  return { sourceFiles, manifests };
}

async function detectFrameworks(root, manifests) {
  const packages = [];
  const frameworks = new Set();

  for (const manifestPath of manifests) {
    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      const dependencies = {
        ...(manifest.dependencies || {}),
        ...(manifest.devDependencies || {}),
      };
      const detected = [];
      for (const [packageName, framework] of FRAMEWORK_PACKAGES) {
        if (packageName in dependencies) {
          frameworks.add(framework);
          detected.push(framework);
        }
      }
      if (detected.length > 0) {
        packages.push({
          path: path.relative(root, manifestPath) || "package.json",
          frameworks: [...new Set(detected)].sort(),
        });
      }
    } catch {
      // A malformed or generated package manifest is not a reason to abort the source scan.
    }
  }

  return { frameworks: [...frameworks].sort(), packages };
}

function pathSignals(relativePath) {
  const normalized = relativePath.split(path.sep).join("/");
  const signals = [];
  if (/(^|\/)app\/(?:.*\/)?(?:page|layout|route)\.[cm]?[jt]sx?$/.test(normalized)) signals.push("framework-route");
  if (/(^|\/)pages\/(?:api\/)?/.test(normalized)) signals.push("framework-route");
  if (/(^|\/)(?:routes?|router)\//.test(normalized)) signals.push("framework-route");
  if (/(?:schema|validator|validation)\.[cm]?[jt]s$/.test(normalized)) signals.push("schema");
  return signals;
}

async function scanSources(root, sourceFiles) {
  const findings = [];
  const counts = {};

  for (const absolute of sourceFiles) {
    const relative = path.relative(root, absolute);
    for (const kind of pathSignals(relative)) {
      findings.push({ kind, file: relative, line: null, source: "path" });
      counts[kind] = (counts[kind] || 0) + 1;
    }

    const lines = (await readFile(absolute, "utf8")).split(/\r?\n/);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      for (const signal of SIGNALS) {
        if (signal.patterns.some((pattern) => pattern.test(line))) {
          findings.push({
            kind: signal.kind,
            file: relative,
            line: lineIndex + 1,
            source: "content",
          });
          counts[signal.kind] = (counts[signal.kind] || 0) + 1;
        }
      }
    }
  }

  findings.sort((left, right) =>
    left.file.localeCompare(right.file) ||
    (left.line ?? 0) - (right.line ?? 0) ||
    left.kind.localeCompare(right.kind),
  );
  return { findings, counts };
}

export async function scanCodebase(root, { maxFiles = DEFAULT_MAX_FILES } = {}) {
  const resolvedRoot = path.resolve(root);
  const rootMetadata = await stat(resolvedRoot);
  if (!rootMetadata.isDirectory()) throw new Error(`Not a directory: ${resolvedRoot}`);

  const { sourceFiles, manifests } = await walk(resolvedRoot, maxFiles);
  const frameworkInfo = await detectFrameworks(resolvedRoot, manifests);
  const sourceInfo = await scanSources(resolvedRoot, sourceFiles);

  return {
    root: resolvedRoot,
    scannedSourceFiles: sourceFiles.length,
    packageManifests: manifests.length,
    ...frameworkInfo,
    counts: sourceInfo.counts,
    findings: sourceInfo.findings,
    note: "Findings are leads only. Trace handlers, validation, authorization, side effects, and returned state before exposing a capability.",
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await scanCodebase(args.root, { maxFiles: args.maxFiles });
  console.log(JSON.stringify(result, null, 2));
}

// Resolve symlinks on both sides: skills are commonly installed as a symlink
// (~/.claude/skills/<name> -> the real directory), and path.resolve alone leaves
// the link intact, so the two paths never match and the scanner exits silently.
const resolveReal = (value) => {
  try {
    return realpathSync(value);
  } catch {
    return value;
  }
};

const invokedPath = process.argv[1] ? resolveReal(path.resolve(process.argv[1])) : "";
if (invokedPath === resolveReal(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
