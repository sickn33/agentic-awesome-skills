# AAS web tooling glob matcher

This private fork is based on the MIT-licensed Picomatch 4.0.7 npm artifact at upstream commit `6bb40679c218cefba5d4e9662408c5fdf699a8bb`. Its npm integrity is `sha512-qcJu88Q2IWqJsDD529JKMdwGm/dvInW4HvQnRwiH9JtihJvzGOscDtHE3x1pBKeUOTysQ8kVmLnJ2kJu7yhcGA==`.

The parser rejects both repeated extended glob operators at group creation. Standard wildcards, globstars, braces, and non-repeating extended groups retain their upstream behavior. Rejecting repeated groups removes the feature affected by GHSA-fc5q-39xc-vjpf from this web tooling dependency. The local package has its own identity and preserves the upstream license. Replace this dependency when upstream publishes a verified fix.

The bracket-aware unescape routine uses two forward-only cursors and preserves upstream behavior. It resolves CodeQL alert 219 without changing the scan options.
