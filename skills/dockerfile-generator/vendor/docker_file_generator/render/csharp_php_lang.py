"""C# (.NET) and PHP detection and rendering.

Ported from detect_csharp() and detect_php() (plus php_runtime_block) in
legacy/create-dockerfile-legacy.sh: multi-project COPY layouts, Kestrel URL
propagation, composer extension selection and the non-root PHP-FPM + nginx
runtime block.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from ..detection.common import EXCLUDED_DIRS, detect_data_dirs, detect_health_endpoint, port_from, volume_line
from .postprocess import EnvScan, Render, RenderOptions, finalize, health_block, regex_names, sanitize

# ---------- C# ----------

CS_DOCKERIGNORE = """\
.git
.gitignore
README.md
*.md
docs/
bin/
obj/
*.user
*.suo
.vs/
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
"""

CS_ENV_SCAN = EnvScan(
    patterns=(regex_names(r"GetEnvironmentVariable\(\"([A-Za-z_][A-Za-z0-9_]*)\""),),
    includes=("*.cs",),
    label="csharp env names",
)

CS_RESTORE_FILES = ("*.sln", "Directory.Build.props", "Directory.Build.targets", "Directory.Packages.props", "NuGet.config", "nuget.config")


@dataclass
class CSharpFacts:
    language: str = "csharp"
    framework: str = "dotnet"
    package: str = ""
    port: str = "5000"
    health_path: str = "/health"
    health_guessed: bool = True
    dotnet_major: str = "8"
    url_env: str = ""
    copy1: str = ""
    copy2: str = ""
    data_dirs: list[str] = field(default_factory=list)
    volume_line: str = ""
    guessed: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def detective_lines(self) -> list[str]:
        lines = ["=== Detective Results ===", f"[PASS] Framework: {self.framework}"]
        lines.append(f"[PASS] Package: {self.package}")
        lines.append(f"[PASS] Port: {self.port}")
        lines.append(f"[PASS] Health: {self.health_path}")
        lines.extend(self.notes)
        return lines


def detects_csharp(root: Path) -> bool:
    return any(root.glob("*.csproj")) or any(root.glob("*.sln"))


def _xml_value(tag: str, path: Path) -> str:
    if not path.is_file():
        return ""
    pattern = re.compile(rf".*<{tag}>([^<]+)</{tag}>.*")
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        match = pattern.match(line)
        if match:
            return match.group(1)
    return ""


def detect_csharp(project_dir: str | Path = ".", *, health_override: str | None = None) -> CSharpFacts:
    root = Path(project_dir).resolve()
    facts = CSharpFacts()
    projects = sorted(root.glob("*.csproj"))

    if projects:
        text = "\n".join(path.read_text(encoding="utf-8", errors="replace") for path in projects)
        if "Microsoft.NET.Sdk.Web" in text:
            facts.framework = "aspnet"
        elif "Microsoft.NET.Sdk.Worker" in text:
            facts.framework = "worker"
        else:
            facts.framework = "dotnet"
    else:
        facts.framework = "dotnet"

    for path in projects:
        value = _xml_value("AssemblyName", path)
        if value:
            facts.package = value
            break
    facts.package = facts.package or root.name

    port_line = ""
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix not in {".cs", ".json"}:
            continue
        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if re.search(r"Urls|Kestrel|PORT|port", line):
                port_line = line
                break
        if port_line:
            break
    port = port_from(port_line) if port_line else ""
    if port:
        facts.port = port
    else:
        facts.port = "5000"
        facts.guessed.append("port")
    if facts.framework == "aspnet":
        facts.url_env = f"ENV ASPNETCORE_URLS=http://+:{facts.port}"

    facts.health_path, facts.health_guessed, _source = detect_health_endpoint(root, health_override)
    if facts.health_guessed:
        facts.guessed.append("health")

    facts.data_dirs = detect_data_dirs(root)
    facts.volume_line = volume_line(facts.data_dirs)

    global_json = root / "global.json"
    if global_json.is_file():
        match = re.search(r'"version"\s*:\s*"([0-9]+)', global_json.read_text(encoding="utf-8", errors="replace"))
        if match and match.group(1) in {"8", "9"}:
            facts.dotnet_major = match.group(1)

    if len(projects) > 1 or any(root.glob("*.sln")):
        copy1 = ""
        # csproj-first: the restore layer stays cached across source edits.
        all_projects = sorted(
            str(path.relative_to(root))
            for path in root.rglob("*.csproj")
            if "bin" not in path.parts and "obj" not in path.parts
        )
        for relative in all_projects:
            directory = str(Path(relative).parent)
            copy1 += f"COPY {relative} ./{'' if directory == '.' else directory + '/'}\n"
        for pattern in CS_RESTORE_FILES:
            for path in sorted(root.glob(pattern)):
                copy1 += f"COPY {path.name} ./\n"
        if copy1:
            facts.notes.append("[PASS] Multi-project dotnet: csproj-first copy (restore layer stays cached)")
            facts.copy1 = copy1
            facts.copy2 = "COPY . ."
        else:
            facts.notes.append("[PASS] Multi-project dotnet: full-context copy")
            facts.copy1 = "COPY . ."
            facts.copy2 = ""
    else:
        facts.copy1 = "COPY *.csproj ./"
        facts.copy2 = "COPY . ."
    return facts


def render_csharp(facts: CSharpFacts, root: Path, options: RenderOptions) -> Render:
    body = [
        f"FROM mcr.microsoft.com/dotnet/sdk:{facts.dotnet_major}.0 AS builder",
        "WORKDIR /app",
        facts.copy1,
        "RUN dotnet restore",
        facts.copy2,
        "RUN dotnet publish -c Release -o out --no-restore",
        "",
        f"FROM mcr.microsoft.com/dotnet/aspnet:{facts.dotnet_major}.0",
        "RUN apt-get update && apt-get install -y --no-install-recommends curl tini && rm -rf /var/lib/apt/lists/*",
        "WORKDIR /app",
        "COPY --from=builder /app/out .",
        facts.url_env,
        "# WORKDIR above is load-bearing twice: the COPY target resolves under /app",
        "# (not filesystem /), and the env-name inserter anchors on it.",
        f"EXPOSE {facts.port}",
        "RUN if ! getent group app >/dev/null; then addgroup --system app; fi && \\\n    if ! id -u app >/dev/null 2>&1; then adduser --system --ingroup app app; fi",
        "USER app",
        # aspnet images ship curl but not wget
        _curl_health(facts.port, facts.health_path, facts.health_guessed, options.health_start),
        facts.volume_line,
        f'ENTRYPOINT ["/usr/bin/tini", "--", "dotnet", "{facts.package}.dll"]',
    ]
    return finalize(
        body,
        CS_DOCKERIGNORE,
        root,
        options,
        detected_port=facts.port,
        detected_health=facts.health_path,
        guessed=facts.guessed,
        env_scan=CS_ENV_SCAN,
        oci_title=sanitize(root.name),
    )


def _curl_health(port: str, path: str, guessed: bool, start: str) -> str:
    if guessed:
        return (
            "# HEALTHCHECK omitted: no health route found in source - a guessed path would 404 and stay unhealthy forever.\n"
            f"# To enable: add a real health endpoint (e.g. GET {path}) or rerun with HEALTH=/your/path."
        )
    return (
        f"HEALTHCHECK --interval=30s --timeout=5s --start-period={start} --retries=3 \\\n"
        f'  CMD curl -sf http://localhost:{port}{path} || exit 1'
    )


# ---------- PHP ----------

PHP_DOCKERIGNORE = """\
.git
.gitignore
README.md
*.md
docs/
vendor/
node_modules/
.env
storage/logs/
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.vscode/
.idea/
"""

PHP_EXTENSIONS = ("pdo", "pdo_mysql", "pdo_pgsql", "pdo_sqlite", "mbstring", "xml", "curl", "zip", "gd", "intl", "bcmath", "soap", "exif", "pcntl", "sockets")
PHP_PECL_EXTENSIONS = ("redis", "swoole", "pcov")


@dataclass
class PhpFacts:
    language: str = "php"
    framework: str = "php"
    port: str = "8000"
    health_path: str = "/health"
    health_guessed: bool = True
    image: str = "php:8.2-fpm-alpine"
    image_source: str = "registry default"
    deps_copy: str = "COPY composer.json ./"
    run_prefix: str = "RUN"
    extensions: str = "opcache"
    pecl_run: str = ""
    docroot: str = "/var/www/html"
    data_dirs: list[str] = field(default_factory=list)
    volume_line: str = ""
    guessed: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def detective_lines(self) -> list[str]:
        lines = ["=== Detective Results ===", f"[PASS] Framework: {self.framework}"]
        lines.append(f"[PASS] Port: {self.port}")
        lines.append(f"[PASS] Health: {self.health_path}")
        lines.extend(self.notes)
        return lines


def detects_php(root: Path) -> bool:
    return (root / "composer.json").is_file()


def php_image(root: Path, default: str = "php:8.2-fpm-alpine") -> tuple[str, str]:
    composer = root / "composer.json"
    if composer.is_file():
        match = re.search(r'"php"\s*:\s*"[~^><=]*\s*([0-9]+\.[0-9]+)', composer.read_text(encoding="utf-8", errors="replace"))
        if match:
            return f"php:{match.group(1)}-fpm-alpine", "composer.json"
    tool_versions = root / ".tool-versions"
    if tool_versions.is_file():
        for line in tool_versions.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.split("#", 1)[0].split()[:1] == ["php"]:
                match = re.match(r"([0-9]+\.[0-9]+)", line.split("#", 1)[0].split()[1])
                if match:
                    return f"php:{match.group(1)}-fpm-alpine", ".tool-versions"
    return default, "registry default"


PHP_RUNTIME_TEMPLATE = """\
RUN apk add --no-cache ca-certificates nginx supervisor tini wget
RUN sed -i \\
    -e '/^user /d' \\
    -e '1i pid /tmp/nginx.pid;' \\
    -e 's|^pid .*;|pid /tmp/nginx.pid;|' \\
    -e 's|^error_log .*;|error_log /dev/stderr;|' \\
    -e 's|^access_log .*;|access_log /dev/stdout;|' \\
    /etc/nginx/nginx.conf
RUN addgroup -S app && adduser -S app -G app && \\
    mkdir -p /var/www/html/storage /var/www/html/bootstrap/cache /var/lib/nginx/logs /var/log/nginx /tmp/nginx-client /tmp/nginx-proxy /tmp/nginx-fastcgi /tmp/nginx-uwsgi /tmp/nginx-scgi && \\
    chown -R app:app /var/www/html /var/lib/nginx/logs /var/log/nginx /tmp/nginx-*
RUN printf '%s\\n' \\
    '[global]' \\
    'error_log = /proc/self/fd/2' \\
    'daemonize = no' \\
    '[www]' \\
    'user = app' \\
    'group = app' \\
    'listen = 127.0.0.1:9000' \\
    'pm = dynamic' \\
    'pm.max_children = 5' \\
    'pm.start_servers = 2' \\
    'pm.min_spare_servers = 1' \\
    'pm.max_spare_servers = 3' \\
    'clear_env = no' \\
    'catch_workers_output = yes' \\
    > /usr/local/etc/php-fpm.conf
RUN printf '%s\\n' \\
    'server {{' \\
    '    listen {port};' \\
    '    server_name _;' \\
    '    root {docroot};' \\
    '    index index.php;' \\
    '    access_log /dev/stdout;' \\
    '    error_log /dev/stderr;' \\
    '    client_body_temp_path /tmp/nginx-client;' \\
    '    proxy_temp_path /tmp/nginx-proxy;' \\
    '    fastcgi_temp_path /tmp/nginx-fastcgi;' \\
    '    uwsgi_temp_path /tmp/nginx-uwsgi;' \\
    '    scgi_temp_path /tmp/nginx-scgi;' \\
    '    location / {{' \\
    '        try_files $uri $uri/ /index.php?$query_string;' \\
    '    }}' \\
    '    location ~ \\.php$ {{' \\
    '        try_files $uri =404;' \\
    '        include fastcgi_params;' \\
    '        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;' \\
    '        fastcgi_param HTTP_PROXY "";' \\
    '        fastcgi_pass 127.0.0.1:9000;' \\
    '    }}' \\
    '    location ~ /\\. {{ deny all; }}' \\
    '}}' \\
    > /etc/nginx/http.d/default.conf
RUN printf '%s\\n' \\
    '[supervisord]' \\
    'nodaemon=true' \\
    'logfile=/tmp/supervisord.log' \\
    'pidfile=/tmp/supervisord.pid' \\
    '[program:php-fpm]' \\
    'command=php-fpm --nodaemonize --fpm-config /usr/local/etc/php-fpm.conf' \\
    'directory=/var/www/html' \\
    'autostart=true' \\
    'autorestart=true' \\
    'stopasgroup=true' \\
    'killasgroup=true' \\
    'stdout_logfile=/dev/stdout' \\
    'stdout_logfile_maxbytes=0' \\
    'stderr_logfile=/dev/stderr' \\
    'stderr_logfile_maxbytes=0' \\
    '[program:nginx]' \\
    'command=nginx -g "daemon off;"' \\
    'directory=/var/www/html' \\
    'autostart=true' \\
    'autorestart=true' \\
    'stopasgroup=true' \\
    'killasgroup=true' \\
    'stdout_logfile=/dev/stdout' \\
    'stdout_logfile_maxbytes=0' \\
    'stderr_logfile=/dev/stderr' \\
    'stderr_logfile_maxbytes=0' \\
    > /etc/supervisord.conf
RUN chmod 644 /etc/supervisord.conf
ENV APP_ENV=production \\
    PHP_ENV=production
EXPOSE {port}
USER app
{health_block}
{volume_line}
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
"""


def php_runtime_block(port: str, docroot: str, health: str, volume: str) -> str:
    """Non-root PHP-FPM + nginx under supervisor (php_runtime_block port).

    Extracted verbatim from the Bash heredoc so the two stay byte-identical.
    """
    return PHP_RUNTIME_TEMPLATE.format(port=port, docroot=docroot, health_block=health, volume_line=volume)


def detect_php(project_dir: str | Path = ".", *, health_override: str | None = None) -> PhpFacts:
    root = Path(project_dir).resolve()
    facts = PhpFacts()
    facts.image, facts.image_source = php_image(root)

    composer = root / "composer.json"
    text = composer.read_text(encoding="utf-8", errors="replace") if composer.is_file() else ""
    if "laravel" in text:
        facts.framework = "laravel"
    elif "symfony" in text:
        facts.framework = "symfony"
    elif "cakephp" in text:
        facts.framework = "cakephp"
    else:
        facts.framework = "php"

    port_line = ""
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix not in {".php"} and path.name != ".env":
            continue
        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if re.search(r"PORT|listen", line):
                port_line = line
                break
        if port_line:
            break
    port = port_from(port_line) if port_line else ""
    if port:
        facts.port = port
    else:
        facts.port = "8000"
        facts.guessed.append("port")

    facts.health_path, facts.health_guessed, _source = detect_health_endpoint(root, health_override)
    if facts.health_guessed:
        facts.guessed.append("health")

    facts.data_dirs = detect_data_dirs(root)
    facts.volume_line = volume_line(facts.data_dirs)

    facts.deps_copy = "COPY composer.json composer.lock ./" if (root / "composer.lock").is_file() else "COPY composer.json ./"
    if (root / "auth.json").is_file():
        facts.run_prefix = "RUN --mount=type=secret,id=composer,target=/var/www/html/auth.json"
        facts.notes.append("[PASS] Private registry: auth.json via BuildKit secret (not in image)")

    extensions = ["opcache"]
    for name in PHP_EXTENSIONS:
        if f'"ext-{name}"' in text:
            extensions.append(name)
    facts.extensions = " ".join(extensions)

    pecl = [name for name in PHP_PECL_EXTENSIONS if f'"ext-{name}"' in text]
    if pecl:
        joined = " ".join(pecl)
        # Single-quoted on purpose: $PHPIZE_DEPS must reach the image literally.
        facts.pecl_run = (
            "RUN apk add --no-cache $PHPIZE_DEPS linux-headers && \\\n"
            f"    pecl install {joined} && \\\n"
            f"    docker-php-ext-enable {joined} && \\\n"
            "    apk del $PHPIZE_DEPS"
        )
        facts.notes.append(f"[PASS] PHP PECL extensions: {joined}")
    facts.notes.append(f"[PASS] PHP extensions: {facts.extensions}")

    facts.docroot = "/var/www/html/public" if (root / "public").is_dir() else "/var/www/html"
    facts.notes.append(f"[PASS] Document root: {facts.docroot}")
    return facts


def render_php(facts: PhpFacts, root: Path, options: RenderOptions) -> Render:
    # The runtime block is one Bash heredoc: port, docroot, health and volume
    # are substituted inside it, and it already carries ENV/EXPOSE/USER/
    # ENTRYPOINT/CMD. Splice it on as a tail so finalize()'s EXTRA_*/env/OCI
    # insertions still land in the right place.
    runtime = php_runtime_block(
        facts.port,
        facts.docroot,
        health_block(facts.port, facts.health_path, facts.health_guessed, options.health_start),
        facts.volume_line,
    )
    body = [
        f"FROM {facts.image}",
        "COPY --from=composer:2 /usr/bin/composer /usr/bin/composer",
        "WORKDIR /var/www/html",
        facts.deps_copy,
        "RUN apk add --no-cache libpng-dev libzip-dev icu-dev oniguruma-dev && \\\n    docker-php-ext-install " + facts.extensions,
        facts.pecl_run,
        f"{facts.run_prefix} composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist",
        "COPY . .",
    ]
    return finalize(
        body,
        PHP_DOCKERIGNORE,
        root,
        options,
        detected_port=facts.port,
        detected_health=facts.health_path,
        guessed=facts.guessed,
        env_scan=EnvScan(patterns=(regex_names(r"getenv\(['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]"),), includes=("*.php",), label="php env names"),
        oci_title=sanitize(root.name),
        tail=runtime,
    )