# JavaScript and Electron application artifacts

Use `analyze_javascript_application` directly on the operator-supplied ASAR or
extracted tree. The complete result, graph, and Evidence context are returned
inline when they fit the MCP frame. Source-map contents are part of the static analysis. Start from its
findings, coverage, unknowns, and graph context, then make a focused follow-up
only when a specific question remains unanswered.

An oversized response reports `resource_constraint` and
`details.resource: "transport"`. Reuse
`details.reported_limits.evidence_reference` with `inspect_analysis_view` for a
summary, one module, or a stable page of module identities. Use
`trace_application_feature` once a module, route, or string seed is known.
`export_evidence_bundle` writes the complete canonical session to a
caller-selected file. These workflows keep the original Evidence and coverage;
a broad follow-up can also exceed framing.

BrowserWindow preferences, preload and contextBridge surfaces, IPC
registrations, utility processes, and native binding requests are static syntax
observations. Only a unique exact literal IPC channel match supports an inferred
pairing. Dynamic or ambiguous channels remain unresolved. A requested `.node`
member is not a verified native export. Never claim runtime reachability,
registration, defaults, or policy enforcement from static analysis.

Use `trace_application_feature` on existing application Evidence for one
literal node ID, route, string, API, IPC channel, module, or native export.
Choose a direction and reuse the returned application Evidence ID when the
connected server advertises retained references, or supply complete Evidence
inline. Include
Hopper or Ghidra Evidence only when its artifact digest matches exactly.

For version comparison, analyze each version once, then call
`compare_application_versions`. Accept only its digest, source-map, structural
fingerprint, or non-module semantic matches. Module ordinals and minified names
are not persistent identity. Report added or removed only with complete
opposite-side coverage; otherwise report unknown.

When the question asks how one exact exported callable's returned object shape
changed, analyze each version once and then call
`compare_javascript_export_shapes` with explicit module paths and export names.
Use the returned IDs on the same connection, or complete inline Evidence
records, from both analysis calls. Accept variant
pairing only through the tool's unique exact literal discriminant. Read
`property_inventories` and each change's `presence` before treating `unknown` as
"the name was not observed": inventories list observed property names even when
values stay unknown, with a `source_range` for each paired or unpaired variant.
Array holes and mutation-invalidated slots are not observed properties.
Complete parent coverage reports presence-only
`added`/`removed` independently of unresolved values. Cite the
comparison Evidence and report JSON Pointer changes; dynamic values, ambiguous
variants, and incomplete parent-property coverage stay unknown. This is static
inference, not runtime behavior. When runtime semantics are needed, run
behavioral probes against the relevant application versions and capture them
through the available browser, Electron, or process workflows.

## Reusing application Evidence

When advertised by the connected server, application trace and compare tools
accept complete inline Evidence or
`{"kind":"retained-evidence","evidence_id":"ev_<64 lowercase hex characters>"}`
for their application input (`application`, or `left`/`right`). `inspect_analysis_view`
uses the same retained-reference form in `source`, or portable inline Evidence,
to project a summary, module page, or one module with its recorded observations. This notation is
a template: replace it with the actual returned ID. Versions before 4.1.0 accept only full
inline Evidence. Use the exact ID
returned by the producer on the same MCP connection. Resolution does not run
analysis or select a provider; findings remain inline. Native observation
arrays still take full Evidence. `close_binary` clears retained references;
export a bundle before closing, or supply portable inline Evidence in another
connection. A missing reference includes its ID and recovery guidance.
