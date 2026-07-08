---
name: changelog-updates
description: 'Create release notes and product updates that developers actually read and care about. This skill covers changelog formatting, versioning communication, breaking change announcements, deprecation notices, and building anticipation for new features. Trigger phrases: "changelog",...'
risk: unknown
source: https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates
source_repo: jonathimer/devmarketing-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/jonathimer/devmarketing-skills/blob/main/LICENSE
---

# Changelogs and Product Updates Developers Care About
## When to Use

Use this skill when you need create release notes and product updates that developers actually read and care about. This skill covers changelog formatting, versioning communication, breaking change announcements, deprecation notices, and building anticipation for new features. Trigger phrases: "changelog",...


Release notes are developer communication, not documentation. When done well, they build trust, demonstrate momentum, and turn updates into marketing moments.

## Overview

Changelogs serve multiple audiences and purposes:
- **Active developers**: "What changed that affects my integration?"
- **Evaluating developers**: "Is this product actively maintained?"
- **Developer advocates**: "What's worth sharing with my audience?"
- **Your team**: Historical record of what shipped and when

This skill covers creating changelogs that inform, build trust, and occasionally delight.

## Before You Start

Review the **developer-audience-context** skill to understand:
- How do your developers prefer to receive updates?
- What changes do they care most about?
- How much detail do they need?
- What's their tolerance for breaking changes?

Your changelog tone and detail level should match your audience.

## Changelog Format

### The Standard Structure

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added
- New feature in development

## [2.3.0] - 2024-01-15
### Added
- New `analyze()` method for sentiment analysis
- Support for batch processing up to 100 items

### Changed
- Improved error messages with troubleshooting links
- Default timeout increased from 30s to 60s

### Deprecated
- `old_analyze()` will be removed in v3.0.0

### Fixed
- Race condition in concurrent requests (#234)
- Memory leak when processing large files (#256)

## [2.2.1] - 2024-01-08
### Fixed
- Critical security patch for authentication bypass

## [2.2.0] - 2024-01-01
...
```

### Change Categories

| Category | Use For |
|----------|---------|
| **Added** | New features, new endpoints, new parameters |
| **Changed** | Behavior changes, performance improvements |
| **Deprecated** | Features being phased out (still working) |
| **Removed** | Features that no longer exist |
| **Fixed** | Bug fixes |
| **Security** | Security-related changes |

### Good vs. Bad Entries

**Good Changelog Entries:**
```markdown
### Added
- New `batch_analyze()` method processes up to 100 items in a single
  request, reducing API calls by 90% for bulk operations.
  [See docs](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link) (#198)

### Fixed
- Fixed timeout errors when processing files larger than 10MB.
  Uploads now stream in chunks, eliminating memory issues. (#234)

### Deprecated
- `legacy_auth()` will be removed in v3.0.0 (scheduled for March 2024).
  Migrate to `oauth_auth()` using our [migration guide](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link).
```

**Bad Changelog Entries:**
```markdown
### Added
- New feature

### Fixed
- Fixed bug
- Fixed another bug
- Various improvements

### Changed
- Updated dependencies
```

### Writing Style

**Be specific:**
```
❌ "Improved performance"
✅ "Reduced API response time by 40% for list operations"
```

**Include context:**
```
❌ "Fixed issue #234"
✅ "Fixed timeout errors when uploading large files (#234)"
```

**Link to resources:**
```
✅ "New batch API - [documentation](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link) | [migration guide](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link)"
```

**Explain impact:**
```
✅ "Breaking: `user_id` parameter renamed to `id`.
    Update your code before upgrading."
```

## What to Include

### Always Include

**API Changes:**
- New endpoints
- New parameters
- Changed response formats
- Changed error codes

**SDK Changes:**
- New methods
- Changed method signatures
- New configuration options

**Breaking Changes:**
- Anything that requires code changes
- Removed features
- Changed defaults

**Security Fixes:**
- Even if vague, acknowledge security updates
- Follow responsible disclosure timeline

### Consider Including

**Performance Improvements:**
```markdown
### Changed
- List operations now 3x faster through pagination optimization
```

**Developer Experience:**
```markdown
### Added
- Error messages now include troubleshooting links
- SDK now validates API keys at initialization
```

**Infrastructure:**
```markdown
### Changed
- New data center in EU (eu-west.api.example.com)
- Increased rate limits from 100 to 500 requests/minute
```

### Skip or Minimize

**Internal refactoring:**
```markdown
❌ "Refactored authentication module"
(unless it affects developers)
```

**Minor dependency updates:**
```markdown
❌ "Updated lodash from 4.17.20 to 4.17.21"
(unless security-related)
```

**Typo fixes:**
```markdown
❌ "Fixed typo in error message"
(batch these into "Various documentation improvements")
```

## Versioning Communication

### Semantic Versioning Explained to Users

Help developers understand what version numbers mean:

```markdown
# Versioning

We follow [Semantic Versioning](https://semver.org/):

- **Major versions (3.0.0)**: May include breaking changes.
  Check the migration guide before upgrading.

- **Minor versions (2.3.0)**: New features, backward compatible.
  Safe to upgrade.

- **Patch versions (2.3.1)**: Bug fixes only.
  Always safe to upgrade.
```

### Version Pinning Guidance

Help developers make good choices:

```markdown
# Recommended Version Constraints

For stability, we recommend:
- `"myapi": "^2.3.0"` - Get patches and minor updates
- `"myapi": "~2.3.0"` - Get patches only

For production systems:
- Pin exact versions: `"myapi": "2.3.0"`
- Review changelogs before upgrading
- Test in staging first
```

### API Versioning Communication

```markdown
# API Versions

## Current Versions
- **v2** (current): Full support, recommended for new integrations
- **v1** (legacy): Security fixes only, sunset March 2025

## Version Lifecycle
| Status | Duration | What It Means |
|--------|----------|---------------|
| Current | Ongoing | Full support, new features |
| Legacy | 12 months | Security fixes only |
| Deprecated | 6 months | No updates, migration required |
| Sunset | - | No longer available |

## Specifying Version
```bash
curl https://api.example.com/v2/users
# or
curl -H "API-Version: 2024-01-15" https://api.example.com/users
```
```

## Breaking Changes

### Breaking Change Announcement Template

```markdown
# Breaking Change: [Brief Description]

**Affects**: SDK v3.0.0, API version 2024-03
**Timeline**: Changes take effect March 15, 2024

## What's Changing
[Clear description of the change]

## Why We're Making This Change
[Honest explanation - better performance, security, consistency]

## Who's Affected
- ✅ Users of SDK v2.x - no action required
- ⚠️ Users of SDK v3.0.0+ - update required
- ⚠️ Direct API users on v1 - update required

## Required Actions

### If you use our SDK:
```python
# Before (v2.x)
client.old_method(user_id="123")

# After (v3.x)
client.new_method(id="123")
```

### If you call the API directly:
```bash
# Before
POST /v1/users/123/analyze

# After
POST /v2/users/123/analyze
```

## Migration Guide
[Link to detailed migration documentation]

## Timeline
- **Now**: v3.0.0 beta available for testing
- **Feb 1**: v3.0.0 stable released
- **Mar 1**: v2.x enters legacy support
- **Mar 15**: Breaking changes take effect in API
- **Sep 15**: v2.x sunset (no longer supported)

## Need Help?
- [Migration guide](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link)
- [Office hours signup](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link)
- [Support channel](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link)
```

### Breaking Change Communication Timeline

```
6 months before:  Announce upcoming change
3 months before:  Release new version with migration path
1 month before:   Send direct emails to affected users
2 weeks before:   Final reminder
Day of:           Change takes effect
1 week after:     Follow-up for stragglers
```

## Deprecation Notices

### In-Code Deprecation

```python
import warnings

def old_method(self, user_id):
    """
    .. deprecated:: 2.3.0
       Use :meth:`new_method` instead. Will be removed in v3.0.0.
    """
    warnings.warn(
        "old_method() is deprecated and will be removed in v3.0.0. "
        "Use new_method() instead. "
        "Migration guide: https://docs.example.com/migrate-v3",
        DeprecationWarning,
        stacklevel=2
    )
    return self.new_method(id=user_id)
```

### API Deprecation Headers

```http
HTTP/1.1 200 OK
Deprecation: Sun, 15 Sep 2024 00:00:00 GMT
Sunset: Sun, 15 Mar 2025 00:00:00 GMT
Link: <https://docs.example.com/migrate-v3>; rel="deprecation"

{
  "data": {...},
  "_deprecation": {
    "message": "This endpoint is deprecated",
    "sunset": "2025-03-15",
    "migration": "https://docs.example.com/migrate-v3"
  }
}
```

### Deprecation Changelog Entry

```markdown
### Deprecated
- **`/v1/analyze` endpoint**: Use `/v2/analyze` instead.
  - Migration guide: [link]
  - Sunset date: March 15, 2025
  - After sunset: Requests will return 410 Gone
```

## Building Anticipation

### "Coming Soon" Announcements

Build excitement for upcoming features:

```markdown
# Coming in Q2 2024

## Batch Processing API (Beta available now)
Process up to 1,000 items in a single request.
[Join the beta](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link)

## Python SDK v3.0
Complete rewrite with async support, type hints, and 50% faster.
[Preview documentation](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link)

## EU Data Residency
For customers with European data requirements.
[Join waitlist](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link)
```

### Release Cadence Communication

Set expectations:

```markdown
# Release Schedule

**SDK Releases**: First Monday of each month
**API Updates**: Continuous (backward compatible)
**Breaking Changes**: Twice per year (March, September)

Subscribe to updates:
- [GitHub releases](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link)
- [Email newsletter](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link)
- [Discord announcements](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link)
- [Twitter/X](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link)
```

### Feature Launches as Events

Turn significant releases into moments:

```markdown
# 🚀 SDK v3.0 Launch

We're excited to announce the biggest SDK update in 2 years!

## Highlights
- **50% faster** request processing
- **Full async support** for high-throughput applications
- **Type hints** throughout for better IDE support
- **Simplified auth** - configure once, use everywhere

## Launch Week
- **Monday**: SDK v3.0 stable release
- **Tuesday**: Live coding session (YouTube)
- **Wednesday**: Migration office hours
- **Thursday**: Community showcase
- **Friday**: AMA with the SDK team

## Resources
- [Documentation](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link)
- [Migration guide](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link)
- [Video walkthrough](https://github.com/jonathimer/devmarketing-skills/tree/main/skills/changelog-updates/link)

## Thank You
Special thanks to our 47 beta testers who found 23 bugs
and suggested 12 improvements that made it into this release!
```

## Distribution Channels

### Where to Publish

| Channel | Audience | Content Level |
|---------|----------|---------------|
| GitHub Releases | Developers on repo | Full changelog |
| Docs changelog | All developers | Full changelog |
| Blog | Broader audience | Highlights + context |
| Email | Active users | Summary + action items |
| Twitter/X | Community | Highlights only |
| Discord/Slack | Engaged community | Discussion + highlights |

### Email Templates

**Regular Release:**
```
Subject: [Product] v2.3.0 Released - Batch Processing + Bug Fixes

Hey [name],

We just released v2.3.0 with some improvements you'll like:

✨ New batch processing API - handle 100 items at once
🐛 Fixed timeout issues with large files
⚡ 40% faster list operations

Full changelog: [link]
Upgrade guide: [link]

Happy building,
The [Product] Team
```

**Breaking Change:**
```
Subject: ⚠️ Action Required: [Product] Breaking Change on March 15

Hey [name],

We're making changes to improve [X], and you'll need to
update your integration before March 15.

What's changing: [one sentence]
What you need to do: [one sentence]
Full details: [link]

Need help? Reply to this email or join our office hours: [link]

Best,
The [Product] Team
```

## Tools

### Changelog Generation
- **Conventional Commits**: Structured commit messages
- **semantic-release**: Automated changelog from commits
- **changesets**: Monorepo changelog management
- **Keep a Changelog**: Format specification

### Distribution
- **GitHub Releases**: Native to most developer workflows
- **Beehiiv/Buttondown**: Developer newsletter platforms
- **Twitter/X**: Quick updates to community
- **Discord/Slack**: Community discussions

### Monitoring
- **GitHub Stars/Watchers**: Engagement metrics
- **npm download stats**: Adoption tracking
- **Email open rates**: Communication effectiveness

## Related Skills

- **sdk-dx**: SDK versioning and migration
- **docs-as-marketing**: Changelog as documentation
- **developer-community**: Community communication channels
- **developer-metrics**: Measuring changelog engagement
- **technical-content-strategy**: Changelog as content

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
