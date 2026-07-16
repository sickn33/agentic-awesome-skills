# Actor Standby Mode Reference

## JavaScript and TypeScript

- **NEVER disable standby mode (`usesStandbyMode: false`) in `.actor/actor.json` without explicit permission** - Actor Standby mode solves this problem by letting you have the Actor ready in the background, waiting for the incoming HTTP requests. In a sense, the Actor behaves like a real-time web server or standard API server instead of running the logic once to process everything in batch. Always keep `usesStandbyMode: true` unless there is a specific documented reason to disable it
- **ALWAYS implement readiness probe handler for standby Actors** - Handle the `x-apify-container-server-readiness-probe` header at GET / endpoint to ensure proper Actor lifecycle management

You can recognize a standby Actor by checking the `usesStandbyMode` property in `.actor/actor.json`. Only implement the readiness probe if this property is set to `true`.

### Readiness Probe Implementation Example

```javascript
// Apify standby readiness probe at root path
app.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    if (req.headers['x-apify-container-server-readiness-probe']) {
        res.end('Readiness probe OK\n');
    } else {
        res.end('Actor is ready\n');
    }
});
```

Key points:

- Detect the `x-apify-container-server-readiness-probe` header in incoming requests
- Respond with HTTP 200 status code for both readiness probe and normal requests
- This enables proper Actor lifecycle management in standby mode

## Python

- **NEVER disable standby mode (`usesStandbyMode: false`) in `.actor/actor.json` without explicit permission** - Actor Standby mode solves this problem by letting you have the Actor ready in the background, waiting for the incoming HTTP requests. In a sense, the Actor behaves like a real-time web server or standard API server instead of running the logic once to process everything in batch. Always keep `usesStandbyMode: true` unless there is a specific documented reason to disable it
- **ALWAYS implement readiness probe handler for standby Actors** - Handle the `x-apify-container-server-readiness-probe` header at GET / endpoint to ensure proper Actor lifecycle management

You can recognize a standby Actor by checking the `usesStandbyMode` property in `.actor/actor.json`. Only implement the readiness probe if this property is set to `true`.

### Readiness Probe Implementation Example

```python
# Apify standby readiness probe
from http.server import SimpleHTTPRequestHandler

class GetHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Handle Apify standby readiness probe
        if 'x-apify-container-server-readiness-probe' in self.headers:
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'Readiness probe OK')
            return

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'Actor is ready')
```

Key points:

- Detect the `x-apify-container-server-readiness-probe` header in incoming requests
- Respond with HTTP 200 status code for both readiness probe and normal requests
- This enables proper Actor lifecycle management in standby mode
