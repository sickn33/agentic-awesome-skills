# Build Weaviate Query Agent Chatbot

## Overview

Build a full-stack Query Agent chatbot with minimal back-and-forth.

Read first:
- Weaviate Query Agent usage: https://docs.weaviate.io/agents/query/usage

## Instructions

### Core Rules

- Use `uv` for Python project/dependency management.
- Do not manually author `pyproject.toml` or `uv.lock`; let `uv` generate/update them.
- Use this backend install set:
  - `uv add fastapi 'uvicorn[standard]' weaviate-client weaviate-agents pydantic-settings sse-starlette python-dotenv`
- If `uv` not available, create a `requirements.txt` for pip installation
- Depending on user request: consider combining this app with the Data Explorer.
  - If the user explicitly only wants chatbot, create this app independently
  - If the user wants a fully featured chat and data explorer, combine the apps
  - If no explicit instructions are given, ask the user their preference before continuing
  - See the [Next Steps](#next-steps) section for more details

### Fast Setup Commands

Project bootstrap:

```bash
uv init chatbot
cd chatbot
uv venv
uv add fastapi 'uvicorn[standard]' weaviate-client weaviate-agents pydantic-settings sse-starlette python-dotenv
```

### Workflow Contract

1. Build backend in one pass.
2. Create `.env` from the canonical template in `environment_requirements.md`, then add app-specific fields (for example, `COLLECTIONS`).
3. Before asking user to fill env, do non-secret local sanity checks that do not require real credentials (imports/compile/startup-shape checks).
4. Ask user to fill real env values:
   - Mandatory: `WEAVIATE_URL`, `WEAVIATE_API_KEY`, `COLLECTIONS`
   - Optional: only provider keys required by their collection setup
5. After the user confirms, verify backend starts without errors and provide exact commands to run it in terminal.

Do not ask avoidable questions that you can resolve from context.

### Directory Structure

Use a modular layout like:

```text
chatbot/
  backend/
    app/
      main.py
      config.py
      lifespan.py
      dependencies.py
      routers/
      services/
      models/
    .env  # local file, never committed
```

Keep these boundaries:

- routers: HTTP only
- services: business/query-agent logic
- models: request/response schemas
- config/lifespan: wiring and startup/shutdown

### Backend Requirements

- FastAPI async app with lifespan.
- Async Weaviate client initialized in lifespan and closed on shutdown.
- Query Agent service layer (`ask` + `ask_stream`).
- For async FastAPI backends, use `AsyncQueryAgent` (not `QueryAgent`) so `await agent.ask(...)` and `async for ... in agent.ask_stream(...)` work correctly.
- Endpoints:
  - `GET /health`
  - `POST /chat`
  - `POST /chat/stream` (SSE)
- Pydantic settings should read from process environment; local `.env` loading is optional for local development.
- Conversation history mapping to Weaviate chat message format.

### Source Handling

- For every ask response, normalize output into:
  - `answer`: text from `response.final_answer` (fallback `""`)
  - `sources`: list of `{ "collection": ..., "object_id": ... }` built from `response.sources`
  - `source_count`: `len(sources)`
- `POST /chat` must return `answer`, `sources`, and `source_count`.
- `POST /chat/stream` must include the same fields in the final SSE event.
- If no sources are available, return `sources: []` and `source_count: 0`.

### Env Rules

Mandatory:
- `WEAVIATE_URL`
- `WEAVIATE_API_KEY`
- `COLLECTIONS`

External provider keys:
- Include every provider key needed by the target collections.
- Leave unused provider keys empty/commented.

CORS:

- Default `CORS_ORIGINS` should include:
  - `http://localhost:3000`
  - `http://127.0.0.1:3000`
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`

### Post-Env Hand-Holding (Required)

After user says required env values are set, provide the terminal commands to run the backend:

```bash
cd chatbot/backend
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Then:

- Ask user to start the terminal.
- Run smoke tests yourself against running services.
- Report pass/fail in plain language and fix blockers.

Do not offload detailed testing steps to the user unless they explicitly ask.

## Troubleshooting

- `OPTIONS /chat/stream 400`: fix CORS origin mismatch (`localhost` vs `127.0.0.1`).
- Weaviate startup host errors: ensure `WEAVIATE_URL` is full `https://...` URL.
- For any other issues, refer to the official library/package documentation using web search.

## Done Criteria

- Backend healthy.
- `/chat` works.
- `/chat/stream` streams progress/token/final.
- `/chat` and `/chat/stream` final include `sources` and `source_count`.
- User can run the server in the terminal with the provided commands.

## Next Steps


This application is currently a chatbot backend. You may optionally offer to integrate it with the [Data Explorer](./data_explorer.md) based on user preference.

If the user chooses to combine these two applications, implement the integration as follows:

- Create or use a directory `/routes` which separate functions for query agent chat and data exploration. Import the routers in the `main.py` file
- If a frontend is requested, the frontend should have multiple pages/tabs depending on design choices so that data exploration and chat is separated
- Consider crossovers between functionalities, e.g. a chat button from the data viewer/collection viewer which takes the user to chat with that collection selected.
- Run quick tests to ensure the integration is seamless and the user can use both the chatbot and data explorer without any issues.

### Frontend

When the user explicitly asks for a frontend, use this reference as guideline:

- [Frontend Interface](frontend_interface.md): Build a Next.js frontend to interact with the Weaviate backend.
- Render source citations from `sources` and `source_count` in the chat response UI.
