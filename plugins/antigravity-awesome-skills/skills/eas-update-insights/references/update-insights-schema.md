# `eas update:insights` JSON schema

Complete JSON output shape returned by `eas update:insights <groupId> --json --non-interactive`.

```json
{
  "groupId": "03d5dfcf-736c-475a-8730-af039c3f4d06",
  "timespan": {
    "start": "2026-04-10T00:00:00.000Z",
    "end": "2026-04-17T00:00:00.000Z",
    "daysBack": 7
  },
  "platforms": [
    {
      "platform": "android",
      "updateId": "019d72ca-...",
      "totals": {
        "uniqueUsers": 500,
        "installs": 990,
        "failedInstalls": 10,
        "crashRatePercent": 1.0
      },
      "payload": {
        "launchAssetCount": 4,
        "averageUpdatePayloadBytes": 1115771
      },
      "daily": [
        { "date": "2026-04-10T00:00:00.000Z", "installs": 182, "failedInstalls": 2 },
        { "date": "2026-04-11T00:00:00.000Z", "installs": 195, "failedInstalls": 1 }
      ]
    },
    {
      "platform": "ios",
      "updateId": "019d72ca-...",
      "totals": { "uniqueUsers": 100, "installs": 1, "failedInstalls": 0, "crashRatePercent": 0 },
      "payload": { "launchAssetCount": 4, "averageUpdatePayloadBytes": 1115771 },
      "daily": [ { "date": "2026-04-10T00:00:00.000Z", "installs": 1, "failedInstalls": 0 } ]
    }
  ]
}
```

## Field reference

| Path | Meaning |
|---|---|
| `groupId` | The update group queried. |
| `timespan.start` / `.end` | UTC ISO timestamps bounding the window. |
| `timespan.daysBack` | Convenience field: size of the window in days. |
| `platforms[]` | One entry per platform the group was published to (`ios`, `android`). |
| `platforms[].updateId` | Platform-specific update ID (distinct from the group ID). |
| `platforms[].totals.uniqueUsers` | Distinct users who ran this update in the window. |
| `platforms[].totals.installs` | Launches / successful installs in the window. |
| `platforms[].totals.failedInstalls` | Crashes / failed installs in the window. |
| `platforms[].totals.crashRatePercent` | `failedInstalls / (installs + failedInstalls) * 100`. Zero when no installs. |
| `platforms[].payload.launchAssetCount` | Number of assets the manifest references. |
| `platforms[].payload.averageUpdatePayloadBytes` | Mean bundle size for the window. |
| `platforms[].daily[]` | Per-day time series of installs and failed installs. |

## `eas update:view <groupId> --insights --json`

The `update:view --insights --json` command wraps the same insights payload:

```json
{
  "updates": [ /* standard update:view entries */ ],
  "insights": { /* same shape as eas update:insights above */ }
}
```
