# Setup: from nothing to a working token

The order matters. Each step's error message names none of the other steps, so
doing them out of order produces misleading failures.

## 0. What you need before starting

- A **Meta Business** (business.facebook.com), not just a personal ad account
- **Admin** access to that business. Employee access cannot create system users.
- A **Facebook Page**. Every ad runs from a Page; there is no ad without one.
- A **payment method** on the ad account.

If the business already runs ads through Ads Manager, all four exist.

## 1. Find or create the app

`https://developers.facebook.com/apps/`

Reuse an existing app if there is one. A new app needs its own publishing step
and its own review, for no benefit.

If creating: type **Business**, then link it to the Business in
App Dashboard → Settings → Basic → Business Account.

Note the **App ID**. You will need it at token generation, and it is the value
to check when someone says "I don't see the app in Business Settings": an app
that was never linked to the business will not appear there.

## 2. Publish the app

App Dashboard → Settings → Basic. Fill in:

- **Privacy Policy URL**: required, must resolve
- **Category**
- then flip the toggle at the top from **Development** to **Live**

Do this now, not later. Development mode blocks **ad creative creation only**.
Every other API call succeeds, so an unpublished app fails at the very last step
of a long script, after the campaign and ad set already exist.

## 3. Create the system user

`https://business.facebook.com/settings/system-users`

Add → name it after the integration, not the person (`ads-automation`, not
a person's name). Role: **Employee** is enough for campaign management. Use **Admin**
only if the integration must manage assets or other users.

## 4. Give the system user a role on the app

`https://business.facebook.com/settings/apps`

Select the app → **Add People** → the system user → **Develop app**.

**This is the step that is almost always missed.** Without it, token generation
shows *"No permissions available"* with an empty scope list, and nothing on that
screen indicates the app role is what's missing.

## 5. Assign the assets

Back in System Users → *your user* → **Assign assets**:

| Asset | Permission | Why not the other one |
|---|---|---|
| Ad account | **Manage campaigns** | "Manage ad account" grants finances and user management, more than an automation needs |
| Page | **Ads** | "Manage Page" lets the token post as the Page |
| Pixel / dataset | **Use events dataset** | needed for `promoted_object` and CAPI |
| Instagram account | **Ads** | only if running IG placements |

Assign each one separately. The UI does not warn you about the ones you skipped.

## 6. Generate the token

System Users → *user* → **Generate new token**:

- **App**: the app from step 1
- **Expiration**: **Never**
- **Scopes**: `ads_management` (add `ads_read` if you also pull reporting,
  `business_management` only if the integration manages assets)

Copy it immediately. It is shown once.

### Storing it

Put it in the environment, never in the repo:

```bash
export META_ACCESS_TOKEN='...'   # META_ADS_TOKEN also works with the scripts
```

**Treat a never-expiring `ads_management` token as a credential that can spend
money.** If it ever appears in a chat transcript, a log, a screenshot, or a
commit, revoke and regenerate it: System Users → *user* → **Revoke tokens**.

## 7. Connect Instagram to the ad account

`https://business.facebook.com/settings/instagram-accounts`

Select the account → **Connect assets** → the ad account.

Skip this and ad creation fails with *"Ad account has no access to this
Instagram account"*, because Advantage+ placements include Instagram by
default, so you hit it even when you never intended to run IG.

## 8. Verify

```bash
node ${CLAUDE_SKILL_DIR}/scripts/preflight.mjs
```

It checks token identity, granted scopes, ad account status and currency,
available Pages, pixel access, and whether the app is Live. It writes nothing.

## Debugging a token

`https://developers.facebook.com/tools/debug/accesstoken/`

Paste the token. It shows the app it belongs to, its scopes, its expiry, and
the user or system user behind it. When a call returns a permissions error, this
tells you which of the four grants is actually missing.

## Common failures

| Symptom | Cause |
|---|---|
| "No permissions available" at token generation | system user has no role on the app (step 4) |
| `(#200) Requires ads_management permission` | scope not ticked, or wrong token in the env |
| `(#100) Unsupported get request` on `act_...` | ad account not assigned to the system user, or the `act_` prefix is missing |
| App not listed in Business Settings → Apps | app was never linked to the Business (step 1) |
| Token works today, fails in 60 days | a short-lived token was generated instead of Never |
| `Ad account has no access to this Instagram account` | step 7 |
| `created by an app that is in development mode` | step 2 |
