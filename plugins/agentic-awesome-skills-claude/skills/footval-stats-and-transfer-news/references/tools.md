# FootVal MCP tools — reference

Attributed snapshot of server tool registrations (server v1.0.0); verify against the connected server before use. Endpoint:
`https://api.footval.com/mcp` (Streamable HTTP, OAuth sign-in).

Documented annotations (hints, not enforcement): `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`.
This snapshot associates `openWorldHint: true` with API-Football match tools; `false` is not a general guarantee of no remote interaction or no data disclosure.
Other tools are documented as reading FootVal's database. Results are documented as having a one-line text summary, the same data as
`structuredContent`, and an interactive card in clients that support MCP Apps.

## `search_football` — Search FootVal

Find players, clubs, leagues and national teams by name (accents optional). Returns ids for the other tools plus each match's FootVal value. Use it when a name is ambiguous or partial; get_player, get_club, get_league and get_national_team also accept plain names directly.

Open-world: **no**

| Argument | Type | Default | Notes |
|---|---|---|---|
| `query` | string (≤ 80 chars) | **required** | A name or part of one, e.g. "Güler", "Galatasaray", "Serie A", "Brazil" |

## `find_players` — Find players

Scout players by attributes: league, club, national team, position, age range, preferred foot and value range, sorted by FootVal value, market value, mispricing (undervalued/overvalued), youth, performance percentile or recent rise. Returns each player's FootVal value next to the market value.

Open-world: **no**

| Argument | Type | Default | Notes |
|---|---|---|---|
| `league` | string (≤ 60 chars) | — | League code or name, e.g. "GB1", "TR1", "Premier League", "Süper Lig" |
| `club` | string (≤ 80 chars) | — | Club id or name |
| `nation` | string (≤ 60 chars) | — | National team: ISO-3 code (TUR, ESP, BRA, ENG…) or English name |
| `position` | `GK` · `DF` · `MF` · `FW` · `CB` · `LB` · `RB` · `DM` · `CM` · `AM` · `LM` · `RM` · `LW` · `RW` · `SS` · `ST` | — | A group (GK/DF/MF/FW) or a specific position code |
| `min_age` | integer (15–45) | — |  |
| `max_age` | integer (15–45) | — |  |
| `foot` | `left` · `right` · `both` | — |  |
| `min_value` | number (≥ 0) | — | Minimum FootVal value in EUR |
| `max_value` | number (≥ 0) | — | Maximum FootVal value in EUR |
| `sort` | `value` · `market_value` · `undervalued` · `overvalued` · `youngest` · `performance` · `rising` | `"value"` |  |
| `limit` | integer (1–25) | `10` |  |

## `get_player` — Player valuation profile

A player's full FootVal profile: our estimated transfer value next to the market value and the gap between them, the factor breakdown that explains it (performance, age potential, contract, durability, reputation, form), value history, recent season stats, transfer history, contract and similar players. Accepts a player id or a name.

Open-world: **no**

| Argument | Type | Default | Notes |
|---|---|---|---|
| `player` | string (≤ 80 chars) | **required** | Player id (from search) or name, e.g. "Arda Güler", "Lamine Yamal" |

## `compare_players` — Compare players

Side-by-side comparison of 2–4 players: FootVal value vs market value, age, position, performance percentile, every valuation factor and last-season output. Accepts ids or names.

Open-world: **no**

| Argument | Type | Default | Notes |
|---|---|---|---|
| `players` | list of string (≤ 80 chars) (2–4 items) | **required** | 2–4 player ids or names |

## `get_rankings` — Player rankings

Ranked player lists from FootVal's valuations: top_value (most valuable), undervalued / overvalued (biggest gap between our value and the market value, players worth €10M+), risers / fallers (largest recent value moves) and wonderkids (21 and under). Optional filters: league, national team, position group, maximum age.

Open-world: **no**

| Argument | Type | Default | Notes |
|---|---|---|---|
| `type` | `top_value` · `undervalued` · `overvalued` · `risers` · `fallers` · `wonderkids` | `"top_value"` |  |
| `league` | string (≤ 60 chars) | — | League code or name |
| `nation` | string (≤ 60 chars) | — | National team ISO-3 code or English name |
| `position` | `GK` · `DF` · `MF` · `FW` | — |  |
| `max_age` | integer (15–45) | — |  |
| `limit` | integer (1–25) | `10` |  |

## `list_leagues` — List leagues

Every league FootVal values (the European first divisions plus MLS and the Saudi Pro League): strength tier, clubs, players and total squad value by FootVal and by the market. Use the returned codes with get_league, get_standings, find_players and get_rankings.

Open-world: **no**

No arguments.

## `get_league` — League overview

One league's clubs ranked by FootVal squad value (with the market's figure and the gap), plus its most valuable players. For the live points table use get_standings.

Open-world: **no**

| Argument | Type | Default | Notes |
|---|---|---|---|
| `league` | string (≤ 60 chars) | **required** | League code or name, e.g. "GB1", "Premier League", "TR1", "Süper Lig" |

## `get_club` — Club squad & value

A club's squad with every player's FootVal value, market value and the gap between them, plus the squad totals (value, market value, average age). Accepts a club id or name.

Open-world: **no**

| Argument | Type | Default | Notes |
|---|---|---|---|
| `club` | string (≤ 80 chars) | **required** | Club id (from search) or name, e.g. "Galatasaray", "Real Madrid" |

## `get_national_team` — National team squad

The strongest squad FootVal can assemble for a national team (3 GK, 8 DF, 8 MF, 7 FW — top players by value among those who represent the nation), with squad value and average age. Accepts an ISO-3 code or an English country name.

Open-world: **no**

| Argument | Type | Default | Notes |
|---|---|---|---|
| `nation` | string (≤ 60 chars) | **required** | ISO-3 code (TUR, ESP, BRA, ENG, GER…) or English name ("Turkey", "Brazil") |

## `get_matches` — Scores & fixtures

Live scores, results and fixtures across the competitions FootVal follows (top European leagues, MLS, Saudi Pro League, European club cups, domestic cups, national-team tournaments). Choose live, today, yesterday, tomorrow or a date, and optionally filter by competition or team. Returns match ids for get_match.

Open-world: **yes (API-Football)**

| Argument | Type | Default | Notes |
|---|---|---|---|
| `when` | string (≤ 20 chars) | `"today"` | "live", "today", "yesterday", "tomorrow" or a date as YYYY-MM-DD (UTC) |
| `competition` | string (≤ 60 chars) | — | Competition code or name, e.g. "GB1", "UCL", "Süper Lig" |
| `team` | string (≤ 60 chars) | — | Only matches involving this team (part of its name) |

## `get_match` — Match centre

One match in detail: score and status, the event timeline (goals, cards, substitutions, VAR), team statistics (possession, shots, xG when available…) and line-ups with player ratings. Take match ids from get_matches or get_team_fixtures.

Open-world: **yes (API-Football)**

| Argument | Type | Default | Notes |
|---|---|---|---|
| `match_id` | integer | **required** | Match id from get_matches / get_team_fixtures |

## `get_team_fixtures` — Team fixtures

A club's or national team's next or most recent matches in any competition, with kick-off times, scores and match ids. Set national=true to prefer the national team when a club shares the name.

Open-world: **yes (API-Football)**

| Argument | Type | Default | Notes |
|---|---|---|---|
| `team` | string (≤ 60 chars) | **required** | Team name, e.g. "Galatasaray", "Real Madrid", "Turkey" |
| `direction` | `next` · `last` | `"next"` |  |
| `count` | integer (1–10) | `5` |  |
| `national` | boolean | — | true = national team, false = club |

## `get_standings` — League table

The live points table of a league or competition (played, won, drawn, lost, goals, goal difference, points, recent form and qualification/relegation zones). Current season by default.

Open-world: **yes (API-Football)**

| Argument | Type | Default | Notes |
|---|---|---|---|
| `league` | string (≤ 60 chars) | **required** | League code or name, e.g. "GB1", "Premier League", "TR1", "UCL" |
| `season` | integer (2010–2100) | — | Season start year, e.g. 2025 for 2025/26 (default: current) |

## `get_stat_leaders` — Statistics leaders

Season leaderboards — top scorers, assist leaders, goals + assists, minutes or appearances — for one competition (a league, the Champions League, a domestic cup), all national-team competitions ("NT"), or every competition combined ("all"). Includes players outside FootVal's tracked leagues.

Open-world: **no**

| Argument | Type | Default | Notes |
|---|---|---|---|
| `metric` | `goals` · `assists` · `contributions` · `minutes` · `appearances` | `"goals"` |  |
| `competition` | string (≤ 60 chars) | `"all"` | "all" (every competition combined), "NT" (national teams), or a competition code/name: GB1, ES1, IT1, L1, FR1, TR1, UCL, UEL, FAC… |
| `season` | integer (2010–2100) | — | Season start year (2025 = 2025/26). Default: the latest season with data |
| `position` | `GK` · `DF` · `MF` · `FW` | — |  |
| `limit` | integer (1–25) | `10` |  |

## `get_transfer_news` — Transfer news

Latest transfer news and rumours: completed deals and reported moves with the fee, the clubs involved, how reliable the report is and when it broke. Optionally filter by a player or club name, or by confirmed deals vs rumours.

Open-world: **no**

| Argument | Type | Default | Notes |
|---|---|---|---|
| `query` | string (≤ 60 chars) | — | Player or club name to filter by |
| `type` | `all` · `confirmed` · `rumors` | `"all"` |  |
| `limit` | integer (1–20) | `8` |  |
