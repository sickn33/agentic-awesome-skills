# WellAlly Digital Health Integration - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

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
