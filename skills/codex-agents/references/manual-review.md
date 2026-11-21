# Running a Codex review by hand

Open this reference before falling back to a raw Codex review. The `independent-review` skill supplies the wrapper, review brief and stopping rule. If the wrapper is unavailable, use the project's review prompt and put the exact diff and commit log in a subject file named by the prompt.

**Apply `independent-review` for round scope, brief, triage and stopping.** With Codex installed, the wrapper runs this command by default. `--reviewer codex` forces it. On Windows, pass `--windows-sandbox elevated|unelevated` to override its mode; absent that flag, it reads config (observed `2026-11-16`, Codex CLI 0.169.0). It passes `--effort` (`xhigh` by default). Pass the confirmed choice as `--model` because the wrapper ignores the configured model. Repository instructions rank reviewers first. When running by hand, get the prompt with `--subject-only`, which writes subject and prompt into the git directory and prints their paths. Use a new session meeting the review bar, never this skill's wrapper and never a resume of the building thread:

```bash
# macOS and Linux
codex exec --json --ephemeral --ignore-user-config --ignore-rules -s read-only \
     --disable apps --disable plugins --disable tool_suggest --disable image_generation \
     --disable memories --disable hooks -c web_search=disabled \
     -m <confirmed-model> -c model_reasoning_effort=<confirmed effort> -C <repo> \
     -o "$S/review-NNN.md" - < "<prompt file>" > "$S/review-NNN.jsonl" 2> "$S/review-NNN.err"
# Windows: the same, plus the sandbox mode under [windows] in ~/.codex/config.toml (elevated or unelevated)
codex exec --json --ephemeral --ignore-user-config --ignore-rules -s read-only \
     --disable apps --disable plugins --disable tool_suggest --disable image_generation \
     --disable memories --disable hooks -c web_search=disabled -c 'windows.sandbox="<that mode>"' \
     -m <confirmed-model> -c model_reasoning_effort=<confirmed effort> -C <repo> \
     -o "$S/review-NNN.md" - < "<prompt file>" > "$S/review-NNN.jsonl" 2> "$S/review-NNN.err"
```

**Check report length and successful reads before accepting a review round.** For a manual run, check the report and events:

```bash
python -c "import sys; print(len(open(sys.argv[1], encoding='utf-8').read().strip()))" "$S/review-NNN.md"
grep -c '"type":"command_execution".*"exit_code":0,"status":"completed"' "$S/review-NNN.jsonl"
grep -E '"type":"(mcp_tool_call|web_search|file_change)"' "$S/review-NNN.jsonl"
```

Zero successful commands fails at any length. A report under 1,500 characters fails unless you accept it by hand: the events show successful commands that printed the subject's or a changed file's content, and the report names what it read. Opening, listing and searching files are reads; a refused write is the read-only sandbox doing its job. The events show command status and exit codes; inspect failed commands to distinguish refused writes or searches without matches from unread review files. The third check fails a manual round on any match, with two exceptions. One is `list_mcp_resources` or `list_mcp_resource_templates` on server `codex`. The other is a `file_change` whose status is not `completed`: a refused edit. The wrapper warns on failed MCP calls; a server reached the session, and the next call might not be refused. Keep the events with the report, never committed; `--json` with `-o` works on Codex CLI 0.166.0 (observed `2026-11-14`). Windows sandbox modes were compared with Codex CLI 0.169.0 on `2026-11-16`: elevated timed out after 60 minutes with zero commands; unelevated completed in about 15 minutes. The isolation tool-count measurement above was on macOS.

- **Read the prompt from the file the wrapper wrote through stdin.** Use `- < "<prompt file>"`, never `< /dev/null`: stdin here is the prompt. An empty or missing prompt file means the round never started.
- **Use the manual check as the round's gate.** For a manual run, apply the length and evidence checks above. Fail a round that could not read or matches an outside-tool check.
- **Start with `--ephemeral` so the review saves no session.** A new `codex exec` starts without an earlier conversation.
- **Exclude user config and execpolicy rules from the review session.** `--ignore-user-config` omits `~/.codex/config.toml`, including its MCP servers and project trust. The sandbox covers only shell commands the model runs; `-s read-only` does not bind those added tools (Codex CLI 0.159.0, observed 2026-10-29). Ignoring user config does not remove connected apps, plugins or web search. The `--disable` flags and `-c web_search=disabled` remove them (Codex CLI 0.166.0, macOS, observed `2026-11-14`: 546 tools before, 22 after). The hooks feature is disabled by flag; its absence was not measured. Ignoring user config also omits the model and, on Windows, the sandbox mode without which every read is refused. Put both back on the command line. The review wrapper takes `--model`; `--windows-sandbox` explicitly supplies the Windows mode. Without that override, it restores config's mode or stops when none can be read (observed `2026-11-16`, Codex CLI 0.169.0). Observed on Codex CLI 0.166.0, Windows 11, 2026-11-02: with model and mode specified, a session read a file and was refused a write. Without the mode, both were refused as "blocked by policy", yet the session still answered in full sentences. `--ignore-rules` skips execpolicy rule files.
- **Name the instruction files still loaded in the round's report.** These flags were not shown to disable Codex's instruction files: the repository's `AGENTS.md` and the one in `CODEX_HOME`. Bundled skills and agent-spawning tools remain, plus whatever administrator system, managed or cloud configuration adds; those administrator layers were not observable here. A spawn failed in an ephemeral session (Codex CLI 0.166.0, observed `2026-11-14`); that does not guarantee it always fails. On managed machines, configuration can add tools, MCP servers or hooks the flags cannot remove; the wrapper names files it finds and fails outside-tool rounds. POSIX paths are `/etc/codex/config.toml`, `/etc/codex/managed_config.toml` and `/etc/codex/requirements.toml`; macOS also has `/Library/Managed Preferences/com.openai.codex.plist` and `/Library/Managed Preferences/<user>/com.openai.codex.plist`. Windows paths are `%ProgramData%\OpenAI\Codex\requirements.toml` and `managed_config.toml` under the Codex home. Managed-configuration documentation names managed paths and cloud configuration, and says managed layers override command-line `--config` (read on `2026-11-14`).
- **Treat a short answer as failed and delete the temporary review files.** It is a clean round only when the events show it read the subject (above). Delete subject and prompt files when the round ends, as `independent-review` requires.
