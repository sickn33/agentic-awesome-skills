const assert = require("assert");
const path = require("path");

const mergeBatch = require(path.join(__dirname, "..", "merge_batch.cjs"));

function makeCheckRun(name, status, conclusion, startedAt, id) {
  return {
    name,
    status,
    conclusion,
    started_at: startedAt,
    completed_at: startedAt,
    created_at: startedAt,
    id,
  };
}

{
  const parsed = mergeBatch.parsePrList("450, 449  446");
  assert.deepStrictEqual(parsed, [450, 449, 446]);
}

{
  const summary = mergeBatch.extractSummaryBlock(`Summary line 1\nSummary line 2\n\n## Change Classification\n- [ ] Skill PR`);
  assert.strictEqual(summary, "Summary line 1\nSummary line 2");
}

{
  const template = `# Pull Request Description\n\nIntro\n\n## Change Classification\n- [ ] Skill PR\n\n## Quality Bar Checklist ✅\n- [ ] Standards`;
  const body = mergeBatch.normalizePrBody(
    `Short summary\n\n## Change Classification\n- [ ] Old item`,
    template,
  );

  assert.ok(body.startsWith("Short summary"));
  assert.ok(body.includes("## Change Classification"));
  assert.ok(body.includes("## Quality Bar Checklist ✅"));
  assert.ok(!body.includes("Old item"));
}

{
  const aliases = mergeBatch.getRequiredCheckAliases({ hasSkillChanges: true });
  assert.ok(aliases.some((entry) => Array.isArray(entry) && entry.includes("review")));
  assert.ok(aliases.some((entry) => Array.isArray(entry) && entry.includes("pr-policy")));
}

{
  const runs = [
    makeCheckRun("pr-policy", "completed", "failure", "2026-04-01T10:00:00Z", 1),
    makeCheckRun("pr-policy", "completed", "success", "2026-04-01T10:10:00Z", 2),
    makeCheckRun("source-validation", "in_progress", null, "2026-04-01T10:11:00Z", 3),
    makeCheckRun("review", "completed", "success", "2026-04-01T10:12:00Z", 4),
  ];
  const summaries = mergeBatch.summarizeRequiredCheckRuns(runs, [
    ["pr-policy"],
    ["source-validation"],
    ["review", "Skill Review & Optimize"],
  ]);

  assert.deepStrictEqual(
    summaries.map((entry) => entry.state),
    ["success", "pending", "success"],
  );

  const latest = mergeBatch.selectLatestCheckRuns(runs);
  assert.strictEqual(latest.get("pr-policy").conclusion, "success");
}

{
  assert.strictEqual(mergeBatch.isRetryableMergeError(new Error("Base branch was modified")), true);
  assert.strictEqual(mergeBatch.isRetryableMergeError(new Error("Something else")), false);
}

{
  const literalArg = "safe&echo injected";
  const stdout = mergeBatch.runCommand(
    process.execPath,
    ["-e", "process.stdout.write(process.argv[1])", literalArg],
    path.join(__dirname, "..", "..", ".."),
    { capture: true },
  );
  assert.strictEqual(stdout, literalArg);
}

console.log("ok");
