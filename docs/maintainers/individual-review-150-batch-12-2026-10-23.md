# Individual skill review — batch 12 (150 roots)

Date: 2026-10-23. Inventory base: `dee7acce0658c35cb276154892700811affcfdb2`.

Reviewed **150 complete tracked trees / 279 files**: **142 corrected**, **8 retained**. The base has 2,641 actual root trees containing 2,743 SKILL entrypoints (including nested entrypoints); non-SKILL roots and aliases are excluded.

Each assigned source and support file was read in full as inert material. Findings address concrete semantics, examples, risk, safety and missing dependencies. Metadata, authorship and bundled license notices were preserved; this is not an upstream license audit. The companion JSON records every original/final SHA-256 and Git mode, using base Git bytes and the isolated working source.

## Validation and boundaries

- All 150 assigned roots and every tracked support file fully read as inert data
- 49 strict JSON fenced examples parsed; 124 Python fenced examples and all tracked .py files parsed after correcting SDK exception blocks
- 11 bundled skill-porter temporary-fixture tests passed without network
- 7 Apify runner copies passed mocked-fetch bearer/deadline/cap and private exclusive CSV export regressions (heterogeneous keys, >200 characters, multiline cells, formula guard, overwrite refusal)
- Multi-source validator passed valid ledger and six unhashable-type regressions plus URL normalization/credential URL rejection
- Wiki helper four temporary-directory offline cases passed (existing destination, shell metacharacters, missing option value, broken symlink)

- Nine plugin compatibility tests passed with the current Claude-only source fixture; classifier and blocking policy unchanged.
- PostgreSQL mocked connection/SHOW/display-bound/TLS/cleanup fixtures passed.

- Nine specialized pure-example tests passed after the reviewed embedding fixture refresh, including synchronous record output and currency/code-symbol preservation.

Final exact-head static checks and their results belong in the PR body after the source/report commit. This report does not fabricate their result or serve as merge authority.

- No live cloud/API/Actor/database/browser/device/security-target execution
- No complete client runtime/integration certification
- No independent upstream authorship/license-chain audit; all declared provenance and bundled licenses preserved
- No Tessl review pass or exact-current-head maintainer merge attestation claimed
- No whole-catalog certification or generated/mirror synchronization; protected canonical sync owns generated state

## Individual dispositions

### threejs-materials — corrected

Read root and complete material guide. Corrected legacy UV-channel assumption, nonexistent stencilMask property, automatic batching claim and identity modelViewMatrix override in RawShaderMaterial. Shader/node/loader imports remain installed-version dependent; examples not rendered.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://threejs.org/docs/pages/Texture.html, https://threejs.org/docs/pages/Material.html, https://threejs.org/docs/pages/RawShaderMaterial.html

### n8n-validation-expert — corrected

Read root and full validation guide. Corrected MCP-specific sanitization presented as universal core behavior, destructive live binary-search/database recovery suggestions, and deleting intentional multiple triggers. Added actual schema/typeVersion/export/synthetic-run boundaries; no workflow activated.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://docs.n8n.io/flow-logic/, https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.manualworkflowtrigger/

### learning-career-development — corrected

Read complete single-file training template. Made completion date and assessment score optional for enrolled/in-progress learners, aligned mandatory booleans, bounded progress and duration in SQL/JSON, and fixed broken catalog link. Empty-template and HR/privacy constraints retained; score scale remains course-specific.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### competitor-ad-intelligence — corrected

Read full public-ad research procedure and report. Corrected unsupported identification of A/B tests and campaign identity from shared landing URLs, and scoped absence/white-space claims to observed samples. Existing public-scope, provenance, private-network, copyright and performance-inference constraints retained.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### azure-resource-manager-postgresql-dotnet — corrected

Read complete SDK guide. Fixed async .Result misuse, unsafe TLS/certificate bypass and embedded password, public/private firewall confusion and cross-customer Azure exception scope; removed stale current-version claim and blanket dual-auth advice. Added distinct ARM/database permission and token-refresh boundaries. SDK snippets require installed-version compilation; no Azure resources touched.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://www.npgsql.org/doc/security.html, https://learn.microsoft.com/en-us/azure/postgresql/security/security-firewall-rules

### model-registry-governance — corrected

Read complete registry guide. Fixed invalid timestamp conversion, ignored tracking URI, absent deprecation timestamp, public unauthenticated local server defaults, Rego v1 syntax and high/critical approval gap. Registration now fails explicitly until a real flavor-logged model URI replaces nonexistent /model artifact. Clearly separates mutable tags/scores from protected authenticated policy enforcement and legacy stages from aliases.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://mlflow.org/docs/latest/ml/model-registry/workflow/

### soc2-compliance — corrected

Read full checklist, shell collector and CI example. Corrected certification terminology, incomplete-checklist authority, invented GitHub roles and shell-breaking inline HTML. Added private evidence defaults/failure propagation; limited stale-credential check to console passwords and excluded non-date/header rows. Explicitly identifies missing cloud-auth setup, bounded report readiness, population/period coverage and restore-test evidence.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services

### ai-audiobook-narration — retained

Read complete single-file pinned-package pointer, install inspection, billing, uninstall and detailed network/credential/telemetry disclosures. Retained: it explicitly requires reading every external package file before activation, per-call paid/upload approval, same-request-ID retry and speaker rights, and distinguishes catalog pointer from executable package. No external tree fetched or installed; pinned-tree behavioral assertions are upstream/catalog descriptions, not independently reproduced here.

Limitations: Static review of this tracked pointer only. Referenced remote executable package and current service/billing behavior were not independently audited; its activation procedure requires a separate complete pinned-tree review. No synthesis, upload, authorization or payment performed; provenance metadata retained.

### radar-satellite-analysis — retained

Read full remote-sensing guide. Retained the coherent decoded-product contract, scan-time/projection/quality checks, radar radial-velocity and satellite proxy distinctions, multi-scan tracking, physically aware mosaics and bounded uncertainty. Examples support measured-vs-inferred findings and explicitly defer official warnings; no downloaded product or operational nowcast was tested.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### developer-advocacy — corrected

Read full skill and README. Replaced guaranteed CFP acceptance in both files, added fallback for absent audience-context dependency, corrected causal attribution from traffic spikes/self-report, and scoped demo secret/synthetic-data handling and outbound publication authorization. Promotional tools and cadence remain examples, not verified service capabilities.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### llm-structured-output — corrected

Read full multi-provider guide and examples. Fixed false Anthropic streaming claim, OpenAI strict optional-vs-nullable advice, unsafe full-input logging and unenforced max-five constraint; examples now reject missing/refused/truncated extraction before downstream use. Historical SDK/model APIs remain compatibility examples, not live availability claims.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://developers.openai.com/api/docs/guides/structured-outputs, https://platform.claude.com/docs/en/build-with-claude/streaming

### intern-program — corrected

Read full internship template. Corrected six-month duration example, removed unearned final score and unrelated converted-employee example, made review scores optional across SQL/JSON and aligned required booleans. Bounded stipend/duration and explained inclusive days, score scale and stipend period/HR limits. Fixed catalog link; no intern assessment or pay calculation performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### events-activities — corrected

Read full event register. Fixed attendance arithmetic and made unknown pre-event outcomes/budget optional in SQL/JSON instead of requiring invented zeros. Added nonnegative integer JSON counts, explicit RSVP denominator/zero/walk-in semantics, time-zone and physical-venue mapping limits. Fixed catalog link; no invitations/bookings made.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### offer-appointment — corrected

Read full offer template. Created audit record before sending, allowed unconfirmed joining date, corrected contradictory offered/accepted sample, bounded probation days and repaired three broken links. Clarified salary period and actual signed-version/approval evidence, avoiding inference of acceptance from delivery channel. No contract generated/sent or legal terms validated.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### posix-shell-pro — corrected

Read entire portability guide. Corrected readonly exclusion, 2017/2024 pipefail scope, nonportable EXIT/error traps, empty-number acceptance, destructive IFS reset, literal-newline/incomplete heredoc example, floating-container reproducibility and assumed CodeQL shell coverage. Primary Open Group pages returned403; target portability still requires actual shell/utility tests. No guide commands executed.

Limitations: Static source review only; Open Group primary pages were unavailable (403). No multi-platform shell execution or portability certification; original metadata preserved.

### frontend-ui-dark-ts — corrected

Read root and complete dark UI guide. Pinned Tailwind3 for its v3 configuration, identified scaffold/dependency major mismatches and absent fonts/pages/components, clarified Segoe redistribution rights, and specified missing modal accessibility/reduced-motion/contrast and route-animation requirements. No app built or visual/accessibility pass claimed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://v3.tailwindcss.com/docs/installation/using-postcss

### aws-secrets-manager — corrected

Read full secret CRUD/rotation/SDK/ECS/EKS/policy guide. Removed argv secrets, fixed duplicate rotation schedule options, pending-token idempotency/state checks, SQL identifier binding, current/pending target checks, TLS/timeouts and boto3 double-base64 decoding. Clarified unbounded cache/ECS refresh and service-template/dependency/CA requirements. No secret retrieved, rotated or provisioned.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda-functions.html, https://docs.aws.amazon.com/boto3/latest/reference/services/secretsmanager/client/get_secret_value.html

### seo-aeo-keyword-research — corrected

Read full keyword-research procedure and report. Reconciled actual-tool research with contradictory no-API statement, removed word-length-based fabricated volume/CPC, renamed misleading LSI vocabulary, qualified long-tail conversion promises and scoped cannibalization absence. Tables remain useful with measured-source or unknown fields; no live rankings or numeric demand invented. Static JSON parsing also found and repaired two literal-newline strings in the input example.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### github-presence — corrected

Read full skill and README. Repaired nested Markdown fence, profile README prerequisites, clone/fork/coverage interpretations and broad git add/direct scheduled push example. Clarified third-party action SHA review/minimal permissions and external publication authorization, rolling UTC traffic window and template license/link adaptation. No GitHub settings, posts or sponsorships changed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository, https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme

### seo-aeo-orchestrator — corrected

Read entire orchestration workflow. Corrected phantom bundled WORKFLOW path, clarified user/policy authority versus fetched evidence, and reordered sitemap submission after deployed-route verification while avoiding arbitrary-page Google Indexing API claims. Existing audit-first scope, authorization, distinct-intent and honest observed-result gates retained; no site/account changes made.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### airflow-dag-patterns — corrected

Read root and complete Airflow playbook. Corrected non-rendered f-string date placeholders, missing branching/sensor imports, unbounded health request/failed JSON parse and nonexistent DAG.test_cycle; scoped APIs to Airflow2 and added actual dependency/XCom/partition limits. Removed blanket depends_on_past prohibition. No scheduler/DAG or external I/O executed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://airflow.apache.org/docs/apache-airflow/2.10.5/tutorial/taskflow.html

### capacity-workload-planner — corrected

Read full capacity register. Fixed overlapping allocation categories, rounded percentages hiding small over-allocation, NULL SQL approval bypass and rejection of legitimate under-allocation; bounded hours/leave. Added person-week cross-project aggregation and honest distinction between mapping and enforced formula/approval; removed extra fences and universal weekly-planning claims. No real staffing decisions made.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### context-degradation — corrected

Read complete degradation guide. Removed unsupported current-model threshold/ranking table, scoped RULER to its2024 cohort and lost-in-middle magnitude to evaluated tasks, distinguished performance from attention curves, corrected exponential-cost claim and phantom internal reference. Retained practical curation/compaction guidance with workload-specific measurement procedure; no benchmark run.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://arxiv.org/abs/2307.03172, https://arxiv.org/abs/2404.06654

### hunt-fintech-graphql — corrected

Read entire fintech GraphQL guide and preserved offensive label/exact authorized-use/per-command gate. Corrected alias batching falsely proving concurrency (top-level mutations are serial), response IDs/schema acceptance falsely proving financial impact, and required bounded synthetic non-settling evidence with lab-only repeat reproduction. No probes, account access or money movement performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://spec.graphql.org/October2021/#sec-Normal-and-Serial-Execution

### opentelemetry — corrected

Read root and full sampling reference. Fixed missing health extension/probes, inactive filter, scrape address replaced by port-only, limiter headroom and unsupported HTTP ignore option; clarified CJS preload, version schemas, plaintext network scope, RBAC/hostmetrics and sensitive telemetry. Corrected tail-sampling pipeline/routing/head-loss and rate-policy semantics. No collector/cluster deployment performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://opentelemetry.io/docs/collector/configuration/

### effective-agent-skills — corrected

Read complete authoring guide. Corrected standard name rules, host-specific invocation/reload controls, unsupported95% routing statistic, universal cross-host portability and unlimited bundle claims. Preserved legitimate README/license/provenance support instead of instructing deletion. Existing whole-tree trust audit and pinned-version checklist retained; no host installation tested.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://agentskills.io/specification

### trpc-fullstack — corrected

Read full tRPC guide. Fixed caller-factory export/import, incompatible server Context shape, noninteger pagination limit, unstable tie sorting and missing subscription imports; stopped resetting form before mutation success. Clarified WS/SSE setup, unbundled app models/auth, service-context and atomic ownership boundaries. No app compiled or network/API execution performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://trpc.io/docs/server/server-side-calls, https://trpc.io/docs/server/subscriptions

### vibe-code-auditor — corrected

Read entire audit guide. Reframed uncalibrated numerical readiness score and made critical blockers independent of score; removed invented production target/user count assumptions. Clarified pattern searches as navigation rather than semantic findings, complete-call-site coverage, safe test-hook inspection and secret redaction; fixed nested report fence. No target code audited or production certification claimed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### windows-privilege-escalation — corrected

Read root and full Windows escalation guide. Preserved offensive authorization gates; corrected PowerShell sc alias, shell-language ambiguity, wrong candidate-parent ACL check, original JuicyPotato Server2019 incompatibility and WSL root vs Windows elevation. Removed password-in-argv example and automatic AV/AMSI evasion fallback; added build/effective-rights/evidence/restore conditions. No probing/exploit/credential access performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://learn.microsoft.com/en-us/windows/wsl/basic-commands, https://github.com/ohpe/juicy-potato

### paid-ads — corrected

Read root and full paid-ads guide. Removed assumed account access, universal100-conversion significance/early-stopping claims, unsourced sound-off statistic, legacy Similar Audience assumption and20% text rule. Added concrete budget/account/action preview, consent/list-upload, synthetic-testimonial and attribution-definition boundaries. No campaign access, spend, audience upload or publication performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### rag-observability-evals — corrected

Read root and full alerting reference. Fixed duplicate-ID NDCG inflation, invalid/empty retrieval sets, empty-claim false success, unvalidated judge result/refusal, CronJob nonexistent flags/shell date expansion and incompatible Prometheus ratio labels. Clarified legacy RAGAS result API, absent regression/push implementation, judge uncertainty, third-party data/cost and stale eval coverage. No paid evaluation or deployment run.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://docs.ragas.io/en/stable/references/evaluation_schema/

### rehabilitation-analyzer — corrected

Read root and full Chinese rehabilitation guide. Reconciled no-prescription/no-prognosis limits with unsafe80%phase advancement, recovery-date forecasts and pain “safe range” examples; corrected ROM arithmetic, missing-day average and zero-denominator semantics. Replaced guaranteed local privacy/phantom commands/destructive reinitialization with actual integration/data-flow checks. No health records read or clinical advice delivered.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://www.orthoinfo.org/recovery/knee-conditioning-program/

### threejs-loaders — corrected

Read root and complete loader guide. Corrected non-color texture colorSpace, loading completion despite asset failures, material arrays/empty bounds, blob URL cleanup and timer cleanup/body timeout scope. Explained shared GPU resources/skinned cloning, cache races and pinned decoder/resource-origin budgets. No model rendered or decoder executed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://threejs.org/docs/pages/Texture.html, https://threejs.org/docs/pages/module-SkeletonUtils.html, https://threejs.org/docs/pages/LoadingManager.html

### zhongcao-cover-maker — retained

Read complete pinned Beatra cover-package pointer, including exact identities/install review, paid lookup/render approval, network/.cn route, shared wallet token, telemetry and retention disclosures. Retained because whole external-tree audit is required before activation, retries preserve request identity and public social content is research rather than copy. No remote package fetched or service operation performed.

Limitations: Static complete tracked-pointer review only; remote package behavior/digests and current paid service claims not independently reproduced. Activation requires separate complete pinned-tree review. No upload, authorization, lookup, render, payment or publication performed.

### wiki-builder — corrected

Read all14 tracked files: root, agent YAML, flavors, initializer and every template/prompt. Fixed literal title/path rendering, missing option-value errors, broken-link destination handling, concurrent destination reservation and common-system variable reuse; helper stored inert644 and existing invocation uses bash. Clarified config/source trust boundaries while preserving provenance templates. No source ingestion/network action performed. Four offline temporary-directory cases passed: literal metacharacter title/root, existing destination, missing option value and broken-symlink destination; no network.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### aws-vpc — corrected

Read full VPC CLI/Terraform guide. Fixed Secrets Manager endpoint using app8080 ingress rather than TLS443 endpoint SG, three-subnet/two-NAT routing mismatch and NAT IGW dependency. Clarified reserved subnet addresses, explicit data isolation/default egress, scoped IAM, cost and peering limits plus missing standalone Terraform definitions. No AWS calls or infrastructure changes performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### geo-citability — corrected

Read full citability rubric/report. Removed unsupported exact passage optima/platform source-count/lift claims and unsourced CDN statistics; retained transparent editorial weights and added reproducible dated query measurement. Avoided statistic-density fabrication and clarified proposed score changes are not measured citation lift; bounded public fetch scope. No site fetch or ranking test run.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://arxiv.org/abs/2311.09735

### redteam-report-template — corrected

Read complete client-report guide. Corrected unjustified “stopped reproducing=client patch” claim, false legal72-hour assertion, phantom reference.docx and unsupported typical-engagement metrics; fixed nested fence/image syntax. Added evidence-scoped impact, protected raw PoCs and actual render/cleanup verification. Process remains read-only and does not authorize tests.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### copilot-sdk — corrected

Read root and complete multilingual SDK guide. Removed shell-prefix permission bypass and blanket yes/allow handlers in favor of actual human-request adapters with explicit SDK-version typing; clarified mocks, built-in tools/sandbox/data/budget boundaries and current runtime/model verification. Added null-response guard/missing sys import. No CLI session, authentication or MCP package executed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://github.com/github/copilot-sdk

### k8s-security-policies — corrected

Read root, entire network-policy asset and RBAC reference. Fixed default namespace-label assumptions, missing DNS TCP, outdated PSP scope and default-SA binding; narrowed wildcard read role excluding Secrets. Explained default-deny egress counterpart, actual CNI/NodeLocal DNS/IPv6 behavior, privileged policy rollout and incomplete deployment fragment. No cluster commands or admission changes performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://kubernetes.io/docs/concepts/services-networking/network-policies/

### embedding-strategies — corrected

Read root and full migration playbook. Fixed symbol-destroying preprocessing, sync network call mislabeled async, unequal/empty eval silent truncation, duplicate-ID NDCG inflation and zero-vector/unknown similarity failures. Clarified model-specific tokenizer/revision/prefix/licensing, sentence chunker’s unenforced limits and approved provider transfer. No embedding API or model loaded.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### hunt-host-header — corrected

Read full Host-header hunting guide and retained offensive exact gates. Corrected automatic critical/any-user claim, Vary absence proving cache-key exclusion and status-diff proving ACL bypass; scoped cache writes to verified isolated keys and minimized callback/token/internal credential impact. Added TLS SNI/verification to raw request and DNS-vs-HTTP distinction. No reset/cache/SSRF probes performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://portswigger.net/web-security/host-header, https://portswigger.net/web-security/web-cache-poisoning

### zhongcao-note-copywriter — retained

Read complete pinned Xiaohongshu copywriter pointer including install/tree review, billable cover/lookup distinction, same-request-ID retry, network routes, wallet credentials, telemetry, retention and final fact/rights proofreading. Retained its separate external-tree activation gate and source-content reuse boundary. No remote package fetched or service used.

Limitations: Static complete tracked-pointer review only. Pinned remote tree and current Beatra billing/network behavior not independently reproduced; activation requires separate complete-tree review. No account authorization, upload, lookup, render, payment or publication performed.

### flutter-expert — corrected

Read root and full Flutter playbook. Corrected compute web-isolate claim, universal Impeller replacement and const no-rebuild claim; removed raw Dio exception exposure and blind golden baseline acceptance. Identified unbundled model/widgets/codegen and version/platform-policy/secret-storage boundaries. No Flutter runtime/device or golden tests run.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://api.flutter.dev/flutter/foundation/compute.html, https://docs.flutter.dev/perf/impeller

### asset-it-management — corrected

Read full asset register. Allowed unassigned inventory/unknown warranties, corrected InUse sample with fabricated return date and warranty-vs-depreciation conflation. Required currency and clarified valuation evidence, assignment history and account IDs without secrets. Existing synthetic-only/MDM limitations retained; no device operation or accounting assessment performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### image-generator — corrected

Read root, complete detailed guide and env example. Replaced shared-temp/heredoc/argv-secret image workflow with serialized SDK request, bounded input and MIME-aware exclusive output creation. Removed free-key/free-generation and no-retention implications, protected original artifacts and documented paid-upload rights/budget and uncertain-result retries; riskcritical reflects external credentialed workflow. No key read or image API call performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### threejs-geometry — corrected

Read root and full geometry guide. Corrected nonexistent utility computeTangents call, BatchedMesh constructor instance capacity/material omission and unsupported opacity/wireframe assumptions. Added empty-bounds guard, instance bounds refresh and actual merging/shared-resource/allocation limits. No rendering or GPU performance tests performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://threejs.org/docs/pages/BatchedMesh.html, https://threejs.org/docs/pages/BufferGeometry.html

### tool-design — corrected

Read complete tool-design guide. Corrected MCP colon-prefix requirement, unsupported40% improvement and missing internal evidence references; scoped broad shell reduction to trusted isolation and separated model flexibility from server-side validation/authorization. Added concrete preview/commit, tenant, idempotency/outcome and retry contracts. No tool runtime built or benchmark performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://modelcontextprotocol.io/specification/2025-06-18/server/tools

### atlas-ledger — retained

Read complete ledger protocol, machine-key format, gates, confirmation, merge/retirement and read-back hook. Retained: it distinguishes observed drift from motives, proposals from authorized persistent writes, provisional from confirmed entries and untrusted project defaults from higher-priority authority. Companion integration and actual parser behavior are not bundled/tested; no Atlas.md written.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### azure-maps-search-dotnet — corrected

Read root and full Maps guide. Reframed stale current-version claims as historical preview baselines, added package/service support and coordinate/batch-error/data-plane/billing/privacy limits. Corrected unconditional caching/accurate-ETA claims and overwriting/mislabeled tile output. No SDK compile, geocode/route/weather API call or account provisioning performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved. Azure SDK repository browse was unavailable; current SDK API compatibility remains unverified.

Primary references consulted or attempted: https://learn.microsoft.com/en-us/azure/azure-maps/weather-coverage

### ai-wrapper-product — corrected

Read root and full product implementation guide. Fixed assumed first text block/incomplete output, undefined parser/greedy JSON repair, unsafe input type and stream delta/UTF8 handling. Added atomic cost reservations, uncertain billing outcomes, tenant/version cache keys and actual provider budget/data authority; historical price/latency tables explicitly not current facts. No model call or product deployed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### geo-schema — corrected

Read complete structured-data guide. Removed phantom fetcher requirement, universal AI citation/trust claims and fabricated deprecation table; distinguished vocabulary from feature requirements, corrected JSON-LD head/JS restrictions and retired sitelinks search box. Scoped sameAs/ratings/author facts and score quotas to actual relevant evidence. No markup deployed or rich-result success claimed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data, https://developers.google.com/search/blog/2024/10/sitelinks-search-box

### course-upskilling-requests — corrected

Read full training-request register. Fixed approved sample with all approvalsFALSE, fabricated completion date and mandatory unknown start/bond fields across SQL/JSON. Aligned required approval booleans/currency and clarified applicable decision evidence versus checkbox routing and optional legal-reviewed service bond. No enrollment/payment or contract action performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### recruitment-pipeline — corrected

Read full recruitment template and existing anti-discrimination/source-score boundary. Fixed SQL requiring optional offer salary, required unknown experience/expectation and contradictory Applied sample with hired employee/interview/offer. Clarified stable employee relation, stage history needed for stall metrics and score/salary evidence; no applicant scoring or hiring decision made.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### sdk-dx — corrected

Read root, README and complete SDK-DX guide. Removed credential fragments from error template, corrected types-never-stale claim and nested migration fence. Added concrete idempotent retry/cancellation/operation-ID and redacted fixture/log contracts; clarified backwards-compatible fixes need actual compatibility validation. No SDK generated/released or messages sent.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### ios-redteam-pipeline — corrected

Read entire iOS pipeline. Corrected install/list vs IPA export assumptions, relative app path, missing grep input, unsafe filename interpolation, entitlement location and automatic UniversalLink custom-scheme fallback. Removed global pip overrides/TLS verification bypass, scoped beta vs production/key evidence and Frida non-jailbreak support; preserved exact offensive gates. No IPA/device/credential/network operations run.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://frida.re/docs/ios/, https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app

### scikit-learn — corrected

Read root and full ML guide. Identified absent scripts/all named topic references, fixed uv uv install typo, sparse one-hot/GradientBoosting mismatch, missing plot/NumPy imports and silhouette k>=sample-count failure. Distinguished external UMAP/experimental imports, memory and temporal/group split/leakage limits and untrusted model deserialization. No ML dataset, fit or model file executed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### redesign-existing-projects — corrected

Read entire redesign audit and upgrade list. Removed fabricated precision/contact data and randomized publication dates, made aesthetic patterns optional rather than automatic defects, and added concrete reduced-motion/native-scroll, status-color/contrast, image/font rights and truthful demo-content boundaries. Existing preservation/testing scope retained; no UI/app changed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### defi-protocol-templates — corrected

Read entire inline DeFi/source-availability guide. Removed production-ready claim, pinned legacy OZ4 API scope, fixed unchecked ERC20 transfers/reentrancy, AMM swap slippage/deadline, same-block vote snapshot and governor fake execution success, and flash receiver approval-vs-actual-repayment/trusted-caller defect. Explicitly identifies unfunded unbounded staking rewards and missing quorum/LP/token behavior; not audited or deployable. No contracts compiled/deployed or transactions sent.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://docs.openzeppelin.com/contracts/4.x/api/token/erc20

### azure-keyvault — corrected

Read root and complete Terraform/troubleshooting reference. Fixed plaintext argv/output secret leaks, data/control-plane role confusion, private-access-disable vs endpoint provisioning, explicit legacy-policy target and missing TLS private-key mapping. Added CSI PEM/env-refresh and state-secret/rotation-tag realities. No vault access, secret retrieval, assignment or purge performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide

### business-continuity — corrected

Read complete BCP/BIA/communication/recovery/exercise guide. Defined RTO/RPO/tolerable-disruption relationship and scoped example bands/cadence, actual failover/drill authorization and clean restore/failback evidence. Removed blanket72-hour legal notification assumption and made YAML checklist checkbox text syntactically literal. No contact notification or disaster/failover test performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### seo-aeo-content-quality-auditor — corrected

Read root and complete audit checklist. Reframed heuristic scores/format quotas as editorial aids, corrected exact-one-H1 and AI-extracts-TLDR-first claims and source-vs-user authority wording. Required N/A/evidence/method for inaccessible checks/readability and actual blockers independent of totals. No website crawl, analytics access or ranking success claimed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### budget-cash-flow — corrected

Corrected Budget Line from money to text/title, numeric variance across all mappings, optional zero-budget utilization, explicit ratio/sign/fiscal-year definitions, and a currency column across all four representations. Read the full standalone source; preserved read-only template and reconciliation boundaries.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### apify-market-research — corrected

Read the full root and Node runner. Replaced unsafe environment parsing/token arguments with connector discovery and REST bearer headers; added input/option validation, request deadlines, bounded dataset downloads, exclusive private file writes, heterogeneous CSV columns without truncation, and accurate ESM record counting. Documented local timeout versus remote billing and minimized public-data scope.

Limitations: Static review; API auth and dataset limit behavior checked against official docs. No paid Actor, connector, network execution or live schema verification; download caps do not cap run charges. Metadata and analytics identity preserved.

Primary references consulted or attempted: https://docs.apify.com/api/v2, https://docs.apify.com/api/v2/dataset-items-get

### apify-trend-analysis — corrected

Read the full root and runner. Confirmed the runner matched the market-research implementation except its analytics identifier, then applied the same reviewed REST/header, bounded output, validation, non-lossy CSV, private exclusive-write and ESM counting repairs. Replaced unsafe schema-fetch shell command and added concrete trend-index versus absolute demand limitations.

Limitations: Static complete-tree review and Node syntax only; no paid Actor or live platform/API schema test. Preserved analytics identifier and source metadata; output limit is not a run cost limit.

Primary references consulted or attempted: https://docs.apify.com/api/v2, https://docs.apify.com/api/v2/dataset-items-get

### tax-register — corrected

Read full standalone register; fixed mandatory filed/payment dates that prevented Draft rows, integer as-of countdown, required currency, and impossible filing-before-period sample dates. Replaced realistic names with synthetic placeholders and clarified that example deadline/net payable are not jurisdictional tax rules; withholding roles remain distinct.

Limitations: Static schema/template review only. No tax computation, filing, jurisdiction-specific deadline verification or accounting-service execution; qualified accountant must supply authoritative treatment and due dates.

### performance-management — corrected

Read complete standalone source. Made uncompleted review outcomes and flags nullable, defined the three different synthetic score scales and human finalisation/appeal boundaries, fixed malformed related links and inconsistent Q1 review dates/type, and replaced realistic personal names with explicit examples.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### skill-writer — corrected

Read all 13 tracked files, including all routing, synthesis, evaluation and example references. Replaced generated-state-mutating chain/catalog commands with exact-base scripts and source-only sync boundaries, removed undefined baseline-pack requirement, added precise non-trigger cases, and bounded release-pattern authority. Retained useful minimal patterns and opt-in evaluation framing.

Limitations: Static complete-tree review only. Example skeleton is illustrative; no new skill execution, baseline model evaluation, publication or repository-wide certification. Original metadata preserved.

### fedramp-compliance — corrected

Read full source. Verified official 2026 program changes; replaced obsolete mandatory JAB path, fixed universal incident/FIPS claims and ungrounded counts, explicitly scoped historical examples versus current class/path rules, repaired invalid YAML checklist syntax, and added an evidence-grounded AC-2 worked example. Preserved upstream MIT attribution without claiming independent license audit.

Limitations: Static guidance review; no authorization/certification, audit, cloud control change or privileged command execution. Current rules are transitioning and must be selected by effective date and agency contract; family subset and illustrative cadence do not constitute a complete baseline.

Primary references consulted or attempted: https://github.com/FedRAMP/2026/blob/main/content/timeline.md, https://marketplace.fedramp.gov/, https://www.fedramp.gov/archive/2024-08-12-moving-to-one-fedramp-authorization-an-update-on-the-jab-transition/, https://help.fedramp.gov/hc/en-us/articles/53386638354843-Q-Will-FedRAMP-provide-guidance-on-the-sunsetting-of-FIPS-140-2-What-do-I-do-if-our-planned-140-3-Module-is-not-yet-approved, https://www.fedramp.gov/notices/0012/

### prototype — corrected

Read root, LOGIC and UI in full. Replaced categorical no-tests rule with experiment-scoped validation and repository checks; bounded state rendering to synthetic/redacted data; fixed production exposure by gating the entire prototype branch rather than only its switcher and handling unknown variants. Preserved upstream author/license and lightweight throwaway intent.

Limitations: Static complete-tree review only; no prototype generated, browser execution or independent upstream license audit. Production adoption still requires normal engineering validation.

### projects-work-management — corrected

Read full register; repaired Draft-state unknown amounts/dates/ratings, bounded progress to 0–100 with plain-number Notion convention, required currency, distinguished planned versus actual dates and cost versus revenue/cash, and explained flattened relation limitations. Replaced personal-name samples with explicit synthetic roles.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### developer-onboarding — corrected

Read root, README and full detailed guide. Removed false generic test-key/production-endpoint detection that recommended live credentials, bounded telemetry/screen recording to sandbox redacted data, fixed EOL runtime and public Redis example, labeled unsupported numerical benchmarks/correlations and product capabilities as illustrative, and clarified consent/sending authority and conflicting email cadence.

Limitations: Static complete-tree editorial/semantic review; no onboarding account, API call, telemetry, email send or current vendor feature audit. Original upstream attribution/license retained without independent license re-audit.

### apify-lead-generation — corrected

Read full root and runner; confirmed original helper differs from the already-reviewed market helper only in analytics identifier, then applied its bearer auth, bounded downloads, non-lossy CSV, validation, exclusive output and record-count repairs. Added contact minimization, provenance, suppression and separate outreach authorization boundaries.

Limitations: Static complete-tree review and syntax only; no Actor run, contact scrape, live schema check or message. Public visibility does not establish lawful outreach permission; output cap does not limit remote Actor charges.

Primary references consulted or attempted: https://docs.apify.com/api/v2, https://docs.apify.com/api/v2/dataset-items-get

### binary-diff — corrected

Read complete root and prompt support. Fixed nested Markdown fences, removed unsupported cost/accuracy and model assertions, replaced wrong instruction-address rename generation with an explicit validated review queue, added HTTP status and bounded YAML structure checks, and clarified missing prompt file/API/IDA adapters, VA/RVA evidence and external-code disclosure boundaries. Preserved Chinese upstream content and MIT attribution.

Limitations: Static complete-tree review only; no binary executed, external LLM request, IDA session or symbol correctness experiment. Python remains an illustrative skeleton requiring field-level schema and IDB operand validation; no fabricated adapter functionality or upstream license re-audit.

### setup-matt-pocock-skills — corrected

Read all six tracked setup/templates. Fixed unsupported gh PR authorAssociation field using the installed CLI help, clarified actual external-author permissions and pagination, removed guessed GitLab editor semantics, distinguished issue/MR identifiers, and bounded configuration from remote posting/label/closure authority. Protected token-bearing remote URLs and multiline shell text.

Limitations: Static complete-tree review; gh help was inspected locally, GitLab CLI unavailable and no remote mutations performed. Templates remain seeds requiring actual tracker/tool verification; original author/license preserved. GitLab documentation lookup was unavailable; no exact CLI flag behavior is asserted.

Primary references consulted or attempted: https://cli.github.com/manual/gh_pr_list

### apify-content-analytics — corrected

Read full root and runner; applied verified matching helper repairs for bearer auth, option validation, bounded downloads, heterogeneous non-truncated CSV, exclusive private files and exact returned-record counting. Corrected ROI/unique reach and growth claims from public snapshots and defined comparable denominators/time windows.

Limitations: Static complete-tree review and syntax only. No Actor run or live platform/API schema verification; public metrics cannot substantiate financial attribution and download cap does not control remote charges.

Primary references consulted or attempted: https://docs.apify.com/api/v2, https://docs.apify.com/api/v2/dataset-items-get

### threejs-postprocessing — corrected

Read root and full guide. Verified r183 official source; fixed obsolete FilmPass/SMAA signatures and WebGPU imports/RenderPipeline, missing output conversion, selective-bloom overwrite with real offscreen additive composition, FXAA DPR sizing, misleading multi-composer blending and pass constructor-resolution claims. Added disposal/version/runtime limits.

Limitations: Static complete-tree review only; no GPU/browser rendering or visual performance test. Shader examples need host scene setup; selective bloom still needs material/transparency-specific tuning. Metadata preserved.

Primary references consulted or attempted: https://raw.githubusercontent.com/mrdoob/three.js/r183/examples/jsm/postprocessing/FilmPass.js, https://raw.githubusercontent.com/mrdoob/three.js/r183/examples/jsm/postprocessing/SMAAPass.js, https://raw.githubusercontent.com/mrdoob/three.js/r183/examples/webgpu_postprocessing_bloom.html, https://raw.githubusercontent.com/mrdoob/three.js/r183/examples/webgl_postprocessing_unreal_bloom_selective.html

### lemmaly — corrected

Read full standalone algorithm guide. Corrected Set complexity qualification, output versus auxiliary memory and worst-case comparison count; replaced unbounded I/O parallelization and unsafe allocation hoisting with dependency/resource/alias-aware rules; removed unsubstantiated controlled-test and fixed scanner-count assertions. Retained the concrete filter/Set example and optional pinned scanner boundary.

Limitations: Static source review only; no upstream scanner download/execution, benchmark or model behavior experiment. Scanner rule availability depends on the reviewed upstream version; author and Apache-2.0 attribution preserved without independent license audit.

### issue-grievance-tracker — corrected

Read full complaint register. Removed public/internal confidentiality defaults in favor of restricted case access, clarified anonymity versus identifiers/logs and allegation versus verified outcome, separated human discipline decisions, fixed derived elapsed-days typing/unknown state and Anonymous schema consistency, repaired broken catalog link and replaced realistic names/case identifiers with synthetic examples.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### supabase — corrected

Read root, upstream changelog, feedback guide and issue template. Verified PostgreSQL policy semantics and Supabase local migration docs; corrected false WITH CHECK omission vulnerability and anonymous-role distinction, qualified SECURITY DEFINER/RLS and EXECUTE exposure, replaced blanket direct-DDL/anti-migration advice with target-scoped local migration testing, and bounded MCP setup plus public feedback disclosure. Historical changelog retained unchanged.

Limitations: Static complete-tree review only; no database, RLS execution, CLI compatibility run, connector setup or upstream issue created. Hardcoded CLI minimum versions were not independently tested; actual command discovery remains required. Original official source/license attribution preserved without re-audit.

Primary references consulted or attempted: https://www.postgresql.org/docs/current/sql-createpolicy.html, https://supabase.com/docs/guides/local-development/database-migrations, https://supabase.com/docs/guides/database/postgres/row-level-security

### apify-brand-reputation-monitoring — corrected

Read full root and Node helper. Applied the identical reviewed runner repairs while preserving its analytics identifier; replaced unsafe token/schema shell guidance and clarified deduplication, rating versus inferred sentiment, language uncertainty, and snapshot versus scheduled monitoring. Added separate authority for reviewer contact or public replies.

Limitations: Static complete-tree review only; no paid Actor, sentiment accuracy test, scheduler, notification or live platform schema verification. Download caps do not limit remote Actor billing.

Primary references consulted or attempted: https://docs.apify.com/api/v2, https://docs.apify.com/api/v2/dataset-items-get

### unsloth-finetuning — corrected

Read full standalone training guide. Checked official TRL/Unsloth dataset/template docs; fixed missing FineTome normalization/rendering, modern processing_class, explicit train/eval split and sequence config, response-mask ordering, conversational GRPO completion handling and colocated generation/batch setup. Qualified precision, model compatibility, unsupported universal licensing/token-scope assertions and export/evaluation boundaries.

Limitations: Static source review only; no GPU, dependency installation, model/dataset download, training, reward-quality test or export. GRPO remains explicitly contextual and needs a prompt dataset/task reward; exact package/model/toolchain compatibility and licenses must be verified per run.

Primary references consulted or attempted: https://huggingface.co/docs/trl/sft_trainer, https://huggingface.co/docs/trl/grpo_trainer, https://unsloth.ai/docs/basics/chat-templates

### aws-cloudtrail — corrected

Read full standalone AWS guide. Checked official bucket-policy/Athena docs; scoped CloudTrail service writes by SourceArn and organization/account prefixes, added missing CloudTrail input format and partition registration, corrected exact-IP versus CIDR comparison and versioning immutability claim, documented missing KMS/CloudWatch/Terraform dependencies and replace-all/cost/retention effects, and fixed invalid YAML checklist syntax. Verified and documented CloudTrail Lake closure to new customers from May 31, 2026.

Limitations: Static source review only; no AWS calls, infrastructure apply, query, alarm delivery or integrity validation. Examples require real account/organization/region policies and cost decisions; Athena DDL is a one-account prefix example. Upstream MIT attribution preserved.

Primary references consulted or attempted: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html, https://docs.aws.amazon.com/athena/latest/ug/create-cloudtrail-table.html, https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-lake-service-availability-change.html

### outreachagent — corrected

Read complete API workflow source. Public OpenAPI retrieval failed, so marked schemas/simulation/SDK observations unverified rather than certifying them. Added request timeout/redirect failure, 204 handling and path checks, clarified TypeScript versus runtime response validation and unknown mutation outcomes, removed raw simulation trace logging, and aligned approval language with already-granted exact-scope authorization.

Limitations: Static review only. Public OpenAPI endpoint unavailable to browser; no REST request, package install, contact/template/workflow mutation, enrollment, simulation or send was performed. Execution remains blocked until the trusted current API contract and recipient/sender scope are verified; metadata preserved.

### tutorial-engineer — corrected

Read full standalone source; it contained pervasive missing numeric placeholders, malformed list numbering, unsupported retention claims and no usable domain example. Repaired it into a concrete objective→source→sandbox→worked example→practice→verification workflow, with a complete synthetic Python filtering example, expected outputs/edge case and explicit unexecuted/pilot limitations. Preserved frontmatter and narrowed gratuitous output requirements.

Limitations: Static source repair only; illustrative standard-library example was inspected, not claimed executed. No learner pilot, runtime environment setup, external publication or pedagogy-effect measurement; no unsupported retention percentages retained.

### angular-best-practices — corrected

Read root, README, metadata and entire guide. Verified official zoneless/hydration/for docs; corrected v21 default and versioned hydration setup, malformed consecutive defer blocks, virtual-scroll directive imports/sizing and null signal access. Qualified false blanket change-detection/barrel/index-track/SSR claims, fixed optional TransferState typing and output-not-signal guidance, and added dependency/caching/privacy boundaries.

Limitations: Static complete-tree review only; no Angular compiler, browser profile, SSR or bundle benchmark. Examples remain explicitly contextual fragments requiring installed-version imports and host services; metadata retained.

Primary references consulted or attempted: https://angular.dev/guide/zoneless, https://angular.dev/guide/incremental-hydration, https://angular.dev/api/core/@for, https://material.angular.dev/cdk/scrolling/overview

### board-governance — corrected

Read full register including decision and board-pack controls. Reconciled mandatory meeting/due/risk columns with the explicit leave-unknown rule, corrected the action-log-versus-minutes claim and compact-flat-schema versus linked-record recommendation, and clarified that confidentiality labels and rows do not establish access controls, quorum or legal approval. Retained synthetic example and versioned decision evidence rules.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### apify-influencer-discovery — corrected

Read full root and helper; confirmed identical runner structure before applying reviewed auth/validation/bounded export/non-lossy CSV/private-file/count fixes with original analytics identifier. Corrected authenticity-verification and campaign-performance overclaims; added brief/sample/denominator, uncertainty and separate outreach boundaries.

Limitations: Static complete-tree review only; no Actor run, authenticity audit, campaign ROI test or live schema check. Public metrics are incomplete proxies; output download limit does not cap paid Actor work.

Primary references consulted or attempted: https://docs.apify.com/api/v2, https://docs.apify.com/api/v2/dataset-items-get

### pubmed-database — corrected

Read full standalone source and its explicit missing-support declaration. Fixed contradictory claim that missing references are bundled, malformed MeSH/subheading and ECitMatch examples, credential-bearing GETs and unbounded/no-status request example, empty-ID fetch and URL mislabeled Python. Added retrieval-count/cap, protocol bias and copyright/patient-query limits while preserving Unknown license.

Limitations: Static source review only; no PubMed API query or complete literature search. Official PubMed help verified query/subheading, display and clipboard semantics; E-utilities Books pages hit browser challenge, so batching/rate limits still require current API-doc confirmation. Missing external supports remain unavailable; no license invented.

Primary references consulted or attempted: https://pubmed.ncbi.nlm.nih.gov/help/

### yann-lecun-tecnico — corrected

Read root and complete Portuguese guide. Fixed truncated/unclosed I-JEPA code by replacing it with explicit conceptual steps and no fabricated implementation, corrected output-layer derivative, JEPA direction/EMA guarantee and video-future claim, removed false real-person identity/universal AMI-vs-LLM claims, bounded LeNet approximation/input shape and SimCLR/EBM execution limits, and checked I-JEPA/V-JEPA primary paper identities.

Limitations: Static complete-tree review only; no PyTorch import, tensor test, GPU training or paper-result reproduction. I-JEPA is intentionally conceptual, while remaining PyTorch snippets need imports/fixtures and training context. Author metadata preserved; no license invented.

Primary references consulted or attempted: https://arxiv.org/abs/2301.08243, https://arxiv.org/abs/2404.08471

### waf-setup — corrected

Read root and full details. Verified Cloudflare threat_score is constant zero, fixed User-Agent scalar expression, managed challenge and rate-limit characteristics; bounded provider-version/API-token configuration and rule replacement. Corrected DetectionOnly contradiction, nonfunctional ModSecurity rate counter, cookie-length transformation, misplaced exclusion file, unpinned build and false 24h log-window claim, and reversed unsafe memory-exhaustion advice.

Limitations: Static complete-tree review only; no WAF deployment, active payload, package install, reload or Terraform plan. Examples require provider/plan/CRS/connector compatibility and scoped staging tests; WAF is not complete OWASP/compliance coverage. Original MIT provenance retained.

Primary references consulted or attempted: https://developers.cloudflare.com/ruleset-engine/rules-language/fields/reference/cf.threat_score/, https://developers.cloudflare.com/ruleset-engine/rules-language/fields/reference/http.user_agent/, https://developers.cloudflare.com/waf/rate-limiting-rules/create-api/

### architecture-patterns — corrected

Read root and full playbook. Fixed optional User typing/missing imports/timezone and Money sum failure; removed obsolete blocking real-charge adapter from async example and documented actual composition/schema requirements. Corrected find-before-save race and persist-then-publish/payment crash gaps with concrete uniqueness/idempotency/outbox guidance, qualified durable-execution product claim, and removed false bundled-resource inventory.

Limitations: Static complete-tree review only; no backend, database, payment or email execution. Remaining hexagonal/DDD sketches are explicitly contextual and require domain types/wiring; no production readiness or exactly-once guarantee claimed. Metadata preserved.

### telegram-mini-app — corrected

Read root and full guide. Verified Telegram primary API/payment docs; added initData freshness/duplicate/hash validation and timing-safe comparison, safe user parsing/session boundaries, Stars-only digital-goods distinction and successful-payment reconciliation. Fixed float nanoton conversion, self-referential CSS variables, missing React import, unsafe user logging/referral reward implication and offClick callback removal; moved DeFi audit before deployment.

Limitations: Static complete-tree review only; no Telegram/bot/device/TON transaction, TADS package or payment execution. TON amount/address/network and proof verification need a complete trusted implementation; five-minute auth window is explicitly an application policy. Original source preserved.

Primary references consulted or attempted: https://core.telegram.org/bots/webapps, https://core.telegram.org/bots/payments-stars

### terraform-skill — corrected

Read root and full guide. Verified official constraint/test docs; fixed ~> patch/minor ranges, incorrect set/apply advice, conditional secondary-CIDR subnet inconsistency and try version. Clarified real-infrastructure test side effects, independent OpenTofu feature timelines, provider/module locking and sensitive-state limits, and removed false local reference/LICENSE availability claims.

Limitations: Static complete-tree review only; no Terraform/OpenTofu init, test, plan, provider execution or cloud resources. HCL examples remain partial; exact provider schemas/tool versions and upstream license require verification for use. Attribution preserved.

Primary references consulted or attempted: https://developer.hashicorp.com/terraform/language/expressions/version-constraints, https://opentofu.org/docs/cli/commands/test/

### pytest-skill — corrected

Read root and entire playbook. Fixed exception matching, missing sys and async-fixture decorator/HTTPX ASGITransport, reversed ScopeMismatch advice, unsafe persistent test.db, duplicate fixture emails and fragile teardown. Scoped SQLAlchemy 2 savepoint requirements, mock context-manager namespace and ASGI lifespan; removed implicit external coverage upload and clarified plugin/parallel/collection side effects.

Limitations: Static complete-tree review only; no pytest collection or application/database/email test execution. Examples require real project imports and compatible SQLAlchemy/SQLite transaction setup; CI action commits and supported runtime matrix need project-specific pinning. Original MIT attribution retained.

Primary references consulted or attempted: https://docs.pytest.org/en/stable/how-to/fixtures.html, https://pytest-asyncio.readthedocs.io/en/stable/reference/decorators/index.html

### iso27001-compliance — corrected

Read full standalone ISMS guide. Verified official ISO edition/amendment context; removed blanket outsourced-physical-control exclusion and annual/three-month mandates, qualified synthetic risk scores and policy deadlines, clarified necessary-control SoA evidence/inclusion/exclusion and ongoing organizational responsibility, corrected invalid YAML checklists, and added a real cloud/office assurance worked example.

Limitations: Static planning review only; public ISO overview consulted, not the licensed full standard or certification scheme. No ISMS audit, risk acceptance, control operation test or certificate attestation; examples require qualified organization-specific assessment. Upstream MIT attribution retained.

Primary references consulted or attempted: https://www.iso.org/standard/27001

### code-review-ai-ai-review — corrected

Read full standalone source and missing-script boundary. Corrected truncated description, false large-diff superficial-completion rule and mislabeled OWASP 2025 list. Removed nonfunctional automation falsely claiming posts/missing methods, replaced it with a concrete head-bound draft-review workflow, qualified analyzer/model/benchmark capabilities and CVSS, and bounded untrusted builds, external code disclosure and credential-verification side effects.

Limitations: Static source review only; no analyzer, remote model, CI workflow, exploit, comment or test execution. External ai_review.py remains absent; code snippets with framework-specific objects are illustrative rather than bundled functionality. Metadata preserved.

Primary references consulted or attempted: https://top10.owasp.org/2025/

### vector-index-tuning — corrected

Read root and complete vector playbook. Fixed recall alignment/empty input, explicit ID mapping and warmup/ef>=k, mislabeled measured memory, constant-range scalar quantization, uint8 centroid overflow constraints and missing Tuple import. Corrected PQ/binary byte estimates, fresh-index build profiling and last-batch throughput, missing recall versus zero, Qdrant candidate-return type/threshold units and unmeasured guarantee claims.

Limitations: Static complete-tree review only; no HNSW/Qdrant/sklearn runtime, dataset benchmark, memory or recall measurement. hnswlib API checked against primary source; Qdrant optimization page unavailable, so SDK/server validation remains explicit prerequisite. Quantizers are illustrative codecs, not integrated ANN search implementations.

Primary references consulted or attempted: https://github.com/nmslib/hnswlib

### claude-code-expert — corrected

Read root and entire Portuguese guide. Checked official CLI/hooks docs; fixed interactive versus print mode and unsupported flags, invalid JSON escaping, fail-open nonexistent scanner, incomplete MCP commands/server, broad recommended permissions, JSONL misuse and fictional auto-memory dependencies. Removed secret-enabled broken CI sketch, qualified traffic/privacy and separate-session assumptions; risk now reflects executable hook/MCP/configuration scope. Corrected allowedTools versus tools restriction semantics and max-turns print-mode requirement.

Limitations: Static complete-tree review only; no Claude CLI, hook, MCP installation, memory script, permission bypass or CI run. Remaining shortcuts/subagent surfaces are version-dependent and must be discovered; no productivity benchmark or private/offline guarantee. Author/source metadata preserved.

Primary references consulted or attempted: https://code.claude.com/docs/en/cli-reference, https://code.claude.com/docs/en/hooks

### wordpress-penetration-testing — corrected

Read root and entire offensive guide. Preserved exact authorized-use/per-command gate and offensive risk. Verified official Abilities availability/WPScan docs; replaced invented version-specific AI/ability/destructive endpoints with actual route/role inspection and synthetic fixtures, fixed theme/repeated-enumeration flags and default TLS disabling, bounded credential lockout/traffic evasion and added concrete artifact restoration/verification.

Limitations: Static complete-tree review only; no target probe, scan, credential attempt, exploit or WordPress runtime. Historical exploit snippets remain explicitly lab-only and require exact authorization plus installed-tool/module checks. No WPScan database freshness or WordPress version asserted. Author provenance preserved.

Primary references consulted or attempted: https://developer.wordpress.org/apis/abilities-api/, https://github.com/wpscanteam/wpscan/wiki/WPScan-User-Documentation

### performance-testing-review-ai-review — corrected

Read complete standalone source; compared after reading and confirmed it was the same broken general-review source except ID/model text. Applied the individually reviewed repair set for missing automation, false posting, unsafe CI/model execution and OWASP list, then grounded this performance variant in workload/baseline/head, repeated distributions, profiling and authorized load limits.

Limitations: Static complete-tree review only; no analyzer, model call, benchmark, load traffic, CI or review comment. External ai_review.py remains absent and illustrative pattern checks do not establish measured regressions. Metadata preserved.

Primary references consulted or attempted: https://top10.owasp.org/2025/

### eas-update-insights — corrected

Read all four tracked files. Corrected no-exposure versus zero-crash health interpretation, sum/top-N reach over- and under-count caveats, branch/channel selection and empty group handling, unsafe automatic latest-global upgrade, invalid JSON-comment fence and inconsistent synthetic counts. Agent prompt now reports evidence instead of claiming release-gate authority.

Limitations: Static complete-tree review only; no Expo login, project config evaluation or insights query. Official current CLI reference consulted for command availability; detailed metrics page unavailable, so exact remote field semantics/schemas must be revalidated in the installed client. Existing source/license attribution preserved.

Primary references consulted or attempted: https://docs.expo.dev/eas/cli/

### fp-ts-pragmatic — corrected

Read root and full guide. Fixed unsafe unknown-email cast, parseInt accepting trailing junk/unsafe integers, unchecked empty-post indexing and duplicate map binding. Qualified callback-to-TaskEither adapters, lazy repeated effects, simplified email/User schemas and false intermediate-array/performance claim. Retained the pragmatic minimal functional patterns.

Limitations: Static complete-tree review only; no TypeScript compilation, runtime benchmark, network/payment execution or dependency install. Alternative snippets need project types/adapters and fp-ts version validation; source attribution preserved.

Primary references consulted or attempted: https://gcanti.github.io/fp-ts/modules/Array.ts.html

### huggingface-local-models — corrected

Read all four files. Verified official llama.cpp build and Hub download docs; replaced retired Make flags with CMake and reviewed source pin, added immutable Hub revisions/local-file loopback serving, pagination and snippet-trust boundaries. Corrected GGUF expansion, removed unsourced benchmark numbers/imatrix improvement guarantee, qualified quant tensor mix/sizing/medical accuracy and stale model inventory.

Limitations: Static complete-tree review only; no model/toolchain download, build, gated login, converter, server or benchmark. Exact example repo/file inventory is historical and not verified; backend options and quant support must match reviewed revisions. Apache-2.0 source attribution preserved without auditing model licenses.

Primary references consulted or attempted: https://raw.githubusercontent.com/ggml-org/llama.cpp/master/docs/build.md, https://huggingface.co/docs/huggingface_hub/guides/download

### hunt-cors — corrected

Read full offensive guide. Preserved authorized-use/exact-command gate and offensive risk. Verified browser CORS/origin docs; corrected wildcard response-versus-request behavior, SameSite/custom-header assumptions and blob-origin claim, replaced full-body OOB exfiltration with synthetic-canary evidence, protected cookie handling and bulk scope checks, removed guessed corsy install and qualified bounty/severity/TypeError conclusions.

Limitations: Static source review only; no target HTTP request, browser PoC, cookie access, subdomain takeover or tool install. Browser credential/cookie behavior and program severity require an actual scoped test; original MIT provenance retained.

Primary references consulted or attempted: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS, https://developer.mozilla.org/en-US/docs/Web/API/URL/origin

### fp-pragmatic — corrected

Read root and complete support independently, then confirmed support bytes match fp-ts-pragmatic before applying its reviewed fixes: unknown-email runtime type check, strict safe-integer age parse, empty-post handling, duplicate binding, lazy-effect/adapter boundaries and false reduction-allocation claim. Preserved this skill’s distinct author/version/frontmatter.

Limitations: Static complete-tree review only; no TypeScript compilation or execution, benchmark or network effects. Alternative examples need compatible fp-ts and project adapters; metadata preserved.

Primary references consulted or attempted: https://gcanti.github.io/fp-ts/modules/Array.ts.html

### production-code-audit — corrected

Read root and full audit guide. Removed fabricated success/test/coverage/performance/security-certification examples and unconditional fix/provision-everything mandate. Replaced them with scope/file-coverage evidence, concrete parameterized-query example, risk-justified minimal repairs, actual validation and password/secret migration/caching/telemetry boundaries. Retained useful architecture/security/performance audit focus.

Limitations: Static complete-tree semantic repair only; no audited application, scanner, runtime test, provisioning or deployment. No whole-codebase/OWASP/production certification is claimed; metadata preserved.

### react-flow-architect — corrected

Read root and complete guide. Verified React Flow v12 migration/performance docs; replaced nonfunctional complete example with controlled nodes/edges/style/container component, fixed v12 imports/parentId and empty visible-edge generation, removed undefined incremental/history/analyzer functionality claims, and corrected debounce application/cancel, cache invalidation, snapshot cycles, relative layout and typed autosave state.

Limitations: Static complete-tree review only; no npm install, TypeScript compile, React render, browser layout or performance test. Advanced history/validation fragments are explicitly design guidance requiring host implementation; no production-ready completeness claim. Metadata preserved.

Primary references consulted or attempted: https://reactflow.dev/learn/troubleshooting/migrate-to-v12, https://reactflow.dev/learn/advanced-use/performance

### c4-architecture-c4-architecture — corrected

Read full standalone workflow. Checked official C4 guidance; corrected mandatory all-level/function-catalog framing and Docker/deployment-container conflation, scoped components and evidence, removed assumed specialized-agent availability, prevented sanitized-path collisions/repeated child coverage, and constrained OpenAPI generation to evidenced HTTP contracts with renderer/assumption validation.

Limitations: Static source review only; no repository architecture inventory, delegated agent execution or rendered diagram test. C4 interpretation needs target audience/system evidence and owner review; no complete-runtime topology guarantee. Metadata preserved.

Primary references consulted or attempted: https://c4model.com/diagrams

### threejs-shaders — corrected

Read root and entire GLSL/TSL guide. Checked r183 ShaderMaterial/renderer primary source; fixed RawShaderMaterial identity-matrix shadowing, Fresnel mixed coordinate spaces and normal normalization, missing dissolve varying, obsolete chunk/extensions and GLSL3 syntax mismatch, Vite raw import and TSL entrypoint/time API. Qualified output color/deformation/shadow/cache and branch-performance semantics.

Limitations: Static complete-tree review only; no shader compiler, WebGL/WebGPU renderer or visual benchmark. Host geometry, GLSL version and exact r183 backend are prerequisites; Official r183 TSL interoperability example was read; installed API/browser validation remains required. Metadata preserved.

Primary references consulted or attempted: https://raw.githubusercontent.com/mrdoob/three.js/r183/src/materials/ShaderMaterial.js, https://raw.githubusercontent.com/mrdoob/three.js/r183/src/renderers/webgl/WebGLProgram.js, https://raw.githubusercontent.com/mrdoob/three.js/r183/examples/webgpu_tsl_interoperability.html

### prompt-injection-defense — corrected

Read full standalone defensive guide. Repaired fail-open tool validator (missing/unknown fields, wrong types, ignored approval) into a narrow fail-closed schema example and marked external authorization enforcement. Removed general homoglyph/sanitizer/security guarantees, silent truncation and raw canary logging; qualified exact-match canary/secret patterns and unimplemented YAML, scoped token lifecycle, and changed forever-firing counter alert to a recent increase.

Limitations: Static complete-tree source review only; no LLM/red-team execution, tool call, monitoring deployment or measured detector efficacy. Regex/marker examples remain advisory and cannot enforce instruction hierarchy; trusted tenant/resource/exact-payload authorization still required. Upstream MIT attribution retained.

### n8n-code-javascript — corrected

Read root and complete Code guide. Corrected Each Item return object versus All Items array/pass-through, webhook query/body separation and invented HTTP helper context. Fixed empty averages/numeric concatenation and missing field guards, qualified item-linking/binary preservation, missing support/MCP tools and false map-versus-loop speed assertion; bounded logging, error-as-data and mutation retries.

Limitations: Static complete-tree review only; no n8n workflow execution, activation, HTTP request or MCP validation. Installed-version built-ins and pairedItem behavior require actual test workflow checks; examples remain mode-specific fragments. Metadata preserved.

Primary references consulted or attempted: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/, https://docs.n8n.io/data/data-structure/, https://docs.n8n.io/data/data-mapping/data-item-linking/item-linking-code-node/

### observability-monitoring-monitor-setup — corrected

Repaired unbounded route labels, missing Express/Python imports and trace adapter, duplicate/obsolete tracing setup, absent Alertmanager default receiver and literal secret expansion. Defined SLO helper omissions, CPU units, Grafana/module dependencies and telemetry redaction/validation boundaries.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/, https://prometheus.io/docs/alerting/latest/configuration/

### arcmira-find-quotes — retained

Retained explicit live method discovery, identity disambiguation, transcript state/quote provenance and paid-read bounds; read complete Apache license and preserved attribution. No current hosted API call or license-chain audit performed.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### neon-postgres — corrected

Corrected mandatory ORM and per-request host assumptions, compute floor versus suspension and branch/endpoint distinction. Bounded automatic integration/API-key setup and production branch data handling; preserved product references and made unavailable current-document verification explicit.

Limitations: Static review; attempted official Markdown pages were unavailable to the browser. No CLI/package installation, live API, infrastructure plan/apply or upstream licensing audit.

Primary references consulted or attempted: https://neon.com/docs/reference/cli-init.md, https://neon.com/docs/connect/choose-connection.md, https://neon.com/docs/introduction/scale-to-zero.md

### apify-audience-analysis — corrected

Read complete audience guide and runner; repaired credentials, network deadlines, option validation, capped private exports and CSV completeness using the independently reviewed matching helper while retaining audience User-Agent. Distinguished observable engagement from inferred demographics, private data and unique reach.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### candidate-talent-pool — corrected

Made unknown experience/contact optional, bounded numeric experience, enforced recorded-date and re-engagement consent rules consistently in SQL/JSON, and corrected title mapping and universal legal claims. Documented Notion enforcement, timestamp and external-ID limitations without inventing outreach.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### animated-github-profile — corrected

Removed unsupported exclusivity/reliability and sanitizer-bypass claims, corrected XML/reduced-motion/ID-context advice, narrowed generated staging and prevented commit failures being silently swallowed. Limited checkout credentials and documented actual hosted rendering/action/branch approval requirements.

Limitations: Static review only; third-party pinned revisions, hosted SVG browser rendering and workflows not executed or independently certified. Authorship/license metadata preserved.

### postgres-readonly-queries — corrected

Read all five files. Removed invalid automatic SQL LIMIT suffixing, bounded display options and corrected truncation detection; tightened keyword boundaries, suppressed sensitive server error text and defaulted certificate verification. Corrected false memory/write-guarantee claims and aligned critical database risk; helper now inert 644.

Limitations: Static review; no PostgreSQL connection or psycopg2 execution. SQL recognition remains deliberately conservative and not a parser; row display cap is not memory isolation.

Primary references consulted or attempted: https://www.postgresql.org/docs/current/sql-set-transaction.html

### radare2 — corrected

Read Chinese root and cheatsheet. Removed fictional bundled bootstrap/script guarantees, disabled-sandbox HTTP example and write-commit misconception; preserved command/evidence procedure with explicit unavailable supports, static sample isolation and patch-copy verification. Classified binary modification/service capability critical.

Limitations: Static command review; radare2 and ecosystem commands not executed. Official webserver page could not be retrieved; version-specific HTTP flags remain subject to local help verification.

Primary references consulted or attempted: https://book.rada.re/webserver/intro.html

### postgresql — corrected

Corrected invalid NULLS NOT DISTINCT syntax, obsolete partitioned foreign-key prohibition, partial-index upsert inference, now() volatility, heap order, TOAST and pruning misconceptions. Qualified index-only/skip scan/planner assumptions and missing RLS identity/bypass details.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://www.postgresql.org/docs/current/ddl-partitioning.html, https://www.postgresql.org/docs/current/sql-insert.html

### geo-llmstxt — corrected

Checked current v2 proposal and corrected root-only placement, specification versus editorial quotas/sections, unsupported adoption/citation claims, 403 inference and assumed automatic llms-full discovery. Added versioned public crawl and publication boundaries.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://llmstxt.org/

### meme-coin-audit — corrected

Preserved offensive authorization gates and eight-class source sweep while correcting inverted Kill-if mitigations, retained-authority equals confirmed fraud claims, invalid mint JSON decoding and LP burn assumption. Removed unsupported current-protocol/MEV percentages and investment sizing; labeled incomplete Foundry template honestly.

Limitations: Static review only; no chain/RPC/financial service, fork simulation, exploit or live engagement claims verified. Upstream license/author metadata retained, not independently audited.

### skill-porter — retained

Read the complete four-file bundle, including MIT notice and all eleven local-fixture tests. Retained bounded snapshot-first copying, symlink/special-node rejection, exclusive fresh destinations and narrow body-only translation. Byte preservation is appropriately distinct from semantic compatibility and hostile concurrent-filesystem isolation.

Limitations: Static review of implementation and tests only at this checkpoint; tests not yet executed. File modes are not preserved by the copier; docs promise support bytes, not executable installation or client certification.

### event-store-design — corrected

Read root and playbook; fixed missing asyncio, timezone-aware event dates, zero checkpoint handling, synchronous EventStoreDB iterator mismatch and unsafe unconditional DynamoDB batch overwrite. Added explicit global writer serialization to avoid sequence/commit checkpoint skips and documented single-event conditional-write incompleteness, pagination, idempotency and replay limits.

Limitations: Static implementation review only; no asyncpg, DynamoDB, EventStoreDB or concurrency/restore test. DynamoDB example deliberately remains incomplete, single-event and not production-ready.

### examprep-ai — corrected

Corrected priority-versus-probability framing, invented similarity/OCR thresholds, guaranteed marks and unsupported score range. Defined missing evidence/denominators, actual practice-based dashboard and synthetic worked-example boundaries while retaining all five study formats.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### project-memory-log — retained

Read all six files including MIT license, record templates and sanitized historical excerpts. Retained explicit enrollment, project-bound path selection, historical-evidence caveats, concurrent-writer reconciliation and truthful executed-versus-proposed checks; no record contents confer execution authority.

Limitations: Instruction-only static review; no project log initialized or historical validator rerun. Sanitized examples describe external historical paths, not installed files. Authorship/license notice preserved.

### cqrs-implementation — corrected

Read root/playbook. Fixed inherited dataclass default ordering, missing query imports/type variable, floating money types, unbounded pagination and shadowed search route. Stopped projector errors instead of silently checkpointing past failed events; corrected no-reads-in-commands advice and documented missing adapters, transactional checkpoints, auth and safe rebuilds.

Limitations: Static review only; domain/database adapters are intentionally unspecified and no FastAPI or projection runtime was executed.

### data-quality-frameworks — corrected

Read root/full playbook. Replaced mixed legacy/current GX APIs and nonexistent checkpoint assumptions with a versioned synthetic GX 1.x check and explicit orchestration procedure; removed raw failed-row reporting. Corrected fake portable contract/version claim, Snowflake billing assumption and duplicated column in dbt expression, with freshness/relationship/sequence limits.

Limitations: Static review against GX documentation; no GX/dbt/Soda installation or warehouse validation executed. Contract remains explicitly illustrative and needs a chosen formal schema.

Primary references consulted or attempted: https://docs.greatexpectations.io/docs/core/introduction/, https://docs.greatexpectations.io/docs/core/introduction/try_gx/

### threat-modeling — corrected

Read entire worksheet, library and automation. Removed broken multiline grep gate/filename-to-Python injection and unverified insecure container configuration in favor of a precise safe parsed-model gate procedure. Corrected fake Threat Dragon import schema, checksum/token-binding/opaque-ID assumptions and inconsistent scoring/mitigation evidence limits.

Limitations: Static design review only; no Threat Dragon, scanners, YAML CI or active assessment executed. Tool installation and import schema require version-specific validation.

### food-database-query — corrected

Read Chinese guide/root; exposed absent database/command and unverified data/test claims, corrected dict access/search tuple, zero bounds/percent denominator and higher-versus-healthier comparison. Distinguished nutrient reference types, missing values, raw/cooked density, generic cooking estimates and clinical recommendation limits.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://fdc.nal.usda.gov/, https://ods.od.nih.gov/HealthInformation/nutrientrecommendations.aspx

### admin-access-register — corrected

Aligned previously prose-only nonnegative integer count requirements with SQL/JSON/field reference and corrected Notion title mapping. Defined unknown checkbox/MFA aggregate ambiguity, sensitive vault-reference access and absent companion/timestamp limitations.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### brand-growth-system-builder — corrected

Read complete router; reconciled six versus eight category claim and nonexistent extra page-register layer, softened absolute dependency/NAP rules and qualified contrast criteria. Documented missing shared/reference/sibling prerequisites and proceeding on already specific artifact authorization.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### multi-source-search — corrected

Read full root, schema and validator. Corrected crashes on unhashable JSON source_type/kind/confidence values so malformed reports return validation errors; helper now inert. Clarified structural validation versus truth, capability versus provider independence and uncalibrated count-based confidence/URL identity limits.

Limitations: Static review only at checkpoint; validator does not retrieve or judge evidence. No network research program or upstream license-chain audit executed.

### geo-content — corrected

Checked Google primary guidance; removed unsupported universal AI E-E-A-T/update claim, minimum-word floors, date penalty and legal-evergreen assumption. Distinguished local equal-weight rubric from platform ranking/citation systems and style from authorship; required corroborated evidence and N/A denominator disclosure.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://developers.google.com/search/docs/fundamentals/creating-helpful-content

### analyze-project — corrected

Read root/sample completely; bounded private session discovery, unknown abandonment/timing and cohort denominators, and separated causal confidence from timestamps. Corrected sample threshold colors, unsupported intervention gains and plaintext/bypass-password test advice without claiming underlying sessions verified.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### database-architect — corrected

Read full architecture guide; aligned critical data/migration capability risk, removed unverified discontinued-product recommendation and supplied concrete order-service schema/index/migration decision example. Qualified CAP, sagas, replica consistency, compliance and tested RPO/RTO limits.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### reverse-browser-automation — corrected

Read Chinese root/cheatsheet; retained active testing as offensive with exact authorized-use/command gate. Removed silent bootstrap/all-host changes, default TLS bypass and cookie/storage/body logging; corrected stale placeholder references, networkidle reliance, local-response versus server-proof and captured-data boundaries.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://playwright.dev/docs/actionability

### hunt-http-smuggling — corrected

Read root and historical lab report. Removed blanket product vulnerability matrix, unsupported rewards and mass-credential-harvesting directions; retained protocol/parser workflow with separate controlled-client proof, request budgets and cache isolation. Corrected nine-variant count and missing lab/HTML-versus-executed-XSS evidence claims.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://portswigger.net/web-security/request-smuggling

### ad-campaign-analyzer — corrected

Retained strong descriptive-versus-causal workflow; corrected spending-to-significance advice and pure-reasoning claim for statistical calculations. Qualified default marginal-return labels, deduplicated reach/conversions, fractional-attribution inference and coherent CAC cohorts.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### papers-skill — corrected

Read full CLI/root; fixed dotted arXiv ID normalization and URL path encoding for both detail/citations, actual exponential retry, bounded numeric options, non-overwriting capped PDF download and text output. Removed guessed output filename/automatic dependency install/parity assumptions and clarified partial extraction/API ordering.

Limitations: Static review only; no Semantic Scholar/arXiv requests, downloads, dependency installation or PyMuPDF parsing executed. Modern numeric arXiv IDs only for download; parser resource limits remain external.

### changelog-updates — corrected

Read root, README and full detailed guide; corrected RFC 9745 Deprecation syntax, wrong Sunset weekday and always-safe semantic-version upgrade promises. Added actual tag-diff/artifact verification, benchmark/template placeholder limits and explicit draft-versus-publication authority.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://www.rfc-editor.org/rfc/rfc9745.html

### hunt-ldap — corrected

Read complete guide. Corrected RFC DN separator/filter-versus-bind confusion and replaced malformed universal bypass/blind extraction loops with a concrete local presence-versus-literal filter example and actual-expression controls. Removed command-line password/plaintext LDAP and decisive fake-referral assumptions; retained offensive gate and qualified severity.

Limitations: Static review against RFC/OWASP; no LDAP directory, login, payload, oracle or external callback executed.

Primary references consulted or attempted: https://www.rfc-editor.org/rfc/rfc4515, https://cheatsheetseries.owasp.org/cheatsheets/LDAP_Injection_Prevention_Cheat_Sheet.html

### promotion-upgrade-requests — corrected

Corrected synthetic approved/under-review contradiction and names, made draft salary/score/effective-date fields optional consistently and bounded months/salary SQL. Defined percentage denominator/currency/pay-period and score-scale/Notion unknown limits; retained human decision/payroll boundary.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### employment-contract-templates — corrected

Read root/full playbook. Removed legally-sound promise, made US at-will conditional and noncompete omitted pending specific counsel, corrected blanket monitoring/privacy, PTO forfeiture and unilateral policy-change clauses. Defined protected reporting/IP, classification and conflicting termination/benefit review boundaries.

Limitations: Static template review; no jurisdiction supplied, current law conclusion or enforceability certification. No contract sent, signed or employee data processed.

### apify-generate-output-schema — corrected

Read full single-file schema workflow and current Apify specification; corrected universal nullable/required-empty/additional-properties permissiveness, stale type authority and generic example limitations. Marked JSONC/property fragments honestly and separated source edits from live Actor execution and data disclosure.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://docs.apify.com/storage/dataset-schema

### emergency-card — corrected

Read full Chinese medical card workflow. Exposed absent generator/data/adapters, removed CDN dependency for offline privacy, corrected missing implants versus none, inferred diabetes/control state, guessed followup and blanket pacemaker MRI ban. Defined record confirmation, local severity schema, QR plaintext and usable private emergency contacts.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

Primary references consulted or attempted: https://www.fda.gov/radiation-emitting-products/mri-magnetic-resonance-imaging/benefits-and-risks

### using-agent-skills — corrected

Read root, pinned upstream notice, full MIT license and Definition of Done. Preserved support provenance/bytes and added host precedence, actual skill discovery, material-question scope and task-appropriate verification boundaries rather than universal deployment/runtime demands.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### n8n-mcp-tools-expert — corrected

Read complete root/guide; repaired undefined config/revalidation syntax and automatic activation advice. Made server-specific tool schemas/discovery, absent guides, unverified timing/success/template metrics, template trust and sanitization/version-update effects explicit; bounded staging/test/activation authorization.

Limitations: Static complete-tree review only; no target execution, live service test or independent upstream license audit. Metadata preserved.

### gcp-secret-manager — corrected

Read root/details and verified Google primary references. Removed literal secret shell inputs/payload logs, invalid version accessor role/alias command, fake PubSub top-level-name handler and unsupported event-type flag. Replaced dangerous secret-only pseudo-rotation with idempotent target-update/rollout procedure, plus TLS/private files/CSI/state/version boundaries.

Limitations: Static documentation review; no gcloud, IAM, SDK, Terraform, GKE or real credential rotation executed. CRC32C and complete deployment adapters remain explicit omissions.

Primary references consulted or attempted: https://cloud.google.com/secret-manager/docs/rotation-recommendations, https://cloud.google.com/secret-manager/docs/assign-alias-to-secret-version, https://cloud.google.com/secret-manager/docs/access-control
