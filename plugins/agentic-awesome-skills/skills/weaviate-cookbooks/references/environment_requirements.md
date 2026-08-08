# Environment Requirements for Weaviate

Use this reference when building apps that connect to Weaviate and require external inference provider keys.

## Required Weaviate Auth

- `WEAVIATE_URL`
- `WEAVIATE_API_KEY`

## External Provider Env Vars and Headers

| Provider | Environment Variable(s) | Header(s) sent to Weaviate |
|----------|--------------------------|-----------------------------|
| Anthropic | `ANTHROPIC_API_KEY` | `X-Anthropic-Api-Key` |
| Anyscale | `ANYSCALE_API_KEY` | `X-Anyscale-Api-Key` |
| AWS | `AWS_ACCESS_KEY`, `AWS_SECRET_KEY` | `X-Aws-Access-Key`, `X-Aws-Secret-Key` |
| Cohere | `COHERE_API_KEY` | `X-Cohere-Api-Key` |
| Databricks | `DATABRICKS_TOKEN` | `X-Databricks-Token` |
| Friendli | `FRIENDLI_TOKEN` | `X-Friendli-Api-Key` |
| Google Vertex AI | `VERTEX_API_KEY` | `X-Goog-Vertex-Api-Key` |
| Google AI Studio | `STUDIO_API_KEY` | `X-Goog-Studio-Api-Key` |
| HuggingFace | `HUGGINGFACE_API_KEY` | `X-HuggingFace-Api-Key` |
| Jina AI | `JINAAI_API_KEY` | `X-JinaAI-Api-Key` |
| Mistral | `MISTRAL_API_KEY` | `X-Mistral-Api-Key` |
| NVIDIA | `NVIDIA_API_KEY` | `X-Nvidia-Api-Key` |
| OpenAI | `OPENAI_API_KEY` | `X-OpenAI-Api-Key` |
| Azure OpenAI | `AZURE_API_KEY` | `X-Azure-Api-Key` |
| Voyage AI | `VOYAGE_API_KEY` | `X-Voyage-Api-Key` |
| xAI | `XAI_API_KEY` | `X-Xai-Api-Key` |

## Usage Notes

- Set only the provider keys your collection configuration actually uses.
- If multiple providers are configured, include all corresponding headers.

## Canonical `.env` Template

Use this template in all cookbook apps. Then ask the user to fill only the values their app actually needs.

`WEAVIATE_URL` and `WEAVIATE_API_KEY` are mandatory for Weaviate-connected apps.

```dotenv
# Required for Weaviate cookbook apps (must be filled by user)
WEAVIATE_URL=
WEAVIATE_API_KEY=

# Common app-level settings (uncomment when needed by the selected cookbook)
# COLLECTIONS=
# CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173

# External provider keys (uncomment only what the target collection uses)
# ANTHROPIC_API_KEY=
# ANYSCALE_API_KEY=
# AWS_ACCESS_KEY=
# AWS_SECRET_KEY=
# AZURE_API_KEY=
# COHERE_API_KEY=
# DATABRICKS_TOKEN=
# FRIENDLI_TOKEN=
# HUGGINGFACE_API_KEY=
# JINAAI_API_KEY=
# MISTRAL_API_KEY=
# NVIDIA_API_KEY=
# OPENAI_API_KEY=
# STUDIO_API_KEY=
# VERTEX_API_KEY=
# VOYAGE_API_KEY=
# XAI_API_KEY=
```

## User Fill Guidance (Required)

1. Create a local `.env` file from this template.
2. Always ask the user to fill:
   - `WEAVIATE_URL`
   - `WEAVIATE_API_KEY`
3. Ask them to uncomment and fill only the provider keys their Weaviate collections require.
4. Keep `.env` local only and gitignored.
