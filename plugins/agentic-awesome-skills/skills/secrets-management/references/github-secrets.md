# GitHub secret handling checklist

## Inputs

Identify the trusted job, required secret names, environment, permitted branches and actual consuming process.

## Procedure and verification

Supply secrets through process environment or an approved credential action, not expression interpolation into shell source. Avoid printing, tracing, encoding or uploading secret values. Limit scope and lifetime; isolate untrusted pull-request jobs. Verify missing-secret failure and inspect test logs using synthetic markers. Review access and rotation ownership.

## Limitations

Masking is a fallback, not authorization to log secrets. An environment name does not by itself establish reviewer rules; inspect the configured protection before relying on it.
