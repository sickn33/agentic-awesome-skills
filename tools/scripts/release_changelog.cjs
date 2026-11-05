"use strict";

const changelogSections = ["New skills", "Improvements", "Security and distribution", "Contributors"];

function validateReleaseChangelog(section, version) {
  const fail = (detail) => {
    throw new Error(`CHANGELOG.md entry for ${version}: ${detail} See the release entry template at the top of CHANGELOG.md.`);
  };
  const [heading, ...body] = section.split(/\r?\n/);
  const expectedHeading = `## [${version}] - `;
  const metadata = /^(\d{4}-\d{2}-\d{2}) - "([^"]+)"$/.exec(heading.slice(expectedHeading.length));
  if (!heading.startsWith(expectedHeading) || !metadata || !metadata[2].trim()) {
    fail('use the heading ## [version] - YYYY-MM-DD - "Release title".');
  }
  const date = new Date(metadata[1]);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== metadata[1]) {
    fail("use a valid release date.");
  }

  const blocks = body.join("\n").trim().split(/^(#{1,6}(?:[ \t]+.*)?)[ \t]*$/m);
  const summary = blocks[0].trim();
  if (!summary || /\n[ \t]*\n|^(?:[-+*>]|\d+[.)])[ \t]/m.test(summary)) {
    fail("start with one short summary paragraph.");
  }
  if (blocks.length === 1) {
    fail("include at least one section.");
  }

  let previous = -1;
  for (let i = 1; i < blocks.length; i += 2) {
    const sectionHeading = blocks[i].trimEnd();
    const index = changelogSections.findIndex((name) => sectionHeading === `### ${name}`);
    if (index === -1) {
      fail(`unexpected heading "${sectionHeading}". Use ${changelogSections.join(", ")}.`);
    }
    if (index <= previous) {
      fail(`"${changelogSections[index]}" is duplicated or out of order.`);
    }
    const entries = blocks[i + 1].replace(/^(?:[ \t]*\n)+/, "").trimEnd();
    if (!/^- [^\s]/.test(entries)) {
      fail(`"${changelogSections[index]}" must start with a bullet entry.`);
    }
    if (entries.split("\n").some((line) => line.trim() && !/^(?:- \S| {2}|\t)/.test(line))) {
      fail(`"${changelogSections[index]}" must contain bullet entries only. Indent any continuation lines.`);
    }
    previous = index;
  }
}

module.exports = { validateReleaseChangelog };
