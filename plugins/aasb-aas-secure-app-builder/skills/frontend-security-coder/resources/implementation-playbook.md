# Frontend security implementation

## Inputs

The component, rendering framework, trusted content policy, session design and browser test route.

## Procedure

1. Identify untrusted text, HTML, URLs and cross-window messages. Prefer text rendering; use an established sanitizer only where authored HTML is required.
2. Enforce URL schemes and destination rules. Validate message origin and source. Coordinate server headers and authorization; client validation is only usability feedback.
3. Test an inert markup payload as text, disallowed URL schemes and messages from another origin. Inspect rendered DOM, network effects and console. Preserve zoom and keyboard access.

## Worked example

A profile biography contains markup. Render it as text unless rich text is explicitly required; verify no extra element or request appears and legitimate text remains readable.

## Verification and handoff

Report the actual files or configuration changed, checks performed, observed results and any untested environment. Keep the original inputs and evidence sufficient to reproduce the conclusion.

## Limitations

Frame detection and frame-busting scripts do not replace frame-ancestors response policy. Browser storage is not a safe place for server secrets.
