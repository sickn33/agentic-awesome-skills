---
name: agy-powerline
description: "Install, check and restyle the agy-powerline statusline for Antigravity CLI (agy): quotas, model, context window and git on agy's status bar."
category: developer-tools
risk: critical
source: "https://github.com/wassim-azi/agy-powerline"
source_repo: "wassim-azi/agy-powerline"
source_type: official
date_added: "2026-10-20"
license: "MIT"
license_source: "https://github.com/wassim-azi/agy-powerline/blob/main/LICENSE"
author: wassim-azi
tags: [antigravity, agy, statusline, terminal, quota, cli]
tools: [antigravity]
---

# agy-powerline

## Overview

agy-powerline is a statusline for Antigravity CLI (`agy`). agy runs it on every refresh and pipes the session to it as JSON; it prints a bar with the model, the Gemini 5h and 7d quotas, the Claude/GPT and Gemini 4 Argon quotas with their reset times, the context window, git branch and changes, tokens, subagents and more. This skill installs it, checks it, and changes its look with the package's own commands. Adapted from the setup and customize skills of the official agy plugin: https://github.com/wassim-azi/agy-powerline

## When to Use This Skill

- Use when the user asks to install, set up, update or fix a statusline (status bar) for agy or Antigravity CLI.
- Use when the user wants to see their agy quotas, reset times or context window without typing `/usage`.
- Use when agy-powerline is installed and the user asks to change its theme, widgets, layout or colors, or to back up its config.
- Do not use for other agents' status lines (Claude Code, Gemini CLI): agy-powerline only wires itself into agy's settings.

## How It Works

Run each command with your shell tool, one at a time, and show the user what it printed.

### Step 1: Check Node.js

Run `node -v`. If the version is below v20, stop: tell the user to install Node.js 20 or newer from https://nodejs.org, then ask again.

### Step 2: Install

Tell the user what the next command does before running it: it downloads the `agy-powerline` package from npm, installs the statusline in `~/.agy-powerline`, and sets the `statusLine` key in agy's `~/.gemini/antigravity-cli/settings.json` after backing that file up. Then run:

```bash
npx -y agy-powerline@latest init --yes
```

`--yes` answers the prompts, which a shell tool can't answer. If the user asked for a starting set of widgets, a layout or a theme, add `--preset <id>`, `--layout <id>` or `--theme <id>` (Step 5 lists the ids). To keep agy's built-in status line and draw this bar below it, add `--stack`.

If `init` fails, show its error as printed and stop. Don't work around it, for example by writing the settings yourself.

### Step 3: Check the install

```bash
npx agy-powerline doctor
```

Sum up the result in two or three lines: whether the statusline command ran, and any problem it lists with the fix it suggests.

### Step 4: Restart agy

Tell the user to quit agy and start it again once: the bar appears after that restart. Later style changes show on the next refresh, without a restart.

### Step 5: Change the look (when asked)

List first, then apply, then show the user the preview the command printed:

| The user asks for                              | List                                | Apply                               |
| ---------------------------------------------- | ----------------------------------- | ----------------------------------- |
| Other colors ("make it light", "dark theme")   | `npx agy-powerline theme --list`    | `npx agy-powerline theme <id>`      |
| Other widgets ("one line", "show all quotas")  | `npx agy-powerline preset --list`   | `npx agy-powerline preset <id>`     |
| Plain text instead of Powerline pills          | `npx agy-powerline layout --list`   | `npx agy-powerline layout <id>`     |
| Rounder, sharper or flat pill ends             | `npx agy-powerline caps --list`     | `npx agy-powerline caps <style>`    |
| A gradient across each row                     | `npx agy-powerline gradient --list` | `npx agy-powerline gradient <name>` |
| Back up or share the config                    | `npx agy-powerline export`          | `npx agy-powerline export <file>`   |

Presets: `default`, `compact`, `agent`, `git`, `tokens`, `quotas`, `full`. Layouts: `pills`, `lines`, `classic`. `theme` also takes `dark`, `light` and `colorblind`; `gradient off` removes a gradient. A preset replaces the widget list and keeps the theme and layout.

For anything these commands don't cover (one widget's color, thresholds), point the user to `npx agy-powerline configure` in their own terminal, or to https://github.com/wassim-azi/agy-powerline/blob/main/docs/configuration.md.

## Examples

### Example 1: Install with every quota on the bar

```bash
node -v
npx -y agy-powerline@latest init --yes --preset quotas
npx agy-powerline doctor
```

Then: "Restart agy once and the bar shows your Gemini, Claude/GPT and Argon quotas with their reset times."

### Example 2: Switch to a light theme and plain-text layout

```bash
npx agy-powerline theme --list
npx agy-powerline theme light
npx agy-powerline layout lines
```

### Example 3: Remove it

```bash
npx agy-powerline uninstall --yes
```

This removes the `statusLine` key from agy's settings, after a backup; the bar goes away after the next restart of agy. Add `--delete` only if the user also wants the files in `~/.agy-powerline` removed.

## Best Practices

- ✅ Run `doctor` after every install or update and report what it found.
- ✅ Tell the user about the one restart of agy that `init` needs.
- ❌ Don't edit `~/.gemini/antigravity-cli/settings.json` by hand: `init` and `uninstall` change only the `statusLine` key and keep a backup.
- ❌ Don't run `npx agy-powerline configure` yourself: it's an interactive full-screen editor and hangs a shell tool. Suggest it to the user instead.

## Common Pitfalls

- **Problem:** The icons show as boxes or question marks.
  **Solution:** The terminal font has no Nerd Font glyphs. The user can install a Nerd Font, or press `i` in `npx agy-powerline configure` for ASCII mode.
- **Problem:** No bar after `init`.
  **Solution:** agy wasn't restarted, or `doctor` lists a problem: run `npx agy-powerline doctor` and follow its fix.
- **Problem:** The Argon quota doesn't show.
  **Solution:** agy sends it only on plans that have it (Google AI Pro). Widgets with nothing to show hide themselves.
- **Problem:** `tokensToday` and `tokensWeek` stay hidden.
  **Solution:** They need Node.js 22.13 or newer; `doctor` says so on older versions.

## Limitations

- Works with Antigravity CLI (`agy`) only, on Windows, macOS, Linux and WSL, with Node.js 20 or newer.
- Shows only what agy sends to the statusline; it can't show a quota or field agy doesn't send.
- `init` needs network access to npm; it can't install offline.
- This skill does not replace the user's own judgment about installing a package from npm or changing agy's settings.

## Security & Safety Notes

- `npx -y agy-powerline@latest init --yes` downloads and runs a package from npm and changes agy's settings file. Say so before running it, and run it only when the user asked for the install or update. The package has no runtime dependencies and is published from CI with npm provenance (https://github.com/wassim-azi/agy-powerline/blob/main/SECURITY.md).
- Once installed, the statusline runs a local copy in `~/.agy-powerline` on every refresh and makes no network calls.
- `init` and `uninstall` change only the `statusLine` key in agy's settings, back the file up first, and refuse a settings file that isn't valid JSON.
- Never pass `--allow-exec` to `npx agy-powerline import`: an imported config with shell-command widgets runs those commands on every refresh. Only the user can approve the exact commands `import` shows.
