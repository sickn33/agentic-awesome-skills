---
name: k6-load-testing
description: Comprehensive k6 load testing skill for API, browser, and scalability testing. Write realistic load scenarios, analyze results, and integrate with CI/CD.
metadata:
  aas-category: testing
  aas-risk: safe
  aas-source: community
  aas-date-added: '2026-03-13'
  aas-author: Kairo Official
  aas-tags: '["k6","load-testing","performance","api-testing","ci-cd"]'
  aas-tools: '["claude","cursor","gemini"]'
---

# k6 Load Testing

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

- Use when you need to load test HTTP APIs, WebSocket endpoints, or browser scenarios
- Use when setting up performance regression tests in CI/CD
- Use when analyzing system behavior under various load conditions
- Use when comparing performance between code changes
- Use when validating SLA requirements and performance budgets

---

## Examples

### Example 1: Basic API Load Test

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://api.example.com/users');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

### Example 2: Test with Authentication and Data Parameterization

```javascript
import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return JSON.parse(open('./users.json'));
});

export default function () {
  const user = users[__VU % users.length];
  
  const loginRes = http.post('https://api.example.com/login',
    JSON.stringify({ email: user.email, password: user.password })
  );
  
  const token = loginRes.json('access_token');
  
  const headers = { 'Authorization': `Bearer ${token}` };
  const res = http.get('https://api.example.com/profile', { headers });
  
  check(res, { 'profile loaded': (r) => r.status === 200 });
}
```

---

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
