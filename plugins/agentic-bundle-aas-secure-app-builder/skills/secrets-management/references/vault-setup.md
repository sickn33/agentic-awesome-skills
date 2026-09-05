# Vault access and rotation checklist

## Inputs

Identify the deployment, secrets engine mount/version, workload identity, secret owner and rotation consumer.

## Procedure and verification

Separate disposable development mode from production. For production, verify authenticated TLS, storage, recovery procedures, audit access and least-privilege policies using the installed version's documentation. Prefer workload identity with short-lived credentials. Test allowed and denied paths with synthetic values; rotate in staging, verify consumers switch, then revoke the old credential only after successful validation.

## Limitations

Never use a development root token for deployment or print values to test retrieval. Rotation is a coordinated state transition with rollback, not just overwriting a secret field.
