const fs = require("fs");
const path = require("path");

function findProjectRoot(startDir = __dirname) {
  let current = path.resolve(startDir);

  while (true) {
    if (
      fs.existsSync(path.join(current, "package.json")) &&
      fs.existsSync(path.join(current, "README.md"))
    ) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Could not locate project root from ${startDir}`);
    }
    current = parent;
  }
}

module.exports = {
  findProjectRoot,
};
