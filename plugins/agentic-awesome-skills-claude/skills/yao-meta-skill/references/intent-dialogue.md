# Intent Dialogue

Use a short, human conversation before deep authoring so the first version of the skill is anchored in the real job rather than in a guessed prompt shape.

## Why This Step Exists

- raw workflow material is often incomplete, mixed, or ambiguous
- the wrong boundary chosen early is expensive to repair later
- good trigger design depends on knowing what should not route here
- execution assets should follow confirmed outputs, not assumptions

## What To Capture

Ask only the questions that change the package design.

1. If this worked beautifully, what recurring job would it quietly take off the user's plate?
2. What real inputs would people actually hand to it?
3. What finished output should it hand back so the user can keep moving?
4. What near-neighbor requests should it politely refuse?
5. What matters most here: speed, consistency, auditability, portability, governance, or tone/style fit?
6. Are there any public or private references the user wants this skill to learn from? Only borrow patterns, never copy wording or private material.
7. What assets already exist: docs, scripts, templates, examples, or prior prompts?
8. What constraints matter: privacy, naming, local library fit, or target environments?

## Interview Rule

- prefer `5-7` sharp questions over a long discovery questionnaire
- start with a calm, human framing before switching into precise design questions
- guide like a patient teacher or thoughtful coach, not like a rigid intake clerk
- mirror the user's language and emotional temperature
- first invite a natural explanation, then offer a lightweight template only as an option
- ask boundary questions early
- ask output questions before architecture questions
- stop once the skill can be described clearly in one sentence
- do not enter deep authoring until the recurring job, target output, and exclusion boundary are clear enough to defend

## First Message Pattern

The first message should feel like guided co-creation, not form filling.

Recommended flow:

1. briefly acknowledge the user's seed idea
2. explain that you want to first understand the real recurring work and what a good outcome looks like
3. invite the user to describe it naturally in their own words
4. offer a tiny scaffold only if they want a shortcut

Good example shape:

- `Let's make this easy. Tell me what kind of repeated work you want this skill to quietly take over, what people will hand to it, and what a useful finished result should look like. If you want, I can also give you a tiny template to fill in.`

Warmer guidance:

- sound like you are sitting beside the user, helping them sort out a half-formed idea
- do not rush into system terms such as `archetype`, `gate`, or `package` in the first breath
- name the user's possible feeling: fuzzy, scattered, not fully formed, hard to describe
- make it feel safe to answer imperfectly
- offer to help extract structure after they speak naturally

Bad example shape:

- `Name:`
- `One-line capability:`
- `Real input:`
- `Target output:`

The second pattern is allowed only when the user explicitly asks for a structured template.

## Chinese First-Turn Opening Patterns

Use these as tone references when the conversation is in Chinese. Do not copy them mechanically; adapt them to the user's context and voice.

### 温柔陪伴型

适合：用户想法还比较模糊，或者需要先被接住。

示例：

- `我们先别急着定结构，你就像跟我聊天一样说说看：你最想让这个 skill 以后帮你稳稳接住哪一类重复工作？它如果做得很理想，最后应该交回你一个什么样的结果？`
- `没关系，现在不完整也可以。你先把脑子里已经有的部分告诉我，我来帮你一点点收拢成一个清晰的 skill。`
- `你可以先说个大概，比如“它以后主要帮我处理什么”、“别人通常会丢给它什么材料”、“我希望它最后产出什么”，剩下的我再陪你一起补齐。`

### 专业教练型

适合：用户目标明确，希望被高效带着走，但仍然不想面对生硬表单。

示例：

- `我们先把这件事讲清楚，再决定 skill 怎么设计。你先告诉我三件事：它最核心要接住的重复任务是什么，别人会给它什么输入，最后你希望它交付什么结果。`
- `我先不让你填模板。你先用自己的话说说：这件事做成以后，最重要的价值是什么，哪些相近请求你反而不希望它处理。`
- `先把业务和结果说清楚，结构我来替你提炼。你只要告诉我：它该做什么、不该做什么、做好以后对你有什么帮助。`

### 共创伙伴型

适合：用户有一定想法，希望一起打磨，而不是被问卷式采集。

示例：

- `我们把它当成一次共创来做。你先说说这个 skill 最值得被做出来的地方是什么，我再帮你把边界、输入和输出慢慢收成一个可复用的包。`
- `你可以先丢给我一个粗糙版本，不用一次说完整。我会先帮你看它真正的核心任务是什么，再一起决定要不要加规则、脚本或评测。`
- `如果你愿意，我们可以先从“理想中的它能帮你省掉什么麻烦”开始聊，然后再往下收敛成 skill 的能力边界。`

### Lightweight Optional Scaffold

Only offer this after the natural opening, not before.

示例：

- `如果你懒得一点点讲，我也可以给你一个很小的版本，你只填这几项就行：它最想接住的事、常见输入、理想输出、明确不做什么。`
- `如果你更习惯结构化一点，我可以把问题收成 4 行小模板；如果你想自然讲，也完全可以直接说。`

## Output

The dialogue should produce:

- one clear capability sentence
- a list of real inputs
- a list of required outputs
- a short exclusion list
- a note on user-supplied references or benchmark preferences
- one recommended archetype
- one recommended first evaluation target

## Failure Pattern

Do not continue into full authoring when the dialogue still leaves these unresolved:

- whether the request is really reusable
- which near-neighbor requests should not trigger
- what concrete deliverable the skill must return

If one of these is unresolved, ask the smallest possible follow-up that will unlock the design. Do not compensate by adding extra references, scripts, or governance.

Also treat these as dialogue failures:

- the first reply feels like a cold worksheet instead of a guided conversation
- the user is forced into a full template before the real job is understood
- the assistant asks for package structure before clarifying the desired outcome
