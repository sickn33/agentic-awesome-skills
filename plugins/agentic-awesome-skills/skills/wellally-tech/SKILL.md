---
name: wellally-tech
description: "Integrate multiple digital health data sources, connect to [WellAlly.tech](https://www.wellally.tech/) knowledge base, providing data import and knowledge reference for personal health management systems."
risk: critical
source: community
date_added: "2026-09-04"
---

# WellAlly Digital Health Integration

Integrate multiple digital health data sources, connect to [WellAlly.tech](https://www.wellally.tech/) knowledge base, providing data import and knowledge reference for personal health management systems.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
- You need to import or normalize health data from sources like Apple Health, Fitbit, Oura, or CSV/JSON exports.
- You want to connect personal health data workflows to the WellAlly.tech knowledge base.
- The task involves data import, health-data management, or article recommendations driven by user health context.

## Usage Instructions

### Trigger Conditions

Use this skill when users mention the following scenarios:

**Data Import**:
- ✅ "Import my health data from Apple Health"
- ✅ "Connect my Fitbit device"
- ✅ "Sync my Oura Ring data"
- ✅ "Import CSV health data file"
- ✅ "How to import fitness tracker/smartwatch data"

**Knowledge Base Query**:
- ✅ "Articles about hypertension on WellAlly platform"
- ✅ "Recommend some health management reading materials"
- ✅ "Recommend articles based on my health data"
- ✅ "WellAlly knowledge base articles about sleep"
- ✅ "How to improve my blood pressure (check knowledge base)"

**Data Management**:
- ✅ "What health data sources do I have"
- ✅ "Integrate health data from different platforms"
- ✅ "View imported external data"

### Execution Steps

#### Step 1: Identify User Intent

Determine what the user wants:
1. **Import Data**: Import data from external health platforms
2. **Query Knowledge Base**: Find [WellAlly.tech](https://www.wellally.tech/) related articles
3. **Get Recommendations**: Recommend articles based on health data
4. **Data Management**: View or manage imported external data

#### Step 2: Data Import Workflow

If user wants to import data:

**2.1 Determine Data Source**
```javascript
const dataSource = identifySource(userInput);
// Possible returns: "apple-health", "fitbit", "oura", "generic-csv", "generic-json"
```

**2.2 Read External Data**
Use appropriate import script based on data source type:

```javascript
// Apple Health
const appleHealthData = readAppleHealthExport(exportPath);

// Fitbit
const fitbitData = fetchFitbitData(dateRange);

// Oura Ring
const ouraData = fetchOuraData(dateRange);

// Generic CSV/JSON
const genericData = readGenericFile(filePath, mappingConfig);
```

**2.3 Data Mapping and Conversion**
Map external data to local format:

```javascript
// Example: Apple Health steps mapping
function mapAppleHealthSteps(appleRecord) {
  return {
    date: formatDateTime(appleRecord.startDate),
    steps: parseInt(appleRecord.value),
    source: "Apple Health",
    device: appleRecord.sourceName
  };
}

// Save to local file
saveToLocalFile("data/fitness/activities.json", mappedData);
```

**2.4 Data Validation**
```javascript
function validateImportedData(data) {
  // Check required fields
  // Validate data types
  // Check data ranges
  // Ensure correct time format

  return {
    valid: true,
    errors: [],
    warnings: []
  };
}
```

**2.5 Generate Import Report**
```javascript
const importReport = {
  source: dataSource,
  import_date: new Date().toISOString(),
  records_imported: {
    steps: 1234,
    weight: 30,
    heart_rate: 1200,
    sleep: 90
  },
  date_range: {
    start: "2025-01-01",
    end: "2025-01-22"
  },
  validation: validationResults
};
```

#### Step 3: Knowledge Base Query Workflow

If user wants to query knowledge base:

**3.1 Identify Query Topic**
```javascript
const topic = identifyTopic(userInput);
// Possible returns: "nutrition", "fitness", "sleep", "mental-health", "chronic-disease", "hypertension", "diabetes", etc.
```

**3.2 Search Relevant Articles**
Find relevant articles from knowledge base index:

```javascript
function searchKnowledgeBase(topic) {
  // Read knowledge base index
  const kbIndex = readFile('.claude/skills/wellally-tech/knowledge-base/index.md');

  // Find matching articles
  const articles = kbIndex.categories.filter(cat =>
    cat.tags.includes(topic) || cat.keywords.includes(topic)
  );

  return articles;
}
```

**3.3 Return Article Links**
```javascript
const results = {
  topic: topic,
  articles: [
    {
      title: "Hypertension Monitoring and Management",
      url: "https://wellally.tech/knowledge-base/chronic-disease/hypertension-monitoring",
      category: "Chronic Disease Management",
      description: "Learn how to effectively monitor and manage blood pressure"
    },
    {
      title: "Blood Pressure Lowering Strategies",
      url: "https://wellally.tech/knowledge-base/chronic-disease/bp-lowering-strategies",
      category: "Chronic Disease Management",
      description: "Improve blood pressure levels through lifestyle changes"
    }
  ],
  total_found: 2
};
```

#### Step 4: Intelligent Recommendation Workflow

If user wants personalized recommendations:

**4.1 Read User Health Data**
```javascript
// Read relevant health data
const profile = readFile('data/profile.json');
const bloodPressure = glob('data/blood-pressure/**/*.json');
const sleepRecords = glob('data/sleep/**/*.json');
const weightHistory = profile.weight_history || [];
```

**4.2 Analyze Health Status**
```javascript
function analyzeHealthStatus(data) {
  const status = {
    concerns: [],
    good_patterns: []
  };

  // Analyze blood pressure
  if (data.blood_pressure?.average > 140/90) {
    status.concerns.push({
      area: "blood_pressure",
      severity: "high",
      condition: "Hypertension",
      value: data.blood_pressure.average
    });
  }

  // Analyze sleep
  if (data.sleep?.average_duration < 6) {
    status.concerns.push({
      area: "sleep",
      severity: "medium",
      condition: "Sleep Deprivation",
      value: data.sleep.average_duration + " hours"
    });
  }

  // Analyze weight trend
  if (data.weight?.trend === "increasing") {
    status.concerns.push({
      area: "weight",
      severity: "medium",
      condition: "Weight Gain",
      value: data.weight.change + " kg"
    });
  }

  // Identify good patterns
  if (data.steps?.average > 8000) {
    status.good_patterns.push({
      area: "activity",
      description: "Daily average steps over 8000",
      value: data.steps.average
    });
  }

  return status;
}
```

**4.3 Recommend Relevant Articles**
```javascript
function recommendArticles(healthStatus) {
  const recommendations = [];

  for (const concern of healthStatus.concerns) {
    const articles = findArticlesForCondition(concern.condition);
    recommendations.push({
      condition: concern.condition,
      severity: concern.severity,
      articles: articles
    });
  }

  return recommendations;
}
```

**4.4 Generate Recommendation Report**
```javascript
const recommendationReport = {
  generated_at: new Date().toISOString(),
  health_status: healthStatus,
  recommendations: recommendations,
  total_articles: recommendations.reduce((sum, r) => sum + r.articles.length, 0)
};
```

## Security & Privacy

### Must Follow

- ❌ Do not upload data to external servers (except API sync)
- ❌ Do not hardcode API credentials in code
- ❌ Do not share user access tokens
- ✅ All imported data stored locally only
- ✅ OAuth credentials encrypted storage
- ✅ Import only after explicit user authorization

### Data Validation

- ✅ Validate imported data types and ranges
- ✅ Filter abnormal values (e.g., negative steps)
- ✅ Preserve data source information
- ✅ Handle timezone conversion

### Error Handling

**File Read Failure**:
- Output "Unable to read file, please check file path and format"
- Provide correct file format examples
- Suggest re-exporting data

**API Call Failure**:
- Output "API call failed, please check network connection and credentials"
- Provide OAuth re-authentication guidance
- Fall back to CSV import method

**Data Validation Failure**:
- Output "Incorrect data format, skipped invalid records"
- Log number of skipped records
- Continue processing valid data

## Usage Examples

### Example 1: Import Apple Health Data
**User**: "Import fitness tracker data from Apple Health"
**Output**: Execute import workflow, generate import report

### Example 2: Query Knowledge Base
**User**: "WellAlly platform articles about sleep"
**Output**: Return sleep-related knowledge base article links

### Example 3: Get Personalized Recommendations
**User**: "Recommend articles based on my health data"
**Output**: Analyze health data, recommend relevant articles

### Example 4: Import Generic CSV
**User**: "Import this CSV health data file health.csv"
**Output**: Parse CSV, map fields, save to local

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
