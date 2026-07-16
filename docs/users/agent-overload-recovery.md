# Antigravity Recovery for Context Overload and Truncation

Use this guide when Antigravity loads too many skills for the current task and starts failing with truncation, context, or trajectory-conversion errors.

Typical symptoms:

- the agent crashes only when a large skills folder is present
- the error mentions truncation, context conversion, or a trajectory/message that cannot be converted
- the problem shows up more often on large repositories or long-running tasks

## Linux and macOS fast path

Use the activation scripts to keep the full library archived while exposing only the bundles or skills you need in the live Antigravity directory.

1. Fully close Antigravity.
2. Clone this repository somewhere local if you do not already have a clone.
3. Run the activation script from the cloned repository.

Examples:

```bash
./scripts/activate-skills.sh "Web Wizard" "Integration & APIs"
./scripts/activate-skills.sh --clear
./scripts/activate-skills.sh brainstorming systematic-debugging
```

What the script does:

- syncs the repository `skills/` tree into `~/.agents/skills_library`
- preserves your full library in the backing store
- activates only the requested bundles or skill ids into `~/.agents/skills`
- `--clear` archives the current live directory first, then restores the selected set

Optional environment overrides:

```bash
AG_BASE_DIR=/custom/antigravity ./scripts/activate-skills.sh --clear Essentials
AG_REPO_SKILLS_DIR=/path/to/repo/skills ./scripts/activate-skills.sh brainstorming
```

## Windows recovery

If Antigravity is stuck in a restart loop on Windows, use the Windows-specific recovery guide instead:

- [windows-truncation-recovery.md](windows-truncation-recovery.md)

That guide covers the browser/app storage cleanup needed when the host keeps reopening the same broken session.

## Prevention tips

- start with 3-5 skills from a bundle instead of exposing the full library at once
- use bundle activation before opening very large repositories
- keep role-specific stacks active and archive the rest
- if a host stores broken session state, clear that host state before restoring a smaller active set
