#!/usr/bin/env node
// CLI shell around lib/verify-claim.mjs. argv[2] = JSON claim, stdout = result.
// Claim `type` enum: pattern_count | pattern_exists | pattern_absent | file_exists |
// code_snippet | repo_count | citation_in_library | citation_applies_to_version.

import { verifyClaim } from '../lib/verify-claim.mjs';

const SCHEMA_VERSION = '1.0';

async function main() {
  const claim = JSON.parse(process.argv[2] || '{}');
  const result = await verifyClaim(claim);
  process.stdout.write(JSON.stringify({ schemaVersion: SCHEMA_VERSION, ...result }, null, 2) + '\n');
}

main().catch((err) => {
  process.stderr.write(`[verify-finding] FAILED: ${err.message}\n`);
  process.exit(1);
});
