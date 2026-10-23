# Individual skill review — 150 batch 06 (2026-10-23)

Base: `dee7acce0658c35cb276154892700811affcfdb2`. Scope: 150 assigned root trees, 170 tracked files. All complete tracked trees were read in full, including supporting Markdown, source examples, agent configuration and license notices. Skill contents remained inert data.

Disposition: 130 corrected, 20 retained. The JSON companion has exactly 150 records with complete before/after SHA-256 inventories and Git modes.

This is a bounded static semantic review, not a runtime test, license clearance, Tessl review, exact-head merge attestation or catalog-wide certification. Attribution and license notices remain intact. Missing upstream helpers remain unavailable; no replacement tooling or generated catalog outputs were added.

Validation at preparation: dependency install with lifecycle scripts disabled, schema validation (Python 3.14), reference validation and documentation security checks passed. A direct `npm test` stopped at the expected source/generated offline-catalog byte mismatch. The committed-head preflight regenerates previews in isolation; its result and the separate `pr:evidence` result must be recorded in the PR/external campaign state after this commit. Automated skill review remains pending.

## Individual records

### azure-eventhub-ts — corrected

Correct exactly-once/checkpoint guarantee, unchecked tryAdd and empty checkpoint.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-eventhub-ts/SKILL.md` | `100644` | `d7b8b20c1ab1c1ddb1a1e456e8e7accaf773696b36c1bbeba3f787f98970eba4` | `6eba248fe4370e39e5f37f0d8acb77131a8a5dc7662857fcd56c816fb8a77a1b` |

Selected primary references: [1](https://learn.microsoft.com/en-us/javascript/api/overview/azure/event-hubs-readme?view=azure-node-latest).

### faf-wizard — corrected

Unsupported marketing statistics/readiness/native compatibility require qualification; avoid automatic sync overwriting instructions.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/faf-wizard/SKILL.md` | `100644` | `e270f9bbcd116ed4afde03bc70f6fc410d33256f8bc83930879937695ec79305` | `24582f1233b3dc4ba45795dcacd445717dda24e692d752def4ef9415190f7eda` |

Selected primary references: [1](https://raw.githubusercontent.com/Wolfe-Jam/faf-skills/main/README.md).

### design-ux — retained

Retain rendered/independent audit workflow; no external publication authority.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/design-ux/SKILL.md` | `100644` | `e6e9bb4272f4a72ccfcbb6a599f93fbeb0a3607a5ef080667b5554ce26453f06` | `e6e9bb4272f4a72ccfcbb6a599f93fbeb0a3607a5ef080667b5554ce26453f06` |

### mailtrap-managing-contacts — corrected

Add scoped audience consent and deletion/import/export authorization; live schema already requires OpenAPI.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/mailtrap-managing-contacts/SKILL.md` | `100644` | `2917884d34e03717de2aa526761548b31e760d5110a78ce500f45bcc22ffd745` | `18b25757dfa0cfdbd27b04c2e6df5fd25cd901df3488ad45a97f2c760bf0c768` |

### pricing-strategy — corrected

Correct always above-alternative rule and inconsistent conjoint price exclusion.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/pricing-strategy/SKILL.md` | `100644` | `c39e0fac3df841f9f0379ecb1a843dad66de318c96f1cd9546a7180936e41c57` | `1417fc76ee4751d23a33add33ffe5212b9b8793609f2236f1d34f9facff09d72` |

### azure-ai-translation-ts — corrected

Potential mixed Translator API versions; verify package docs, label snippets version dependent. Document stream write handling and response guard.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-ai-translation-ts/SKILL.md` | `100644` | `92f75f8ea435af55b8ebe196501a2004d17b39cb217b21d4e831e13c3a44a192` | `26c2aa0ae0ffa6b10ee84b288a772ea35cc644c0c98ee0221b4ed9169ffc03bd` |

Selected primary references: [1](https://learn.microsoft.com/en-us/javascript/api/overview/azure/ai-translation-text-rest-readme?view=azure-node-latest).

### unreal-engine-cpp-pro — corrected

Correct prefer addToRoot to strong pointer RAII, IsValid before dereference; soft loading labeled async currently synchronous. Read Actor cpp/h fully.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/unreal-engine-cpp-pro/SKILL.md` | `100644` | `baac83a8c28633b8f3b017f70c7f302207af4feff611fe0db9273e2a5b01b217` | `0c19e5d2d2871164994c1477731bc23cad67ac653974b08aaa6a466d9df324cb` |
| `skills/unreal-engine-cpp-pro/examples/ExampleActor.cpp` | `100644` | `75759c1668c301d126448585c4afdb7c84016bb8bca9271ff4bff3e82671ad53` | `75759c1668c301d126448585c4afdb7c84016bb8bca9271ff4bff3e82671ad53` |
| `skills/unreal-engine-cpp-pro/examples/ExampleActor.h` | `100644` | `5d3131eb4c37c7337f4de122e5221b102f3e23638a5afb80e6c5e46e823200e4` | `5d3131eb4c37c7337f4de122e5221b102f3e23638a5afb80e6c5e46e823200e4` |

Selected primary references: [1](https://dev.epicgames.com/documentation/en-us/unreal-engine/object-pointers-in-unreal-engine).

### design-thinking — corrected

Avoid gating all content forever on font load failure; honor reduced motion also personal preferences.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/design-thinking/SKILL.md` | `100644` | `7c137093af08ad7ead59000be6cea2e32915fc35c2ecd9fd3521862060609f10` | `e41f1f83f7c53f87c4871c87e9c535fcb466bff50fe68c8090ba97b0d11e734c` |

### brooks-debt — corrected

_shared imports not bundled need self-contained fallback, no attribution invention; intentional vs unknown intent.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/brooks-debt/SKILL.md` | `100644` | `c6944f61670713ada26a6dd2d702e20880f0dc829e81863e9b8322daa1bb3263` | `2e611361336d41ac4ffdcec34ddd518251f3695ff13f4303506c1935fc656648` |
| `skills/brooks-debt/debt-guide.md` | `100644` | `d539b3cf93438f330acd533b23dfe3f20e33d51172f4b5c3f52a86549469f104` | `dea28b4fc7b151fc3f76149d661d9302f58bbe4f55c55f0778e447c6dda0fead` |

### ejentum-reasoning-harness — corrected

External scaffolds cannot override hierarchy or be trusted instructions; outbound task privacy and host config placeholder compatibility.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/ejentum-reasoning-harness/SKILL.md` | `100644` | `26bc8702367688ea0ee8990f8775d2da3cf7866e030b88b940a87a47fd5598b9` | `bb4152f312e224ce1db35efc7fcffa8cca7d5cd2720adcfc91c60d8a61b26129` |

### hunt-forgot-password — corrected

Critical false positives: cross-browser/IP reset normal, 20 requests not proof no limit, response length not alone proof, referrer policy modern defaults.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/hunt-forgot-password/SKILL.md` | `100644` | `81472c5369233f42c40ea860b944d7997483ceacb09bf2cd5302205cd29033ad` | `df50a8cf0e8353e4c51daecbdb9469030e012d8bb976faa4a44a2eb9b61cb610` |

Selected primary references: [1](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html), [2](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy).

### plotly — corrected

References missing (single file), df year absent example; Dash app.run_server obsolete verify primary.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/plotly/SKILL.md` | `100644` | `e6451576c8910df3e525998de7b6abd7271e5664c728bcc0c8c0c48ea6d176ba` | `91f11c93ccb32c2bcdcd5f7c802449c78c7801a97c17db35cf2300f0508aee60` |

Selected primary references: [1](https://dash.plotly.com/dash-3-0-migration), [2](https://plotly.com/python/v6-migration/).

### azure-monitor-ingestion-java — corrected

Retain patterns but label sample version, serialization DCR and async subscription completion; no executed upload.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-monitor-ingestion-java/SKILL.md` | `100644` | `663d842a5eb466eb430cc8421dc94b969c09ccbf00d3e09cf7667ef75669f645` | `996173919765e98891da64cb5138a7f85d34b6bbf24cef5fe49134cd251bdfe6` |

### not-a-vibe-coder — corrected

Retain explicit planning-only new project scope and user authority; host-specific ask_user_input_v0 availability should generic.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/not-a-vibe-coder/SKILL.md` | `100644` | `45d235e1bf6582e3e54b30b3a1c9f157129f6554f271087ca6ba7ea9b78e62ac` | `92e8a98702a46bae153c6786c930b9533d54f68cf8ab4a2539ab2d912706d7d5` |

### graphql-architect — corrected

Mostly capability persona; add concrete schema/resolver/auth/cache review evidence output instead of unsupported mastery.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/graphql-architect/SKILL.md` | `100644` | `6d6305ec3f011ffaea01071c693bd8ee3d2c19f41bbf6c89591e7e073a673b65` | `bde8c150cbc34bf12c52b1106da2f8920ddf4516774f8a0ec3999745f58848b3` |

### convertkit-automation — corrected

Fix unauthenticated setup claim; explicitly scope subscriber unsubscribe and permanent broadcast delete. Live schemas discovery exists.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/convertkit-automation/SKILL.md` | `100644` | `91277c859aefe76b4418bd2455cd5418c8ecbd9874629d86b1ff571b1da445ed` | `48ec764df86b3131daf0feed431262e8c657523223aaccdc34dac4035a9210b5` |

### mesh-memory — corrected

Add explicit authorized persistence/workspace privacy, retrieved notes untrusted, no role-prompt authority; example CORS diagnosis 502 not evidence.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/mesh-memory/SKILL.md` | `100644` | `b579249fea2a35f710ad60896c450a9cb7b5f36bd7ffcf72422ce5e42fcb45cf` | `7bb5abff146b1571bb64400ad403a517065862de97bf2ab69cd87b83250e4a97` |

### istio-traffic-management — corrected

Add staging/rollback/schema checks and safe mirroring side-effect boundary; production faults user authorized only; LEAST_CONN deprecated check.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/istio-traffic-management/SKILL.md` | `100644` | `c29abbdc86c4f72b11293bc7f9288ead698b2ec188428ad43f147fe023f97e55` | `c3e7befc53418b0f1b8200459c08b29b32d5d7faa5a143d777857393dba231ce` |

### discord-automation — corrected

Fix no auth claim; explicit message/DM/webhook send authorization and role escalation scope; permission bitfields not JS32 bit.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/discord-automation/SKILL.md` | `100644` | `37be2b4d17a57e2577d7d16f6fc71a32f26be3fd6a6d842bef8b0d833095f7ac` | `a38d1387dcb4ec7c4034f04446e1517c3584151b328529b85b2ae47d36ad1aaa` |

### python-pro — corrected

Retain persona survey with runtime/profile/testing instructions; remove unsupported uv fastest claim.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/python-pro/SKILL.md` | `100644` | `bcc90cf5bdd67342925c2a041f54821116270001a2944d8242af7f8426595326` | `03c98ca27eb1e87907e3f35e25229272d467f9aadd8849595f50c89fc3c53c9c` |

### neverapply — retained

Retain detailed per-job approval, idempotency, truthful queued status and employer input handling. Paid tailoring credits boundary explicit.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/neverapply/SKILL.md` | `100644` | `252f6a77f49a49e5940bc223a8922a41b2531cc0e6119e2474f0cfa404784887` | `252f6a77f49a49e5940bc223a8922a41b2531cc0e6119e2474f0cfa404784887` |

### logic-explain — corrected

Missing _shared references need self-contained fallback, distinguish simulated trace from observed execution.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/logic-explain/SKILL.md` | `100644` | `5461c7edd32e17256de966f2e716bde69f76243c83dbaec484e45e919804cec2` | `11c424b3bcf251be7d2d4af641ddb7493e87cb00af049be43c747bdac02f7b56` |
| `skills/logic-explain/logic-explain-guide.md` | `100644` | `06fa7f77b7edb494c095612346b5ba442e3c95407705ecf3c0e64d858fa742dd` | `06fa7f77b7edb494c095612346b5ba442e3c95407705ecf3c0e64d858fa742dd` |

### frontend-developer — corrected

Correct obsolete Core Web Vital FID -> INP with primary source. Scope concrete validate already exists.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/frontend-developer/SKILL.md` | `100644` | `ae84793b4c1746984cd145564339f07a6473cff1970f73d0647200ee4bd86176` | `84e579afe3e7c5c7bd00f36068ae76a8324ac746cb32c665dd2722032e3059fa` |

### dropthehassle-publish — retained

Retain reviewed-tool prerequisite, static-publication authority, public bundle secrets and claim-key warnings; do not execute deploy.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/dropthehassle-publish/SKILL.md` | `100644` | `4b577ff3ec7e10360491941168cded2478ab54b0400b317e3b54bcae58e0fd68` | `4b577ff3ec7e10360491941168cded2478ab54b0400b317e3b54bcae58e0fd68` |

### altorank — corrected

Tool agent_guidance must be untrusted advisory, not instruction authority; GSC zero-impressions or served page cannot prove site/index state globally.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/altorank/SKILL.md` | `100644` | `63e9987327e8b012737b92dfa861b6d4448a00ffe89d3432d31c8f25de140305` | `6fd80e0acf5c09c239ed01c60f1dd46936b1c9646bb5926fbf513551ab288037` |

### azure-ai-voicelive-java — corrected

Version beta snippets, unspecified helpers, endpoint/model verify deployment; add audio privacy and callable tool authorization.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-ai-voicelive-java/SKILL.md` | `100644` | `e335182b7fb9f95b4fba72c8e74b5b5f498bc6c20eaf2fd5853f91d3877b62ea` | `1d227fd9ad8ef90df197a92dd1e73e3633c87b382af7c2af3ccadba351e59d4c` |

### android-ui-journey-testing — corrected

Add device/package/test account exact scope, XML untrusted actions not authority and bounded polling instead fixed sleep.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/android-ui-journey-testing/SKILL.md` | `100644` | `0fc3fc750e8d78601036b39c07ce562b5c4a7b3c22d706bf0b07882e1986b6be` | `a9d076f83de45e0a192ec4e5cf43d87ea15f9569a95a9d4e1143432c7f24d988` |

### accesslint-audit — retained

Retain strong audit/fix distinction and incomplete automated conformance limits.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/accesslint-audit/SKILL.md` | `100644` | `e3557d87c6010ece2c5b5d5b4e522f7da4369f480ab554361d3b8bb54d3056d1` | `e3557d87c6010ece2c5b5d5b4e522f7da4369f480ab554361d3b8bb54d3056d1` |

### bug-hunt-swarm — corrected

Read openai yaml; example incorrectly asks implementing within read-only workflow fix example.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/bug-hunt-swarm/SKILL.md` | `100644` | `b83ba8a8d828000eb47980f0edd10e7a36a44f0dc5b1560f7379ac7e6e9d51fe` | `fe2f85c195c048bebce2d463626c51af525b391c1743b228ff77cc07257fe4c2` |
| `skills/bug-hunt-swarm/agents/openai.yaml` | `100644` | `b9926dce1b2b6b08d0a916a852610fcddfd818b2574742f890568780c8f02628` | `b9926dce1b2b6b08d0a916a852610fcddfd818b2574742f890568780c8f02628` |

### mock-hunter — corrected

Replace false proof heuristics: endpoint names/roundness/no network/DB miss not proof; client search no request may be valid; DOM literal not necessarily hardcoded source.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/mock-hunter/SKILL.md` | `100644` | `7a5866f7d3680bffc01850f601cf1c5db84139c24904383e0e165ee743478447` | `e4414f3ff476828499a907e58174d5a62ef6f1257dfaed80f33534a026102363` |

### quit-sponsor — retained

Retain already evidence-bounded adult smoking coaching, opt-in health logs, clinical/emergency escalation. No clinical advice given.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/quit-sponsor/SKILL.md` | `100644` | `ad8a3ccf7fe0b0a1d8f5a7e42eb48073123d1e7c441d54497c17607f2e799284` | `ad8a3ccf7fe0b0a1d8f5a7e42eb48073123d1e7c441d54497c17607f2e799284` |

### makepad-event-action — corrected

Remove unbundled slash-sync recommendation that conflicts availability guard; APIs dev-branch fragments verify exact crate.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/makepad-event-action/SKILL.md` | `100644` | `076909637942cd88be8b6010aebba9f0cd4298447abc1f408428cce7bd74887d` | `038b9c71d6da44b686131ab4e3dc3787fc696eda2a8fc29745d79a65b62a2c11` |

### sred-project-organizer — corrected

Missing two templates list empty; biased maximize eligibility and binary no evidence classification unsafe tax claims need balanced triage expert review.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/sred-project-organizer/SKILL.md` | `100644` | `7fc9cae879065dcd3e0826ccdd378dc8a9c4d90554d6d21cfef691812b253762` | `d6879bd8331873e4fbe1a20ce892da53d75cf5c23fccef8c189fa2bdd976f421` |

### make-automation — corrected

Fix auth setup claim; reads do not authorize recreate scenarios/notify channel writes, timezone caches not timeless.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/make-automation/SKILL.md` | `100644` | `c7cf27cc617e0b2dac2718591eba4dd5dbe166e9e4a4116b95b64ae824d40ad6` | `c9a04aa2b93b46961891d8eb7e6ef67258e00e40b43681f519755ac884a23b2e` |

### azure-ai-translation-text-py — corrected

Version-specific signature needs SDK scope; translations cloud privacy and max100 batch service limits verify exact.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-ai-translation-text-py/SKILL.md` | `100644` | `ad5258a64c2528027d91b791a38839cfe744581d49de27d64d6ffaae514c3035` | `36c2c447742aae2fe5e47ebcdecf3d6db562a3e2ed6d4c8dbf4a0d87889ff6b7` |

### klaviyo-automation — corrected

Read workflows are concrete; fix unauthenticated setup and clarify read scope cannot initiate sends or change audiences.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/klaviyo-automation/SKILL.md` | `100644` | `9e79a9ff4b1982b1016076f30051efe4ced9fafc3ddd67a1ebd53a554f9f9c0a` | `b8aab4b36e90ebfd33ce425a902c496f4f71ce6a323153ed9d21aed6fbc4f089` |

### react-component-performance — corrected

Fix clickable li keyboard semantics; memo optimization not guarantee only props; retain profiling.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/react-component-performance/SKILL.md` | `100644` | `e5ed04f3693f9ab303dd66b5c241134781bf1b10dfac23aa386d10cbd93a6d1a` | `ff1516b4447e6fa0cfb21dda46ebcc2b83f893ac0dbe832c80e928ec91efc390` |
| `skills/react-component-performance/agents/openai.yaml` | `100644` | `0ca8b1dec24d486a237cf5b5d7909e0a0c3386f56c1a8d184b52a29496478ffc` | `0ca8b1dec24d486a237cf5b5d7909e0a0c3386f56c1a8d184b52a29496478ffc` |
| `skills/react-component-performance/references/examples.md` | `100644` | `5d1cef41aefaaa18c1be616080ce5489027a6123d76d5821b6c5ef43edcb7dc1` | `5d1cef41aefaaa18c1be616080ce5489027a6123d76d5821b6c5ef43edcb7dc1` |

### vercel-deployments — corrected

Correct removed request.geo and auth mislabel, inject-safe GitHub comment data via env, production authorization, failure propagation/pinned CLI.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/vercel-deployments/SKILL.md` | `100644` | `234835f033976f1d627dcf0a0c1a7a5892430fbc74a8606ed25b65724ea17373` | `262489da022ee2e5114e51ffefaeab6fc853c5a67e24c89a6a7517c571abd4d1` |

Selected primary references: [1](https://nextjs.org/docs/app/api-reference/functions/next-request).

### codex-fable5 — corrected

Retain explicit identity/hierarchy limits; optional install must verify full artifact not only ref before activation.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/codex-fable5/SKILL.md` | `100644` | `63ed22d4a7e008bc56d89a886c73e0106d44109920183778deef763df7f4cc74` | `ba1a9d5e138f1506e1262ffa855fdd74a68da77737fc2264b825eaea733bb200` |

### makepad-widgets — corrected

Remove unavailable sync slash recommendation and placeholder description; version-dependent widget table no guarantee.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/makepad-widgets/SKILL.md` | `100644` | `d5f9c527ca8011ac85d8ac7a5d3a4e02e17ec24c7e1174cc9bbd2b7096ada439` | `78f3d7a586d465d9e698dca9cbf4d2e5640f76001e8d55a076eeeb3761d05f78` |

### saas-mvp-launcher — corrected

Invalid Prisma # comment/missing WorkspaceMember; outdated Clerk auth call; checkout userId untrusted and missing entitlement webhook boundary.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/saas-mvp-launcher/SKILL.md` | `100644` | `146980ffa353903e41166bb71876a5da46b1289fec7f287b3167f2365005f28d` | `7ac2446c0f6aba740848b50c213424a049e2d367b9810b54269a9717a88f96d0` |

Selected primary references: [1](https://clerk.com/docs/reference/nextjs/clerk-middleware).

### dotnet-backend — corrected

Broken UserResponse constructor, missing GetUser/DTO setup fragments; fake EmailSender logs then Sent=true defect must fail closed; auth configuration not actual validation.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/dotnet-backend/SKILL.md` | `100644` | `4d2c39335d42e3a3d10cf2aa48f1c47f31a8dc22c33dfd8fc3b32342db80ea5f` | `d4ef82b98384dbef4b2cecb04bd446ee336f8981db626ae8c1f3ed5e30f68b8d` |

### azure-storage-queue-rust — corrected

Retain official crate auth/API reference workflow; add at-least-once/idempotency visibility timeout and delete after success; tokio macro features.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-storage-queue-rust/SKILL.md` | `100644` | `d5501422238b5b5c8a5e120da828b688c62ee6ad4cfeb71ad2bee4050439dab2` | `2912074780ce160ff9875f248d2d89e3af8fea98a5fed294cb4f83b6d36c9be8` |

### jq — corrected

Remove printing API_KEY example and false cannot write statement; shell redirection can truncate inputs, safe data transport not eval.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/jq/SKILL.md` | `100644` | `707a536337c871d23bd3d1359aeed24331429422aebe67617a42229ad1862a2a` | `1f35623fbc57ce5d81271f3686a5c1ed8084e253edb4dd025fc6a29a87e9b1f5` |

### golang-pro — retained

Retain version-scoped capability survey and testing/profiling requirements; no generated/runtime evidence.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/golang-pro/SKILL.md` | `100644` | `a1c6e19e3a9266c88ead5a13314481c90e4efec8873b5900a7fb0638feaf65fd` | `a1c6e19e3a9266c88ead5a13314481c90e4efec8873b5900a7fb0638feaf65fd` |

### nextjs-seo-indexing — corrected

False SEO states forced redirect/static requirement, relative canonical valid metadataBase, params async newer.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/nextjs-seo-indexing/SKILL.md` | `100644` | `9b993317b1ec401984b15987dcc512d4c506618a848bb44b3605715cfaa03d1c` | `9c4c5d400d15d6ae84d1a670af43dc1df7a0cb11eca005957a5808ae1c65950b` |

Selected primary references: [1](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

### rust-pro — corrected

Qualify higher-kinded emulation and nightly portable SIMD; avoid std memory safety universal for unsafe/FFI.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/rust-pro/SKILL.md` | `100644` | `e15691bdc6ce9cf1326728e665ad2bcf035b0e104b669fdada6d0ca308ef9aef` | `b14c01aac8d9f2c458e8c968d667253bea68bd7f23498e17b6a7e651d6630ff5` |

### mailtrap-testing-with-sandbox — corrected

Retain separation live/sandbox but never forwarding guarantee should mention forwarding settings; HTTP endpoint live schema check.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/mailtrap-testing-with-sandbox/SKILL.md` | `100644` | `d0c8d11a6253da83304447c79acfec1a2446f4bdf5d8a73f6318b578f8c71239` | `9b4d8d3663ba8e0b568721a3403f6150c530078c343891b0069e30a36c26dac8` |

### rich-elicitation — corrected

Remove self-exemption security:docs, cap ambiguity assumptions cannot authorize risky missing scope, tool optional.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/rich-elicitation/SKILL.md` | `100644` | `c73712264173594339a517f019755265ee16dd00d3dfcf60087ad29500106cc6` | `049e165147b0eab410a6103d574369f4c25137af4735a4d9c470f680acc89f7a` |

### azure-cosmos-java — corrected

Fix .map on sync response, undefined query @status parameter and partitionKey mismatch; version LATEST not pin.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-cosmos-java/SKILL.md` | `100644` | `6ea79d1921bd393d9164489860cfa6de54badfaa51ae331bdf7260da5c177291` | `ddfd5fbec8197bc7af84409a0fb1c7ac549e54c1bd2f03c034a3aefed0924d54` |

### cypress-skill — corrected

Missing reference files; secrets .type log false and session id no password; cloud cost/export approval.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/cypress-skill/SKILL.md` | `100644` | `881d8bc3c855e30db14439d58a6237146d448b2136ae72d5c75effb7d13f0029` | `d913539230779d15defa09b848cbb0a4c63b3990a36c04682befb5623545518e` |

### agentic-test-audit — corrected

Runner fetched pin but execution project pytest is code, disposable copy not sandbox; add env/network credential limits.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/agentic-test-audit/SKILL.md` | `100644` | `1883363b9b7d92b31245300a77a4ffe6e0ada41b34305a2cc1af541939c33951` | `d8f1194d4d4a86101b04ae1b399238018e48a6d0d5dac1f7e170a60b9e054ca9` |

### review-swarm — retained

Retain complete read-only four lanes+yaml with evidence/confidence and no fixes.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/review-swarm/SKILL.md` | `100644` | `a8435bb3a8e945f44cc88d1b88c44d678a4b4d428a3d6f1c876e63fb69fe8cc0` | `a8435bb3a8e945f44cc88d1b88c44d678a4b4d428a3d6f1c876e63fb69fe8cc0` |
| `skills/review-swarm/agents/openai.yaml` | `100644` | `4221ebcc950ab8037f39d64bd2ee5e360f5603d9bf9c63926b3f5d56699c0caa` | `4221ebcc950ab8037f39d64bd2ee5e360f5603d9bf9c63926b3f5d56699c0caa` |

### variant-analysis — retained

Retain scoped variant workflow; missing METHODOLOGY/resources explicit prerequisite, ~50% heuristic not stopping completeness proof.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/variant-analysis/SKILL.md` | `100644` | `2559b7a83a9537cbb089ee90228a694f6881cae69834fe293c4a01b21c7dd183` | `2559b7a83a9537cbb089ee90228a694f6881cae69834fe293c4a01b21c7dd183` |

### cal-com-automation — corrected

Fix auth claim; booking sends attendee notifications, webhook private data destination, confirm scope and duplicate retry.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/cal-com-automation/SKILL.md` | `100644` | `49f89a6767ab2d5035b6ddac632e0964a24cc4d05e865ac78f54b1c09b814681` | `fda1c2ee1ca546cc6a99acc53a24e95a74d8033c751b1dce5d554aaec36951af` |

### issues — corrected

Use --body-file and validated --repo for untrusted shell text; existing request info skip redundant interview, host question tool optional.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/issues/SKILL.md` | `100644` | `a9dd216f606afc6c4509d3ed52e59e2cfe94bf27c9bc8fdcb73b77b8e74acb93` | `7abc791075bc43057db24f4e81c76bdd36fcd16275bb5c530246efa21d4c5488` |

### agent-orchestration-multi-agent-optimize — retained

Retain already bounded disjoint-authority/cost/cancellation and explicit pseudocode; no agents spawned as execution.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/agent-orchestration-multi-agent-optimize/SKILL.md` | `100644` | `cf9ecd27188896cc152341be1a606f3b13656397d8be047b350a7497f3e73176` | `cf9ecd27188896cc152341be1a606f3b13656397d8be047b350a7497f3e73176` |

### traderspy-market-briefing — corrected

Qualify OI-price correlation not explanation WHY; neutral funding not universal; six calls conditional7; primary current claims service-specific unverified.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/traderspy-market-briefing/SKILL.md` | `100644` | `e2d527b6322fc789737f379b001b077c9c857d3f2b416557fcc78b94321f7e47` | `e72621c1581e32dd51abfc1683113a84395cc98914dc1e4ec98c84481dc13dab` |

### prompt-library — corrected

Replace hidden thought-process request with concise reasoning summary; role experience fictional clarify no actual credentials.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/prompt-library/SKILL.md` | `100644` | `f411280b745b0d990d886afeb2fbbb12c305441bd1fa0d71678930f50f772a2d` | `3527859b365f95d1164bb0d8971029d3baf0e496d2b6f1c54c288f008903161c` |

### stripe-automation — corrected

Auth setup; explicit account/test-live amount currency effects idempotency, cannot infer search prevents duplicate. Invoice auto finalization claim verify docs.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/stripe-automation/SKILL.md` | `100644` | `4dca5a28ad267a256d3dab063ee48833b6b97c59104818ad9d74c79947df701f` | `5b7f1eb4052481175da9054c419faae37025b97adfc283541cbba857f3e30369` |

### azure-web-pubsub-ts — corrected

Token URL log leaks bearer, wildcard group roles broader than comment; negotiate req.user unconfigured verify app auth and no anonymous; rotate secrets.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-web-pubsub-ts/SKILL.md` | `100644` | `0730476e5afa55acd8dbf57ccb08e46e19947cada3e26bff5048e1c497a8e638` | `7adc4ba21c25c2d133fec52b11720a9279471a875592ad896a47e840510e0825` |

### hunt-captcha-bypass — corrected

200 no proof and adaptive risk challenges no token may valid; concurrency bounded approval and no bursts; severity contextual.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/hunt-captcha-bypass/SKILL.md` | `100644` | `46ae2a8311f848ab64a3bc0994d3e5487865cd444f6ff83f36d178da3139a867` | `553944ffa107c303cb4436106aae5967ecb7ce1a14fb71b0b53ed9537964f730` |

### gpu-server-management — corrected

Destructive purge, disableECC default, impossible4x2g MIG, topo NV labels incorrect, overwrites rc.local.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/gpu-server-management/SKILL.md` | `100644` | `2bcd6ebeb2048d951e6e27c1d00ca66c3a9e5ae759a1e7053de03528d2493bfb` | `1bdc6c324db65934777973a029fa69e1156cef01f2c2f9db3d8a648a5ee265c3` |

Selected primary references: [1](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/supported-mig-profiles.html).

### assay — corrected

No network absolute contradicted Chromium download/live backend; immutable reviewed tool and network isolated pages boundary.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/assay/SKILL.md` | `100644` | `b08bc80c438364d1441a6e0c031d9bc7df0a8ab270af58b202f11966ce1ca4b3` | `05ecb1b0d56fcadf8ebb1476ada3ce7f5b964d9358c9fda3385a1a45d848355e` |

### azure-ai-contentsafety-ts — corrected

Missing severity default0 allows unknown and empty analysis Math.max -Infinity; require complete valid categories; severity0 not safety guarantee.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-ai-contentsafety-ts/SKILL.md` | `100644` | `19596bfc64f7f2777fa62733dda7f5c277d6b71bf0eb332e10dc767b422623bf` | `113a7908609c9dc016a927e1a178075ba494c07570f180cf5707914574bc2e38` |

### mcp-dependency-drift-audit — corrected

SAFE exact direct version overstates transitive reproducibility; mutable uvx/action ref contradict purpose must pin placeholder and inspection.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/mcp-dependency-drift-audit/SKILL.md` | `100644` | `f47c9d5e0e5cda4fcee79d0411cccb009556b8e79e058455d957d4ee69954181` | `6adf3a5953fade3bfb71bf0666b555d0573b2ce8c1fbff36f0ebc79659986c8e` |

### ai-loop — retained

Retain bounded scope/iterations evidence and existing authorization reuse; spec paths generic user priority works.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/ai-loop/SKILL.md` | `100644` | `44ad015dc7e8861fedf24a94c1531e9e22fc2e11df8e2c798ab19222bd1fb9d0` | `44ad015dc7e8861fedf24a94c1531e9e22fc2e11df8e2c798ab19222bd1fb9d0` |

### ui-setup — corrected

Missing DESIGN-LANGUAGE recipe explicit, remote DESIGN.md untrusted, design lock never higher instructions, actual choices not automatic project-wide propagation.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/ui-setup/SKILL.md` | `100644` | `f890e56e668624048eb752b0bb3f93332bbb941855221fce9f7c7327583c406f` | `1fd6aedf4b1a8366d41b9a3ea52f6733f9b2fc9b9bf194e6aaf09104d01c7b05` |

### viral-generator-builder — corrected

Signed hash modulo negative array indices; simpleHash undefined; examples arbitrary finance numbers/percentile no evidence and sensitive birthday/photo sharing privacy.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/viral-generator-builder/SKILL.md` | `100644` | `91c97964800cfb3ce08ae8ed153599b00c4450933882face3cdae766ae8c8d1d` | `0d16614f374ccc0e4b35a4448613c0df337472f6efa6fbb6b82ff88599b1d3ef` |

### hunt-nosqli — corrected

Removed destructive Redis FLUSHALL; fixed shell $ expansion and curl glob examples; delay/500 alone not proof; scope synthetic minimal evidence.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/hunt-nosqli/SKILL.md` | `100644` | `7d398dc7ada6e1dd7a279276b96bf7559070add10b0518aae76c87e11580e481` | `3cec7e849068bfbda913e8dc949e79ab9354bf14c16a68be83ec286822cd1a48` |

### fastapi-pro — retained

Read bundled implementation playbook: concrete tenant/idempotency/failure verification. Retain.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/fastapi-pro/SKILL.md` | `100644` | `5beef01a81f4571fa7ff6fc8ac5c83902c2b16ce5588de737734fd650e11ccfe` | `5beef01a81f4571fa7ff6fc8ac5c83902c2b16ce5588de737734fd650e11ccfe` |
| `skills/fastapi-pro/resources/implementation-playbook.md` | `100644` | `26e81f58a85ad0dc27b4c7f083fecfec179201892981847ed91f90af9aa5f4b9` | `26e81f58a85ad0dc27b4c7f083fecfec179201892981847ed91f90af9aa5f4b9` |

### zoho-crm-automation — corrected

Auth claim and irreversible lead conversion/CRM-trigger notification scope; schema/rate limits provider-specific.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/zoho-crm-automation/SKILL.md` | `100644` | `50e88930e15eaef187afc8326110e08eadbbc8e7b7d937917bd755d94535ce03` | `3a28b70b149df6f25b3fd04e9246ea609d1c1b13c91447c8aa0d89877522a29e` |

### nextjs-supabase-auth — corrected

SSR setAll updates request+response cookies; read-only Server Component set throws; auth server validation and RLS, redirect next strict local path.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/nextjs-supabase-auth/SKILL.md` | `100644` | `82bbd17e1a3179f86172a438c6ef4b7b69e653cb2af1532c6fbaf957ff7b3edf` | `627f89f687ca103a992fe5d27f07d90bbb786d10c8766cefde4a58aeaf853126` |

Selected primary references: [1](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs).

### weightloss-analyzer — corrected

Wrong Chinese BMI attributed WHO, revised HB called1919, double-count exercise, unsafe absolute cal floors and flawed tables/safety claims need medical-safe correction primary.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/weightloss-analyzer/SKILL.md` | `100644` | `39becc3605930621a62b091f0be46fa9b2bda6d576b1b74709fd6b7daecd13d1` | `831a72f11cf4c78e2fdbe3d8493877138336f61062ffd47baef187559f3a2c12` |

Selected primary references: [1](https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html), [2](https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner), [3](https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html).

### cloud-architect — corrected

Retain architecture capability scope but deployment/service availability/pricing not independently current; add concrete plan/rollback no automatic provisioning.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/cloud-architect/SKILL.md` | `100644` | `dc08df63621f8a7addf816a8dd885b85b01055b3ecf7b8c8813c97ff257aa871` | `81db2f4af0b3ac2792b948e02811ab6b1e47e9e202898afb2286ed881545a622` |

### opentofu-migration — corrected

Removing lock -upgrade mixes provider migration; state backup/no concurrent writers; CI apply replan wrong artifact, injection into JS plan output, shared role and untrusted PR risks.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/opentofu-migration/SKILL.md` | `100644` | `273553c940d3bdd20b5bf71659fdc97938319037bb1e70c085feaa6267e0b200` | `01ac595c146c142f8cf79a4c06e256d3166728b7a174e226b7aec1df688e0943` |

Selected primary references: [1](https://opentofu.org/docs/intro/migration/migration-guide/).

### c4-code — corrected

Fix stray triple/quad fences break rendered guidance; retain code evidence template.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/c4-code/SKILL.md` | `100644` | `4f71b739baf4fa48dbf10ec9ee0ff120540d21de054e5b488043301136552d91` | `d1ac029c497cdc44f9eb1748e9ca816e470c1b52213f04c36846312013b793d4` |

### azure-mgmt-botservice-py — corrected

Remove logging channel key and define resource mutation scope; Multitenant new registrations version docs requires verify, F0 not universal free all integrations.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-mgmt-botservice-py/SKILL.md` | `100644` | `0f488edc8354fc3c7caea12523890b6046fee99d36ae93295e25ef497690defc` | `e8087fc84bc48eece252c8e9da9491a68b421b24b9fa37ff233aa0970fe1ad88` |

### outlook-automation — corrected

Auth setup and email/attachments untrusted private, explicit sending/calendar write scope beyond read workflows; do not execute attachments.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/outlook-automation/SKILL.md` | `100644` | `38db5616f57fabe315a6f16f87a7e81ca35054d54daa3a8dda0beee8a6d16ce7` | `e4e7ce07e30ae71c323aa4c460d23bab1f789adca8a7164ef3e20c9ab7d8ce08` |

### azure-servicebus-rust — corrected

Retain preproduction warning+settlement concepts; add success processing before complete, idempotency and visibility-lock not exactly once.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-servicebus-rust/SKILL.md` | `100644` | `bb4b917a9ad9cf8c97ab6e5c8fa7ae73317241fbfe8a1882167e954f0ecf9976` | `1f5d07f134498bb6f8138f79d917ce2bb83a97229ec34a0872bcb1cbba873494` |

### uniprot-database — corrected

Missing references listed and helper incorrectly provided; qualify available and direct requests bounded params data release/provenance no clinical inference.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/uniprot-database/SKILL.md` | `100644` | `c4ecbaa1bdb1b3a06da5551f079f218075daad2fa5defb357706da22e0d47c0a` | `ef6929d7383f18f55e15a7fc876c6feec7d083fc152988020f421f6a74558657` |

### hunt-open-redirect — corrected

OAuth redirect not automatically ATO (PKCE/client auth binding), evil.com not controlled; replace with reserved domain local test; metadata SSRF no secret extraction minimal.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/hunt-open-redirect/SKILL.md` | `100644` | `ffd65e4e829200722b1db22482029a860fa88d5fb52d600147e163b0bd9ae8ac` | `28a5440a1b19e999f0e7553d507bf1755d0100f89a900d6bb56f911dccf44d18` |

### azure-ai-contentsafety-java — corrected

Retain versionbeta examples but model uncertainty, bounded concurrency no severity guarantee/data retention; blocklist mutation scope.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-ai-contentsafety-java/SKILL.md` | `100644` | `dd08958539ea30773093fcf6f6e8d1663ee9ec6b2776ae2c948a27451124860d` | `300fe492b4d47708c904438a407e252b8939aa9ace25a6e6c42a30fb267f071a` |

### llm-application-dev-langchain-agent — corrected

Mix incompatible legacy memory/react/evaluate/hybrid API snippets; correct API evidence current docs/version scope, no guaranteed primary model; inspect typed state reducer and user thread auth.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/llm-application-dev-langchain-agent/SKILL.md` | `100644` | `41588b5122e999b70d2e349f7bd6bd8495750cedf2b966937b2cc3368153a685` | `1099cd63fe3581214532928f6b3fb806647db7623d8edba0e0706a3c0da1722e` |

Selected primary references: [1](https://docs.langchain.com/oss/python/migrate/langchain-v1).

### pakistan-payments-stack — corrected

Rupee not smallest/paisa inconsistent100x risk, code fences broken; fix explicit amountPaisa and provider conversion contract, preserve no invented merchant spec.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/pakistan-payments-stack/SKILL.md` | `100644` | `518194aa1027a30400f02267b2020a3f42e3698493a3c747a935ee20ea68df6b` | `6bac9a907ad7cdc325b0972c3e4276e0d2fd84e30ab0408fdd1c35238b569558` |

### sql-pro — retained

Retain safe query plan correctness baseline and production limits, dialect runtime scope obvious.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/sql-pro/SKILL.md` | `100644` | `80daba9ebba46014df00ecdb9b5c609986f50ea59d343c828c36e464d21b1c4f` | `80daba9ebba46014df00ecdb9b5c609986f50ea59d343c828c36e464d21b1c4f` |

### apple-notes-search — corrected

bun install postinstall FDA broad privilege setup must stage ignore scripts review before activation; explicit cloud synthesis private notes consent, index persists privacy.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/apple-notes-search/SKILL.md` | `100644` | `379f82e4fcc67439e20db149baa4735cfc7e4af9cfb5ec045a7d648757aa546e` | `1397eb5f311ffbb2f38604aca61ebd31e891a3568d19f115e81d3c2d3d7b84b8` |

### go-playwright — corrected

False sandbox/no state complete isolation, logger.Fatal skips defer, unused log import/pw stop; scripts untrusted actions, API docs first not only failure.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/go-playwright/SKILL.md` | `100644` | `69b1d776c49b16b56ee70793ca72bf7726ec37914f2f3f09b6dffc6c3f48b385` | `6a9959eeb6c254b381b543e8738b7d057e6b29d1f282ee11e8d583849febcd26` |
| `skills/go-playwright/resources/implementation-playbook.md` | `100644` | `1888d593ba7f730396e5e5c55f359f6f45576d690b39e2f43cfd2f5feb90a1f4` | `203ca0b882ab6bc7328e75676a53a3da91e6db56fb0b0d6b7e7062c45b341aab` |

### logic-locate — corrected

missing shared Lcodes confidence rules cannot claim follow; hops length not accuracy, local standalone evidence fallback.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/logic-locate/SKILL.md` | `100644` | `7e14380e92c07b3d0747bb073834582a80c432f362bfe664db770f0a79003a8c` | `bf2bc6ee1e486e9359d792f0d25af8f8e50fc30ef583eff8395709a45adef591` |
| `skills/logic-locate/logic-locate-guide.md` | `100644` | `58a063fc0ea614c2b11b20c08a09610bb8c8846b3fdaed729f6328d4dae39106` | `58a063fc0ea614c2b11b20c08a09610bb8c8846b3fdaed729f6328d4dae39106` |

### semgrep-rule-variant-creator — corrected

Remove placeholder allowed-tools ...; missing local three refs say not bundled; test output actual exit structured not specific text only.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/semgrep-rule-variant-creator/SKILL.md` | `100644` | `7d4bda97369de0daee6cec2a0e56de311faf76fdbf62ee15a2db35a5cfc35503` | `f0f7876e294e5d08bda002802919bb8c9ec120bd7038371a02f47b3d999cef5b` |

### miro-automation — corrected

Auth setup and sharing invites exact board recipients permission scope; discover connector create tool not implied GET creates.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/miro-automation/SKILL.md` | `100644` | `a741d82f74665aa942e529190152271f5f01b850db0a75425e12ec96e2c90752` | `7b977993f92aa26b0d5349176edf1dde7787d6881511eb669482ff1e2350cc81` |

### agy-auto — retained

Retain already full reviewed-hook failclosed preconditions; remove broad fastallow compilers/writes safety guarantee? advisory classifier cannot authority already explicit.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/agy-auto/SKILL.md` | `100644` | `b97eb31a4f541f11a582dc93152b00a3102f823ba9a09890e65932a6ecda84a6` | `b97eb31a4f541f11a582dc93152b00a3102f823ba9a09890e65932a6ecda84a6` |

### i-have-adhd — corrected

Remove universal medical stereotypes/dopamine scarcity and assume reader diagnosis; output style on request, no symptom inference.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/i-have-adhd/SKILL.md` | `100644` | `8a0fe2979497527aed21f99b1c9eb669ab5d63e4723413f79aa75a78ed84f25c` | `dfb8f06043472bb33268aa521e14b53fdc656711f11b9cbf2ce4840333dae5c2` |

### ai-engineering-toolkit — retained

Retain overview availability and illustrative scores honest; user supplied rubric required already, no tests run.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/ai-engineering-toolkit/SKILL.md` | `100644` | `3b0fe066c134f63fdae65ea4d39efcc370f104be93af9515ad43aa272d76f148` | `3b0fe066c134f63fdae65ea4d39efcc370f104be93af9515ad43aa272d76f148` |

### brevo-automation — corrected

Auth setup; scheduling/activation modifies live sends and recipients consent preserve, template changes used live.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/brevo-automation/SKILL.md` | `100644` | `ed263aad876f523b636acbb149bc6d999eaf18e0a39427a6897e05bc4753bad9` | `1b7f079df38519d59c603f83f61225ac64786585a1c7a8fbac6758d7fb96a34d` |

### glasser — retained

Retain explicit paid-scope provider disclosure idempotency reviewed install and output honesty.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/glasser/SKILL.md` | `100644` | `392d7d87291734829fdc495786f0937bdccc46df0edc65371e6364e0e04da407` | `392d7d87291734829fdc495786f0937bdccc46df0edc65371e6364e0e04da407` |

### api-endpoint-builder — corrected

validators type checks avoid nonstring crashes, no spreading model leaks whitelist DTO, unique index race, bounded pagination/sort allowlist.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/api-endpoint-builder/README.md` | `100644` | `852fe52e2c9834d04b6594a83b073aab82c32a2037c810f54724f9d997680f4a` | `852fe52e2c9834d04b6594a83b073aab82c32a2037c810f54724f9d997680f4a` |
| `skills/api-endpoint-builder/SKILL.md` | `100644` | `bb9f07b95cd6e4da7b97d5c518b66019822f62abecc0b5d7e02c56f64de36fb5` | `b86571b2a34ea4867cddd4cf9004f2f2fc72d8b619cd9f7e816a5cec73d2d8e7` |

### recsys-pipeline-architect — corrected

Fire-and-forget loses critical sideeffects use durable queue/await bounds and permissions; upstream scaffold test claims not bundled evidence.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/recsys-pipeline-architect/SKILL.md` | `100644` | `360dc42f83f45d99fd29bc86893533ef8b3663d34419279c459d734930ca9fef` | `0cf34ebc14e8b3ef38bc5e419fbb361359d3bd227904405f589997aa4f80961d` |

### conductor-new-track — corrected

Retain spec/plan user approval, but slug path validate, cleanup only owned generated files not user partial work.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/conductor-new-track/SKILL.md` | `100644` | `b54b652b4821b2465ab9466e43324a6df0a1071e04558446ae64cc6a07eae1b1` | `efa6b6d266e4788a7e21044fca689eee48fd6d0a182ad6d639535035f8b764fc` |

### crypto-bd-agent — corrected

Heuristic safety certification, mixer causation false proof, x402 budget approvals registration not authority; pair age not token age, score clamp adjustments max100.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/crypto-bd-agent/SKILL.md` | `100644` | `4a70624cb08d4664b020062afe529560585b3ec8f97c08a9f94f075e1b456937` | `45d86fe14ded25e9f327d58b1c09ae051c86d965a8e942ca3a9492faec098707` |

### social-orchestrator — corrected

Cross-channel publish authorization, no duplicate sends retries partial outcomes; Telegram unlimited conflict limits,2GB not Bot API; metrics reach sum not unique; generic peak schedule hypothesis.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/social-orchestrator/SKILL.md` | `100644` | `c4ce3c19f6b2c42fe91d1877eb0353546ccce33780bd331ce9712befba04abc4` | `a2695a16f7f19fe7064fb25abf189da9983236db7c41828ef93d825cb646a83f` |

### azure-ai-contentunderstanding-py — corrected

result.fields wrong result.contents fields; .contents empty guard, custom analyzer version signatures, async credential close; private cloud input.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-ai-contentunderstanding-py/SKILL.md` | `100644` | `3a3078229519ed879c3fdfa13f11a0291750dc38b32baf05ea4eb18c1b5b8cff` | `635678677017a55e28a3980523b5084c39af61aa0cbc5c12403b171c3fb822ff` |

Selected primary references: [1](https://learn.microsoft.com/en-us/python/api/overview/azure/ai-contentunderstanding-readme?view=azure-python-preview).

### python-development-python-scaffold — corrected

Missing dev extra uv sync, src layout launch uses src.project wrong; env local .gitignore missing .env; scaffolds placeholders/full production claim and license user choice.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/python-development-python-scaffold/SKILL.md` | `100644` | `07bf5e5d71cc1037dbaf6e13bc7e9a3792d191567dcb1849cd871fb8daeabacc` | `1b33d9298e176c4d40d62de779cd5b857d31a0afc08c9b3a1f131a8e05ca7996` |

### docusign-automation — corrected

Auth setup; status created default explicitly draft, confirm legal doc exact recipients before sending, delivered not email opened inaccurate.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/docusign-automation/SKILL.md` | `100644` | `d3297c07846136abeb8a7ffbaa0dcf1a9d7be4190d9358fdb94fa921bbc939e7` | `de04bea825142cd4fdae62871775038369b9bbdff0b84957e2280f362eca97f6` |

### dispatch — corrected

Retain explicit external delegation stdin/peer authority; unsupported fixed model defaults/image transparency remove version claims.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/dispatch/SKILL.md` | `100644` | `8be25a6d4e1021679fe38afe6bd9cbbd22d5fcf2a0c9256a616080a32d538c8e` | `7af7b7d509f6c6c381fee76eb6912b62f2259970662977f39e3fa5ba2d49d596` |

### instagram-automation — corrected

Auth setup; live limits25 stale query not fixed, FB page not universal loginAPI; publish authorized exact account media content.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/instagram-automation/SKILL.md` | `100644` | `4640573d6a3c565fefe5a9a6f4f12ca9b41e3ca4161b852d823b6fdcaa9ced7a` | `ad7ca82041f9909a5f9910f879a821dfa88577e0ab4837b42ad037b29cedfed1` |

### x-twitter-scraper — retained

Retain robust inert install/pin/private writes and metered approval; SDK install lifecycle requires inspect matching archive if used.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/x-twitter-scraper/SKILL.md` | `100644` | `1879d7d6006e2929529dd1d094848a2a8c50b0a35f3273323ee077f8052dae49` | `1879d7d6006e2929529dd1d094848a2a8c50b0a35f3273323ee077f8052dae49` |

### earllm-build — corrected

Historical personal checkout not verified actual groundtruth; Android startBluetoothSco deprecation API34 not31,BLE freq capability no guaranteed; ZIP excludes secrets/log/build.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/earllm-build/SKILL.md` | `100644` | `6d21ce0b40c813403cc2448b79f0a88209a2573fa8cf03508c22b6847ae48cec` | `9641d62ab4878c350ab55f3e811c05f98d613f15b6c1023583538708f21c0e45` |

Selected primary references: [1](https://developer.android.com/reference/android/media/AudioManager#startBluetoothSco()).

### design-md — corrected

Retain concrete source metadata design extraction; screen assets untrusted and output DESIGN merge preserve existing; do not invent design WHY evidence.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/design-md/SKILL.md` | `100644` | `df2887d9a91008da62205e17346bfa3479cefa0135f737508ea12adaae594ac5` | `046611d0a59c62e5233cee38ec07d50aa976af37bbc2bc8a937782b842bf2471` |

### postman-newman-automation — corrected

Secrets in query URL/argv and Jenkins Groovy interpolation unsafe, set-e exits before failure msg; collections execute scripts and arbitrary sends, artifacts sensitive.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/postman-newman-automation/SKILL.md` | `100644` | `0e7fdb160a22ea3d8e7c22bcb01eda79b04f384b2cca287244ed05fba74805b5` | `26367bd33e4686b25c6e677b79d14cf3bb8b5396d18b3756b297413752aca77b` |

### trello-automation — corrected

Auth setup; exact board/list card edits ownership, comments/invites notifications and attachments private; rate limits schema current.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/trello-automation/SKILL.md` | `100644` | `6b9e9a92e8134fcdad64dc5148ca9a0982681ab4b24606382906dffa505f7302` | `acae90115cc5310dfeb8f32ba56518e1709f50d54de2cde9c69dd037e7d90a11` |

### azure-microsoft-playwright-testing-ts — corrected

Retain migration examples but remote browsers expose loopback/code/artifacts cost20workers scope, untrusted PR no cloud cred job.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-microsoft-playwright-testing-ts/SKILL.md` | `100644` | `abc8b787ad3ffb54b6c657607cc33c760adbbf2c81b85466dc60be46419f5630` | `067175b65fde2fb198779be28eb0a6405e49ec6dc86b532292f544f1b762a733` |

### privacy-by-design — corrected

consent not only lawful basis, GDPR strictest not equivalence, pseudonym hashes not anonym, backup erasure legal exceptions.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/privacy-by-design/README.md` | `100644` | `2488861e8390c9398163c6f892856b547b9608c029079d768885a919d21a2295` | `2488861e8390c9398163c6f892856b547b9608c029079d768885a919d21a2295` |
| `skills/privacy-by-design/SKILL.md` | `100644` | `c97ed5b7e3e3780545e5a4d3dfc83748e251a683bf6aa69b058be3b4af56d19d` | `2769344b97006e69f2c46ff22e263fa437c4f952f7c71613bf7de22d0b89cffa` |

Selected primary references: [1](https://www.edpb.europa.eu/topics/key-gdpr-concepts/legal-basis_en), [2](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation).

### form-cro — corrected

Fabricated field conversion % and rubric diagnostic not actual broken/performance; private field telemetry no values, enrich consent scope.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/form-cro/SKILL.md` | `100644` | `f656d09985779486a579db4f995a99adfe9d8f61e924bd570296eff1f226d8c1` | `5dbbbeaaa181407d3472d15182908eaec73ea6c2f20727cb31c5af4e59f5a6e5` |

### bug-hunter — corrected

incorrect null==0 assertion, private auth logging, destructive rewrite blanket and gitbisect preserve work/reset; syntax snippets fragments.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/bug-hunter/README.md` | `100644` | `b48f9b730dcb4993b8f6e4dd5da05553c130c0cc6a9908cf4ee94733704991b7` | `b48f9b730dcb4993b8f6e4dd5da05553c130c0cc6a9908cf4ee94733704991b7` |
| `skills/bug-hunter/SKILL.md` | `100644` | `b3e9b84416d0e1638b85deb451cb576c2e9416f399f89e718c34695b33ec51ec` | `7e4f323e0f45b3fae2034d3269baf699758de3bbdb281e18d9527d0289a133c1` |

### aws-cost-cleanup — corrected

Lambda deletes available by creation age not detachtime, disaster volumes; dryrundefault explicitIDs tags accountregion backup retention, lifecycle replaces existing; cost report illustrative not actual gp3price.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/aws-cost-cleanup/SKILL.md` | `100644` | `d40b992ba062ed5d0bb09dd8bf834afa09d9078e626057d4b971a529a178ca2d` | `164594d53698ebdfdc546e5c1d33590abe37e579bd0c9d23b4be0a0a6dea7192` |

### reddit-automation — corrected

Auth setup; explicit posting/comment/deletion, community rules no retry unknown sends and private data.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/reddit-automation/SKILL.md` | `100644` | `008306fc472d7b1bd5eb6d4695ceef6f7b63a378ce20acb05590055a1ef3d428` | `42b26bf64cb5b64fe5689cb8afbc639b94a2f6558229dc28c782a203ecee0ef1` |

### seo-competitor-pages — corrected

Retain balanced verifiable data methodology but rating schema only actual eligible single-product page; keyword volume labels not measured.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/seo-competitor-pages/SKILL.md` | `100644` | `6a51d30df2459e221a849a28cf660512c3952f47345414a0f1e5e778e51826a4` | `76b9700d6c29e38ecd19638d47f0919b0bbf611e29c7eedd7b5a7e8573458518` |

### postmark-automation — corrected

Auth setup; exact batch approval per-message outcomes not transport success, templates/server config global tracking/privacy.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/postmark-automation/SKILL.md` | `100644` | `63c33a38aa03a3fda42fd336950a18a4969c9166416d5edb0ea7a19c0bffaa0a` | `202eec9860a61452a5bf9025e969fc2be4dd28c213c1f06fa027163a4e379ad5` |

### snowflake-development — corrected

False JSON null string and STRIP_NULL_VALUE option, createorreplace destructive idempotence, deprecatedall claims unsupported, datetime dynamic restrictions verify docs.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/snowflake-development/SKILL.md` | `100644` | `c28f8796c3ff9e1f12089516645144ae5875acb1e037216232f544eb060560b2` | `01342fab7fddcde0857ecb9e84e6f3d53e771be035a21b3ff1298feb3ee952cf` |

Selected primary references: [1](https://docs.snowflake.com/en/sql-reference/functions/strip_null_value), [2](https://docs.snowflake.com/en/en/user-guide/data-load-considerations-load).

### schema-markup — corrected

Obsolete sitelinks/HowTo rich types and FAQ restriction, diagnostic rubric cannot establish eligibility; Google official doc current.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/schema-markup/SKILL.md` | `100644` | `44baefa3b995a25c2098e0a5f367f98443e159c5954c5dbe88f04eecfabce04b` | `9e2838434b2ba812f03ee830a608280a2939088ba05911cedd4c5efbb9846bc4` |

Selected primary references: [1](https://developers.google.com/search/blog/2024/10/sitelinks-search-box), [2](https://developers.google.com/search/blog/2023/08/howto-faq-changes).

### schema-markup-generator — corrected

Obsolete searchbox/HowTo/FAQ coverage, @graph valid not never merge, keyword density1-3% false recommendation; FID old correct.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/schema-markup-generator/SKILL.md` | `100644` | `e1feff3ee36f182597c830ff80956f7bc21f7c561dfffa5a08e22589f22e3dea` | `e379d2fa23aaecf10d64fcdeb5cb649073aaeec7a4b31cf854b36f07d9dddba2` |

Selected primary references: [1](https://developers.google.com/search/blog/2024/10/sitelinks-search-box), [2](https://developers.google.com/search/blog/2023/08/howto-faq-changes).

### llm-inference-scaling — corrected

Priority higher preferred reversed; PDB no involuntary spot guarantee; histogram aggregate byle; ScaledJob no GPU resources mention, scaling metrics version inspect.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/llm-inference-scaling/SKILL.md` | `100644` | `eadb51c1cb20ba9110bfab96103e1b146bc37c3c91a4b3204e65d396aa35d732` | `d48edffc313de190f4a5a4de5aaf29708c3610e80c843ce311f434507ef9a7a4` |

### agy-powerline — corrected

Retain reviewed prerequisite but init downloads conflicts safe existing exact immutable needs re-review downloaded bytes before activation, no runtime proof from doctor.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/agy-powerline/SKILL.md` | `100644` | `d440fc5406a0c8c7fff2ba7da2751894f32be6f4e69cda3e9c1b42ac841c3f17` | `ef2c937381328f3f69b3d04635aac70a4fb14e08f2db9af94fddeb1b556e1f00` |

### azure-ai-vision-imageanalysis-java — corrected

SDK wrapper result getters collections likely wrong getObjects().getValues primary; versionbeta limits/detection not identity confidence.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-ai-vision-imageanalysis-java/SKILL.md` | `100644` | `a88a5b719c62e5217c1f13e2ae6b30dbe0dc997ed6bc8ab65164d52fbfb61138` | `a6454e74f9554ef6a29302d99cc97b9afc83bab91205a1207be88796c468a8e9` |

Selected primary references: [1](https://learn.microsoft.com/en-us/java/api/com.azure.ai.vision.imageanalysis.models.imageanalysisresult?view=azure-java-stable).

### dos-verify-done-claims — corrected

Registry/diff are authored and forgeable, checks only presence not correctness; qualify witness/closure claims.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/dos-verify-done-claims/SKILL.md` | `100644` | `8f1253e18b2bd07acbd76c4135f333e52a611f55d513a527d010bcef91857495` | `46d83e3698e9765e3e3a4dee6fae7146eaded751c45ab86d9f78e6fd4d009f9f` |

### amplitude-automation — corrected

Correct no-auth setup and scoped event/cohort/private activity boundaries.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/amplitude-automation/SKILL.md` | `100644` | `36307364b65b11cfe71f7b2059204717a874728349e39e47747227a667cc2b50` | `58dabb8844ce90c70c98ccb82d05444b774857afd187df9df68979b5c17cca15` |

### brooks-test — corrected

Missing shared reference prerequisites; retain bundled guide but replace unsupported numeric severity/70-20-10 universal ratios.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/brooks-test/SKILL.md` | `100644` | `805df80798ad8ad9b00c53f26ac6a14e48ed6aca2a6c163bf4ec80221bd3ec50` | `9c3b1801a1c8be3bf0c5c4d093a872201917955525c1710590c38ac53305a444` |
| `skills/brooks-test/test-guide.md` | `100644` | `fc8e1f5882e87134c59ca77e854f5ad83ddf0dab1106a2cefb3747a38b042b8e` | `fc8e1f5882e87134c59ca77e854f5ad83ddf0dab1106a2cefb3747a38b042b8e` |

### api-documenter — corrected

Add concrete route-contract evidence and safe interactive examples.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/api-documenter/SKILL.md` | `100644` | `8bd372644f411e0cc43110649d79be9d8b84b4928a92b4eede5d339e7af5b2b0` | `e5c05c313ed91d29f46a10e846830713536a65779c4b3c391dbd129288a7efb8` |

### posthog-automation — corrected

Correct no-auth setup; project writes and flag rollout scope/private identity data.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/posthog-automation/SKILL.md` | `100644` | `5217bbd67a7ad4e7ba414a0f45cd7fb07741b0270836d5096a2510f305d173ba` | `0f2871ebe908318602a762671c27839668d861be8bf53b90100f11c54b678191` |

### java-pro — corrected

String templates preview21/22 withdrawn23, qualify preview/GA features and retired Spring Native.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/java-pro/SKILL.md` | `100644` | `9d963a6e5253e90f16be19f2a3daecf61573cd9fa0f450386bf93ad97e8702e1` | `3ddaf9d01fa0fb2ea6a5931cff16de872a43779622ed367f25fa1a8847efb080` |

Selected primary references: [1](https://docs.oracle.com/en/java/javase/26/migrate/significant-changes-jdk-23.html).

### llm-gateway — corrected

Invalid JSON comments, nginx limit_req_zone context, anonymous exposed service/debuglogging, fallback mislabeled duplicate deployment, cache privacy.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/llm-gateway/SKILL.md` | `100644` | `2984051ccab2d688a7c62c6c4d8a3831956b97bc3eee5f333008abb0c8459767` | `49cc3fe7fd89f433748d8ddafbb154eba5e1b717cfb96d4a932d899ff6788f72` |

### audit-agent-run-evidence — retained

Retain concrete witness ledger/read-only scope and absence-notfailure distinctions.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/audit-agent-run-evidence/SKILL.md` | `100644` | `e704719075d066a1a4c63359e9dbbaff250904c117aab74ac3846434e3710d05` | `e704719075d066a1a4c63359e9dbbaff250904c117aab74ac3846434e3710d05` |

### what-could-break — corrected

Proof executing production paths not guaranteed read-only, one fact cannot prove every risk; scope evidence strength.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/what-could-break/SKILL.md` | `100644` | `f0acf08361cee91ba560c13ec4843e4709c87ee0720c03f10d9ecaf48b402e7e` | `c2efcfe1d95f66e4110b377cc39f7fc3ea5b9008bd99eca8d1da77f8154c8c52` |
| `skills/what-could-break/references/LICENSE-pstack.txt` | `100644` | `bc957ca6bee02792566a1a028d105e02e247c6e77cf057061674273da77b200e` | `bc957ca6bee02792566a1a028d105e02e247c6e77cf057061674273da77b200e` |

### django-pro — retained

Retain complete concrete playbook version scoped and transactional privacy boundaries.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/django-pro/SKILL.md` | `100644` | `4694bac4666d69d896e7b666d4abce8b45188ab0de11c96021f7fd1b14e4bee9` | `4694bac4666d69d896e7b666d4abce8b45188ab0de11c96021f7fd1b14e4bee9` |
| `skills/django-pro/resources/implementation-playbook.md` | `100644` | `551239f5644a3e7b271207e32db4bb4516193fe806799203e015b8dd36576b4b` | `551239f5644a3e7b271207e32db4bb4516193fe806799203e015b8dd36576b4b` |

### system-prompt-lookup — corrected

Thirdparty archive not vendor primary authenticity, mutablepaths/countgreps unreliable, curlwrites contradiction.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/system-prompt-lookup/SKILL.md` | `100644` | `8543fd7e62a215ad4c868bea560535bc13f384480e7313078b46cbeedb266814` | `34a36a815656a007588bc4888b7e0905700941f0a27ec57c97336d1167a4f635` |

### wordpress-centric-high-seo-optimized-blogwriting-skill — corrected

Keyword altstuffing accessibility, FAQ richresult eligibility, sourcequota not correctness.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/wordpress-centric-high-seo-optimized-blogwriting-skill/SKILL.md` | `100644` | `14cc91fd941f0e662eef1df292574709bde55fe9afe5b90db7968dba6e562836` | `ebb0a828060715b1d2b6a29d542823b0f66372e57ff32d17da9856144db53546` |

### geo-prospect — corrected

Missingslashruntime, persistentCRM privacy and pathvalidation/atomicwrites; totals not forecast/commitment absentcontract.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/geo-prospect/SKILL.md` | `100644` | `68da2b64babb8ca547ec6128511cba713b8c73f55bf694b76462bf17645747a0` | `750855fb50fa6a7e7fcb4aa5cd2fe62f9cfe872dbab19bfd38867c85d320564f` |

### github-actions — retained

Retain fragments prerequisites, immutablepins/forkrunner/secret handling already explicit.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/github-actions/SKILL.md` | `100644` | `bcca90112477f58ff32b7199c5c5c2351e18ea8fc06d4cdbac88d105a190c4f2` | `bcca90112477f58ff32b7199c5c5c2351e18ea8fc06d4cdbac88d105a190c4f2` |

### codebase-audit-pre-push — corrected

Broad deletion unsafe trackedartifacts/vendor/docs intentional; secretrotation/history and no generic productionready score.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/codebase-audit-pre-push/SKILL.md` | `100644` | `5df48a600ea7a11f80f5afa3c4ea516c905aa8ca40a54b4734788e3614fb01e2` | `6397b6ea174344c27c1ead0d6453af2fd753e19d36c735a26a2a3427f2335b45` |

### context-manager — corrected

Scoped retrieved context as untrusted evidence, tenant-authorized retrieval and persistence, with fixed-task quality/leakage/cost evaluation rather than an inferred improvement claim.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/context-manager/SKILL.md` | `100644` | `6949208d125f5e8d4e948ce10824f43606b39ae96ee60de93e7b5678f17a3aba` | `67b65e82f0d17c5c521ad5a9224122a80cc6d4969e734bcbab9a0e10806c6486` |

### azure-communication-sms-java — corrected

Scoped billable SMS/consent/OTP/delivery/async privacy boundaries.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-communication-sms-java/SKILL.md` | `100644` | `dcda930febea452b230b02e5a11dfc95ea4d199b5604fb9caa59e90d4ffef30c` | `cf0cd0978499c44c43f062a2e63af137a967e186320ac28b8928ae2ef0024442` |

### openhook — retained

Retain complete LICENSE and evaluation artifacts; explicit callback-vsbusinessproof/private scope already present.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/openhook/LICENSE` | `100644` | `f950d9d0484b0830dc0460ed0f305fa2e9a6f2886b88ccb5159a173be50fe7a4` | `f950d9d0484b0830dc0460ed0f305fa2e9a6f2886b88ccb5159a173be50fe7a4` |
| `skills/openhook/SKILL.md` | `100644` | `5e335cc06d1bdc7b3eefc9065293e25a306f932c063b721acd80c67da1fd0569` | `5e335cc06d1bdc7b3eefc9065293e25a306f932c063b721acd80c67da1fd0569` |
| `skills/openhook/references/evaluations.md` | `100644` | `9c45a42fdb728ae94ebf2e33b26602ea3ec6ab6a52256a0a40a5b0801720816a` | `9c45a42fdb728ae94ebf2e33b26602ea3ec6ab6a52256a0a40a5b0801720816a` |

### hr-pro — corrected

Risk none misrepresents consequential employee data; scope draft not act and no irrelevant interagent data sharing.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/hr-pro/SKILL.md` | `100644` | `f0b398df8d1e42ac5b388dc99b62afc2f65aa9517c2d186346e11923e69af911` | `e40dd4501521442b5c223dca7cd316a450ecc8c13d3c3cf9815d4d7378019f28` |

### llm-ops — corrected

Malformed Python/undefinedcollection/costmath wrong/tenantlesscache; replace broken fragments transparently with defined minimal skeleton and version-priced assumptions.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/llm-ops/SKILL.md` | `100644` | `2c5a94f3111f7500497aecb10e3225cbc0037a97b699be45098beebf447fcf6b` | `55951af26811d486ec7be07b2c4ad45f71e69ab8a681fdfad6b580d60926fa06` |

### zendesk-automation — corrected

Correct deletion recoverability and comment endpoints, no-auth claim/publicreplyscope.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/zendesk-automation/SKILL.md` | `100644` | `ffe4d4417eccb8633f8f979401fb89ff517a30a7f7e6aa3687defaca7107944e` | `f23260b080918416689d1495c82d0e044ec6a31b84cab189dbddd24e0dc6c89a` |

Selected primary references: [1](https://support.zendesk.com/hc/en-us/articles/4408835089050-Viewing-and-recovering-deleted-tickets).

### hunt-deserialization — corrected

False critical/no prereqs and callbackproof, PHP8 phar behavior, ViewState MACfalse signal, payloadencoding mismatch, minimalproofboundaries.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/hunt-deserialization/SKILL.md` | `100644` | `528296bba8d4b2a17f3859c2b0322a0a95151b9dea8a6f57dd0923f74b0894a6` | `1ec2a3fcb4641ea6133cb9cce3a0fd7dbfcc78c637b08c73c1b4dd6f6e709abc` |

Selected primary references: [1](https://wiki.php.net/rfc/phar_stop_autoloading_metadata), [2](https://www.php.net/manual/en/phar.getmetadata.php).

### azure-appconfiguration-ts — corrected

Version-specific fragments and secretlogging/liveconfigscope/refreshfailure.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/azure-appconfiguration-ts/SKILL.md` | `100644` | `6d7e9b8f7c3dcddf02d278d813ca090d111ef6057b92d34e31c86b0ee75419be` | `9e9ec4131a5c66e342a8cde6679f91ebda3d3e463f13d4ae9297dab960d92a1c` |

### terraform-module-library — corrected

Undeclared vars and regexinvalidCIDR, private subnetno routes not completemodule; cloudtestcost/destroyonlyowned.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/terraform-module-library/SKILL.md` | `100644` | `9c82510f1f191d5d19f0c5c824fd5a86ca9dac498d5352977540f6c5a5b21b78` | `81629ecf58142b64d6091b38f300f692b0db4628fe7b604d9553581e910a437d` |
| `skills/terraform-module-library/references/aws-modules.md` | `100644` | `5893796ee74195125334a0c6c115c72306bd2cd43d461af34d4e7710a3fa7f0a` | `5893796ee74195125334a0c6c115c72306bd2cd43d461af34d4e7710a3fa7f0a` |

### telegram-automation — corrected

Correct rate limits, slash command format/no auth/edithistoryfalse, schema limits authorization.

Limitations: static review only; no example/runtime action executed. Host/dependency compatibility and operational outcomes require environment-specific evidence. Existing provenance was preserved, not independently relicensed.

| File | Mode | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| `skills/telegram-automation/SKILL.md` | `100644` | `6063061a4b1b37450e032224a8bbc932c20059f65ea6a85a871aa627f722c696` | `ba462617a0c481e70215ee8f097c1a43a43b566614070a1ec8bc87e3908cd35f` |

Selected primary references: [1](https://core.telegram.org/bots/faq), [2](https://core.telegram.org/api/bots/commands).
