# Django feature implementation

## Inputs

Installed Django/DRF versions, models, permissions, database backend and existing test commands.

## Procedure

1. Trace the endpoint through middleware, view, serializer and queryset. Reuse the project's authentication and transaction boundaries.
2. Implement the smallest change and a migration only when needed. Scope list and detail querysets by tenant; validate writes and use server-owned fields for ownership.
3. Test authorized and unauthorized access, validation failure and rollback. Inspect query count and migration behavior on a disposable database before preparing deployment.

## Worked example

Add a project notes endpoint. Test that another tenant cannot list, retrieve or create notes in that project; verify the allowed user can.

## Verification and handoff

Report the actual files or configuration changed, checks performed, observed results and any untested environment. Keep the original inputs and evidence sufficient to reproduce the conclusion.

## Limitations

Async views do not make synchronous database work non-blocking. Check the installed framework's supported async and transaction behavior.
