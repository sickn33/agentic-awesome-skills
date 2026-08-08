# Supabase migrations

Apply migrations to the production project through the Supabase migration
workflow, never from the public browser key. After applying the read-only
policy, verify with the anonymous key that `SELECT` succeeds while `POST`,
`PATCH`, and `DELETE` each fail and leave the row count unchanged.

The security-report probe row with id
`262d28f5-d931-4b53-b1ab-58e6475061b3` should be removed using the service
role during the approved production change, after preserving any required
incident evidence.
