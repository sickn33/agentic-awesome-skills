# Sector-Specific Recon Notes

> **AAS adaptation:** Read the authorization gate in [the skill](../SKILL.md) before any target request, credential use, or data collection. These are reference examples, not an instruction to run a sweep. Select only explicitly approved targets and techniques; set request, time, byte and concurrency limits and stop on errors or scope changes. Preserve TLS verification. Treat discoveries, pattern matches and historical provider claims as leads, not verified ownership, permission or severity. Minimize personal data and redact credentials before reports; do not send private evidence to public services. Prices, quotas, API shapes and tool availability require current official documentation. Changes and original source hashes are recorded in [the notice](../UPSTREAM-NOTICE.md).


> Reference content for the `offensive-osint` skill. Originally §47 of the monolithic SKILL.md (refactored 2026-05-02 for size/load efficiency).

## 47. Sector-Specific Recon Notes

Most recon generalizes; some sectors have unique attack-surface elements worth flagging.

### 47.1 Healthcare

- **DICOM** (medical imaging) — port 11112, sometimes 4242 (testing).
- **HL7 v2** (clinical messaging) — port 2575 (TCP, often plaintext).
- **HL7 FHIR** (modern REST API) — typically `/fhir/R4/<resource>` paths; OAuth / SMART-on-FHIR auth posture varies wildly.
- **PACS / RIS / EHR systems** — Epic (`*.epic.com` SaaS), Cerner/Oracle Health, Allscripts/Veradigm, Athenahealth, NextGen, Meditech, eClinicalWorks. Each has known CVE history.
- **Searches:** `site:{domain} ("EHR" OR "PACS" OR "PHI" OR "HIPAA")`, `intitle:"Epic Systems" "{target}"`.
- **Severity escalation:** sensitive patient data deserves urgent owner review. Severity requires demonstrated access, data sensitivity and impact; an open port is not proof of PHI exposure or unauthenticated access.

### 47.2 Finance

- **SWIFT terminals** — prioritize unexpected external reachability for owner review; reachability alone does not establish transaction control or critical severity. Look for SWIFT Alliance Web Platform.
- **FIX protocol** (electronic trading) — port 9876 (common); cleartext.
- **Bloomberg terminals** — typically VDI; check for `bloomberg.com`-related auth surfaces.
- **Trading platform vendors** — Fidessa, Charles River, Eze Software, Aladdin (BlackRock).
- **Banking middleware** — Temenos T24, Finacle (Infosys), FIS, Jack Henry, Fiserv. Each has known CVE history.
- **Searches:** `site:{domain} ("PCI" OR "SOX" OR "GLBA" OR "MAS")`, `intitle:"Temenos" "{target}"`.
- **Severity escalation:** prioritize actual sensitive-account or transaction-control exposure. Public interface reachability alone is not critical compromise; distinguish intended access, authentication and demonstrated impact.

### 47.3 ICS / SCADA / OT

> **Caution:** ICS/SCADA assets often run on legacy systems where active requests, including nominally read-only scans, can cause disruption. **Do not actively probe ICS without explicit RoE coverage and operator coordination with the OT team.**

- **Modbus** — port 502 (TCP).
- **BACnet** — port 47808 (UDP).
- **Siemens S7** — port 102 (ISO-TSAP).
- **DNP3** — port 20000 (TCP).
- **EtherNet/IP** — port 44818 (TCP).
- **Niagara Framework** — port 1911, 4911, 5011, 502.
- **Honeywell EBI / Tridium** — varies.
- **GE Proficy / iFIX** — varies.
- **Common findings:** unauthenticated read access (BACnet point list, Modbus register read), default credentials on HMI panels, public-facing engineering workstations.
- **Sources:** Shodan ICS-specific filters (`port:502`, `tag:ics`), Censys, Onyphe.
- **Detectability:** medium-to-high; ICS networks often have low background traffic and are heavily monitored.

### 47.4 IoT / Consumer / SOHO

- **MQTT** — port 1883 (cleartext), 8883 (TLS). Topics often readable without auth.
- **CoAP** — port 5683 (UDP).
- **UPnP / SSDP** — port 1900 (UDP); often discloses internal device map.
- **Common router admin patterns:** `/cgi-bin/`, `/setup.cgi`, `/admin/index.html`. Do not assume default credentials or test them without explicit account-testing authorization.
- **Camera DVRs / NVRs** — Hikvision, Dahua, Axis. Multiple CVEs.
- **Smart-home hubs** — exposed APIs sometimes leak auth tokens.

### 47.5 Government

- **`.gov` and `.mil` domains** require special engagement-scope discipline.
- **FedRAMP / FISMA / DoD CMMC** — identify applicable requirements, not an assumed security posture.
- **OSINT data sources:** USAspending.gov, SAM.gov (System for Award Management), FBO.gov / sam.gov (procurement).
- **Common findings:** vendor of record disclosed in public contracts → adjacent-vendor pivot.
- **Severity:** depends on demonstrated technical impact and data sensitivity; jurisdiction and reporting obligations must be evaluated separately.

### 47.6 Maritime / Aviation / Auto

- **Maritime:** AIS (Automatic Identification System) — vessel positions; tools MarineTraffic, VesselFinder. Engine telemetry sometimes exposed via VSAT.
- **Aviation:** ADS-B (already covered §32.3); operator/airline-specific OPS data sometimes exposed.
- **Automotive:** OEM telematics backends (Tesla, GM OnStar, etc.) — typically authenticated, but APIs leak via mobile-app reverse engineering.

### 47.7 Universal sector caveat

**Most external recon techniques apply universally.** Sector-specific protocols add attack surface; sector-specific compliance regimes add reporting requirements. Don't assume "healthcare/finance/etc. has different OSINT" — the OSINT is the same; the targeted services differ.

---
