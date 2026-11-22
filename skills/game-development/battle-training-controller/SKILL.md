---
name: battle-training-controller
description: >-
  Write and locally test a battle.training tank-arena controller (fixed-point
  JS, draft/hello/tick) with the official harness before uploading it. Use
  when building or debugging a battle.training bot, or adding a CI test loop
  for one.
category: game-development
risk: safe
source: self
source_type: self
date_added: "2026-11-23"
author: sSenkuuu
tags: [battle-training, game-controller, tank-arena, testing, ci]
---

# battle.training Controller

## Overview

battle.training is a tank-arena game where coding agents write a JavaScript
controller that drafts a squad, then drives it tick by tick. This skill covers
the whole loop: the controller interface, the tactics that make a controller
competitive, local testing against the arena's own engine, and uploading a
version only after the local gate passes and a human approves.

A working reference exists: the `ssenkuuu-bot` demo controller (179 lines,
verified locally at 69.4% over 160 games with the official harness) and the
GitHub Actions test loop that runs it — see Sources below. Do not copy its
numbers as your own; re-run the harness on your controller and report your
own results.

## When to Use

- The user asks to build, improve, or debug a battle.training controller.
- The user asks to test a controller locally before uploading it.
- The user asks to add a CI gate so a bad controller fails the PR instead of
  reaching the ladder.
- Prefer `game-development/web-games` when the task is general browser-game
  development rather than this specific arena.

## Prerequisites

- Node.js 18+ for the local harness and controller tests.
- A battle.training account and API key **only** for the upload step. Never
  put the key in a file that gets committed, and never upload without an
  explicit human decision.
- The reference material: `sSenkuuu/battle-training-action` (controller +
  harness) and the worked CI loop example proposed in
  `cobusgreyling/loop-engineering` (PR #807, open).

## How It Works

### 1. Learn the controller interface

The arena loads the controller as `globalThis.controller` with three hooks.
All coordinates are fixed-point integers: `FP = 65536` per tile, angles in
`FULL = 4096` steps per full turn.

- `draft(h)` — pick the squad. `h.draft` carries `costs`, `roster`, and
  `budget`. Return an array of unit kinds (for example
  `["mbt", "missile", "drone", "scout"]`) or `undefined` to decline.
- `hello(h)` — called once per match. `h.rules` holds per-kind specs
  (`turnRate`, `gun` with `minRange`/`maxRange`/`mode`), `h.map` holds
  `width`, `height`, `terrain` and `spawns`, `h.side` is your side. Cache
  what you need (hill position, spawn point) here, not every tick.
- `tick(o)` — called every tick. `o.units` are your alive units,
  `o.contacts` are spotted enemies, `o.objectives` are the points to hold,
  `o.incoming` are shells landing near you, `o.tick` is the tick number.
  Return `{ units: [...] }` with one order per unit: `steer`, `throttle`,
  `target`, `aimAt`, `fire`.

Terrain tiles are impassable for water, rock, and ruin — check before
steering, or units get stuck. Remember last-known enemy positions (contacts
expire after ~120 ticks) so artillery can shell them after they leave sight.

### 2. Write the controller

Three patterns do most of the work:

- **Squad-wide focus fire.** Pick one target for the whole squad: highest
  threat first, then lowest HP. Every gun aims at the same target.
- **Spread objectives.** Assign one unit per objective, weighted by
  `weight / distance`, and penalise objectives another unit already took.
  Never send the whole squad to the same point.
- **Per-kind roles.** MBT brawls at mid range, missile holds its lock at
  14–34 tiles, drone stays 16+ tiles away and spots, scout caps and
  harasses, artillery shells parked targets from range. Out of ammo or below
  ~22% HP: fall back to the spawn to resupply or survive. Dodge any shell
  landing within ~2.5 tiles.

```javascript
const FP = 65536;
const FULL = 4096;

globalThis.controller = {
  draft(h) {
    const d = h.draft;
    if (!d) return undefined;
    const pick = ["mbt", "missile", "drone", "scout"];
    const cost = pick.reduce((c, k) => c + (d.costs[k] ?? 99), 0);
    return cost <= d.budget && pick.every(k => d.roster.includes(k))
      ? pick.slice()
      : undefined;
  },

  hello(h) {
    this.rules = h.rules;
    this.map = h.map;
    this.side = h.side;
  },

  tick(o) {
    const orders = [];
    for (const u of o.units.filter(u => u.alive)) {
      // Simplest useful behaviour: hold position, shoot the first contact.
      const order = { id: u.id };
      const target = o.contacts[0];
      if (target && u.reload === 0) {
        order.aimAt = [target.x, target.y];
        order.fire = true;
      }
      orders.push(order);
    }
    return { units: orders };
  },
};
```

### 3. Test locally before uploading

Run the controller against the arena's own engine (the official harness)
over many seeds, against the house bots (brawler, holder, random, hunter).
A usable CI gate, as in the loop-engineering example, is 10 seeds with
thresholds: overall win rate >= 50%, vs brawler >= 60%, vs hunter >= 50%,
and 0 tick errors. A controller that throws, times out, or loses to the
house bots fails the PR — fix it locally, do not upload it to find out.

Report the numbers you actually measured: seeds, opponents, win rate per
opponent, tick errors. Do not reuse another controller's numbers.

### 4. Upload only with a human gate

Uploading a new bot version needs the account API key and a human decision.
Keep upload off in CI by default. When the user approves, upload the exact
file that passed the local gate — never a different, untested version.

## Examples

```text
User request: "Build me a battle.training controller that holds the hill and
beats the brawler bot."
Inputs: battle.training account (for upload later), Node.js 18+.
Expected result: a controller.js implementing draft/hello/tick, a local
harness run over 10 seeds reporting overall/brawler/hunter win rates and 0
tick errors, and no upload until the user approves it.
```

## Limitations

- This skill teaches the controller pattern; it does not play matches for
  you and does not guarantee any ladder rank. The demo controller's 69.4%
  is its own measured result, not a promise for a different controller.
- The arena's rules, unit stats, and map layout can change between seasons;
  re-check `h.rules` and `h.map` at `hello` time instead of hard-coding
  last season's numbers.
- The local harness approximates the live ladder: live opponents adapt and
  the matchmaker pairs by rating, so local win rate does not map 1:1 to
  ladder points.
- No live deploy or upload is performed by this skill on its own.

## Safety and side effects

- Reading the controller and running the local harness: no external writes,
  no cost, no credentials needed.
- Upload: sends the controller file to battle.training using the account API
  key. Requires explicit human approval; the key must never be committed or
  printed in logs. CI must keep upload off by default.
- Do not include secrets, API keys, or account credentials in the skill,
  the controller, or any committed file.

## Sources and related skills

- Reference controller and harness: https://github.com/sSenkuuu/battle-training-action
- Worked CI test-loop example: https://github.com/cobusgreyling/loop-engineering/pull/807
  (open PR; the example files live on the PR branch, not on main yet)
- Related skills: `game-development/web-games` (general browser-game
  development), `game-development/2d-games` (2D game patterns).
