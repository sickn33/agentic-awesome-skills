---
name: issues
description: Interact with GitHub issues - create, list, and view issues.
allowed-tools: Bash(gh *)
risk: unknown
source: community
metadata:
  author: Shpigford
  version: "1.0"
---

Interact with GitHub issues - create, list, and view issues.

## When to Use
- The user wants to create, list, inspect, or otherwise work with GitHub issues.
- The task involves issue intake or repository issue management through the GitHub CLI workflow.
- You need a guided issue flow that gathers titles, descriptions, and action selection before running commands.

## Instructions

This command helps you work with GitHub issues using the `gh` CLI.

### Step 1: Determine Action

Use AskUserQuestion to ask what the user wants to do:

**Question:**
- question: "What would you like to do with GitHub issues?"
- header: "Action"
- multiSelect: false
- options:
  - label: "Create new issue"
    description: "Open a new issue with title, body, and optional labels"
  - label: "List issues"
    description: "View open issues in the current repository"
  - label: "View issue"
    description: "See details of a specific issue by number"

---

## If "Create new issue" selected:

### Step 2a: Get Issue Title

Use AskUserQuestion to get the issue title:

**Question:**
- question: "What's a short, scannable title for this issue? Keep it brief (5-10 words max) - details go in the body. (Use 'Other' to type your title)"
- header: "Title"
- multiSelect: false
- options:
  - label: "I'll type a title"
    description: "Enter a concise title like 'Login button unresponsive' or 'Add dark mode support'"

**Title guidelines:**
- Keep titles SHORT and scannable (5-10 words max)
- Good: "Fix broken password reset flow"
- Bad: "When I try to reset my password and click the button nothing happens and I get an error"
- The description/body is where details belong, not the title

If the user provides a long title, help them shorten it and move the details to the body.

### Step 3a: Get Issue Body

Use AskUserQuestion to gather the issue body content:

**Question 1 - Issue type context:**
- question: "What type of issue is this?"
- header: "Type"
- multiSelect: false
- options:
  - label: "Bug"
    description: "Something broken that needs fixing"
  - label: "Enhancement"
    description: "Improvement to existing functionality"
  - label: "New feature"
    description: "Brand new functionality"
  - label: "Task"
    description: "General work item or chore"

**Question 2 - Description:**
- question: "Now provide the full details. This is where you explain context, background, and specifics that didn't fit in the title. (Use 'Other' to type your description)"
- header: "Description"
- multiSelect: false
- options:
  - label: "I'll describe it in detail"
    description: "Provide context, steps, examples, and any relevant information"

The user will select "Other" here to provide their full description.

**Description guidelines:**
- This is where ALL the detail goes - be thorough
- Include context: what were you doing, what's the background?
- Include specifics: error messages, URLs, versions, etc.
- The more detail here, the better - unlike the title which should be brief

**Question 3 - For bugs, ask about reproduction:**
If issue type is "Bug", use AskUserQuestion:

- question: "Can you provide steps to reproduce this bug? (Use 'Other' to type steps)"
- header: "Repro steps"
- multiSelect: false
- options:
  - label: "Provide steps"
    description: "I'll describe how to reproduce the issue"
  - label: "Not reproducible"
    description: "The bug is intermittent or hard to reproduce"

**Question 4 - Expected vs actual behavior (for bugs):**
If issue type is "Bug", use AskUserQuestion:

- question: "What did you expect to happen vs what actually happened? (Use 'Other' to describe)"
- header: "Behavior"
- multiSelect: false
- options:
  - label: "Describe behavior"
    description: "I'll explain expected vs actual behavior"

### Step 4a: Get Labels (Optional)

Use AskUserQuestion to select labels:

- question: "Which labels should we add? (if any)"
- header: "Labels"
- multiSelect: true
- options:
  - label: "bug"
    description: "Something isn't working"
  - label: "enhancement"
    description: "New feature or request"
  - label: "documentation"
    description: "Improvements to docs"
  - label: "good first issue"
    description: "Good for newcomers"

### Step 5a: Create the Issue

Construct the issue body based on the type:

**For Bug reports:**
```
## Description
[User's description]

## Steps to Reproduce
[User's reproduction steps or "Not easily reproducible"]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]
```

**For Feature requests/Enhancements:**
```
## Description
[User's description]

## Use Case
[Why this would be useful]
```

**For Tasks/Other:**
```
## Description
[User's description]
```

Run the gh command to create the issue:
```bash
gh issue create --title "[title]" --body "[constructed body]" --label "[labels]"
```

Report the issue URL back to the user.

---

## If "List issues" selected:

### Step 2b: Filter Options

Use AskUserQuestion to determine filtering:

- question: "How would you like to filter issues?"
- header: "Filter"
- multiSelect: false
- options:
  - label: "All open issues"
    description: "Show all open issues"
  - label: "Assigned to me"
    description: "Issues assigned to the current user"
  - label: "Created by me"
    description: "Issues I created"
  - label: "With specific label"
    description: "Filter by a label"

If "With specific label" selected, use AskUserQuestion:

- question: "Which label to filter by? (Use 'Other' for custom label)"
- header: "Label"
- multiSelect: false
- options:
  - label: "bug"
    description: "Bug reports"
  - label: "enhancement"
    description: "Feature requests"
  - label: "documentation"
    description: "Documentation issues"

### Step 3b: List Issues

Run the appropriate gh command:
- All open: `gh issue list`
- Assigned to me: `gh issue list --assignee @me`
- Created by me: `gh issue list --author @me`
- With label: `gh issue list --label "[label]"`

Display the results in a clean format.

---

## If "View issue" selected:

### Step 2c: Get Issue Number

Use AskUserQuestion:

- question: "Which issue number would you like to view? (Use 'Other' to enter the number)"
- header: "Issue #"
- multiSelect: false
- options:
  - label: "Enter issue number"
    description: "I'll type the issue number"

### Step 3c: View Issue

Run: `gh issue view [number]`

Display the issue details including title, body, labels, assignees, and comments.

---

## Error Handling

If `gh` command fails:
1. Check if user is authenticated: `gh auth status`
2. If not authenticated, inform user to run `gh auth login`
3. Check if in a git repository with a GitHub remote
4. Report specific error message to user

## Important Notes

- **Titles should be succinct** (5-10 words) - if a user provides a long title, help shorten it and move details to body
- **Bodies should be detailed** - encourage users to provide thorough context, steps, and specifics
- Always confirm the issue was created successfully by showing the URL
- For issue bodies, preserve user's formatting and newlines
- If the user provides minimal information, that's okay - create the issue with what they gave
- Use HEREDOC for the body to preserve formatting:
  ```bash
  gh issue create --title "Title" --body "$(cat <<'EOF'
  Body content here
  EOF
  )"
  ```

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
