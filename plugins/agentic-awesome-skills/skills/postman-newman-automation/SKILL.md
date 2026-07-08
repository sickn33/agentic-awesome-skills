---
name: postman-newman-automation
description: Generate Newman CLI commands, configuration files, Jenkins pipeline scripts, and shell automation for running Postman collections in CI/CD or local environments. Use this skill whenever the user wants to run Postman collections from the command line, automate API tests, integrate...
risk: unknown
source: https://github.com/LambdaTest/agent-skills/tree/main/api-skill/postman/postman-to-newman
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# Postman Newman Automation
## When to Use

Use this skill when you need generate Newman CLI commands, configuration files, Jenkins pipeline scripts, and shell automation for running Postman collections in CI/CD or local environments. Use this skill whenever the user wants to run Postman collections from the command line, automate API tests, integrate...


Generates **Newman CLI** commands, **shell scripts**, and **Jenkins pipeline** configs
for running Postman collections in automated environments.

---

## Newman Basics

Newman is Postman's CLI runner. Install with:
```bash
npm install -g newman
# Optional HTML reporter:
npm install -g newman-reporter-htmlextra
```

### Core Command Structure
```bash
newman run <collection> \
  --environment <env-file> \
  --globals <globals-file> \
  --iteration-count <n> \
  --iteration-data <csv-or-json> \
  --reporters <reporter-list> \
  --reporter-htmlextra-export <output.html> \
  --reporter-junit-export <results.xml> \
  --timeout-request <ms> \
  --delay-request <ms> \
  --bail \
  --color on
```

---

## Step 1 — Gather Requirements

Ask or infer from context:

| Parameter | Question |
|---|---|
| Collection source | File path, URL, or Postman API UID? |
| Environment | File path or inline variables? |
| Reporter(s) | CLI only, HTML report, JUnit XML? |
| Fail behavior | Stop on first failure (`--bail`) or run all? |
| Iterations | Single run or data-driven (CSV/JSON)? |
| Target | Local shell, Jenkins, or both? |

---

## Step 2 — Generate Newman Command

### Basic run (local)
```bash
newman run collection.json \
  --environment environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export reports/report.html \
  --bail
```

### Run from Postman API (by UID)
```bash
newman run "https://api.getpostman.com/collections/<UID>?apikey={{POSTMAN_API_KEY}}" \
  --environment environment.json \
  --reporters cli,junit \
  --reporter-junit-export results/junit.xml
```

### Data-driven run (CSV)
```bash
newman run collection.json \
  --iteration-data test-data.csv \
  --iteration-count 5 \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export reports/data-driven-report.html
```

### With environment variable overrides (no file needed)
```bash
newman run collection.json \
  --env-var "base_url=https://staging.api.example.com" \
  --env-var "token=abc123" \
  --reporters cli
```

---

## Step 3 — Shell Script

Generate a reusable shell script:

```bash
#!/bin/bash
set -e

# Configuration
COLLECTION="./collection.json"
ENVIRONMENT="./environment.json"
REPORT_DIR="./reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Ensure report directory exists
mkdir -p "$REPORT_DIR"

echo "Running Newman collection: $COLLECTION"

newman run "$COLLECTION" \
  --environment "$ENVIRONMENT" \
  --reporters cli,htmlextra,junit \
  --reporter-htmlextra-export "$REPORT_DIR/report_$TIMESTAMP.html" \
  --reporter-junit-export "$REPORT_DIR/junit_$TIMESTAMP.xml" \
  --timeout-request 10000 \
  --bail

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All tests passed."
else
  echo "❌ Tests failed. Check report: $REPORT_DIR/report_$TIMESTAMP.html"
  exit $EXIT_CODE
fi
```

---

## Step 4 — Jenkins Pipeline

### Declarative Jenkinsfile (preferred)

```groovy
pipeline {
  agent any

  environment {
    POSTMAN_ENV = credentials('postman-environment-file') // Jenkins credential ID
  }

  stages {
    stage('Install Newman') {
      steps {
        sh 'npm install -g newman newman-reporter-htmlextra'
      }
    }

    stage('Run API Tests') {
      steps {
        sh """
          newman run collection.json \\
            --environment ${POSTMAN_ENV} \\
            --reporters cli,htmlextra,junit \\
            --reporter-htmlextra-export reports/report.html \\
            --reporter-junit-export reports/junit.xml \\
            --timeout-request 10000 \\
            --bail
        """
      }
    }
  }

  post {
    always {
      // Archive HTML report
      publishHTML(target: [
        allowMissing: false,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'reports',
        reportFiles: 'report.html',
        reportName: 'Newman API Test Report'
      ])
      // Archive JUnit results
      junit 'reports/junit.xml'
    }
    failure {
      echo 'API tests failed! Check the Newman report.'
    }
  }
}
```

### Scripted Jenkinsfile (if declarative not available)

```groovy
node {
  stage('Install Newman') {
    sh 'npm install -g newman newman-reporter-htmlextra'
  }

  stage('Run API Tests') {
    try {
      sh """
        newman run collection.json \\
          --environment environment.json \\
          --reporters cli,junit \\
          --reporter-junit-export reports/junit.xml \\
          --bail
      """
    } catch (err) {
      currentBuild.result = 'FAILURE'
      throw err
    } finally {
      junit 'reports/junit.xml'
    }
  }
}
```

### Jenkins with environment variables (no credentials file)
```groovy
environment {
  BASE_URL = 'https://api.example.com'
  API_TOKEN = credentials('api-token-secret')
}

steps {
  sh """
    newman run collection.json \\
      --env-var "base_url=${BASE_URL}" \\
      --env-var "token=${API_TOKEN}" \\
      --reporters cli,junit \\
      --reporter-junit-export results/junit.xml
  """
}
```

---

## Step 5 — Reporter Reference

| Reporter | Install | Flag | Output |
|---|---|---|---|
| `cli` | built-in | `--reporters cli` | Terminal output |
| `junit` | built-in | `--reporters junit` | JUnit XML (for Jenkins) |
| `htmlextra` | `npm i -g newman-reporter-htmlextra` | `--reporters htmlextra` | Rich HTML report |
| `json` | built-in | `--reporters json` | Raw JSON results |

Multiple reporters: `--reporters cli,htmlextra,junit`

---

## Step 6 — Output

Provide based on what the user needs:

1. **Newman command** — ready to paste in terminal
2. **Shell script** (`run-tests.sh`) — with exit code handling
3. **Jenkinsfile** — declarative or scripted based on context
4. **Setup notes** — Node.js version requirement (≥14), npm install commands
5. **Report locations** — where output files will be written

---

## Common Flags Quick Reference

| Flag | Purpose |
|---|---|
| `--bail` | Stop run on first test failure |
| `--timeout-request 5000` | Per-request timeout in ms |
| `--delay-request 200` | Delay between requests in ms |
| `--iteration-count 3` | Run collection N times |
| `--folder "Folder Name"` | Run only a specific folder |
| `--env-var "k=v"` | Inline environment variable |
| `--suppress-exit-code` | Always exit 0 (don't fail CI) |
| `--verbose` | Show full request/response details |
| `--color off` | Disable color (useful for logs) |

---

## After Completing the Newman Commands

Once the CLI command output is delivered, ask the user:

"Would you like me to generate API documentation for this design? (yes/no)"

If the user says **yes**:
- Check if the API Documentation skill is available in the installed skills list
- If the skill **is available**:
  - Read and follow the instructions in the API Documentation skill
  - Use the API design output above as the input
  - Deliver the documentation as plain text output
- If the skill **is NOT available**:
  - Inform the user: "It looks like the API Documentation skill isn't installed.
    You can install it and re-run.

If the user says **no**:
- End the task here

---

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
