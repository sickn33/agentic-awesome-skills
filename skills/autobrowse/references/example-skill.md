---
task: sf-311-request
graduated: 2026-04-06
iterations: 22
pass_rate: 3/3 last runs passed
env: remote
---

# SF 311 Pothole Request — Browser Skill

## Purpose

Submit an anonymous pothole / street defect report to San Francisco's 311 system. Navigates the Verint form hosted at `sanfrancisco.form.us.empro.verintcloudservices.com`, enters location via ESRI map search, selects "Pothole or pavement defect" category, fills in description, submits anonymously, and reads the Service Request Number from the confirmation page.

## When to Use

Use this skill when you need to:
- Submit a pothole or street defect report to SF 311
- Navigate the SF 311 Verint form system for public works issues
- Demonstrate anonymous government form submission on sfgov infrastructure

## Quick Start

```bash
tsx scripts/evaluate.ts --task sf-311-request --env remote
```

## Browse CLI Reference

```bash
browse stop
browse open <url> --local
browse open <url> --remote
browse wait load
browse wait timeout <ms>
browse snapshot
browse click <ref>
browse click "//xpath"
browse type <text>
browse press Enter
browse press Tab
browse select "//select" <value>
browse fill "#css-id" <text>
```

Wait syntax:
- CORRECT: `browse wait load` or `browse wait timeout 2000`
- WRONG (errors): `browse wait ms 2000`, `browse wait 2000`

## Workflow

**Turn budget: 30 turns. Follow precisely. Turn 30 must be the JSON output with no tool call.**

### Startup (turns 1–5)

```bash
browse stop
browse open "https://sanfrancisco.form.us.empro.verintcloudservices.com/form/auto/pw_street_sidewalkdefect?Issue=street_defect&Nature_of_request=pavement_defect" --remote
browse wait load
```

If a daemon may already be active, run `browse stop` before opening remote; active local sessions do not switch to remote automatically.

### Page 1 — Disclaimer (turns 6–7)

```bash
browse snapshot         # find Next button ref (~0-385 or 0-386)
browse click <Next ref>
```

Click Next by ref from snapshot. Do not use XPath for the Next button.

### Page 2 — Location (turns 8–18)

```bash
browse click "//label[normalize-space(.)='Street']"
browse click "//input[@placeholder='Find address or place']"
browse type "Market St & 7th St, San Francisco, CA 94103"
browse wait timeout 2000
browse snapshot         # find autocomplete menuitem (~0-2510)
browse click <menuitem ref>
browse press Enter
browse wait timeout 3000
browse press Tab
browse snapshot         # verify Location field, find Next ref (~0-685 or 0-686)
browse click <Next ref from snapshot>
```

The Location textarea is map-driven — the ESRI geocoder populates it. Do not type into the Location field directly. After clicking the autocomplete suggestion, press Enter, wait 3000ms, then Tab — the Location field populates automatically.

### Page 3 — Request Details (turns 19–21)

```bash
browse select "//select" "Pothole or pavement defect"
browse fill "#dform_widget_Request_description" "Large pothole approximately 12 inches wide near the crosswalk, causing hazard for cyclists"
browse click 0-970
```

The Page 3 Next ref is consistently 0-970. No snapshot needed before clicking it.

### Page 4 — Contact (turns 22–25)

```bash
browse snapshot         # find anonymous radio ref (~0-58, 0-141, or 0-142)
browse click <anonymous radio ref>
browse snapshot         # find Report Anonymously button (~0-1117)
browse click <Report Anonymously ref>
```

The anonymous radio ref varies between sessions. Always snapshot to get the current ref.

### Review + Submit + Confirm (turns 26–29)

```bash
browse snapshot         # review page — find Submit ref (~0-1496)
browse click <Submit ref>
browse wait load
browse snapshot         # confirmation page: "Your Service Request Number is: XXXXXXXXX"
```

### Turn 30 — Output (no tool call)

Read the confirmation number from the snapshot and immediately output the final JSON. No further tool calls:

```json
{
  "success": true,
  "confirmation_number": "<number from snapshot>",
  "category_selected": "Pothole or pavement defect",
  "location_entered": "INTERSECTION OF 7TH ST & CHARLES J BRENHAM PL SAN FRANCISCO, CA 94102",
  "submission_method": "anonymous",
  "gotchas": [
    "Run browse stop before --remote when a daemon may already be active",
    "Location field is map-driven: type in ESRI search box, click autocomplete, Enter → wait 3000ms → Tab",
    "XPath Next buttons fail — always snapshot first and click by ref",
    "Page 3 description: use CSS selector #dform_widget_Request_description with fill",
    "Page 3 Next ref 0-970 is stable — no snapshot needed"
  ],
  "error_reasoning": null
}
```

## Site-Specific Gotchas

1. **Active daemon mode switch**: If a daemon may already be running in local or remote mode, run `browse stop` before `browse open <url> --remote`; active sessions do not switch modes automatically.

3. **Location field is map-driven**: The Location textarea is populated by the ESRI geocoder. Workflow: type in the search box → wait 2000ms → snapshot → click autocomplete suggestion → press Enter → wait 3000ms → press Tab → Location field auto-populates.

4. **XPath Next button fails**: `//button[normalize-space(.)='Next']` XPath fails to advance pages on this Verint form. Always click Next by ref obtained from a snapshot.

5. **Page 3 textarea by CSS ID**: The Request Description textarea has a stable `id="dform_widget_Request_description"`. Use `fill "#dform_widget_Request_description" <text>`.

6. **Page 3 Next ref is stable at 0-970**: No snapshot needed before clicking Next on Page 3.

7. **Anonymous radio ref varies per session**: The "No, I want to remain anonymous" radio has refs like 0-58, 0-59, 0-141, or 0-142 depending on session. Always snapshot Page 4 first.

8. **Report Anonymously button appears conditionally**: It only renders after the anonymous radio is clicked. Snapshot after clicking the radio to find its ref.

9. **Real form URL is not the sfgov.org services page**: The task.md lists `https://www.sfgov.org/services/submit-service-request` as the entry point, but the actual Verint form that accepts pothole submissions is `https://sanfrancisco.form.us.empro.verintcloudservices.com/form/auto/pw_street_sidewalkdefect?Issue=street_defect&Nature_of_request=pavement_defect`. Navigate directly to this URL.

## Known Failure Point

**The agent runs out of turns before reading the confirmation number from the final snapshot.**

The form submission itself succeeds — the Review page renders, the Submit button is clicked, and the confirmation page loads with "Your Service Request Number is: XXXXXXXXX". The failure occurs because the agent exhausts its 30-turn budget on intermediate steps (extra snapshots, retries, or verification steps not in the prescribed flow) and does not reach the final snapshot at turn 29 or cannot output the JSON at turn 30.

Specific known causes:
- Taking an extra snapshot on Page 2 to verify the location field (costs 1 extra turn)
- Retrying the Page 2 Next button via XPath instead of ref (costs 1–2 turns)
- Taking a screenshot or using `get value` to verify fields (costs turns, provides no benefit)
- Performing an extra `wait load` or `snapshot` between pages that don't need it

To recover in future runs: follow the exact turn budget above with no deviations. If a step fails, do not retry with a different approach mid-run — re-snapshot and use the fresh ref, but count that retry against budget and skip the next non-essential verification step.

## Expected Output

```json
{
  "success": true,
  "confirmation_number": "101003821426",
  "category_selected": "Pothole or pavement defect",
  "location_entered": "INTERSECTION OF 7TH ST & CHARLES J BRENHAM PL SAN FRANCISCO, CA 94102",
  "submission_method": "anonymous",
  "gotchas": [
    "Run browse stop before --remote when a daemon may already be active",
    "Location field is map-driven: type in ESRI search box, click autocomplete, Enter → wait 3000ms → Tab",
    "XPath Next buttons fail — always snapshot first and use ref ID",
    "Page 3 description: use CSS selector #dform_widget_Request_description with fill",
    "Page 3 Next ref 0-970 is stable — no snapshot needed before clicking"
  ],
  "error_reasoning": null
}
```
