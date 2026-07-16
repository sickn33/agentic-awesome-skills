const fs = require("fs");
const path = require("path");

function isPathInside(basePath, candidatePath) {
  const base = fs.existsSync(basePath) ? getRealPath(basePath) : path.resolve(basePath);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(base, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function getRealPath(targetPath) {
  if (typeof fs.realpathSync.native === "function") {
    return fs.realpathSync.native(targetPath);
  }
  return fs.realpathSync(targetPath);
}

function resolveSafeRealPath(rootPath, targetPath) {
  const realPath = getRealPath(targetPath);
  return isPathInside(rootPath, realPath) ? realPath : null;
}

module.exports = {
  getRealPath,
  isPathInside,
  resolveSafeRealPath,
};
