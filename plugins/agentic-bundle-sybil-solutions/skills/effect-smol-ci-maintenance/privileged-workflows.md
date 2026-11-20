# Privileged Workflows

- Privileged jobs must not run untrusted repository code with secrets or write
  credentials.
- Validate cross-run data for expected source, identity, type, shape, and
  bounded size before using it in commands, outputs, APIs, or comments.
- Require the intended approval boundary before fork-originated work reaches
  privileged execution.
- Preserve publication and other irreversible operations until completion;
  cancel only replaceable checks and previews.
- Make checkout revision and credential persistence explicit. Account for
  every write permission and credential.

Search current workflows by event, job purpose, action, and permission to find
the nearest precedent for fork approval gates, publication, non-cancelable
concurrency, and validation of cross-run artifacts before privileged use.

Consult current GitHub documentation for event, token, secret, permission,
checkout, artifact, reusable-workflow, and environment semantics. Start with
the workflow events, workflow syntax, and secure-use references.
