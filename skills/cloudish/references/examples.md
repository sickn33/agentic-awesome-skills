# Example: FastAPI app with SQLite

The user says "Deploy this to Cloudish." The agent finds `main.py` serving on port 8000, writes a
Dockerfile that runs `uvicorn main:app --host 0.0.0.0 --port 8000`, points the database at
`/data/app.db`, confirms with the user, and deploys with a volume:

```bash
# Build an inspected allowlisted staging directory outside the source tree first.
# Do not assume tar honors .dockerignore; exclude credential files, private data and symlinks.
tar -czf ../context.tar.gz -C ../approved-build-context .
curl -X POST https://cloudish.ai/api/v1/projects \
  -H "Authorization: Bearer $CLOUDISH_API_KEY" \
  -F "name=notes-api" -F "port=8000" -F "context=@../context.tar.gz" \
  -F "volumeEnabled=true" -F "volumeSizeGb=1" -F "volumeMountPath=/data"
```

It polls the build, then reports the URL and that the database lives on the volume.

Adapted from Cloudish's public skill (https://github.com/cloudishai/skills, MIT).
