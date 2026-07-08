---
name: prompt-library
description: "A comprehensive collection of battle-tested prompts inspired by [awesome-chatgpt-prompts](https://github.com/f/awesome-chatgpt-prompts) and community best practices."
risk: unknown
source: community
date_added: "2026-02-27"
---

# 📝 Prompt Library

> A comprehensive collection of battle-tested prompts inspired by [awesome-chatgpt-prompts](https://github.com/f/awesome-chatgpt-prompts) and community best practices.

## When to Use This Skill

Use this skill when the user:

- Needs ready-to-use prompt templates
- Wants role-based prompts (act as X)
- Asks for prompt examples or inspiration
- Needs task-specific prompt patterns
- Wants to improve their prompting

## Prompt Categories

### 🎭 Role-Based Prompts

#### Expert Developer

```
Act as an expert software developer with 15+ years of experience. You specialize in clean code, SOLID principles, and pragmatic architecture. When reviewing code:
1. Identify bugs and potential issues
2. Suggest performance improvements
3. Recommend better patterns
4. Explain your reasoning clearly
Always prioritize readability and maintainability over cleverness.
```

#### Code Reviewer

```
Act as a senior code reviewer. Your role is to:
1. Check for bugs, edge cases, and error handling
2. Evaluate code structure and organization
3. Assess naming conventions and readability
4. Identify potential security issues
5. Suggest improvements with specific examples

Format your review as:
🔴 Critical Issues (must fix)
🟡 Suggestions (should consider)
🟢 Praise (what's done well)
```

#### Technical Writer

```
Act as a technical documentation expert. Transform complex technical concepts into clear, accessible documentation. Follow these principles:
- Use simple language, avoid jargon
- Include practical examples
- Structure with clear headings
- Add code snippets where helpful
- Consider the reader's experience level
```

#### System Architect

```
Act as a senior system architect designing for scale. Consider:
- Scalability (horizontal and vertical)
- Reliability (fault tolerance, redundancy)
- Maintainability (modularity, clear boundaries)
- Performance (latency, throughput)
- Cost efficiency

Provide architecture decisions with trade-off analysis.
```

### 🛠️ Task-Specific Prompts

#### Debug This Code

```
Debug the following code. Your analysis should include:

1. **Problem Identification**: What exactly is failing?
2. **Root Cause**: Why is it failing?
3. **Fix**: Provide corrected code
4. **Prevention**: How to prevent similar bugs

Show your debugging thought process step by step.
```

#### Explain Like I'm 5 (ELI5)

```
Explain [CONCEPT] as if I'm 5 years old. Use:
- Simple everyday analogies
- No technical jargon
- Short sentences
- Relatable examples from daily life
- A fun, engaging tone
```

#### Code Refactoring

```
Refactor this code following these priorities:
1. Readability first
2. Remove duplication (DRY)
3. Single responsibility per function
4. Meaningful names
5. Add comments only where necessary

Show before/after with explanation of changes.
```

#### Write Tests

```
Write comprehensive tests for this code:
1. Happy path scenarios
2. Edge cases
3. Error conditions
4. Boundary values

Use [FRAMEWORK] testing conventions. Include:
- Descriptive test names
- Arrange-Act-Assert pattern
- Mocking where appropriate
```

#### API Documentation

```
Generate API documentation for this endpoint including:
- Endpoint URL and method
- Request parameters (path, query, body)
- Request/response examples
- Error codes and meanings
- Authentication requirements
- Rate limits if applicable

Format as OpenAPI/Swagger or Markdown.
```

### 📊 Analysis Prompts

#### Code Complexity Analysis

```
Analyze the complexity of this codebase:

1. **Cyclomatic Complexity**: Identify complex functions
2. **Coupling**: Find tightly coupled components
3. **Cohesion**: Assess module cohesion
4. **Dependencies**: Map critical dependencies
5. **Technical Debt**: Highlight areas needing refactoring

Rate each area and provide actionable recommendations.
```

#### Performance Analysis

```
Analyze this code for performance issues:

1. **Time Complexity**: Big O analysis
2. **Space Complexity**: Memory usage patterns
3. **I/O Bottlenecks**: Database, network, disk
4. **Algorithmic Issues**: Inefficient patterns
5. **Quick Wins**: Easy optimizations

Prioritize findings by impact.
```

#### Security Review

```
Perform a security review of this code:

1. **Input Validation**: Check all inputs
2. **Authentication/Authorization**: Access control
3. **Data Protection**: Sensitive data handling
4. **Injection Vulnerabilities**: SQL, XSS, etc.
5. **Dependencies**: Known vulnerabilities

Classify issues by severity (Critical/High/Medium/Low).
```

### 🎨 Creative Prompts

#### Brainstorm Features

```
Brainstorm features for [PRODUCT]:

For each feature, provide:
- Name and one-line description
- User value proposition
- Implementation complexity (Low/Med/High)
- Dependencies on other features

Generate 10 ideas, then rank top 3 by impact/effort ratio.
```

#### Name Generator

```
Generate names for [PROJECT/FEATURE]:

Provide 10 options in these categories:
- Descriptive (what it does)
- Evocative (how it feels)
- Acronyms (memorable abbreviations)
- Metaphorical (analogies)

For each, explain the reasoning and check domain availability patterns.
```

### 🔄 Transformation Prompts

#### Migrate Code

```
Migrate this code from [SOURCE] to [TARGET]:

1. Identify equivalent constructs
2. Handle incompatible features
3. Preserve functionality exactly
4. Follow target language idioms
5. Add necessary dependencies

Show the migration step by step with explanations.
```

#### Convert Format

```
Convert this [SOURCE_FORMAT] to [TARGET_FORMAT]:

Requirements:
- Preserve all data
- Use idiomatic target format
- Handle edge cases
- Validate the output
- Provide sample verification
```

## Prompt Engineering Techniques

### Chain of Thought (CoT)

```
Let's solve this step by step:
1. First, I'll understand the problem
2. Then, I'll identify the key components
3. Next, I'll work through the logic
4. Finally, I'll verify the solution

[Your question here]
```

### Few-Shot Learning

```
Here are some examples of the task:

Example 1:
Input: [example input 1]
Output: [example output 1]

Example 2:
Input: [example input 2]
Output: [example output 2]

Now complete this:
Input: [actual input]
Output:
```

### Persona Pattern

```
You are [PERSONA] with [TRAITS].
Your communication style is [STYLE].
You prioritize [VALUES].

When responding:
- [Behavior 1]
- [Behavior 2]
- [Behavior 3]
```

### Structured Output

```
Respond in the following JSON format:
{
  "analysis": "your analysis here",
  "recommendations": ["rec1", "rec2"],
  "confidence": 0.0-1.0,
  "caveats": ["caveat1"]
}
```

## Prompt Improvement Checklist

When crafting prompts, ensure:

- [ ] **Clear objective**: What exactly do you want?
- [ ] **Context provided**: Background information included?
- [ ] **Format specified**: How should output be structured?
- [ ] **Examples given**: Are there reference examples?
- [ ] **Constraints defined**: Any limitations or requirements?
- [ ] **Success criteria**: How do you measure good output?

## Resources

- [awesome-chatgpt-prompts](https://github.com/f/awesome-chatgpt-prompts)
- [prompts.chat](https://prompts.chat)
- [Learn Prompting](https://learnprompting.org/)

---

> 💡 **Tip**: The best prompts are specific, provide context, and include examples of desired output.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
