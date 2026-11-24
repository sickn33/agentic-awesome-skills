# Delivery: the outbox, the receipt, the claim, and what remains

The mechanics behind `SKILL.md`'s rules, with a schema sketch in Postgres. Names are examples; the constraints are the point.

## Contents

- The outbox
- The receipt
- The claim
- The provider's answer
- Reconciliation
- What remains
- Messages that depend on each other
- Unsubscribe
- Tests

## The outbox

The event's own table carries a trigger that writes the outbox row in the same transaction. Nothing else has to remember to queue an email.

**The trigger runs with the privileges of whoever wrote the row**, so every writer must be able to insert the outbox:

- When the writers are the tables' owner (directly, or through `security definer` functions it owns) or the server's secret key, that already holds, and nothing changes.
- When a restricted role writes events itself, the trigger's insert is refused (with RLS on and zero policies, nothing else may insert), and the event rolls back with it. Make the trigger function `security definer` instead, owned by the outbox's owner, with `search_path = ''`, and pin it by signature in the catalog suite, where the database's posture allows exactly this exception (`supabase-production`). When every insert already runs as the table's owner, the invoker trigger is enough. A function that returns `trigger` can only be called as a trigger.
- Never grant the writer insert on the outbox to make the trigger work: the writer could then queue mail directly.

```sql
create table public.email_events (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid not null,                 -- the row that caused it: an incident, an invoice
  kind        text not null,                 -- 'opened', 'resolved', 'test'
  created_at  timestamptz not null default now(),
  expanded_at timestamptz,                   -- set once its receipts exist
  unique (source_id, kind)                   -- a trigger that fires twice still queues one
);

create function public.queue_email_event() returns trigger
language plpgsql security invoker            -- runs as the writer: see above
set search_path = '' as $$
begin
  insert into public.email_events (source_id, kind)
  values (new.id, 'opened')
  on conflict (source_id, kind) do nothing;
  return new;
end $$;

create trigger incidents_email_event
  after insert on public.incidents
  for each row execute function public.queue_email_event();
```

A trigger that decides *whether* to queue (no "resolved" for something that never alerted) reads state the writer set earlier in the same transaction, so every writer sets that state first.

## The receipt

One row per message, unique per event, channel and recipient, written before any send. **Expanding** an event into its receipts is idempotent: run it twice and the unique constraint adds nothing.

```sql
create table public.email_receipts (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.email_events(id),
  channel_id          uuid not null,
  recipient_id        text not null,         -- the identity provider's user id, never the address
  after_id            uuid references public.email_receipts(id),  -- a follow-up: the first message's receipt
  status              text not null default 'pending'
                      check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts            int  not null default 0,
  next_at             timestamptz not null default now(),
  claim_token         uuid,                  -- whose claim this is; the fence for the mark
  claimed_at          timestamptz,
  provider_message_id text,
  redirected          boolean not null default false,   -- development's discard redirect
  detail              text,                  -- your words, never the provider's response body
  unique (event_id, channel_id, recipient_id)
);
```

- **Members' addresses are read from the identity provider at send time** and never stored. An event that reaches members waits, unexpanded, until the provider can be read; it is never expanded into an empty list.
- **An address that isn't a member's** (one someone typed) is its own channel, stored with when it was confirmed or unsubscribed, and it receives nothing but its confirmation until it is confirmed.
- RLS on with no policies, and the functions executable only by the role the sender runs as (`supabase-production`).

## The claim

```sql
-- p_token: a fresh uuid per pass; p_lease: seconds; p_limit: how many to take.
-- First, in the same function and transaction: a follow-up whose first message failed never sends.
update public.email_receipts r
set status = 'failed', detail = 'its first message was not delivered'
from public.email_receipts f
where r.after_id = f.id and r.status = 'pending' and f.status = 'failed';

with due as (
  select r.id, r.status = 'sending' as unanswered
  from public.email_receipts r
  where ((r.status = 'pending' and r.next_at <= now())
      or (r.status = 'sending' and r.claimed_at < now() - make_interval(secs => p_lease)))
    and (r.after_id is null              -- a follow-up waits until its first is sent
         or exists (select 1 from public.email_receipts f where f.id = r.after_id and f.status = 'sent'))
  order by r.next_at
  for update skip locked
  limit p_limit
)
update public.email_receipts r
set status = 'sending', claim_token = p_token, claimed_at = now()
from due
where r.id = due.id
returning r.id, due.unanswered;
```

- **`for update skip locked`**: two senders never claim the same receipt, and neither waits on the other. So a pass can run any number of times, overlap another sender (during a cut-over from one runtime to another, too), or be missed and caught up.
- **`unanswered` is true for a receipt whose earlier send got no answer**: the sender asks the provider about it before anything else (§ Reconciliation).
- **Send only while the claim is fresh**: if more than *F* seconds have passed since `claimed_at`, the sender drops it and lets the lease run out. A sender that stalled cannot then send something another sender has taken over.
- **Mark only while the claim is yours**: `update … where id = $1 and status = 'sending' and claim_token = $2`. Zero rows updated means the claim was lost; do nothing more.
- **From a runtime whose database connection can drop, claim one at a time.** A sender that claims ten and loses its connection after the first leaves nine receipts in `sending`, each of which must then wait out the lease and be reconciled as if it had been sent.

**The timings fit together.** With lease *L*, freshness *F* and the send request's timeout *T*, the latest moment the provider can accept a message sent under a claim is *F + T* after the claim, and the search is asked no earlier than *L* after it. Make *L − F − T* far larger than the search's settling time. Example: *L* = 300 s, *F* = 120 s and *T* = 10 s leave at least 170 s against a search that settles in seconds.

## The provider's answer

| Answer | Receipt | Next |
|---|---|---|
| accepted, with a message id | `sent`, with the id | nothing |
| refused this message: an invalid address, an inactive recipient (Postmark's error 406: a hard bounce, a complaint or a manual suppression) | `failed`, in your words | nothing: sending it again can't help. Reactivating the address is done in the provider |
| didn't take it: a 429, a 5xx, a refused token, or the request never left (DNS, connection refused) | `pending`, with `next_at` moved out | again after a growing delay (30 s, 1, 2, 5, 10, 30 minutes, then hourly); `failed` after a fixed number of tries |
| no answer: a timeout, a dropped connection, a crash between acceptance and the mark | stays `sending` | once the lease is over, reconciled |

A request that never left the machine (a DNS failure, a refused connection) is safe to retry at once; a request that left and timed out is not, because the provider may have accepted it.

## Reconciliation

- **With an idempotency key** (Resend: `Idempotency-Key`, 24 hours, read 2026-10-25), the retry *is* the reconciliation: send again with the receipt's id as the key, and the provider returns the first answer if it already sent. A retry with the same key and a different body is refused, so compose the message deterministically from the receipt. Past the key's lifetime, it is a new email.
- **Without one** (Postmark, read 2026-10-25), the receipt's id travels in the message's metadata, and the sender asks the provider's outbound search for it: `GET /messages/outbound?metadata_<key>=<receipt id>`.
  - **Found**: mark it `sent` with that message id, noted as reconciled.
  - **Not found**: send it.
  - **The search fails**: leave it for the next pass.
- **Never ask straight after a send.** The search lags acceptance by seconds and flickers between found and not found before it settles (`2026-10-22`, measured against the real API to the discard address). Ask only once the lease is over.
- **Reconcile against the server that sent it.** A search covers one provider server's history, so a token rotation stays on the same server, and a move to a new server waits until no receipt is `sending`.

## What remains

Say this in the product's own email doc, in these words or better ones:

- **A duplicate can still go out** if the provider accepts a request more than *L − F* seconds after the sender gave up on it, if its search has not settled when asked, or (with an idempotency key) if the retry comes after the key expired. None of these has been observed, and none is impossible.
- **A message can be marked `failed` that the recipient got**, when the provider accepted it and every later answer was lost. Rarer still.
- **A channel that cannot be asked** (a chat API with no search) is better made *at most once*: an unanswered send is marked `failed` with words saying it may have arrived, and is never sent again. A missed chat message is cheaper than a repeated one there; for email, the search makes *at least once* nearly free of duplicates.

Nothing in the product's copy, its docs or its terms says "exactly once".

## Messages that depend on each other

When one message only makes sense after another (a "resolved" after an "opened"):

- the follow-up goes **only where the first went**: its receipt is created for a channel and recipient only if the first message's receipt exists for them (pending, sending or sent), and it records that receipt in `after_id`;
- it is **claimed only once the first is `sent`**, so it never arrives first (§ The claim);
- **if the first ended `failed`, the follow-up never sends**: none is created after, and one already waiting is closed `failed` by the claim function itself, before the claim and in the same transaction, so nothing is left `sending` for reconciliation to send. So nobody gets a "resolved" for an "opened" they never received. (`2026-10-23`, a monitoring product: a chat opening whose answer was lost was marked failed, and its recovery could then arrive alone; its review accepted that as Low, with skipping as the fix);
- so a channel added in between gets no lone follow-up.

## Unsubscribe

**The headers**, on every message that can be unsubscribed:

```
List-Unsubscribe: <https://app.example/api/email/unsubscribe/<token>>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

RFC 8058 requires one HTTPS URI, a valid DKIM signature covering both headers, no cookies or authorization on the receiver's `POST`, and no redirect in the answer to it. Its stated reason for the `POST` is that anti-spam software fetches every link in a message's headers.

**The token** is `<receipt id>.<HMAC-SHA256 of the receipt id under the unsubscribe secret>`, base64url.

- It names one receipt, so it stops only what that receipt reached, and nobody can make one for another address without the secret.
- It is deterministic, so a retried send carries the same link, and it does not expire.
- It is checked, in constant time, before any query.
- Rotating the secret breaks every link already sent.

**The routes:**

- **`POST` to the one-click URL** acts only when the body is `List-Unsubscribe=One-Click` (form-encoded or multipart), and answers directly, never with a redirect. It has no Origin check, because it comes from a mail provider's servers; the token is the authority.
- **`GET` to the same URL never acts.** It sends the browser to a page (a `303`) that checks the token before showing anything, says what will stop, and has one button, a form behind the app's own Origin check. No sign-in on either.
- **The visible link** in the footer goes to that page too.

**What it stops**: a member's receipt suppresses that member on that channel; an added address's receipt unsubscribes that channel. The member can turn their own email off and on again inside the app; nobody can turn off another member's. **A confirmation email carries no unsubscribe**: ignoring it is the way to say no, and nothing more is sent to that address.

## Tests

Against a real Postgres with every migration applied, through the sender's real functions and a fake provider that can be told to accept, refuse, fail or hang:

- **a retried send** after a 5xx goes once;
- **a dropped answer** is settled by the search, with no second send;
- **a crash before the provider** is sent on the next pass;
- **several senders racing** over many receipts send each exactly once in the test (the guarantee under test is the claim, not the network);
- **a refusal is not retried**;
- **a stale claim never sends**, and its mark is refused;
- **a follow-up waits** for its first message, and skips a channel the first never reached;
- **a follow-up never sends after its first failed**: created while the first was `pending`, it is closed `failed` once the first fails, and no later pass or reconciliation sends it;
- **the redirect**: development's redirect is recorded on the receipt, and a production build with it set fails;
- **unsubscribe**: a `GET` changes nothing, a `POST` without RFC 8058's body is refused, a forged token is refused before any query.

Then the drill against the real provider, to its discard address (`SKILL.md § Proving it`). It backdates a claim instead of waiting out the lease, so it waits for the search to answer *found* several times in a row before the next pass.
