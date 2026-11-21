---
name: transactional-email
description: 'Adding transactional or alert email, choosing a provider, ''sent twice'', ''never arrived'': app email sent once, never lost, with one-click unsubscribe.'
risk: critical
source: https://github.com/phuryn/product-engineering
source_repo: phuryn/product-engineering
source_type: official
license: MIT
license_source: https://github.com/phuryn/product-engineering/blob/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/LICENSE.md
author: Pawel Huryn
upstream_commit: 8ebb50bb1b28dc9e8bc669199493e6020b808cc6
date_added: '2026-11-21'
category: development
---

# Transactional email: durable receipts, honest about duplicates

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Adding transactional or alert email, choosing a provider, 'sent twice', 'never arrived': app email sent once, never lost, with one-click unsubscribe.


**Commit messages durably and name the narrow cases that can duplicate them.** A plain "insert, then call the provider" can lose a message or send it twice, depending on where it crashes. This skill covers durable delivery, unsubscribe, environments and domains.

**Apply these mechanics to any provider with an HTTP send API.** They carry to Resend, SES and others; provider differences are stated with their read dates. The identity provider's own email, such as sign-in codes and invitations, is not covered here: it sends that itself.

**Distinguish the event, its messages, their receipts and the sender.** An event is what happened: an incident opened, an invoice paid. A message is one email about it to one recipient. A receipt is the durable row saying what became of that message. The sender turns pending receipts into provider calls, wherever it runs.

## What binds

1. **The event and its pending message commit together.** A trigger on the event's table writes an outbox row in the event's transaction. An event never exists without its pending message, and a rolled-back event never sends. Code that inserts the event and "then queues the email" has a crash window between the two. A restricted writer needs a definer trigger: `references/delivery.md § The outbox`. The outbox row is unique per event and kind, so a trigger that fires twice still queues one.
2. **One receipt per message, unique, written before anything is sent.** The unit is event × channel × recipient, with a unique constraint, so expanding an event into its receipts twice adds nothing. Recipients are resolved at send time, from the identity provider for members, and a receipt holds the member's id, never their address. If the identity provider can't be read, the event waits; it is never expanded into an empty list. → `references/delivery.md § The receipt`
3. **Claim under a lease, send only while the claim is fresh, mark only while it is still yours.** Claim due receipts with `for update skip locked`, so two senders never claim one. A pass may repeat, overlap another, or be missed and caught up later. Send only well inside the lease, preventing a stalled sender from sending a receipt another has taken over. Mark a receipt only while the claim is still yours. → `references/delivery.md § The claim`
4. **Classify the provider's answer, because each answer means something different.**
   - accepted (a message id): `sent`, with the id;
   - refused this message (an invalid address, an inactive recipient): `failed`, in your own words, never retried, because sending it again can't help;
   - didn't take it (a 429, a 5xx, a refused token, or the request never left): back to `pending`, with backoff, and `failed` after a fixed number of tries;
   - no answer (a timeout, a dropped connection, a crash between the provider accepting and your mark): it stays `sending`, and nobody knows whether it went. That case is item 5.
5. **An unanswered send is settled, never resent blind.**
   - **Where the provider takes an idempotency key, send one.** Use the receipt's id. Resend accepts an `Idempotency-Key` header and keeps it for 24 hours: a retry with the same key and body returns the first answer without sending again (Resend's docs, read 2026-10-25).
   - **Without idempotency keys, search the provider before sending again.** Put the receipt's id in the message's metadata and search by it. Postmark has no idempotency key (its support article, read 2026-10-25), so a retried `POST /email` is a second email; `GET /messages/outbound?metadata_<key>=<receipt id>` answers whether it was accepted.
   - **Ask only after the lease has run out.** Never ask straight after sending: search lags acceptance and flickers before settling.
   - Found: mark it `sent` with that id. Not found: send it. The search itself failing: wait.
6. **There is no exactly-once. Name what remains.** A duplicate can still go out if the provider accepts a request long after the sender gave up on it (beyond the lease, or beyond an idempotency key's lifetime), or if the search has not settled by the time it is asked. So the design says *at least once, with duplicates made rare*, and nothing in the product's copy, docs or terms promises more. A channel with no way to ask, such as a chat API without search, is *at most once*. Mark an unanswered send failed, saying it may have arrived, and never send it again. Choose per channel, and write down which. → `references/delivery.md § What remains`
7. **Unsubscribe is one-click by POST, and a GET never acts.** Every message that can be unsubscribed carries `List-Unsubscribe: <https://…/unsubscribe/<token>>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058). → `references/delivery.md § Unsubscribe`
   - **Mail scanners open links.** So the one-click address acts only on a `POST` whose body is `List-Unsubscribe=One-Click`, answers it directly (RFC 8058 forbids a redirect), and needs no cookie or sign-in, because the token is the authority. A `GET` to it goes to a page that checks the token, shows what will stop, and asks.
   - **The token is an HMAC of the receipt's id.** Make it deterministic. A retried send carries the same link, stopping only what that receipt reached. **Rotating its secret breaks every link already sent.** Rotate it only after a leak.
   - The headers must be covered by the message's DKIM signature, or receivers may not offer one-click.
8. **An address someone typed gets one confirmation email, and nothing else until it is confirmed.** The confirmation link carries a random token stored only as a hash, expires (days, not weeks), and is confirmed by a button press, not by opening the link. Confirmation emails have their own sending budget, per member and per workspace, because they are the one email the app sends to an address it does not know.
9. **One provider server (or account, or project) and token per environment.** Development's token never sends to customers, and production's is never in a development file. Rotate a token on the same server: reconciliation searches one server's history, and a new server cannot find what the old one accepted.
10. **Development sends every email to the provider's discard address, and production refuses that setting.** A development-only redirect (Postmark: `test@blackhole.postmarkapp.com`, which accepts and never delivers; Resend: `delivered@resend.dev`, which simulates a delivery) sends alerts, confirmations and tests alike there instead of to their recipient. Each receipt records that it was redirected, and the screen says so. **The production build, and every production deploy of the sender, refuse a non-empty redirect.** A convention alone lets a copied `.env` send every customer's email to one address. The general rule for development-only switches is `environments`.
11. **Disable tracking in every message, not only on the server.** Each send call disables open pixels and rewritten links (Postmark: `TrackOpens: false`, `TrackLinks: "None"`). A later server setting cannot add them. Plain text unless the product needs more. The footer says, in words true for that recipient, why they get the message.
12. **Logs hold ids and counts, never bodies, recipients or the provider's response body.** A receipt holds the provider's error number and your own words for it.

## Setting it up

- **Verify the sender domain in the provider before the first send.** Set SPF, DKIM and the provider's return-path (bounce) record, all DNS-only. Most setups stop at DMARC `p=none` with no reporting. It lets anyone spoof the domain, so rank it as a risk and tighten it once mail flows.
- **A new provider account may be restricted.** Postmark refused mail to other domains with error 412 until the account was approved (observed `2026-10-22`); the code reports that in plain words rather than failing silently.
- **Set the provider token and sender address together or leave both empty.** Generate the unsubscribe secret; it is one of the keys that cannot be replaced without breaking what was already sent (`environments`). The redirect is development-only (item 10).
- **Run the sender anywhere a schedule can call it.** This includes a cron on the app's host, a Worker or a worker. A runtime other than the app gets its own database login with only the sender's functions (`supabase-production § A second runtime`), and is deployed separately, because a push redeploys only the app (`release-gate`). Overlapping senders are safe by item 3, which is what makes a cut-over from one runtime to another safe.

## Proving it

- **Test the sender's real functions against a real Postgres with every migration.** Integration tests cover a retried send; a dropped answer settled by the search with no second send; a crash before the provider; several senders racing over many receipts, each sent once; a refusal not retried; a stale claim that never sends; a follow-up never sent after its first failed. → `references/delivery.md § Tests`
- **Drill the provider's real API before production, using only discard addresses.** Prove one event, one message, a second pass that sends nothing, and a simulated crash after the send that must be settled from the search without a second copy. The drill waits until the search has answered *found* several times in a row before the next pass, which is what the lease buys a real sender.
- **Run production's own drill before customers rely on it.** Otherwise the first real incident is the first test of delivery.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

A real message reached a real inbox once, a retry did not send a second, and one-click unsubscribe worked from the message as received.

## Files

| File | Holds | Read when |
|---|---|---|
| `references/delivery.md` | the outbox and receipt schema, the claim and its timings, the answer table, reconciliation, what remains, ordering between related messages, unsubscribe in detail, the tests | building or changing the sender; a duplicate or a missing email; choosing lease and timeout values |

Related skills:

- `environments` (one value per environment, development-only switches, rotating a secret across every holder)
- `supabase-production` (a second runtime's database login)
- `release-gate` (deploying the runtimes a push does not)
- `saas-authorization` (what may be stored about people; reading names and addresses at send time).

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/app-stack/skills/transactional-email).
