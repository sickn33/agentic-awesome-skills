---
name: warehouse
description: "Plan and review read-only data warehouse analysis with explicit scope, privacy, provenance, and validation checks."
category: data
risk: critical
source: self
source_type: self
date_added: "2026-07-12"
author: Rudra-G-23
tags: [analytics, data-warehouse, sql, data-quality]
tools: [claude, cursor, gemini]
---

# Warehouse Analysis

## Overview

Use this skill to turn a business question into a careful, reproducible warehouse-analysis plan. It is vendor-neutral and assumes no particular schema, semantic layer, connector, or command-line tool.

The skill defaults to read-only work. It helps identify the data needed, review a proposed query, and communicate results without overstating what the evidence supports.

## When to Use

- The user wants to answer a business question using an authorized data warehouse.
- A proposed SQL query needs a review for grain, joins, filters, privacy, or interpretation risks.
- An analysis needs a clear record of scope, freshness, assumptions, and source tables.

Do not use this skill for warehouse administration, pipeline repair, access escalation, schema mutation, or production data changes.

## Required Inputs

Before proposing a query, establish:

1. The decision or question the analysis should inform.
2. The population, metric, dimensions, and time window.
3. The authorized warehouse or query interface available to the user.
4. The relevant schema documentation or table metadata.
5. Any privacy, retention, regional, or minimum-group-size constraints.

If a required input is missing, ask a focused question. Never invent table names, column names, business definitions, credentials, or query results.

## Workflow

### 1. Define the analytical contract

Restate the request as:

- **Question:** what is being measured or compared.
- **Population:** which entities are included and excluded.
- **Metric:** numerator, denominator, aggregation, and unit.
- **Window:** dates, timezone, and whether the period is complete.
- **Decision:** how the result will be used.

Call out ambiguous terms such as “active,” “customer,” “revenue,” or “last month.” Resolve ambiguity before querying.

### 2. Find governed sources

Prefer documented metrics, curated models, and governed tables over raw event streams. Use only schema information supplied by the user or available through an authorized interface.

For each proposed source, record:

- table or model name;
- expected grain and primary key;
- freshness or maximum available date;
- owner or documentation reference;
- known exclusions and quality warnings.

If the source cannot be verified, label the plan as provisional and stop before presenting numerical conclusions.

### 3. Draft a read-only query

Create a query only when the real schema is known. The query should:

- select only the columns needed for the stated question;
- filter the requested time window explicitly;
- use qualified column names and deterministic joins;
- guard division by zero and null-sensitive calculations;
- avoid row-level personal data when an aggregate answers the question;
- include a conservative row limit for exploratory output when appropriate.

Do not emit guessed SQL with fictional identifiers. If no authorized execution tool is available, provide the reviewed query for the user to run rather than claiming it was executed.

### 4. Review before execution

Check the proposed query against this list:

- Does every join preserve the intended grain?
- Can a one-to-many join duplicate the numerator or denominator?
- Are test, deleted, internal, or incomplete records handled deliberately?
- Are timezone boundaries and partial periods explicit?
- Does the query expose identifiers or small groups unnecessarily?
- Would a simpler aggregate answer reduce data access?
- Are metric definitions consistent with the documented source?

Revise any failed check before execution. For sensitive or high-impact decisions, ask for review by the data owner or another qualified analyst.

### 5. Execute only with authorization

Run a query only through a user-authorized, read-only interface. Do not request credentials in chat, bypass access controls, broaden permissions, or turn a read-only task into a write operation.

Stop if the interface is unavailable, the scope exceeds the user's authorization, or the result would reveal restricted personal or confidential data.

### 6. Validate the result

Before interpreting output:

- compare row counts and totals with a trusted reference when one exists;
- inspect null rates, duplicates, and unexpected categories;
- test whether conclusions change under reasonable window or filter choices;
- separate observed values from hypotheses about their causes.

Do not infer causality from a descriptive query. Do not hide contradictory or incomplete evidence.

### 7. Report with provenance

Use a compact result structure:

```text
Finding: [what the data shows]
Scope: [population and period]
Method: [metric and source summary]
Confidence: [high, medium, or low, with reason]
Caveats: [freshness, exclusions, quality, or privacy limits]
Next step: [optional validation or decision input]
```

Include the query or a reproducible query summary when disclosure is appropriate. Redact secrets, credentials, and unnecessary row-level data.

## Example

**Request:** “Did weekly activated accounts improve after the onboarding change?”

**Safe response plan:**

1. Clarify the activation definition, rollout date, eligible population, timezone, and comparison window.
2. Locate the governed activation metric and account cohort source.
3. Aggregate weekly counts or rates without selecting account-level identifiers.
4. Review cohort overlap, partial weeks, seasonality, and join duplication.
5. Report the observed change as an association, with confidence and caveats, not as proof of causation.

## Security & Safety Notes

- Treat warehouse contents and schema metadata as confidential unless the user establishes otherwise.
- Use least privilege and read-only access; never modify tables, permissions, pipelines, or production configuration.
- Minimize personal data and aggregate results whenever possible.
- Never place credentials, tokens, connection strings, or raw sensitive records in prompts or reports.
- Stop and escalate to the data owner when policy, authorization, or disclosure boundaries are unclear.

## Limitations

- This skill cannot discover an undocumented schema or verify a result without an authorized data source.
- It does not replace organization-specific metric definitions, privacy policy, or expert review.
- It does not diagnose pipelines, administer warehouses, or make product and business decisions.
- Conclusions remain limited by source quality, freshness, sampling, and the analytical design.
