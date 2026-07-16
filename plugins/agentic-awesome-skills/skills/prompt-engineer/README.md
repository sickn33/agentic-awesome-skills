# 🎯 Prompt Engineer

**Version:** 1.0.1  
**Status:** ✨ Zero-Config | 🌍 Universal

Transform raw prompts into optimized, production-ready prompts using 11 established prompting frameworks.

---

## 📋 Overview

**Prompt Engineer** is an intelligent AI skill that analyzes your intentions and automatically generates optimized prompts for Claude, ChatGPT, or any other AI model. Instead of struggling with how to phrase complex requests, simply describe what you want - the skill handles the rest.

This skill works in **"magic mode"** - it operates silently, only asking questions when absolutely necessary. You provide a rough idea, and it returns a polished, structured prompt ready to use.

### ✨ Key Features

- **🎯 Intent Analysis:** Understands what you're trying to accomplish
- **🧠 11 Frameworks:** RTF, Chain of Thought, RISEN, RODES, Chain of Density, RACE, RISE, STAR, SOAP, CLEAR, GROW
- **🔄 Framework Blending:** Combines multiple frameworks when needed
- **❓ Smart Clarification:** Only asks questions when critically needed
- **📏 Adaptive Output:** Matches prompt length to task complexity
- **🌍 Universal:** Works in any project, any terminal context
- **🪄 Magic Mode:** No technical explanations - just results

---

## 🚀 Quick Start

### Invoke the Skill

Use any of these trigger phrases:

```bash
copilot> improve this prompt: [your rough prompt]
copilot> optimize prompt: [your idea]
copilot> refine prompt: [what you want]
copilot> prompt engineering for: [task description]
copilot> transform into prompt: [concept]
copilot> create prompt for: [goal]
```

### Example 1: Simple Task

**Input:**
```bash
copilot> improve this prompt: help me write Python code
```

**Skill asks:**
```
What type of Python code do you need?
- [ ] Data analysis
- [ ] Web scraping
- [ ] Task automation
- [ ] API/backend development
```

**You select:** "Web scraping"

**Output:**
````markdown
```
You are a Python developer expert in web scraping.

Task: Create a Python script to scrape data from [specify target website].

Requirements:
- Use BeautifulSoup or Scrapy
- Implement pagination and rate limiting
- Store data in structured format (CSV or JSON)
- Include error handling for network issues

Output format: Complete, commented Python code with usage examples.
```
````

---

### Example 2: Complex Task (No Clarification Needed)

**Input:**
```bash
copilot> create prompt for: product recommendation system with purchase history and market trends
```

**Output:**
````markdown
```
Role: You are a senior machine learning engineer specializing in recommendation systems.

Objective: Design a product recommendation system that combines user purchase history, preferences, and market trends.

Details:
- Input data sources: user transaction logs, preference surveys, market trend APIs
- Algorithm considerations: collaborative filtering, content-based filtering, hybrid approaches
- Performance metrics: precision, recall, diversity, novelty
- Scalability: system must handle 100k+ users

Approach step-by-step:
1. Analyze the three data sources and their relationships
2. Propose 2-3 algorithm approaches with trade-offs
3. Design data pipeline architecture
4. Define evaluation metrics
5. Outline implementation roadmap

Examples: Show pseudocode for core recommendation logic

Sense Check: Validate that the solution balances personalization with discovery and scales to production.

Output format: Technical design document with architecture diagrams and implementation roadmap.
```
````

---

### Example 3: Ambiguous Task (Skill Clarifies)

**Input:**
```bash
copilot> transform into prompt: I want to improve my process
```

**Skill asks:**
```
What process do you want to improve?
- [ ] Work/productivity process
- [ ] Learning process
- [ ] Technical process (development, deployment, etc.)
```

**You select:** "Work process"

**Skill asks:**
```
What specific aspect?
- [ ] Time management
- [ ] Team collaboration
- [ ] Decision making
```

**You select:** "Decision making"

**Output:**
````markdown
```
Context: I struggle with making decisions quickly and effectively at work.

Objective: Develop a structured framework to improve decision speed and quality.

Current Reality:
- Decisions delayed by excessive analysis
- Lack of clear criteria
- Uncertainty about when to decide vs. gather information

Desired Outcome:
- Consistent decision-making framework
- Clear criteria for different decision types
- Reduced decision fatigue

Your task:
1. Assess current patterns and identify bottlenecks
2. Propose framework (Eisenhower Matrix, RAPID, Decision Tree)
3. Create decision criteria templates
4. Design tracking and iteration process

Output format: Practical playbook with templates, examples, and metrics.
```
````

---

## 📚 Supported Frameworks

The **Prompt Engineer** skill uses **11 established frameworks** to optimize your prompts. The skill automatically selects and blends these frameworks based on your task - you never need to know or choose them manually.

---

### 1. **RTF (Role-Task-Format)**

**Structure:** Role → Task → Format

**Best for:** Tasks requiring specific expertise or perspective

**Components:**
- **Role:** "You are a [expert identity]"
- **Task:** "Your task is to [specific action]"
- **Format:** "Output format: [structure/style]"

**Example:**
```
You are a senior Python developer.
Task: Refactor this code for better performance.
Format: Provide refactored code with inline comments explaining changes.
```

---

### 2. **Chain of Thought**

**Structure:** Problem → Step 1 → Step 2 → ... → Solution

**Best for:** Complex reasoning, debugging, mathematical problems, logic puzzles

**Components:**
- Break problem into sequential steps
- Show reasoning at each stage
- Build toward final solution

**Example:**
```
Solve this problem step-by-step:
1. Identify the core issue
2. Analyze contributing factors
3. Propose solution approach
4. Validate solution against requirements
```

---

### 3. **RISEN**

**Structure:** Role, Instructions, Steps, End goal, Narrowing

**Best for:** Multi-phase projects with clear deliverables and constraints

**Components:**
- **Role:** Expert identity
- **Instructions:** What to do
- **Steps:** Sequential actions
- **End goal:** Desired outcome
- **Narrowing:** Constraints and focus areas

**Example:**
```
Role: You are a DevOps architect.
Instructions: Design a CI/CD pipeline for microservices.
Steps: 1) Analyze requirements 2) Select tools 3) Design workflow 4) Document
End goal: Automated deployment with zero-downtime releases.
Narrowing: Focus on AWS, limit to 3 environments (dev/staging/prod).
```

---

### 4. **RODES**

**Structure:** Role, Objective, Details, Examples, Sense check

**Best for:** Complex design, system architecture, research proposals

**Components:**
- **Role:** Expert perspective
- **Objective:** What to achieve
- **Details:** Context and requirements
- **Examples:** Concrete illustrations
- **Sense check:** Validation criteria

**Example:**
```
Role: You are a system architect.
Objective: Design a scalable e-commerce platform.
Details: Handle 100k concurrent users, sub-200ms response time, multi-region.
Examples: Show database schema, caching strategy, load balancing.
Sense check: Validate solution meets latency and scalability requirements.
```

---

### 5. **Chain of Density**

**Structure:** Iteration 1 (verbose) → Iteration 2 → ... → Iteration 5 (maximum density)

**Best for:** Summarization, compression, synthesis of long content

**Process:**
- Start with verbose explanation
- Iteratively compress while preserving key information
- End with maximally dense version (high information per word)

**Example:**
```
Compress this article into progressively denser summaries:
1. Initial summary (300 words)
2. Compressed (200 words)
3. Further compressed (100 words)
4. Dense (50 words)
5. Maximum density (25 words, all critical points)
```

---

### 6. **RACE**

**Structure:** Role, Audience, Context, Expectation

**Best for:** Communication, presentations, stakeholder updates, storytelling

**Components:**
- **Role:** Communicator identity
- **Audience:** Who you're addressing (expertise level, concerns)
- **Context:** Background/situation
- **Expectation:** What audience needs to know or do

**Example:**
```
Role: You are a product manager.
Audience: Non-technical executives.
Context: Quarterly business review, product performance down 5%.
Expectation: Explain root causes and recovery plan in non-technical terms.
```

---

### 7. **RISE**

**Structure:** Research, Investigate, Synthesize, Evaluate

**Best for:** Analysis, investigation, systematic exploration, diagnostic work

**Process:**
1. **Research:** Gather information
2. **Investigate:** Deep dive into findings
3. **Synthesize:** Combine insights
4. **Evaluate:** Assess and recommend

**Example:**
```
Analyze customer churn data using RISE:
Research: Collect churn metrics, exit surveys, support tickets.
Investigate: Identify patterns in churned users.
Synthesize: Combine findings into themes.
Evaluate: Recommend retention strategies based on evidence.
```

---

### 8. **STAR**

**Structure:** Situation, Task, Action, Result

**Best for:** Problem-solving with rich context, case studies, retrospectives

**Components:**
- **Situation:** Background context
- **Task:** Specific challenge
- **Action:** What needs doing
- **Result:** Expected outcome

**Example:**
```
Situation: Legacy monolith causing deployment delays (2 weeks per release).
Task: Modernize architecture to enable daily deployments.
Action: Migrate to microservices, implement CI/CD, containerize.
Result: Deploy 10+ times per day with <5% rollback rate.
```

---

### 9. **SOAP**

**Structure:** Subjective, Objective, Assessment, Plan

**Best for:** Structured documentation, medical records, technical logs, incident reports

**Components:**
- **Subjective:** Reported information (symptoms, complaints)
- **Objective:** Observable facts (metrics, data)
- **Assessment:** Analysis and diagnosis
- **Plan:** Recommended actions

**Example:**
```
Incident Report (SOAP):
Subjective: Users report slow page loads starting 10 AM.
Objective: Average response time increased from 200ms to 3s. CPU at 95%.
Assessment: Database connection pool exhausted due to traffic spike.
Plan: 1) Scale pool size 2) Add monitoring alerts 3) Review query performance.
```

---

### 10. **CLEAR**

**Structure:** Collaborative, Limited, Emotional, Appreciable, Refinable

**Best for:** Goal-setting, OKRs, measurable objectives, team alignment

**Components:**
- **Collaborative:** Who's involved
- **Limited:** Scope boundaries (time, resources)
- **Emotional:** Why it matters (motivation)
- **Appreciable:** Measurable progress indicators
- **Refinable:** How to iterate and improve

**Example:**
```
Q1 Objective (CLEAR):
Collaborative: Engineering + Product teams.
Limited: Complete by March 31, budget $50k, 2 engineers allocated.
Emotional: Reduces customer support load by 30%, improves satisfaction.
Appreciable: Track weekly via tickets resolved, NPS score, deployment count.
Refinable: Bi-weekly retrospectives, adjust priorities based on feedback.
```

---

### 11. **GROW**

**Structure:** Goal, Reality, Options, Will

**Best for:** Coaching, personal development, growth planning, mentorship

**Components:**
- **Goal:** What to achieve
- **Reality:** Current situation (strengths, gaps)
- **Options:** Possible approaches
- **Will:** Commitment to action

**Example:**
```
Career Development (GROW):
Goal: Become senior engineer within 12 months.
Reality: Strong coding skills, weak in system design and leadership.
Options: 1) Take system design course 2) Lead a project 3) Find mentor.
Will: Commit to 5 hours/week study, lead Q2 project, find mentor by Feb.
```

---

### Framework Selection Logic

The skill analyzes your input and:

1. **Detects task type**
   - Coding, writing, analysis, design, communication, etc.

2. **Identifies complexity**
   - Simple (1-2 sentences) → Fast, minimal structure
   - Moderate (paragraph) → Standard framework
   - Complex (detailed requirements) → Advanced framework or blend

3. **Selects primary framework**
   - RTF → Role-based tasks
   - Chain of Thought → Step-by-step reasoning
   - RISEN/RODES → Complex projects
   - RACE → Communication
   - STAR → Contextual problems
   - And so on...

4. **Blends secondary frameworks when needed**
   - RODES + Chain of Thought → Complex technical projects
   - CLEAR + GROW → Leadership goals
   - RACE + STAR → Strategic communication

**You never choose the framework manually** - the skill does it automatically in "magic mode."

---

### Common Framework Blends

| Task Type | Primary Framework | Blended With | Result |
|-----------|------------------|--------------|--------|
| Complex technical design | RODES | Chain of Thought | Structured design with step-by-step reasoning |
| Leadership development | CLEAR | GROW | Measurable goals with action commitment |
| Strategic communication | RACE | STAR | Audience-aware storytelling with context |
| Incident investigation | RISE | SOAP | Systematic analysis with structured documentation |
| Project planning | RISEN | RTF | Multi-phase delivery with role clarity |

---

## 🎯 How It Works

```
User Input (rough prompt)
         ↓
┌────────────────────────┐
│ 1. Analyze Intent      │  What is the user trying to do?
│    - Task type         │  Coding? Writing? Analysis? Design?
│    - Complexity        │  Simple, moderate, complex?
│    - Clarity           │  Clear or ambiguous?
└────────┬───────────────┘
         ↓
┌────────────────────────┐
│ 2. Clarify (Optional)  │  Only if critically needed
│    - Ask 2-3 questions │  Multiple choice when possible
│    - Fill missing gaps │  
└────────┬───────────────┘
         ↓
┌────────────────────────┐
│ 3. Select Framework(s) │  Silent selection
│    - Map task → framework
│    - Blend if needed   │
└────────┬───────────────┘
         ↓
┌────────────────────────┐
│ 4. Generate Prompt     │  Apply framework rules
│    - Add role/context  │  
│    - Structure task    │  
│    - Define format     │
│    - Add examples      │
└────────┬───────────────┘
         ↓
┌────────────────────────┐
│ 5. Output              │  Clean, copy-ready
│    Markdown code block │  No explanations
└────────────────────────┘
```

---

## 🎨 Use Cases

### Coding

```bash
copilot> optimize prompt: create REST API in Python
```

→ Generates structured prompt with role, requirements, output format, examples

---

### Writing

```bash
copilot> create prompt for: write technical article about microservices
```

→ Generates audience-aware prompt with structure, tone, and content guidelines

---

### Analysis

```bash
copilot> refine prompt: analyze sales data and identify trends
```

→ Generates step-by-step analytical framework with visualization requirements

---

### Decision Making

```bash
copilot> improve this prompt: I need to decide between technology A and B
```

→ Generates decision framework with criteria, trade-offs, and validation

---

### Learning

```bash
copilot> transform into prompt: learn machine learning from zero
```

→ Generates learning path prompt with phases, resources, and milestones

---

## ❓ FAQ

### Q: Does this skill work outside of Obsidian vaults?
**A:** Yes! It's a **universal skill** that works in any terminal context. It doesn't depend on vault structure, project configuration, or external files.

---

### Q: Do I need to know prompting frameworks?
**A:** No. The skill knows all 11 frameworks and selects the best one(s) automatically based on your task.

---

### Q: Will the skill explain which framework it used?
**A:** No. It operates in "magic mode" - you get the polished prompt without technical explanations. If you want to know, you can ask explicitly.

---

### Q: How many questions will the skill ask me?
**A:** Maximum 2-3 questions, and only when information is critically missing. Most of the time, it generates the prompt directly.

---

### Q: Can I customize the frameworks?
**A:** The skill uses standard framework definitions. You can't customize them, but you can provide additional constraints in your input (e.g., "create a short prompt for...").

---

### Q: Does it support languages other than English?
**A:** Yes. If you provide input in Portuguese, it generates the prompt in Portuguese. Same for English or mixed inputs.

---

### Q: What if I don't like the generated prompt?
**A:** You can ask the skill to refine it: "make it shorter", "add more examples", "focus on X aspect", etc.

---

### Q: Can I use this for any AI model (Claude, ChatGPT, Gemini)?
**A:** Yes. The prompts are model-agnostic and work with any conversational AI.

---

## 🔧 Installation (Global Setup)

This skill is designed to work **globally** across all your projects.

### Option 1: Use from Repository

1. Clone the repository:
   ```bash
   git clone https://github.com/eric.andrade/cli-ai-skills.git
   ```

2. Configure Copilot to load skills globally:
   ```bash
   # Add to ~/.copilot/config.json
   {
     "skills": {
       "directories": [
         "/path/to/cli-ai-skills/.github/skills"
       ]
     }
   }
   ```

### Option 2: Copy to Global Skills Directory

```bash
cp -r /path/to/cli-ai-skills/.github/skills/prompt-engineer ~/.copilot/global-skills/
```

Then configure:
```bash
# Add to ~/.copilot/config.json
{
  "skills": {
    "directories": [
      "~/.copilot/global-skills"
    ]
  }
}
```

---

## 📖 Learn More

- **Skill Development Guide** - Learn how to create your own skills
- **[SKILL.md](./SKILL.md)** - Full technical specification of this skill
- **[Repository README](../../README.md)** - Overview of all available skills

---

## 📄 Version

**v1.0.1** | Zero-Config | Universal  
*Works in any project, any context, any terminal.*
