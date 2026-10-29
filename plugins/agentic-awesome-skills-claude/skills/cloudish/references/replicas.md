# Replicas: many isolated copies of one app

An app normally runs as one container behind its URL. Its `replicas` setting
lets it run more copies at once: each replica is its own container, started
from the app's image, and reached only by its own id. Use replicas for one
sandbox per user, task or agent, where each caller needs a container of its
own.

`replicas` is a maximum, not a count. Setting it starts nothing. A replica
starts when you ask for one and stops on its own when idle. You pay for each
replica only while it runs.

## 1. Allow replicas

Set `replicas` when creating or updating the app (see [SKILL.md](../SKILL.md)).
It's the most copies that may run at once, counting the app's own container,
so `10` allows 9 replicas. The default is `1` (no replicas); the highest is
100.

```bash
curl -X POST https://cloudish.ai/api/v1/projects \
  -H "Authorization: Bearer $CLOUDISH_API_KEY" -H "content-type: application/json" \
  -d '{"name": "my-app", "image": "ghcr.io/acme/my-app:1.0.0", "port": 8080, "replicas": 10}'
```

Replicas have no storage: anything one writes is gone when it stops. An app
with a volume can't run replicas.

## 2. Start a replica

On any request to the app's URL, send `Cloudish-Replica: new` with the
app owner's key. This starts a replica, waits for it to start, and sends the
request to it. The response's `Cloudish-Replica` header has the new id:

```bash
curl -i https://<app-url>/ \
  -H "Authorization: Bearer $CLOUDISH_API_KEY" -H "Cloudish-Replica: new"
# -> HTTP/1.1 200 OK
#    Cloudish-Replica: r-8kq2x7ab
```

Or start one ahead of time without sending it a request:

```bash
curl -X POST https://cloudish.ai/api/v1/projects/YOUR_ALIAS/my-app/replicas \
  -H "Authorization: Bearer $CLOUDISH_API_KEY"
# -> { "replica": { "id": "r-8kq2x7ab", "status": "starting",
#      "header": "Cloudish-Replica: r-8kq2x7ab", "url": "https://..." } }
```

Only the owner's key can start a replica. The key is removed from requests
before they reach a replica, so code running in it never sees it.

## 3. Send requests to a replica

Send its id in the same header, on any request to the app's URL:

```bash
curl https://<app-url>/run -H "Cloudish-Replica: r-8kq2x7ab"
```

A request without the header (or with `Cloudish-Replica: any`) always goes
to the app's own container, never to a replica. Keeping track of ids is up
to you: store the id and send it on every request for that replica. The
project's access level still applies — a private project's requests need its
owner's key, as they do without replicas.

A replica also has its own URL, `url` in the response above
(`https://r-8kq2x7ab--<token>.<run-domain>/`): every request there goes to
that replica with no header, so it works from a browser and for websockets.
`url` is `null` where this deployment can't serve one yet — use the header.

## 4. Responses to handle

- `410` (`code: "replica_gone"`): the replica has stopped (idle, deleted,
  or its machine went away). Start a new one; nothing carries over.
- `503` with `Retry-After` and `Cloudish-Replica`: still starting. Retry
  with that id, not `new` again, or you start a second replica.
- `429` with `Cloudish-Replicas-Max`: the app already runs as many copies
  as `replicas` allows. Delete one, or raise `replicas`.
- `401`/`403`: `new` without the owner's key.
- `402`: the owner's key is out of credits — see [credits.md](credits.md).
- `409`: the app has a volume.
- `400`: the header is not `new`, `any` or a replica id.

## 5. List, read logs, stop

```bash
curl https://cloudish.ai/api/v1/projects/YOUR_ALIAS/my-app/replicas -H "Authorization: Bearer $CLOUDISH_API_KEY"
# -> { "maxReplicas": 10, "replicas": [ { "id": "r-8kq2x7ab", "status": "running", ... } ] }
curl https://cloudish.ai/api/v1/projects/YOUR_ALIAS/my-app/replicas/r-8kq2x7ab/logs -H "Authorization: Bearer $CLOUDISH_API_KEY"
curl -X DELETE https://cloudish.ai/api/v1/projects/YOUR_ALIAS/my-app/replicas/r-8kq2x7ab -H "Authorization: Bearer $CLOUDISH_API_KEY"
```

## Lifetime and billing

- A replica stops after the key's idle timeout passes with no requests to
  it; an open websocket counts as a request. The default is 15 minutes.
  Change it per key with `PATCH https://cloudish.ai/api/v1/me {"settings": {"idleTimeoutSeconds": 30}}`
  (one of 30, 60, 300, 900, 3600, 28800, 86400, or `0` for never). The
  same timeout applies to the app's own container.
- Each replica is billed per second while it runs, at the app's size
  (`creditsPerHour`, see [instances.md](instances.md)), to the owner's key. When
  the key runs out of credits, its replicas stop.
- A replica runs the image, env and secrets the app had when the replica
  started. Redeploying the app doesn't change replicas already running —
  start new ones to pick the change up.
- Replicas are isolated like any app container (see [container.md](container.md)):
  one replica can't reach another, or the app's own container.
