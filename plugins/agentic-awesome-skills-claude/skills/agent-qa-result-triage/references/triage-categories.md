# Agent QA Triage Categories

Use exactly one category.

| Category | Use When | First Checks |
|---|---|---|
| `timeout` | The run or step exceeded timeout. | Run failure summary, step duration, logs. |
| `appium_startup` | Appium failed to start or acquire a mobile session. | Failure summary, execution logs, artifact runtime errors. |
| `browser_disconnect` | Browser, page, or context closed unexpectedly. | Error logs containing browser closed or target closed. |
| `element_not_found` | Locator, element, selector, or UI description was unavailable. | Failed step error, observation, screenshot, DOM/accessibility context. |
| `assertion_failure` | The app was reachable but expected content or state did not match. | Failed assert/verify step, observation, screenshot. |
| `hook_failure` | Setup, teardown, or hook execution blocked the run. | Hook logs, hook artifact sections, hook registry errors. |
| `infrastructure` | Network, Docker, farm, device, filesystem, or service dependency failed. | Execution logs, stderr, artifact runtime errors. |
| `unknown_failure` | Evidence is insufficient for a stronger category. | Missing sections and next evidence to collect. |

Always include evidence and a next action.
