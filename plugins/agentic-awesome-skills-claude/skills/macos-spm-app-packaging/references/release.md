# Release and notarization notes

## Notarization requirements
- Install Xcode Command Line Tools (for `xcrun` and `notarytool`).
- Provide App Store Connect API credentials:
  - `APP_STORE_CONNECT_API_KEY_P8`
  - `APP_STORE_CONNECT_KEY_ID`
  - `APP_STORE_CONNECT_ISSUER_ID`
- Provide a Developer ID Application identity in `APP_IDENTITY`.

## Sparkle appcast (optional)
- Install Sparkle tools so `generate_appcast` is on PATH.
- Provide `SPARKLE_PRIVATE_KEY_FILE` (ed25519 key).
- The appcast script uses your zip artifact to create an updated `appcast.xml`.
- Sparkle compares `sparkle:version` (derived from `CFBundleVersion`), so bump `BUILD_NUMBER` for every release.

## Tag and GitHub release (optional)
Use a versioned git tag and publish a GitHub release with the notarized zip (and appcast if you host it on GitHub Releases).

Example flow:
```
git tag v<version>
git push origin v<version>

gh release create v<version> CodexBar-<version>.zip appcast.xml \
  --title "AppName <version>" \
  --notes-file CHANGELOG.md
```

Notes:
- If you serve appcast from GitHub Releases or raw URLs, ensure the release is published and assets are accessible (no 404s).
- Prefer using a curated release notes file rather than dumping the full changelog.
