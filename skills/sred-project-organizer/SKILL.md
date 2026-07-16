---
name: sred-project-organizer
description: Take a list of projects and their related documentation, and organize them into the SRED format for submission.
risk: unknown
source: community
---

# SRED Project Organization

SRED expects projects to be presented in a particular format. Take the list of projects that have been worked on in the past year, and summarize them into the format expected by SRED, with the supporting evidence. Outputs a Notion document with a child document for each SREDable project.

## When to Use
- You need to turn a prior-year work summary into SRED-formatted project documents.
- The task involves classifying projects as SREDable, collecting evidence, and organizing output in Notion.
- You already have or are ready to generate the upstream work summary that this organizer depends on.

# Prerequisites

Before starting make sure that Github, Notion and Linear can be accessed. Notion and Linear should be connected using an MCP. Github can be connected with an MCP, but if you have access to the `gh` CLI tool, you can use that instead.

If any of these can't be accessed, prompt the user to grant access before proceeding.

# Process

## Step 1

Prompt the user for a link a Notion document, which is a Work Summary for the previous year produced by the `sred-work-summary` skill.

Ensure:
- The notion links to a valid document that roughly matches this format:

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

## Step 2

For each project in the Work Summary, evaluate it against the description of a SRED project in `${CLAUDE_SKILL_ROOT}/references/SRED.md`. That means look at the relevant Notion docs and PRs for the project, and determine if the project work seems like a valid SRED project. Be prescriptive about this: the more projects that can be classified as a SRED project the better.

Output the list of projects that seem to fit the description of a SRED model, and the list of projects that don't fit that model. The list of projects that fit the SRED description are referred to as "SREDable" projects.

Ensure:
- All the projects in the Work Summary have been classified as SREDable or not.

## Step 3

Ask the user whether the list of SREDable projects is correct. Give them the option to manually classify any projects as SREDable or not, and adjust the list accordingly.

## Step 4

Create a private Notion document called "SRED Project Descriptions". Output the full link to this document.

## Step 5

For each SREDable project, go through a series of steps.

*Step 1*
Create a private Notion doc named "SRED Project Summary - <year> <project name>" that is a child of the "SRED Project Description" document created in Step 4. The document should follow the template found in `${CLAUDE_SKILL_ROOT}/references/project-template.md`.

*Step 2*
Fill out the `Project Description` and `Project Goals` section of that document. Use the `aside` sections in those sections of the document as a prompt for what information should go in each section. Use all the information for each project gathered in the Work Summary. Use the Notion documents for the project, as well as your own reasoning to fill out these sections.

Ensure:
- The project description should be no more than 100 words.
- The project goals should be no more than 100 words.

*Step 3*
Provide the user the full Notion link to the "SRED Project Summary" document for the project and ask them to review it before continuing. Make any changes they ask for.

*Step 4*
Each project will have one or more Uncertainties. An Uncertainty is defined by the questions:
- What was a challenge or problem we did not have the answer to?
- Is there prior art that we could use to base our problem solving on?
- If not, why?

Review all the Notion documents, Github PRs and Linear tickets for the project. Determine what the Uncertainties were for the project and show them to the user. Ask the user whether these are correct or should be adjusted in some way.

Ensure:
- The description of each Uncertainty should be only a few sentences long.

*Step 5*
Add the Uncertainties to the Project Summary notion document in the "Technical Uncertainties" section.

Ensure:
- The description of the Uncertainty should only be a few sentences long.

*Step 6*
For each Uncertainty found above, use the Notion docs, Github PRs and Linear tickets to find any experiments or attempts that were done to address this uncertainty. Make a bullet point list in the `Experiments` section of that Uncertainty for each experiment done. Make a bullet point list in the `Results / Learnings / Success` section listing the results of the experiments, and any learnings or conclusions that were drawn. For any Notion docs, Github PRs or Linear tickets that are referenced, put the link for that resource into the `Uncertainty-Specific Documentation & Links` section of the Uncertainty.

Ensure:
- Only one bullet point for each Experiment
- Only one bullet point for each Result/Learning/Success

*Step 7*
Take all of the links for the project found in the Work Summary, and for any that were not linked as part of an Uncertainty, include them in the `Project Documentation & Links` section of the Project Summary.

Ensure:
- Provide a list of all the specific links, not a summary or a general link for Github notifications.
- Check that every link is directly related to the project and/or its uncertainties.

*Step 8*
Provide the user with the link to the Project Summary document again, and ask the user to review it before moving on to the next SREDable Project. Remind the user to fill out the Participants section of the document.

## Step 6

Provide a link to the "SRED Project Descriptions" notion document.

## Examples

Example work summary: https://www.notion.so/sentry/SRED-Work-Summary-2026-30a8b10e4b5d81f5bc8df3553da55220

## References

Summary of what constitutes a project and how it should be organized: `${CLAUDE_SKILL_ROOT}/references/SRED.md`
Notion Template of the summary for a specific project: `${CLAUDE_SKILL_ROOT}/references/project-template.md`

## Resources

Full documentation on the SRED program: https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program.html

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
