# OSINT interpretation and reporting details

The root scope, data-sharing and per-command authorization gates apply throughout.
This is an evidence framework, not executable probing, social-engineering or
credential-use guidance. Former fixed severity/ownership tables, speculative
provider endpoints and unbundled engine claims are not validated capabilities.

## Typed asset graph

Keep asset identity (domain/IP/service/repository/etc.), observation, claim and
scope permission distinct. Each edge records provenance, observation time,
confidence rationale and alternatives. Do not label inferred relationships
OWNED_BY, EMPLOYED_BY or COMPROMISED as facts before verification. Shared IPs,
CDN ranges, favicons, certificates and usernames have many legitimate overlaps.
Normalize URLs/addresses carefully without collapsing case-sensitive identifiers.
Use transactional upserts and atomic sidecar publication with schema/version and
writer provenance; an early consumer does not automatically ingest late files.

## Identity and service discovery

- OIDC metadata describes an issuer/flow, not a vulnerable tenant or compromised
  account. Validate issuer and exact documented discovery version; Entra v2 uses
  the tenant authority with `/v2.0/.well-known/openid-configuration`. The `common`
  authority is not proof of one target tenant. Tenant/client identifiers are not
  inherently secrets. Device-code/public-client availability is not by itself a
  security flaw; permissions, consent, identity and policy determine exposure.
- MX records are mail-routing clues, not proof of every SSO application. A custom
  domain is not guaranteed to host its own Google OIDC discovery endpoint.
  SharePoint slugs need not equal the current brand/domain stem.
- Do not infer user existence universally from one Okta/Microsoft status code,
  SMTP 250, an enrichment database or a breach record. Catch-all routing, privacy
  defenses, policy and stale data affect outcomes. Active user/authentication
  enumeration is not passive OSINT and can trigger lockouts or contact.
- HTTP status is not a route/ownership/auth proof: soft-404 pages, redirects,
  generic denial and honeypots exist. OPTIONS/Allow does not prove authorization
  or actual supported operations. A 200 may be a login/error page. A 403 from
  cloud storage does not always establish bucket existence or ownership.
- A hostname or product banner identifies a candidate, not an asset approved for
  direct-origin probing. Historical IPs can be reassigned. Matching content and
  certificates can reflect mirrors/shared hosting. Do not disable TLS checking
  or bypass the CDN to “confirm” without specific approval.

## Cloud, applications and mobile

S3 region headers do not encode an AWS account ID. An Azure storage hostname does
not reveal the Entra tenant ID. Verify identifiers from authoritative account or
resource records rather than entropy/URL guessing. Public object/listing access
may be intended: inspect only minimal permitted synthetic material and report
actual sensitivity/permission, not automatic Critical severity.

Firebase Hosting (`firebaseapp.com`) is not a Cloud Firestore API endpoint.
Firestore uses its documented `firestore.googleapis.com` REST resource structure;
Realtime Database and Storage have distinct services, regional endpoints and
rules. Project IDs, API keys and client config alone do not prove open access.
Never retrieve a whole database as a generic availability check.

A source map does not always embed sourcesContent, and public frontend source is
not inherently High severity. JavaScript/manifest regex hits require dataflow and
context validation. Next.js manifests depend on router/build/version and do not
necessarily enumerate every dynamic route. Public GraphQL introspection or
missing certificate pinning is not universal evidence of a vulnerability.

Obtain mobile artifacts from the authorized owner or approved distribution with
version, hash and signing identity. Treat APKs/archives as untrusted: extract in
isolation with path, symlink, expanded-size and file-count limits; never run them
as reconnaissance. Store app IDs are not iOS bundle identifiers. Manifest flags,
exported components or bridges require SDK/version, reachable behavior and
permission context before severity can be assigned. A score of 70 is not proof
of ownership or permission to download/decompile.

## Vulnerability priority and severity

Use the exact affected product/version/configuration, patch/backport status and
reachability. A KEV entry establishes known exploitation of a vulnerability, not
that this particular host is affected; a banner alone is not confirmation. EPSS
estimates the probability that a CVE will be exploited in the wild within the
next 30 days, not exploit success against one host. Record model/date, base score
versus percentile, exposure and business criticality separately. Federal catalog
due dates have an applicable policy scope; they are not every client's legal SLA.

Use a documented, calibrated priority model if needed, and label invented weights
as local triage assumptions. Priority is not CVSS severity, evidence confidence,
ownership or reward eligibility. Do not turn missing HSTS, GraphQL introspection,
DMARC monitoring mode, a listable bucket or ten historical employee breach hits
into automatic High/Critical findings. Breach data does not prove current password
validity, MFA bypass, employment or present SSO compromise. Do not validate found
credentials unless a separately scoped owner-controlled process explicitly permits
it; prefer owner revocation/audit without using the secret.

## Media, time and public attribution

Preserve original files when lawful. Record timezone, upload/capture distinction,
re-encodes, metadata edits and alternative explanations. Screenshot crops are
working derivatives with their own hashes, not complete originals. A 2 KiB
truncated HTTP body may omit the relevant evidence; keep restricted originals
only where authorized, and document truncation. Hashes/logs do not guarantee a
live service can be replayed or establish court admissibility.

EXIF, shadows, language, maps and reverse-image search can support hypotheses;
none is an automatic precise location/time/identity proof. AI image/geolocation
scores and content credentials have specific coverage/validation limits. Do not
upload private faces, documents, unique URLs or malware to public search/sandbox
services without permission. C2PA/provenance, detection confidence and factual
truth are separate questions. Multiple articles copying one source are not
independent corroboration. Do not identify private people or infer sponsorship
from shared infrastructure alone.

## Blockchain interpretation

A zero-knowledge validity proof does not inherently hide all L2 transactions.
Use the exact rollup's explorer, data-availability, state and proof model. Separate
sequencer inclusion, L1 inclusion, settlement/finality and withdrawal delay; a
seven-day challenge period is not a universal latency for every transaction or
rollup. Track chain IDs, token decimals, bridge messages, mint/burn/wrap semantics,
fees and amounts. Address clustering and vendor labels are hypotheses; swaps,
bridges, MEV and shared services do not establish one-to-one ownership or illicit
intent. Do not deanonymize individuals from weak timing correlations.

## Communication, disclosure and limits

Return a draft with exact scope/version, observed facts, inferred impact,
confidence rationale, limitations, remediation and sources. Do not claim a data
breach, statutory notification deadline, fixed remediation cost or proven
compromise without applicable evidence and qualified owner/legal review.

RFC security.txt or a provider contact is a reporting route, not permission for
probing. Obtain current official contacts; do not assume old email addresses or
automatic secret revocation cover a finding. A 90-day policy is not universal
permission to publish after that interval. Coordinate scope, notification and
disclosure with the responsible owner; sending, publication and registration of
domains/resources require explicit authorization. No material should promise
phishing success, bypass “every” brand defense or turn discovered personal data
into pretexts. Stop at approved assessment recommendations.

## Primary references

- [Microsoft OIDC](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
- [Cloud Firestore REST API](https://firebase.google.com/docs/firestore/use-rest-api)
- [FIRST EPSS](https://www.first.org/epss/)
- [CISA KEV catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)

No runtime probes, third-party account actions, credential validation or external
uploads are performed by reading this guide. Upstream attribution remains in the
root frontmatter; neither source attribution nor this review certifies legal rights
for every independently acquired dataset.
