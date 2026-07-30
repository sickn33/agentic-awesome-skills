# Third-party notices

This file describes the direct and bundled runtime dependencies visible in the locked public source tree. The release SBOM and lock file are authoritative for each published version.

| Component | Locked version | License | Upstream |
|---|---:|---|---|
| `@playwright/test` | 1.61.1 | Apache-2.0 | https://github.com/microsoft/playwright |
| `playwright` | 1.61.1 | Apache-2.0 | https://github.com/microsoft/playwright |
| `playwright-core` | 1.61.1 | Apache-2.0 | https://github.com/microsoft/playwright |
| `commander` | 12.1.0 | MIT | https://github.com/tj/commander.js |
| `zod` | 3.25.76 | MIT | https://github.com/colinhacks/zod |
| `fsevents` (optional, macOS) | 2.3.2 | MIT | https://github.com/fsevents/fsevents |

The npm lock file contains integrity hashes and currently records the `registry.npmmirror.com` mirror used by the formal build. A release consumer may select another npm registry, but must preserve lock-file integrity verification.

The `llm-answer-reference-compare` runtime carries its original MIT license at:

`skills/llm-answer-reference-compare/assets/tool/LICENSE`

Web services such as 深知晓、豆包、DeepSeek、Kimi、通义千问、腾讯元宝、ChatGPT, Claude and Gemini are interoperability targets, not redistributed dependencies. Their terms, privacy policies and service availability apply independently.

No `node_modules`, browser binary, browser profile, Cookie or service credential is distributed by this repository.
