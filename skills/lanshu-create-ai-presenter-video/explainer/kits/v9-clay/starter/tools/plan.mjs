// node tools/plan.mjs → JSON on stdout: the times the starter's sound bed needs, read from lib/story.js the same way the
// picture reads them (chapters → plots, lines → rows, Kit.keyPhrase → the clay type tiles). Runs core + kit in a vm.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ctx = {};
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ["lib/core.js", "lib/story.js", "lib/kit/kit.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
const story = new ctx.ExplainerCore.Story(ctx.STORY);
const DUR = story.duration;
const END = story.end ? story.line(story.end.line) : null;
const RECAP = story.recap && story.recap.points && story.recap.points.length ? story.recap : null;
const CHS = story.chapters.length ? story.chapters : [{ n: 1, start: 0, end: DUR }];
const LINES = story.lines.filter((L) => !END || L.i !== END.i);
const by = CHS.map(() => []);
LINES.forEach((L) => {
  let k = 0;
  CHS.forEach((c, n) => { if (L.start >= c.start - 0.05) k = n; });
  by[k].push(L);
});
const out = {
  duration: DUR,
  draft: !!story.data.draft,
  chapters: CHS.map((c, k) => ({ n: c.n, start: c.start, end: c.end, lines: by[k].map((L) => L.i) })),
  lines: LINES.map((L) => ({ i: L.i, start: L.start, end: L.end, tiles: ctx.Kit.keyPhrase(story, L.i).map((k) => L.words[k][1]) })),
  end: END ? { start: END.start, end: END.end, words: END.words.map((w) => w[1]) } : null,
  recap: RECAP ? { start: RECAP.start, end: RECAP.end, points: RECAP.points.length } : null,
};
process.stdout.write(JSON.stringify(out));
