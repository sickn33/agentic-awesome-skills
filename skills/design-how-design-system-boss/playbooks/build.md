# Build

1. Triage: system installed or not, raw values in occurrences (`design-how-build-design-system/scripts/check-system.mjs --no-allowlist --no-self-test --json`, counted by rule), duplicate families, surface count. A small app (8 surfaces or fewer) gets one worker and no window.
2. Frame the complaint in the person's words, pick the pilot flow, accept the taste file.
3. Run `design-how-build-design-system` steps 1 to 6 with one writing step at a time. Judge each return from `git diff`, never from its message.
4. Run the readiness audits. Open rows go in the report, and the playbook ends check-first.
5. Triage again with the same command and report both sets of numbers in the same units.
6. Offer the migration with its size. Do not start it.

Done when the check exits 0 on a clean clone, the pilot matches its baseline except for listed changes, and the report has the before and after numbers.
