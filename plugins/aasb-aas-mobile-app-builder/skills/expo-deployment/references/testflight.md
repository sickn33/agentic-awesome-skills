# TestFlight

Use TestFlight for the project’s beta-validation plan before an approved App Store release; internal/external rollout is a project decision.

## Submit

```bash
eas build -p ios --profile production --auto-submit
```

That's it. One command builds and submits to TestFlight.

## Skip the Prompts

Set these once and forget:

```bash
EXPO_APPLE_ID=you@email.com
EXPO_APPLE_TEAM_ID=XXXXXXXXXX
```

The CLI prints your Team ID when you run `eas build -p ios --profile production --auto-submit`. Copy it.

## Why TestFlight First

- Internal testers can receive processed, eligible builds without external Beta App Review
- External testers require one Beta App Review, later builds may still require review
- Catch crashes before App Store review rejects you
- TestFlight crash reports are better than App Store crash reports
- 90 days to test before builds expire
- Real users on real devices, not simulators

## Tester Strategy

**Internal (100 max)**: Your team. Immediate access. Use for every build.

**External (10,000 max)**: Beta users. External builds may require Beta App Review; timing and later review are not guaranteed. Always have an external group—even if it's just friends. Real feedback beats assumptions.

## Tips

- Submit to external TestFlight the moment internal looks stable
- Beta App Review has distinct requirements; do not assume approval or a deadline
- Add release notes—testers actually read them
- Use TestFlight's built-in feedback and screenshots
- Choose the release path based on the app’s reviewed validation plan.

## Troubleshooting

**"No suitable application records found"**
Create the app in App Store Connect first. Bundle ID must match.

**"The bundle version must be higher"**
Use `autoIncrement: true` in `eas.json`. Problem solved.

**Credentials issues**
```bash
eas credentials -p ios
```
