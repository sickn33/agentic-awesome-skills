#!/bin/bash

set -e

echo "release_cycle.sh is now a thin wrapper around the scripted release workflow."
echo "Use \`npm run release:preflight\` directly for the supported entrypoint."

node tools/scripts/release_workflow.js preflight
