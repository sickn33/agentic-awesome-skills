---
name: setting-up-sending-domain
description: >-
  Use when adding or verifying a Mailtrap sending domain, DNS propagation issues,
  registrar or DNS provider steps, compliance after verification, or click tracking. Domain must be verified before sending from it.
---

# Setting up a Mailtrap sending domain

## Overview

You must add and verify a domain you control before live sending. Mailtrap shows **every DNS record** required for that domain in the **UI**: **add the complete set** as given (do not cherry-pick). After DNS verifies, complete the **compliance** step if requested.

**Subdomain vs root:** add the **exact** hostname you will use in the From address. If you send from `notifications.mycompany.com`, add that **subdomain** as the sending domain—not only `mycompany.com`, unless you truly send from the root domain.

For step-by-step clicks at common hosts, open the matching guide on [Sending domain setup](https://docs.mailtrap.io/email-api-smtp/setup/sending-domain.md) (Cloudflare, Route 53, etc.) and follow it alongside the live **UI** values.

**Related skills:** `authorizing-api-requests` (tokens, env vars, `account_id` resolution), `sending-emails` (after domain is ready).

## When to use

- New **Sending Domains** setup, stuck verification, or compliance questions
- DNS at Cloudflare, AWS, Google, Namecheap, GoDaddy, DigitalOcean, etc.

## When not to use

- Sandbox-only testing without a custom domain (see `testing-with-sandbox`)

## Authorization

The Sending Domains API calls below need `Authorization: Bearer $MAILTRAP_API_TOKEN` and an `$MAILTRAP_ACCOUNT_ID` in the path. Token scope, storage, and the one-liner that resolves `$MAILTRAP_ACCOUNT_ID` from `GET https://mailtrap.io/api/accounts` are covered in skill `authorizing-api-requests`.

## Automating setup (API and DNS providers)

Prefer this path when building scripts or AI-assisted automation:

1. **DNS records and status via API** — Use the Sending Domains API:
  - `GET https://mailtrap.io/api/accounts/$MAILTRAP_ACCOUNT_ID/sending_domains` — lists domains
  - `GET https://mailtrap.io/api/accounts/$MAILTRAP_ACCOUNT_ID/sending_domains/{sending_domain_id}` — returns `dns_records` (each with `type`, `name`, `value`, and verification `status`) and `dns_verified`. Poll after you publish DNS.
2. **Create domain via API** —
  - `POST https://mailtrap.io/api/accounts/$MAILTRAP_ACCOUNT_ID/sending_domains` with `domain_name` when your flow provisions domains programmatically.
3. **Publish DNS programmatically** —
  - Create the returned records at your DNS host using their API (e.g., [Cloudflare API](https://developers.cloudflare.com/api/), AWS Route 53, Google Cloud DNS) or IaC. Align record names and values exactly with the API response.

**Human fallback:** **Sending Domains** > **Add domain** > copy values into the registrar **UI** > **Verify** when API automation is not available.

## Workflow (summary)

1. **Sending Domains** > **Add domain** and enter the domain name.
2. Obtain required records from the **UI** or Sending Domains API; **create all listed records** at your DNS host exactly as shown (names, types, values).
3. Wait for DNS propagation. **If verification stays pending**, use `dig`, `nslookup`, or an online DNS lookup to confirm each record is visible publicly before clicking **Verify** again.
4. Complete the **compliance** flow when prompted.

Product walkthrough: [Sending domain setup](https://docs.mailtrap.io/email-api-smtp/setup/sending-domain.md).

## DNS provider guides (documentation)

Mailtrap publishes click-path guides for common providers. Open the page that matches the user's DNS host and follow it together with the live **UI** records:

- [Cloudflare](https://docs.mailtrap.io/email-api-smtp/setup/sending-domain/cloudflare.md)
- [AWS Route 53](https://docs.mailtrap.io/email-api-smtp/setup/sending-domain/aws-route-53.md)
- [Google Cloud DNS](https://docs.mailtrap.io/email-api-smtp/setup/sending-domain/google-cloud-dns.md)
- [Squarespace](https://docs.mailtrap.io/email-api-smtp/setup/sending-domain/squarespace.md) (includes former Google Domains transition notes where applicable)
- [GoDaddy](https://docs.mailtrap.io/email-api-smtp/setup/sending-domain/godaddy.md)
- [Namecheap](https://docs.mailtrap.io/email-api-smtp/setup/sending-domain/namecheap.md)
- [DigitalOcean](https://docs.mailtrap.io/email-api-smtp/setup/sending-domain/digitalocean.md)

If the user's provider is not listed, the same rule applies: **copy every record** from Mailtrap into the DNS zone that serves the From domain.

## Important DNS caveat (proxied DNS)

If your DNS provider **proxies** records (orange-cloud on Cloudflare, similar CDN/proxy modes elsewhere), verification-related records must be **DNS-only** (grey cloud / non-proxied) unless Mailtrap documentation explicitly allows proxying—proxied CNAMEs and similar often break SPF/DKIM verification. The same constraint applies to any host that fronts DNS with a proxy.
