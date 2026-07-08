---
adapter:
  language: python
  display_name: "Python"
  version: "1.0"

  detection:
    files: [pyproject.toml, setup.py, requirements.txt, Pipfile]
    content_patterns:
      - file: "pyproject.toml"
        pattern: '\\[project\\]|\\[tool\\.poetry\\]'
    confidence: 0.90

  commands:
    build: null  # Python typically doesn't need a build step
    test: "pytest"
    lint: "ruff check ."
    lint_arch: "python scripts/lint_deps.py src/"
    format: "ruff format ."
    start: null   # Inferred from framework
    dev: null

  package_manager:
    detection:
      - lockfile: "poetry.lock"
        manager: "poetry"
      - lockfile: "uv.lock"
        manager: "uv"
      - lockfile: "Pipfile.lock"
        manager: "pipenv"
      - lockfile: "pdm.lock"
        manager: "pdm"
    default: "pip"
    install_command: "{manager} install"

  route_detection:
    server_indicators:
      - pattern: 'from fastapi|import fastapi|FastAPI\(\)'
        description: "FastAPI ASGI framework"
        frameworks: ["fastapi"]
      - pattern: 'from flask|import flask|Flask\(__name__\)'
        description: "Flask WSGI framework"
        frameworks: ["flask"]
      - pattern: 'from django|import django'
        description: "Django web framework"
        frameworks: ["django"]
      - pattern: 'from aiohttp|import aiohttp\.web'
        description: "aiohttp async web framework"
        frameworks: ["aiohttp"]
      - pattern: 'from starlette|import starlette'
        description: "Starlette ASGI framework"
        frameworks: ["starlette"]
      - pattern: 'from litestar|import litestar'
        description: "Litestar ASGI framework"
        frameworks: ["litestar"]

    cli_indicators:
      - pattern: 'import click|from click'
        description: "Click CLI framework"
        frameworks: ["click"]
      - pattern: 'import typer|from typer'
        description: "Typer CLI framework"
        frameworks: ["typer"]
      - pattern: 'import argparse|from argparse'
        description: "Standard library argparse"
        frameworks: ["argparse"]
      - pattern: 'import fire|from fire'
        description: "Google Python Fire"
        frameworks: ["fire"]

    frontend_indicators: []  # Python is not typically used for frontend

    patterns:
      # FastAPI
      - type: route
        regex: '@(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*["\x27]([^"\x27]+)["\x27]'
        groups: [method, path]
        frameworks: ["fastapi", "starlette", "litestar"]
      # Flask
      - type: route
        regex: '@(?:app|bp|blueprint)\.(route)\s*\(\s*["\x27]([^"\x27]+)["\x27](?:.*methods\s*=\s*\[([^\]]+)\])?'
        groups: [_, path, method]
        frameworks: ["flask"]
      # Django URLs
      - type: route
        regex: 'path\s*\(\s*["\x27]([^"\x27]+)["\x27]'
        groups: [path]
        frameworks: ["django"]
      # Click
      - type: command
        regex: '@\w+\.command\s*\(\s*(?:name\s*=\s*)?["\x27]?([^"\x27\)]+)'
        groups: [command_name]
        frameworks: ["click"]
      # Typer
      - type: command
        regex: '@app\.command\s*\(\s*(?:name\s*=\s*)?["\x27]?([^"\x27\)]*)'
        groups: [command_name]
        frameworks: ["typer"]

  import_analysis:
    list_packages: null
    import_pattern: "^(?:from|import)\\s+([\\w.]+)"
    source_extensions: [".py"]
    module_root_file: "pyproject.toml"

  layer_conventions:
    patterns:
      - layer: 0
        paths: ["src/models", "src/schemas", "src/types", "models", "schemas"]
        description: "Data models, Pydantic schemas, type definitions"
      - layer: 1
        paths: ["src/utils", "src/lib", "src/common", "utils", "lib"]
        description: "Shared utilities"
      - layer: 2
        paths: ["src/services", "src/core", "src/domain", "services", "core"]
        description: "Business logic, service layer"
      - layer: 3
        paths: ["src/api", "src/routes", "src/views", "src/handlers", "api", "routes"]
        description: "API endpoints, request handlers"
      - layer: 4
        paths: ["src/main.py", "src/app.py", "src/cli.py", "main.py", "app.py"]
        description: "Application entry points"

  dependency_detection:
    manifest_file: "pyproject.toml"
    databases:
      - pattern: "psycopg|asyncpg|sqlalchemy.*postgres|databases.*postgres"
        type: "postgres"
        default_port: 5432
      - pattern: "pymysql|aiomysql|mysqlclient"
        type: "mysql"
        default_port: 3306
      - pattern: "pymongo|motor"
        type: "mongodb"
        default_port: 27017
      - pattern: "redis|aioredis"
        type: "redis"
        default_port: 6379
      - pattern: "aiosqlite|sqlite3"
        type: "sqlite"
        default_port: 0
    services:
      - pattern: "confluent-kafka|aiokafka"
        type: "kafka"
        default_port: 9092
      - pattern: "pika|aio-pika"
        type: "rabbitmq"
        default_port: 5672
      - pattern: "elasticsearch|elastic-transport"
        type: "elasticsearch"
        default_port: 9200
    env_var_patterns:
      - pattern: 'os\.environ\.get\(\s*["\x27]([^"\x27]+)["\x27]'
      - pattern: 'os\.environ\[["\x27]([^"\x27]+)["\x27]\]'
      - pattern: 'os\.getenv\(\s*["\x27]([^"\x27]+)["\x27]'

  linter:
    template_section: "python-linter"
    script_extension: ".py"
    run_command: "python scripts/lint_deps.py src/"

  naming:
    file_pattern: "^[a-z][a-z0-9_]*\\.py$"
    test_pattern: "^test_[a-z][a-z0-9_]*\\.py$"
    directory_style: "snake_case"

  ci:
    github_actions:
      image: "python:3.12"
      setup_steps:
        - "uses: actions/setup-python@v5\n  with:\n    python-version: '3.12'"
      cache_paths: ["~/.cache/pip", ".venv"]
---

# Python Adapter

## Server Start Command Inference

1. Existing `harness/config/environment.json` startup command, if present
2. FastAPI detected → `python -m uvicorn {module}:app --port 8080`
   - Module inferred from main app file location
3. Flask detected → `python -m flask run --port 8080`
4. Django detected → `python manage.py runserver 8080`
5. `main.py` exists → `python main.py`

## Virtual Environment Detection

The adapter checks for virtual environments in this order:
1. `.venv/` directory → `source .venv/bin/activate`
2. `venv/` directory → `source venv/bin/activate`
3. `poetry.lock` → `poetry shell` or prefix with `poetry run`
4. `uv.lock` → prefix with `uv run`
5. `Pipfile.lock` → prefix with `pipenv run`

## Framework-Specific Notes

### FastAPI
- Routes via decorators: `@app.get("/path")`, `@router.post("/path")`
- Dependency injection via `Depends()`
- Auto-generated OpenAPI docs at `/docs` and `/redoc`
- Start with uvicorn: `uvicorn app.main:app --reload`

### Flask
- Routes via decorators: `@app.route("/path", methods=["GET"])`
- Blueprints for modular routing
- Start with: `flask run` or `python -m flask run`

### Django
- URL configuration in `urls.py`: `path("api/", include("app.urls"))`
- Class-based views and function-based views
- Start with: `python manage.py runserver`
- Migrations: `python manage.py migrate`

### Click / Typer (CLI)
- Click: `@cli.command()` decorator pattern
- Typer: `@app.command()` decorator pattern, with auto-generated help

## Type Checking

Python projects may use type checkers:
- `mypy` — most common, configured in `pyproject.toml` or `mypy.ini`
- `pyright` — Microsoft's type checker, often via Pylance
- `pytype` — Google's type checker

Detection: check `pyproject.toml` `[tool.mypy]` or `mypy.ini` existence.
