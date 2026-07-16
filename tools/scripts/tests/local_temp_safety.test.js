const assert = require("assert");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../..", "..");

const compactScript = fs.readFileSync(
  path.join(repoRoot, "skills", "cc-skill-strategic-compact", "suggest-compact.sh"),
  "utf8",
);
const wsListener = fs.readFileSync(
  path.join(repoRoot, "skills", "videodb", "scripts", "ws_listener.py"),
  "utf8",
);
const notarizeTemplate = fs.readFileSync(
  path.join(repoRoot, "skills", "macos-spm-app-packaging", "assets", "templates", "sign-and-notarize.sh"),
  "utf8",
);
const devSigningTemplate = fs.readFileSync(
  path.join(repoRoot, "skills", "macos-spm-app-packaging", "assets", "templates", "setup_dev_signing.sh"),
  "utf8",
);
const ggufConverter = fs.readFileSync(
  path.join(repoRoot, "skills", "hugging-face-model-trainer", "scripts", "convert_to_gguf.py"),
  "utf8",
);
const lokiAutonomy = fs.readFileSync(
  path.join(repoRoot, "skills", "loki-mode", "autonomy", "run.sh"),
  "utf8",
);

assert.match(compactScript, /XDG_STATE_HOME/, "strategic compact counter should use a user-owned state directory");
assert.doesNotMatch(compactScript, /\/tmp\/claude-tool-count/, "strategic compact counter must not use predictable /tmp files");
assert.match(wsListener, /XDG_STATE_HOME/, "videodb listener should default to a user-owned state directory");
assert.doesNotMatch(wsListener, /VIDEODB_EVENTS_DIR", "\/tmp"/, "videodb listener must not default to /tmp");
assert.match(notarizeTemplate, /mktemp -d/, "notarization key should use a private temp directory");
assert.doesNotMatch(notarizeTemplate, /\/tmp\/app-store-connect-key\.p8/, "notarization key must not use a predictable /tmp path");
assert.match(devSigningTemplate, /mktemp -d/, "dev signing material should use a private temp directory");
assert.doesNotMatch(devSigningTemplate, /\/tmp\/dev\.(?:key|crt|p12)/, "dev signing material must not use predictable /tmp paths");
assert.match(ggufConverter, /TRUST_REMOTE_CODE/, "GGUF converter should require an explicit remote-code opt-in");
assert.doesNotMatch(ggufConverter, /trust_remote_code=True/, "GGUF converter must not trust remote code by default");
assert.match(lokiAutonomy, /function escapeHtml/, "Loki dashboard should escape JSON-derived HTML");
assert.doesNotMatch(lokiAutonomy, /\$\{task\.lastError\}/, "Loki dashboard must not interpolate task errors as raw HTML");
