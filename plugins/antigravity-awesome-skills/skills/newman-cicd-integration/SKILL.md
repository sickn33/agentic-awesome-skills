---
name: newman-cicd-integration
description: Generate ready-to-use CI/CD pipeline configurations that install and run Newman for automated API testing. Use this skill whenever the user wants to run Newman in a CI pipeline, integrate Postman collections into automated builds, set up API tests in GitHub Actions, GitLab CI, Jenkins,...
risk: unknown
source: https://github.com/LambdaTest/agent-skills/tree/main/api-skill/newman/newman-cicd-helper
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# Newman CI/CD Integration Generator
## When to Use

Use this skill when you need generate ready-to-use CI/CD pipeline configurations that install and run Newman for automated API testing. Use this skill whenever the user wants to run Newman in a CI pipeline, integrate Postman collections into automated builds, set up API tests in GitHub Actions, GitLab CI, Jenkins,...


Generate complete, copy-paste-ready CI/CD pipeline configs that install Newman and run Postman collections as part of automated builds.

---

## What to Collect From the User

Before generating a config, determine:
1. **CI platform** — GitHub Actions, GitLab CI, Jenkins, Azure DevOps, CircleCI, Bitbucket?
2. **Collection source** — local file in repo, or Postman API URL?
3. **Environment** — local env file in repo, or env vars injected by CI secrets?
4. **Reporters needed** — JUnit XML (for CI test results panel), HTML report, or both?
5. **Node.js version** preference (default: 18)
6. **Trigger** — on every push, pull request, schedule, or after deploy?
7. **Fail build on test failure?** — almost always yes; confirm

---

## Platform Templates

### GitHub Actions

```yaml
name: API Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  api-tests:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install Newman
        run: |
          npm install -g newman
          npm install -g newman-reporter-htmlextra

      - name: Run API tests
        run: |
          newman run ./collections/my-api.json \
            -e ./environments/staging.json \
            -r cli,junit,htmlextra \
            --reporter-junit-export ./results/junit.xml \
            --reporter-htmlextra-export ./results/report.html \
            --reporter-htmlextra-title "API Test Results"
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}

      - name: Publish test results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Newman API Tests
          path: results/junit.xml
          reporter: java-junit

      - name: Upload HTML report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: api-test-report
          path: results/report.html
```

---

### GitLab CI

```yaml
stages:
  - test

api-tests:
  stage: test
  image: node:18-alpine
  before_script:
    - npm install -g newman newman-reporter-htmlextra
  script:
    - |
      newman run ./collections/my-api.json \
        -e ./environments/staging.json \
        --env-var "BASE_URL=$BASE_URL" \
        --env-var "API_KEY=$API_KEY" \
        -r cli,junit,htmlextra \
        --reporter-junit-export results/junit.xml \
        --reporter-htmlextra-export results/report.html
  artifacts:
    when: always
    reports:
      junit: results/junit.xml
    paths:
      - results/report.html
    expire_in: 7 days
  variables:
    BASE_URL: $BASE_URL   # Set in GitLab CI/CD > Variables
    API_KEY: $API_KEY
```

---

### Jenkins (Declarative Pipeline)

```groovy
pipeline {
  agent any

  tools {
    nodejs 'NodeJS-18'   // Configure in Global Tool Configuration
  }

  stages {
    stage('Install Newman') {
      steps {
        sh 'npm install -g newman newman-reporter-htmlextra'
      }
    }

    stage('Run API Tests') {
      steps {
        sh '''
          newman run ./collections/my-api.json \
            -e ./environments/staging.json \
            -r cli,junit,htmlextra \
            --reporter-junit-export results/junit.xml \
            --reporter-htmlextra-export results/report.html \
            --reporter-htmlextra-title "API Tests - ${BUILD_NUMBER}"
        '''
      }
    }
  }

  post {
    always {
      junit 'results/junit.xml'
      publishHTML([
        allowMissing: false,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'results',
        reportFiles: 'report.html',
        reportName: 'Newman API Test Report'
      ])
    }
  }
}
```

---

### Azure DevOps

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'
    displayName: 'Set up Node.js'

  - script: |
      npm install -g newman newman-reporter-htmlextra
    displayName: 'Install Newman'

  - script: |
      newman run ./collections/my-api.json \
        -e ./environments/staging.json \
        --env-var "API_KEY=$(API_KEY)" \
        -r cli,junit,htmlextra \
        --reporter-junit-export $(System.DefaultWorkingDirectory)/results/junit.xml \
        --reporter-htmlextra-export $(System.DefaultWorkingDirectory)/results/report.html
    displayName: 'Run API Tests'
    env:
      API_KEY: $(API_KEY)   # Set in Pipeline > Variables

  - task: PublishTestResults@2
    condition: always()
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: 'results/junit.xml'
      testRunTitle: 'Newman API Tests'

  - task: PublishBuildArtifacts@1
    condition: always()
    inputs:
      PathtoPublish: 'results/report.html'
      ArtifactName: 'api-test-report'
```

---

### CircleCI

```yaml
version: 2.1

jobs:
  api-tests:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      - run:
          name: Install Newman
          command: npm install -g newman newman-reporter-htmlextra
      - run:
          name: Run API Tests
          command: |
            mkdir -p results
            newman run ./collections/my-api.json \
              -e ./environments/staging.json \
              --env-var "API_KEY=$API_KEY" \
              -r cli,junit,htmlextra \
              --reporter-junit-export results/junit.xml \
              --reporter-htmlextra-export results/report.html
      - store_test_results:
          path: results
      - store_artifacts:
          path: results/report.html

workflows:
  test:
    jobs:
      - api-tests
```

---

## Best Practices

### Secrets — never hardcode credentials
Always inject sensitive values as CI environment variables/secrets:
- GitHub: `Settings > Secrets and Variables > Actions`
- GitLab: `Settings > CI/CD > Variables`
- Jenkins: `Manage Jenkins > Credentials`
- Azure DevOps: `Pipelines > Variables`

Reference in Newman via `--env-var "KEY=$SECRET_NAME"` or pre-set in the environment file.

### Store collection and environment files in the repo
```
/
├── collections/
│   └── my-api.json
├── environments/
│   ├── staging.json
│   └── prod.json
└── results/         ← gitignored, created by Newman
```

Add `results/` to `.gitignore`.

### Always use `if: always()` / `when: always`
Ensure test result artifacts are published even when Newman exits with a failure code.

### Exit codes
Newman exits with code `1` if any tests fail — this automatically fails the pipeline step. Use `--bail` if you want to stop on the first failure rather than running all tests.

---

## How to Generate Configs

1. Confirm the CI platform and tailor the exact syntax
2. Use the correct secret/variable injection syntax for that platform
3. Include artifact publishing steps so test results appear in the CI UI
4. Add comments explaining secrets that need to be configured
5. Keep environment files in the repo (without secrets); inject sensitive values via CI vars

---

## After Completing the Newman CICD output

Once the Newman CICD output is delivered, ask the user:

"Would you like me to generate Postman Test Cases for these commands? (yes/no)"

If the user says **yes**:
- Check if the postman-testcase-generator skill is available in the installed skills list
- If the skill **is available**:
  - Read and follow the instructions in the postman-testcase-generator skill
  - Use the CICD command output above as the input
- If the skill **is NOT available**:
  - Inform the user: "It looks like the postman-testcase-generator skill isn't installed.
    You can install it and re-run.

If the user says **no**:
- End the task here

---

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
