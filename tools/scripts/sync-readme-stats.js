const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../");
const README_PATH = path.join(ROOT, "README.md");
const SKILLS_DIR = path.join(ROOT, "skills");

function countSkills(dir) {
  let total = 0;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const skillFile = path.join(fullPath, "SKILL.md");

      if (fs.existsSync(skillFile)) {
        total++;
      }

      total += countSkills(fullPath);
    }
  }

  return total;
}

function formatNumber(n) {
  return n.toLocaleString("en-US");
}

function replaceOrWarn(content, regex, replacement, label) {
  const safeRegex = new RegExp(regex.source, regex.flags.replace("g", ""));

  const hasMatch = safeRegex.test(content);

  if (!hasMatch) {
    console.warn(`⚠️ Pattern not found: ${label}`);
    return content;
  }

  return content.replace(regex, replacement);
}

if (!fs.existsSync(README_PATH)) {
  console.error("README.md not found");
  process.exit(1);
}

if (!fs.existsSync(SKILLS_DIR)) {
  console.error("/skills directory not found");
  process.exit(1);
}

const count = countSkills(SKILLS_DIR);
const formatted = formatNumber(count);

let readme = fs.readFileSync(README_PATH, "utf8");
readme = replaceOrWarn(
  readme,
  /skills=\d+/,
  `skills=${count}`,
  "registry-sync comment"
);

readme = replaceOrWarn(
  readme,
  /(# 🌌 Antigravity Awesome Skills:\s*)[\d,]+\+/,
  `$1${formatted}+`,
  "main title"
);
readme = replaceOrWarn(
  readme,
  /(Installable GitHub library of )[\d,]+\+/,
  `$1${formatted}+`,
  "subtitle"
);
readme = readme.replace(
  /Browse [\d,]+\+ Skills/g,
  `Browse ${formatted}+ Skills`
);
readme = readme.replace(
  /browse all [\d,]+\+ skills/gi,
  `browse all ${formatted}+ skills`
);

readme = readme.replace(
  /([\s:])[\d,]+\+ skills across/g,
  `$1${formatted}+ skills across`
);

readme = readme.replace(
  /\(#browse-\d+-skills\)/g,
  `(#browse-${count}-skills)`
);

readme = readme.replace(
  /## Browse [\d,]+\+ Skills/g,
  `## Browse ${formatted}+ Skills`
);

fs.writeFileSync(README_PATH, readme);

console.log(`✅ README synced successfully`);
console.log(`📦 Skills detected: ${count}`);
console.log(`📝 README updated: README.md`);