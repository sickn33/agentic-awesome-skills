# Supply-chain evidence and historical research index

Adapted from elementalsouls/Claude-BugHunter (MIT). Catalog revision removes unverified impact totals, universal severity assignments and operational credential-exfiltration chains. Source links below are preserved research leads, not evidence that every original incident detail or attribution was verified in this review.

## Finding standard

Document the exact repository revision, workflow path, package/version or image digest, authorized scope, observed configuration, coherent vulnerability mechanism and uncertainty. A mutable action reference, internal URL or unclaimed-looking name is a lead; impact depends on reachable code, effective privileges and assets. Do not infer public account 2FA state or origin IPs from ordinary commit metadata. Do not assign critical severity merely from a token-shaped string or a workflow trigger.

For dependency confusion, confirm actual resolution behavior in an owner-approved local fixture with synthetic packages; registry choices differ by ecosystem, configuration, scopes and lockfiles. A missing public package does not establish ownership or registerability. Defensive registration itself needs owner authorization and compliance with registry terms; do not generate/publish attack packages.

For workflows, trace untrusted data to executable sinks and inspect permissions, secrets, runner isolation and checkout trust. Use harmless markers in isolated fixtures rather than exfiltration. Read [GitHub's official security guidance](https://docs.github.com/en/actions/reference/security/secure-use) and [npm registry configuration](https://docs.npmjs.com/cli/v11/configuring-npm/npmrc/).

For images/logs, preserve evidence under restricted access, bound archive extraction and scan without executing content or validating discovered credentials. SBOM version matches require reachability/configuration review; they do not prove exploitation. Internal infrastructure remains out of an external-only scope even if a public artifact names it.

## Historical cases for further research

The imported list groups both malicious supply-chain compromises and vulnerabilities distributed through dependencies. These are distinct mechanisms. Recheck the original disclosures before repeating dates, attribution, impact numbers or lessons; no universal ranking of attack vectors follows from twelve selected cases.

### 1. SolarWinds Orion / SUNBURST (CISA AA20-352A, Dec 2020)

- https://www.cisa.gov/news-events/cybersecurity-advisories/aa20-352a
- https://cloud.google.com/blog/topics/threat-intelligence/sunburst-additional-technical-details
- https://www.microsoft.com/en-us/security/blog/2020/12/18/analyzing-solorigate-the-compromised-dll-file-that-started-a-sophisticated-cyberattack/
- https://orangematter.solarwinds.com/2021/01/11/new-findings-from-our-investigation-of-sunburst/

### 2. 3CX VoIP softphone supply chain (CVE-2023-29059, March 2023)

- https://www.crowdstrike.com/en-us/blog/crowdstrike-detects-and-prevents-active-intrusion-campaign-targeting-3cxdesktopapp-customers/
- https://www.sentinelone.com/blog/smoothoperator-ongoing-campaign-trojanizes-3cx-software-in-software-supply-chain-attack/
- https://cloud.google.com/blog/topics/threat-intelligence/3cx-software-supply-chain-compromise
- https://www.3cx.com/blog/news/desktopapp-security-alert-update/

### 3. MOVEit Transfer mass exploitation (CVE-2023-34362, May–July 2023)

- https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-158a
- https://community.progress.com/s/article/MOVEit-Transfer-Critical-Vulnerability-31May2023
- https://cloud.google.com/blog/topics/threat-intelligence/zero-day-moveit-data-theft
- https://www.huntress.com/blog/moveit-transfer-critical-vulnerability-rapid-response

### 4. Codecov bash uploader compromise (Apr 2021)

- https://codecov.io/bash`
- https://codecov.io/bash
- https://about.codecov.io/security-update/
- https://discuss.hashicorp.com/t/hcsec-2021-12-codecov-security-event-and-hashicorp-gpg-key-exposure/23512
- https://about.mercari.com/en/press/news/articles/20210521_incidentreport/
- https://www.rapid7.com/blog/post/2021/05/13/rapid7-discloses-its-response-to-codecov-incident/

### 5. ua-parser-js npm hijack (Oct 2021)

- https://github.com/advisories/GHSA-pjwm-rvh2-c87w
- https://www.cisa.gov/news-events/alerts/2021/10/22/malware-discovered-popular-npm-package-ua-parser-js
- https://github.com/faisalman/ua-parser-js/issues/536
- https://snyk.io/blog/npm-security-malicious-code-found-in-npm-package-ua-parser-js/

### 6. event-stream npm package (Nov 2018)

- https://github.com/advisories/GHSA-mh6f-8j2x-4483
- https://github.blog/2018-11-26-npm-package-event-stream/
- https://github.com/dominictarr/event-stream/issues/116
- https://snyk.io/blog/a-post-mortem-of-the-malicious-event-stream-backdoor/

### 7. PHP Git server compromise (March 2021)

- https://news-web.php.net/php.internals/113838
- https://externals.io/message/113848
- https://www.zdnet.com/article/php-internal-git-server-hacked-with-malicious-code-pushed-to-the-php-src-repo/

### 8. Log4Shell (CVE-2021-44228, Dec 2021)

- https://www.cisa.gov/news-events/cybersecurity-advisories/aa21-356a
- https://logging.apache.org/log4j/2.x/security.html
- https://www.lunasec.io/docs/blog/log4j-zero-day/
- https://www.cisa.gov/known-exploited-vulnerabilities-catalog

### 9. tj-actions/changed-files GitHub Action compromise (CVE-2025-30066, March 2025)

- https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-github-action-cve-2025-30066
- https://www.stepsecurity.io/blog/harden-runner-detection-tj-actions-changed-files-action-is-compromised
- https://www.wiz.io/blog/github-action-tj-actions-changed-files-supply-chain-attack-cve-2025-30066
- https://semgrep.dev/blog/2025/popular-github-action-tj-actionschanged-files-is-compromised/

### 10. PyPI typosquats (`colourama`, `python3-dateutil`, `jeIlyfish`, et al.)

- https://www.reversinglabs.com/blog/mining-for-malicious-ruby-gems
- https://snyk.io/blog/malicious-packages-found-to-be-typo-squatting-in-pypi/
- https://blog.phylum.io/the-state-of-the-software-supply-chain/
- https://www.sonatype.com/state-of-the-software-supply-chain/

### 11. Alex Birsan dependency-confusion disclosure (Feb 2021)

- https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610
- https://azure.microsoft.com/en-us/resources/3-ways-to-mitigate-risk-using-private-package-feeds/
- https://github.blog/2021-02-12-how-to-prevent-dependency-confusion-on-public-package-registries/
- https://snyk.io/blog/dependency-confusion-vulnerability-novel-supply-chain-attack/

### 12. XZ Utils (CVE-2024-3094, March 2024)

- https://www.cisa.gov/news-events/alerts/2024/03/29/reported-supply-chain-compromise-affecting-xz-utils-data-compression-library-cve-2024-3094
- https://www.openwall.com/lists/oss-security/2024/03/29/4
- https://research.swtch.com/xz-timeline
- https://gist.github.com/thesamesam/223949d5a074ebc3dce9ee78baad9e27

## Deliverable example

“Workflow at revision X interpolates a PR title into shell source. A local synthetic fixture produced fixed marker Y; no target workflow was triggered and no secret was accessed. Effective repository permissions remain unverified. Recommended repair: pass the title as data through an environment variable and quote expansion, then test the exact workflow with the owner.”

## Limits

This is a static evidence guide and historical research index, not authorization for package publication, upstream compromise, runner access or credential testing. Neighboring skills and helper tooling are not bundled and must not be assumed available.
