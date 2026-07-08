---
name: robot-framework-skill
description: 'Generates Robot Framework tests in keyword-driven syntax with Python. Supports SeleniumLibrary, RequestsLibrary, and custom keywords. Use when user mentions "Robot Framework", "*** Test Cases ***", "SeleniumLibrary", ".robot file". Triggers on: "Robot Framework", "*** Test Cases ***",...'
risk: unknown
source: https://github.com/LambdaTest/agent-skills/tree/main/robot-framework-skill
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# Robot Framework Skill
## When to Use

Use this skill when you need generates Robot Framework tests in keyword-driven syntax with Python. Supports SeleniumLibrary, RequestsLibrary, and custom keywords. Use when user mentions "Robot Framework", "*** Test Cases ***", "SeleniumLibrary", ".robot file". Triggers on: "Robot Framework", "*** Test Cases ***",...


For TestMu AI cloud execution, see [reference/cloud-integration.md](https://github.com/LambdaTest/agent-skills/tree/main/robot-framework-skill/reference/cloud-integration.md) and [shared/testmu-cloud-reference.md](https://github.com/LambdaTest/agent-skills/tree/main/robot-framework-skill/../shared/testmu-cloud-reference.md).

## Core Patterns

### Basic Test (tests/login.robot)

```robot
*** Settings ***
Library    SeleniumLibrary
Suite Setup    Open Browser    ${BASE_URL}    chrome
Suite Teardown    Close All Browsers

*** Variables ***
${BASE_URL}    http://localhost:3000
${EMAIL}       user@test.com
${PASSWORD}    password123

*** Test Cases ***
Login With Valid Credentials
    Go To    ${BASE_URL}/login
    Wait Until Element Is Visible    id:email    10s
    Input Text    id:email    ${EMAIL}
    Input Text    id:password    ${PASSWORD}
    Click Button    css:button[type='submit']
    Wait Until Element Is Visible    css:.dashboard    10s
    Page Should Contain    Welcome
    Location Should Contain    /dashboard

Login With Invalid Credentials Shows Error
    Go To    ${BASE_URL}/login
    Input Text    id:email    wrong@test.com
    Input Text    id:password    wrong
    Click Button    css:button[type='submit']
    Wait Until Element Is Visible    css:.error    5s
    Element Should Contain    css:.error    Invalid credentials
```

### Custom Keywords

```robot
*** Keywords ***
Login As User
    [Arguments]    ${email}    ${password}
    Go To    ${BASE_URL}/login
    Input Text    id:email    ${email}
    Input Text    id:password    ${password}
    Click Button    css:button[type='submit']

Verify Dashboard Is Displayed
    Wait Until Element Is Visible    css:.dashboard    10s
    Page Should Contain    Welcome

*** Test Cases ***
Valid Login Flow
    Login As User    user@test.com    password123
    Verify Dashboard Is Displayed
```

### Data-Driven Tests (Template)

```robot
*** Test Cases ***
Login With Various Users
    [Template]    Login And Verify
    admin@test.com    admin123    Dashboard
    user@test.com     pass123     Dashboard
    bad@test.com      wrong       Error

*** Keywords ***
Login And Verify
    [Arguments]    ${email}    ${password}    ${expected}
    Login As User    ${email}    ${password}
    Page Should Contain    ${expected}
```

### API Testing (RequestsLibrary)

```robot
*** Settings ***
Library    RequestsLibrary

*** Test Cases ***
Get Users Returns 200
    ${response}=    GET    ${API_URL}/users    expected_status=200
    Should Not Be Empty    ${response.json()['users']}

Create User
    ${body}=    Create Dictionary    name=Alice    email=alice@test.com
    ${response}=    POST    ${API_URL}/users    json=${body}    expected_status=201
    Should Be Equal    ${response.json()['name']}    Alice
```

### Cloud Config

```robot
*** Settings ***
Library    SeleniumLibrary

*** Variables ***
${REMOTE_URL}    https://%{LT_USERNAME}:%{LT_ACCESS_KEY}@hub.lambdatest.com/wd/hub

*** Keywords ***
Open Cloud Browser
    ${caps}=    Create Dictionary
    ...    browserName=chrome    browserVersion=latest
    ...    LT:Options=${{{"build":"Robot Build","name":"Login Test","platform":"Windows 11","video":True}}}
    Open Browser    ${BASE_URL}    remote_url=${REMOTE_URL}    desired_capabilities=${caps}
```

## Setup: `pip install robotframework robotframework-seleniumlibrary robotframework-requests`
## Run: `robot tests/` or `robot --include smoke tests/`
## Report: `report.html` and `log.html` auto-generated

## Deep Patterns

See `reference/playbook.md` for production-grade patterns:

| Section | What You Get |
|---------|-------------|
| §1 Project Setup | Project structure, variable files, execution commands, pabot |
| §2 Web UI Testing | Login tests with Page Objects, dynamic content, waits, modals |
| §3 API Testing | CRUD with RequestsLibrary, error handling, validation, auth |
| §4 Data-Driven Testing | DataDriver with CSV, FOR loops, bulk operations |
| §5 Custom Python Libraries | @keyword decorator, resource tracking, test data generation |
| §6 Browser Library | Playwright-based modern testing, network interception, responsive |
| §7 LambdaTest Integration | Remote browser config, cross-browser suite, status reporting |
| §8 CI/CD Integration | GitHub Actions with matrix strategy, pabot parallel, report merging |
| §9 Debugging Table | 12 common problems with causes and fixes |
| §10 Best Practices | 14-item Robot Framework checklist |

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
