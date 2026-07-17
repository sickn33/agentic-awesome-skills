#!/usr/bin/env node
"use strict";

const { main } = require("../lib/aas-v1/cli/main");

if (require.main === module) main().then((code) => { process.exitCode = code; });

module.exports = { main };
