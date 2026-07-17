import fs from "node:fs";
import path from "node:path";
import { digestJson, sha256 } from "./canonical.mjs";

function normalizeMode(mode) {
  return mode & 0o7777;
}

export function snapshotTree(root) {
  const entries = [];
  if (!fs.existsSync(root)) return { entries, digest: digestJson(entries) };
  const walk = (directory) => {
    for (const name of fs.readdirSync(directory).sort()) {
      const absolute = path.join(directory, name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      const stat = fs.lstatSync(absolute, { bigint: true });
      const common = {
        path: relative,
        mode: normalizeMode(Number(stat.mode)),
        size: Number(stat.size),
      };
      if (stat.isSymbolicLink()) {
        entries.push({ ...common, type: "symlink", target: fs.readlinkSync(absolute) });
      } else if (stat.isDirectory()) {
        entries.push({ ...common, type: "directory" });
        walk(absolute);
      } else if (stat.isFile()) {
        entries.push({ ...common, type: "file", sha256: sha256(fs.readFileSync(absolute)) });
      } else {
        entries.push({ ...common, type: "special" });
      }
    }
  };
  walk(root);
  return { entries, digest: digestJson(entries) };
}

export function snapshotZones(zones) {
  return Object.fromEntries(Object.entries(zones).map(([name, root]) => [name, snapshotTree(root)]));
}

export function assertNoZoneDrift(before, after) {
  const changed = Object.keys(before).filter((name) => before[name]?.digest !== after[name]?.digest);
  if (changed.length) {
    const error = new Error(`Observed persistent filesystem drift in: ${changed.join(", ")}`);
    error.code = "AAS_VERIFIER_PERSISTENT_WRITE";
    error.changedZones = changed;
    throw error;
  }
}
