# Technology decision guide

Compare technologies only after identifying the actual constraints. Record the exact evaluated release and primary documentation date; do not choose a framework because it appears in a default stack.

Decision record:

```text
Problem and measured constraint:
Existing platform and team skills:
Options (including no change):
Required functionality and compatibility:
Failure/recovery, data and authorization boundaries:
Operating cost, maintenance and licensing:
Validation workload and actual result:
Selected option and rejected alternatives:
Migration/rollback limits and owner:
Unknowns and reconsideration trigger:
```

Keep evidence and assumptions separate. A proof of concept must include representative failures and relevant integration checks; a demo or an empty analyzer result does not establish throughput, safety or supportability. Pin dependencies after verifying compatibility and license obligations; installation and external account changes require user authority.
