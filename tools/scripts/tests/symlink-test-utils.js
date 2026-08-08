const fs = require("fs");

function isSymlinkPrivilegeError(error) {
  return (
    error &&
    (error.code === "EPERM" ||
      error.code === "EACCES" ||
      error.errno === -4048 ||
      /privilege|WinError 1314/i.test(String(error.message || "")))
  );
}

function createSymlinkOrSkip(target, linkPath, type) {
  try {
    fs.symlinkSync(target, linkPath, type);
    return true;
  } catch (error) {
    if (process.platform === "win32" && isSymlinkPrivilegeError(error)) {
      console.warn(`[tests] Skipping symlink assertion; Windows denied symlink creation: ${linkPath}`);
      return false;
    }
    throw error;
  }
}

module.exports = {
  createSymlinkOrSkip,
  isSymlinkPrivilegeError,
};
