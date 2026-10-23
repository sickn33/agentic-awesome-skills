# Authoring SST v4 stacks and `infra/` modules

How to write `sst.config.ts` and the per-domain modules under `infra/`. Read the
SKILL.md orientation section first so you know the repo's house style.

## Table of contents

- [The root `sst.config.ts`](#the-root-sstconfigts)
- [Pinning the Lambda runtime with `$transform`](#pinning-the-lambda-runtime-with-transform)
- [The esbuild banner shim strip (Node 24 + ESM)](#the-esbuild-banner-shim-strip-node-24--esm)
- [Per-domain `infra/` modules](#per-domain-infra-modules)
- [Declaring resources: typed components vs raw Pulumi](#declaring-resources-typed-components-vs-raw-pulumi)
- [Sharing across modules: links, SSM, IAM scope](#sharing-across-modules-links-ssm-iam-scope)
- [Working with `Output<T>` and `$interpolate`](#working-with-outputt-and-interpolate)
- [The CloudControl escape hatch](#the-cloudcontrol-escape-hatch)

## The root `sst.config.ts`

`$config({ app(input){...}, async run(){...} })` is the whole contract. `app()`
returns app-level settings; `run()` declares (by side effect of `new`) the
resource graph.

```ts
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "my-app",
      // prod resources survive a stack removal; previews/dev clean up fully.
      removal: input?.stage === "prod" ? "retain" : "remove",
      protect: input?.stage === "prod",
      home: "aws",
      providers: {
        aws: {
          region: "ap-northeast-1",
          defaultTags: {
            tags: {
              Project: "my-app",
              Stage: input?.stage ?? "dev",
              ManagedBy: "sst",
            },
          },
        },
      },
    };
  },
  async run() {
    // global transforms first (see below)
    $transform(sst.aws.Function, (args) => { args.runtime ??= "nodejs24.x"; });

    // then import modules in DEPENDENCY ORDER. Lazy import keeps `sst dev`
    // hot-reload light and lets Vitest load a module under a Pulumi mock
    // without instantiating real resources.
    await import("./infra/storage");
    await import("./infra/functions");
    await import("./infra/api");
    await import("./infra/observability"); // last: references everything above

    return {}; // surface outputs here if post-deploy scripts need them
  },
});
```

Key points:

- **`removal` / `protect` gate on stage.** `retain` keeps prod resources if the
  stack is torn down; `protect` blocks accidental `sst remove` on prod.
- **`defaultTags`** stamp every resource so cost/ownership is attributable
  without per-resource tagging.
- **Import order is dependency order.** A module that reads another's exports
  (e.g. `observability` referencing function names) must be imported *after* it.
  Put observability last for this reason.
- **Lazy `await import()`** delays evaluation until the import executes; a module with top-level resource declarations still runs those constructors at import time. Only a module exporting an uncalled factory avoids those side effects, so the test harness can `import` it under a Pulumi
  mock. If a module exports a factory function (`export function fooStack() {...}`)
  rather than running at import time, call it explicitly in `run()` and pass
  dependencies as arguments — that creates a real Pulumi dependency edge instead
  of a fragile same-run data-source lookup (see Sharing, below).

## Pinning the Lambda runtime with `$transform`

First, **check the installed SST's default** (Context7, or
`grep -r 'nodejs.*\.x' .sst/platform/src/components/aws/function.ts`). Recent
SST already defaults functions to a current Node LTS — on those versions you
may not need a transform at all. Pin it anyway for version independence so a
future SST downgrade can't silently move your fleet:

```ts
$transform(sst.aws.Function, (args) => {
  args.runtime ??= "nodejs24.x";
});
```

- **`??=` is correct here** — and it's exactly what SST's own docs show. The
  global transform runs at the *top* of the component constructor, *before* the
  component applies its own runtime default, so `??=` fills in the default only
  when the user didn't set a runtime on that function. It preserves any explicit
  per-function override (e.g. a Python or container function). Use plain `=`
  only if you deliberately want to *force* every function's runtime, overriding
  user choices — rarely what you want.
- **Target the SST component, not the raw Pulumi type.** `$transform(sst.aws.Function, …)`
  hooks SST's `ComponentTransforms` (runs at construction, sees `args` before
  defaults — the behavior above) and is also where `args.hook` / `nodejs`
  options live. `$transform(aws.lambda.Function, …)` targets the *raw* Pulumi
  resource via a different mechanism (`registerStackTransformation`, at
  resource-registration time) and won't see SST's component-level `args`. For
  runtime pinning, use the component.
- **Mixed runtimes need no special guard with `??=`** — an explicit
  `runtime: "python3.13"` on a function survives, because `??=` only fills the
  unset case. (If you switch to forcing `=`, then add a
  `startsWith("nodejs")` guard so you don't clobber Python/container functions.)

## The esbuild banner shim strip (version-specific — verify before applying)

**This is a reactive fix for a specific SST-esbuild × Node-runtime version
interaction, not a universal SST rule.** Apply it only if you actually hit the
symptom below, and check first whether your installed SST version still ships
the colliding banner (`head .sst/artifacts/*-src/bundle.mjs`, or Context7 for a
fixed release). On a project that doesn't exhibit it, adding this postbuild file
surgery is gratuitous risk. It lives in the authoring reference (not the
"universal" list) for exactly that reason.

**Symptom:** a Lambda crashes at cold start with
`SyntaxError: Identifier '__filename' has already been declared` (and
`requestId: "-"` in the log — it fails before the handler runs). It can be
non-deterministic, depending on which Node runtime minor the Lambda host runs.

**Cause:** SST's default esbuild banner injects a CJS-compat shim that declares
`const __filename = ...` / `const __dirname = ...` at the top of every ESM
`bundle.mjs`. In the affected Node/runtime configurations these names are
already bound in the module scope, so the banner's redeclaration collides at
module compile. (Note: modern Node exposes `import.meta.filename` /
`import.meta.dirname` — *not* lexical `__filename`/`__dirname` globals in ESM;
the collision is specific to how SST's shim interacts with the runtime, so
diagnose against your actual bundle output rather than assuming a Node version
behavior.)

**Only add this hook if all three are true** — otherwise you're stripping lines
from a healthy bundle for no reason:

1. You actually see the cold-start `Identifier '__filename' has already been
   declared` error.
2. `head .sst/artifacts/*-src/bundle.mjs` confirms the bundle still ships the two
   `const __filename` / `const __dirname` shim lines.
3. Context7 shows your installed SST version hasn't fixed the banner upstream.

**Fix that works** (and why the obvious ones don't): strip *only* the two
colliding lines in a `postbuild` hook via `$transform(sst.aws.Function, ...)`.

```ts
$transform(sst.aws.Function, (args) => {
  const previousPostbuild = args.hook?.postbuild;
  args.hook = {
    ...args.hook, // MUST spread — clobbering args.hook breaks the transform chain
    postbuild: async (dir: string) => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const bundlePath = path.join(dir, "bundle.mjs");
      let src: string;
      try {
        src = await fs.readFile(bundlePath, "utf8");
      } catch (err: any) {
        // Non-node runtimes don't emit bundle.mjs — skip, then chain.
        if (err?.code === "ENOENT") { if (previousPostbuild) await previousPostbuild(dir); return; }
        throw err;
      }
      const filenameLine = "const __filename = topLevelFileUrlToPath(import.meta.url)\n";
      const dirnameLine = 'const __dirname = topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))\n';
      const stripped = src.replaceAll(filenameLine, "").replaceAll(dirnameLine, "");
      // Fail LOUD if SST's banner shape changed — a silent miss re-introduces the crash.
      if (/^const __filename = topLevelFileUrlToPath/m.test(stripped)) {
        throw new Error(`Failed to strip __filename shim from ${bundlePath}; SST banner shape changed.`);
      }
      if (stripped !== src) await fs.writeFile(bundlePath, stripped, "utf8");
      if (previousPostbuild) await previousPostbuild(dir);
    },
  };
});
```

Why not the simpler routes:

- `nodejs.banner = ""` does **not** replace SST's banner — SST *appends* your
  banner to its shim, so the shim survives.
- `nodejs.format: "cjs"` crashes durable Lambdas: deps that read
  `fileURLToPath(import.meta.url)` top-level break when esbuild rewrites
  `import.meta` to `{}`.
- Stripping the *entire* shim breaks bundles that rely on the shim's `require`
  fallback (`Dynamic require of "path" is not supported`). Keep `require`; remove
  only `__filename`/`__dirname`.

Pair the strip with a CI grep gate that fails the build if any
`.sst/artifacts/*-src/bundle.mjs` still ships `^const __filename`. This is a
known-class issue; check whether the installed SST version has fixed it upstream
(Context7 → `sst`) before adding the hook to a *new* project — but do not assume the error proves this root cause. Test the exact output and dependent code before removing shim bindings.

## Per-domain `infra/` modules

One file per domain. A module is just TypeScript that `new`s resources at import
time (or exports a factory the config calls). Export the handles other modules or
`run()` need.

```ts
// infra/storage.ts
const stage = $app.stage;
const ssmPrefix = `/my-app/${stage}/storage`;

export const uploadsBucket = new sst.aws.Bucket("Uploads");

export const itemsTable = new sst.aws.Dynamo("Items", {
  fields: { pk: "string", sk: "string", status: "string", updatedAt: "string" },
  primaryIndex: { hashKey: "pk", rangeKey: "sk" },
  globalIndexes: {
    "by-status": { hashKey: "status", rangeKey: "updatedAt", projection: "keys-only" },
  },
  stream: "new-and-old-images",
});
```

Conventions worth keeping:

- **Logical names are PascalCase strings** (`"Uploads"`, `"Items"`). SST prefixes
  them with stage + app to form the physical name. Renaming the logical name
  *replaces* the resource — see migrations.
- **Heavily comment the *why*** — index sparseness, projection choices, stream
  view type, lifecycle reasoning. These projects treat infra comments as design
  docs. Match that density.
- **Derive everything from `$app.stage`** — never hardcode a stage into a name,
  ARN, or SSM path. PR-preview stages (`pr-123`) must work from a cold start and have explicit cost/cleanup limits; they are not free.

## Declaring resources: typed components vs raw Pulumi

Preference order:

1. **`sst.aws.*` component** (`Function`, `Bucket`, `Dynamo`, `Cron`, `Service`,
   `Queue`, …) — highest-level, gives you `link`, sane defaults, and `.nodes`
   access to the underlying Pulumi resources.
2. **Raw `aws.*` Pulumi resource** — when the component doesn't expose what you
   need. Reach *through* the component to the real resource it created when
   possible (`bucket.nodes.bucket.id`) so you extend rather than duplicate.
3. **`aws.cloudcontrol.Resource`** — last resort, only for services with no typed
   resource yet.

Example of (2): SST's `Bucket.lifecycle` only supports expiration, so attach a
native lifecycle config to the underlying bucket for storage-class transitions:

```ts
export const rawBucket = new sst.aws.Bucket("AudioRaw");
new aws.s3.BucketLifecycleConfigurationV2("AudioRawLifecycle", {
  bucket: rawBucket.nodes.bucket.id, // reach through to the real bucket
  rules: [{
    id: "archive-then-expire", status: "Enabled", filter: {},
    transitions: [{ days: 30, storageClass: "STANDARD_IA" }],
    expiration: { days: 180 },
  }],
});
```

For Lambdas, lean on the component's first-class options before dropping to
`transform`:

```ts
new sst.aws.Function("Query", {
  handler: "infra/src/query/handler.handler",
  architecture: "arm64",
  memory: "2048 MB",
  timeout: "2 minutes",
  // native .node bindings esbuild can't bundle: keep external + install per-arch
  nodejs: { install: ["@duckdb/node-api"] },
  // options the component doesn't surface go through transform on the raw fn
  transform: {
    function: (args) => { args.ephemeralStorage = { size: 2048 }; },
  },
  environment: { STAGE: stage, SSM_PREFIX: `/my-app/${stage}/...` },
  // `link` covers IAM + runtime binding for itemsTable; `permissions` here is for
  // a resource that ISN'T linkable (a Bedrock model). See Sharing for when a
  // linked resource still needs an extra explicit permission.
  link: [itemsTable],
  permissions: [{ actions: ["bedrock:InvokeModel"], resources: [bedrockModelArn] }],
});
```

## Sharing across modules: links, SSM, IAM scope

There are three mechanisms; they serve different consumers.

**1. `link:` — for same-app Lambdas in the Pulumi graph.** Pass resource handles;
SST does two things: injects the resource's metadata so the Lambda can read it at
runtime, and grants IAM for that resource automatically.

```ts
new sst.aws.Function("Writer", { handler: "...", link: [itemsTable, uploadsBucket] });
```

The Lambda consumes the link at runtime via SST's `Resource` binding — this is
the other half of the feature, easy to forget:

```ts
// in src/lambdas/writer/handler.ts
import { Resource } from "sst";
const tableName = Resource.Items.name;     // the resolved physical name
const bucketName = Resource.Uploads.name;  // (named after the logical id)
```

Use `link` as the default for "this Lambda needs that table/bucket" — it's the
lowest-friction path and keeps the binding + IAM in sync. **But know what it
grants:** `link` issues resource-scoped (not action-scoped) IAM — e.g. broad
read/write on that table or bucket, not just `GetItem`. That's fine for most
workers. When you need *least privilege*, remove or customize the broad link grant and use an explicit action/resource set or a restricted Linkable. Adding a narrower Allow alongside a broad Allow does not reduce effective permissions. Adding `permissions` for a resource you already `link` is usually
redundant — but it's legitimate when you need an *extra* action the link's grant
doesn't cover (e.g. `s3:PutObjectTagging` on a linked bucket).

**2. SSM Parameter Store — for consumers *outside* the Pulumi graph.** CI
scripts, sibling apps, and operators can't read a Pulumi link. Publish the
durable contract (names, ARNs, URLs) to SSM under `/{app}/{stage}/{domain}/...`:

```ts
function ssmParam(name: string, suffix: string, value: $util.Input<string>) {
  return new aws.ssm.Parameter(name, {
    name: `${ssmPrefix}/${suffix}`, type: "String", value,
  });
}
ssmParam("SsmItemsTableName", "items/table-name", itemsTable.name);
ssmParam("SsmItemsTableArn",  "items/table-arn",  itemsTable.arn);
```

This decouples modules: a downstream Lambda can read the value from SSM *at
runtime* instead of importing the resource, which keeps the deploy-time graph
small. The trade-off is the next point.

**3. Pass a value as a function argument to create a real dependency edge.** If a
downstream module needs an upstream value *at deploy time* (e.g. to scope an IAM
ARN), don't have it re-read SSM via a same-run data-source lookup — on a *fresh*
stage's first deploy the parameter may not exist yet, and the lookup returns
"parameter not found". Instead export a factory and pass the value in:

```ts
// sst.config.ts
const { indexBucketName } = makeIndex();   // returns the bucket NAME (an Output)
makeQuery(indexBucketName);                // pass it → real Pulumi dependency edge

// infra/query.ts
export function makeQuery(indexBucketName: $util.Input<string>) {
  new sst.aws.Function("query-fn", {
    handler: "...",
    permissions: [{
      actions: ["s3:GetObject"],
      resources: [$interpolate`arn:aws:s3:::${indexBucketName}/*`], // scoped, not *
    }],
  });
}
```

**Scope IAM precisely.** Resolve account/region at deploy time and build ARNs
with `$interpolate`:

```ts
const region = aws.getRegionOutput().name;
const accountId = aws.getCallerIdentityOutput().accountId;
permissions: [{
  actions: ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"],
  resources: [$interpolate`arn:aws:ssm:${region}:${accountId}:parameter${ssmPrefix}/*`],
}]
```

## Secrets — use `sst.Secret`, not plaintext env vars

Don't put credentials (API keys, webhook URLs, signing keys) in a Lambda's
`environment` block or an SSM `String` parameter — SST has a first-class
encrypted secret. Declare it, set the value once per stage via the CLI, then
`link` it into the functions that need it:

```ts
// infra/secrets.ts — declare (second arg is an optional placeholder default)
export const slackWebhook = new sst.Secret("SlackWebhookUrl");
export const hmacKey = new sst.Secret("OauthStateHmacKey"); // no insecure empty fallback
```

```sh
# operator sets the real value once per stage (note: `secret`, singular)
npx sst secret set SlackWebhookUrl https://hooks.slack.com/... --stage prod
npx sst secret list --stage prod          # verify (don't reach for an SSM path)
```

```ts
// Link the SST Secret binding; it is not an AWS Secrets Manager resource.
// Inspect this SST version's encryption/decryption and generated permissions.
new sst.aws.Function("Alerter", { handler: "...", link: [slackWebhook] });
```

```ts
// consume at runtime via the Resource binding
import { Resource } from "sst";
const url = Resource.SlackWebhookUrl.value;   // decrypted at function startup
```

Secret values are encrypted in the SST state bucket; when used in function code
they're encrypted in the bundle and decrypted at startup by the SST SDK. If a
secret is referenced in *config* (read at deploy time, e.g. to configure an
authorizer) it's encrypted in the state file too. Either way, never echo a
secret's `.value` into a log or a plaintext SSM parameter.

## Making a raw resource linkable: `sst.Linkable`

`link:` only accepts things that know how to describe themselves. SST components
do; a raw `aws.*` resource (or an external value) doesn't — until you wrap it in
`sst.Linkable`. Use this to give a raw Pulumi resource the same
binding + auto-IAM treatment as a native component:

```ts
const rawTable = new aws.dynamodb.Table("Legacy", { /* ... */ });

const legacy = new sst.Linkable("Legacy", {
  properties: { tableName: rawTable.name, tableArn: rawTable.arn },
  // grant the linking function the IAM it needs for this resource
  include: [
    sst.aws.permission({ actions: ["dynamodb:GetItem", "dynamodb:Query"], resources: [rawTable.arn] }),
  ],
});

new sst.aws.Function("Reader", { handler: "...", link: [legacy] });
// runtime: Resource.Legacy.tableName
```

This keeps a custom or pre-existing resource inside the link graph instead of
forcing every consumer to hand-roll IAM and pass names around. Verify the exact
`sst.Linkable` / `sst.aws.permission` shape for your installed SST version
(Context7) — the linkable API has evolved across v4 minors.

## Working with `Output<T>` and `$interpolate`

Pulumi resource attributes are `Output<T>` (async, dependency-tracked) values,
not plain strings. The single most common — and most damaging — mistake is
embedding one in a plain JS template literal at the top level:

```ts
// BAD — `bucket.arn` is Output<string>. A plain JS template literal stringifies
// it to a "[Calling toString on an Output<T>]" placeholder, producing a broken
// ARN. IAM rejects the policy at DEPLOY time (e.g. MalformedPolicyDocument:
// Partition "1" is not valid). It type-checks fine and `sst dev` runs fine; it
// only blows up on `sst deploy` when the real policy is submitted.
{ resources: [`${bucket.arn}/*`] }

// GOOD — $interpolate (SST's global; === pulumi.interpolate) resolves the
// Output for you. This is the idiom these projects use everywhere.
{ resources: [$interpolate`${bucket.arn}/*`] }
{ resources: [$interpolate`${fn.arn}:*`] }
{ resources: [$interpolate`arn:aws:ssm:${region}:${accountId}:parameter${prefix}/*`] }
```

Rules:

- **Any time you concatenate text around an `Output<T>`, use `$interpolate`**
  (SST's global) or `pulumi.interpolate`. Never a plain `` `${...}` ``. A bare
  pass-through with no surrounding text (`bucket.arn` on its own) needs no
  wrapping.
- **`.apply((v) => ...)` unwraps**: inside the callback `v` is the *resolved*
  value, so plain interpolation of `v` is fine — `` bucket.name.apply((n) => `prefix-${n}`) ``
  works. The trap is interpolating an `Output` you *didn't* unwrap. Note a
  resource object's own `.arn`/`.name` is still an `Output`: in
  `` logGroup.apply((lg) => `${lg.arn}`) `` it's `lg.arn` (not `lg`) that's the
  unresolved Output — prefer `$interpolate`​`` `${logGroup.arn}` `` at top level
  instead. When in doubt, reach for `$interpolate` and skip the apply.
- SST's `.nodes.*` proxies are Output-flavored — reach attributes through
  `.apply((node) => ...)`. Raw Pulumi resources expose `.arn` as `Output<string>`
  directly and can go straight into `$interpolate`.
- This class of bug surfaces *only at deploy time*, so `tsc --noEmit` won't catch
  it and it can break every push-to-main deploy until fixed. When you touch IAM,
  grep new infra for a plain `` `${`` wrapping a `.arn`/`.name`/`.url` and convert
  to `$interpolate`.

## The CloudControl escape hatch

When no typed `aws.*` resource exists (brand-new AWS service, or `pulumi-aws`
hasn't shipped one):

```ts
new aws.cloudcontrol.Resource("Thing", {
  typeName: "AWS::Service::Thing",
  desiredState: $jsonStringify({ /* CFN-shaped properties */ }),
});
```

Two sharp edges:

1. **`oneOf` schema fields can fail to update cleanly.** The Pulumi
   CloudControl provider builds a JSON Patch from current→desired state; for a
   `oneOf` field both branches can end up merged, tripping
   `"0 subschemas matched"`. (This is a *Pulumi provider* behavior, not an AWS
   Cloud Control API limitation — useful to know when you're deciding whether to
   debug the provider or the service.) Mitigation if you hit it: declare
   `replaceOnChanges: ["desiredState"]` + `deleteBeforeReplace: true` so any
   change recreates the resource — but that costs a URL/ID rotation *and* a brief
   gap while the delete completes, so plan downtime; prefer a typed resource if
   one exists.
2. **Outputs are stringly-typed** — no `Output<string>` fields. Read one with
   `thing.properties.apply((p) => JSON.parse(p).SomeField)`.

Prefer a typed resource the moment one ships upstream — and migrate to it using
the **two-PR pattern** (see `deploy-and-troubleshoot.md` § Migrations), not a
same-PR `replaceOnChanges` swap.
