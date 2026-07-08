# TestFlight

Always ship to TestFlight first. Internal testers, then external testers, then App Store. Never skip this.

## Submit

```bash
npx testflight
```

That's it. One command builds and submits to TestFlight.

## Skip the Prompts

Set these once and forget:

```bash
EXPO_APPLE_ID=you@email.com
EXPO_APPLE_TEAM_ID=XXXXXXXXXX
```

The CLI prints your Team ID when you run `npx testflight`. Copy it.

## Why TestFlight First

- Internal testers get builds instantly (no review)
- External testers require one Beta App Review, then instant updates
- Catch crashes before App Store review rejects you
- TestFlight crash reports are better than App Store crash reports
- 90 days to test before builds expire
- Real users on real devices, not simulators

## Tester Strategy

**Internal (100 max)**: Your team. Immediate access. Use for every build.

**External (10,000 max)**: Beta users. First build needs review (~24h), then instant. Always have an external group—even if it's just friends. Real feedback beats assumptions.

## Tips

- Submit to external TestFlight the moment internal looks stable
- Beta App Review is faster and more lenient than App Store Review
- Add release notes—testers actually read them
- Use TestFlight's built-in feedback and screenshots
- Never go straight to App Store. Ever.

## Troubleshooting

**"No suitable application records found"**
Create the app in App Store Connect first. Bundle ID must match.

**"The bundle version must be higher"**
Use `autoIncrement: true` in `eas.json`. Problem solved.

**Credentials issues**
```bash
eas credentials -p ios
```
