# Security, Trust, and Antivirus Alerts

## The trust boundary

A skill is instruction content, not an executable process. Copying a `SKILL.md`
does not itself run the commands it contains. The security boundary changes when
an agent loads those instructions and receives permission to use a shell,
network, credentials, filesystem, browser, MCP server, or other tool.

Treat every community skill and every bundled file as untrusted input until you
have reviewed the exact installed revision. A risk label describes intended
capability; it is not a malware verdict or safety certificate. Repository stars,
contributors, Markdown-only packaging, and a commit pin are not substitutes for
review.

## Review before installation

Use an exact selection and inspect it without execution:

```bash
npx agentic-awesome-skills audit --skills <skill-id,skill-id>
npx agentic-awesome-skills --skills <skill-id,skill-id> --dry-run
```

The audit recursively reads the selected skill directories and reports command,
network, credential, filesystem, privileged, destructive, symlink, and binary
signals. Read the files behind every finding and ask your agent to explain them.
Static pattern matching can miss dangerous logic and can flag legitimate
security examples, so a clean report does not prove safety.

For external sources, require a full commit pin or immutable release, download
to a temporary review directory, inspect package scripts and every bundled file,
and approve the final copy separately. Do not pipe remote content into a shell or
clone a moving branch directly into an active agent directory.

## If antivirus flags a skill

Security documentation often contains exploit names, commands, or payload
fragments that signature scanners recognize. A detection in Markdown can be a
correct content detection without showing that a Trojan executed. Do not dismiss
it, but distinguish content from activity:

1. Stop the agent and quarantine or move the flagged skill out of active paths.
2. Record the exact file, detector name, package version, and file hash.
3. Review the file and adjacent bundled content without executing anything.
4. Check agent transcripts, shell history, process logs, downloads, persistence
   locations, credential access, and unexpected filesystem or network changes.
5. Run your operating system's trusted security scan. Rotate credentials only
   when exposure or suspicious activity is plausible; reinstall the system when
   forensic evidence or incident-response guidance justifies it, not solely
   because a text signature matched.
6. Report reproducible findings privately through the process in
   [`SECURITY.md`](../../SECURITY.md). Include evidence of execution or impact
   separately from the flagged text.

## Safer operating defaults

- Install only the skills needed for the task when practical.
- Keep agent permissions least-privileged and avoid administrator access.
- Require current-conversation approval for destructive, privileged, financial,
  account-write, credential, publishing, and offensive-security actions.
- Use disposable environments for offensive or untrusted workflows.
- Preserve logs and backups so actions can be audited and reversed where possible.
