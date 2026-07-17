---
name: food-database-query
description: Query and compare nutrient records from an identified user-provided food dataset without inventing values or giving individualized medical nutrition advice.
risk: critical
source: community
---

# Food Database Query

Use this skill to retrieve, normalize, compare, and summarize records from a structured food-composition dataset that is actually available in the task context.

## When to Use

- The user supplies a food dataset, database connection, API response, or authoritative record export.
- The task is a neutral lookup, unit conversion, data-quality check, or food-level comparison.
- Every reported value must remain traceable to a source record and serving basis.

## Do Not Use

- Do not diagnose, treat, or recommend foods for diabetes, hypertension, kidney disease, allergies, eating disorders, pregnancy, or another personal medical condition.
- Do not invent a bundled database, silently substitute remembered nutrient values, or describe a lookup as database-backed when no source record is available.
- Do not calculate personal calorie, nutrient, supplement, or therapeutic targets. A clinician-provided target may be displayed as user input but must not be validated or changed here.

## Required Inputs

Before querying, record:

1. dataset or API name, publisher, version/date, and access path;
2. record identifier and food description fields;
3. nutrient identifiers, units, missing-value conventions, and basis such as per 100 g or per serving;
4. preparation state, edible portion, and serving weight when available;
5. any user-supplied filters, with confirmation that they are data filters rather than medical treatment rules.

If the dataset is missing or inaccessible, stop and ask for it. Do not fall back to the historical `data/food-database.json` or `data/food-categories.json` paths: those files are not bundled with this skill.

## Query Workflow

### 1. Validate the source

- Confirm that the requested fields exist and that units are documented.
- Preserve nulls and qualifiers such as estimated, trace, below detection, or not analyzed.
- Reject records with an unknown serving basis or incompatible units until the ambiguity is resolved.
- Keep the source record ID in every intermediate result.

### 2. Resolve the food

- Search exact names and stable identifiers first.
- Present ambiguous matches—including preparation and brand differences—for user selection.
- Never merge raw/cooked, drained/undrained, fortified/unfortified, or brand/generic records without explicit rules.

### 3. Normalize values

Convert only when the source provides the required mass or volume relationship:

```text
value_for_portion = value_per_100_g * edible_portion_grams / 100
```

Do not convert household measures to grams from memory. Retain the original value, unit, basis, conversion factor, and rounding rule alongside the normalized value.

### 4. Compare records

- Compare the same nutrient, unit, basis, and preparation state.
- Report absolute values and source IDs before derived differences.
- Separate missing data from numeric zero.
- Describe observations such as “record A contains more listed fiber per 100 g than record B”; do not turn the comparison into a disease or treatment recommendation.

### 5. Verify output

For each value, verify:

- source record and dataset version;
- nutrient identifier and unit;
- original basis and any conversion;
- arithmetic and rounding;
- missing/estimated qualifiers;
- absence of unsupported health claims or individualized targets.

## Output Template

```markdown
## Query scope
- Dataset/version:
- Food records:
- Basis and preparation state:

## Results
| Record ID | Food | Nutrient | Value | Unit | Basis | Qualifier |
|---|---|---|---:|---|---|---|

## Transformations
- Conversion formula and source serving weight, if any
- Rounding rule

## Data limitations
- Missing fields, ambiguous matches, estimates, and version limits
```

## Safety Boundaries

- Treat food logs and health context as sensitive data; collect only what the lookup needs and follow the user's retention/access requirements.
- Route requests for personal disease management, deficiency treatment, restrictive diets, child feeding, pregnancy, allergy safety, or supplement dosing to an appropriately qualified clinician or registered dietitian.
- For urgent allergic reactions, severe symptoms, inability to eat/drink, or another immediate danger, stop the analysis and direct the user to local emergency care.

## Limitations

- Food-composition values vary by cultivar, brand, preparation, sampling, and analytical method.
- This skill does not bundle a food database and cannot establish that an external dataset is current or clinically appropriate.
- Output is data analysis, not medical advice or a substitute for professional care.
