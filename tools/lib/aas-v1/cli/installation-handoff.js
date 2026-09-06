"use strict";

const path = require("node:path");
const sanitizeFilename = require("sanitize-filename");

// Text generation only: the caller owns selection and authorizes installation.
function installationHandoff(manifest, destination, shell = "posix") {
  function invalid(code) {
    const error = new Error(code);
    error.code = code;
    error.category = "invalidInput";
    throw error;
  }
  if (!["posix", "powershell"].includes(shell)) invalid("AAS_CLI_SHELL_INVALID");
  if (typeof destination !== "string" || !destination.trim() || destination.length > 1000
    || /^[~-]/.test(destination) || /[\x00-\x1f\x7f]/.test(destination)) {
    invalid("AAS_CLI_INSTALL_DESTINATION_INVALID");
  }
  if (shell === "powershell" && /["&|<>^%!`$()]/.test(destination)) {
    invalid("AAS_CLI_INSTALL_DESTINATION_INVALID");
  }
  const pathApi = shell === "powershell" ? path.win32 : path;
  const resolved = pathApi.resolve(destination);
  const segments = resolved.slice(pathApi.parse(resolved).root.length).split(pathApi.sep).filter(Boolean);
  if (segments.some((segment) => !sanitizeFilename(segment) || sanitizeFilename(segment) !== segment)) {
    invalid("AAS_CLI_INSTALL_DESTINATION_INVALID");
  }
  const ids = manifest.skills.map((skill) => skill.id);
  if (!ids.length) invalid("AAS_CLI_SELECTION_EMPTY");
  // Keep the command's shell grammar independent of future manifest changes.
  if (ids.some((id) => !/^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/.test(id)
    || id.split("/").some((part) => part === "." || part === ".."))) invalid("AAS_CLI_INSTALL_ID_INVALID");
  const quote = (value) => shell === "powershell"
    ? `'${value.split("'").join("''")}'` : `'${value.split("'").join("'\\''")}'`;
  const version = manifest.catalog.version;
  const executable = shell === "powershell" ? "npm.cmd" : "npm";
  const args = ["exec", "--yes", "--ignore-scripts", `--package=agentic-awesome-skills@${version}`,
    "--", "agentic-awesome-skills", "--release", version, "--path", destination,
    "--skills", ids.join(","), "--dry-run"];
  return {
    executable, args,
    command: `${executable} exec --yes --ignore-scripts --package=agentic-awesome-skills@${version} -- agentic-awesome-skills --release ${version} --path ${quote(destination)} --skills ${quote(ids.join(","))} --dry-run`,
  };
}

module.exports = { installationHandoff };
