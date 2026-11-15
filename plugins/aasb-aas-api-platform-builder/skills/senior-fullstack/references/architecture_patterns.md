# Boundary and contract review

Trace a concrete user action from interface to backend and persistence. Document input shape, identity, authorization, domain rule, database operation and response/error shape.

Keep authorization on the server. Validate untrusted input at the boundary, use parameterized queries, and prevent another tenant's IDs from granting access. Separate retryable reads from writes that need idempotency and duplicate detection.

Review failure cases: unauthenticated caller, forbidden tenant, invalid input, missing record, provider timeout and partial completion. Define user-facing interface states and safe recovery before introducing background jobs or new infrastructure. Do not perform destructive migrations or provider transactions during an architecture review.
