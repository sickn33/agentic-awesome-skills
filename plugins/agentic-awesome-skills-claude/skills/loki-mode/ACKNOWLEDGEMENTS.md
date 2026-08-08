# Acknowledgements

Loki Mode stands on the shoulders of giants. This project incorporates research, patterns, and insights from the leading AI labs, academic institutions, and practitioners in the field.

---

## Research Labs

### Anthropic

Loki Mode is built for Claude and incorporates Anthropic's cutting-edge research on AI safety and agent development.

| Paper/Resource | Contribution to Loki Mode |
|----------------|---------------------------|
| [Constitutional AI: Harmlessness from AI Feedback](https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback) | Self-critique against principles, revision workflow |
| [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) | Evaluator-optimizer pattern, parallelization, routing |
| [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices) | Explore-Plan-Code workflow, context management |
| [Simple Probes Can Catch Sleeper Agents](https://www.anthropic.com/research/probes-catch-sleeper-agents) | Defection probes, anomaly detection patterns |
| [Alignment Faking in Large Language Models](https://www.anthropic.com/research/alignment-faking) | Monitoring for strategic compliance |
| [Visible Extended Thinking](https://www.anthropic.com/research/visible-extended-thinking) | Thinking levels (think, think hard, ultrathink) |
| [Computer Use Safety](https://www.anthropic.com/news/3-5-models-and-computer-use) | Safe autonomous operation patterns |
| [Sabotage Evaluations](https://www.anthropic.com/research/sabotage-evaluations-for-frontier-models) | Safety evaluation methodology |
| [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) | One-feature-at-a-time pattern, Playwright MCP for E2E |
| [Claude Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) | Task tool, subagents, resume parameter, hooks |

### Google DeepMind

DeepMind's research on world models, hierarchical reasoning, and scalable oversight informs Loki Mode's architecture.

| Paper/Resource | Contribution to Loki Mode |
|----------------|---------------------------|
| [SIMA 2: Generalist AI Agent](https://deepmind.google/blog/sima-2-an-agent-that-plays-reasons-and-learns-with-you-in-virtual-3d-worlds/) | Self-improvement loop, reward model training |
| [Gemini Robotics 1.5](https://deepmind.google/blog/gemini-robotics-15-brings-ai-agents-into-the-physical-world/) | Hierarchical reasoning (planner + executor) |
| [Dreamer 4: World Model Training](https://danijar.com/project/dreamer4/) | Simulation-first testing, safe exploration |
| [Genie 3: World Models](https://deepmind.google/blog/genie-3-a-new-frontier-for-world-models/) | World model architecture patterns |
| [Scalable AI Safety via Doubly-Efficient Debate](https://deepmind.google/research/publications/34920/) | Debate-based verification for critical changes |
| [Human-AI Complementarity for Amplified Oversight](https://deepmindsafetyresearch.medium.com/human-ai-complementarity-a-goal-for-amplified-oversight-0ad8a44cae0a) | AI-assisted human supervision |
| [Technical AGI Safety Approach](https://arxiv.org/html/2504.01849v1) | Safety-first agent design |

### OpenAI

OpenAI's Agents SDK and deep research patterns provide foundational patterns for agent orchestration.

| Paper/Resource | Contribution to Loki Mode |
|----------------|---------------------------|
| [Agents SDK Documentation](https://openai.github.io/openai-agents-python/) | Tracing spans, guardrails, tripwires |
| [A Practical Guide to Building Agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf) | Agent architecture best practices |
| [Building Agents Track](https://developers.openai.com/tracks/building-agents/) | Development patterns, handoff callbacks |
| [AGENTS.md Specification](https://agents.md/) | Standardized agent instructions |
| [Introducing Deep Research](https://openai.com/index/introducing-deep-research/) | Adaptive planning, backtracking |
| [Deep Research System Card](https://cdn.openai.com/deep-research-system-card.pdf) | Safety considerations for research agents |
| [Introducing o3 and o4-mini](https://openai.com/index/introducing-o3-and-o4-mini/) | Reasoning model guidance |
| [Reasoning Best Practices](https://platform.openai.com/docs/guides/reasoning-best-practices) | Extended thinking patterns |
| [Chain of Thought Monitoring](https://openai.com/index/chain-of-thought-monitoring/) | Reasoning trace monitoring |
| [Agent Builder Safety](https://platform.openai.com/docs/guides/agent-builder-safety) | Safety patterns for agent builders |
| [Computer-Using Agent](https://openai.com/index/computer-using-agent/) | Computer use patterns |
| [Agentic AI Foundation](https://openai.com/index/agentic-ai-foundation/) | Industry standards, interoperability |

### Amazon Web Services (AWS)

AWS Bedrock's multi-agent collaboration patterns inform Loki Mode's routing and dispatch strategies.

| Paper/Resource | Contribution to Loki Mode |
|----------------|---------------------------|
| [Multi-Agent Orchestration Guidance](https://aws.amazon.com/solutions/guidance/multi-agent-orchestration-on-aws/) | Three coordination mechanisms, architectural patterns |
| [Bedrock Multi-Agent Collaboration](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-multi-agent-collaboration.html) | Supervisor mode, routing mode, 10-agent limit |
| [Multi-Agent Collaboration Announcement](https://aws.amazon.com/blogs/aws/introducing-multi-agent-collaboration-capability-for-amazon-bedrock/) | Intent classification, selective context sharing |
| [AgentCore for SRE](https://aws.amazon.com/blogs/machine-learning/build-multi-agent-site-reliability-engineering-assistants-with-amazon-bedrock-agentcore/) | Gateway, Memory, Identity, Observability components |

**Key Pattern Adopted:** Routing Mode Optimization - Direct dispatch for simple tasks (lower latency), supervisor orchestration for complex tasks (full coordination).

---

## Academic Research

### Multi-Agent Systems

| Paper | Authors/Source | Contribution |
|-------|----------------|--------------|
| [Multi-Agent Collaboration Mechanisms Survey](https://arxiv.org/abs/2501.06322) | arXiv 2501.06322 | Collaboration structures, coopetition |
| [CONSENSAGENT: Anti-Sycophancy Framework](https://aclanthology.org/2025.findings-acl.1141/) | ACL 2025 Findings | Blind review, devil's advocate |
| [GoalAct: Hierarchical Execution](https://arxiv.org/abs/2504.16563) | arXiv 2504.16563 | Global planning, skill decomposition |
| [A-Mem: Agentic Memory System](https://arxiv.org/html/2502.12110v11) | arXiv 2502.12110 | Zettelkasten-style memory linking |
| [Multi-Agent Reflexion (MAR)](https://arxiv.org/html/2512.20845) | arXiv 2512.20845 | Structured debate, persona-based critics |
| [Iter-VF: Iterative Verification-First](https://arxiv.org/html/2511.21734v1) | arXiv 2511.21734 | Answer-only verification, Markovian retry |

### Evaluation & Safety

| Paper | Authors/Source | Contribution |
|-------|----------------|--------------|
| [Assessment Framework for Agentic AI](https://arxiv.org/html/2512.12791v1) | arXiv 2512.12791 | Four-pillar evaluation framework |
| [Measurement Imbalance in Agentic AI](https://arxiv.org/abs/2506.02064) | arXiv 2506.02064 | Multi-dimensional evaluation axes |
| [Demo-to-Deployment Gap](https://www.marktechpost.com/2025/12/24/) | Stanford/Harvard | Tool reliability vs tool selection |

---

## Industry Resources

### Tools & Frameworks

| Resource | Contribution |
|----------|--------------|
| [NVIDIA ToolOrchestra](https://github.com/NVlabs/ToolOrchestra) | Efficiency metrics, three-reward signal framework, dynamic agent selection |
| [LerianStudio/ring](https://github.com/LerianStudio/ring) | Subagent-driven-development pattern |
| [Awesome Agentic Patterns](https://github.com/nibzard/awesome-agentic-patterns) | 105+ production patterns catalog |

### Best Practices Guides

| Resource | Contribution |
|----------|--------------|
| [Maxim AI: Production Multi-Agent Systems](https://www.getmaxim.ai/articles/best-practices-for-building-production-ready-multi-agent-systems/) | Correlation IDs, failure handling |
| [UiPath: Agent Builder Best Practices](https://www.uipath.com/blog/ai/agent-builder-best-practices) | Single-responsibility agents |
| [GitHub: Speed Without Control](https://github.blog/) | Static analysis + AI review, guardrails |

---

## Hacker News Community

Battle-tested insights from practitioners deploying agents in production.

### Discussions

| Thread | Key Insight |
|--------|-------------|
| [What Actually Works in Production for Autonomous Agents](https://news.ycombinator.com/item?id=44623207) | "Zero companies without human in the loop" |
| [Coding with LLMs in Summer 2025](https://news.ycombinator.com/item?id=44623953) | Context curation beats automatic RAG |
| [Superpowers: How I'm Using Coding Agents](https://news.ycombinator.com/item?id=45547344) | Sub-agents for context isolation (Simon Willison) |
| [Claude Code Experience After Two Weeks](https://news.ycombinator.com/item?id=44596472) | Fresh contexts yield better results |
| [AI Agent Benchmarks Are Broken](https://news.ycombinator.com/item?id=44531697) | LLM-as-judge has shared blind spots |
| [How to Orchestrate Multi-Agent Workflows](https://news.ycombinator.com/item?id=45955997) | Event-driven, decoupled coordination |
| [Context Engineering vs Prompt Engineering](https://news.ycombinator.com/item?id=44427757) | Manual context selection principles |

### Show HN Projects

| Project | Contribution |
|---------|--------------|
| [Self-Evolving Agents Repository](https://news.ycombinator.com/item?id=45099226) | Self-improvement patterns |
| [Package Manager for Agent Skills](https://news.ycombinator.com/item?id=46422264) | Skills architecture |
| [Wispbit - AI Code Review Agent](https://news.ycombinator.com/item?id=44722603) | Code review patterns |
| [Agtrace - Monitoring for AI Coding Agents](https://news.ycombinator.com/item?id=46425670) | Agent monitoring patterns |

---

## Individual Contributors

Special thanks to thought leaders whose patterns and insights shaped Loki Mode:

| Contributor | Contribution |
|-------------|--------------|
| **Boris Cherny** (Creator of Claude Code) | Self-verification loop (2-3x quality improvement), extended thinking mode, "Less prompting, more systems" philosophy |
| **Ivan Steshov** | Centralized constitution, agent lineage tracking, structured artifacts as contracts |
| **Addy Osmani** | Git checkpoint system, specification-first approach, visual aids (Mermaid diagrams) |
| **Simon Willison** | Sub-agents for context isolation, skills system, context curation patterns |

---

## Production Patterns Summary

Key patterns incorporated from practitioner experience:

| Pattern | Source | Implementation |
|---------|--------|----------------|
| Human-in-the-Loop (HITL) | HN Production Discussions | Confidence-based escalation thresholds |
| Narrow Scope (3-5 steps) | Multiple Practitioners | Task scope constraints |
| Deterministic Validation | Production Teams | Rule-based outer loops (not LLM-judged) |
| Context Curation | Simon Willison | Manual selection, focused context |
| Blind Review + Devil's Advocate | CONSENSAGENT | Anti-sycophancy protocol |
| Hierarchical Reasoning | DeepMind Gemini | Orchestrator + specialized executors |
| Constitutional Self-Critique | Anthropic | Principles-based revision |
| Debate Verification | DeepMind | Critical change verification |
| One Feature at a Time | Anthropic Harness | Single feature per iteration, full verification |
| E2E Browser Testing | Anthropic Harness | Playwright MCP for visual verification |

---

## License

This acknowledgements file documents the research and resources that influenced Loki Mode's design. All referenced works retain their original licenses and copyrights.

Loki Mode itself is released under the MIT License.

---

*Last updated: v2.35.0*
