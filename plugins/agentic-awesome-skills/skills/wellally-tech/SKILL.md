---
name: wellally-tech
description: "Integrate multiple digital health data sources, connect to [WellAlly.tech](https://www.wellally.tech/) knowledge base, providing data import and knowledge reference for personal health management systems."
risk: unknown
source: community
---

# WellAlly Digital Health Integration

Integrate multiple digital health data sources, connect to [WellAlly.tech](https://www.wellally.tech/) knowledge base, providing data import and knowledge reference for personal health management systems.

## When to Use
- You need to import or normalize health data from sources like Apple Health, Fitbit, Oura, or CSV/JSON exports.
- You want to connect personal health data workflows to the WellAlly.tech knowledge base.
- The task involves data import, health-data management, or article recommendations driven by user health context.

## Core Features

### 1. Digital Health Data Import
- **Apple Health (HealthKit)**: Export XML/ZIP file parsing
- **Fitbit**: OAuth2 API integration and CSV import
- **Oura Ring**: API v2 data synchronization
- **Generic Import**: CSV/JSON file import with field mapping

### 2. WellAlly.tech Knowledge Base Integration
- **Categorized Article Index**: Nutrition, fitness, sleep, mental health, chronic disease management
- **Intelligent Recommendations**: Recommend relevant articles based on user health data
- **URL References**: Provide direct links to [WellAlly.tech](https://www.wellally.tech/) platform

### 3. Data Standardization
- **Format Conversion**: Convert external data to local JSON format
- **Field Mapping**: Intelligently map data fields from different platforms
- **Data Validation**: Ensure completeness and accuracy of imported data

### 4. Intelligent Article Recommendations
- **Health Status Analysis**: Based on user health data analysis
- **Relevance Matching**: Recommend articles most relevant to user health conditions
- **Category Navigation**: Organize knowledge base articles by health topics

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

## Output Format

### Data Import Output

```
✅ Data Import Successful

Data Source: Apple Health
Import Time: 2025-01-22 14:30:00

Import Records Statistics:
━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Step Records: 1,234 records
⚖️ Weight Records: 30 records
❤️ Heart Rate Records: 1,200 records
😴 Sleep Records: 90 records

Data Time Range: 2025-01-01 to 2025-01-22
━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Data Saved To:
• data/fitness/activities.json (steps)
• data/profile.json (weight history)
• data/fitness/heart-rate.json (heart rate)
• data/sleep/sleep-records.json (sleep)

⚠️  Validation Warnings:
• 3 step records missing timestamps, used default values
• 1 weight record abnormal (<20kg), skipped

💡 Next Steps:
• Use /health-trend to analyze imported data
• Use /wellally-tech for personalized article recommendations
```

### Knowledge Base Query Output

```
📚 WellAlly Knowledge Base Search Results

Search Topic: Hypertension Management
Articles Found: 2

━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Hypertension Monitoring and Management
   Category: Chronic Disease Management
   Link: https://wellally.tech/knowledge-base/chronic-disease/hypertension-monitoring
   Description: Learn how to effectively monitor and manage blood pressure

2. Blood Pressure Lowering Strategies
   Category: Chronic Disease Management
   Link: https://wellally.tech/knowledge-base/chronic-disease/bp-lowering-strategies
   Description: Improve blood pressure levels through lifestyle modifications

━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 Related Topics:
• Diabetes Management
• Cardiovascular Health
• Medication Adherence

💡 Tips:
Click links to visit [WellAlly.tech](https://www.wellally.tech/) platform for full articles
```

### Intelligent Recommendation Output

```
💡 Article Recommendations Based on Your Health Data

Generated Time: 2025-01-22 14:30:00

━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 Attention Needed: Blood Pressure Management
━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Status: Average blood pressure 142/92 mmHg (elevated)

Recommended Articles:
1. Hypertension Monitoring and Management
   https://wellally.tech/knowledge-base/chronic-disease/hypertension-monitoring

2. Blood Pressure Lowering Strategies
   https://wellally.tech/knowledge-base/chronic-disease/bp-lowering-strategies

3. Antihypertensive Medication Adherence Guide
   https://wellally.tech/knowledge-base/chronic-disease/medication-adherence

━━━━━━━━━━━━━━━━━━━━━━━━━━

🟡 Attention Needed: Sleep Improvement
━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Status: Average sleep duration 5.8 hours (insufficient)

Recommended Articles:
1. Sleep Hygiene Basics
   https://wellally.tech/knowledge-base/sleep/sleep-hygiene

2. Improve Sleep Quality
   https://wellally.tech/knowledge-base/sleep/sleep-quality-improvement

━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 Keep Up: Daily Activity
━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Status: Daily average steps 9,234 (good)

Related Reading:
1. Maintain Active Lifestyle
   https://wellally.tech/knowledge-base/fitness/active-lifestyle

━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary: 5 related articles recommended
Visit [WellAlly.tech](https://www.wellally.tech/) Knowledge Base for full content
```

## Data Sources

### External Data Sources

| Data Source | Type | Import Method | Data Content |
|-------------|------|---------------|--------------|
| Apple Health | File Import | XML/ZIP Parsing | Steps, weight, heart rate, sleep, workouts |
| Fitbit | API/CSV | OAuth2 or CSV | Activities, heart rate, sleep, weight |
| Oura Ring | API | OAuth2 | Sleep stages, readiness, heart rate variability |
| Generic CSV | File Import | Field Mapping | Custom health data |
| Generic JSON | File Import | Field Mapping | Custom health data |

### Local Data Files

| File Path | Data Content | Source Mapping |
|-----------|--------------|----------------|
| `data/profile.json` | Profile, weight history | Apple Health, Fitbit, Oura |
| `data/fitness/activities.json` | Steps, activity data | Apple Health, Fitbit, Oura |
| `data/fitness/heart-rate.json` | Heart rate records | Apple Health, Fitbit, Oura |
| `data/sleep/sleep-records.json` | Sleep records | Apple Health, Fitbit, Oura |
| `data/fitness/recovery.json` | Recovery data | Oura Ring (readiness) |

## WellAlly.tech Knowledge Base

### Knowledge Base Structure

**Nutrition & Diet** (`knowledge-base/nutrition.md`)
- Dietary management guidelines
- Food nutrition queries
- Diet recommendations
- Special dietary needs

**Fitness & Exercise** (`knowledge-base/fitness.md`)
- Exercise tracking best practices
- Activity recommendations
- Exercise data interpretation
- Training plans

**Sleep Health** (`knowledge-base/sleep.md`)
- Sleep quality analysis
- Sleep improvement strategies
- Sleep disorders overview
- Sleep hygiene

**Mental Health** (`knowledge-base/mental-health.md`)
- Stress management techniques
- Mood tracking interpretation
- Mental health resources
- Mindfulness practice

**Chronic Disease Management** (`knowledge-base/chronic-disease.md`)
- Hypertension monitoring
- Diabetes management
- COPD care
- Medication adherence

### Article Recommendation Mapping

```javascript
const articleMapping = {
  "Hypertension": [
    "chronic-disease/hypertension-monitoring",
    "chronic-disease/bp-lowering-strategies"
  ],
  "Diabetes": [
    "chronic-disease/diabetes-management",
    "nutrition/diabetic-diet"
  ],
  "Sleep Deprivation": [
    "sleep/sleep-hygiene",
    "sleep/sleep-quality-improvement"
  ],
  "Weight Gain": [
    "nutrition/healthy-diet",
    "nutrition/calorie-management"
  ],
  "High Stress": [
    "mental-health/stress-management",
    "mental-health/mindfulness"
  ]
};
```

## Integration Guides

### Apple Health Import

**Export Steps**:
1. Open "Health" app on iPhone
2. Tap profile icon in top right corner
3. Scroll to bottom, tap "Export All Health Data"
4. Wait for export to complete and choose sharing method
5. Save the exported ZIP file

**Import Steps**:
```bash
python scripts/import_apple_health.py ~/Downloads/apple_health_export.zip
```

### Fitbit Integration

**API Integration**:
1. Create app on Fitbit Developer Platform
2. Get CLIENT_ID and CLIENT_SECRET
3. Run OAuth authentication flow
4. Store access token

**Import Data**:
```bash
python scripts/import_fitbit.py --api --days 30
```

**CSV Import**:
```bash
python scripts/import_fitbit.py --csv fitbit_export.csv
```

### Oura Ring Integration

**API Integration**:
1. Create app on Oura Developer Platform
2. Get Personal Access Token
3. Configure token in import script

**Import Data**:
```bash
python scripts/import_oura.py --date-range 2025-01-01 2025-01-22
```

### Generic CSV/JSON Import

**CSV Import**:
```bash
python scripts/import_generic.py health_data.csv --mapping mapping_config.json
```

**Mapping Configuration Example** (`mapping_config.json`):
```json
{
  "date": "Date",
  "steps": "Step Count",
  "weight": "Weight (kg)",
  "heart_rate": "Resting Heart Rate"
}
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

## Related Commands

- `/health-trend`: Analyze health trends (using imported data)
- `/sleep`: Record sleep data
- `/diet`: Record diet data
- `/fitness`: Record exercise data
- `/profile`: Manage personal profile

## Technical Implementation

### Tool Limitations

This Skill only uses the following tools:
- **Read**: Read external data files and configurations
- **Grep**: Search data patterns
- **Glob**: Find data files
- **Write**: Save imported data to local JSON files

### Python Dependencies

Python packages potentially needed for import scripts:
```python
# Apple Health
import xml.etree.ElementTree as ET
import zipfile

# Fitbit/Oura
import requests

# Generic Import
import csv
import json
```

### Performance Optimization

- Incremental reading: Only import data within specified time range
- Data deduplication: Avoid importing duplicate data for same day
- Batch writing: Save data in batches for better performance
- Error recovery: Support resume from breakpoint

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

## Extensibility

### Adding New Data Sources

1. Create new integration guide in `integrations/` directory
2. Create new import script in `scripts/` directory
3. Update `data-sources.md` documentation
4. Add usage instructions in SKILL.md

### Adding New Knowledge Base Categories

1. Create new category file in `knowledge-base/` directory
2. Add related article links
3. Update `knowledge-base/index.md`
4. Update article recommendation mapping

## Reference Resources

- **WellAlly.tech**: https://www.wellally.tech/
- **WellAlly Knowledge Base**: https://wellally.tech/knowledge-base/
- **WellAlly Blog**: https://wellally.tech/blog/
- **Apple HealthKit**: https://developer.apple.com/documentation/healthkit
- **Fitbit API**: https://dev.fitbit.com/
- **Oura Ring API**: https://cloud.ouraring.com/api/

## FAQ

**Q: Will imported data overwrite existing data?**
A: No. Imported data will be appended to existing data, not overwritten. Duplicate data will be automatically deduplicated.

**Q: Can I import data from multiple platforms?**
A: Yes. You can import data from Apple Health, Fitbit, Oura, and other platforms simultaneously, the system will merge all data.

**Q: Are WellAlly.tech knowledge base articles offline?**
A: No. Knowledge base articles are referenced via URLs, requiring network connection to access the [WellAlly.tech](https://www.wellally.tech/) platform.

**Q: Where are API credentials stored?**
A: API credentials are encrypted and stored in local configuration files, not uploaded to any server.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
