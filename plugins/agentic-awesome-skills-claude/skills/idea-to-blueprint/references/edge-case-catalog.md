# Edge-case catalog

How to use: for every story, walk each category below and ask the question. If it applies, either reference the global register entry (`EC-<CAT>-nn` in section 15 of the blueprint) with the story-specific expected behaviour, or add a story-level case. Then make sure at least one AC or test covers it. "Not applicable" is a valid answer; "didn't think of it" is not.

Category codes: INPUT · AUTH · DATA · TIME · NET · DEV · CONC · PAY · FILE · MSG · PERM · SEARCH · BIZ · INT · OPS · L10N · SEC · A11Y · IR (Iran-specific) · BOT (messenger bots) · ADMIN

## INPUT — input and validation
- EC-INPUT-01 Empty / whitespace-only / only ZWNJ or invisible characters → treated as empty; field-level error; no request.
- EC-INPUT-02 Maximum length reached / exceeded on paste → hard limit enforced client and server; counter shown; truncation policy explicit.
- EC-INPUT-03 Invisible or control characters pasted (zero-width, RTL marks, tabs) → stripped or rejected before validation.
- EC-INPUT-04 Emoji, combining marks, unusual scripts in names/text → stored and rendered correctly; length counted in graphemes.
- EC-INPUT-05 HTML/script/SQL-looking input → escaped on output, parameterised queries; never executed; shown back verbatim as text.
- EC-INPUT-06 Leading zeros, plus signs, spaces, dashes in numeric identifiers (phone, card, code) → normalised by one shared function; original never stored.
- EC-INPUT-07 Persian/Arabic-Indic digits in numeric fields → normalised to Latin before validation and storage.
- EC-INPUT-08 Arabic ي/ك vs Persian ی/ک in text → normalised for storage and search; display as Persian.
- EC-INPUT-09 Boundary values (0, -1, max int, 1 over the limit, exactly the limit) → explicit expected results.
- EC-INPUT-10 Duplicate submission of the same content (same title twice) → rule stated: allowed, merged, or rejected with copy.
- EC-INPUT-11 Autofill/autocorrect altering input (browser filling email into phone) → validation catches, error names the field.
- EC-INPUT-12 Decimal and thousands separators in money/quantity fields (Persian ٫ ٬ vs , .) → accepted and normalised.

## AUTH — identity, sessions, OTP
- EC-AUTH-01 OTP wrong code n times → attempt limit, lockout duration, copy with remaining attempts.
- EC-AUTH-02 Double tap / double submit → single request (button disabled while pending, server idempotency).
- EC-AUTH-03 Resend before cooldown → blocked client-side; server-enforced; copy shows seconds.
- EC-AUTH-04 Code expired then entered → specific error, offer new code; old code invalid after new one issued.
- EC-AUTH-05 Session expires mid-action (in a form, mid-payment) → draft preserved; re-auth then return to the same step.
- EC-AUTH-06 Same account on two devices → policy: allowed with device list, or single-session with kick-out notice.
- EC-AUTH-07 Phone number recycled by operator / user changes number → account recovery path and ownership rules.
- EC-AUTH-08 Deep link opened while logged out → land on login, then continue to the target.
- EC-AUTH-09 Role or permissions changed while logged in → effective on next request; UI refreshes; no stale privileged actions.
- EC-AUTH-10 Account deleted then same phone/email signs up → clean new account; old data not resurrected (retention rule).
- EC-AUTH-11 Brute force on OTP or password → rate limits per number and per IP; monitoring alert.
- EC-AUTH-12 Sign-in via a channel the user no longer controls (old email) → recovery requires the current primary channel.

## DATA — data and state
- EC-DATA-01 First use, no data → designed empty state with one action.
- EC-DATA-02 Exactly one item (no plural, no "others") → copy and layout handle singular.
- EC-DATA-03 Thousands of items → pagination or virtualisation; response size limit; sort stable.
- EC-DATA-04 Pagination boundaries (exactly page size, last page, item deleted while paging) → no duplicates/gaps; cursors preferred.
- EC-DATA-05 Sort ties → deterministic secondary key.
- EC-DATA-06 Soft-deleted or archived referenced items → how they display in lists, details, exports.
- EC-DATA-07 Orphaned records after deletion → cascade or restrict policy per relation; tested.
- EC-DATA-08 Long text in short layouts → truncation with full text on tap; no overflow breaking RTL layout.
- EC-DATA-09 Migration on live data → backfill plan, reversible, tested against a dump.
- EC-DATA-10 Very long lists in exports (CSV/Excel) → streaming; Persian text encoding correct (UTF-8 with BOM if Excel is a target — verify).
- EC-DATA-11 Duplicate detection rules (same phone twice, same product name) → stated per entity.
- EC-DATA-12 Stale data on screen after another actor changes it → refresh policy; conflict copy.

## TIME — dates, calendars, time zones
- EC-TIME-01 Jalali month lengths and Esfand leap year → library verified; tests for the current and next two years.
- EC-TIME-02 Month/year boundaries in reports ("this month" at 23:59 on the last day) → boundaries computed in Asia/Tehran, stored UTC.
- EC-TIME-03 Week starts Saturday; "this week", weekly reports and pickers follow it.
- EC-TIME-04 DST policy of the target zone (verify current) → no assumptions; tests around historic transitions if any.
- EC-TIME-05 Holidays and closed days (official calendar source verified) → scheduling and reminders respect them.
- EC-TIME-06 Device clock wrong → server time is authoritative for expiries; relative times computed from server timestamps.
- EC-TIME-07 Relative time wording ("۳ دقیقه پیش" vs absolute after 24 h) → one rule.
- EC-TIME-08 Cross-year ranges and reports spanning Nowruz → correct year labels.
- EC-TIME-09 Expiry exactly at boundary (expires_at == now) → inclusive/exclusive stated.

## NET — network and connectivity
- EC-NET-01 Offline at load → cached read view or explicit offline screen; nothing spinning forever.
- EC-NET-02 Offline at submit → draft kept locally; clear copy; retry when back or manual retry.
- EC-NET-03 Request timed out but server completed it → idempotency keys so retry does not duplicate; client reconciles.
- EC-NET-04 Very slow network (2G-class) → payload budgets; skeletons; timeouts with retry; images lazy and sized.
- EC-NET-05 Partial upload / interrupted download → resumable or restart with clear copy; no half-written records.
- EC-NET-06 Server returns 5xx / maintenance → friendly copy, retry, status not blaming the user; error tracked.
- EC-NET-07 API version mismatch (old client, new server) → graceful message, forced update policy for native apps.
- EC-NET-08 Captive portal / blocked host (CDN or fonts blocked in the market) → self-hosted assets; no functional dependency on foreign CDNs.
- EC-NET-09 Retry storms → exponential backoff with jitter; max attempts.

## DEV — devices, browsers, platform
- EC-DEV-01 Small screens (≤ 360 px) and large text settings (200 %) → no clipped primary actions.
- EC-DEV-02 Low-memory Android → no huge lists in memory; images downscaled.
- EC-DEV-03 Browser back/forward and refresh mid-flow → state restored or explicit restart with no data loss.
- EC-DEV-04 Multiple tabs / app instances → last write wins or conflict notice; session shared correctly.
- EC-DEV-05 Notification permission denied → in-app fallback; copy explains how to enable later.
- EC-DEV-06 Dark mode / high contrast OS settings → respected or explicitly forced with reason.
- EC-DEV-07 Keyboard covering the primary button on mobile → layout scrolls; button reachable.
- EC-DEV-08 Old browser/webview versions common in the segment (verify) → feature detection, polyfills, or supported-browsers copy.
- EC-DEV-09 Clipboard and share APIs unavailable → fallback UI.
- EC-DEV-10 PWA install prompt behaviour differs per browser → tested on the segment's browsers; manual install instructions copy.

## CONC — concurrency and idempotency
- EC-CONC-01 Two actors edit the same record → optimistic locking (version field) and conflict copy.
- EC-CONC-02 Double-click on create/pay → idempotency key; one record; UI disables while pending.
- EC-CONC-03 Race on limited inventory/slots → transactional check-and-decrement; clear "just sold out" copy.
- EC-CONC-04 Webhook arrives before the local record is committed → retry/queue; eventual consistency handled.
- EC-CONC-05 Background job runs twice (scheduler overlap) → idempotent jobs; lock or unique key.
- EC-CONC-06 Ordering of events out of sequence (status updates) → monotonic status machine; ignore stale transitions.

## PAY — payments and money
- EC-PAY-01 Gateway redirect never returns (user closes browser after paying) → server-side verification via callback/inquiry; order reconciled; receipt on next visit.
- EC-PAY-02 Callback missing, delayed or duplicated → idempotent handler; inquiry job for pending payments; duplicate callbacks ignored.
- EC-PAY-03 Amount mismatch between request and callback → payment rejected, flagged, alert; user copy: nothing charged / contact support.
- EC-PAY-04 Gateway down or rejects merchant → alternative gateway policy or explicit "temporarily unavailable" with retry; order kept pending with expiry.
- EC-PAY-05 Refunds (full, partial, failed refund) → API availability verified; manual fallback process documented; copy for each state.
- EC-PAY-06 Currency unit and rounding (Toman vs Rial; no decimals) → one conversion function; tests on boundaries; labels always shown.
- EC-PAY-07 Expired invoice / price changed since checkout began → re-quote with copy; no silent charge of a new amount.
- EC-PAY-08 Partial payment / wallet + gateway combinations → state machine explicit.
- EC-PAY-09 Fee and VAT display rules → who pays fees; shown before confirmation.
- EC-PAY-10 Receipts and audit trail → immutable record; downloadable; matches the gateway reference ID.
- EC-PAY-11 Test/sandbox vs production credentials mixed up → startup validation refuses sandbox keys in production.
- EC-PAY-12 Sanctions or blocked service for the market (foreign gateways/processors) → excluded by decision record; verified at build.

## FILE — files and media
- EC-FILE-01 Oversized file → client-side pre-check and server limit; copy with the limit.
- EC-FILE-02 Unsupported or mislabeled type (extension vs magic bytes) → server validates content; rejected with copy.
- EC-FILE-03 Image orientation (EXIF), HEIC/HEIF from iPhones, very large dimensions → normalised, converted, resized.
- EC-FILE-04 Persian/Unicode filenames and spaces → stored under generated keys; original name kept for display.
- EC-FILE-05 Malware or harmful content → scanning policy or restriction of types; never executed/served inline unsafely.
- EC-FILE-06 Storage quota reached / storage service down → clear copy; upload queued or blocked; no dangling references.
- EC-FILE-07 Deleting a file referenced elsewhere → reference check or tombstone.
- EC-FILE-08 Slow upload progress and cancel → progress shown; cancel leaves no partial record.

## MSG — SMS, email, push, in-app messaging
- EC-MSG-01 Provider accepts but never delivers → resend policy; alternative channel; delivery status if the provider offers it.
- EC-MSG-02 Wrong or unreachable number → bounce handling; copy asking to check the number.
- EC-MSG-03 Persian SMS length (Unicode segments) → templates tested against the provider's segment limit; no cut-off codes.
- EC-MSG-04 Duplicate sends (job retried) → dedupe key per message intent.
- EC-MSG-05 Quiet hours / night sends → schedule window per persona; urgent exceptions listed.
- EC-MSG-06 Opt-out / unsubscribe → honoured immediately; transactional vs marketing distinction.
- EC-MSG-07 Email in spam / not delivered → SPF/DKIM verified in ops; in-app copy of the message.
- EC-MSG-08 Push token expired or app uninstalled → token cleanup; no error shown to other users.
- EC-MSG-09 Template placeholders unfilled ("{name}") → render-time validation; test for every template.
- EC-MSG-10 Rate limits at provider → queue with backoff; alert when backlog grows.

## PERM — permissions, privacy, roles
- EC-PERM-01 Role × action matrix enforced server-side, not just hidden in UI → tests per role per endpoint.
- EC-PERM-02 Direct object access by ID (another tenant's record) → 404/403 policy; tests.
- EC-PERM-03 Admin acting on behalf of a user → audit log entry with actor, target, reason.
- EC-PERM-04 PII in logs, error tracking, analytics → redaction rule; tests that scan log output.
- EC-PERM-05 Data export and deletion on request → complete, within stated time; cascades documented.
- EC-PERM-06 Consent for notifications/analytics → recorded with timestamp; revocable.
- EC-PERM-07 Retention limits (OTP codes, sessions, logs, backups) → stated and enforced by jobs.
- EC-PERM-08 Screenshots/previews containing sensitive data (link previews, notification previews) → masked where the platform allows.

## SEARCH — search and lists
- EC-SEARCH-01 Persian normalisation (ی/ک, ZWNJ vs space, diacritics, Arabic vs Persian forms) → indexed and queried normalised.
- EC-SEARCH-02 Zero results → copy with suggestion; filters visible; clear-all.
- EC-SEARCH-03 Typos and partial words → tolerance policy stated (prefix, fuzzy) with limits.
- EC-SEARCH-04 Numbers searched with Persian digits → normalised.
- EC-SEARCH-05 Very common query (single letter) → minimum length or debounce; performance bound.
- EC-SEARCH-06 Results changing while browsing → stable pagination cursors.

## BIZ — business rules and lifecycle
- EC-BIZ-01 Plan/quota limit reached mid-action → copy before the action when predictable; graceful block otherwise.
- EC-BIZ-02 Subscription expires mid-session → grace behaviour; read-only vs blocked; copy.
- EC-BIZ-03 Downgrade with data over the new limit → policy (read-only, archive, delete after notice).
- EC-BIZ-04 Cancel/return after fulfilment started → state machine; who can do it; copy.
- EC-BIZ-05 Time-based cutoffs (order before 20:00) → server time, Asia/Tehran, copy shows the deadline.
- EC-BIZ-06 Price or catalogue changes while a cart/session is open → re-validation at checkout; copy.
- EC-BIZ-07 Minimums and maximums (order minimum, max quantity) → shown before, enforced server-side.
- EC-BIZ-08 Multi-tenant boundaries (a restaurant sees only its data) → tenant scoping in every query; tests.

## INT — integrations and third parties
- EC-INT-01 Service down → fallback per integration card; user copy; degraded mode.
- EC-INT-02 API changed / deprecated endpoint → version pinned; contract tests against sandbox; alert on schema drift.
- EC-INT-03 Rate limits → client-side limiter; backoff; queue.
- EC-INT-04 Sandbox vs production behaviour differences → documented; staging uses sandbox; production smoke checklist.
- EC-INT-05 Secrets rotation → config reload or restart procedure; no secrets in repo; tests that config loads.
- EC-INT-06 Service blocked for the market or by sanctions → excluded or re-verified at build (`[VERIFY-AT-BUILD]`).
- EC-INT-07 Webhook signature invalid or replayed → verify signature and timestamp; reject replays.
- EC-INT-08 Partial success in batch calls → per-item status handled.

## OPS — operations and deployment
- EC-OPS-01 Missing or invalid environment variable → app refuses to start with a clear message (fail fast).
- EC-OPS-02 Migration fails mid-deploy → transactional migrations or documented rollback; deploy aborted; health check fails loudly.
- EC-OPS-03 Rollback to previous release with a newer schema → backward-compatible migrations for one release.
- EC-OPS-04 Backups: taken, encrypted, restore tested → restore drill is a story in an ops epic.
- EC-OPS-05 Disk/log growth → rotation and retention.
- EC-OPS-06 Alerting on error rate, latency, queue backlog, failed jobs → thresholds stated.
- EC-OPS-07 Seed data in production by mistake → guarded scripts.
- EC-OPS-08 Time drift between servers → NTP; tokens tolerate small skew.
- EC-OPS-09 Health endpoint reports dependencies (DB, cache, provider) → used by the platform.

## L10N — localisation and RTL
- EC-L10N-01 RTL layout: mirrored icons, logical properties, scroll direction → visual tests on key screens.
- EC-L10N-02 Mixed-direction strings (Persian + Latin + digits) → bidi isolation; punctuation stays in place.
- EC-L10N-03 Longer Persian strings → no truncation of primary actions; wrapping rules.
- EC-L10N-04 Plural forms and counters → Persian pluralisation rules; "۱ مورد" vs "۵ مورد".
- EC-L10N-05 Digit rendering (Persian vs Latin) consistent per the decision record → tests on every formatted number.
- EC-L10N-06 Font missing/blocked → self-hosted; fallback stack; ZWNJ renders zero-width.
- EC-L10N-07 Date/number/currency formatting through one utility → no ad-hoc formatting in components.
- EC-L10N-08 Untranslated strings leak (English fallback) → test that every key has product-language copy from the copy table.

## SEC — security baseline
- EC-SEC-01 Injection (SQL, command, template) → parameterised/ORM, no string concatenation; tests.
- EC-SEC-02 XSS and unsafe HTML → output encoding; CSP; sanitiser for rich text if any.
- EC-SEC-03 CSRF for cookie-based sessions → tokens or same-site cookies; tests.
- EC-SEC-04 Broken access control → EC-PERM-01/02 tests per endpoint.
- EC-SEC-05 Secrets in repo/logs/client bundle → scanning in CI; env only.
- EC-SEC-06 Dependency vulnerabilities → audit in `check` or CI; policy for updating.
- EC-SEC-07 Brute force and enumeration (does this phone exist?) → uniform responses and timing where it matters; rate limits.
- EC-SEC-08 Security headers and TLS → configured at the edge; verified in an ops story.
- EC-SEC-09 File upload as attack vector → EC-FILE-02/05.
- EC-SEC-10 Session fixation/hijack → rotate on login; secure cookie flags; short-lived tokens with refresh.

## A11Y — accessibility
- EC-A11Y-01 Screen reader: labels, roles, announcements for async changes → per screen.
- EC-A11Y-02 Keyboard-only (web): focus order, trap in dialogs, escape closes → tests.
- EC-A11Y-03 Colour-only meaning (status by colour) → icon or text as well.
- EC-A11Y-04 Text scaling 200 % → layout holds.
- EC-A11Y-05 Motion sensitivity → reduced motion respected.
- EC-A11Y-06 Timeouts (OTP expiry, session) → warning and extension where feasible.
- EC-A11Y-07 Error identification → associated with the field, announced.

## IR — Iran-specific (load when users are Iranian; verify each at research and at build)
- EC-IR-01 Users on VPN → IP geolocation unreliable; never gate features by IP country; language from settings, not IP.
- EC-IR-02 Mobile prefixes and operators → validation by format (11 digits, 09…) not by a hard-coded operator list; MVNOs exist.
- EC-IR-03 National ID check digit → validated when collected; copy explains why it is needed; not required unless a business rule demands it.
- EC-IR-04 Postal code (10 digits) and address structure → fields and validation as the category norm.
- EC-IR-05 Foreign CDNs, fonts, analytics, maps blocked or slow → self-hosted assets; domestic or self-hosted alternatives; no functional dependency on blocked hosts.
- EC-IR-06 Payment through licensed gateways only; e-commerce trust seal requirement flagged as OQ → checkout copy and flows match the gateway's redirect/callback model.
- EC-IR-07 Currency volatility → prices editable quickly by the business persona; no hard-coded prices; historical prices kept on orders.
- EC-IR-08 Weekend Thursday/Friday and official holidays → scheduling, "next business day" logic, support-hours copy.
- EC-IR-09 App distribution → PWA install path and/or domestic Android stores; update strategy without Play Services if unavailable.
- EC-IR-10 Messenger channel availability (Telegram under filtering, domestic messengers) → channel chosen by research; fallback to SMS for critical messages.
- EC-IR-11 Persian text in SMS → Unicode segment limits; codes never split across segments.
- EC-IR-12 Hosting reachability → domain, DNS, TLS and hosting reachable without VPN; verified at build.
- EC-IR-13 Foreign services with sanctions clauses in ToS → excluded or explicitly risk-accepted in a DR.
- EC-IR-14 Jalali everywhere in UI, UTC in storage → single conversion utility; leap-year tests.

## BOT — messenger bots (when the product is or includes a bot)
- EC-BOT-01 Unknown command / free text → helpful fallback with the main options; never silent.
- EC-BOT-02 Message edits/deletes, stickers, voice, forwarded messages → handled or politely declined.
- EC-BOT-03 Group vs private chat behaviour → explicit policy.
- EC-BOT-04 Platform rate limits and flood control → queue; backoff.
- EC-BOT-05 Webhook downtime → missed updates recovered on restart (offset/polling policy).
- EC-BOT-06 Long conversations and state expiry → state machine with timeouts; "start over" always available.
- EC-BOT-07 Keyboard buttons with stale state (user taps an old button) → validate state; explain.
- EC-BOT-08 Blocked bot / user left → cleanup; no repeated failed sends.
- EC-BOT-09 Multiple languages in one chat → language preference per user.

## ADMIN — back-office
- EC-ADMIN-01 Bulk actions partially failing → per-row result; nothing silently skipped.
- EC-ADMIN-02 Destructive admin actions → consequence dialog; audit; undo window where feasible.
- EC-ADMIN-03 Impersonation / support view → read-only by default; audited.
- EC-ADMIN-04 Exports with PII → access controlled; logged.
- EC-ADMIN-05 Filters returning huge result sets → limits; async export.
