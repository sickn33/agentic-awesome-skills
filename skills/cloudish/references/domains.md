# Your own domains

A project can also answer at any number of domains you control. Add each
one (`foobar.com`, `www.foobar.com`, ...) to the same project:

```bash
curl -X POST https://cloudish.ai/api/v1/projects/YOUR_ALIAS/my-app/domains \
  -H "Authorization: Bearer $CLOUDISH_API_KEY" -H "content-type: application/json" \
  -d '{"host": "foobar.com"}'
# -> { "domain": { "host": "foobar.com", "status": "pending", "redirect": false,
#      "txtRecord": { "name": "_cloudish-challenge.foobar.com", "value": "cloudish-verify=..." } } }
```

1. Add the returned TXT record at your DNS provider. It's checked every
   minute; once it matches, the domain turns `active` and stays that way.
   It's only checked once, so the record can be removed afterwards.
2. Point the domain at cloudish.ai: a `CNAME` for a subdomain like
   `www`; an apex (`foobar.com`) can't be a CNAME at most providers, so use
   an `A` record to that host's IP address (`dig +short cloudish.ai`), or your provider's
   CNAME flattening/ALIAS if it has one. The certificate issues once both
   steps are done.
3. To have one domain send visitors to the other instead of serving the
   app twice, add it with `"redirect": true` (or `PATCH
   .../domains/www.foobar.com {"redirect": true}` later). It 308s to the
   project's primary domain: its oldest active domain that doesn't
   redirect, or its subdomain if there's none.

`GET .../domains` lists them; `DELETE .../domains/{host}` removes one. Each
active domain costs 0.01 credits a day. Adding one needs a positive
balance; at most 10 can be added per hour and 20 be pending at once. A
`409` means another project already holds that host.

Adapted from Cloudish's public skill (https://github.com/cloudishai/skills, MIT).
