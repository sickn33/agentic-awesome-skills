---
name: developer-sandbox
description: 'Design and build interactive playgrounds that let developers experience your product without commitment. This skill covers playground architecture, pre-populated examples, embedding strategies, gating decisions, and converting playground users to signups. Trigger phrases: "developer...'
risk: unknown
source: https://github.com/jonathimer/devmarketing-skills/tree/main/skills/developer-sandbox
source_repo: jonathimer/devmarketing-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/jonathimer/devmarketing-skills/blob/main/LICENSE
---

# Interactive Playgrounds and Demo Environments
## When to Use

Use this skill when you need design and build interactive playgrounds that let developers experience your product without commitment. This skill covers playground architecture, pre-populated examples, embedding strategies, gating decisions, and converting playground users to signups. Trigger phrases: "developer...


Let developers experience your product before they commit. A great playground removes the biggest barrier to adoption: uncertainty about whether your product solves their problem.

## Overview

Developer playgrounds serve multiple purposes:
- **Evaluation**: Let developers test before investing setup time
- **Learning**: Interactive environment for understanding concepts
- **Marketing**: Demonstrate capabilities without sales calls
- **Support**: Reproducible environment for debugging issues

This skill covers designing playgrounds that convert curious visitors into active users.

## Before You Start

Review the **developer-audience-context** skill to understand:
- What do developers want to validate before signing up?
- What's the typical evaluation workflow in your space?
- What competing products offer playgrounds?
- What's the minimum viable experience that demonstrates value?

Your playground should answer the questions developers have when evaluating.

## Playground Design Principles

### Principle 1: Instant Gratification

Developers should see something meaningful within 10 seconds of landing.

**Good**: Page loads with a working example already running
**Bad**: Empty editor with "Type your code here" placeholder

```html
<!-- Good: Pre-loaded, running example -->
<div class="playground">
  <div class="editor">
    <pre><code>// Analyze sentiment of this text
const result = await api.analyze("I love this product!");
console.log(result.sentiment); // "positive"</code></pre>
  </div>
  <div class="output">
    <pre>{ "sentiment": "positive", "confidence": 0.94 }</pre>
  </div>
  <button class="run-btn">Run ▶️</button>
</div>
```

### Principle 2: Progressive Complexity

Start simple, let developers go deeper as curiosity grows.

**Level 1: One-Click Demo**
```
[Analyze Text] → See result immediately
```

**Level 2: Editable Input**
```
[Edit the text] → [Run] → See result
```

**Level 3: Full API Access**
```
Edit code → Modify parameters → See raw request/response
```

**Level 4: Full Playground**
```
Multiple files → Import SDK → Build mini-app
```

### Principle 3: Real API, Real Results

Never fake the results. Use your actual API with sandbox credentials.

**Why real matters:**
- Builds trust (not a demo, but actual product)
- Shows real performance characteristics
- Demonstrates actual error handling
- No surprises when they sign up

### Principle 4: Zero Friction

No signup required for basic playground. No installation. No configuration.

```
❌ Bad: "Sign up to try the playground"
❌ Bad: "Install our CLI to continue"
❌ Bad: "Configure your environment..."

✅ Good: Works immediately in browser
```

## Pre-Populated Examples

### Example Selection Strategy

Choose examples that:
1. **Show core value** in 30 seconds
2. **Solve real problems** developers have
3. **Demonstrate differentiation** from competitors
4. **Scale in complexity** from simple to advanced

### Example Categories

**"Hello World" Example**
- Simplest possible use of your API
- Should work with zero modification
- Proves the system is working

```javascript
// Example: Text Analysis API
const result = await api.analyze("Hello, world!");
// Output: { words: 2, characters: 13 }
```

**"Aha Moment" Example**
- Shows unique capability of your product
- Creates the "wow, that was easy" reaction
- This is your most important example

```javascript
// Example: Shows AI doing something impressive
const result = await api.summarize(longArticle);
// Output: A perfect 3-sentence summary
```

**"Real Use Case" Examples**
- Actual scenarios developers encounter
- Shows how to solve specific problems
- Multiple examples for different use cases

```javascript
// Example 1: E-commerce - Analyze product reviews
// Example 2: Support - Classify incoming tickets
// Example 3: Social - Detect spam comments
```

**"Integration" Examples**
- Shows product working with popular tools
- Addresses "will this work with my stack?" concern

```javascript
// Example: Integration with Express.js
app.post('/analyze', async (req, res) => {
  const result = await api.analyze(req.body.text);
  res.json(result);
});
```

### Example Quality Checklist

- [ ] Example runs without modification
- [ ] Output is interesting/impressive
- [ ] Code follows language best practices
- [ ] Comments explain what's happening
- [ ] Real-world use case is obvious
- [ ] Leads to natural "what else can it do?" curiosity

## Sharing and Embedding

### Shareable Playground URLs

Enable developers to share their playground state:

```
https://playground.example.com/?code=BASE64_ENCODED_CODE
https://playground.example.com/share/abc123 (stored state)
```

**Use Cases:**
- Sharing code with teammates
- Linking from Stack Overflow answers
- Bug reports with reproduction
- Code snippets in blog posts

### Embeddable Playgrounds

Let developers embed playgrounds in their own content:

```html
<!-- Embed in documentation -->
<iframe
  src="https://playground.example.com/embed/quickstart"
  width="100%"
  height="400px"
></iframe>

<!-- Or via script tag -->
<div class="example-playground" data-example="quickstart"></div>
<script src="https://playground.example.com/embed.js"></script>
```

### Embedding Considerations

**Size and Performance:**
- Lightweight embed script (< 50KB)
- Lazy-load playground until visible
- Responsive width, configurable height

**Customization:**
- Theme options (light/dark, match host site)
- Show/hide specific UI elements
- Read-only vs. editable modes

**Attribution:**
- Subtle branding that links back
- "Powered by [Product]" footer
- "Edit in full playground" link

## Gating vs. Ungating

### When to Keep Ungated

**Ungated** (no signup required) when:
- Developers are evaluating whether to adopt
- Example demonstrates core product value
- Rate limits can prevent abuse
- Goal is top-of-funnel awareness

### When to Gate

**Gated** (require signup) when:
- Using production API resources
- Accessing personal/saved playgrounds
- Advanced features that require account
- Generating API keys for external use

### Progressive Gating Strategy

```
┌─────────────────────────────────────────────────────────┐
│ UNGATED                                                  │
│ • Run pre-built examples                                │
│ • Edit and re-run examples                              │
│ • Share playground URLs                                 │
├─────────────────────────────────────────────────────────┤
│ FREE SIGNUP                                             │
│ • Save playgrounds                                      │
│ • Get API key for external use                         │
│ • Access more examples                                  │
│ • Higher rate limits                                    │
├─────────────────────────────────────────────────────────┤
│ PAID                                                    │
│ • Production API access                                 │
│ • Team features                                         │
│ • Premium models/features                               │
└─────────────────────────────────────────────────────────┘
```

### Gating UX

When you do gate, minimize friction:

```html
<!-- Good: Non-blocking gate -->
<div class="save-prompt">
  <p>Want to save this playground?</p>
  <button onclick="signup()">Create free account</button>
  <button onclick="dismiss()">Continue without saving</button>
</div>

<!-- Bad: Blocking gate -->
<div class="modal">
  <p>Sign up to continue using the playground</p>
  <form><!-- required fields --></form>
</div>
```

## Playground to Signup Conversion

### The Conversion Funnel

```
Playground Visit
      ↓
Runs First Example (Time to first interaction)
      ↓
Modifies Example (Engagement)
      ↓
Explores More Examples (Interest)
      ↓
Hits Limitation (Trigger)
      ↓
Signs Up (Conversion)
```

### Designing Conversion Triggers

**Natural limitations** that encourage signup:

```javascript
// Rate limit message
"You've used 10/10 free playground requests today.
 Sign up for 1,000 free requests/month."

// Feature tease
"This example uses our Pro model.
 Sign up to try it free."

// Save prompt
"Your playground session will expire in 30 minutes.
 Create an account to save your work."
```

**Avoid artificial friction:**
```javascript
// Bad: Arbitrary block
"Sign up to run more than 3 examples"

// Bad: Feature that should be free
"Sign up to see request/response details"
```

### Conversion Best Practices

**Clear value proposition:**
```
┌─────────────────────────────────────────┐
│ Create a free account                   │
│                                         │
│ ✓ Get your own API key                 │
│ ✓ Save and share playgrounds           │
│ ✓ 1,000 free API calls/month           │
│                                         │
│ [Sign up with GitHub]                   │
│ [Sign up with Google]                   │
│ [Sign up with email]                    │
└─────────────────────────────────────────┘
```

**Preserve context:**
- After signup, return to the same playground state
- Pre-populate API key in their code
- Show "Next steps" relevant to what they were doing

**Measure the funnel:**
```javascript
analytics.track('playground_visit');
analytics.track('playground_first_run');
analytics.track('playground_code_edit');
analytics.track('playground_signup_prompt_shown');
analytics.track('playground_signup_started');
analytics.track('playground_signup_completed');
```

## Playground Architecture

### Client-Side Playgrounds

**Best for:**
- JavaScript/TypeScript SDKs
- Browser-based APIs
- When latency matters

**Architecture:**
```
┌──────────────────────────────────────────┐
│ Browser                                  │
│  ┌─────────────┐    ┌────────────────┐ │
│  │ Monaco      │    │ Preview/Output │ │
│  │ Editor      │ →  │ Iframe        │ │
│  └─────────────┘    └────────────────┘ │
│         ↓                    ↓          │
│  Bundler (esbuild-wasm) → Execute       │
│                              ↓          │
│                        Your API         │
└──────────────────────────────────────────┘
```

### Server-Side Playgrounds

**Best for:**
- Python, Go, Ruby, etc.
- When isolation is critical
- Complex dependencies

**Architecture:**
```
┌────────────────────────────────────────────────┐
│ Browser                                        │
│  ┌─────────────┐    ┌────────────────────┐   │
│  │ Editor      │    │ Output             │   │
│  └─────────────┘    └────────────────────┘   │
│         ↓                    ↑                │
└─────────│────────────────────│────────────────┘
          │                    │
          ↓                    │
   ┌──────────────────────────────────────┐
   │ Backend                              │
   │  ┌────────────┐    ┌─────────────┐ │
   │  │ Code       │ →  │ Sandbox     │ │
   │  │ Receiver   │    │ Container   │ │
   │  └────────────┘    └─────────────┘ │
   └──────────────────────────────────────┘
```

### Security Considerations

**Sandbox isolation:**
- Execute user code in containers
- Limit CPU, memory, network
- No filesystem access to host
- Kill runaway processes

**API protection:**
- Rate limiting per IP/session
- Sandbox-only API credentials
- Monitor for abuse patterns

**Content safety:**
- Scan generated content
- Block malicious outputs
- Log for audit

## Playground UX Components

### Essential UI Elements

```
┌─────────────────────────────────────────────────────────────┐
│ [Examples ▼] [Docs] [Share] [Sign Up]                       │
├───────────────────────────────┬─────────────────────────────┤
│                               │                             │
│  // Your code here            │  Output                     │
│  const result = await         │  {                         │
│    api.analyze("Hello");      │    "sentiment": "neutral"  │
│                               │  }                         │
│                               │                             │
│                               │                             │
├───────────────────────────────┴─────────────────────────────┤
│ [▶ Run]  [Reset]  [Copy Code]  [Copy as cURL]              │
└─────────────────────────────────────────────────────────────┘
```

### Editor Features

- Syntax highlighting
- Autocomplete for SDK methods
- Error highlighting
- Line numbers
- Multiple file support (advanced)

### Output Features

- Formatted JSON
- Collapsible nested objects
- Copy output button
- Request/response toggle
- Timing information

## Tools

### Code Editors
- **Monaco Editor**: VS Code's editor (feature-rich)
- **CodeMirror**: Lightweight, extensible
- **Ace Editor**: Long-standing, battle-tested

### Sandboxing
- **Firecracker**: Lightweight VMs
- **gVisor**: Container sandboxing
- **WebContainers**: Browser-based Node.js

### Playground Platforms
- **CodeSandbox**: Full development environments
- **StackBlitz**: WebContainer-based
- **Replit**: Multi-language support
- **Custom**: Build your own for control

### Embedding
- **iframes**: Simple but limited
- **Web Components**: Better isolation
- **Script embeds**: Most flexible

## Related Skills

- **api-onboarding**: Playground as onboarding tool
- **docs-as-marketing**: Interactive examples in documentation
- **sdk-dx**: SDK design that works in playground context
- **developer-metrics**: Measuring playground effectiveness
- **developer-audience-context**: Understanding what to demo

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
