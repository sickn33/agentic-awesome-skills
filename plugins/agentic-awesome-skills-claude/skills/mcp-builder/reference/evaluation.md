# MCP Server Evaluation Guide

Modified in AAS on 2026-09-05. This is a bounded fixture evaluation, not proof of
production reliability. Review source and permissions when needed to establish a
safe tool list. Tool hints alone do not authorize calls. Delegate only if the user
has authorized agents; parallel tool reads do not require extra agents.

## Overview

This document provides guidance on creating comprehensive evaluations for MCP servers. Evaluations test whether LLMs can effectively use your MCP server to answer realistic, complex questions using only the tools provided.

---

## Quick Reference

### Evaluation Requirements
- Create 10 human-readable questions
- Questions must be READ-ONLY, INDEPENDENT, NON-DESTRUCTIVE
- Each question requires multiple tool calls (potentially dozens)
- Answers must be single, verifiable values
- Answers must be STABLE (won't change over time)

### Output Format
```xml
<evaluation>
   <qa_pair>
      <question>Your question here</question>
      <answer>Single verifiable answer</answer>
   </qa_pair>
</evaluation>
```

---

## Purpose of Evaluations

One measure of usefulness is how these implementations (input/output schemas, docstrings/descriptions, functionality) enable LLMs with no other context and access ONLY to the MCP servers to answer realistic and difficult questions.

## Evaluation Overview

Create 10 human-readable questions requiring ONLY READ-ONLY, INDEPENDENT, NON-DESTRUCTIVE, and IDEMPOTENT operations to answer. Each question should be:
- Realistic
- Clear and concise
- Unambiguous
- Complex, requiring potentially dozens of tool calls or steps
- Answerable with a single, verifiable value that you identify in advance

## Question Guidelines

### Core Requirements

1. **Questions MUST be independent**
   - Each question should NOT depend on the answer to any other question
   - Should not assume prior write operations from processing another question

2. **Questions MUST require ONLY NON-DESTRUCTIVE AND IDEMPOTENT tool use**
   - Should not instruct or require modifying state to arrive at the correct answer

3. **Questions must be REALISTIC, CLEAR, CONCISE, and COMPLEX**
   - Must require another LLM to use multiple (potentially dozens of) tools or steps to answer

### Complexity and Depth

4. **Questions must require deep exploration**
   - Consider multi-hop questions requiring multiple sub-questions and sequential tool calls
   - Each step may use earlier steps in the same question, without depending on other questions

5. **Questions may require extensive paging**
   - May need paging through multiple pages of results
   - May require querying old data (1-2 years out-of-date) to find niche information
   - The questions must be DIFFICULT

6. **Questions must require deep understanding**
   - Rather than surface-level knowledge
   - May pose complex ideas as True/False questions requiring evidence
   - May use multiple-choice format where LLM must search different hypotheses

7. **Questions must not be solvable with straightforward keyword search**
   - Do not include specific keywords from the target content
   - Use synonyms, related concepts, or paraphrases
   - Require multiple searches, analyzing multiple related items, extracting context, then deriving the answer

### Tool Testing

8. **Questions should stress-test tool return values**
   - May elicit tools returning large JSON objects or lists, overwhelming the LLM
   - Should require understanding multiple modalities of data:
     - IDs and names
     - Timestamps and datetimes (months, days, years, seconds)
     - File IDs, names, extensions, and mimetypes
     - URLs, GIDs, etc.
   - Should probe the tool's ability to return all useful forms of data

9. **Questions should MOSTLY reflect real human use cases**
   - The kinds of information retrieval tasks that HUMANS assisted by an LLM would care about

10. **Questions may require dozens of tool calls**
    - This challenges LLMs with limited context
    - Encourages MCP server tools to reduce information returned

11. **Include ambiguous questions**
    - May be ambiguous OR require difficult decisions on which tools to call
    - Force the LLM to potentially make mistakes or misinterpret
    - Ensure that despite AMBIGUITY, there is STILL A SINGLE VERIFIABLE ANSWER

### Stability

12. **Questions must be designed so the answer DOES NOT CHANGE**
    - Do not ask questions that rely on "current state" which is dynamic
    - For example, do not count:
      - Number of reactions to a post
      - Number of replies to a thread
      - Number of members in a channel

13. **DO NOT let the MCP server RESTRICT the kinds of questions you create**
    - Create challenging and complex questions
    - Some may not be solvable with the available MCP server tools
    - Questions may require specific output formats (datetime vs. epoch time, JSON vs. MARKDOWN)
    - Questions may require dozens of tool calls to complete

## Answer Guidelines

### Verification

1. **Answers must be VERIFIABLE via direct string comparison**
   - If the answer can be re-written in many formats, clearly specify the output format in the QUESTION
   - Examples: "Use YYYY/MM/DD.", "Respond True or False.", "Answer A, B, C, or D and nothing else."
   - Answer should be a single VERIFIABLE value such as:
     - User ID, user name, display name, first name, last name
     - Channel ID, channel name
     - Message ID, string
     - URL, title
     - Numerical quantity
     - Timestamp, datetime
     - Boolean (for True/False questions)
     - Email address, phone number
     - File ID, file name, file extension
     - Multiple choice answer
   - Answers must not require special formatting or complex, structured output
   - Answer will be verified using DIRECT STRING COMPARISON

### Readability

2. **Answers should generally prefer HUMAN-READABLE formats**
   - Examples: names, first name, last name, datetime, file name, message string, URL, yes/no, true/false, a/b/c/d
   - Rather than opaque IDs (though IDs are acceptable)
   - The VAST MAJORITY of answers should be human-readable

### Stability

3. **Answers must be STABLE/STATIONARY**
   - Look at old content (e.g., conversations that have ended, projects that have launched, questions answered)
   - Create QUESTIONS based on "closed" concepts that will always return the same answer
   - Questions may ask to consider a fixed time window to insulate from non-stationary answers
   - Rely on context UNLIKELY to change
   - Example: if finding a paper name, be SPECIFIC enough so answer is not confused with papers published later

4. **Answers must be CLEAR and UNAMBIGUOUS**
   - Questions must be designed so there is a single, clear answer
   - Answer can be derived from using the MCP server tools

### Diversity

5. **Answers must be DIVERSE**
   - Answer should be a single VERIFIABLE value in diverse modalities and formats
   - User concept: user ID, user name, display name, first name, last name, email address, phone number
   - Channel concept: channel ID, channel name, channel topic
   - Message concept: message ID, message string, timestamp, month, day, year

6. **Answers must NOT be complex structures**
   - Not a list of values
   - Not a complex object
   - Not a list of IDs or strings
   - Not natural language text
   - UNLESS the answer can be straightforwardly verified using DIRECT STRING COMPARISON
   - And can be realistically reproduced
   - It should be unlikely that an LLM would return the same list in any other order or format

## Evaluation Process

### Step 1: Documentation Inspection

Read the documentation of the target API to understand:
- Available endpoints and functionality
- If ambiguity exists, fetch additional information from the web
- Parallelize this step AS MUCH AS POSSIBLE
- If agents are authorized, restrict their exploration to the agreed data and permissions

### Step 2: Tool Inspection

List the tools available in the MCP server:
- Inspect the MCP server directly
- Understand input/output schemas, docstrings, and descriptions
- WITHOUT calling the tools themselves at this stage

### Step 3: Developing Understanding

Repeat steps 1 & 2 until you have a good understanding:
- Iterate multiple times
- Think about the kinds of tasks you want to create
- Refine your understanding
- Keep answer-solving separate from implementation review, but inspect code when needed for safety and contract verification
- Use your intuition and understanding to create reasonable, realistic, but VERY challenging tasks

### Step 4: Read-Only Content Inspection

After understanding the API and tools, USE the MCP server tools:
- Inspect content using READ-ONLY and NON-DESTRUCTIVE operations ONLY
- Goal: identify specific content (e.g., users, channels, messages, projects, tasks) for creating realistic questions
- Should NOT call any tools that modify state
- Review implementation separately when needed to verify permissions
- Run independent explorations sequentially, or delegate only with user authorization
- Keep every exploration within the explicitly reviewed read-only tool allowlist
- BE CAREFUL: SOME TOOLS may return LOTS OF DATA which would cause you to run out of CONTEXT
- Make INCREMENTAL, SMALL, AND TARGETED tool calls for exploration
- In all tool call requests, use the `limit` parameter to limit results (<10)
- Use pagination

### Step 5: Task Generation

After inspecting the content, create 10 human-readable questions:
- An LLM should be able to answer these with the MCP server
- Follow all question and answer guidelines above

## Output Format

Each QA pair consists of a question and an answer. The output should be an XML file with this structure:

```xml
<evaluation>
   <qa_pair>
      <question>Find the project created in Q2 2024 with the highest number of completed tasks. What is the project name?</question>
      <answer>Website Redesign</answer>
   </qa_pair>
   <qa_pair>
      <question>Search for issues labeled as "bug" that were closed in March 2024. Which user closed the most issues? Provide their username.</question>
      <answer>sarah_dev</answer>
   </qa_pair>
   <qa_pair>
      <question>Look for pull requests that modified files in the /api directory and were merged between January 1 and January 31, 2024. How many different contributors worked on these PRs?</question>
      <answer>7</answer>
   </qa_pair>
   <qa_pair>
      <question>Find the repository with the most stars that was created before 2023. What is the repository name?</question>
      <answer>data-pipeline</answer>
   </qa_pair>
</evaluation>
```

## Evaluation Examples

### Good Questions

**Example 1: Multi-hop question requiring deep exploration (GitHub MCP)**
```xml
<qa_pair>
   <question>Find the repository that was archived in Q3 2023 and had previously been the most forked project in the organization. What was the primary programming language used in that repository?</question>
   <answer>Python</answer>
</qa_pair>
```

This question is good because:
- Requires multiple searches to find archived repositories
- Needs to identify which had the most forks before archival
- Requires examining repository details for the language
- Answer is a simple, verifiable value
- Based on historical data pinned to a recorded snapshot

**Example 2: Requires understanding context without keyword matching (Project Management MCP)**
```xml
<qa_pair>
   <question>Locate the initiative focused on improving customer onboarding that was completed in late 2023. The project lead created a retrospective document after completion. What was the lead's role title at that time?</question>
   <answer>Product Manager</answer>
</qa_pair>
```

This question is good because:
- Doesn't use specific project name ("initiative focused on improving customer onboarding")
- Requires finding completed projects from specific timeframe
- Needs to identify the project lead and their role
- Requires understanding context from retrospective documents
- Answer is human-readable and stable
- Based on completed work whose source snapshot must still be pinned

**Example 3: Complex aggregation requiring multiple steps (Issue Tracker MCP)**
```xml
<qa_pair>
   <question>Among all bugs reported in January 2024 that were marked as critical priority, which assignee resolved the highest percentage of their assigned bugs within 48 hours? Provide the assignee's username.</question>
   <answer>alex_eng</answer>
</qa_pair>
```

This question is good because:
- Requires filtering bugs by date, priority, and status
- Needs to group by assignee and calculate resolution rates
- Requires understanding timestamps to determine 48-hour windows
- Tests pagination (potentially many bugs to process)
- Answer is a single username
- Based on historical data from specific time period

**Example 4: Requires synthesis across multiple data types (CRM MCP)**
```xml
<qa_pair>
   <question>Find the account that upgraded from the Starter to Enterprise plan in Q4 2023 and had the highest annual contract value. What industry does this account operate in?</question>
   <answer>Healthcare</answer>
</qa_pair>
```

This question is good because:
- Requires understanding subscription tier changes
- Needs to identify upgrade events in specific timeframe
- Requires comparing contract values
- Must access account industry information
- Answer is simple and verifiable
- Based on completed historical transactions

### Poor Questions

**Example 1: Answer changes over time**
```xml
<qa_pair>
   <question>How many open issues are currently assigned to the engineering team?</question>
   <answer>47</answer>
</qa_pair>
```

This question is poor because:
- The answer will change as issues are created, closed, or reassigned
- Not based on stable/stationary data
- Relies on "current state" which is dynamic

**Example 2: Too easy with keyword search**
```xml
<qa_pair>
   <question>Find the pull request with title "Add authentication feature" and tell me who created it.</question>
   <answer>developer123</answer>
</qa_pair>
```

This question is poor because:
- Can be solved with a straightforward keyword search for exact title
- Doesn't require deep exploration or understanding
- No synthesis or analysis needed

**Example 3: Ambiguous answer format**
```xml
<qa_pair>
   <question>List all the repositories that have Python as their primary language.</question>
   <answer>repo1, repo2, repo3, data-pipeline, ml-tools</answer>
</qa_pair>
```

This question is poor because:
- Answer is a list that could be returned in any order
- Difficult to verify with direct string comparison
- LLM might format differently (JSON array, comma-separated, newline-separated)
- Better to ask for a specific aggregate (count) or superlative (most stars)

## Verification Process

After creating evaluations:

1. **Examine the XML file** to understand the schema
2. **Load each task instruction** and in parallel using the MCP server and tools, identify the correct answer by attempting to solve the task YOURSELF
3. **Flag any operations** that require WRITE or DESTRUCTIVE operations
4. **Accumulate all CORRECT answers** and replace any incorrect answers in the document
5. **Remove any `<qa_pair>`** that require WRITE or DESTRUCTIVE operations

Remember to parallelize solving tasks to avoid running out of context, then accumulate all answers and make changes to the file at the end.

## Tips for Creating Quality Evaluations

1. **Think Hard and Plan Ahead** before generating tasks
2. **Parallelize Where Opportunity Arises** to speed up the process and manage context
3. **Focus on Realistic Use Cases** that humans would actually want to accomplish
4. **Create Challenging Questions** that test the limits of the MCP server's capabilities
5. **Ensure Stability** by using historical data and closed concepts
6. **Verify Answers** by solving the questions yourself using the MCP server tools
7. **Iterate and Refine** based on what you learn during the process

---

# Running evaluations with the bundled helper

Requires Python 3.11+, an isolated environment with `scripts/requirements.txt`, an
explicit Anthropic model available to the account, and authorization for API cost
and sharing fixture data with that provider. Pin resolved dependency versions in the
run receipt. The helper targets MCP Python SDK v1, not every future SDK major.

The model receives the questions, selected tool schemas and returned content. Use
synthetic or approved data; a read-only API can still disclose sensitive information.
The report contains questions, answers and model-generated summaries. Review it before
sharing. Keep credentials out of command-line arguments, tool schemas and fixtures;
use the existing approved secret mechanism. Never invent or print a provider key.

First verify the executable or remote endpoint and its permissions. For stdio the
helper starts the specified process; it is not a sandbox. For HTTP/SSE it connects
to the given endpoint; use the intended authenticated test service. SSE is retained
for existing servers, not a universal recommendation for new implementations.

From the skill directory, after dependencies and credentials are already configured:

```bash
python scripts/evaluation.py evaluation.xml \
  --model YOUR_APPROVED_MODEL \
  --allow-tool documents_search \
  --allow-tool documents_read \
  --transport stdio --command python --args /absolute/path/to/reviewed_server.py
```

Replace the model, tool names and server path with actual reviewed values. Put the
positional XML path before `--args`; that option consumes subsequent arguments.
Use `--transport http --url https://your-authorized-host.example/mcp` for a reviewed
remote fixture instead of stdio command options. `--output report.md` creates a new
report and refuses to overwrite an existing file. `--help` lists all options.

## What the helper verifies

- Parses 1–100 nonempty question/answer pairs from at most 1 MiB of XML using defusedxml.
- Enumerates paginated tools, rejecting repeated cursors and duplicate names, with
  limits of 100 pages and 1,000 tools.
- Exposes only explicitly selected names; checks the whole requested batch before
  calls. The operator must verify those tools are appropriate read-only operations.
- Handles every tool call in a response, serializes MCP content/structured content and
  preserves `isError`. Tool exceptions return a safe error type without a traceback.
- Bounds each task to 8 model rounds and 32 tool calls, each call to 60 seconds, inputs
  to 16 KiB and serialized results to 64 KiB. Model requests have a 60-second timeout
  and no SDK retries. Oversized results produce an explicit error, not partial JSON.
- Compares the final tagged answer with the expected string. A tool/round limit,
  missing inventory or malformed fixture fails the run; it is not a clean score.

A slow or malicious MCP server can still allocate memory in its SDK before the helper
checks a result, and remote cancellation is not guaranteed. Run only reviewed servers
in an appropriate test environment. The helper does not provide a spending ceiling,
full protocol conformance, sandboxing, model-quality confidence interval or production
approval. Keep a separate real-client smoke test and negative authorization tests.

## Interpreting results

Record exact model, SDK/runtime, server source revision, fixture checksum, selected
tool names, commands, date and observed outcomes. The included math XML is a synthetic
parser/arithmetic fixture; it does not exercise a particular external service.
Match failures may reflect formatting, missing data, tool defects or reasoning errors;
inspect each before changing answers. Never edit ground truth merely to improve a score.
A 10-question success is a small observed sample, not proof of general effectiveness.
