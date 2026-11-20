# Next.js App Router code review playbook

Use this playbook to review a pull request that changes a route under `app/` or `src/app/`. Start with the changed URL and trace one user action from the page to its data source and back to the screen. The result should tell the author what can break, how to verify it, and which findings should block the merge.

For a review in Claude Code or Codex, use [Next.js App Router Patterns](https://aaskills.tech/skill/nextjs-app-router-patterns/) to inspect routing, component boundaries and data fetching. Use the [Code Review Checklist](https://aaskills.tech/skill/code-review-checklist/) to turn observations into findings. You can also run the review manually using the steps below.

## Review a pull request

1. **Identify the route and version.** Read the installed Next.js version from the lockfile and check the project's cache configuration. List the affected page, layouts, route handlers and server actions. Write down what a visitor should see on a direct visit and after navigating from another page.
2. **Trace the server and client boundary.** Follow imports from each changed `'use client'` entry. Keep database access on the server and check which props reach the client. If only a button needs state, check whether the surrounding layout also needs to ship as client code. [Next.js component boundaries](https://nextjs.org/docs/app/getting-started/server-and-client-components)
3. **Follow reads and writes together.** For each displayed value, identify who can read it, where it is loaded, how long it may be reused and what refreshes it after a mutation. Check that a server action validates its input and authorizes the current user. Verify cache behavior against the installed version and settings.
4. **Exercise the changed journey.** Use the project's production build and start scripts. Visit the route directly, navigate to it through an internal link, perform the action, and revisit it. Check the loading, missing-record and error states affected by the diff. Record which paths you actually tested. [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist)

## Worked example: an edit succeeds but the old title returns

A pull request adds a rename form at `/projects/[id]`. The action writes the new title and the form displays a success message. To review it, rename a test project from “Draft” to “Approved”, navigate back to the project list, then reopen the detail page. Repeat after a reload. Both views should show “Approved”.

If the list still shows “Draft”, record the route, the observed title and the sequence that produced it. Trace the list's read and the action's refresh path before proposing a fix. A regression test should fail on the stale list even when the form itself shows the new title.

## Prompt for a coding agent

> Review this pull request for the installed Next.js App Router version. Start from the changed route. Trace server and client imports, data reads, mutations and refresh behavior. Check direct visits and client navigation. For each finding, give the file and line, user impact, observed evidence and a regression check. List anything you could not verify. Leave the code unchanged.

## What to put in the review

Lead with the highest-impact reproducible finding. For the rename example, a useful report reads “After a successful rename, the list still shows the old title on navigation and reload. The detail page shows the new title. Add a test that renames a project and checks both views.” Add the actual file, line and test output from the pull request. Mark a suspected cause as a hypothesis until the code or a failing test confirms it.
