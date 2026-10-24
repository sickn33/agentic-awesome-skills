# Specialized Recon Techniques

> **AAS adaptation:** Read the authorization gate in [the skill](../SKILL.md) before any target request, credential use, or data collection. These are reference examples, not an instruction to run a sweep. Select only explicitly approved targets and techniques; set request, time, byte and concurrency limits and stop on errors or scope changes. Preserve TLS verification. Treat discoveries, pattern matches and historical provider claims as leads, not verified ownership, permission or severity. Minimize personal data and redact credentials before reports; do not send private evidence to public services. Prices, quotas, API shapes and tool availability require current official documentation. Changes and original source hashes are recorded in [the notice](../UPSTREAM-NOTICE.md).


> Reference content for the `offensive-osint` skill. Originally §41 + §42 + §43 + §44 + §45 of the monolithic SKILL.md (refactored 2026-05-02 for size/load efficiency).

## 41. LinkedIn Employee Enumeration

LinkedIn is the highest-signal source for employee enumeration during external red-team work. Use it for: target list generation, role prioritization, email-pattern derivation, pretext development.

### 41.1 Search techniques

**Free LinkedIn (no Sales Navigator):**
- People-search by company: `https://www.linkedin.com/search/results/people/?currentCompany=["<company-id>"]`. Get company-id from the company's LinkedIn URL or profile JSON.
- Bypass connection-degree filter: search shows 1st/2nd-degree only by default; use Google dorking instead.

**Google dork for LinkedIn employee enum:**
```
site:linkedin.com/in "<company name>"
site:linkedin.com/in "<company name>" "engineer"   # role filter
site:linkedin.com/in "<company name>" "<location>" # location filter
site:linkedin.com/in "<company name>" -inurl:/posts
```

**Bing/DuckDuckGo equivalents** — sometimes return different result sets; cross-engine union.

**LinkedIn Sales Navigator (paid):**
- Most efficient if available. Lead lists by company × role × seniority. Export CSV.

**Tools:**
- **theHarvester** with `-b linkedin` source (uses search-engine-driven enum).
- **CrossLinked** — `https://github.com/m8r0wn/CrossLinked` — CLI tool that does the LinkedIn dorking.
- **LinkedInDumper** / **Linkook** — open-source enum tools (verify currency; they break frequently).
- **PhantomBuster** / **Apollo.io** / **RocketReach** / **Hunter.io Email Finder** — paid SaaS that does the enum + email derivation in one workflow.

### 41.2 Role inference for prioritization

For each enumerated employee, capture:
- **Name** (canonical form: First Last; remove suffixes like "PMP", "PhD" for email-pattern matching).
- **Job title** (raw + normalized to a role tier).
- **Tenure** (dated profile claim; it does not establish current employment or access).
- **Location** (city / region; informs phishing time-of-day).
- **Recent activity** (posts, comments, articles — informs pretext).

**Role priority for breach lookup + phishing target list:**

| Role tier | Examples | Why |
|---|---|---|
| **P0** | CEO, CFO, CTO, CISO, CIO, COO, GC, CRO | Exec accounts; BEC + finance + legal authority. |
| **P1** | VP / Director of IT / Security / Engineering / Finance / HR | Privileged tool access; reset workflows. |
| **P2** | DevOps, SRE, Platform, Security Engineer, DBA | GitHub / cloud / CI access; secrets in their accounts. |
| **P3** | Software Engineer, Architect, Senior Developer | Code + occasional cloud access. |
| **P4** | Sales, Marketing, HR, Finance Analyst, Customer Support | SaaS access (Salesforce, HubSpot, Workday); BEC enabler. |
| **P5** | Generic individual contributor, intern, contractor | Lowest single-account value but breadth matters. |

### 41.3 Email-pattern derivation from confirmed names

For each captured name, derive candidate emails using §11 templates. Cross-reference against:
- Hunter.io `domain-search` to confirm pattern.
- Breach corpus (HudsonRock + HIBP + DeHashed + IntelX) to find matches.

### 41.4 Sock-puppet considerations

- **Never connect from the corporate persona.** LinkedIn shows "viewed your profile" notifications.
- Use only an engagement-approved research identity and comply with platform rules. Do not impersonate a real person, contact employees or manufacture relationships to obtain access.
- **LinkedIn "private mode" (anonymous viewing)** — toggle in settings; reduces one signal but Sales Navigator can still see anonymized "someone viewed your profile."
- **Connection requests are detectable.** Don't send any during recon.
- **Profile views accumulate suspicion** if you view 100+ employees of one company in a day. Throttle: <20/day per persona.

### 41.5 Output

Per discovered employee:
```
Person:
  name:        "Alice Doe"
  title:       "Senior DevOps Engineer"
  role_tier:   P2
  company:     "Acme Corp"
  location:    "Boston, MA"
  linkedin_url: https://www.linkedin.com/in/alicedoe
  derived_emails:
    - alice.doe@acme.com    (TENTATIVE)
    - adoe@acme.com         (TENTATIVE)
    - alice@acme.com        (TENTATIVE)
  breach_hits:
    - alice.doe@acme.com    (HudsonRock; cleartext password redacted; FIRM)
  pretext_hooks:
    - "DevOps tooling vendor evaluation" (recent posts)
    - "Boston DevOps Days speaker" (conference activity)
```

---

## 42. Job Posting Tech-Stack Analysis

Job postings reveal the target's internal tech stack with surprising precision. Free, public, and they include the exact vendor names.

### 42.1 Sources

| Platform | URL | Notes |
|---|---|---|
| LinkedIn Jobs | `https://www.linkedin.com/jobs/search/?keywords=&f_C=<company-id>` | Most current; require LI account. |
| Indeed | `https://www.indeed.com/cmp/<company>` | Company page with job feed. |
| Glassdoor | `https://www.glassdoor.com/Jobs/<company>-Jobs-E<id>.htm` | Plus salary data + employee reviews. |
| Lever (ATS) | `https://jobs.lever.co/<company>` | Direct ATS — full job descriptions. |
| Greenhouse (ATS) | `https://boards.greenhouse.io/<company>` | Direct ATS. |
| Workable (ATS) | `https://apply.workable.com/<company>/` | Direct ATS. |
| AshbyHQ (ATS) | `https://jobs.ashbyhq.com/<company>` | Direct ATS. |
| AngelList / Wellfound | `https://wellfound.com/company/<company>/jobs` | Startup-focused. |
| BuiltIn | `https://builtin.com/companies/view/<company>` | Tech-focused. |
| Stack Overflow Jobs | (deprecated 2022 but archive available) | Historical tech-stack data. |
| Company careers page | `https://careers.<target>.com` or `https://<target>.com/careers` | Direct source; sometimes more detail than ATS. |

### 42.2 What to extract

For each job posting, harvest:
- **Required technologies** ("must have experience with X, Y, Z") → inferred use, not confirmation.
- **Nice-to-have technologies** → likely in use but maybe in transition.
- **Vendor names** (Workday, Salesforce, Snowflake, Databricks, Datadog, etc.) → SaaS tenants.
- **Internal tool / project codenames** (often slip into "you'll work on Project Aurora") → recon vocabulary.
- **Team size hints** ("part of a 12-person platform team") → org-structure intel.
- **Office locations** ("hybrid 3 days in Boston office") → physical recon.
- **Cloud + on-prem ratio hints** ("migrating from on-prem to AWS") → posture intel.
- **Compliance frameworks mentioned** (SOC2, FedRAMP, HIPAA, PCI) → defensive priorities + reporting context.

### 42.3 Tooling

- **scrapy / BeautifulSoup** — custom scrapers per ATS.
- **theHarvester** with appropriate sources.
- **JobScraper** scripts on GitHub.
- **Manual** — for small targets, manual review of 20–30 postings is fast and high-fidelity.

### 42.4 Output

Per discovered tech mention:
```
Tech_inferred:
  product:     "Snowflake"
  category:    "data warehouse"
  source:      "linkedin job posting #<id>"
  source_url:  https://www.linkedin.com/jobs/view/...
  confidence:  TENTATIVE  (job listing implies in-use; not yet confirmed by direct probe)
  posting_date: 2026-03-15
  required_or_nice: "required"
```

Aggregate to a **target tech-stack profile** that informs:
- Which secret patterns to look for (Snowflake-specific keys, Databricks tokens).
- Which SaaS tenants to fingerprint (Snowflake account URL pattern).
- Which vendor-product fingerprints to probe (Snowflake DSN paths in JS).

---

## 43. Slack / Discord / Telegram Workspace Discovery

### 43.1 Slack

- **Public workspace search** (limited; Slack used to have one but deprecated):
  - **Slofile** (third-party): `https://slofile.com/` — community Slack workspace directory.
  - **Slacklist** / **Slack Communities** — community-curated lists.
- **Invite-link enumeration** — Slack invite URLs follow `https://join.slack.com/t/<workspace-slug>/shared_invite/<token>`. Common discovery:
  - Google: `site:join.slack.com "{target}"` or `inurl:slack.com inurl:shared_invite "{target}"`.
  - GitHub: `"join.slack.com/t/<target-stem>"` filename:README.
  - Twitter/X / Reddit: search for shared invite links.
- **Confirm workspace exists**: visit `https://<slug>.slack.com/api/auth.test` (returns workspace metadata when called by an authenticated session, but the page itself returns differently per workspace existence).
- **Review lead**: confirm whether an invite is intended for a public community. Discovery does not authorize joining or establish access to private channels.

### 43.2 Discord

- **Discord server discovery** is harder (no central public directory).
- **DiscordServers.com** — third-party directory.
- **Discord.me** / **Top.gg** — community directories.
- Google: `site:discord.gg "{target}"` or `site:discord.com "{target}"`.
- **Confirm server**: invite URLs `https://discord.gg/<token>` resolve to a JSON via `https://discord.com/api/v9/invites/<token>?with_counts=true`. Returns server name, ID, member count, channel info.
- **Bot enumeration**: if you find a bot token (catalog §17 row 47), Discord does not use Telegram’s `getMe` method. Refer to current official Discord API documentation and the separate credential-use gate; bot identity does not prove access to every server.

### 43.3 Telegram

Already covered in §38. Quick reference:
- TGStat — channel analytics + search.
- Telemetr — channel growth + overlaps.
- Combot — group analytics.
- View public channels: `https://t.me/s/<channel>`.
- Invite link enum: search Google `site:t.me "{target}"`.

### 43.4 Microsoft Teams (federation)

- See companion methodology skill §11.10.
- Federation status check via Microsoft Graph (auth-required).
- Discovery metadata does not establish effective federation, user-level policy or communication permission; do not send messages without separate authorization.

### 43.5 Mattermost / Rocket.Chat / self-hosted

- `https://mattermost.<target>.com` or `chat.<target>` patterns.
- Open registration check: probe `/signup` page; page availability is not proof that registration succeeds or grants workspace access; do not create accounts automatically.
- Check version disclosure (`/api/v4/system/ping`) for known CVEs.

---

## 44. Package Registry Leak Hunting

Public package registries (npm, PyPI, RubyGems, Docker Hub, etc.) often contain inadvertent secrets in published packages.

### 44.1 npm

- **Search packages by org / scope:**
  ```bash
  npm search "<target-keyword>"
  npm view @<scope>/<package-name>
  ```
- **List org's packages:** `https://www.npmjs.com/org/<org>` or `https://registry.npmjs.org/-/org/<org>/package`.
- **Per-package historical versions:** `https://registry.npmjs.org/<package>` — JSON with all versions.
- **Tarball download for scan:**
  ```bash
  npm pack <package>@<version> --ignore-scripts
  tar -tzf package-version.tgz  # inspect paths; bounded safe extraction is a separate step
  # Run secret catalog (§17) on extracted files
  ```
- **Common leaks:** `.env` files included in published tarball, `package.json` `scripts` references to internal CI secrets, hardcoded API keys in `dist/` builds.

### 44.2 PyPI

- **Search packages:** `https://pypi.org/search/?q=<target>`.
- **Per-package metadata + history:** `https://pypi.org/pypi/<package>/json`.
- **Download wheel/sdist for scan:**
  ```bash
  python3 -m pip download <package>==<version> --only-binary=:all: --no-deps -d "$PRIVATE_CASE_DIR"
  python3 -m zipfile -l "$PRIVATE_CASE_DIR/<exact-wheel>.whl"  # inspect only; do not import or execute
  # Run secret catalog
  ```
- **Common leaks:** `setup.py` with hardcoded URLs, embedded test fixtures with real credentials, accidentally-included `.pypirc` files.

### 44.3 RubyGems

- **Search:** `https://rubygems.org/search?query=<target>`.
- **Per-gem metadata:** `https://rubygems.org/api/v1/gems/<gem-name>.json`.
- **Download:**
  ```bash
  gem fetch <gem-name> --version <reviewed-version>
  tar -tf <gem-name>-<reviewed-version>.gem  # inspect only; bounded safe extraction requires separate approval
  ```

### 44.4 Cargo (Rust crates)

- **Search:** `https://crates.io/search?q=<target>`.
- **Per-crate metadata:** `https://crates.io/api/v1/crates/<crate-name>`.

### 44.5 Packagist (PHP / Composer)

- **Search:** `https://packagist.org/search/?q=<target>`.
- **Per-package metadata:** `https://packagist.org/packages/<vendor>/<package>.json`.

### 44.6 NuGet (.NET)

- **Search:** `https://www.nuget.org/packages?q=<target>`.

### 44.7 Maven Central (Java)

- **Search:** `https://search.maven.org/?q=<target>`.

### 44.8 Docker Hub / Quay / GHCR / ECR Public

Already covered in §16.18; worth noting for completeness as part of registry-sweep workflow.

### 44.9 Workflow

For each registry, for each candidate package owned-by-target:
1. List all historical versions (often `<package>@1.0.0` was clean but `<package>@0.9.0` had a leaked key).
2. Select a bounded set of exact versions, verify registry/source identity and acquire archives without build or lifecycle hooks. Do not download all history automatically.
3. Inspect paths and sizes before extracting into a fresh private directory; reject traversal, absolute paths, links and decompression bombs. Scan inert content locally, with credential validation disabled.
4. Note `.env`, `package.json`/`setup.py`/`Cargo.toml` for hardcoded values.
5. For Docker images: scan each layer (use `dive` or `skopeo` + `docker save` + extract layers).

### 44.10 Typosquat surveillance

For every published package the target owns, generate typosquat candidates (similar names, common substitutions) and check whether they're already taken by attackers (supply-chain attack surface).

```bash
# Example: target package "acme-utils"
# Candidates: acme-util, acmeutils, acme_utils, acme.utils, ac-me-utils, etc.
for candidate in acme-util acmeutils acme_utils acme.utils ac-me-utils; do
  npm view "$candidate" 2>&1 | head -3
done
```

If a candidate is registered to a different party, record a candidate name collision. Confirm misleading publisher claims, malicious content or dependency confusion prerequisites before assigning vulnerability severity.

---

## 45. Sat Imagery for Physical Recon

For engagements that include a physical-touch component (badge access, tailgating, dumpster diving, on-site network), public imagery helps scout the target.

### 45.1 Sat imagery sources

| Source | URL | Notes |
|---|---|---|
| **Google Earth Pro** | desktop app | Historical timeline; high resolution (sub-meter) for major cities. |
| **Google Maps** | maps.google.com | Current; satellite layer; street view inside building lobbies sometimes. |
| **Bing Maps Bird's Eye** | bing.com/maps | Oblique/45-degree imagery for many regions; sometimes shows building facades better than top-down. |
| **Apple Maps Look Around** | (iOS / Mac) | Street-level; 3D in major cities. |
| **Yandex Maps Panorama** | yandex.com/maps | Russia + global; sometimes higher-resolution street-level than Google. |
| **NearMap** (paid) | nearmap.com | Highest-resolution commercial; updated frequently in served regions (US/AU/NZ/CA mostly). |
| **Maxar / Planet Labs** (paid) | maxar.com / planet.com | Tasking + recent imagery. |
| **Sentinel Hub EO Browser** | apps.sentinel-hub.com | Free Sentinel-2 (10m); good for change detection. |
| **NASA Worldview** | worldview.earthdata.nasa.gov | Free; multiple sensors. |
| **Wayback ArcGIS** | livingatlas.arcgis.com/wayback/ | Historical satellite. |
| **OpenStreetMap** | openstreetmap.org | Crowd-sourced map data with building outlines. |

### 45.2 What to extract for physical recon

- **Building entrance count + locations** — main entrance, employee entrances, loading docks, fire exits.
- **Parking lot ingress / egress** — single guarded entry vs open lot.
- **Fence lines + camera locations** — physical perimeter.
- **HVAC / utility access** — roof access, service entries.
- **Adjacent occupants** — neighboring tenants in same building / business park.
- **Vehicle types in lot** — proxy for executive presence + employee count.
- **Smoking area locations** — common social-engineering staging area.

### 45.3 OSINT-derived physical intel beyond satellites

- **LinkedIn employee photos** — badge templates often visible in profile photos taken at the office.
- **Glassdoor "office tour" photos** — employees post interior photos.
- **Indeed / Glassdoor reviews** — sometimes describe security culture ("loose badge enforcement", "tailgating common").
- **Instagram geotagged photos** — at the office address; reveals interior layout, badge designs, kitchen / common-area locations.
- **Public press releases** — often contain "ribbon cutting" photos of new offices showing layout + executive faces.
- **Conference talks by IT/security staff** — sometimes describe physical security setup.
- **Meetup / workshop event listings** — at the target's office; may include photos.

### 45.4 Vehicle / fleet intel

- **License plates** in LinkedIn/Instagram backgrounds — sometimes correlates to specific exec.
- **Company-branded vehicles** in sat imagery — fleet count + location.
- **Helicopter pad** / **executive parking** — clue to senior-leadership routine.

### 45.5 Discipline

- Document that imagery + photos are public-source.
- Don't trespass for "verification" — physical recon during OSINT phase = look only.
- Note imagery date — buildings change.

---
