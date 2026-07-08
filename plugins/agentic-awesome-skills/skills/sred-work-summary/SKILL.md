---
name: sred-work-summary
description: Go back through the previous year of work and create a Notion doc that groups relevant links into projects that can then be documented as SRED projects.
risk: unknown
source: community
---

# SRED Work Summary

Collect all the Github PRs, Notion docs and Linear tickets a person completed in a given year. Group the links from all of those into projects. Put everything into a private Notion document and return a link to that document.

## When to Use
- You need to gather a year's worth of PRs, Notion docs, and Linear tickets into project groupings for SRED preparation.
- The task is to build the upstream Notion work summary before writing individual SRED project descriptions.
- You need a repeatable collection workflow across GitHub, Notion, and Linear for a fixed time window.

## Prerequisites

Before starting make sure that Github, Notion and Linear can be accessed. Notion and Linear should be connected using an MCP. Github can be connected with an MCP, but if you have access to the `gh` CLI tool, you can use that instead.

If any of these can't be accessed, prompt the user to grant access before proceeding.

## Process

### Step 1

```bash
# Get the current year
date +%Y
```

The output of this command is the current year.
The current year minus one is the previous year.

### Step 2

Collect all of the required information from the user:

*Github Username*: What is the github username of the user?

*Github Repositories*: Which Github repositories should be searched for PRs?

The user can either specify a comma separated list, or provide a directory that contains repositories. In the second case use this command in the specified directory:

```bash
# Find github repos
find . -maxdepth 2 -name ".git" -type d | sed 's/\/.git$//' | sort
```

Ensure:
- All the repositories listed are in the `getsentry` Github organization.

The output of this is hereafter referred to as the "user repos".

*Incidents*: Ask if the user wants to include incident documents.

The answer is either yes or no. If the answer is no, that will exclude certain documents from the search later on.

*Other Users*: Ask if there are any other users who might have created Notion documents.

This should be a comma separated list of names. Remember this as the "other users".

### Step 3

Create a private Notion document entitled "SRED Work Summary [current year]". This document will be referred to as the Work Summary.

If a document with this name already exists, notify the user to rename the existing document and stop executing.

Ensure:
- If the Work Summary already exists, stop execution.

### Step 4

The time window is Feb. 1 of the previous year until Jan. 31 of the current year
Find all Github PRs created by the given github username in the time window for the user repos.
If the user does not want to include incident documents, ignore any Github PRs with `INC-X`, `inc-X` in the title or description.
Use either the Github MCP or the `gh` command to do this.

Find all the Notion documents the user created in the time window.
If the user does not want to include incident documents, ignore any Notion Documents with `INC-XXXX` in the title.
Use the Notion MCP to do this.

Find all the Linear tickets the user was assigned in the time window.
If the user does not want to include incident documents, ignore any Linear tickets with `INC-XXXX` in the title.
Use the Linear MCP to do this.

Ensure:
- All the Github PRs were created or merged in the time window and was opened by the user.
- All the Notion docs were created in the time window and were created by the user.
- All the Linear tickets were opened or completed in the time window and were assigned to the user when they were completed.

### Step 5

For each of the Github PRs, Notion documents and Linear tickets found in Step 4, put a link into the private document created in Step 3.

Ensure:
- There is a link for all the Github PRs in the Work Summary
- There is a link for all the Notion docs in the Work Summary
- There is a link for all the Linear tickets in the Work Summary
- DO NOT truncate the lists of links. DO NOT use shorteners like "...and 75 more". Make sure that the full set of all Github PRs, Notion documents and Linear tickets is visible in the document.

### Step 6

Use your own intelligence to group all the Github, Notion and Linear ticket links in the Work Summary document into projects. The format of this document is shown below.

```markdown
# Projects

## [Project Name]
*Summary*: [X] PRs, [X] Notion docs, [X] Linear tickets

### Pull Requests [X]
*[repository name]
[Links to all the PRs]
- [link] - [Merge date]

### Notion Docs [X]
[Links to all the Notion docs]
- [link] - [Creation date]

### Linear Tickets [X]
- [link] - [Creation date]
```

For Github PRs, use both the title of the PR and the description of the PR for grouping.
For Notion documents, use the full document for grouping.
For Linear tickets use the title of the ticket and the description of the ticket.

Ensure:
- All the links in the file are assigned to a project.
- The file follows the format specified above.
- DO NOT truncate the lists of links. DO NOT use shorteners like "...and 75 more". Make sure that the full set of all Github PRs, Notion documents and Linear tickets is visible in the document.

### Step 7

Search for notion documents created by the "other users". Take any that are relevant to the projects in the Work Summary and add links to those Notion documents into the Work Summary in the appropriate project.

### Step 8

Return a link to the Work Summary Notion doc to the user.

Ensure:
- The actual Notion document link is in the final output.

## Resources

This is an example Working Summary document for the year 2025: https://www.notion.so/sentry/Work-Summary-Feb-2025-Jan-2026-3068b10e4b5d81d3a40cfa6ad3fe1078?source=copy_link

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
