# Privacy and data handling

Fact-Check-X is designed for local, evidence-first operation. It does not add product analytics or telemetry. Third-party websites and the trusted-search service may process data under their own terms.

## Data processed

Depending on the selected workflow, the skill may process:

- the user's original question;
- answers and citations displayed by selected AI websites;
- source URLs, excerpts, screenshots and page evidence;
- structured claims, authority evidence and generated reports;
- a trusted-search API Key used for authority retrieval;
- browser session state created by Playwright or the user's browser.

## Where data goes

- The original question is submitted only to platforms explicitly selected by the user.
- Authority requests send one atomic knowledge point at a time. Platform-specific claims are sent only when they materially differ.
- A valid 深知晓 trusted anchor can exempt an atomic knowledge point from a repeated trusted-search request.
- No external model API is called by the skill. Semantic decomposition and judgment are performed by the current host agent.

## Local storage

- Browser profiles: `~/.fact-check-x/browser-profiles`
- Trusted-search credential: `~/.fact-check-x/credentials/trusted-search-key`
- Run artifacts: the output directory selected for that run

Those locations are never bundled into source archives or Release assets. The repository contains no real session, Cookie, credential, customer record or user report.

## User controls

The user chooses the platforms, the question, the output directory and whether to continue between stages. The user must personally handle passwords, SMS codes, CAPTCHA and other identity checks.

To remove local state, close active browser automation first and delete only the relevant Fact-Check-X profile, credential or run directory after reviewing its contents. Removing a profile may require signing in again. Removing the credential requires trusted-search onboarding again.

## Publication boundary

Before sharing a generated report, inspect it for personal information, confidential questions, sensitive citations and local-only file links. Use the complete report package or uploaded attachments for external delivery; a local path is not a shareable link.
