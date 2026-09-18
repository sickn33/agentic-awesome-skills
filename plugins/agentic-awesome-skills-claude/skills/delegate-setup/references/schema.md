# Fleet schema (`delegate-fleet.v1`)

One concept: **lanes**. A lane names an implementer and optional dials.

## Document

```json
{
  "version": "delegate-fleet.v1",
  "lanes": {
    "feature": {
      "implementer": "opencode",
      "model": "opencode/grok",
      "variant": "high"
    },
    "tests": {
      "implementer": "grok",
      "effort": "medium"
    },
    "complex": {
      "implementer": "claude",
      "effort": "high"
    }
  }
}
```

- `version` must be `delegate-fleet.v1`.
- `lanes` is an object keyed by lane name (`[A-Za-z0-9][A-Za-z0-9._-]*`).
- Every lane **requires** `implementer` (a key from the registry below).
- Other fields are dials; only dials listed for that implementer are allowed.

## Paths

| Scope | Path |
| --- | --- |
| Global | `$XDG_CONFIG_HOME/delegate-skills/config.json` when `XDG_CONFIG_HOME` is set; otherwise `~/.config/delegate-skills/config.json` (`os.homedir()` → `HOME` / `USERPROFILE`) |
| Project | `<git-root>/.delegate/config.json` |

Project overlays global by **whole-lane replace** (same lane name in project fully replaces the global lane).
Relays apply a project lane only when its exact config content matches the approval hash written under
that worktree's Git metadata by an explicitly approved `config.mjs write --scope project`. Cloned or
later-edited project config fails closed until it is reviewed and written again through `delegate-setup`.

## Implementer keys and dials

| Key | Skill | Binary | Supported dials |
| --- | --- | --- | --- |
| `claude` | claude-delegate | `claude` | model, effort, timeout, readOnly |
| `cline` | cline-delegate | `cline` | provider, model, timeout |
| `codex` | codex-delegate | `codex` | model, effort, sandbox, timeout, readOnly |
| `commandcode` | commandcode-delegate | `cmd` | model, effort, timeout, readOnly |
| `opencode` | opencode-delegate | `opencode` | model, **variant**, timeout, readOnly |
| `agy` | agy-delegate | `agy` | model, effort, timeout, readOnly |
| `grok` | grok-delegate | `grok` | model, effort, sandbox, timeout, readOnly |
| `kimi` | kimi-delegate | `kimi` | model, timeout |
| `qoder` | qoder-delegate | `qodercli` | model, permissionMode, timeout, readOnly |
| `vibe` | vibe-delegate | `vibe` | timeout, readOnly |
| `cursor` | cursor-delegate | `cursor-agent` | model, force, timeout, readOnly |
| `pi` | pi-delegate | `pi` | provider, model, timeout, readOnly |
| `omp` | omp-delegate | `omp` | provider, model, **effort** (`--thinking`), timeout, readOnly |
| `aider` | aider-delegate | `aider` | model, timeout, readOnly |
| `copilot` | copilot-delegate | `copilot` | model, effort, timeout, readOnly |
| `warp` | warp-delegate | `oz` | model, timeout |
| `zcode` | zcode-delegate | `zcode` | permissionMode, timeout, readOnly |

ZCode carries its `--mode` as `permissionMode`, and only `plan` and `yolo` are accepted: ZCode also
documents `build` and `edit`, but a headless run has no permission client, so those two block every
write tool and exit 0 having changed nothing. ZCode has no `--model` flag — the model is chosen in
the CLI's own config file — so `model` is not a dial for `zcode` lanes. ZCode also ships its CLI
inside the desktop app rather than on PATH, so discovery falls back to the installed app bundle.

OpenCode uses `variant` for reasoning intensity, not `effort`. Do not write `effort` on an `opencode` lane.
Oh My Pi (`omp`) uses the lane `effort` dial for omp's `--thinking` (`off`, `auto`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`). Do not write `thinking` as a lane field.
OpenCode lanes **require** `model` in `provider/model` form, with a non-empty provider before the first
`/` and at least one non-`/` character after it. Cline accepts `provider` and `model` as separate
dials and does not impose that shape.

Boolean dials: `readOnly`, `force`. All other dials are non-empty strings. Duration strings for
`timeout` use `h`/`m`/`s` (e.g. `30m`) and must fit the relay watchdog ceiling (~24.8 days).
Do not combine `readOnly: true` with a write-capable `sandbox` / `permissionMode` / `force`.
`model` / `provider` / OpenCode `variant` must match the bound relay’s token rules (e.g. Claude
rejects spaces; Grok/Pi/Oh My Pi/OpenCode/Codex/Command Code use a shell-safe token set — Windows `shell:true`
launches, and Oh My Pi's flag-injection defense even without a shell).

## Helpers

```bash
node <skill-dir>/scripts/discover.mjs
node <skill-dir>/scripts/config.mjs load [--cwd <dir>]
node <skill-dir>/scripts/config.mjs validate <file>
node <skill-dir>/scripts/config.mjs write --scope global|project [--cwd <dir>] <file>
node <skill-dir>/scripts/lane.mjs resolve --cwd <dir> --lane <name> --implementer <key>
```

`load` prints the **effective** map (each lane includes a `source` of `global` or `project`) and
`projectTrusted`, which reports whether the current project content matches its local approval hash.
`lane.mjs resolve` is what `*-delegate` relays call for `--lane`: it fails loud on a missing
lane, untrusted project config, or implementer mismatch, and prints relay-native dials
(e.g. grok `sandbox` → `autonomy`).
