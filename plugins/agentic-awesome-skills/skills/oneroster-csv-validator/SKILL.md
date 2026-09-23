---
name: oneroster-csv-validator
description: "Validates 1EdTech / IMS Global OneRoster v1.1 and v1.2 CSV roster sets: manifest integrity, bulk vs delta strictness, foreign key references, and encoding sanitization. Trigger phrases: oneroster csv validator, validate oneroster zip, clever roster error, oneroster sourcedid."
category: testing
risk: safe
source: community
source_repo: wwewtech/oneroster-csv-validator
source_type: community
date_added: "2026-09-22"
author: wwewtech
tags: [edtech, oneroster, csv-validation, ims-global, 1edtech, data-engineering]
tools: [claude, cursor, gemini, windsurf]
license: "MIT"
---

# OneRoster CSV Validator: Strict 1EdTech Data Integrity & Pre-Flight Linter

Perform rigorous pre-flight validation on OneRoster v1.1 and v1.2 CSV roster bundles prior to SIS/Clever/ClassLink ingestion: audit foreign key referential integrity, eliminate orphan enrollments, enforce bulk vs delta partitioning, and sanitize encoding traps.

## When to Use This Skill

Activate this skill when:
- Validating or debugging student information system (SIS) roster export packages (`.zip` archives or CSV directories) for OneRoster v1.1 or v1.2 compliance.
- The user asks: "Why is Clever rejecting our OneRoster zip file?", "Check for orphaned userSourcedIds in enrollments.csv", "Validate bulk vs delta mode in OneRoster CSVs", or "Sanitize UTF-8 BOM characters from school rosters".
- Auditing relational integrity across `manifest.csv`, `orgs.csv`, `users.csv`, `courses.csv`, `classes.csv`, `enrollments.csv`, and `academicSessions.csv`.
- Preparing automated pre-flight CI/CD pipelines to catch corrupted student or teacher records before nightly SIS sync runs.

Do NOT use this skill when:
- Integrating OneRoster REST / OAuth 2.0 API endpoints (this skill focuses strictly on CSV table bindings).
- Generating synthetic or fabricated student PII without authorization.
- Working on generic non-standard CSV spreadsheets that do not follow 1EdTech specifications.

## Core Mental Models & Non-Negotiable Rules

1. **The Manifest Root Authority Law**:
   - `manifest.csv` MUST reside strictly at the root level of the ZIP archive (never nested inside a subfolder).
   - It MUST declare the exact specification version: `oneroster.version,1.1` or `oneroster.version,1.2`.
   - It MUST list every single file present in the exchange. If a CSV file is present in the archive but omitted from `manifest.csv`, or listed in `manifest.csv` but missing from the zip, the package is rejected.

2. **The Strict Bulk vs Delta Partition**:
   - One exchange bundle = strictly ONE operational mode.
   - **Bulk Exchange Mode**: Represents a complete master snapshot. In OneRoster 1.1, rows MUST NOT contain `dateLastModified` or `status` columns. In 1.2, all status fields MUST be `active`.
   - **Delta Exchange Mode**: Represents incremental changes. Every row MUST contain a valid ISO 8601 UTC timestamp (`YYYY-MM-DDTHH:MM:SS.sssZ`) in `dateLastModified` and a valid status (`active` or `tobedeleted`).
   - Mixing bulk and delta formats within the same archive is a fatal validation failure.

3. **The Foreign Key Referential Integrity Hierarchy**:
   - Relational dependency chain:
     $$\mathbf{orgs.csv} \longleftarrow \mathbf{courses.csv} \longleftarrow \mathbf{classes.csv} \longleftarrow \mathbf{enrollments.csv} \longrightarrow \mathbf{users.csv}$$
   - Every `schoolSourcedId` in `users.csv` and `classes.csv` MUST resolve to an existing `sourcedId` in `orgs.csv`.
   - Every `courseSourcedId` in `classes.csv` MUST resolve to `courses.csv`.
   - Every `userSourcedId` and `classSourcedId` in `enrollments.csv` MUST resolve to active primary keys in `users.csv` and `classes.csv`.
   - **Zero Orphan Tolerance**: A single orphan link (e.g. enrolling a deleted student ID) invalidates the batch.

4. **Strict Role Enum Constraint Axioms**:
   - In `users.csv`: `role` MUST strictly match the OneRoster enum:
     - v1.1: `administrator`, `proctor`, `student`, `teacher`.
     - v1.2: adds `aide`, `guardian`, `parent`, `staff`.
   - In `enrollments.csv`: `role` is strictly constrained to `administrator`, `proctor`, `student`, `teacher`. Custom vendor roles (`substitute`, `dean`) must be mapped to valid specification enums.
   - Primary `sourcedId` values MUST be case-sensitively unique strings (RFC 4122 UUID format strongly recommended).

5. **RFC 4180 CSV & UTF-8 BOM Sanitization**:
   - Files MUST be encoded in **UTF-8 without Byte Order Mark (BOM)**.
   - Microsoft Excel frequently prepends `\xEF\xBB\xBF` to CSV exports, corrupting the first column name (`﻿sourcedId` $\neq$ `sourcedId`).
   - Fields containing commas, double-quotes, or newlines MUST be enclosed in double quotes (`"`). Literal quotes inside fields must be escaped as `""`.

## Named Sins & Anti-Patterns (Что категорически ЗАПРЕЩЕНО)

| Anti-Pattern | Manifestation in CSV Packages | Mandatory Production Counter-Rule |
| :--- | :--- | :--- |
| **Nested Archive Packaging** | Zipping a parent folder (`district_roster/manifest.csv`). | Manifest and CSVs MUST reside at the archive root (`/manifest.csv`). |
| **The UTF-8 BOM Trap** | Excel export injecting `\xEF\xBB\xBF` into `sourcedId`. | Strip BOM headers during pre-flight sanitization pass. |
| **Orphan Enrollment Links** | `enrollments.csv` pointing to non-existent user IDs. | Enforce foreign key validation across all entity files before import. |
| **Bulk / Delta Column Bleed** | Including `dateLastModified` or `tobedeleted` in bulk. | Enforce schema separation: bulk files must not contain delta headers. |
| **Circular Org Hierarchies** | School A listed as parent of School B, and vice-versa. | Perform directed acyclic graph (DAG) cycle detection on `orgs.csv`. |
| **Illegal Role Strings** | Using non-standard strings like `counselor` or `sub`. | Map all roles to standard enums (`administrator`, `teacher`, `student`). |
| **Malformed ISO 8601 Timestamps** | Writing `"09/22/2026 14:00"` instead of ISO 8601. | Enforce strict RFC 3339 UTC format: `YYYY-MM-DDTHH:MM:SS.sssZ`. |
| **Unescaped CSV Commas** | Unquoted commas in user names (`Doe, John`) shifting columns. | Wrap text fields containing commas in standard RFC 4180 quotes. |
| **Missing Mandatory Core Files** | Exporting a bulk zip without `academicSessions.csv`. | Confirm all 7 mandatory core files exist in zip and manifest. |
| **Hallucinated SourcedIDs** | Inventing arbitrary IDs during reconciliation. | Preserve authoritative SIS primary keys without synthetic generation. |

## Concrete Archetypes / Presets

### Archetype 1: Pre-Flight Python Referential Integrity Linter
```python
import csv
import io
import re
import zipfile
from typing import Dict, List, Set

CORE_FILES = [
    "manifest.csv", "orgs.csv", "users.csv", "courses.csv",
    "classes.csv", "enrollments.csv", "academicSessions.csv"
]
VALID_ROLES_1_1 = {"administrator", "proctor", "student", "teacher"}

def validate_oneroster_archive(zip_path: str) -> dict:
    errors = []
    warnings = []

    with zipfile.ZipFile(zip_path, 'r') as z:
        names = z.namelist()

        # 1. Manifest Root Check
        if "manifest.csv" not in names:
            return {"status": "FATAL", "errors": ["manifest.csv missing from zip root."]}

        # 2. Extract and Parse Core Sets
        data: Dict[str, List[dict]] = {}
        keys: Dict[str, Set[str]] = {}

        for filename in CORE_FILES:
            if filename in names:
                raw_bytes = z.read(filename)
                # Strip UTF-8 BOM if present
                if raw_bytes.startswith(b'\xef\xbb\xbf'):
                    warnings.append(f"{filename} contains UTF-8 BOM; stripped automatically.")
                    raw_bytes = raw_bytes[3:]

                reader = csv.DictReader(io.StringIO(raw_bytes.decode('utf-8', errors='replace')))
                rows = list(reader)
                data[filename] = rows
                if rows and "sourcedId" in rows[0]:
                    keys[filename] = {r["sourcedId"] for r in rows if "sourcedId" in r}
            else:
                errors.append(f"Mandatory core file missing: {filename}")

        # 3. Foreign Key Checks
        if "orgs.csv" in keys and "users.csv" in data:
            for r in data["users.csv"]:
                org_ref = r.get("orgSourcedIds") or r.get("schoolSourcedId")
                if org_ref and org_ref not in keys["orgs.csv"]:
                    errors.append(f"users.csv: user {r.get('sourcedId')} references non-existent org {org_ref}")

        if "users.csv" in keys and "classes.csv" in keys and "enrollments.csv" in data:
            for r in data["enrollments.csv"]:
                uid = r.get("userSourcedId")
                cid = r.get("classSourcedId")
                if uid not in keys["users.csv"]:
                    errors.append(f"enrollments.csv: orphan enrollment references missing user {uid}")
                if cid not in keys["classes.csv"]:
                    errors.append(f"enrollments.csv: orphan enrollment references missing class {cid}")

                role = r.get("role")
                if role not in VALID_ROLES_1_1:
                    errors.append(f"enrollments.csv: illegal role '{role}' on user {uid}")

    return {
        "status": "FAILED" if errors else "PASSED",
        "errors": errors,
        "warnings": warnings,
        "total_records_checked": sum(len(v) for v in data.values())
    }
```

### Archetype 2: Minimal Valid OneRoster v1.1 Manifest
```csv
propertyName,value
oneroster.version,1.1
file.orgs,bulk
file.users,bulk
file.courses,bulk
file.classes,bulk
file.enrollments,bulk
file.academicSessions,bulk
```

### Archetype 3: Delta Synchronization Row Example
```csv
sourcedId,status,dateLastModified,userSourcedId,classSourcedId,role,primary
enr_99201,active,2026-09-22T08:30:00.000Z,usr_0421,cls_bio101,student,true
enr_99202,tobedeleted,2026-09-22T08:30:00.000Z,usr_0884,cls_bio101,student,false
```

## The Pre-Emit Quality Gate Checklist

Before emitting validation results, CSV transforms, or roster scripts:
- [ ] **Root Location**: Confirmed `manifest.csv` is located strictly at `/` without folder nesting.
- [ ] **BOM Scrubbing**: Verified all CSV headers are clean UTF-8 without `\xEF\xBB\xBF`.
- [ ] **Mode Consistency**: Verified no delta columns exist in bulk packages, and timestamps exist in deltas.
- [ ] **Referential Integrity**: 100% check of `userSourcedId`, `classSourcedId`, `orgSourcedIds`, and `courseSourcedId`.
- [ ] **Role Enum Validation**: Confirmed all role values match 1EdTech specifications.
- [ ] **Cycle-Free Orgs**: DAG validation run on `orgs.csv` to ensure no circular parent references.
- [ ] **RFC 4180 Escaping**: Commas, quotes, and multi-line values enclosed in double quotes.

## Self-Correction & Verification Loop

### Bad (Vibe-Coded AI Slop Output):
> "Zip your CSV folder up and upload it. If Clever says there is a missing manifest, just add a blank manifest.csv inside the folder. If some student IDs are missing in enrollments, just delete those rows or invent temporary user IDs."
*Problems: Nested zip breaks root discovery, blank manifest violates schema, inventing fake IDs corrupts student records, ignores UTF-8 BOM.*

### Good (Production OneRoster CSV Validator Output):
> 1. Extract zip to verify `/manifest.csv` exists at the root path; confirm `oneroster.version` is declared as `1.1`.
> 2. Scan all CSV headers: detect and strip UTF-8 BOM (`\xEF\xBB\xBF`) from `users.csv` to prevent header corruption.
> 3. Perform foreign key referential integrity pass:
>    - Flag 4 orphan rows in `enrollments.csv` referencing deleted student ID `usr_9914`.
>    - Flag invalid role `"substitute_teacher"` on row 14 of `enrollments.csv` (must map to `"teacher"`).
> 4. Verify bulk purity: confirm no `dateLastModified` or `tobedeleted` status flags are present in bulk mode.
> 5. Emit clean, line-numbered pre-flight audit report before committing to SIS ingestion.

## Limitations

- OneRoster version details and required files can differ by exchange profile and vendor implementation. Validate against the exact 1EdTech specification and recipient's current import contract before rejecting or transforming a roster.
- Student and staff roster files contain sensitive education records. Process only with authorization, minimize retained data, redact identifiers in diagnostics, and do not upload source CSVs to external services.
- The included snippets are illustrative, not a complete certified validator; for example, large files, namespaces, delta semantics, and vendor extensions require additional handling and tests.
