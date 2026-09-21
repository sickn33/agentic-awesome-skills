# TestFlight

For a SwiftUI/UIKit app with no React Native runtime, start with [native-ios.md](native-ios.md). EAS can build and submit it without adding Expo or React Native. For an established Expo/React Native app, `npx testflight` is also a convenient setup flow.

## Submit an identified build

Use a store-distribution profile and record the source revision and returned build ID:

```bash
eas build --platform ios --profile testflight --no-wait --non-interactive
# After checking that build's result:
eas submit --platform ios --profile testflight --id BUILD_ID --non-interactive
```

Use the project's actual profile name. If `--non-interactive` exposes missing first-time credentials, configure them with `eas credentials -p ios`; repeated noninteractive retries will not complete that setup. Keep an existing EAS project, Apple team, bundle ID, and App Store Connect app record aligned.

`eas build --auto-submit` can submit the finished build with its matching submit profile. For separate jobs, pass the explicit build ID rather than selecting whichever unrelated build is newest.

## Read status without reopening a submission

The following commands were verified with EAS CLI 23.2.0, including read-only checks of a completed iOS submission and its actual TestFlight state:

```bash
eas submit:list --platform ios --json
eas submit:view SUBMISSION_ID --json
eas submit:status --platform ios --profile testflight --json --non-interactive
```

Use the project's actual profile. `submit:view` reports the EAS job; `submit:status` reads App Store Connect and reports App Store versions and TestFlight processing/internal/external states. The latter needs an App Store Connect API key from the selected profile, environment, or existing EAS credentials. In noninteractive mode, a missing key is a setup error; it does not mean the build failed or does not exist. A beta state alone does not establish that a particular tester has access.

Older CLIs such as 18.6.0 lack these commands. Check `eas --version` and command help, or use a pinned `npx eas-cli@23.2.0` invocation. Prefer the supported CLI over importing its internal Node modules or writing private GraphQL queries. An errored `submit:view --json` result can still omit the underlying error; follow its log URLs to diagnose it.

## Track the release state

| Verified state | What it establishes | Next check |
| --- | --- | --- |
| EAS build finished | An artifact was produced | Confirm the intended build ID, source revision and store-distribution profile |
| Submission queued | EAS scheduled an upload | Follow the returned submission URL and worker logs |
| Apple upload/processing succeeded | Apple accepted the binary | Check TestFlight availability and any export-compliance work |
| Build assigned and available to testers | The intended testers can install it | Verify the beta app on a device |
| App Review approved and released | Public App Store distribution | Only part of an authorized production release |

Do not report an upload as finished based only on `--no-wait` returning successfully. If a submission fails with an empty summary, inspect its worker logs; the underlying Apple error may be there. Report the exact version/build and the furthest state actually verified.

[Apple's TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/) describes tester limits and beta review. Processing, compliance, group assignment and invitations affect availability; do not promise immediate installation. Internal testing and external beta review are separate from public App Review. Add builds to existing requested groups when authorized; do not create invitations or expand distribution implicitly.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Required agreement missing or expired | The Account Holder must resolve it for the app's Apple team. Retrying or rebuilding does not accept an agreement. |
| App missing in App Store Connect | Check the selected organization and `ascAppId` against the native bundle identifier. One login may belong to several teams. |
| Duplicate build number despite EAS auto-increment | Inspect the archive's `CFBundleVersion`; for native Swift, check explicit versus generated plist configuration in `native-ios.md`. |
| Invalid large app icon / alpha channel | For the default (Any/light) AppIcon PNG, remove the alpha channel and rebuild. Even an all-opaque RGBA file can fail. Check the icon selected by that profile; preserve transparency in dark variants and Icon Composer layers. See the icon checks in `native-ios.md`. |
| Upload accepted but no installable build | Check processing/compliance state and the intended tester group's build assignment in App Store Connect. |
| Optional release-notes feature rejected by the EAS plan | Complete the required upload without that optional parameter and use App Store Connect for notes. Do not rebuild a valid binary or change the account plan for this. |

After an archive-content failure, fix the cause, validate the new artifact and submit its exact ID. After an account/submission-only failure, reuse the valid existing artifact once the account issue is resolved. Keep the requested release scope; uploading a beta does not authorize a public App Store release.

EAS CLI 23.2.0 also provides `eas submit:retry SUBMISSION_ID --json --non-interactive`. Check `submit:view` for retry eligibility and diagnose the cause first. Retrying an unchanged archive cannot fix its build number or icon; submit the corrected build instead. Use retry only when repeating the existing authorized upload is appropriate.

Use [EAS Submit for iOS](https://docs.expo.dev/submit/ios/) for current CLI/configuration guidance, and [Apple's internal-tester guide](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/) for group setup. EAS upload success alone does not show that a particular tester has access.
