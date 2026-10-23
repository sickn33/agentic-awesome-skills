# Individual source review: batch 10

Base: `dee7acce0658c35cb276154892700811affcfdb2`. Exactly 150 complete tracked skill trees reviewed individually, including every bundled support file. Catalog baseline: 2641 roots / 2743 entrypoints. No sampled or heuristic completion.

Review scope: semantics, examples, safety, declared risk, limitations and provenance. Authors, licenses and attribution retained. This is source review, not runtime certification. SDK examples and third-party claims remain subject to pinned-version/environment validation. External facts were checked where cited; uncited platform metrics were qualified rather than presented as verified.

Source-only changes: generated catalogs and plugin mirrors are reserved for canonical synchronization. Tessl and exact-current-head maintainer merge attestation remain pending. Full preflight and PR publication are handled by the parent maintainer task.

Validation: references, documentation security, diff whitespace and changed-script synthetic fixtures passed; validation of all 2743 entrypoints passed with Python 3.14. Full preflight/relevant repository tests pending parent.

The companion JSON contains the complete before/after SHA-256 and Git-mode inventory for all files.

## 1. aws-s3

Corrected GET-only presigning and nonexistent CLI upload signing; removed false gzip metadata; added configuration-replacement/lockout and destructive operation boundaries.

Limits: AWS CLI primary presign reference checked; lifecycle 7-day transition remains valid under July 2026 change.

Files fully read: 1. Sources: https://docs.aws.amazon.com/cli/latest/reference/s3/presign.html

## 2. database-migration

Removed destructive table-copy automatic restoration; qualified locking, concurrent-write and lossy transformation examples; retained useful ORM examples.

Limits: Examples reviewed as inert source only; database-specific rollback/locking not certified.

Files fully read: 1. Sources: Inline SQL semantics; no external supporting files bundled.

## 3. azure-resource-manager-durabletask-dotnet

Removed stale latest-version claim, separated cleanup from complete example, stopped classifying every 409/404 as one cause.

Limits: Historical snippets require package-pinned compilation; current reference reports 1.1.0 and newer API.

Files fully read: 1. Sources: https://learn.microsoft.com/en-us/dotnet/api/azure.resourcemanager.durabletask.durabletaskschedulerresource?view=azure-dotnet

## 4. seo-aeo-meta-description-generator

Qualified false hard character limits and unsupported penalty claims; required evidence for power words and escaped HTML attributes.

Limits: No CTR improvement or social preview certification.

Files fully read: 1. Sources: https://developers.google.com/search/docs/appearance/snippet

## 5. todoist-automation

Corrected no-pagination assertions and numeric-ID fallback; required schema discovery, scoped mutations and unknown-write reconciliation.

Limits: Rube schemas not executed; historical slugs require live discovery.

Files fully read: 1. Sources: https://developer.todoist.com/api/v1/

## 6. swiftui-liquid-glass

Replaced incorrect background example and unverified scrolling modifier with Apple documented backgroundExtensionEffect; added availability note.

Limits: SDK compilation and native accessibility not executed.

Files fully read: 3. Sources: https://developer.apple.com/documentation/SwiftUI/View/backgroundExtensionEffect()

## 7. interactive-portfolio

Qualified invented traffic/reviewer timing facts; required evidence for outcome metrics, accessibility and authorized publication.

Limits: No conversion or hiring guarantee; supporting guide fully read.

Files fully read: 2. Sources: Declared Apache upstream attribution preserved, not independently verified.

## 8. marketplace-rbac-audit

No actionable source defect identified. Read-only authorization matrix, synthetic negative tests, evidence distinctions and limitations are coherent.

Limits: No live authorization testing or provenance verification performed.

Files fully read: 1. Sources: Self attribution preserved.

## 9. context-compression

Removed unsupported benchmark numbers and universal compression guarantees; retained structured procedure, examples, probes and source attribution.

Limits: Historical research titles unverified; no comparative benchmark claimed.

Files fully read: 1. Sources: Declared research references retained as pointers only.

## 10. web3-testing

Fixed unbound fixture variables and missing metadata interface; replaced obsolete testFail naming, removed Goerli credentials and obsolete CI example; bounded legacy toolchain and local fork scope.

Limits: Requires project contracts and version-pinned compilation; inert examples not runtime-certified.

Files fully read: 1. Sources: Local lexical/semantic inspection; historical toolchain explicitly qualified.

## 11. feature-flags

Clarified flags are not authorization, scoped local demo and credentials, fixed React null client and bytes assertion, labeled incomplete helpers.

Limits: SDK/API snippets historical and require compilation; support tracking assumes extra model fields.

Files fully read: 2. Sources: Inline semantics; declared MIT source preserved.

## 12. evolution

Bound self-modification and hook installation to requested scope, disabled unreviewed mutable installer execution, qualified branch stability.

Limits: Hook scripts not bundled or runtime-certified.

Files fully read: 1. Sources: Declared upstream pointers preserved.

## 13. inngest

Raised none risk to critical for charges/emails/deployments; added missing EventSchemas import, authoritative order amount and provider idempotency, webhook verification and durable privacy boundaries.

Limits: Version-pinned adapters/SDK required; no payment or runtime test performed.

Files fully read: 1. Sources: Inline semantics; external API shapes not certified.

## 14. observability-and-instrumentation

Corrected tail-after-head error retention guarantee, scoped alert tests and qualified universal alert/average guidance.

Limits: Checklist and entire skill read; no telemetry transmitted.

Files fully read: 2. Sources: Supporting checklist already documents head-sampling loss.

## 15. docs-as-marketing

Removed broken signup URL and obsolete Node floor, moved secrets to environment, bounded real SMS and recording, qualified five-minute benchmark.

Limits: Read README too; no billing/send/analytics actions executed.

Files fully read: 2. Sources: Historical provider example; verified user scope required.

## 16. gitops-workflow

Replaced mutable remote kubectl applies, bounded secrets and auto-prune/force operations, qualified fragments and immutable prerequisites across three files.

Limits: No cluster access or controller/version validation performed.

Files fully read: 3. Sources: Inert manifests and credential-flow inspection.

## 17. sql-injection-testing

Corrected MySQL-specific DATABASE() mislabeled MSSQL, qualified parser-specific bypasses and single-sample timing confirmation, bounded OOB receivers and delays.

Limits: Offensive payloads not executed; retained written-authorization gate.

Files fully read: 1. Sources: SQL dialect semantics; historical payload compatibility unverified.

## 18. monday-automation

Scoped authenticated setup, schema discovery, exact returned identifiers, comments, bulk and raw GraphQL mutations; disabled invented missing-label default reliance.

Limits: Connector schemas and service response limits not runtime-certified.

Files fully read: 1. Sources: Declared community attribution preserved.

## 19. hunt-source-leak

Fixed PATH clobbering loops; removed path-trusting sourcemap writer; qualified impact, soft-404, mutable assets and wildcard HTTP examples; bounded private evidence and credential use.

Limits: No target probed; historical report_count/provenance claims unverified and labeled.

Files fully read: 1. Sources: Inert shell/Python inspection.

## 20. file-path-traversal

Removed unsafe prefix-check/include prevention code; supplied path-component containment sketch with symlink/race and authorization limits; qualified parser and RCE prerequisites.

Limits: No runtime or target tests; host filesystem races require specialized handling.

Files fully read: 1. Sources: Inert Python/PHP semantics.

## 21. hunt-springboot

Bound heap capture/stateful exploit steps, fixed duplicated actuator paths and JSON/arithmetic false-positive claims.

Limits: No target execution; historical report counts unverified.

Files fully read: 1. Sources: https://spring.io/security/cve-2022-22965/

## 22. aws-serverless-eda

Removed auto-loaded dependency fiction, disclosed absent references and racing idempotency sketch, documented partial-batch prerequisites.

Limits: No AWS deployment; inline sketches require adapters and conditional state.

Files fully read: 1. Sources: https://docs.aws.amazon.com/powertools/typescript/latest/features/idempotency/

## 23. azure-storage-blob-ts

Corrected browser stream claim, reduced broad SAS examples and qualified versions/lifecycle; bounded overwrites and key exposure.

Limits: No live account or SDK compilation performed.

Files fully read: 1. Sources: Inert Node/browser API review; historical SDK snippets explicitly qualified.

## 24. launch-strategy

Bound publications, outreach, paid offers and tracking; qualified unverified numeric case studies and owned-channel autonomy.

Limits: Planning review only; historical case outcomes not validated.

Files fully read: 1. Sources: Community attribution retained; historical examples labeled unverified.

## 25. firewall-config

Removed global SYN ACCEPT bypass and routine table flush advice; reordered UFW management allow, qualified IPv6/DNAT/late limiter and container recovery.

Limits: No firewall or network changes; requires host-specific atomic validation.

Files fully read: 1. Sources: Inert rule-order and network-policy inspection.

## 26. wireshark-analysis

Corrected invalid HTTPS filters, request/response download filter, privileged GUI advice and retransmission/TLS overclaims.

Limits: Full detailed guide read; no packet capture or decryption performed.

Files fully read: 2. Sources: Inert filter and protocol semantics review.

## 27. skill-rails-upgrade

Raised risk for mutations, bounded migrations, corrected diff-vs-customization and Git rollback claims, qualified app:update behavior.

Limits: No app startup, dependency updates or migrations performed.

Files fully read: 1. Sources: Inert workflow review; Rails guide remains primary required source.

## 28. bitbucket-automation

Corrected endpoint-only authentication and pagelen completeness; bounded comments/mutations and truncated diff review.

Limits: Current connector tool schemas not invoked.

Files fully read: 1. Sources: Community source retained; historical slugs explicitly qualified.

## 29. micro-saas-launcher

Qualified price/churn/time/channel assumptions, removed coordinated-vote instruction, bounded marketing actions and legal-template overclaims.

Limits: Entire supporting guide read; no market or conversion certification.

Files fully read: 2. Sources: Declared Apache attribution retained.

## 30. sqlmap-database-pentesting

Corrected technique Q, nonexistent resume option, column exclusion and direct-DB connectivity claims; bounded dump-all and replaced real target example.

Limits: Offensive examples not executed; exact-action authorization retained.

Files fully read: 1. Sources: https://github.com/sqlmapproject/sqlmap/wiki/Usage

## 31. architecture

Qualified numeric architecture thresholds and corrected JWT-versus-OAuth authentication comparison across complete six-file tree.

Limits: Architecture examples illustrative; no runtime certification.

Files fully read: 6. Sources: Inert design semantics review.

## 32. threejs-lighting

Removed nonexistent ContactShadows addon import and per-mesh light-layer claim, fixed hemi variable and qualified shadow filtering.

Limits: No GPU rendering; version-specific features require installed renderer verification.

Files fully read: 1. Sources: https://threejs.org/docs/pages/Layers.html ; https://drei.docs.pmnd.rs/staging/contact-shadows

## 33. template-library

No actionable defect identified in empty-template workflow, schema fields, requested-output boundaries or source attribution.

Limits: No Notion workspace changes; shared module workflow reviewed as source.

Files fully read: 1. Sources: Self source and repository attribution preserved.

## 34. gpu-kubernetes-operations

Fixed GPU memory utilization denominator, Xid gauge treatment, CUDA visibility and smaller-MIG OOM advice; qualified profiles/metric adapters/isolation.

Limits: No cluster mutation; version/profile matrix must be verified on target.

Files fully read: 1. Sources: Inert YAML/PromQL and resource-allocation review.

## 35. pipedrive-automation

Qualified authenticated connection, historical schemas and pagination; bounded ambiguous contacts, visibility and write retries.

Limits: Connector not executed; live field defaults not certified.

Files fully read: 1. Sources: Community source retained.

## 36. performance-tuning

Fixed blockdev option and daemon reload; bounded benchmark writes/network load and universal kernel presets.

Limits: No host tuning or benchmarks performed.

Files fully read: 1. Sources: Inert shell/system configuration review.

## 37. stakeholder-investor-reports

Repaired broken catalog Markdown link; otherwise coherent empty-template/report-verification scope.

Limits: No audited financial figures or live publication.

Files fully read: 1. Sources: Self source attribution preserved.

## 38. local-legal-seo-audit

Corrected retired FAQ rich-result recommendation, selective positive-review advice and ranking assumptions; bounded legal advertising/client confidentiality.

Limits: Read-only strategy audit; jurisdiction-specific legal advice not certified.

Files fully read: 1. Sources: https://developers.google.com/search/updates ; https://support.google.com/business/answer/7400114

## 39. box-automation

Corrected all-IDs-numeric and permission type claims, qualified authentication, sharing/signature scope and unknown writes.

Limits: Current connector schemas not executed.

Files fully read: 1. Sources: Inert contradictory field/ID review.

## 40. dei-dashboard

Required suppression checkbox in JSON, bounded group size and reidentification claims; repaired broken catalog link.

Limits: Template only; no protected data processed or hiring decisions made.

Files fully read: 1. Sources: Self attribution preserved; privacy limits are explicit.

## 41. ssh-penetration-testing

Replaced Paramiko AutoAddPolicy and plaintext credential logging; bounded credential attacks/pivot/persistence and removed wildcard NSE advice.

Limits: No target probing; host-key and test-budget prerequisites remain mandatory.

Files fully read: 1. Sources: Inert SSH/Paramiko workflow inspection.

## 42. aws-agentic-ai

Corrected bundled/auto-loaded MCP claims, disclosed external templates and region/status uncertainty, bounded cloud data/provisioning.

Limits: Service links are upstream prerequisites not reviewed executable files.

Files fully read: 1. Sources: Primary AWS documentation links retained.

## 43. dropbox-automation

Corrected case-sensitive path claim, authenticated setup and existing-link reuse/async write boundaries.

Limits: No live connector changes or sharing.

Files fully read: 1. Sources: https://www.dropbox.com/developers/paper-api-alpha ; https://www.dropbox.com/developers/documentation/http/documentation

## 44. nft-standards

Reserved full ERC721 mint batch before callbacks, fixed ERC1155 effects ordering, royalty inheritance and soulbound ID reuse; bounded legacy API and royalty enforcement.

Limits: Not compiled/audited; fragments require version-pinned local tests and missing helpers.

Files fully read: 1. Sources: Inert Solidity inheritance/callback/state analysis.

## 45. codebase-design

Replaced unconditional old-test deletion with coverage-preserving replacement; clarified mocks do not establish provider compatibility.

Limits: Complete three-file tree read; no code refactor or agent instructions executed.

Files fully read: 3. Sources: MIT author/source preserved.

## 46. mailchimp-automation

Bound test/live send and subscription consent, removed required-send implication and default validation-bypass guidance.

Limits: No email sent, scheduled or contact imported.

Files fully read: 1. Sources: Historical connector slugs/defaults qualified.

## 47. gamification-engine

Repaired malformed catalog link; empty-template workflow and safety limits otherwise coherent.

Limits: No live employee data, points awards or rewards.

Files fully read: 1. Sources: Self source preserved.

## 48. azure-functions-devsec

Excluded local settings/env files from ZIP with archive review, removed mass-assignment response and scale-based duplicate-timer fix; qualified runtime/plan behavior.

Limits: No Azure resources or deployment; examples remain version-sensitive.

Files fully read: 1. Sources: Inert package/security and event-processing analysis.

## 49. data-export-engine

Allowed unknown delivery date before completion, required personal-data flag and repaired link.

Limits: Empty template only; no source-system export.

Files fully read: 1. Sources: Self source preserved; schema consistency checked.

## 50. mobile-security-coder

Qualified device trust, screenshot/memory guarantees, native CORS, mandatory pinning and biometric/legal claims.

Limits: No platform runtime or compliance certification.

Files fully read: 1. Sources: Inert threat-model review; platform verification required.

## 51. marlin-bed-leveling

Qualified guaranteed adhesion/universal sign/state claims, corrected M420-enable-versus-load and G29 topology argument, bounded slicer presets.

Limits: No hardware commands; actual firmware/geometry and operator approval required.

Files fully read: 1. Sources: https://marlinfw.org/docs/gcode/M420.html ; https://marlinfw.org/docs/gcode/G029-ubl.html

## 52. basecamp-automation

Removed draft-to-active fallback and duplicate-create retry, bounded notifications/access changes and authenticated setup.

Limits: No messages, invitations or tasks created.

Files fully read: 1. Sources: Historical schemas qualified; existing attribution retained.

## 53. nexrad-mosaic-access

Corrected invalid WIDTH/HEIGHT JSON placeholder to null; provenance/grid validation workflow otherwise coherent.

Limits: No meteorological/runtime certification; current products must be verified on use.

Files fully read: 1. Sources: Official NOAA/NCEP pointers retained.

## 54. saas-multi-tenant

Replaced response-finish transaction commit pattern, qualified incomplete Prisma filter, corrected RLS DDL/pool claims and public cross-tenant sharing.

Limits: No database execution; complete isolation requires exact-role integration tests.

Files fully read: 1. Sources: Inert transaction/RLS/authorization review.

## 55. hunt-nextjs

Qualified status-based bypass/dev false positives, fixed shell PID expansion in action search and bounded synthetic probes.

Limits: No target probing; historical CVE conditions checked, not current framework certification.

Files fully read: 1. Sources: https://github.com/vercel/next.js/security/advisories/GHSA-fr5h-rqp8-mj6g

## 56. remote-work-tracker

Aligned SQL-required boolean fields in JSON and clarified agreed-plan versus inferred-presence semantics.

Limits: Empty templates; no employee monitoring.

Files fully read: 1. Sources: Self source attribution preserved.

## 57. progressive-web-app

Scoped cache deletion, removed default private API caching, bounded public resource allowlist, fixed null button and response/cache errors and opaque status claim.

Limits: Teaching sketches; no browser lifecycle/runtime certification.

Files fully read: 1. Sources: Inert service-worker security/lifetime review.

## 58. azure-storage-file-share-ts

Fixed destructive delete-one-snapshot example and response-as-poller error, narrowed SAS and qualified version/auth/directory semantics.

Limits: No Azure account mutation; entire support guide read.

Files fully read: 2. Sources: https://azuresdkdocs.z19.web.core.windows.net/javascript/azure-storage-file-share/12.27.0/classes/ShareFileClient.html

## 59. remotion-captions

Fixed broken root links and output path, scoped binary/model downloads/media disclosure, added HTTP fetch check; risk critical.

Limits: All six files including SVG/YAML read inertly; no transcription/install.

Files fully read: 6. Sources: Official upstream source preserved; version-sensitive helpers not certified.

## 60. azure-postgres-ts

Replaced racing pool-recreation refresh with per-connection password callback, encoded connection credentials and redacted error details.

Limits: No database connection; snippets require version-pinned integration and principal mapping.

Files fully read: 1. Sources: node-postgres official documentation pointer retained.

## 61. claimable-postgres

Bound provisioning to authorization; protect capability URLs and qualify retention/quota promises.

Limits: Historical CLI examples not executed or current service terms certified.

Files fully read: 1. Sources: Complete tracked source tree; source-only review.

## 62. azure-mgmt-apicenter-dotnet

Replace synchronous subscription lookup and collections with async patterns; qualify historical SDK examples.

Limits: SDK fragments not compiled; generated API types require pinned-version verification.

Files fully read: 1. Sources: Complete tracked source tree.

## 63. zero-trust

Require step-up denial and explicit threat absence; restrict DNS policy destination selectors.

Limits: OPA/CNI policies require environment tests and trusted inputs.

Files fully read: 1. Sources: Complete tracked source tree.

## 64. slo-implementation

Compute windowed success ratios from counter increases and qualify missing series.

Limits: Prometheus examples not evaluated against deployment telemetry.

Files fully read: 4. Sources: Complete four-file tracked tree.

## 65. traderspy-trading-signals

Distinguish touched levels from filled profitable trades and qualify provider statistics.

Limits: No independent archive or performance validation; service quotas unverified.

Files fully read: 2. Sources: Complete two-file tracked tree.

## 66. seo-fundamentals

Correct retired FAQ eligibility; make source checker advisory and distinguish no files from passing; allow decorative empty alt.

Limits: Heuristic source scan cannot certify rendered SEO/accessibility; script execution pending validation.

Files fully read: 2. Sources: Complete root and Python support; Google Search feature update log.

## 67. geo-proposal

Remove unsupported growth and score-to-revenue claims; scope package terms and commercial actions.

Limits: Proposal scenarios are illustrative and require prospect evidence.

Files fully read: 1. Sources: Complete tracked source tree.

## 68. m365-agents-py

Repair AgentApplication constructor/imports and conversation tracking; add token and version guards.

Limits: Fragments not executed; installed SDK and Azure configuration require verification.

Files fully read: 1. Sources: Complete tracked source; official Microsoft Agents Python samples.

## 69. arm-templates

Correct storage access tiers and qualify deployment/module fragments and permissions.

Limits: Templates not deployed; provider/version validation pending.

Files fully read: 2. Sources: Complete two-file tracked tree.

## 70. expo-tailwind-setup

Qualify preview dependency recipe; include CSS root import and Image barrel export; support both color schemes.

Limits: Historical NativeWind preview recipe not installed or device tested.

Files fully read: 2. Sources: Complete root and agents/openai.yaml.

## 71. apify-linkedin-jobs-scraper

Remove implicit paid-run authorization and price ceiling; retain diagnostics and qualify provider guarantees and recurrence.

Limits: No paid runs; live Actor schema/pricing not certified.

Files fully read: 2. Sources: Complete two-file tracked tree.

## 72. bash-defensive-patterns

Fix readonly temporary variable and cross-filesystem atomic-write examples; avoid inherited TMPDIR deletion and qualify strict mode/races.

Limits: Teaching shell fragments not executed; platform-specific testing required.

Files fully read: 2. Sources: Complete root and implementation playbook.

## 73. improve-codebase-architecture

Use strict Mermaid, escape untrusted repository content and disclose CDN/offline limitations.

Limits: Report scaffold not rendered; companion tools depend on environment.

Files fully read: 2. Sources: Complete two-file tracked tree.

## 74. arm-cortex-expert

Preserve PRIMASK state, remove unsafe default DTCM DMA placement, qualify barriers, W1C and static mut claims.

Limits: No firmware compilation or hardware tests; exact MCU datasheet remains necessary.

Files fully read: 1. Sources: Complete tracked source; https://arm-software.github.io/CMSIS_6/main/Core/group__Core__Register__gr.html

## 75. frontend-security-coder

No actionable source defect found; existing support correctly separates server authorization from browser validation.

Limits: No application or browser runtime examined; capability list is guidance.

Files fully read: 2. Sources: Complete two-file tracked tree.

## 76. aws-lambda

Repair function URL invoke permission and v1 event scope; reduce wildcard permissions and qualify retries/config replacement/performance claims.

Limits: No cloud deployment or SAM build; native dependencies and runtime support require target validation.

Files fully read: 1. Sources: Complete tracked source; https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html

## 77. alternatives-pages

Resolve unconditional logo-use instruction and qualify jurisdiction, publication and performance claims.

Limits: No legal determination or market/competitor research performed.

Files fully read: 2. Sources: Complete two-file tracked tree.

## 78. react-modernization

Repair React codemod package name, object rendering and loading/error behavior; label absent resources and historical fragments.

Limits: No dependency installation or React runtime tests; codemod CLI versions require validation.

Files fully read: 2. Sources: Complete root and implementation playbook.

## 79. screenshots

Remove chat/source-embedded password solicitation and implicit npx install probe; fix login URL and failing exit status; qualify readiness and capture privacy.

Limits: Customizable Playwright sketch not executed or pixel verified.

Files fully read: 1. Sources: Complete tracked source tree.

## 80. linux-shell-scripting

Replace unsafe ls-based rotation with preview, remove CLI password, guard failed cd and use fast-forward updates, make sync/cleanup previews and qualify tracing/crypto/monitoring.

Limits: Linux fragments not executed; backups and system operations require target-specific checks.

Files fully read: 2. Sources: Complete root and all481 lines of detailed guide.

## 81. agent-memory-discipline

Bind saves/hosted transfers to retention authorization; honor deletion instead of preserving closed copies; prevent historical evidence from overriding current policy.

Limits: No backend invoked; deletion capability depends on actual backend and must be disclosed.

Files fully read: 2. Sources: Complete two-file tracked tree.

## 82. performance-optimization

Remove single-query include guarantee; guard null config and public cache scope; qualify budgets, historical TTI and conversion claims.

Limits: No profiling or field measurements; absent upstream checklist remains explicitly external.

Files fully read: 1. Sources: Complete tracked source tree.

## 83. azure-ai-openai-dotnet

Replace outdated exception handler family and current-version assertion; scope deployment/model compatibility and unsafe content assumptions.

Limits: SDK snippets uncompiled; mixed historical API baselines require pinned-version checks.

Files fully read: 1. Sources: Complete tracked source tree.

## 84. api-security

Repair broken JWT Python and fragment/Referer claim; replace unconditional all-step execution, scope DoS/metadata/CI and mark pseudocode/tool dependencies.

Limits: No target probes or tool installs; source review does not certify tool claims.

Files fully read: 3. Sources: Complete three-file tracked tree.

## 85. supabase-automation

Correct endpoint/auth guarantee and narrow error diagnosis; scope privileged SQL/key retrieval and qualify connector snapshot and pagination.

Limits: No connector or database operations; live schemas/permissions unverified.

Files fully read: 1. Sources: Complete tracked source tree.

## 86. one-drive-automation

Correct endpoint/auth and upload overwrite guarantees; distinguish connector delta exposure from Graph capability and scope sharing/recursive pagination.

Limits: No Microsoft connection or file operation; live connector snapshot unverified.

Files fully read: 1. Sources: Complete tracked source tree.

## 87. team-calendar

No actionable source defect found; template artifacts align on required event type/date and clearly exclude actual scheduling.

Limits: Free-text times/time zones are an index only, not a timezone-aware scheduling model.

Files fully read: 1. Sources: Complete tracked source tree.

## 88. azure-ai-voicelive-ts

Correct inconsistent transcription callback and async audio return; qualify preview versions, browser credentials, audio encoding and tool/microphone scope.

Limits: No audio session, compilation or model availability check.

Files fully read: 1. Sources: Complete tracked source tree.

## 89. wordpress-theme-development

Repair invalid theme.json typography presets, remove penetration-testing route for CPT creation, mark invented/version-dependent hooks and conceptual pattern input.

Limits: No WordPress installation or 7.0 compatibility certification; release feature claims remain explicitly unverified.

Files fully read: 2. Sources: Complete root and490-line guide; https://developer.wordpress.org/themes/global-settings-and-styles/settings/typography/ ; https://developer.wordpress.org/themes/patterns/registering-patterns/

## 90. apify-tiktok-scraper

Remove implicit spending allowance and compatibility guarantee; retain errors, protect zero-view ratios and scope downloads and AI labeling.

Limits: No paid run or independent provider-price/field certification.

Files fully read: 2. Sources: Complete two-file tracked tree.

## 91. n8n-multi-instance

Do not infer single-instance access from missing tool; resolve name/ID consistently and qualify server safety/lifetime guarantees and concurrent target races.

Limits: No n8n server queried; session guard behavior version-dependent.

Files fully read: 1. Sources: Complete tracked source tree.

## 92. azure-appconfiguration-java

Remove configuration-value logging and clarify labels, flags, Key Vault references and snapshot limits.

Limits: Java SDK fragments uncompiled; selected BOM/methods require version checks.

Files fully read: 1. Sources: Complete tracked source tree.

## 93. cc-skill-security-review

Remove insecure CSP defaults and fabricated Solana verifier/API assumptions; handle missing requester and explain session binding, uploads, replay and CSRF limitations.

Limits: No application tests or transaction execution; intent sketch is not on-chain validation.

Files fully read: 2. Sources: Complete root and detailed guide.

## 94. aws-rds

Correct byte-to-8KiB parameter formulas and static Terraform apply method; remove wildcard prerequisite and forced failover default; qualify snapshots/secrets/DR.

Limits: No database provisioned; examples need current engine/provider/region validation.

Files fully read: 1. Sources: Complete tracked source; https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Tuning.concepts.memory.html

## 95. architecture-decision-records

Correct MySQL/MongoDB capability claims, distinguish PostGIS extension and retention/temporal-query assumptions, label fictional decisions.

Limits: No technology benchmark or real ADR approval performed.

Files fully read: 1. Sources: Complete tracked source tree.

## 96. orca-replay

Qualify sole-variable and exact replay claims, npx local resolution and automatic scrub completeness.

Limits: No replay, installed-package certification or provider comparison executed.

Files fully read: 1. Sources: Complete tracked source tree.

## 97. js-reverse

Replace missing bootstrap executable path with explicit prerequisite limits; require isolation for untrusted Node execution and redact runtime secrets.

Limits: No browser instrumentation or extracted code executed; historical MCP names unverified.

Files fully read: 13. Sources: Complete13-file tracked tree including every reference.

## 98. oral-health-analyzer

Remove unsupported pocket-depth staging/cancer factor counts and health-age claim; correct delayed dental/biopsy triage and add emergency signs and health-data scope; raise declared risk.

Limits: No diagnosis or clinical validation; remaining habit weights explicitly unvalidated educational examples.

Files fully read: 2. Sources: Complete root and529-line guide; https://www.nhs.uk/symptoms/toothache/ ; https://www.nhs.uk/conditions/mouth-ulcers/

## 99. bats-testing-patterns

Fix nonexistent skip_if, parallel/verbose flags and lost command-status assertion; use Bats-owned temp storage and qualify stubs/background waits/platform permissions.

Limits: No Bats installation or suite execution; examples require reviewed helpers.

Files fully read: 2. Sources: Complete root and implementation playbook.

## 100. sendgrid-automation

Correct endpoint/auth and compliance guarantees; distinguish draft creation from actual send, authorize audience/verification effects and verify async outcomes.

Limits: No emails, contact changes or connector calls; limits are historical.

Files fully read: 1. Sources: Complete tracked source tree.

## 101. linux-privilege-escalation

Remove ineffective unprivileged cp SUID example and environment dump; qualify patch ranges, container host impact and persistent cleanup scope.

Limits: No target commands or exploits executed; vendor applicability and shell behavior require controlled lab verification.

Files fully read: 2. Sources: Complete root and436-line guide.

## 102. notion-template-business

Remove false zero-fee Marketplace claim and fixed processor rates; qualify access locking, revenue hypotheses and duplication/publication privacy.

Limits: No business launch or profitability validation.

Files fully read: 2. Sources: Complete root and detailed guide; https://www.notion.com/help/selling-on-marketplace

## 103. agent-evals

No additional actionable source defect found; existing evaluation contract explicitly rejects keyword/judge scores as safety proof and bounds paid/provider execution.

Limits: Application adapters, fixtures and dependencies not bundled or executed; historical examples not model certification.

Files fully read: 1. Sources: Complete tracked source tree.

## 104. azure-monitor-query-java

Repair nonexistent single-result status usage, qualify cache freshness and migrated APIs, and align critical cloud-data risk.

Limits: No Java compilation or log/metric queries; deprecated/migrated APIs require pinned version checks.

Files fully read: 1. Sources: Complete tracked source; https://learn.microsoft.com/java/api/overview/azure/monitor-query-readme

## 105. knowledge-base

Allow unreviewed drafts without fabricated last-review dates; repair catalog link and distinguish metadata/identifier fields from enforcement.

Limits: Empty register template only; no wiki or permission implementation tested.

Files fully read: 1. Sources: Complete tracked source tree.

## 106. model-supply-chain-security

Remove invalid reusable-workflow step, unsafe sign-to-fix/conversion advice and automatic promotion approval; require digest/predicate validation and qualify SLSA/scanning limits.

Limits: No signatures, scans, training, CI or cluster policy executed; illustrative fragments need version-specific implementation.

Files fully read: 1. Sources: Complete tracked source tree.

## 107. remotion

Fix composition registration location, missing spring/fps and unsupported generic quality flag; mark absent support files and public-asset/timing constraints.

Limits: No video render, Stitch request or dependency installation; tool availability and media permissions unverified.

Files fully read: 1. Sources: Complete tracked source tree.

## 108. makepad-deployment

Bind local preview to loopback, quote signing paths and qualify moving tool dependencies and raw IPA distribution claims.

Limits: No platform build/install/signing or action execution; absent supports remain external.

Files fully read: 1. Sources: Complete tracked source tree.

## 109. broken-authentication

Correct obsolete composition guidance, real breached-account testing and session-fixation/MFA assurance claims; bound credential attempts and cookie/entropy conclusions.

Limits: No authentication probes; standards applicability depends on actual application policy.

Files fully read: 1. Sources: Complete tracked source; https://pages.nist.gov/800-63-4/sp800-63b.html

## 110. memory-systems

Remove unsupported cross-system benchmark/latency claims and vector impossibility assertions; scope persistence/access/deletion and historical evidence trust; align critical risk.

Limits: No retrieval benchmark or backend implementation tested; conceptual fragments only.

Files fully read: 1. Sources: Complete tracked source tree.

## 111. alumni-re-hire-tracker

Align required eligibility boolean across SQL/JSON and allow unknown contact/re-engagement dates without fabricated records.

Limits: Empty template only; no hiring or outreach decisions made.

Files fully read: 1. Sources: Complete tracked source tree.

## 112. debugging-strategies

Remove user-object logging and mandatory reproducibility claim; scope production diagnostics/heap dumps and mark missing upstream resources and incomplete Go snippets.

Limits: No debugger or profiling executed; incident evidence and app build configuration not supplied.

Files fully read: 2. Sources: Complete root and implementation playbook.

## 113. idor-testing

Correct status-only vulnerability/success claims and nonexistent model update method; scope enumeration to known controlled objects and explain throttling/UUID limits.

Limits: No API probes or Django application tests; missing auth/validation context explicitly documented.

Files fully read: 1. Sources: Complete tracked source tree.

## 114. sop-company-wiki

Allow draft records without fabricated last-review dates and repair malformed catalog link; clarify approval metadata.

Limits: Empty register only; no document publication/version control executed.

Files fully read: 1. Sources: Complete tracked source tree.

## 115. geo-audit

Remove unsupported visibility uplift and score-prediction claims; correct automatic schema/llms/crawler severity and JS indexability assumptions; bound sampled scoring and URL scope.

Limits: No site crawl or AI visibility test; heuristic rubric not platform ranking certification.

Files fully read: 1. Sources: Complete tracked source tree.

## 116. robius-widget-patterns

Avoid self.state borrow conflict in loading state update and qualify absent production patterns, missing defaults and no-op wrapper success.

Limits: No Rust build; framework revision and omitted application types require validation.

Files fully read: 1. Sources: Complete tracked source tree.

## 117. oneroster-csv-validator

Correct bulk header/value rules,1.2 role layout and exchange/delta baseline requirements; fix multi-org splitting, strict decoding and false complete PASS.

Limits: Illustrative linter not certified or executed; full version schemas and duplicate/cycle/manifest checks not implemented.

Files fully read: 1. Sources: Complete tracked source; https://www.imsglobal.org/spec/oneroster/v1p2/bind/csv/ ; https://www.imsglobal.org/spec/oneroster/v1p2/cert/ ; https://developers.imsglobal.org/oneroster-v11-final-best-practice-and-implementation-guide

## 118. neon-postgres-branches

Scope branch creation to requested provisioning, protect connection strings and distinguish active minimum compute from scale-to-zero suspension.

Limits: No Neon branch/API operations; historical CLI/config/quotas require current docs before execution.

Files fully read: 1. Sources: Complete tracked source tree.

## 119. internal-communication

Allow absent follow-up dates, repair catalog link and distinguish recorded delivery status from actual send/read evidence.

Limits: Empty log template; no communication sent.

Files fully read: 1. Sources: Complete tracked source tree.

## 120. aws-ec2

Remove invalid EC2 target-tracking cooldown properties, wildcard IAM and blind installer execution; protect key files and qualify AMI consistency/refresh/networking.

Limits: No cloud provisioning or Terraform plan; examples require current regional and CLI validation.

Files fully read: 1. Sources: Complete tracked source tree.

## 121. database-migrations-migration-observability

Fix missing registry/import/undefined migration, counter deltas and unsafe auto-commit baseline; document transaction retries, blocking async and incomplete CDC/CI contracts.

Limits: No migration, Kafka connector, alerts or dashboard deployed; examples not end-to-end runnable.

Files fully read: 1. Sources: Complete tracked source tree.

## 122. reports-analytics

Allow never-run/unscheduled reports and align timestamp storage/examples with JSON date-time offsets.

Limits: Empty report register; no data computation or distribution tested.

Files fully read: 1. Sources: Complete tracked source tree.

## 123. azure-eventgrid-dotnet

Replace log-only acknowledgement with durable handler placeholder, correct CloudEvent required fields, serializer import and blanket failover; qualify reject/dead-letter behavior.

Limits: No event publish/consume or SDK compilation; Functions/API modes and limits need target verification.

Files fully read: 1. Sources: Complete tracked source tree.

## 124. aws-iam

Fix S3 read/list blocked by upload-only condition, narrow Terraform OIDC subject, use scalar ARN condition and repair tab-separated MFA enumeration.

Limits: No IAM policy attachment/simulation; global-service exceptions, KMS and effective permissions require target review.

Files fully read: 1. Sources: Complete tracked source tree.

## 125. spark-optimization

Fix unsupported shuffle auto value and PySpark storage level, ignored checkpoint and unpersist-before-action; qualify no-shuffle/runtime-metric claims and empty skew input.

Limits: No Spark jobs or correctness benchmarks executed; runtime-specific Delta/private API fragments remain explicitly qualified.

Files fully read: 1. Sources: Complete tracked source tree.

## 126. advanced-analytics-dashboard

No additional actionable source defect found; existing text distinguishes metric registry from prediction and handles unknown targets.

Limits: Empty template only; no metrics, models or connected dashboard validated.

Files fully read: 1. Sources: Complete tracked source tree.

## 127. policy-acknowledgement

Allow pending acknowledgment date, align required booleans and nonnegative integer overdue semantics, repair broken links and distinguish signature evidence.

Limits: Empty register only; no policy issue/reminders or legal signature validation.

Files fully read: 1. Sources: Complete tracked source tree.

## 128. robius-app-architecture

Return explicit dispatch failure instead of silent request loss; qualify absent production patterns, repeated worker starts, unbounded queues and shutdown/WASM gaps.

Limits: No Rust compilation or application runtime; snippets omit app-specific types and services.

Files fully read: 1. Sources: Complete tracked source tree.

## 129. sbom-supply-chain

Fix fail-open missing vulnerability report and fixed-only critical filter, narrow signing identity and remove invalid shell HTML comment; qualify attestation trust and execution effects.

Limits: No scanner/policy/signing execution; input adapter and digest/predicate verification remain required.

Files fully read: 1. Sources: Complete tracked source tree.

## 130. javascript-mastery

Correct var initialization/top-level this and shallow freeze claims; preserve this through partial curry calls and qualify falsy/async teaching examples.

Limits: Independent language examples not executed as a combined program.

Files fully read: 2. Sources: Complete root and detailed guide.

## 131. using-n8n-mcp-skills

Replace speculative403 credential-recreation advice and arbitrary node-count claim; qualify tool/companion availability and versioned guidance.

Limits: No n8n instance access or workflow mutation; live schemas remain authoritative.

Files fully read: 1. Sources: Complete tracked source tree.

## 132. jev-social

No additional actionable source defect found; explicit pinned-runtime, browser, paid-provider, media and publication boundaries are coherent.

Limits: Source-only catalog review does not independently attest the external commit/runtime or credential-routing claims; no CLI executed.

Files fully read: 1. Sources: Complete tracked source tree; embedded upstream pin baf3cd6aa4f9c881665c29ed29a10391f761760b retained as declared provenance.

## 133. screen-reader-testing

Remove unsourced market shares and broken custom modal JS with undefined modal/nonfocusable heading; distinguish raw DOM hints from computed accessibility tree.

Limits: No real reader/browser test; replacement modal behavior requirements require app implementation and testing.

Files fully read: 2. Sources: Complete root and implementation playbook.

## 134. linkdigest-social-link-reader

Add missing credit ceilings to generic examples, remove exact-caption/OCR and no-local-effect guarantees, bound polling and scope hosted share-token/retention claims; align critical risk.

Limits: No hosted call or independent service-price/privacy/runtime certification.

Files fully read: 1. Sources: Complete tracked source tree.

## 135. prompt-caching

Stop eager paid LLM calls on cache hits, preserve semantic prompt order and handle text blocks; remove unsupported savings guarantees and require auth/source-aware cache keys.

Limits: No provider/cache benchmark or SDK compile; incomplete cache adapters and current pricing require validation.

Files fully read: 1. Sources: Complete tracked source tree.

## 136. recognition-rewards

Replace unrelated personnel-review text in public recognition example and allow point-free recognition without fabricated amounts.

Limits: Empty register only; no awards, payments or announcements.

Files fully read: 1. Sources: Complete tracked source tree.

## 137. wjttc-builder

Prevent missing-secret required checks from silently skipping and conversation/rubric scores replacing real gates; qualify100% coverage, production-ready and flake classification claims.

Limits: Plan generator only; no suites/FAF hooks executed or certification authority established.

Files fully read: 1. Sources: Complete tracked source tree.

## 138. employee-suggestion-hub

Align required anonymous flag and nonnegative whole votes; repair link and contradictory example; clarify checkbox does not provide anonymity.

Limits: Empty register; no anonymous collection/privacy system tested.

Files fully read: 1. Sources: Complete tracked source tree.

## 139. azure-resource-manager-mysql-dotnet

Fix synchronous default-subscription lookup and async collections, remove embedded password and weak TLS mode, qualify409/networking/token/restore semantics.

Limits: No Azure deployment, connector or SDK compilation; historical generated types require target-version verification.

Files fully read: 1. Sources: Complete tracked source tree.

## 140. burpsuite-project-parser

Name missing wrapper prerequisite, fix Java option order and wc output interpretation; avoid full dump for counting and qualify header safety/resource limits.

Limits: No Burp/extension launch or captured traffic parsed; external wrapper/version not certified.

Files fully read: 1. Sources: Complete tracked source tree.

## 141. developer-newsletter

Qualify unsupported cadence/benchmark/spam claims, correct Markdown-code rendering and open-rate interpretation, scope actual sends/list/tracking changes.

Limits: No newsletter sent, ESP comparison researched or deliverability/rendering tested.

Files fully read: 2. Sources: Complete two-file tracked tree.

## 142. rust-async-patterns

Fix channel receiver never ending, zero concurrency limit, unpinned async stream and invalid spawned borrowed Drop pool/race; qualify partial errors and shutdown.

Limits: No Rust crate compiled; application/dependency types omitted and production pool behavior untested.

Files fully read: 2. Sources: Complete root and implementation playbook.

## 143. smtp-penetration-testing

Correct RCPT/relay code-only conclusions and universal TLS/spoofing guarantees; remove wildcard intrusive NSE and real Gmail recipient; distinguish own-message headers from injection.

Limits: No SMTP probes or emails; controlled delivery scope and TLS/DNS validation remain necessary.

Files fully read: 2. Sources: Complete root and detailed guide.

## 144. salary-benchmarking

Repair catalog link and specify missing compensation comparability/source context and unknown-value handling.

Limits: Synthetic values only; no market salary research or compensation decision.

Files fully read: 1. Sources: Complete tracked source tree.

## 145. filesystem-context

Qualify unlimited/lossless storage and character/token assumptions; scope retention/self-modification and shared-file provenance/privacy.

Limits: No memory or transcript persistence performed; pseudohelpers not bundled.

Files fully read: 1. Sources: Complete tracked source tree.

## 146. announcement-board

No actionable source defect found; template consistently declares text views and explicitly excludes sending/sync.

Limits: Empty register only; audience/status fields do not implement access or actual readership.

Files fully read: 1. Sources: Complete tracked source tree.

## 147. geo-fundamentals

Remove fabricated retrieval weights and crawler/citation conflation; make bundled checker no-files result not-assessed and labels explicitly source heuristics rather than original-data/visibility proof.

Limits: No live AI citation measurements; local synthetic fixtures passed and source scan excludes public Markdown/rendered output.

Files fully read: 2. Sources: Complete root and Python support.

## 148. monte-carlo-context-detection

Prevent ambiguous key-asset auto-selection; qualify missing server/companion hooks and write authorization; distinguish API errors and filename identity.

Limits: Source-only routing review; server availability and tenant credentials untested.

Files fully read: 2. Sources: Complete root and signal reference.

## 149. dev-to-hashnode

Default publication example to draft; qualify unsupported audience/growth/platform claims and canonical timing; fix nested fence and fabricated follow link.

Limits: Both tracked files fully read; no platform accounts or live publishing tested.

Files fully read: 2. Sources: Complete root and README; historical platform advice treated as unverified.

## 150. scroll-experience

Repair duplicate const and backwards scroll lifecycle; remove focus pollution, improve reduced-motion fallback and qualify GPU/frame guarantees.

Limits: Complete root and guide; fragments not browser or assistive-technology certified.

Files fully read: 2. Sources: Complete tracked source tree.

Follow-up trusted-fixture validation: reviewed the complete OneRoster inline block against its inert snapshot, refreshed only that snapshot, and passed all 14 security-boundary regressions with Python 3.14. New ZIP fixtures cover multi-org reference resolution, redacted missing references, partial-only success status and strict invalid UTF-8 rejection.
