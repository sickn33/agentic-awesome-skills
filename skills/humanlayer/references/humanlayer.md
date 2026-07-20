# HumanLayer SDK Documentation

🚧 **Note**: This documentation covers the HumanLayer SDK which is being superseded by CodeLayer. For the latest IDE experience, see the main README. 🚧

The humanlayer sdks were removed in [#646](https://github.com/humanlayer/humanlayer/pull/646)

## Table of contents

- [Getting Started](#getting-started)
- [Why HumanLayer?](#why-humanlayer)
- [Key Features](#key-features)
- [Examples](#examples)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Why HumanLayer?

Functions and tools are a key part of [Agentic Workflows](https://www.deeplearning.ai/the-batch/how-agents-can-improve-llm-performance). They enable LLMs to interact meaningfully with the outside world and automate broad scopes of impactful work. Correct and accurate function calling is essential for AI agents that do meaningful things like book appointments, interact with customers, manage billing information, write+execute code, and more.

[![Tool Calling Loop from Louis Dupont](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*r8rEqjGZs_e6dibWeaqaQg.png)](https://louis-dupont.medium.com/transforming-software-interactions-with-tool-calling-and-llms-dc39185247e9)
_From https://louis-dupont.medium.com/transforming-software-interactions-with-tool-calling-and-llms-dc39185247e9_

**However**, the most useful functions we can give to an LLM are also the most risky. We can all imagine the value of an AI Database Administrator that constantly tunes and refactors our SQL database, but most teams wouldn't give an LLM access to run arbitrary SQL statements against a production database (heck, we mostly don't even let humans do that). That is:

<div align="center">
<h3><blockquote>Even with state-of-the-art agentic reasoning and prompt routing, LLMs are not sufficiently reliable to be given access to high-stakes functions without human oversight</blockquote></h3>
</div>

To better define what is meant by "high stakes", some examples:

- **Low Stakes**: Read Access to public data (e.g. search wikipedia, access public APIs and DataSets)
- **Low Stakes**: Communicate with agent author (e.g. an engineer might empower an agent to send them a private Slack message with updates on progress)
- **Medium Stakes**: Read Access to Private Data (e.g. read emails, access calendars, query a CRM)
- **Medium Stakes**: Communicate with strict rules (e.g. sending based on a specific sequence of hard-coded email templates)
- **High Stakes**: Communicate on my Behalf or on behalf of my Company (e.g. send emails, post to slack, publish social/blog content)
- **High Stakes**: Write Access to Private Data (e.g. update CRM records, modify feature toggles, update billing information)

<div align="center"><img style="width: 600px" alt="Image showing the levels of function stakes stacked on top of one another" src="./docs/images/function_stakes.png"></div>

The high stakes functions are the ones that are the most valuable and promise the most impact in automating away human workflows. But they are also the ones where "90% accuracy" is not acceptable. Reliability is further impacted by today's LLMs' tendency to hallucinate or craft low-quality text that is clearly AI generated. The sooner teams can get Agents reliably and safely calling these tools with high-quality inputs, the sooner they can reap massive benefits.

HumanLayer provides a set of tools to _deterministically_ guarantee human oversight of high stakes function calls. Even if the LLM makes a mistake or hallucinates, HumanLayer is baked into the tool/function itself, guaranteeing a human in the loop.

<div align="center"><img style="width: 400px" alt="HumanLayer @require_approval decorator wrapping the Commnicate on my behalf function" src="./docs/images/humanlayer_require_approval.png"></div>

<div align="center">
<h3><blockquote>
HumanLayer provides a set of tools to *deterministically* guarantee human oversight of high stakes function calls
</blockquote></h3>
</div>

### The Future: Autonomous Agents and the "Outer Loop"

_Read More: [OpenAI's RealTime API is a step towards outer-loop agents](https://theouterloop.substack.com/p/openais-realtime-api-is-a-step-towards)_

Between `require_approval` and `human_as_tool`, HumanLayer is built to empower the next generation of AI agents - Autonomous Agents, but it's just a piece of the puzzle. To clarify "next generation", we can summarize briefly the history of LLM applications.

- **Gen 1**: Chat - human-initiated question / response interface
- **Gen 2**: Agentic Assistants - frameworks drive prompt routing, tool calling, chain of thought, and context window management to get much more reliability and functionality. Most workflows are initiated by humans in single-shot "here's a task, go do it" or rolling chat interfaces.
- **Gen 3**: Autonomous Agents - no longer human initiated, agents will live in the "outer loop" driving toward their goals using various tools and functions. Human/Agent communication is Agent-initiated rather than human-initiated.

![gen2 vs gen 3 agents](./docs/images/gen-2-gen-3-agents.png)

Gen 3 autonomous agents will need ways to consult humans for input on various tasks. In order for these agents to perform actual useful work, they'll need human oversight for sensitive operations.

These agents will require ways to contact one or more humans across various channels including chat, email, sms, and more.

While early versions of these agents may technically be "human initiated" in that they get kicked off on a regular schedule by e.g. a cron or similar, the best ones will be managing their own scheduling and costs. This will require toolkits for inspecting costs and something akin to `sleep_until`. They'll need to run in orchestration frameworks that can durably serialize and resume agent workflows across tool calls that might not return for hours or days. These frameworks will need to support context window management by a "manager LLM" and enable agents to fork sub-chains to handle specialized tasks and roles.

Example use cases for these outer loop agents include [the linkedin inbox assistant](./examples/langchain/04-human_as_tool_linkedin.py) and [the customer onboarding assistant](./examples/langchain/05-approvals_and_humans_composite.py), but that's really just scratching the surface.

## Development Conventions

### TODO Annotations

We use a priority-based TODO annotation system throughout the codebase:

- `TODO(0)`: Critical - never merge
- `TODO(1)`: High - architectural flaws, major bugs
- `TODO(2)`: Medium - minor bugs, missing features
- `TODO(3)`: Low - polish, tests, documentation
- `TODO(4)`: Questions/investigations needed
- `PERF`: Performance optimization opportunities

## Contributing

The HumanLayer SDK and docs are open-source and we welcome contributions in the form of issues, documentation, pull requests, and more. See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

## License

The HumanLayer SDK and CodeLayer sources in this repo are licensed under the Apache 2 License.
