# Backend security implementation

## Inputs

Endpoint code, request schema, identity/tenant model, persistence adapter and existing tests.

## Procedure

1. Trace each untrusted field from request to database, outbound call and response. Record the resource owner separately from the authenticated caller.
2. Implement allowlisted input fields, parameterized persistence and server-side resource authorization before side effects. Keep error responses generic and logs free of request bodies or credentials.
3. Exercise anonymous, wrong-role, wrong-tenant, malformed and oversized requests in a disposable test environment. Check the database and outbound-call mocks to prove denied requests did not act.

## Worked example

A user can edit another tenant's invoice by changing its ID. Add a tenant-bound lookup and test own-tenant success plus cross-tenant denial with unchanged stored data.

## Verification and handoff

Report the actual files or configuration changed, checks performed, observed results and any untested environment. Keep the original inputs and evidence sufficient to reproduce the conclusion.

## Limitations

An authenticated request is not proof of resource ownership. A passing scanner is not proof that authorization works.
