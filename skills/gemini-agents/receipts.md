# gemini-agents: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## Keep product decisions, operational changes and final judgement with you.

- `2026-11-14`, the owner allowed builder-run development suites while retaining operational changes and final verification. This does not establish that this CLI can run every suite; a tool or platform blocker still names the check handed back to the session agent.

## Google does not support another agent driving `agy` on a consumer plan.

- `2026-10-07`: a developer-forum answer said another agent could use a consumer-signed-in Antigravity CLI.
- `2026-10-16`: a reply in Google's voice on its developer forum said the FAQ superseded that earlier yes. It named Free, Google AI Plus, Pro and Ultra, including the unmodified binary run as a Claude Code or Codex subprocess.
- Google's FAQ, read on `2026-11-13`, describes headless `-p` as intended for direct scripts and CI. It says use inside a third-party coding agent is unsupported on consumer plans. A neighbouring answer says third-party access through an Antigravity sign-in breaks the terms and can lead to suspension. It recommends Gemini Enterprise or a Google AI Studio API key.

## The owner chooses the sign-in, and the agent never chooses it for them.

- `2026-11-14`: the owner chose to test the official CLI on a paid consumer sign-in of their own, knowing Google's stated support status. The owner asked for the skill to exist with that status stated plainly, and for no workflow in the collection to recommend Gemini. The choice was one person's, about one account; it settles nothing for a reader.

## An empty answer or a denied permission means the turn failed.

- `2026-11-14`, CLI 1.5.8, macOS: a command needing approval was auto-denied headless. The turn ended with an empty response, `denied_actions`, `status: SUCCESS` and exit 0. Stderr began `jetski: no output produced`. A deny-rule refusal instead appeared as a tool error and the agent continued to answer. A sandbox bypass request and an outside file-tool write also ended empty; exit 0 proved no work.

## A linked worktree's external git directory is outside the sandbox.

- `2026-11-14`, CLI 1.5.8, macOS: git could not read history inside a linked worktree because its git directory lived outside the workspace. The same commands worked in a self-contained clone. The reviewer therefore needs a clone rather than another linked worktree.

## Treat web search as available even when every guessed deny fails.

- `2026-11-14`, CLI 1.5.8, macOS: file writes and commands failed against configured deny rules, but `search_web` ran. None of the action names tried denied it. A consult counts it; a review fails when it occurs.

## Do not substitute CLI permission modes for the wrapper's boundaries.

- `2026-11-14`, CLI 1.5.8, macOS: `--mode auto` said it was unavailable for the account and continued in default mode. `accept-edits` allowed an edit, then auto-denied a command and ended the turn empty. Plan mode wrote a plan in the user's configuration directory and asked for confirmation; it did not provide a write barrier.

## Use the sandbox with default permissions and never request a bypass.

- `2026-11-14`, CLI 1.5.8, macOS: a shell write inside the workspace landed; an outside write failed with `operation not permitted`. Shell network access could not resolve a host, and home listing was refused. The failed command invited `BypassSandbox`; that request needed permission and ended the headless turn empty.

## Report the instructions that still load and cannot be switched off.

- `2026-11-14`, CLI 1.5.8, macOS: headless runs loaded workspace instructions, user rules and five built-in skills. `--disable-slash-commands` did not remove them. The registry still advertised 60 tools after deny rules were applied, including subagent tools, so registry membership did not establish a usable permission.

## Get the user's clear agreement before driving Gemini through this CLI.

- `2026-11-14`: the first build made this a skill only the user could start, so nobody would be offered Gemini unasked. The owner replaced that the same day with automatic loading and an informed, clear yes before a run, or an explicit standing preference. Naming Gemini before hearing the support status does not supply that agreement. The agent keeps any standing preference outside the skill and wrapper; no consent flag or state was requested.

## Pass copies of external briefs and attachments in a dedicated folder.

- `2026-11-14`, CLI 1.5.8, macOS: the reviewer's shell created a file in the real brief's folder because the wrapper added that folder. Nothing reported the write. Adding an input's parent exposed unrelated files to shell writes. The revised handoff gives the partner prepared copies, with persistent earlier turns for a resumed consult or build and disposable inputs beside a review clone.

## Resolve relative paths in the work directory, never the brief's folder.

- `2026-11-14`, CLI 1.5.8, macOS: the peer resolved a repository-relative path against the external brief's directory and got file-not-found. The pointer must name the work directory explicitly, or the snapshot for a review.

## Probe protected paths without treating writable temporary folders as failures.

- `2026-11-14`, CLI 1.5.8, macOS: the original probe put its outside canary in a temporary folder. The sandbox allowed that write, so a healthy install returned `review outside shell deny: NOT HELD` and exit 1. A protected canary under the wrapper's state root tests the refusal the live run established; temporary writes are reported separately as information.

## Never answer a denial with an allow rule or skipped permissions.

- `2026-11-14`, CLI 1.5.8, macOS: after an automatic denial, the CLI advised an allow rule or `--dangerously-skip-permissions`. The wrapper relayed that advice without its own instruction. Either suggestion removes the boundary the caller chose; the caller must avoid the action in its brief or perform it itself.

## Count tool errors without calling each one a permission refusal.

- `2026-11-14`, CLI 1.5.8, macOS: both a missing file and a protected-path read incremented `refused=`. The counter measured tool calls ending in `ERROR`, not permission refusals. `tool_errors=` preserves that evidence without claiming every failure proved a permission boundary. Unknown-model and denial text also printed twice when result and stderr repeated it; diagnostics must keep the useful text once.

## Give the peer a file list before asking it to explore.

- `2026-11-14`, CLI 1.5.8, macOS: the peer had no listing, grep or glob tool of its own and read the CLI's built-in skill files unasked. A work-directory file list provides names without granting a shell. A non-git directory needs an explicit skip notice and filenames from the caller.

## Keep the peer inside the work directory and explicitly named folders.

- `2026-11-14`, CLI 1.5.8, macOS: re-reading an earlier turn's external brief needed permission when the wrapper added only the current brief's temporary folder. The permission could not be asked headless and ended the turn. A stable handoff folder keeps earlier prepared inputs available across resumes; the standing sentence names the allowed read locations.

## The sandbox permits workspace, temporary, cache and added-folder writes.

- `2026-11-14`, CLI 1.5.8, macOS: a build script tried each location once. Shell writes landed in the workspace, system temporary folders, the user's cache directory and an added folder. Writes to the workspace's `.git`, home, `~/.gemini`, a sibling repository and a home dotfile were refused. Home, Desktop, SSH and sibling listings were refused; added, system-binary and temporary listings worked. Reads of hosts, git configuration and an added file worked; shell configuration, CLI settings and a sibling file were refused. HTTPS curl exited 6; a numeric HTTP destination exited 7. A self-contained clone's git history remained readable. The earlier claim that the reviewer could write inside its clone “and nowhere else” was false.

## Leave sandboxed build changes unstaged for the session agent to commit.

- `2026-11-14`, CLI 1.5.8, macOS: `git add -A && git commit` exited 128 because the sandbox refused creation of the workspace's `.git/index.lock`. Staging failed before a commit could begin. The builder must leave its diff in the working tree for the session agent to inspect and commit.

## Attach external review inputs before asking the snapshot to read them.

- `2026-11-14`, CLI 1.5.8, macOS: the review helper wrote prompt and subject files into the source git directory. Passing the prompt made that original directory writable through `--add-dir`. Its absolute checkout reference also sent reads into the real repository, which the sandbox refused; an outside file-tool read needed permission and ended the turn. The corrected flow copies the subject through `--attach`, rewrites references to the copy and snapshot, and stops before a model starts when a named snapshot file is absent.
- `2026-11-14`: a review round found that a brief naming the repository inside a quoted command stopped the run before a model started. The rest of the quoted span was read as part of a filename. Validation must try both the whole quoted filename and the path named inside a command.

## Require successful subject reads even when the partner answers confidently.

- `2026-11-14`: a review round found that reading only its brief, named by a relative path, let a review return 0. `git --version` counted as a read too. The gate needs a file-tool read placed inside the snapshot or at a current attachment copy. Recorded subject roots and attachment paths keep that evidence checkable after the snapshot is deleted.
- `2026-11-14`, CLI 1.5.8, macOS: a reviewer ran a 29-second test command, then used `manage_task` with `Action: status` to retrieve its status and log. The wrapper rejected the sound 17-minute review as an unknown-tool run and withheld its answer. Command-status retrieval needs the command boundary; a failed subagent or workflow attempt does not prove the deny rules held.
- `2026-11-14`: the next review round found that the Git exception misjudged subject reading twice. `git diff` of two outside files passed without a subject read. No recorded step established a command's working directory, so the gate could accept another repository or reject a snapshot subdirectory. The exception was removed rather than patched; only placed file-tool reads count for review recordings with subject metadata.

## A repository's hooks and plugins run outside the sandbox and the deny rules.

- `2026-11-14`, CLI 1.5.8, macOS: a scratch repository's `.agents/hooks.json` held `SessionStart` and `PreInvocation` command hooks. Consult wrote four lines each to a home file and a file beside `hooks.json`. It returned 2 only because Git status changed, without naming the hooks or the home write. Build with `--sandbox` wrote the home file and returned 0. A fresh review clone containing the committed hooks also wrote the home file and returned 0. Its change list named only the workspace file. The CLI started the hooks itself, outside the tool events, sandbox and deny rules.
- Bundled `agy-customizations` docs, read on `2026-11-14`, CLI 1.5.8, named four workspace roots and the user root `~/.gemini/config/`. They described command hooks, plugin hooks, stdio MCP startup and plugin registrations through `plugins.json`. Only a root's own command hooks were run; plugin hooks, plugin MCP startup under `mcp(*)` and registration paths remain unestablished. The detector therefore refuses known workspace entries by presence, while naming user-level entries without refusing them.
