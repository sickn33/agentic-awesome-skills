# Details (moved from SKILL.md)

> Extended reference content for `semantic-versioning`, kept under `references/` so the entrypoint stays within the audit budget.

## Multi-Package Versioning

### Lerna

```json
// lerna.json
{
  "version": "independent",
  "npmClient": "npm",
  "command": {
    "version": {
      "conventionalCommits": true,
      "message": "chore(release): publish"
    },
    "publish": {
      "conventionalCommits": true
    }
  }
}
```

```bash
# Version all changed packages
npx lerna version

# Publish all changed packages
npx lerna publish
```

### Changesets

```bash
# Initialize
npx @changesets/cli init

# Add changeset
npx changeset add

# Version packages
npx changeset version

# Publish
npx changeset publish
```


## Common Issues

### Issue: No Version Bump
**Problem**: semantic-release not creating release
**Solution**: Check commit format, verify branch configuration

### Issue: Wrong Version Calculated
**Problem**: Major/minor/patch incorrectly determined
**Solution**: Review commit analyzer rules, check for missing prefixes

### Issue: Duplicate Tags
**Problem**: Tag already exists
**Solution**: Clean up tags, verify version wasn't already released


## Best Practices

- Use conventional commits consistently
- Automate version bumping in CI
- Generate changelogs automatically
- Tag releases in Git
- Use pre-release versions for testing
- Document breaking changes clearly
- Include migration guides for major versions
- Lock dependencies with exact versions


## Related Skills

- git-workflow (`git-workflow`) - Branching strategies
- github-actions (`github-actions`) - CI automation
- feature-flags (`feature-flags`) - Progressive rollout

