# MCP and CLI pipeline audit — 2026-09-06

## Scope

Base: `9e3fea2019c8c7bddf289173fadf0ceddc5b67dd`. Review the supported agent-owned preview path: package entrypoints, verified local catalog and runtime cache, MCP initialization and transport, the nine discovery/selection/evidence tools, CLI manifest creation/validation, immutable planning and default write guards. No release, existing client configuration, live cloud integration, experimental apply/recovery certification or new benchmark is included.

## Confirmed defects and repair

1. At 32 pending frames, the MCP queue returned `AAS_MCP_QUEUE_FULL` with `id: null` even for a valid identified call. A client could not associate the rejection with its pending call. The rejection path now strictly parses the bounded frame and retains a bounded valid ID. It never extracts an ID from raw malformed JSON.
2. Notification handling could produce responses for tools/resource calls, overload and handler exceptions. Conversely, calling `notifications/initialized` with an ID received no response. Valid notifications are now silent; an identified misuse receives an explicit correlated error.
3. An invalid envelope could reflect an object-valued ID, and an invalid envelope without an ID could be silently ignored. Invalid IDs are rejected before envelope error construction, while malformed envelopes receive an invalid-request error.

The queue capacity, frame/argument limits, exact skill selection, read-only MCP contract and preview-only target behavior are unchanged. Regression cases cover rejected-call IDs, duplicate-key JSON, long IDs, notifications, malformed envelopes, handler exceptions and a real child-process stdio burst. The original queue/notification cases were observed failing before repair.

## Verification record

The baseline Core suite passed 171 tests and validated the complete 2,113-record catalog. The final focused Core suite passed 175 tests. Catalog integrity, documentation security and generated-plugin parity passed; repository-wide results are recorded with the PR.

The [installed-candidate receipt](mcp-cli-pipeline-2026-09-06-receipt.json) passed on macOS arm64 with Node 24.19.0. Its tarball is a locally built candidate with package metadata 16.8.0, not the published v16.8.0 artifact.

The installed candidate smoke uses `verification/aas-preview/run-installed-candidate.mjs` with an actual local npm tarball, an isolated installation and Node 24 on macOS. It covers CLI initialization, deterministic composition, validation, planning, read-only diagnosis, disabled-by-default writes, all nine MCP tools, resource reads, support-file digests, traversal rejection, evidence export/inspection and catalog comparison. Project/cache snapshots must remain unchanged across MCP operations.

This packed stdio client is a functional verifier, not a Codex or Claude application session. It does not prove native interception of every attempted filesystem/network operation, a remote registry release, Windows behavior or transactional crash recovery. Registry download and cache failure cases remain separately exercised by the existing Core tests.

Protocol reference: [JSON-RPC 2.0](https://www.jsonrpc.org/specification), request/response correlation and notification rules.
