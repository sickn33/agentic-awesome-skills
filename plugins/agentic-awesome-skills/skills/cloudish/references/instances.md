# Cloudish instances and pricing

What a running container costs, and which sizes exist. One credit is one US
dollar. All prices below already include the platform margin.

## How billing works

- **Billed per second, only while the container is running.** An app with
  no traffic scales to zero after its idle timeout (15 minutes by
  default, see SKILL.md section 4) and costs nothing until the next request
  starts it again.
- **Price per second = CPU + memory + a flat fee**, charged at the size you
  *reserved*, not what the app happens to use:

| Component | Per second | Per hour |
|---|---|---|
| CPU, per core | $0.000007522 | $0.02708 |
| Memory, per GB | $0.000002813 | $0.01013 |
| Flat fee, per running container | $0.000001667 | $0.00600 |

- **Replicas** multiply the price: each running replica is billed as its
  own container.
- **Image builds** are billed the same way for as long as the build runs,
  at the build's own size (default 3 CPU / 5 GB: $0.0023 per
  minute, so a typical 3–5 minute build costs about $0.009).
- **Custom domains** cost $0.01 per active domain per day, billed
  hourly (see SKILL.md section 4).
- **Persistent volumes** are not billed.

## Sizes

Set a size with `cpuCores` and `memoryGb` on the project create/update
call (SKILL.md section 1); the names below are just labels, the API only
takes those two fields. Leave both out to get the default on a new app, or
to keep an existing app's size.
Month = 730 hours, year = 8,760 hours, running the whole time.

| Size | Fields | CPU (cores) | Memory | Per second | Per hour | Per month | Per year |
|---|---|---|---|---|---|---|---|
| `shared` (default) | `"cpuCores": 0.1, "memoryGb": 0.2` | 0.1–1 | 0.2–1 GB | $0.00000298 | $0.0107 | $7.84 | $94.03 |
| `small` | `"cpuCores": 0.5, "memoryGb": 1` | 0.5 | 1 GB | $0.00000824 | $0.0297 | $21.66 | $259.87 |
| `medium` | `"cpuCores": 1, "memoryGb": 2` | 1 | 2 GB | $0.00001481 | $0.0533 | $38.93 | $467.17 |
| `large` | `"cpuCores": 2, "memoryGb": 4` | 2 | 4 GB | $0.00002796 | $0.1007 | $73.48 | $881.78 |

### `shared`: memory and CPU on demand

`shared` (formerly `micro`) is billed for 0.1 CPU and 0.2 GB, but it can use
**up to 1 CPU and up to 1 GB of memory whenever the machine it runs
on has them spare**. The extra is not guaranteed:

- When the machine is busy, the app only gets its reserved 0.1 CPU and runs
  slower. Starting up (the first request after it scaled to zero) is slower
  than on other sizes for the same reason.
- If the app is using more than its reserved 0.2 GB when the machine runs
  short of memory, it can be restarted, and it's the first to be moved to
  make room for other apps.

Good for small APIs, bots, webhooks, and prototypes: a small Go, Express or
FastAPI app. Not a good fit for anything that must not restart, anything
running a database inside the container, or apps that need their full
memory all the time (a Next.js server, Streamlit). Use `small` or larger
for those. Every other size is fully reserved: its CPU and memory are
always there, and it's never restarted to make room for another app.

## What a year costs by usage

Includes the idle timeout after each period of use (15 minutes by default),
since the container keeps running until it expires.

| Usage | Billed hours/year | `shared` | `small` | `medium` | `large` |
|---|---|---|---|---|---|
| Always on | 8,760 | $94.03 | $259.87 | $467.17 | $881.78 |
| 8 h/day, weekdays only | 2,145 | $23.02 | $63.63 | $114.39 | $215.92 |
| 1 h/day | 456 | $4.90 | $13.53 | $24.33 | $45.93 |

Anything that keeps sending requests (uptime monitors, crawlers, a page
that polls) keeps the container running and billed. The idle timeout can
be changed per key, or set to never (`0`) for an always-on container, see
SKILL.md section 4.

Current rates are also available as JSON at `GET https://cloudish.ai/api/v1/pricing`.
