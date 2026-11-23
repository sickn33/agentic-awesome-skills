# Large Language Models — Fundamentals

## What an LLM is

A Large Language Model is a neural network — almost always a **transformer** — trained to predict the next token in a sequence of text. "Token" is a sub-word unit (roughly 4 characters of English on average). Given a prefix, the model produces a probability distribution over the vocabulary for the next token, samples one, appends it, and repeats. Everything else — chat, code generation, reasoning — emerges from this single objective applied at scale.

## Why scale matters

LLM capabilities follow **scaling laws**: as you increase parameters, training data, and compute roughly together, loss decreases predictably, and qualitative new behaviors emerge at certain thresholds (instruction following, multi-step reasoning, code generation). The discovery that scaling reliably improves capability is the central empirical finding of the 2018–2023 era, and is what made the LLM industry possible.

## Training stages

Modern LLMs are trained in three broad stages:

1. **Pretraining.** Train on a massive corpus of internet-scale text using next-token prediction. The model learns grammar, facts, and patterns of reasoning implicit in the data. This is by far the most compute-intensive stage.
2. **Supervised fine-tuning (SFT).** Train on high-quality (prompt, response) pairs written or curated by humans. Teaches the model to follow instructions and adopt a useful response format.
3. **Reinforcement learning from human (or AI) feedback (RLHF / RLAIF).** Humans rank model outputs; a reward model learns the ranking; the LLM is then optimized to produce outputs the reward model scores highly. This is what makes models helpful, harmless, and honest, rather than just statistically plausible.

## Inference: how an LLM generates text

At inference time, the model produces one token at a time. Key parameters that shape the output:

- **Temperature.** Scales the logits before sampling. Low temperature (≈0) makes the model nearly deterministic; high temperature (≈1) introduces variation. For deterministic tasks (math, code), use low temperature; for creative tasks, higher.
- **Top-p (nucleus) sampling.** Restrict sampling to the smallest set of tokens whose probabilities sum to *p*. Cuts off the long tail of unlikely tokens.
- **Max tokens / stop sequences.** Bound the response length and tell the model when to stop.

## Context window and attention

The **context window** is the maximum number of tokens the model can attend to at once — its working memory. Within the window, the transformer's attention mechanism lets every token look at every other token. Costs scale roughly with the square of context length, which is why long-context models are expensive to run. Information outside the window is invisible; the model has no memory between calls unless you supply it.

## What LLMs are good at and bad at

**Good at:**
- Pattern completion in domains well-represented in training data.
- Following instructions when given clear prompts.
- Translating between formats, languages, and styles.
- Summarization, drafting, code generation, structured extraction.

**Bad at (without help):**
- **Faithfulness to facts not in context.** Models will produce confident text that is wrong — "hallucination" — especially on niche or recent topics. Grounding in retrieved documents (RAG) or tool use (search, calculators) is the standard mitigation.
- **Long-horizon planning.** Multi-step plans degrade as steps accumulate; agent frameworks and chain-of-thought prompting partially address this.
- **Exact arithmetic and counting.** They guess plausible numbers. Use tools.
- **Knowing what they don't know.** Calibration of uncertainty is weak; a model rarely says "I don't know" unless trained to.

## Prompting fundamentals

A useful prompt typically has:

1. **Role / context** — who the model is and what situation it's in.
2. **Task** — what specifically to do.
3. **Constraints** — format, length, what to avoid.
4. **Examples** (few-shot) — demonstrations of the input → output mapping when the task is unusual.

**Chain-of-thought prompting** ("think step by step") meaningfully improves reasoning on math and logic problems by letting the model generate intermediate steps before the final answer. Newer "reasoning" models internalize this and don't need the explicit instruction.

## Tool use and agents

Modern LLMs are typically wired to **tools** — callable functions that the model can request the runtime to execute. The pattern: the model emits a structured request ("call function X with these arguments"); the runtime executes; the result is appended to the context; the model continues. This is how LLMs reach beyond their training data — search, code execution, database queries, real-world actions.

An **agent** is an LLM running in a loop with tools, taking multi-step actions toward a goal. Agents amplify both capability and risk: a model that hallucinates a function call can take a wrong action in the real world. Guardrails (allowlisted tools, permission checks, output validation) are non-optional in production.

## Costs that matter

- **Inference cost** scales with input + output tokens. Long prompts, large contexts, and verbose outputs all add up.
- **Latency** depends on output tokens (each is generated sequentially) more than input tokens. For low-latency UX, stream output and prefer concise responses.
- **Quality vs. cost trade-off.** Smaller "fast" models are dramatically cheaper and lower-latency than frontier models, and often good enough for narrow tasks. Routing easy work to small models and reserving frontier models for hard work is a standard pattern.

## What this means for product decisions

- **Pick the smallest model that works**, then upgrade only when quality demands it.
- **Ground the model** in your data (RAG) before assuming it should "know" your domain.
- **Treat outputs as suggestions, not truth**, in any flow with real consequences.
- **Design for variance.** The same prompt can produce different outputs across calls; UX should make that visible and reversible rather than hidden.
- **Cache aggressively.** Identical prompts produce identical inference costs unless you cache.
