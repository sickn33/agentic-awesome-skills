"""Node.js and SPA (Vue/Vite) detection and rendering.

Ported from detect_node() and detect_spa() in
legacy/create-dockerfile-legacy.sh: the SPA-first routing rule, package
manager pinning (corepack/bun/pnpm/yarn/npm/deno), the fastify scripts.start
rescue, ts-node dev-deps and the nginx runtime for static sites.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from ..detection.common import EXCLUDED_DIRS, detect_data_dirs, port_from, volume_line
from .postprocess import EnvScan, Render, RenderOptions, finalize, health_block, regex_names, sanitize

NODE_DOCKERIGNORE = """\
.git
.gitignore
README.md
*.md
docs/
node_modules/
npm-debug.log*
.vscode/
.idea/
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
test/
tests/
coverage/
.nyc_output/
"""

SPA_DOCKERIGNORE = """\
.git
.gitignore
README.md
*.md
docs/
node_modules/
dist/
npm-debug.log*
.vscode/
.idea/
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

SERVER_FRAMEWORKS = ("express", "fastify", "@nestjs", "hapi", "koa")
NODE_ENV_SCAN = EnvScan(
    patterns=(
        regex_names(r"process\.env\.([A-Za-z_][A-Za-z0-9_]*)"),
        regex_names(r"""process\.env\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]"""),
        regex_names(r"import\.meta\.env\.(VITE_[A-Za-z0-9_]*)"),
    ),
    includes=("*.js", "*.ts", "*.mjs", "*.cjs", "*.vue"),
    label="node env names",
)
# SPA projects are still LANGUAGE=node for env detection, so they use the same
# patterns; only the ENV re-export is stripped (static sites never read it).
SPA_ENV_SCAN = NODE_ENV_SCAN


@dataclass
class NodeFacts:
    language: str = "node"
    framework: str = "node"
    port: str = "3000"
    health_path: str = "/health"
    health_guessed: bool = True
    health_note: str = ""
    main_file: str = "index.js"
    special_tools: str = ""
    image: str = "node:20-alpine"
    image_source: str = "registry default"
    package_manager: str = "npm"
    manager_note: str = ""
    deps_copy: str = "COPY package*.json ./"
    install: str = "RUN npm install"
    prune: str = "RUN npm prune --omit=dev"
    build: str = ""
    build_image: str = ""
    run_image: str = ""
    deno_image: str = "denoland/deno:alpine"
    deno_env: str = ""
    deno_runtime_copy: str = ""
    modules_copy: str = "# Two layers on purpose: node_modules stays cached on source-only changes\nCOPY --from=builder /app/node_modules ./node_modules"
    run_cmd: str = ""
    data_dirs: list[str] = field(default_factory=list)
    volume_line: str = ""
    npmrc: bool = False
    guessed: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    post_manager_notes: list[str] = field(default_factory=list)
    banner_warning: str = ""

    def detective_lines(self) -> list[str]:
        lines = ["=== Detective Results ==="]
        if self.banner_warning:
            lines.append(self.banner_warning)
        lines.append(f"[PASS] Framework: {self.framework}")
        lines.append(f"[PASS] Port: {self.port}")
        lines.append(f"[PASS] Health: {self.health_path}")
        if self.health_note:
            lines.append(self.health_note)
        lines.append(f"[PASS] Entry point: {self.main_file}")
        if self.special_tools:
            lines.append(f"[PASS] Special tools: {self.special_tools}")
        lines.extend(self.notes)
        lines.append(f"[PASS] Package manager: {self.package_manager}")
        # .npmrc is wired after the manager line (D1c runs post-detection).
        for note in self.post_manager_notes:
            lines.append(note)
        return lines


@dataclass
class SpaFacts:
    language: str = "spa"
    framework: str = "vite-spa"
    port: str = "80"
    health_path: str = "/"
    image: str = "node:20-alpine"
    nginx_image: str = "nginx:1.30-alpine"
    package_manager: str = "npm"
    deps_copy: str = "COPY package*.json ./"
    install: str = "RUN npm install"
    build: str = "RUN npm run build"
    apk: str = "RUN apk add --no-cache wget"
    runtime_fix: str = ""
    nginx_copy: str = ""
    subst_args: str = ""
    subst_run: str = ""
    user: str = ""
    volume_line: str = ""
    notes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    guessed: list[str] = field(default_factory=list)

    def detective_lines(self, banner: bool = False) -> list[str]:
        # detect_spa runs inside detect_node (which printed the banner), so SPA
        # only adds it when the plugin drives the run directly.
        lines = ["=== Detective Results ==="] if banner else []
        lines.append(f"[PASS] Framework: {self.framework} (static site -> nginx, not a Node server)")
        lines.append(f"[PASS] Port: {self.port}")
        if self.health_path == "/":
            lines.append("[PASS] Health: / (static root)")
        else:
            lines.append(f"[PASS] Health: {self.health_path} (from nginx.conf location)")
        lines.append(f"[PASS] Package manager: {self.package_manager} (full install - build needs devDependencies)")
        lines.extend(self.notes)
        for warning in self.warnings:
            lines.append(f"[WARN] {warning}")
        return lines


def _package_json(root: Path) -> str:
    path = root / "package.json"
    return path.read_text(encoding="utf-8", errors="replace") if path.is_file() else ""


def node_image_notes(root: Path, image: str, source: str, default: str = "node:20-alpine") -> list[str]:
    """Console lines for the node image.

    Bash prints a .nvmrc-specific line when the LTS codename resolved AND the
    generic "(from version file)" line whenever the image moved off the
    default - so both can appear. Order matters.
    """
    notes: list[str] = []
    nvmrc = root / ".nvmrc"
    if nvmrc.is_file() and source.startswith("from .nvmrc lts/"):
        notes.append(f"[PASS] Node image: {image} ({source})")
    if image != default:
        notes.append(f"[PASS] Node image: {image} (from version file)")
    return notes


def node_image(root: Path, default: str = "node:20-alpine") -> tuple[str, str]:
    nvmrc = root / ".nvmrc"
    if nvmrc.is_file():
        raw = nvmrc.read_text(encoding="utf-8", errors="replace").strip()
        match = re.match(r"[vV]?([0-9]+)", raw)
        if match:
            return f"node:{match.group(1)}-alpine", "from .nvmrc " + raw
        lts = raw.replace(" ", "")
        for codename, version in (("lts/jod", "22"), ("lts-jod", "22"), ("lts/iron", "20"), ("lts-iron", "20"), ("lts/krypton", "24"), ("lts-krypton", "24")):
            if lts == codename:
                return f"node:{version}-alpine", f"from .nvmrc {lts}"
    package = root / "package.json"
    if package.is_file():
        match = re.search(r'"node"\s*:\s*"[^0-9]*([0-9]+)', package.read_text(encoding="utf-8", errors="replace"))
        if match:
            return f"node:{match.group(1)}-alpine", "from version file"
    tool_versions = root / ".tool-versions"
    if tool_versions.is_file():
        for line in tool_versions.read_text(encoding="utf-8", errors="replace").splitlines():
            parts = line.split("#", 1)[0].split()
            if len(parts) >= 2 and parts[0] in {"nodejs", "node"}:
                match = re.match(r"[vV]?([0-9]+)", parts[1])
                if match:
                    return f"node:{match.group(1)}-alpine", ".tool-versions"
    return default, "registry default"


def _package_manager_pin(root: Path) -> tuple[str, str | None]:
    """packageManager field -> (tag, console note)."""
    text = _package_json(root)
    match = re.search(r'"packageManager"\s*:\s*"([^"]+)"', text)
    if not match:
        return "", None
    value = match.group(1)
    if value.startswith("pnpm@"):
        return value, f"[PASS] Package manager pin: {value} (from packageManager)"
    if value.startswith("yarn@"):
        version = value[len("yarn@"):]
        return version, f"[PASS] Package manager pin: yarn@{version} (from packageManager)"
    if value.startswith("bun@"):
        return value, f"[PASS] Package manager pin: {value} (from packageManager)"
    return value, None


def is_spa(root: Path) -> bool:
    """SPA tooling plus a real entry, and no server smell."""
    text = _package_json(root)
    if '"build"' not in text:
        return False
    has_tooling = "vue-cli-service" in text or "@vue/cli-service" in text or '"vite"' in text or (root / "vite.config.js").is_file() or (root / "vite.config.ts").is_file()
    if not has_tooling:
        return False
    if not ((root / "index.html").is_file() or (root / "public" / "index.html").is_file()):
        return False
    return True


def spa_server_warning(root: Path) -> str | None:
    """Why this SPA-looking project keeps the Node server template."""
    text = _package_json(root)
    if any(name in text for name in SERVER_FRAMEWORKS):
        return "Frontend tooling plus server framework found - keeping the Node server template"
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix not in {".js", ".ts", ".vue"}:
            continue
        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue
        if path.name in {"vite.config.js", "vite.config.ts", "vue.config.js"}:
            continue
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if ".listen(" in line or "createServer" in line:
                return "Frontend tooling plus server code found - keeping the Node server template"
    return None


def detects_node(root: Path) -> bool:
    return (root / "package.json").is_file() or (root / "deno.json").is_file() or (root / "deno.jsonc").is_file()


def detect_node(project_dir: str | Path = ".", *, health_override: str | None = None) -> NodeFacts:
    root = Path(project_dir).resolve()
    facts = NodeFacts()
    facts.image, facts.image_source = node_image(root)
    text = _package_json(root)

    if "express" in text:
        facts.framework = "express"
    elif "fastify" in text:
        facts.framework = "fastify"
    elif "@nestjs" in text:
        facts.framework = "nestjs"
    elif "hapi" in text:
        facts.framework = "hapi"
    elif "koa" in text:
        facts.framework = "koa"
    else:
        facts.framework = "node"

    port_line = ""
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix not in {".js", ".ts"}:
            continue
        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if "listen" in line or "PORT" in line:
                port_line = line
                break
        if port_line:
            break
    port = port_from(port_line) if port_line else ""
    if port:
        facts.port = port
    else:
        facts.port = "3000"
        facts.guessed.append("port")

    from ..detection.common import detect_health_endpoint

    facts.health_path, facts.health_guessed, _source = detect_health_endpoint(root, health_override)
    if facts.health_guessed:
        facts.guessed.append("health")

    match = re.search(r'"main"\s*:\s*"([^"]+)"', text)
    facts.main_file = match.group(1) if match else ""
    if not facts.main_file:
        for candidate in ("index.js", "src/index.js", "src/main.ts", "app.js"):
            if (root / candidate).is_file():
                facts.main_file = candidate
                break
        else:
            facts.main_file = "index.js"

    if "ts-node" in text:
        facts.special_tools = "ts-node"

    facts.data_dirs = detect_data_dirs(root)
    facts.volume_line = volume_line(facts.data_dirs)

    pin, pin_note = _package_manager_pin(root)
    if pin_note:
        facts.notes.append(pin_note)
    # _package_manager_pin normalizes the yarn pin to the bare version, so read
    # the raw packageManager value here: yarn 2+ needs corepack + --immutable.
    raw_pin = re.search(r'"packageManager"\s*:\s*"([^"]+)"', text)
    yarn_pinned = raw_pin.group(1) if raw_pin and raw_pin.group(1).startswith("yarn@") else ""
    pnpm_tag = pin if pin.startswith("pnpm@") else "pnpm"
    bun_tag = pin if pin.startswith("bun@") else "bun"
    yarn_setup = "npm i -g yarn"
    yarn_install = "yarn install --frozen-lockfile"
    yarn_prune = "yarn install --production --ignore-scripts"
    if yarn_pinned:
        version = yarn_pinned[len("yarn@"):]
        if version.startswith("1."):
            yarn_setup = f"npm i -g yarn@{version}"
        else:
            yarn_setup = f"corepack enable && corepack prepare yarn@{version} --activate"
            yarn_install = "yarn install --immutable"
            yarn_prune = 'yarn workspaces focus --production 2>/dev/null || echo "WARNING: yarn berry could not prune dev deps - image stays larger than needed" >&2'

    deno_files = [name for name in ("deno.json", "deno.jsonc") if (root / name).is_file()]
    if (root / "deno.lock").is_file() or deno_files:
        facts.package_manager = "deno"
        facts.build_image = facts.deno_image
        facts.run_image = facts.deno_image
        # Exactly the Bash assignments: DENOCFG="deno.json" (bare) or
        # DENOCFG="${DENOCFG} deno.jsonc" (space-prefixed). A jsonc-only project
        # therefore ends up with a LEADING space, which the emitted COPY keeps.
        config = ""
        if (root / "deno.json").is_file():
            config = "deno.json"
        if (root / "deno.jsonc").is_file():
            config = f"{config} deno.jsonc"
        if (root / "package.json").is_file():
            config = f"{config} package.json"
        lock = " deno.lock" if (root / "deno.lock").is_file() else ""
        facts.deps_copy = f"COPY {config}{lock} ./"
        facts.install = "RUN deno install"
        facts.deno_env = "ENV DENO_DIR=/deno-dir"
        facts.modules_copy = ""
        facts.deno_runtime_copy = "COPY --from=builder /deno-dir /deno-dir\nENV DENO_DIR=/deno-dir"
        facts.prune = ""
    elif (root / "bun.lockb").is_file() or (root / "bun.lock").is_file():
        facts.package_manager = "bun"
        lock = "bun.lockb" if (root / "bun.lockb").is_file() else "bun.lock"
        facts.deps_copy = f"COPY package.json {lock} ./"
        facts.install = f"RUN npm i -g {bun_tag} && bun install --frozen-lockfile"
        facts.prune = "RUN bun install --production"
    elif (root / "pnpm-lock.yaml").is_file():
        facts.package_manager = "pnpm"
        facts.deps_copy = "COPY package.json pnpm-lock.yaml ./"
        facts.install = f"RUN npm i -g {pnpm_tag} && pnpm i --frozen-lockfile"
        facts.prune = "RUN pnpm prune --prod"
    elif (root / "yarn.lock").is_file():
        facts.package_manager = "yarn"
        facts.deps_copy = "COPY package.json yarn.lock ./"
        facts.install = f"RUN {yarn_setup} && {yarn_install}"
        facts.prune = f"RUN {yarn_setup} && {yarn_prune}"
    else:
        facts.package_manager = "npm"
        facts.deps_copy = "COPY package*.json ./"
        facts.install = "RUN npm ci" if (root / "package-lock.json").is_file() else "RUN npm install"
        facts.prune = "RUN npm prune --omit=dev"
    facts.build_image = facts.build_image or facts.image
    facts.run_image = facts.run_image or facts.image

    if facts.package_manager == "deno":
        deno_text = "\n".join((root / name).read_text(encoding="utf-8", errors="replace") for name in deno_files)
        if re.search(r'"start"\s*:', deno_text):
            facts.run_cmd = 'CMD ["deno", "task", "start"]'
        elif (root / "main.ts").is_file():
            facts.run_cmd = 'CMD ["deno", "run", "--allow-all", "main.ts"]'
        elif (root / "main.js").is_file():
            facts.run_cmd = 'CMD ["deno", "run", "--allow-all", "main.js"]'
        elif (root / "mod.ts").is_file():
            facts.run_cmd = 'CMD ["deno", "run", "--allow-all", "mod.ts"]'
        else:
            facts.run_cmd = 'CMD ["deno", "task", "start"]'
        facts.post_manager_notes.insert(0, f"[PASS] Start: {facts.run_cmd}")

    if not facts.run_cmd:
        if facts.framework == "nestjs":
            facts.run_cmd = 'CMD ["node", "dist/main.js"]'
        elif facts.framework == "fastify" and re.search(r'"start"\s*:\s*"fastify\s+start([\s"]|$)', text):
            # Fastify apps export a plugin and never listen: node <main> would
            # exit silently, so scripts.start is preserved instead.
            facts.run_cmd = 'CMD ["npm", "start"]'
        elif facts.special_tools == "ts-node":
            facts.run_cmd = f'CMD ["ts-node", "{facts.main_file}"]'
        else:
            facts.run_cmd = f'CMD ["node", "{facts.main_file}"]'

    if "ts-node" in facts.run_cmd and facts.package_manager != "deno":
        # ts-node runs .ts at runtime: dev deps must stay in the image.
        if facts.package_manager == "pnpm":
            facts.install = f"RUN npm i -g {pnpm_tag} && pnpm i --frozen-lockfile"
        elif facts.package_manager == "yarn":
            facts.install = f"RUN {yarn_setup} && {yarn_install}"
        elif facts.package_manager == "bun":
            facts.install = f"RUN npm i -g {bun_tag} && bun install --frozen-lockfile"
        elif (root / "package-lock.json").is_file():
            facts.install = "RUN npm ci"
        else:
            facts.install = "RUN npm install"
        facts.prune = ""
        facts.post_manager_notes.append("[PASS] ts-node start: keeping dev deps (runtime needs ts-node)")

    # .npmrc holds registry credentials: mount it with BuildKit instead of
    # baking it into a layer (same contract as the other secret files).
    if (root / ".npmrc").is_file():
        facts.npmrc = True
        facts.post_manager_notes.append("[PASS] Private registry: .npmrc via BuildKit secret (not in image)")

    if '"build"' in text:
        facts.build = "RUN npm run build --if-present"
    if facts.package_manager == "deno" and deno_files:
        deno_text = "\n".join((root / name).read_text(encoding="utf-8", errors="replace") for name in deno_files)
        facts.build = "RUN deno task build" if re.search(r'"build"\s*:', deno_text) else ""
    return facts


def render_node(facts: NodeFacts, root: Path, options: RenderOptions) -> Render:
    install = facts.install
    if facts.npmrc:
        # Four plain rewrites, exactly like the Bash renderer: | alternation is
        # not portable across sed implementations.
        install = re.sub(r"^RUN npm ci", "RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci", install)
        install = re.sub(r"^RUN npm install", "RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm install", install)
        # The Bash seds rewrite the RUN PREFIX, so the mount lands right after
        # "RUN " and before the whole command line (not mid-command).
        install = re.sub(r"^RUN (.+pnpm i)", r"RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \1", install)
        install = re.sub(r"^RUN (.+yarn install)", r"RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \1", install)
    body = [
        f"FROM {facts.build_image} AS builder",
        "WORKDIR /app",
        facts.deno_env,
        facts.deps_copy,
        install,
        "COPY . .",
        facts.build,
        facts.prune,
        "RUN mkdir -p /app/node_modules",
        "",
        f"FROM {facts.run_image}",
        "RUN apk add --no-cache tini wget",
        "WORKDIR /app",
        "ENV NODE_ENV=production",
        facts.deno_runtime_copy,
        facts.modules_copy,
        "COPY --from=builder /app .",
        f"EXPOSE {facts.port}",
        "RUN addgroup -S app && adduser -S app -G app",
        "USER app",
        health_block(facts.port, facts.health_path, facts.health_guessed, options.health_start),
        facts.volume_line,
        'ENTRYPOINT ["/sbin/tini", "--"]',
        facts.run_cmd,
    ]
    return finalize(
        body,
        NODE_DOCKERIGNORE,
        root,
        options,
        detected_port=facts.port,
        detected_health=facts.health_path,
        guessed=facts.guessed,
        env_scan=NODE_ENV_SCAN,
        oci_title=sanitize(root.name),
        static_env=is_spa(root),
    )


def detect_spa(project_dir: str | Path = ".", nginx_image_env: str | None = None) -> SpaFacts:
    root = Path(project_dir).resolve()
    facts = SpaFacts()
    facts.image, _source = node_image(root)
    facts.nginx_image = nginx_image_env or "nginx:1.30-alpine"
    text = _package_json(root)

    facts.framework = "vue-spa" if ("vue-cli-service" in text or "@vue/cli-service" in text) else "vite-spa"

    nginx_conf = root / "nginx.conf"
    port = ""
    if nginx_conf.is_file():
        conf = nginx_conf.read_text(encoding="utf-8", errors="replace")
        match = re.search(r"^\s*listen\s+([0-9]+)", conf, re.MULTILINE)
        if match:
            port = match.group(1)
    if port:
        facts.port = port
    else:
        facts.port = "80"
        facts.guessed.append("port")

    facts.health_path = "/"
    if nginx_conf.is_file():
        conf = nginx_conf.read_text(encoding="utf-8", errors="replace")
        candidates = re.findall(r"^\s*location\s*=\s*([^\s;{]+)", conf, re.MULTILINE)
        hit = next((value for value in candidates if re.search(r"health|ready|ping|alive", value, re.IGNORECASE)), "")
        if not hit:
            prefixes = re.findall(r"^\s*location\s+(/\S*)", conf, re.MULTILINE)
            hit = next((value for value in prefixes if re.search(r"health|ready|ping|alive", value, re.IGNORECASE)), "")
        if hit:
            facts.health_path = hit

    pin, _note = _package_manager_pin(root)
    pnpm_tag = pin if pin.startswith("pnpm@") else "pnpm"
    bun_tag = pin if pin.startswith("bun@") else "bun"
    yarn_install = "yarn install --frozen-lockfile"
    if pin.startswith("yarn@"):
        version = pin[len("yarn@"):]
        yarn_install = f"npm i -g yarn@{version} && yarn install --frozen-lockfile" if version.startswith("1.") else f"corepack enable && corepack prepare yarn@{version} --activate && yarn install --immutable"

    if (root / "pnpm-lock.yaml").is_file():
        facts.package_manager = "pnpm"
        facts.deps_copy = "COPY package.json pnpm-lock.yaml ./"
        facts.install = f"RUN npm i -g {pnpm_tag} && pnpm i --frozen-lockfile"
        facts.build = "RUN pnpm run build"
    elif (root / "yarn.lock").is_file():
        facts.package_manager = "yarn"
        facts.deps_copy = "COPY package.json yarn.lock ./"
        facts.install = f"RUN {yarn_install}"
        facts.build = "RUN yarn build"
    elif (root / "bun.lockb").is_file() or (root / "bun.lock").is_file():
        facts.package_manager = "bun"
        lock = "bun.lockb" if (root / "bun.lockb").is_file() else "bun.lock"
        facts.deps_copy = f"COPY package.json {lock} ./"
        facts.install = f"RUN npm i -g {bun_tag} && bun install --frozen-lockfile"
        facts.build = "RUN bun run build"
    else:
        facts.package_manager = "npm"
        facts.deps_copy = "COPY package*.json ./"
        facts.install = "RUN npm ci" if (root / "package-lock.json").is_file() else "RUN npm install"
        facts.build = "RUN npm run build"

    facts.runtime_fix = (
        "RUN mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp /var/cache/nginx/fastcgi_temp "
        "/var/cache/nginx/uwsgi_temp /var/cache/nginx/scgi_temp && chown -R nginx:nginx /var/cache/nginx && "
        "sed -i -e '/^user /d' -e '/^pid /d' -e '1i pid /tmp/nginx.pid;' "
        "-e 's|^error_log .*;|error_log /dev/stderr;|' -e 's|^access_log .*;|access_log /dev/stdout;|' /etc/nginx/nginx.conf"
    )
    if nginx_conf.is_file():
        conf = nginx_conf.read_text(encoding="utf-8", errors="replace")
        variables = sorted(set(re.findall(r"\$\{([A-Za-z_][A-Za-z0-9_]*)\}", conf)))
        if variables:
            facts.apk = "RUN apk add --no-cache wget gettext"
            facts.nginx_copy = "COPY nginx.conf /etc/nginx/conf.d/nginx.conf.template"
            arguments = ""
            names = ""
            for name in variables:
                arguments += f"ARG {name}\n"
                names += f" ${{{name}}}"
            facts.subst_args = arguments
            # Single quotes on purpose: envsubst expands at image build time.
            facts.subst_run = (
                "# hadolint ignore=SC2016\n"
                f"RUN envsubst '{names.lstrip()}' < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/conf.d/default.conf"
            )
            facts.notes.append(f"[PASS] nginx subst vars:{' '.join(variables)} (via envsubst at build)")
        else:
            facts.nginx_copy = "COPY nginx.conf /etc/nginx/conf.d/default.conf"
            facts.notes.append("[PASS] nginx.conf: project config shipped as default site")

    if facts.port.isdigit() and int(facts.port) > 1024:
        facts.user = "USER nginx"
        facts.notes.append(f"[PASS] User: nginx (unprivileged port {facts.port})")
    else:
        facts.warnings.append(f"Port {facts.port} needs root - master stays root (use an unprivileged port for USER nginx)")
    return facts


def render_spa(facts: SpaFacts, root: Path, options: RenderOptions) -> Render:
    body = [
        f"FROM {facts.image} AS builder",
        "WORKDIR /app",
        facts.deps_copy,
        facts.install,
        "COPY . .",
        facts.build,
        "",
        f"FROM {facts.nginx_image}",
        facts.apk,
        facts.runtime_fix,
        "COPY --from=builder /app/dist /usr/share/nginx/html",
        facts.nginx_copy,
        f"{facts.subst_args}{facts.subst_run}",
        f"EXPOSE {facts.port}",
        facts.user,
        # nginx serves / for real: found, never guessed.
        health_block(facts.port, facts.health_path, False, options.health_start),
        facts.volume_line,
    ]
    return finalize(
        body,
        SPA_DOCKERIGNORE,
        root,
        options,
        detected_port=facts.port,
        detected_health=facts.health_path,
        guessed=facts.guessed,
        env_scan=SPA_ENV_SCAN,
        oci_title=sanitize(root.name),
        static_env=True,
        append_oci_no_entrypoint=True,
    )