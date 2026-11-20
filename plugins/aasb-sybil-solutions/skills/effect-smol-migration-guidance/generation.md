# Generated Migration Reference

`migration/v3-to-v4.md` is generated. Check annotations and regenerate using
explicit committed refs containing the change:

```sh
pnpm api-diff --base-ref origin/v3 --head-ref HEAD --check
pnpm api-diff --base-ref origin/v3 --head-ref HEAD --write-doc migration/v3-to-v4.md
```

The API diff reads refs through detached worktrees. If the API change is
uncommitted, `HEAD` does not contain it. Update known annotation IDs, defer the
check and regeneration, and report the limitation. Do not create a temporary
commit solely to run the tool.
