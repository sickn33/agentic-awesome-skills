---
id: 'bilig-workpaper'
name: bilig-workpaper
description: "Use formula-backed WorkPaper JSON and MCP tools for agent spreadsheet tasks without driving Excel or a browser UI."
risk: critical
source: community
date_added: "2026-05-21"
tags:
  - spreadsheets
  - formulas
  - mcp
  - xlsx
  - typescript
category: frontend-frameworks
tools:
- claude-code
author: 'emanueleodierna'
---

# Bilig WorkPaper

## Overview

Bilig WorkPaper gives agents a code-first workbook runtime for spreadsheet-style business logic. Use it when the task is easier to model as sheets and formulas, but the reliable path is to edit cells through an API, recalculate, read computed values back, and persist a JSON workbook document.

The main use case is replacing fragile spreadsheet UI automation with deterministic tool calls. It is useful for quote calculators, payout models, budget checks, import validation, and reduced XLSX formula bug reports.

## When To Use This Skill

Use this skill when the user needs to:

- work with spreadsheet formulas from a Node.js service, route, test, or agent tool;
- write workbook inputs and verify calculated outputs with readback proof;
- persist a formula workbook as reviewable WorkPaper JSON;
- expose a file-backed workbook through MCP tools;
- investigate an XLSX formula recalculation issue without automating Excel, LibreOffice, or a browser grid.

Do not use it for manual spreadsheet editing, VBA/macros, pivots, charts, COM automation, or exact desktop Excel behavior unless the user explicitly asks to compare against Excel as an oracle.

## Safer Command Pattern

Prefer argument arrays in MCP/client configuration. Do not shell-concatenate user-provided paths, sheet names, formulas, or cell addresses. Reject path or cell input containing newlines, backticks, `$(`, `;`, `&`, `|`, `<`, or `>` before using it in a command.

## Quick MCP Setup

First prove the package-owned challenge works:

```json
{
  "command": "npm",
  "args": ["exec", "--package", "@bilig/workpaper", "--", "bilig-mcp-challenge"]
}
```

Then run a writable file-backed MCP server:

```json
{
  "command": "npm",
  "args": [
    "exec",
    "--package",
    "@bilig/workpaper",
    "--",
    "bilig-workpaper-mcp",
    "--workpaper",
    "./pricing.workpaper.json",
    "--init-demo-workpaper",
    "--writable"
  ]
}
```

Useful tools exposed by the MCP server:

- `list_sheets`
- `read_range`
- `read_cell`
- `set_cell_contents`
- `get_cell_display_value`
- `export_workpaper_document`
- `validate_formula`

After every write, read the dependent output cell and export the WorkPaper document. Do not claim success from the write call alone.

## Direct TypeScript Pattern

Use the package directly when workbook logic belongs inside application code:

```ts
import {
  WorkPaper,
  exportWorkPaperDocument,
  serializeWorkPaperDocument,
} from "@bilig/workpaper";

const workbook = WorkPaper.buildFromSheets({
  Inputs: [
    ["Metric", "Value"],
    ["Customers", 20],
    ["Average revenue", 1200],
  ],
  Summary: [
    ["Metric", "Value"],
    ["Revenue", "=Inputs!B2*Inputs!B3"],
  ],
});

const inputs = workbook.getSheetId("Inputs");
const summary = workbook.getSheetId("Summary");
if (inputs === undefined || summary === undefined) {
  throw new Error("Workbook is missing required sheets");
}

workbook.setCellContents({ sheet: inputs, row: 1, col: 1 }, 32);
const revenue = workbook.getCellDisplayValue({ sheet: summary, row: 1, col: 1 });
const saved = serializeWorkPaperDocument(
  exportWorkPaperDocument(workbook, { includeConfig: true }),
);

console.log({ revenue, savedBytes: saved.length });
```

## Required Verification

A good agent response should include:

- exact sheet names and A1 cells edited;
- before values for important inputs and dependent outputs;
- after values read from the recalculated workbook;
- persistence evidence from exported or serialized WorkPaper JSON;
- restore or reimport proof when file boundaries matter;
- clear limitations for unsupported formulas or Excel-only behavior.

If any proof step fails, report the blocker instead of saying the workbook was updated.

## Limitations

- WorkPaper behavior is not a complete replacement for desktop Excel, VBA, pivots, charts, or UI automation.
- Formula compatibility depends on the Bilig runtime and should be verified against Excel when exact parity matters.
- MCP writes should remain scoped to trusted workbook paths and must be followed by readback validation.

## References

- Repository: https://github.com/proompteng/bilig
- Compact docs map: https://proompteng.github.io/bilig/llms.txt
- Agent handbook: https://proompteng.github.io/bilig/headless-workpaper-agent-handbook.html
- MCP server guide: https://proompteng.github.io/bilig/mcp-workpaper-tool-server.html
- XLSX formula clinic: https://proompteng.github.io/bilig/formula-bug-clinic.html
- Compatibility limits: https://proompteng.github.io/bilig/where-bilig-is-not-excel-compatible-yet.html

## Examples

### Example 1: Build a responsive card component in React

Create a `<ProductCard>` component with Tailwind CSS, supporting dark mode and a loading skeleton state.

### Example 2: Audit a landing page for accessibility

Check `index.html` for missing alt attributes, focus traps, and contrast ratio violations per WCAG 2.1 AA.

