# CommentKeyword REST API (quick reference)

Use these only when the CommentKeyword MCP tools are not available.

- **Base URL:** `https://commentkeyword.com/api`
- **Auth:** `Authorization: Bearer $COMMENTKEYWORD_API_TOKEN`
  - The token is a workspace-scoped personal access token, created in the dashboard under Settings → API.
  - Permissions: `keywords:read`, `keywords:write`, `keywords:delete`, `agents:read`.
- **Full spec:** https://commentkeyword.com/openapi.json
- **Docs:** https://commentkeyword.com/api-docs

Keep the token in the environment. Never echo it or write it to a file.

## Check for an existing keyword

```bash
curl -s "https://commentkeyword.com/api/keywords?search=guide" \
  -H "Authorization: Bearer $COMMENTKEYWORD_API_TOKEN"
```

## Arm a keyword for the next post or reel

```bash
curl -s -X POST https://commentkeyword.com/api/keywords \
  -H "Authorization: Bearer $COMMENTKEYWORD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "GUIDE",
    "scope": "post_specific",
    "includeNextPost": true,
    "dmMessages": ["Here is the guide, {{namefirst}} 👉 https://example.com/guide"],
    "commentReplies": ["Sent! Check your DMs {{namefirst}} 📩"],
    "trackLinks": true
  }'
```

- **Response:** `201` with `{ "data": Keyword }`.
- `data.nextPostStatus` is `"waiting"` until the next publication is caught, then `"attached"`.

## Other targets

| Target | Request fields |
|---|---|
| Every post, current and future | `"scope": "global"` (and no `includeNextPost`) |
| Specific posts | `"scope": "post_specific", "mediaIds": ["<instagram media id>"]` |

## Body fields

| Field | Notes |
|---|---|
| `keyword` | Required, up to 100 characters. Case-insensitive. |
| `dmMessages` | Required: at least one variant, up to 1,000 rendered characters each. Placeholders: `{{handle}}`, `{{name}}`, `{{namefirst}}`. |
| `matchMode` | `contains` (default; whole-word match in space-separated scripts) or `exact`. |
| `matchWithoutAccents` | Only for keywords with Latin accents. |
| `commentReplies` | Public reply variants, up to 500 characters each. |
| `publicReplyEnabled` | Defaults to `true` when `commentReplies` is not empty. |
| `trackLinks` | Boolean. |
| `isActive` | Default `true`. A paused keyword doesn't count toward the plan's active-keyword limit. |
| `aiAgentId` | publicId of a Live agent from `GET /agents`, or `null`. |

## Update, pause, re-arm, delete

```bash
# Re-arm an existing keyword for the next upload
curl -s -X PATCH https://commentkeyword.com/api/keywords/<publicId> \
  -H "Authorization: Bearer $COMMENTKEYWORD_API_TOKEN" -H "Content-Type: application/json" \
  -d '{"scope": "post_specific", "includeNextPost": true}'

# Pause
curl -s -X PATCH https://commentkeyword.com/api/keywords/<publicId> \
  -H "Authorization: Bearer $COMMENTKEYWORD_API_TOKEN" -H "Content-Type: application/json" \
  -d '{"isActive": false}'

# Delete (add ?confirm=true only after the user has reviewed a DELETE_CONFIRMATION_REQUIRED response)
curl -s -X DELETE https://commentkeyword.com/api/keywords/<publicId> \
  -H "Authorization: Bearer $COMMENTKEYWORD_API_TOKEN"
```

PATCH changes only the fields you send. Sending `dmMessages` or `commentReplies` replaces every existing variant.

## Errors

- **Shape:** `{ "error", "message", "code"? }`.
- **`409`:** with `code: "keyword_limit_exceeded"`, the plan has no free active-keyword slot. Without a code, the trigger conflicts with an existing keyword.
- **`401`:** bad or revoked token.
- **`403`:** the token is missing a permission.
