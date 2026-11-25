# Best Practices

- ✅ Reuse the key in `.env` instead of creating a new one on every run.
- ✅ Put credentials in the secrets endpoint; put only non-secret config in `env`.
- ✅ Run databases inside the container on a volume; a volume forces a single replica.
- ✅ Hand the human a claim link, minted with `GET /api/v1/credits/claim`, when they need to add credits; it works once and expires after 30 minutes.
- ❌ Don't run `docker build` locally first; send the build context as-is.
- ❌ Don't print the API key or secrets into chat, source files, logs, or commit history.
- ❌ Don't guess endpoints or fields; check the sections above and `references/` (or https://cloudish.ai/skill.md for the live copy) if a call is rejected.

Adapted from Cloudish's public skill (https://github.com/cloudishai/skills, MIT).
