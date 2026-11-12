# k6 Load Testing - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

Examples are independent version-pinned fragments, not a complete load suite. Choose duration/vus or staged/scenario scheduling rather than conflicting options. Cloud zone IDs and historical latency tables are illustrative; validate current supported configuration and actual SLOs. Raw output may include URLs/tags; redact secrets and bound artifacts. A load run is evidence under its workload, not SLA certification.

## Overview

k6 is a modern, developer-centric load testing tool that helps you write and execute performance tests for HTTP APIs, WebSocket endpoints, and browser scenarios. This skill provides comprehensive guidance on writing realistic load tests, configuring test scenarios (smoke, load, stress, spike, soak), analyzing results, and integrating with CI/CD pipelines.

Use this skill when you need to validate system performance, identify bottlenecks, ensure SLA compliance, or catch performance regressions before deployment.

---


## k6 Basics

### Installation

```bash
# macOS
brew install k6

# Windows
choco install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Quick Start

```javascript
// simple-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const res = http.get('https://httpbin.test.k6.io/get');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

Run with: `k6 run simple-test.js`

---


## Test Configuration

### Common Options

```javascript
export const options = {
  // Ramping scenario shortcut; do not combine stages with vus/duration.
  // For a constant test, replace stages with vus: 100, duration: "5m".
  stages: [
    { duration: '30s', target: 20 },   // Ramp up
    { duration: '1m', target: 100 },  // Stay at 100
    { duration: '30s', target: 0 },    // Ramp down
  ],

  // Thresholds (SLA)
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% requests < 500ms
    http_req_failed: ['rate<0.01'],     // Error rate < 1%
  },

  // Configure account-approved Grafana Cloud load zones separately using the
  // installed k6 version’s cloud schema; no hardcoded unverified zone IDs here.

};
```

### Test Types

| Type | Use Case | Configuration |
|------|----------|---------------|
| Smoke Test | Verify basic functionality | Low VUs (1-5), short duration |
| Load Test | Normal expected load | Target VUs based on traffic |
| Stress Test | Find breaking point | Ramp beyond capacity |
| Spike Test | Sudden traffic spikes | Rapid increase/decrease |
| Soak Test | Long-term stability | Extended duration |

---


## HTTP Testing

### Basic Requests

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export default function () {
  // GET request
  const getRes = http.get('https://api.example.com/users');

  check(getRes, {
    'GET succeeded': (r) => r.status === 200,
    'has users': (r) => r.json('data.length') > 0,
  });

  // POST request with JSON body
  const postRes = http.post('https://api.example.com/users',
    JSON.stringify({ name: 'Test User', email: 'test@example.com' }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + __ENV.API_TOKEN,
      },
    }
  );

  check(postRes, {
    'POST succeeded': (r) => r.status === 201,
    'user created': (r) => r.json('id') !== undefined,
  });

  sleep(1);
}
```

### Request Chaining

```javascript
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  // Login and extract token
  const loginRes = http.post('https://api.example.com/login',
    JSON.stringify({ email: __ENV.TEST_EMAIL, password: __ENV.TEST_PASSWORD }),
    {headers: {'Content-Type': 'application/json'}, timeout: '10s', redirects: 0}
  );

  if (!check(loginRes, {'login succeeded': r => r.status === 200})) return;
  let token;
  try { token = loginRes.json('access_token'); } catch (_) { return; }
  if (typeof token !== 'string' || !token) return;

  // Use token in subsequent requests
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const profileRes = http.get('https://api.example.com/profile', {
    headers: headers,
  });

  check(profileRes, {
    'profile loaded': (r) => r.status === 200,
  });
}
```

### Parameterized Testing

```javascript
import http from 'k6/http';
import { check } from 'k6';

const usernames = ['user1', 'user2', 'user3', 'user4', 'user5'];

export default function () {
  // Use shared array with VU-specific index
  const username = usernames[__VU % usernames.length];

  const res = http.get(`https://api.example.com/users/${username}`);

  check(res, {
    'user found': (r) => r.status === 200,
  });
}
```

---


## Browser Testing (k6 Browser)

```javascript
import { browser } from 'k6/browser';

export const options = {
  scenarios: {
    browser_test: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      options: { browser: { type: 'chromium' } },
    },
  },
};

export default async function () {
  const page = await browser.newPage();

  try {
    await page.goto('https://example.com');

    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Click and interact
    await page.locator('button[data-testid="submit"]').click();

    // Wait for response
    await page.locator('.success-message').waitFor({state: 'visible'});

  } finally {
    await page.close();
  }
}
```

Install a supported Chromium browser through the approved OS package manager; k6 install chromium is not a k6 command. Configure K6_BROWSER_EXECUTABLE_PATH when needed.

---


## WebSocket Testing

```javascript
import ws from 'k6/ws';
import { check } from 'k6';

export default function () {
  const url = 'wss://echo.websocket.org';

  ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      console.log('WebSocket connected');
      socket.send('Hello WebSocket');
    });

    socket.on('message', (data) => {
      console.log(`Received: ${data}`);
      check(data, {
        'echo received': (d) => d.includes('Hello'),
      });
    });

    socket.on('close', () => {
      console.log('WebSocket closed');
    });

    // Send periodic messages
    socket.setInterval(function () {
      socket.send('ping');
    }, 1000);

    // Close after 5 seconds
    socket.setTimeout(function () {
      socket.close();
    }, 5000);
  });
}
```

---


## Data Handling

### CSV Data Source

```javascript
import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

// Option 1: Load once, shared across VUs
const users = new SharedArray('users', function () {
  // Restricted fixture CSV: no quoted commas/newlines; use a real CSV parser for general CSV.
  return open('./users.csv').trim().split(/\r?\n/).slice(1).filter(Boolean).map(line => {
    const [email, password] = line.split(',');
    return { email, password };
  });
});

export default function () {
  const user = users[__VU % users.length];

  const res = http.post('https://api.example.com/login',
    JSON.stringify({ email: user.email, password: user.password }),
    {headers: {'Content-Type': 'application/json'}, timeout: '10s', redirects: 0}
  );

  check(res, { 'login successful': (r) => r.status === 200 });
}
```

### JSON Data Source

```javascript
import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const products = new SharedArray('products', function () {
  return JSON.parse(open('./products.json'));
});

export default function () {
  const product = products[Math.floor(Math.random() * products.length)];

  const res = http.get(`https://api.example.com/products/${product.id}`);

  check(res, { 'product found': (r) => r.status === 200 });
}
```

---


## Thresholds & SLA

### Basic Thresholds

```javascript
export const options = {
  vus: 50,
  duration: '2m',

  thresholds: {
    // Response time thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1000'],

    // Error rate threshold
    http_req_failed: ['rate<0.01'],

    // Throughput threshold
    http_reqs: ['rate>100'],
  },
};
```

### Advanced Thresholds

```javascript
export const options = {
  thresholds: {
    // Multiple thresholds on same metric
    http_req_duration: [
      'p(90)<300',   // 90th percentile < 300ms
      'p(95)<500',  // 95th percentile < 500ms
      'p(99)<1000', // 99th percentile < 1s
      'avg<200',    // average < 200ms
    ],

    // Custom metrics
    // Define and record a custom Trend before asserting its name.

    // Evaluate threshold; add abortOnFail explicitly to stop early
    'http_req_duration{method:GET}': [{threshold: 'p(95)<300', abortOnFail: true, delayAbortEval: '10s'}],
  },
};
```

---


## Custom Metrics

### Counters

```javascript
import http from 'k6/http';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';

// Define custom metrics
const myCounter = new Counter('api_calls_total');
const responseTime = new Trend('response_time');
const errorRate = new Rate('error_rate');
const activeUsers = new Gauge('active_users');

export default function () {
  const res = http.get('https://api.example.com/data');

  // Increment counter
  myCounter.add(1);

  // Add to trend (for percentiles)
  responseTime.add(res.timings.duration);

  // Track error rate
  errorRate.add(res.status !== 200);

  // Set gauge value
  activeUsers.add(__VU);

  // Tagged metrics
  const taggedRes = http.get('https://api.example.com/users', {
    tags: { endpoint: 'users', env: 'prod' },
  });
}
```

---


## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/load-test.yml
name: Load Tests

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup k6
        uses: grafana/setup-k6-action@v1 # Pin a reviewed commit for deployment

      - name: Run load test
        env:
          API_TOKEN: ${{ secrets.API_TOKEN }}
        run: k6 run --out json=results.json load-test.js

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: results.json

      - name: Check thresholds
        if: failure()
        run: |
          echo "Load test failed thresholds!"
          exit 1
```

### GitLab CI

```yaml
# .gitlab-ci.yml
load_test:
  image: grafana/k6:latest
  script:
    - k6 run --out json=results.json load-test.js
  artifacts:
    when: always
    paths:
      - results.json
    # No JUnit file is produced by this script; add a reviewed summary exporter before declaring one.
```

---


## Results Analysis

### Built-in Reports

```bash
# Text summary
k6 run load-test.js

# JSON output for parsing
k6 run --out json=results.json load-test.js

# InfluxDB + Grafana
k6 run --out influxdb=http://localhost:8086/k6 load-test.js

# Prometheus remote write
K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write k6 run --out experimental-prometheus-rw load-test.js

# Cloud results
k6 run --out cloud load-test.js
```

### Interpreting Results

| Metric | Description | Good | Warning | Bad |
|--------|-------------|------|---------|-----|
| http_req_duration (p95) | 95% response time | < 300ms | 300-500ms | > 500ms |
| http_req_failed | Error rate | < 0.1% | 0.1-1% | > 1% |
| http_reqs | Requests/sec | Meeting target | Near limit | At limit |
| vus | Virtual users | Stable | Gradual increase | Unexpected spike |

---


## Best Practices

- **Start with smoke test**: Verify test works with 1-5 VUs before scaling up
- **Use realistic data**: Use synthetic test identities with realistic distributions, never production passwords or personal data
- **Set meaningful thresholds**: Match your SLA and business requirements
- **Warm up systems**: Include ramp-up time in stages
- **Monitor external dependencies**: Track not just your APIs but downstream services
- **Use tags**: Tag requests for granular analysis (`tags: { endpoint: 'users' }`)
- **Keep tests focused**: One test file per scenario for clarity

---


## Common Pitfalls

- **Problem:** Tests pass locally but fail in CI
  **Solution:** Ensure CI environment has similar resources and network conditions

- **Problem:** Inconsistent results between runs
  **Solution:** Check for external dependencies, random data, or test data pollution

- **Problem:** k6 runs out of memory
  **Solution:** Use SharedArray, discard unnecessary response bodies, bound result output and reduce VUs; no generic --max-memory k6 flag is established here

- **Problem:** Thresholds too strict
  **Solution:** Start with relaxed thresholds, tighten based on historical data

---


## Related Skills

- `@performance-engineer` - For broader performance optimization
- `@api-testing-observability-api-mock` - For API mocking during testing
- `@application-performance-performance-optimization` - For performance optimization

---


## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://github.com/grafana/k6/tree/master/examples)
- [k6 Load Testing Guides](https://k6.io/guides/)
- [k6 Cloud](https://k6.io/cloud/)
