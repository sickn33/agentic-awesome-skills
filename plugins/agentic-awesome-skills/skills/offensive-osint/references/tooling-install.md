# Tooling Quick-Install

> **AAS adaptation:** Read the authorization gate in [the skill](../SKILL.md) before any target request, credential use, or data collection. These are reference examples, not an instruction to run a sweep. Select only explicitly approved targets and techniques; set request, time, byte and concurrency limits and stop on errors or scope changes. Preserve TLS verification. Treat discoveries, pattern matches and historical provider claims as leads, not verified ownership, permission or severity. Minimize personal data and redact credentials before reports; do not send private evidence to public services. Prices, quotas, API shapes and tool availability require current official documentation. Changes and original source hashes are recorded in [the notice](../UPSTREAM-NOTICE.md).


> Reference content for the `offensive-osint` skill. Originally §46 of the monolithic SKILL.md (refactored 2026-05-02 for size/load efficiency).

## 46. Tooling Quick-Install

External installation templates, not bundled tools or permission to install everything. Select only a required tool; verify its official repository, exact reviewed release/commit, checksum/signature and dependency tree. Install in an isolated environment without elevated privileges. Replace each version placeholder before use; these examples have not been executed by AAS. Cloud frameworks can create billable resources and require explicit approval.

### 46.1 Subdomain enumeration

```bash
# Subfinder (passive, fast)
go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@<reviewed-version>

# Amass (thorough, slow)
go install github.com/owasp-amass/amass/v4/...@<reviewed-version>

# Assetfinder
go install github.com/tomnomnom/assetfinder@<reviewed-version>

# DNSx (resolution + brute)
go install github.com/projectdiscovery/dnsx/cmd/dnsx@<reviewed-version>

# Puredns (brute-force with wildcard handling)
go install github.com/d3mondev/puredns/v2@<reviewed-version>
```

### 46.2 HTTP probing & enrichment

```bash
# httpx (tech-detect, status, JARM, favicon)
go install github.com/projectdiscovery/httpx/cmd/httpx@<reviewed-version>

# Gowitness (screenshots)
go install github.com/sensepost/gowitness@<reviewed-version>

# Aquatone (screenshots + clustering)
go install github.com/michenriksen/aquatone@<reviewed-version>
```

### 46.3 Vulnerability scanning

```bash
# Nuclei (template scanner)
go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@<reviewed-version>
# Review and pin the exact template revision separately; do not auto-update templates.

# Naabu (port scan)
go install github.com/projectdiscovery/naabu/v2/cmd/naabu@<reviewed-version>

# Masscan (fast port scan; requires sudo)
git clone https://github.com/robertdavidgraham/masscan  # inspect and pin a reviewed commit before any build
```

### 46.4 Content discovery

```bash
# Ffuf (fuzzer / dirbuster)
go install github.com/ffuf/ffuf/v2@<reviewed-version>

# Gobuster
go install github.com/OJ/gobuster/v3@<reviewed-version>

# Feroxbuster (recursive content disco)
cargo install feroxbuster --version <reviewed-version> --locked
```

### 46.5 JS / endpoint extraction

```bash
# Katana (crawler)
go install github.com/projectdiscovery/katana/cmd/katana@<reviewed-version>

# GoSpider
go install github.com/jaeles-project/gospider@<reviewed-version>

# LinkFinder (JS endpoint regex)
git clone https://github.com/GerbenJavado/LinkFinder  # pin and review code/dependencies before installation

# Subjs (extract JS URLs from HTML)
go install github.com/lc/subjs@<reviewed-version>
```

### 46.6 Wayback / archive

```bash
# gau (get all urls from Wayback + others)
go install github.com/lc/gau/v2/cmd/gau@<reviewed-version>

# Waybackurls
go install github.com/tomnomnom/waybackurls@<reviewed-version>
```

### 46.7 Cloud / AWS

```bash
# AWS CLI
python3 -m pip install awscli==<reviewed-version>
# or: brew install awscli

# Cloud_enum (S3/Azure/GCP enum)
git clone https://github.com/initstring/cloud_enum  # pin and review code/dependencies before installation

# S3Scanner
python3 -m pip install s3scanner==<reviewed-version>

# CloudSploit
git clone https://github.com/aquasecurity/cloudsploit  # pin and inspect lifecycle scripts before any installation
```

### 46.8 Identity / SSO

```bash
# o365creeper / o365enum
git clone https://github.com/gremwell/o365enum

# CredMaster (per-protocol auth probe)
git clone https://github.com/knavesec/CredMaster
```

### 46.9 Mobile

```bash
# google-play-scraper (Python)
python3 -m pip install google-play-scraper==<reviewed-version>

# androguard (APK static analysis)
python3 -m pip install androguard==<reviewed-version>
# or: brew install androguard

# apkleaks (secret scan in APK)
python3 -m pip install apkleaks==<reviewed-version>
```

### 46.10 TLS / cert

```bash
# sslyze
python3 -m pip install sslyze==<reviewed-version>

# testssl.sh
git clone --depth 1 https://github.com/drwetter/testssl.sh.git

# JARM
python3 -m pip install pyjarm==<reviewed-version>

# Cert-spotter / certgraph
go install github.com/lanrat/certgraph@<reviewed-version>
```

### 46.11 Misc utilities

```bash
# Anew (line-dedup that streams)
go install github.com/tomnomnom/anew@<reviewed-version>

# Gf (regex-based grep templates)
go install github.com/tomnomnom/gf@<reviewed-version>

# Hakrawler (web crawler)
go install github.com/hakluke/hakrawler@<reviewed-version>

# Trufflehog (secret scanner)
go install github.com/trufflesecurity/trufflehog@<reviewed-version>

# Gitleaks
go install github.com/zricethezav/gitleaks/v8@<reviewed-version>

# jq (JSON parsing)
# Install an exact approved jq package through the host package manager only after authorization.
```

### 46.12 Frameworks / orchestration

```bash
# ProjectDiscovery's "PDTM" (manages the full PD toolkit)
go install -v github.com/projectdiscovery/pdtm/cmd/pdtm@<reviewed-version>
# Select one required reviewed tool; do not run install-all.

# reconftw (scripted recon framework)
git clone https://github.com/six2dez/reconftw  # do not run install.sh before code/dependency review

# Axiom (distributed recon on cloud nodes)
git clone https://github.com/pry0cc/axiom  # cloud provisioning requires separate account/cost approval
```

---
