# Anomaly Detection for Push-Ingested Data

Push volume and freshness data feeds the same anomaly detectors as the pull model.
The detectors don't activate immediately — they need enough historical data to learn
expected behavior before they can alert on deviations.

## Recommended push frequency: hourly

- Push at most **once per hour** — pushing more frequently produces unpredictable detector
  behavior because the training pipeline aggregates data into hourly buckets
- Push **consistently** — gaps of more than a few days delay activation or deactivate
  previously-active detectors

## Freshness detector

The freshness detector learns how often a table is updated and fires when it has not been
updated for longer than expected.

**What it trains on**: consecutive differences (`delta_sec`) between `last_update_time`
values across pushes. A push only counts if `last_update_time` actually changed.

**Requirements to activate:**
| Requirement | Value |
|---|---|
| Minimum samples | 7 pushes where `last_update_time` changed (or coverage ≥ 0.8 for slow tables) |
| Minimum coverage | 0.15 (= `median_update_secs × n_samples / 22 days`) |
| Training window | 35 days |
| Supported update cycle | 5 minutes – 7.7 days |
| Minimum table age | ~14 days on older warehouses |

**Deactivation triggers:**
- No push for **14 days** → `"no recent data"`
- Gap > 7 days in last 14 days, for fast tables (median update ≤ 26.4 hours) → `"gap of over a week in last 2 weeks"`

## Volume detector (Volume Change + Unchanged Size)

Detects unexpected spikes/drops in row count or byte count.

**Requirements to activate:**
| Requirement | Value |
|---|---|
| Minimum samples (daily) | 10 |
| Minimum samples (subdaily, ~12x/day) | 48 |
| Minimum samples (weekly) | 5 |
| Minimum coverage | 0.30 (= `N × median_update_secs / 42 days`) |
| Training window | 42 days |
| Minimum table age | 5 days |
| Regularity check | 75th/25th percentile of update intervals ≥ 0.2 |

**Deactivation**: No hard gap limit, but coverage degrades as the 42-day window advances
without new data. Eventually drops below 0.3 and deactivates.

## Summary table

| | Freshness | Volume Change / Unchanged Size |
|---|---|---|
| Recommended frequency | Hourly | Hourly |
| Maximum frequency | Once per hour | Once per hour |
| Training window | 35 days | 42 days |
| Minimum samples | 7 | 10 (daily) / 48 (subdaily) / 5 (weekly) |
| Minimum coverage | 0.15 | 0.30 |
| Hard deactivation gap | 14 days | No (coverage degrades) |
| Fast-table gap warning | 7 days in last 14 | N/A |

## What to tell customers

When a customer asks "why isn't my anomaly detection working?":

1. **Check detector status** in the MC UI or via GraphQL (`getTable.thresholds.freshness.status`).
   A `"training"` status means not enough data yet. `"inactive"` means a deactivation
   condition was hit — check the reason code.

2. **Verify push frequency** — are they pushing exactly once per hour? Both too-fast and
   too-slow rates cause problems.

3. **Verify that `last_update_time` changes** — for freshness to accumulate training samples,
   each push must carry a *different* `last_update_time` than the previous one. If the table
   hasn't actually updated, the push still arrives but doesn't advance the sample count.

4. **Set realistic expectations** — freshness detectors need about 1–2 weeks of hourly pushes.
   Volume detectors need 10+ days for daily tables, up to 42 days for subdaily tables.
   Anomaly detection is not instant.

5. **Don't push gaps and then resume** — if a customer pauses pushes for a week and then
   resumes, the freshness detector may deactivate. They should keep pushing even when the
   table hasn't changed (just repeat the same `last_update_time`) to maintain coverage,
   even though that specific push won't count as a new freshness sample.
