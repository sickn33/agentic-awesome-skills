from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import yaml


@dataclass(frozen=True)
class Option:
    key: str
    type: str
    default: Any
    description: str
    affects: tuple[str, ...]
    env: str | None = None
    allowed: tuple[str, ...] = ()
    sensitive: bool = False


def option(
    key: str,
    value_type: str,
    default: Any,
    description: str,
    affects: tuple[str, ...],
    env: str | None = None,
    allowed: tuple[str, ...] = (),
    sensitive: bool = False,
) -> Option:
    return Option(key, value_type, default, description, affects, env, allowed, sensitive)


OPTIONS: tuple[Option, ...] = (
    option("defaults.port", "integer", 8080, "Fallback application port when detection finds no stronger signal.", ("EXPOSE", "healthcheck", "runtime command"), "PORT"),
    option("defaults.health", "path", "/health", "Fallback health endpoint path.", ("HEALTHCHECK",), "HEALTH"),
    option("defaults.health_start", "duration", "10s", "Default healthcheck start period.", ("HEALTHCHECK",)),
    option("defaults.stopsignal", "signal", "", "Optional container stop signal.", ("STOPSIGNAL",), "STOPSIGNAL"),
    option("defaults.compose_bind", "enum", "127.0.0.1", "Host address used for published application ports.", ("compose.yaml ports",), "COMPOSE_BIND", ("127.0.0.1", "0.0.0.0", "::1", "::")),
    option("images.alpine", "image_version", "3.24.1", "Alpine base image version.", ("FROM",), allowed=("3.24.1",)),
    option("images.rust", "image_version", "1.89-alpine", "Rust builder image version.", ("FROM", "Cargo build")),
    option("images.python", "image", "python:3.12.4-alpine", "Default Python base image.", ("FROM",)),
    option("images.node", "image", "node:20-alpine", "Default Node.js base image.", ("FROM",)),
    option("images.ruby", "image", "ruby:3.2-alpine", "Default Ruby base image.", ("FROM",)),
    option("images.elixir", "image", "elixir:1.15-alpine", "Default Elixir base image.", ("FROM",)),
    option("images.php", "image", "php:8.2-fpm-alpine", "Default PHP-FPM base image.", ("FROM",)),
    option("images.swift", "image", "swift:5.10-amazonlinux2", "Default Swift toolchain image.", ("FROM",)),
    option("images.haskell", "image", "haskell:9.4", "Default Haskell toolchain image.", ("FROM",)),
    option("images.nginx", "image", "nginx:1.30-alpine", "SPA nginx runtime image.", ("FROM",)),
    option("images.deno", "image", "denoland/deno:alpine", "Deno runtime image.", ("FROM",)),
    option("images.sbt", "image", "eclipse-temurin:11-jdk", "Scala SBT builder image.", ("FROM",)),
    option("images.maven", "image", "maven:3.9-eclipse-temurin-21", "Maven builder image.", ("FROM",)),
    option("images.gradle", "image", "gradle:8.5-jdk21", "Gradle builder image.", ("FROM",)),
    option("images.conda", "image", "continuumio/miniconda3:24.11.1-0", "Conda Python image.", ("FROM",)),
    option("images.clojure_lein", "image", "clojure:tools-deps:1.11.1.1435-jdk-21", "Clojure Lein image.", ("FROM",)),
    option("images.clojure_tools_deps", "image", "clojure:temurin-21-tools-deps", "Clojure tools.deps image.", ("FROM",)),
    option("images.dotnet_major", "integer", 8, ".NET major SDK/runtime version.", ("FROM",)),
    option("images.java_major", "integer", 21, "Java major version.", ("FROM", "healthcheck")),
    option("images.gradle_version", "version", "8.5", "Gradle version used when no wrapper exists.", ("FROM",)),
    option("escape_hatches.copy", "multiline", "", "Allowlisted extra COPY instructions.", ("Dockerfile",), "EXTRA_COPY"),
    option("escape_hatches.run", "multiline", "", "Allowlisted extra RUN instructions.", ("Dockerfile",), "EXTRA_RUN"),
    option("escape_hatches.directives", "multiline", "", "Allowlisted extra top-level Dockerfile directives.", ("Dockerfile",), "EXTRA_DIRECTIVES"),
    option("release_assets.asset_url", "url", "", "Optional Dockerfile-2 asset URL template.", ("Dockerfile-2",), "D2_ASSET_URL"),
    option("release_assets.asset_sha_url", "url", "", "Optional Dockerfile-2 checksum URL template.", ("Dockerfile-2",), "D2_ASSET_SHA_URL"),
    option("release_assets.default_release", "string", "latest", "Default release selector for generated Dockerfile-2.", ("Dockerfile-2",), allowed=("latest",)),
    option("languages.python.default_port", "integer", 8000, "Fallback Python application port.", ("EXPOSE", "uvicorn command")),
    option("languages.go.default_port", "integer", 8080, "Fallback Go application port.", ("EXPOSE",)),
    option("languages.node.default_port", "integer", 3000, "Fallback Node.js application port.", ("EXPOSE", "runtime command")),
    option("languages.rust.default_port", "integer", 8000, "Fallback Rust application port.", ("EXPOSE",)),
    option("languages.java.default_port", "integer", 8080, "Fallback Java application port.", ("EXPOSE", "runtime command")),
    option("languages.kotlin.default_port", "integer", 8080, "Fallback Kotlin application port.", ("EXPOSE", "runtime command")),
    option("languages.ruby.default_port", "integer", 8080, "Fallback Ruby application port.", ("EXPOSE", "runtime command")),
    option("languages.csharp.default_port", "integer", 5000, "Fallback .NET application port.", ("EXPOSE", "ASPNETCORE_URLS")),
    option("languages.php.default_port", "integer", 8000, "Fallback PHP application port.", ("EXPOSE", "nginx listen")),
    option("languages.swift.default_port", "integer", 8080, "Fallback Swift application port.", ("EXPOSE",)),
    option("languages.scala.default_port", "integer", 9000, "Fallback Scala application port.", ("EXPOSE",)),
    option("languages.elixir.default_port", "integer", 4000, "Fallback Elixir application port.", ("EXPOSE",)),
    option("languages.clojure.default_port", "integer", 9000, "Fallback Clojure application port.", ("EXPOSE",)),
    option("languages.haskell.default_port", "integer", 8080, "Fallback Haskell application port.", ("EXPOSE",)),
    option("languages.spa.default_port", "integer", 3000, "Fallback SPA development server port.", ("EXPOSE",)),
    option("frameworks.fastify.start", "command", "npm start", "Explicit Fastify start command.", ("CMD",), allowed=("npm start",)),
    option("frameworks.spring.health_paths", "list", "/actuator/health/liveness,/actuator/health", "Spring health endpoint candidates.", ("HEALTHCHECK", "HEALTH_PATH")),
    option("frameworks.rails.docroot", "string", "public", "Rails public document root.", ("nginx root",)),
    option("frameworks.laravel.docroot", "string", "public", "Laravel public document root.", ("nginx root",)),
    option("backing_services.postgres.image", "image", "postgres:16-alpine", "PostgreSQL backing service image.", ("compose.yaml",)),
    option("backing_services.postgres.port", "integer", 5432, "PostgreSQL backing service port.", ("compose.yaml",)),
    option("backing_services.mysql.image", "image", "mysql:8.0", "MySQL backing service image.", ("compose.yaml",)),
    option("backing_services.mysql.port", "integer", 3306, "MySQL backing service port.", ("compose.yaml",)),
    option("backing_services.mariadb.image", "image", "mariadb:11", "MariaDB backing service image.", ("compose.yaml",)),
    option("backing_services.mariadb.port", "integer", 3306, "MariaDB backing service port.", ("compose.yaml",)),
    option("backing_services.redis.image", "image", "redis:7-alpine", "Redis backing service image.", ("compose.yaml",)),
    option("backing_services.redis.port", "integer", 6379, "Redis backing service port.", ("compose.yaml",)),
    option("backing_services.mongo.image", "image", "mongo:6.0.6", "MongoDB backing service image.", ("compose.yaml",)),
    option("backing_services.mongo.port", "integer", 27017, "MongoDB backing service port.", ("compose.yaml",)),
    option("backing_services.rabbitmq.image", "image", "rabbitmq:3.11.17-management-alpine", "RabbitMQ backing service image.", ("compose.yaml",)),
    option("backing_services.rabbitmq.port", "integer", 5672, "RabbitMQ backing service port.", ("compose.yaml",)),
    option("backing_services.kafka.image", "image", "bitnami/kafka:3.7", "Kafka backing service image.", ("compose.yaml",)),
    option("backing_services.kafka.port", "integer", 9092, "Kafka backing service port.", ("compose.yaml",)),
    option("backing_services.elasticsearch.image", "image", "elasticsearch:8.15.0", "Elasticsearch backing service image.", ("compose.yaml",)),
    option("backing_services.elasticsearch.port", "integer", 9200, "Elasticsearch backing service port.", ("compose.yaml",)),
    option("backing_services.cassandra.image", "image", "cassandra:5", "Cassandra backing service image.", ("compose.yaml",)),
    option("backing_services.cassandra.port", "integer", 9042, "Cassandra backing service port.", ("compose.yaml",)),
    option("backing_services.neo4j.image", "image", "neo4j:5.20", "Neo4j backing service image.", ("compose.yaml",)),
    option("backing_services.neo4j.port", "integer", 7474, "Neo4j HTTP backing service port.", ("compose.yaml",)),
    option("backing_services.nats.image", "image", "nats:2.10-alpine", "NATS backing service image.", ("compose.yaml",)),
    option("backing_services.nats.port", "integer", 4222, "NATS backing service port.", ("compose.yaml",)),
    option("backing_services.minio.image", "image", "minio/minio:RELEASE.2024-01-16T16-07-38Z", "MinIO backing service image.", ("compose.yaml",)),
    option("backing_services.minio.port", "integer", 9000, "MinIO backing service port.", ("compose.yaml",)),
    option("backing_services.memcached.image", "image", "memcached:1.6-alpine", "Memcached backing service image.", ("compose.yaml",)),
    option("backing_services.memcached.port", "integer", 11211, "Memcached backing service port.", ("compose.yaml",)),
    option("backing_services.mssql.image", "image", "mcr.microsoft.com/mssql/server:2022-latest", "SQL Server backing service image.", ("compose.yaml",)),
    option("backing_services.mssql.port", "integer", 1433, "SQL Server backing service port.", ("compose.yaml",)),
)

OPTIONS_BY_KEY = {item.key: item for item in OPTIONS}


def nested_defaults() -> dict[str, Any]:
    result: dict[str, Any] = {"schema": {"version": 1}}
    for item in OPTIONS:
        parts = item.key.split(".")
        node = result
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = item.default
    return result


def render_scalar(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        return "'" + value.replace("'", "''") + "'"
    return yaml.safe_dump(value, default_flow_style=True, sort_keys=False).strip().rstrip(".")


def render_defaults_yaml() -> str:
    data = nested_defaults()
    lines = [
        "# Docker File Generator global defaults",
        "# Generated from docker_file_generator/registry.py.",
        "# Edit project overrides in dockerfile.yaml; do not edit this file casually.",
        "schema:",
        "  version: 1",
    ]

    def emit(node: dict[str, Any], prefix: str = "", indent: int = 0) -> None:
        for key, value in node.items():
            if prefix == "" and key == "schema":
                continue
            path = f"{prefix}.{key}" if prefix else key
            spacing = " " * indent
            if isinstance(value, dict):
                lines.append(f"{spacing}{key}:")
                emit(value, path, indent + 2)
                continue
            item = OPTIONS_BY_KEY[path]
            lines.append("")
            lines.append(f"{spacing}# {item.description}")
            lines.append(f"{spacing}# affects: {', '.join(item.affects)}")
            if item.allowed:
                lines.append(f"{spacing}# allowed: {', '.join(item.allowed)}")
            lines.append(f"{spacing}{key}: {render_scalar(value)}")

    emit(data)
    return "\n".join(lines) + "\n"