# FastAPI endpoint implementation

## Inputs

Installed FastAPI/Pydantic/SQLAlchemy versions, endpoint contract, identity model and test database.

## Procedure

1. Define request and response schemas from the user journey. Keep ownership and permission decisions server-side and separate from serialization.
2. Reuse application lifespan and dependency patterns. Bound outbound timeouts; avoid blocking calls in async handlers and avoid sharing mutable database sessions across concurrent tasks.
3. Test success, invalid input, unauthorized access and persistence failure. Verify response fields, transaction rollback and client-visible errors before updating the API contract.

## Worked example

Create an invoice endpoint with an idempotency requirement. Repeating the same request must not create a second invoice; a different tenant must not retrieve the first.

## Verification and handoff

Report the actual files or configuration changed, checks performed, observed results and any untested environment. Keep the original inputs and evidence sufficient to reproduce the conclusion.

## Limitations

Background work and external effects require their own retry and idempotency design. Schema validation is not authorization.
