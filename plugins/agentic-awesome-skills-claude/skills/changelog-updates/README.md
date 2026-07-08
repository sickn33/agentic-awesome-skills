# changelog-updates

Create release notes and product updates that developers actually read and care about.

## What This Skill Covers

- **Changelog Format**: Structure and writing style that works
- **What to Include**: Deciding what's worth documenting
- **Versioning Communication**: Explaining semver to users
- **Breaking Changes**: Announcements that reduce friction
- **Deprecation Notices**: Graceful feature sunsets
- **Building Anticipation**: Turning releases into moments

## When to Use This Skill

- Setting up a changelog for a new project
- Improving existing release communication
- Planning breaking change announcements
- Deprecating features gracefully
- Building excitement for upcoming releases

## Key Principle

Release notes are developer communication, not documentation. When done well, they build trust, demonstrate momentum, and turn updates into marketing moments.

## Good vs. Bad Entries

**Good:**
```markdown
### Fixed
- Fixed timeout errors when uploading files larger than 10MB.
  Uploads now stream in chunks, eliminating memory issues. (#234)
```

**Bad:**
```markdown
### Fixed
- Fixed bug
```

## Quick Wins

1. Follow Keep a Changelog format
2. Include issue/PR links in every entry
3. Explain the "why" for breaking changes
4. Add migration guides for deprecations
5. Send email digests for significant releases

## Related Skills

- `sdk-dx` - SDK versioning strategy
- `docs-as-marketing` - Changelog as documentation
- `developer-community` - Where to share updates
