#!/usr/bin/env python3
"""launch_check.py: is my AI-built app safe and ready to launch? One command, one report card.

Usage:
  python launch_check.py https://myapp.com
  python launch_check.py https://myapp.com --repo . --report report.html
  python launch_check.py https://myapp.com --json > launch.json
  python launch_check.py https://myapp.com --skip phone,search        # security + basics only, ~5 s

Checks 4 areas and prints a 0-100 score with a traffic light per area, plain-English findings and a
"fix this first" list you can paste to the AI that built the app:
  1. SECURITY (passive): secrets visible in the page and its same-site JavaScript (Stripe sk_live/rk_live,
     OpenAI, Anthropic, AWS, GitHub, Slack, SendGrid, private keys, Supabase service_role JWT; anon keys are
     fine), security headers (HSTS, CSP, X-Frame-Options / frame-ancestors, X-Content-Type-Options), HTTP to
     HTTPS redirect, cookie flags, mixed content. With --repo: committed .env files and secrets in the repo.
  2. PHONE DESIGN: the vendored site-polish-audit (scripts/polish_audit.py) at 375 px (needs Playwright).
  3. FOUND BY GOOGLE & AI SEARCH: the vendored geo-seo-audit (scripts/geo_audit.py), 5 pages max.
  4. SPEED & BASICS: page weight, requests, load time, JavaScript errors, broken homepage links, title,
     description, favicon, link preview image.

Passive only: it downloads what any visitor's browser downloads (the page, its same-site scripts, the links on
the home page, /favicon.ico, plus robots.txt / sitemap.xml / llms.txt for the search check). It never probes
hidden paths such as /.env, never sends a found secret anywhere and prints only the first 4 characters of it.
Only http(s); redirects and assets are followed only on the same site.

Exit codes: 0 = ready (score >= --fail-under and nothing HIGH), 1 = findings to fix, 2 = usage error or the
site could not be reached.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import json
import os
import re
import subprocess  # nosec B404 - runs the two vendored audit scripts and `git` with fixed argument lists
import sys
import tempfile
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest

VERSION = "1.0"
HERE = Path(__file__).resolve().parent
USER_AGENT = f"launch-check/{VERSION} (+https://github.com/Ces107/agent-forge; passive pre-launch check)"
MAX_HTML = 3_000_000
MAX_ASSET = 3_000_000
MAX_ASSETS = 20
MAX_TOTAL = 15_000_000
MAX_LINKS = 15
LINK_DELAY = 0.3
REPO_MAX_FILES = 6000
REPO_MAX_BYTES = 1_000_000
SEV_ORDER = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "INFO": 3}
AREAS = [("security", "Security"), ("phone", "Phone design"), ("search", "Found by Google & AI"),
         ("speed", "Speed & basics")]
WEIGHTS = {"security": 0.4, "phone": 0.2, "search": 0.2, "speed": 0.2}
CTRL = re.compile(r"[\x00-\x08\x0b-\x1f\x7f-\x9f‪-‮⁦-⁩]")

# kind -> (regex, severity, plain finding, what to ask the AI). The regexes need the real key SHAPE, so
# words like "sk-button" or "task_live_update" never match.
SECRETS = {
    "stripe-secret": (r"\b[sr]k_live_[0-9A-Za-z]{20,}", "HIGH",
                      "Anyone can see your Stripe secret key in your website's code",
                      "Move the Stripe secret key out of the frontend into a server-side environment variable "
                      "(API route or edge function), call Stripe only from the server, then roll the key in the "
                      "Stripe dashboard because it has already been exposed."),
    "stripe-webhook": (r"\bwhsec_[0-9A-Za-z]{24,}", "HIGH",
                       "Your Stripe webhook signing secret is visible in your website's code",
                       "Move the Stripe webhook secret to a server-side environment variable and roll it in Stripe."),
    "stripe-test": (r"\b[sr]k_test_[0-9A-Za-z]{20,}", "MEDIUM",
                    "A Stripe TEST secret key is in your website's code (fine for testing, never ship it)",
                    "Remove the Stripe test secret key from the frontend; keep secret keys server-side only."),
    "anthropic": (r"\bsk-ant-[A-Za-z0-9_-]{32,}", "HIGH",
                  "Anyone can see your Anthropic (Claude) API key in your website's code",
                  "Move the Anthropic API key to a server-side environment variable, call the API from a backend "
                  "route, and revoke the exposed key in the Anthropic console."),
    "openai": (r"\bsk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{30,}|\bsk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}"
               r"|\bsk-[A-Za-z0-9]{48}\b", "HIGH",
               "Anyone can see your OpenAI API key in your website's code (strangers can run up your bill)",
               "Move the OpenAI API key to a server-side environment variable, call OpenAI from a backend route, "
               "and revoke the exposed key at platform.openai.com."),
    "aws": (r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b", "HIGH",
            "An Amazon Web Services access key is visible in your website's code",
            "Remove the AWS access key from the frontend, use a server-side role or signed URLs, and deactivate "
            "the key in AWS IAM."),
    "github": (r"\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{50,}", "HIGH",
               "A GitHub access token is visible in your website's code",
               "Remove the GitHub token from the frontend and revoke it in GitHub settings."),
    "slack": (r"\bxox[abposr]-[A-Za-z0-9-]{20,}", "HIGH", "A Slack token is visible in your website's code",
              "Remove the Slack token from the frontend, call Slack from a server, and revoke the token."),
    "sendgrid": (r"\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b", "HIGH",
                 "Your SendGrid email key is visible: anyone could send email as you",
                 "Move the SendGrid key server-side and revoke the exposed key."),
    "private-key": (r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIV" + r"ATE KEY-----", "HIGH",
                    "A private key is published in your website's code",
                    "Remove the private key from the frontend bundle and replace it (it is compromised)."),
    "supabase-secret": (r"\bsb_secret_[A-Za-z0-9_-]{20,}", "HIGH",
                        "Your Supabase SECRET key is in your website's code: anyone can read and change your whole database",
                        "Replace the Supabase secret key in the frontend with the publishable/anon key, keep the "
                        "secret key only in server code, and rotate it in the Supabase dashboard."),
    "google-api": (r"\bAIza[0-9A-Za-z_-]{35}\b", "LOW",
                   "A Google API key is in your website's code (normal for Firebase or Maps, if it is restricted)",
                   "Check that the Google API key is restricted to my domain and to the APIs I use in Google Cloud "
                   "console, and move any non-public Google keys server-side."),
}
JWT = re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}")
SUPABASE_SERVICE = ("Your Supabase service_role key is in your website's code: anyone can read and change your "
                    "whole database",
                    "Remove the Supabase service_role key from the frontend, use the anon key there with Row Level "
                    "Security policies on every table, keep service_role only in server code, and rotate the JWT "
                    "secret in the Supabase dashboard.")
COMPILED = {k: re.compile(v[0]) for k, v in SECRETS.items()}

PHONE_PLAIN = {
    "overflow": "The page is wider than a phone screen, so it wobbles and scrolls sideways",
    "viewport-meta": "The page is not set up for phones (no viewport tag), so it shows up tiny",
    "overlap": "Some text overlaps other text on a phone",
    "clipped": "Some text is cut off on a phone",
    "contrast": "Some text is hard to read (too little contrast with its background)",
    "tap-target": "Some buttons or links are too small to tap with a thumb",
    "layout-shift": "Things jump around while the page loads",
    "images": "Some images are stretched, unlabeled or missing a size",
    "line-length": "Lines of text are too long to read comfortably",
    "type-sprawl": "Too many font sizes and families: the page looks unplanned",
    "palette": "Too many slightly different colours: the page looks unplanned",
    "spacing": "Spacing is uneven",
    "headings": "Headings are out of order",
}
SEARCH_PLAIN = {
    "js-only-content": "Google and ChatGPT see an almost empty page: your text only appears after JavaScript runs",
    "title-missing": "Pages have no title, so search results show a bare web address",
    "desc-missing": "No description: Google and AI tools have to guess what your site is about",
    "robots-blocks-all": "Your robots.txt tells every search engine to stay away",
    "ai-search-bot-blocked": "Your robots.txt blocks ChatGPT, Perplexity or Claude from reading your site",
    "broken-link": "Some links on your site lead to error pages",
    "og-missing": "Shared links on social media and chat apps show no preview card",
    "sitemap-missing": "No sitemap.xml: search engines may miss pages",
    "h1-missing": "No main heading (h1) telling search engines what the page is about",
    "viewport-missing": "No mobile viewport tag, so Google treats it as not phone-friendly",
    "schema-home-org": "No structured data telling Google and AI who you are",
    "llms-missing": "No llms.txt to help AI assistants summarise your site",
    "no-compression": "Your HTML is sent uncompressed (slower for every visitor)",
    "render-blocking-js": "Scripts in the page head delay the first paint",
    "img-alt-missing": "Images have no text description (alt text)",
}


# ------------------------------------------------------------------------------------------- utilities
def clean(text, limit=160):
    """Make a target-derived string safe for a terminal line (no ANSI/control/bidi characters)."""
    text = CTRL.sub("", str(text if text is not None else ""))
    return text if len(text) <= limit else text[: limit - 1] + "…"


def redact(value):
    """Only the first 4 characters ever leave this process."""
    return f"{value[:4]}…({len(value)} chars)"


def origin(url):
    parts = urlparse.urlsplit(url)
    port = parts.port or (443 if parts.scheme == "https" else 80)
    return parts.scheme.lower(), (parts.hostname or "").lower(), port


def same_site(a, b):
    """Same host, ignoring a leading www. and the scheme (redirect http -> https is fine)."""
    ha, hb = origin(a)[1], origin(b)[1]
    return ha.removeprefix("www.") == hb.removeprefix("www.") and ha != ""


def normalise_target(raw):
    raw = raw.strip()
    if re.match(r"^[a-z][a-z0-9+.-]*:", raw, re.I) and not re.match(r"^https?://", raw, re.I):
        if not re.match(r"^[\w.-]+:\d+", raw):
            raise ValueError("only http:// and https:// addresses can be checked")
    if not re.match(r"^https?://", raw, re.I):
        raw = "https://" + raw
    parts = urlparse.urlsplit(raw)
    if not parts.hostname or "\\" in raw or "@" in parts.netloc:
        raise ValueError(f"not a website address: {clean(raw)}")
    return urlparse.urlunsplit((parts.scheme.lower(), parts.netloc, parts.path or "/", parts.query, ""))


def is_local(url):
    host = origin(url)[1]
    return host in {"localhost", "::1"} or host.startswith("127.") or host.endswith(".localhost")


class NoRedirect(urlrequest.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Resp:
    def __init__(self, url, status, headers, body, elapsed, error=""):
        self.url, self.status, self.headers, self.body, self.elapsed, self.error = (
            url, status, headers, body, elapsed, error)

    def header(self, name):
        return self.headers.get(name.lower(), "")


class Fetcher:
    """GET with manual redirects: only http(s), only the same site, bounded size and count."""

    def __init__(self, timeout, user_agent=USER_AGENT):
        self.timeout = timeout
        self.user_agent = user_agent
        self.opener = urlrequest.build_opener(NoRedirect)
        self.requests = 0
        self.refused = []

    def raw(self, url, cap, method="GET"):
        self.requests += 1
        req = urlrequest.Request(url, method=method, headers={"User-Agent": self.user_agent,
                                                             "Accept-Encoding": "identity", "Accept": "*/*"})
        t0 = time.time()
        try:
            resp = self.opener.open(req, timeout=self.timeout)  # nosec B310 - scheme checked by the caller
        except urlerror.HTTPError as exc:
            resp = exc
        except (urlerror.URLError, OSError, ValueError) as exc:
            return Resp(url, 0, {}, b"", time.time() - t0, str(getattr(exc, "reason", exc)))
        headers = {}
        for key, value in resp.headers.items():
            key = key.lower()
            headers[key] = headers[key] + "\n" + value if key in headers and key == "set-cookie" else value
        try:
            body = resp.read(cap + 1) if method == "GET" else b""
        except Exception:  # truncated or reset connection: keep what arrived
            body = b""
        return Resp(url, resp.status if hasattr(resp, "status") else resp.code, headers, body[:cap],
                    time.time() - t0)

    def get(self, url, cap=MAX_HTML, start=None, max_redirects=5):
        start = start or url
        chain = []
        for _ in range(max_redirects + 1):
            if not re.match(r"^https?://", url, re.I):
                self.refused.append(clean(url))
                return Resp(url, 0, {}, b"", 0.0, "refused: not http(s)"), chain
            resp = self.raw(url, cap)
            if resp.status in (301, 302, 303, 307, 308) and resp.header("location"):
                nxt = urlparse.urljoin(url, resp.header("location").strip())
                chain.append((url, resp.status, nxt))
                if not re.match(r"^https?://", nxt, re.I) or not same_site(nxt, start):
                    self.refused.append(clean(nxt))
                    resp.error = "redirect to another site not followed"
                    return resp, chain
                url = nxt
                continue
            return resp, chain
        return Resp(url, 0, {}, b"", 0.0, "too many redirects"), chain


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.scripts, self.inline, self.links, self.icons, self.media = [], [], [], [], []
        self.meta, self.title, self._in_title, self._in_script = {}, "", False, False
        self.lang = None

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "html":
            self.lang = a.get("lang")
        elif tag == "script":
            if a.get("src"):
                self.scripts.append(a["src"])
            self._in_script = not a.get("src")
        elif tag == "link":
            rel = a.get("rel", "").lower()
            if "icon" in rel:
                self.icons.append(a.get("href", ""))
            if rel in ("modulepreload", "preload") and a.get("as", "script") == "script" and a.get("href"):
                self.scripts.append(a["href"])
            if "stylesheet" in rel and a.get("href"):
                self.media.append(("stylesheet", a["href"]))
        elif tag == "meta":
            key = (a.get("name") or a.get("property") or "").lower()
            if key:
                self.meta[key] = a.get("content", "")
        elif tag == "title":
            self._in_title = True
        elif tag == "a" and a.get("href"):
            self.links.append(a["href"])
        if tag in ("img", "iframe", "video", "audio", "source", "embed") and a.get("src"):
            self.media.append((tag, a["src"]))

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        elif tag == "script":
            self._in_script = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        elif self._in_script:
            self.inline.append(data)


def decode(body):
    return body.decode("utf-8-sig", errors="replace")


def jwt_role(token):
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload.encode())[:4096])
        return data if isinstance(data, dict) else {}
    except Exception:  # not a JWT after all
        return {}


def scan_text(text, where):
    """Secrets in one text blob -> findings (value redacted, never stored in full)."""
    found = []
    for kind, rx in COMPILED.items():
        for match in rx.finditer(text):
            value = match.group(0)
            if kind == "openai" and value.startswith("sk-ant-"):
                continue
            found.append((kind, value, where))
    for match in re.finditer(r"\bsb_publishable_[A-Za-z0-9_-]{20,}", text):
        found.append(("supabase-anon", match.group(0), where))
    for match in JWT.finditer(text):
        claims = jwt_role(match.group(0))
        role = str(claims.get("role", ""))
        if role == "service_role":
            found.append(("supabase-service-role", match.group(0), where))
        elif role == "anon" or claims.get("iss") == "supabase":
            found.append(("supabase-anon", match.group(0), where))
    return found


def secret_findings(hits):
    out, seen = [], set()
    for kind, value, where in hits:
        key = (kind, hashlib.sha256(value.encode()).hexdigest())
        if key in seen:
            continue
        seen.add(key)
        if kind == "supabase-service-role":
            sev, title, fix = "HIGH", SUPABASE_SERVICE[0], SUPABASE_SERVICE[1]
        elif kind == "supabase-anon":
            out.append(finding("security", "supabase-anon-ok", "INFO",
                               "Supabase anon key in the page: that is normal, as long as every table has Row Level Security",
                               "Confirm Row Level Security is enabled with policies on every Supabase table.",
                               where=where, value=redact(value)))
            continue
        else:
            _rx, sev, title, fix = SECRETS[kind]
        out.append(finding("security", f"secret-{kind}", sev, title, fix, where=where, value=redact(value)))
    return out


def finding(area, rule, severity, title, fix, where="", value="", detail=""):
    return {"area": area, "rule": rule, "severity": severity, "title": title, "fix": fix,
            "where": clean(where, 200), "value": value, "detail": clean(detail, 300)}


# ------------------------------------------------------------------------------------------- security
def check_headers(resp, url):
    out = []
    h = resp.header
    csp = h("content-security-policy")
    https = url.lower().startswith("https://")
    if https and not h("strict-transport-security"):
        out.append(finding("security", "hsts-missing", "MEDIUM",
                           "Browsers are not told to always use HTTPS (no HSTS header)",
                           "Add the header Strict-Transport-Security: max-age=31536000; includeSubDomains."))
    if not csp:
        out.append(finding("security", "csp-missing", "MEDIUM",
                           "No Content-Security-Policy: an injected script could run freely on your site",
                           "Add a Content-Security-Policy header that allows only my own scripts and the services "
                           "I use (start with Content-Security-Policy-Report-Only to test)."))
    if not h("x-frame-options") and "frame-ancestors" not in csp.lower():
        out.append(finding("security", "clickjacking", "MEDIUM",
                           "Other sites can embed your app in a hidden frame (clickjacking)",
                           "Add X-Frame-Options: DENY or Content-Security-Policy: frame-ancestors 'self'."))
    if h("x-content-type-options").lower().strip() != "nosniff":
        out.append(finding("security", "nosniff-missing", "LOW",
                           "No X-Content-Type-Options header",
                           "Add the header X-Content-Type-Options: nosniff."))
    return out


def check_https(fetcher, url, chain):
    if is_local(url):
        return [], "local address: HTTPS checks skipped"
    out = []
    if url.lower().startswith("http://") and not any(n.lower().startswith("https://") for _u, _c, n in chain):
        out.append(finding("security", "no-https", "HIGH", "Your site is not on HTTPS: logins and payments travel unencrypted",
                           "Serve the site only over HTTPS (most hosts do it with one setting) and redirect HTTP to HTTPS."))
        return out, ""
    plain = "http://" + url.split("://", 1)[1]
    resp = fetcher.raw(plain, 1)
    loc = resp.header("location")
    if resp.status in (301, 302, 307, 308) and loc.lower().startswith("https://"):
        return out, ""
    if resp.status == 0:
        return out, "HTTP port closed (fine)"
    out.append(finding("security", "no-https-redirect", "MEDIUM",
                       "Typing your address without https:// opens an unencrypted page",
                       "Redirect every http:// request to https:// with a 301.", where=plain))
    return out, ""


ANALYTICS_COOKIES = ("ajs_", "_ga", "_gid", "_fbp", "_hj", "mp_", "amp_", "_clck", "_clsk", "ph_", "__cf", "_cf", "__stripe")


def check_cookies(resp, url):
    out = []
    raw = resp.header("set-cookie")
    https = url.lower().startswith("https://")
    for line in [c for c in raw.split("\n") if c.strip()][:20]:
        name = clean(line.split("=", 1)[0].strip(), 40)
        low = line.lower()
        missing = []
        if https and "secure" not in low:
            missing.append("Secure")
        analytics = name.lower().startswith(ANALYTICS_COOKIES)  # JS-readable by design (verified: ajs_session_id on bolt.new)
        if "httponly" not in low and not analytics and re.search(r"sess|auth|token|sid|jwt|login", name, re.I):
            missing.append("HttpOnly")
        if "samesite" not in low:
            missing.append("SameSite")
        if missing:
            sensitive = bool(re.search(r"sess|auth|token|sid|jwt|login", name, re.I))
            sev = "MEDIUM" if "HttpOnly" in missing or ("Secure" in missing and sensitive) else "LOW"
            out.append(finding("security", "cookie-flags", sev, f"Cookie '{name}' is missing {', '.join(missing)}",
                               f"Set the cookie '{name}' with {'; '.join(missing)} flags.", where=name))
    return out


def check_mixed(parser, url):
    if not url.lower().startswith("https://"):
        return []
    bad = [src for _tag, src in parser.media if src.lower().startswith("http://")]
    bad += [src for src in parser.scripts if src.lower().startswith("http://")]
    if not bad:
        return []
    return [finding("security", "mixed-content", "MEDIUM",
                    f"{len(bad)} file(s) load over plain http on a secure page (browsers block or warn)",
                    "Change every http:// asset URL on the page to https://.", where=bad[0])]


def scan_site(fetcher, url, resp, parser, max_assets):
    """Secrets in the HTML, inline scripts and same-origin JS bundles. Returns (findings, assets info)."""
    text = decode(resp.body)
    hits = scan_text(text, "page HTML")
    backend = find_backends(text, {})
    srcs, seen = [], set()
    base = resp.url
    for src in parser.scripts:
        full = urlparse.urljoin(base, src.strip())
        if origin(full) != origin(base):
            continue
        full = full.split("#", 1)[0]
        if full not in seen:
            seen.add(full)
            srcs.append(full)
    assets = {"same_origin": len(srcs), "scanned": 0, "bytes": 0, "skipped_offsite":
              sum(1 for s in parser.scripts if origin(urlparse.urljoin(base, s)) != origin(base))}
    queue = list(srcs)
    while queue and assets["scanned"] < max_assets and assets["bytes"] < MAX_TOTAL:
        src = queue.pop(0)
        r, _chain = fetcher.get(src, MAX_ASSET, start=base)
        if r.status != 200 or origin(r.url) != origin(base):
            continue
        assets["scanned"] += 1
        assets["bytes"] += len(r.body)
        body = decode(r.body)
        path = urlparse.urlsplit(src).path or src
        hits += scan_text(body, path)
        find_backends(body, backend)
        # Vite/webpack split chunks: follow same-origin imports of .js files referenced from a bundle.
        for m in re.finditer(r"""(?:import\(|from\s*|import\s*)["'`](\.{0,2}/[^"'`\s]{1,200}\.m?js)["'`]""", body):
            nxt = urlparse.urljoin(src, m.group(1))
            if origin(nxt) == origin(base) and nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)
                assets["same_origin"] += 1
    assets["backend"] = backend
    return secret_findings(hits), assets


SKIP_DIRS = {".git", "node_modules", "dist", "build", ".next", ".nuxt", ".svelte-kit", ".venv", "venv", "env",
             "__pycache__", ".turbo", ".vercel", ".cache", "coverage", "vendor", "target", ".output"}
TEXT_EXT = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".json", ".py", ".rb", ".go", ".java", ".php", ".env",
            ".yml", ".yaml", ".toml", ".ini", ".cfg", ".txt", ".md", ".html", ".vue", ".svelte", ".sh", ".ps1",
            ".tf", ".properties", ".xml", ".swift", ".kt", ".dart", ".cs", ".rs", ""}
ENV_OK = re.compile(r"\.env\.(example|sample|template|dist|defaults?)$|\.env\.[\w-]*example$", re.I)


def git_files(repo):
    try:
        run = subprocess.run(["git", "-C", str(repo), "ls-files", "-z"], capture_output=True, timeout=20,  # nosec B603 B607
                             stdin=subprocess.DEVNULL)
    except (OSError, subprocess.TimeoutExpired):
        return None
    if run.returncode != 0:
        return None
    return {p.replace("/", os.sep) for p in run.stdout.decode("utf-8", "replace").split("\0") if p}


def git_ignored(repo, rel):
    try:
        run = subprocess.run(["git", "-C", str(repo), "check-ignore", "-q", rel], capture_output=True,  # nosec B603 B607
                             timeout=10, stdin=subprocess.DEVNULL)
        return run.returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def scan_repo(repo):
    """Committed .env files and secrets in the local project. Read-only."""
    repo = Path(repo).expanduser().resolve()
    if not repo.is_dir():
        raise ValueError(f"--repo {repo} is not a folder")
    tracked = git_files(repo)
    out, hits, files = [], [], 0
    for root, dirs, names in os.walk(repo):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in names:
            path = Path(root, name)
            rel = str(path.relative_to(repo))
            is_env = name == ".env" or (name.startswith(".env.") and not ENV_OK.search(name))
            if is_env:
                if tracked is not None and rel in tracked:
                    out.append(finding("security", "env-committed", "HIGH",
                                       f"Your secrets file {rel} is saved in git: anyone with the code has your keys",
                                       f"Remove {rel} from git (git rm --cached {rel}), add .env* to .gitignore, and "
                                       "rotate every key that was in it.", where=rel))
                elif tracked is not None and not git_ignored(repo, rel):
                    out.append(finding("security", "env-not-ignored", "MEDIUM",
                                       f"{rel} is not in .gitignore: the next commit would publish your keys",
                                       "Add .env and .env.* (but not .env.example) to .gitignore.", where=rel))
            if path.suffix.lower() not in TEXT_EXT and not is_env:
                continue
            files += 1
            if files > REPO_MAX_FILES:
                break
            try:
                if path.stat().st_size > REPO_MAX_BYTES:
                    continue
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            if is_env and tracked is not None and rel not in tracked:
                continue  # an ignored local .env is where secrets belong
            for kind, value, _w in scan_text(text, rel):
                if kind in ("supabase-anon", "google-api"):
                    continue
                hits.append((kind, value, rel))
    for f in secret_findings(hits):
        tracked_hit = tracked is not None and f["where"].replace("/", os.sep) in tracked
        f["rule"] = f["rule"].replace("secret-", "repo-secret-")
        f["title"] = (f"A secret key is saved in your code ({f['where']})" + (" and committed to git" if tracked_hit else ""))
        f["fix"] = (f"Move the secret in {f['where']} to an environment variable that is not committed, and rotate "
                    "the key because it has been saved in the code.")
        out.append(f)
    return out, {"files_scanned": min(files, REPO_MAX_FILES), "git": tracked is not None}


# ------------------------------------------------------------------------------- phone / search (vendored)
def have_playwright():
    try:
        import playwright.sync_api  # noqa: F401
        return True
    except Exception:  # missing or broken install
        return False


def run_vendored(script, args, timeout):
    cmd = [sys.executable, str(HERE / script)] + args
    env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1", "PYTHONIOENCODING": "utf-8"}
    try:
        run = subprocess.run(cmd, capture_output=True, timeout=timeout, stdin=subprocess.DEVNULL, env=env)  # nosec B603
    except subprocess.TimeoutExpired:
        return None, f"{script} timed out after {timeout:.0f} s"
    try:
        return json.loads(run.stdout.decode("utf-8", "replace")), ""
    except json.JSONDecodeError:
        err = run.stderr.decode("utf-8", "replace").strip().splitlines()
        return None, clean(err[-1] if err else f"{script} exit {run.returncode}", 200)


def check_phone(url, timeout):
    if not have_playwright():
        return None, [], ("skipped: Playwright is not installed. Install it for the phone check: "
                          "python -m pip install playwright && python -m playwright install chromium")
    report, err = run_vendored("polish_audit.py", [url, "--viewports", "375", "--json", "--no-shots",
                                                    "--timeout", str(int(timeout * 2))], timeout * 6)
    if report is None:
        return None, [], f"skipped: {err}"
    if report.get("engine") != "playwright":
        return None, [], "skipped: no browser could start (" + clean(report.get("note", ""), 120) + ")"
    grouped = {}  # one finding per kind of problem, worst severity, total places
    for f in report.get("findings", []):
        sev = {"HIGH": "HIGH", "MED": "MEDIUM", "MEDIUM": "MEDIUM"}.get(f.get("severity", ""), "LOW")
        g = grouped.setdefault(f.get("check"), {"sev": sev, "count": 0, "first": f})
        g["count"] += max(1, int(f.get("count", 1) or 1))
        if SEV_ORDER[sev] < SEV_ORDER[g["sev"]]:
            g["sev"] = sev
    out = []
    for check, g in grouped.items():
        f, count = g["first"], g["count"]
        title = PHONE_PLAIN.get(check, f.get("detail", ""))
        out.append(finding("phone", f"phone-{check}", g["sev"], title + (f" ({count} places)" if count > 1 else ""),
                           f"On a 375 px wide phone screen: {f.get('fix', '')}", where=f.get("selector", ""),
                           detail=f.get("detail", "")))
    out.sort(key=lambda x: SEV_ORDER[x["severity"]])
    return int(report.get("score", 0)), out[:8], ""


SEARCH_DUPES = {"title-missing", "desc-missing", "broken-link", "viewport-missing", "og-missing"}  # reported by the basics check


def check_search(url, timeout, dedupe=True):
    report, err = run_vendored("geo_audit.py", [url, "--json", "--max-pages", "5", "--delay", "0.5",
                                                "--timeout", str(int(timeout))], timeout * 12)
    if report is None:
        return None, [], f"skipped: {err}", {}
    out = []
    for f in report.get("findings", []):
        if f.get("severity") == "info" or (dedupe and f.get("rule") in SEARCH_DUPES):
            continue
        statuses = re.findall(r"-> (\d{3})\b", " ".join(str(d) for d in f.get("details") or []))
        if f.get("rule") in ("sitemap-broken", "broken-link") and statuses and not any(is_broken(int(s)) for s in statuses):
            continue  # every "error" was 401/403/429/503: the site rate-limited the crawl, the pages are not broken
        sev = f.get("severity", "low").upper()
        title = SEARCH_PLAIN.get(f.get("rule"), f.get("title", ""))
        where = (f.get("urls") or [""])[0]
        out.append(finding("search", f"search-{f.get('rule')}", sev, title, f.get("fix", ""), where=where,
                           detail=f"{f.get('count')}/{f.get('checked')} {f.get('title', '')}"))
    extra = {"pages": report.get("pages_crawled"), "categories": report.get("categories", {})}
    return int(report.get("score", 0)), out[:12], "", extra


# -------------------------------------------------------------------------------------- speed & basics
def browser_metrics(url, timeout, shot_path=None):
    """One real page load at phone size: requests, bytes, load time, JS errors, optional screenshot."""
    try:
        from playwright.sync_api import sync_playwright
    except Exception:  # missing or broken install
        return None
    stats = {"requests": 0, "bytes": 0, "errors": [], "load_s": None, "screenshot": None, "offsite_requests": 0,
             "links": []}
    with sync_playwright() as pw:
        browser = None
        for kwargs in ({}, {"channel": "chrome"}, {"channel": "msedge"}):
            try:
                browser = pw.chromium.launch(**kwargs)
                break
            except Exception:  # this browser channel is not installed
                continue
        if browser is None:
            return None
        try:
            ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                      is_mobile=True, has_touch=True)
            page = ctx.new_page()

            def on_response(resp):
                stats["requests"] += 1
                if not same_site(resp.url, url):
                    stats["offsite_requests"] += 1
                try:
                    stats["bytes"] += int(resp.headers.get("content-length") or 0) or len(resp.body())
                except Exception:  # redirects and aborted responses have no body
                    pass

            page.on("response", on_response)
            page.on("pageerror", lambda exc: stats["errors"].append(clean(str(exc).splitlines()[0], 160)))
            page.on("console", lambda msg: stats["errors"].append(clean(msg.text, 160)) if msg.type == "error" else None)
            t0 = time.time()
            page.goto(url, wait_until="load", timeout=int(timeout * 2000))
            stats["load_s"] = round(time.time() - t0, 2)
            try:
                page.wait_for_load_state("networkidle", timeout=4000)
            except Exception:  # long-polling apps never go idle
                pass
            page.wait_for_timeout(800)  # late console errors from failed startup API calls
            try:  # links that only exist after JavaScript runs (most AI-built apps are single-page apps)
                stats["links"] = page.eval_on_selector_all("a[href]", "els => els.slice(0, 300).map(e => e.href)")
            except Exception:  # page navigated away or closed
                stats["links"] = []
            if shot_path:
                page.screenshot(path=str(shot_path), type="jpeg", quality=70)
                stats["screenshot"] = str(shot_path)
        except Exception as exc:  # page failed to load in the browser: keep the static checks
            stats["errors"].append("page failed to load in a browser: " + clean(str(exc).splitlines()[0], 120))
        finally:
            browser.close()
    return stats


def is_broken(status):
    """404/410/500s are broken; 401/403/429/503 mean 'blocked or rate-limited', not broken (verified on replit.com)."""
    return status in (400, 404, 410) or (500 <= status < 600 and status != 503)


def check_basics(fetcher, resp, parser, metrics, assets):
    out = []
    base = resp.url
    title = parser.title.strip()
    if not title:
        out.append(finding("speed", "title-missing", "HIGH", "Your page has no title (the browser tab shows a bare address)",
                           "Add a <title> of 30-60 characters that says what the product does."))
    elif re.fullmatch(r"(?i)(vite \+ react( \+ ts)?|react app|my (lovable )?app|lovable app|untitled|document|home)",
                      title):
        out.append(finding("speed", "title-default", "HIGH", f"Your page title is still the template default: '{clean(title, 40)}'",
                           "Replace the default <title> with the product name and what it does (30-60 characters)."))
    desc = parser.meta.get("description", "").strip()
    if not desc:
        out.append(finding("speed", "desc-missing", "MEDIUM", "No meta description: Google shows a random snippet of your page",
                           "Add <meta name=\"description\"> with one 120-160 character sentence about the product."))
    if not parser.meta.get("og:image"):
        out.append(finding("speed", "og-image-missing", "LOW", "Links shared on WhatsApp, Slack or X show no preview image",
                           "Add og:title, og:description and a 1200x630 og:image meta tag."))
    icon = None
    for href in parser.icons:
        icon = urlparse.urljoin(base, href.strip())
        break
    if icon is None or (origin(icon) == origin(base)):
        target = icon or urlparse.urljoin(base, "/favicon.ico")
        r, _ = fetcher.get(target, 200_000, start=base)
        if r.status != 200 or not r.body:
            out.append(finding("speed", "favicon-missing", "LOW", "No favicon: the browser tab shows a blank icon",
                               "Add a favicon (32x32 PNG or SVG) and link it with <link rel=\"icon\">."))
    html_kb = len(resp.body) / 1024
    js_kb = assets.get("bytes", 0) / 1024
    weight_kb = (metrics or {}).get("bytes", 0) / 1024 or html_kb + js_kb
    if weight_kb > 3000:
        out.append(finding("speed", "heavy-page", "HIGH" if weight_kb > 6000 else "MEDIUM",
                           f"Your homepage downloads {weight_kb / 1024:.1f} MB: slow on a phone connection",
                           "Compress images (WebP/AVIF, max 1600 px wide), lazy-load below-the-fold images and "
                           "split large JavaScript bundles."))
    if js_kb > 1000:
        out.append(finding("speed", "heavy-js", "MEDIUM", f"{js_kb:.0f} KB of JavaScript before anything works",
                           "Code-split routes and remove unused libraries so the first load ships under 500 KB of JS."))
    if metrics and metrics.get("load_s") and metrics["load_s"] > 4:
        out.append(finding("speed", "slow-load", "MEDIUM", f"The page took {metrics['load_s']:.1f} s to load",
                           "Find what blocks the load (big images, slow API calls on startup) and defer it."))
    if metrics and metrics.get("errors"):
        errs = metrics["errors"]
        out.append(finding("speed", "js-errors", "MEDIUM", f"Your page shows {len(errs)} JavaScript error(s) in the browser",
                           "Open the browser console, fix these errors: " + "; ".join(errs[:2]), detail=errs[0]))
    # broken links on the homepage, same site only, capped
    links, seen = [], set()
    for href in list(parser.links) + [h for h in (metrics or {}).get("links", []) if isinstance(h, str)]:
        href = href.strip()
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
            continue
        full = urlparse.urljoin(base, href).split("#", 1)[0]
        if re.match(r"^https?://", full, re.I) and same_site(full, base) and full not in seen and full != base:
            seen.add(full)
            links.append(full)
    broken = []
    for i, link in enumerate(links[:MAX_LINKS]):
        if i:
            time.sleep(LINK_DELAY)
        r, _ = fetcher.get(link, 1, start=base)
        if is_broken(r.status):
            broken.append((link, r.status))
    if broken:
        out.append(finding("speed", "broken-links", "HIGH" if len(broken) > 1 else "MEDIUM",
                           f"{len(broken)} link(s) on your homepage lead to an error page",
                           "Fix or remove these links: " + ", ".join(urlparse.urlsplit(u).path or u for u, _ in broken[:5]),
                           where=broken[0][0], detail=f"HTTP {broken[0][1]}"))
    info = {"html_kb": round(html_kb, 1), "js_kb": round(js_kb, 1), "weight_kb": round(weight_kb, 1),
            "links_checked": min(len(links), MAX_LINKS), "links_found": len(links), "broken": len(broken)}
    if metrics:
        info.update({k: metrics[k] for k in ("requests", "load_s", "offsite_requests")})
        info["js_errors"] = len(metrics.get("errors", []))
    return out, info


# ------------------------------------------------------------------------ open database test (opt-in)
SUPA_URL = re.compile(r"https://[a-z0-9]{20}\.supabase\.co\b")
SUPA_ASSIGN = re.compile(r"""(?:supabase_?url|createClient\()\s*[:=(]?\s*["'`](https?://[^"'`\s]{4,200})["'`]""", re.I)
FIRE_URL = re.compile(r"https://[a-z0-9-]{3,80}\.(?:firebaseio\.com|[a-z0-9-]+\.firebasedatabase\.app)\b")
FIRE_ASSIGN = re.compile(r"""databaseURL\s*[:=]\s*["'`](https?://[^"'`\s]{4,200})["'`]""")


def find_backends(text, acc):
    """Supabase URL + public (anon/publishable) key, Firebase databaseURL. Never keeps service_role keys."""
    acc.setdefault("supabase_urls", [])
    acc.setdefault("anon_keys", [])
    acc.setdefault("firebase_urls", [])
    for rx, bucket in ((SUPA_URL, "supabase_urls"), (SUPA_ASSIGN, "supabase_urls"), (FIRE_URL, "firebase_urls"),
                       (FIRE_ASSIGN, "firebase_urls")):
        for m in rx.finditer(text):
            url = (m.group(1) if rx.groups else m.group(0)).rstrip("/")
            if url not in acc[bucket] and len(acc[bucket]) < 3:
                acc[bucket].append(url)
    for m in re.finditer(r"\bsb_publishable_[A-Za-z0-9_-]{20,}", text):
        if m.group(0) not in acc["anon_keys"]:
            acc["anon_keys"].append(m.group(0))
    for m in JWT.finditer(text):
        if jwt_role(m.group(0)).get("role") == "anon" and m.group(0) not in acc["anon_keys"]:
            acc["anon_keys"].append(m.group(0))
    return acc


def owner_target_ok(api, site, kind):
    """Only ever talk to the app's own backend: the vendor host over https, or the audited site itself."""
    try:
        parts = urlparse.urlsplit(api)
        host = (parts.hostname or "").lower()
        has_userinfo = bool(parts.username or parts.password)
    except ValueError:
        return False
    if parts.scheme not in ("http", "https") or not host or has_userinfo or "\\" in api:
        return False
    if kind == "supabase" and parts.scheme == "https" and re.fullmatch(r"[a-z0-9]{20}\.supabase\.co", host):
        return True
    if kind == "firebase" and parts.scheme == "https" and re.fullmatch(
            r"[a-z0-9-]{3,80}\.(?:firebaseio\.com|[a-z0-9-]+\.firebasedatabase\.app)", host):
        return True
    return same_site(api, site) or (is_local(api) and is_local(site))


def json_get(fetcher, url, headers, cap=65_536):
    """Read-only GET -> (status, parsed JSON or None). The body is never printed or stored."""
    fetcher.requests += 1
    req = urlrequest.Request(url, method="GET", headers={"User-Agent": fetcher.user_agent,
                                                         "Accept": "application/json", **headers})
    try:
        resp = fetcher.opener.open(req, timeout=fetcher.timeout)  # nosec B310 - host allowlisted by owner_target_ok
    except urlerror.HTTPError as exc:
        return exc.code, None
    except (urlerror.URLError, OSError, ValueError):
        return 0, None
    try:
        body = resp.read(cap + 1)
        data = json.loads(body.decode("utf-8", "replace")) if len(body) <= cap else "too-big"
    except (ValueError, OSError):
        data = None
    return resp.status, data


def owner_check(fetcher, site, backend, max_tables=20):
    """Read-only test: can the public key in the page read the app's tables? GET only, never writes."""
    out, info = [], {"supabase": [], "firebase": []}
    keys = backend.get("anon_keys", [])
    for api in backend.get("supabase_urls", []):
        if not owner_target_ok(api, site, "supabase"):
            info["supabase"].append({"url": clean(api, 80), "result": "refused: not this app's Supabase host"})
            continue
        if not keys:
            info["supabase"].append({"url": clean(api, 80), "result": "no public key found to test with"})
            continue
        headers = {"apikey": keys[0], "Authorization": "Bearer " + keys[0]}
        status, spec = json_get(fetcher, api + "/rest/v1/", headers, cap=2_000_000)
        if status != 200 or not isinstance(spec, dict):
            info["supabase"].append({"url": clean(api, 80), "result": f"table list closed (HTTP {status})"})
            continue
        defs = spec.get("definitions") or {}
        tables = [p.strip("/") for p in (spec.get("paths") or {}) if p.strip("/") and not p.startswith("/rpc/")]
        tables = [t for t in tables if re.fullmatch(r"[\w$-]{1,63}", t)][:max_tables]
        readable, closed = [], 0
        for table in tables:
            st, rows = json_get(fetcher, f"{api}/rest/v1/{urlparse.quote(table, safe='')}?select=*&limit=1", headers)
            if st == 200 and isinstance(rows, list) and rows and isinstance(rows[0], dict):
                readable.append((table, len(rows[0]) or len((defs.get(table) or {}).get("properties") or {})))
            else:
                closed += 1
        info["supabase"].append({"url": clean(api, 80), "tables": len(tables), "readable": len(readable),
                                 "closed_or_empty": closed})
        for table, cols in readable:
            name = clean(table, 40)
            out.append(finding("security", "db-table-open", "HIGH",
                               f"Anyone can read your '{name}' table with the public key in your page ({cols} columns)",
                               f"Enable Row Level Security on the Supabase table '{name}' and add policies so each "
                               "user reads only their own rows and anonymous visitors cannot read the table.",
                               where=f"table {name}", detail=f"{cols} columns readable"))
        if tables and not readable:
            out.append(finding("security", "db-tables-closed", "INFO",
                               f"Your {len(tables)} Supabase tables returned no data to an anonymous visitor",
                               "Keep Row Level Security on for every new table.", where=clean(api, 80)))
    for api in backend.get("firebase_urls", []):
        if not owner_target_ok(api, site, "firebase"):
            info["firebase"].append({"url": clean(api, 80), "result": "refused: not this app's Firebase host"})
            continue
        status, data = json_get(fetcher, api + "/.json?shallow=true", {})
        if status == 200 and data not in (None, "too-big", {}):
            n = len(data) if isinstance(data, dict) else 1
            out.append(finding("security", "firebase-open", "HIGH",
                               f"Anyone can read your Firebase database ({n} top-level collections)",
                               "Change the Firebase Realtime Database rules so .read and .write require sign-in and "
                               "each user can only reach their own data.", where=clean(api, 80)))
            info["firebase"].append({"url": clean(api, 80), "result": f"readable ({n} keys)"})
        else:
            info["firebase"].append({"url": clean(api, 80), "result": f"closed (HTTP {status})"})
    return out, info


# ------------------------------------------------------------------------------------------- scoring
PENALTY = {"HIGH": 30, "MEDIUM": 10, "LOW": 3, "INFO": 0}


def area_score(findings):
    return max(0, 100 - sum(PENALTY[f["severity"]] for f in findings))


def grade(score):
    if score is None:
        return "skip"
    return "green" if score >= 80 else ("amber" if score >= 50 else "red")


def combine(scores, findings):
    present = {k: v for k, v in scores.items() if v is not None}
    total = sum(WEIGHTS[k] for k in present) or 1
    overall = round(sum(WEIGHTS[k] * v for k, v in present.items()) / total)
    if any(f["severity"] == "HIGH" and f["rule"].startswith(("secret-", "repo-secret-", "env-committed", "db-table-open", "firebase-open"))
           for f in findings):
        overall = min(overall, 39)
    return overall


def verdict(overall, highs, nfix=0, security_high=0):
    n = max(nfix, 1)
    todo = f"{n} thing{'s' if n != 1 else ''} to fix before you launch"
    if security_high or overall < 50:
        return "NOT READY", todo
    if highs or overall < 80:
        return "ALMOST READY", todo
    if overall >= 80:
        return "READY TO LAUNCH", "a few polish items left" if overall < 95 else "nothing important left"
    return "ALMOST READY", "worth fixing before you share the link"


def area_note(key, findings, score, skipped):
    if skipped:
        return skipped
    fs = [f for f in findings if f["area"] == key and f["severity"] != "INFO"]
    if not fs:
        return "nothing important found"
    more = f" (+{len(fs) - 1} more)" if len(fs) > 1 else ""
    return short(fs[0]["title"], 74 - len(more)) + more


def short(text, limit=60):
    """First clause of a finding, cut at a word boundary: for one-line summaries."""
    text = clean(text, 400)
    head = re.split(r"[:,]\s|\s\(", text, maxsplit=1)[0].strip()
    if len(head) <= limit:
        return head
    cut = head[:limit].rsplit(" ", 1)[0]
    return cut.rstrip(" ,;:-") + "…"


def run(args):
    t0 = time.time()
    url = normalise_target(args.url)
    fetcher = Fetcher(args.timeout)
    resp, chain = fetcher.get(url)
    if resp.status == 0 or not resp.body and resp.status != 200:
        raise ConnectionError(f"could not load {clean(url)} ({resp.error or 'HTTP ' + str(resp.status)})")
    if resp.status >= 400:
        hint = " (the site blocks automated visitors; run it on your own preview/staging URL)" if resp.status in (
            401, 403, 429, 503) else ""
        raise ConnectionError(f"{clean(url)} answered HTTP {resp.status}{hint}")
    final = resp.url
    parser = PageParser()
    try:
        parser.feed(decode(resp.body))
    except Exception:  # malformed HTML: keep what was parsed
        pass
    skip = {s.strip() for s in (args.skip or "").split(",") if s.strip()}
    notes, skipped = [], {}

    findings, assets = scan_site(fetcher, final, resp, parser, args.max_assets)
    if assets["skipped_offsite"] and not assets["same_origin"]:
        notes.append(f"{assets['skipped_offsite']} scripts load from another host (CDN): not scanned for keys "
                     "(same-site files only)")
    findings += check_headers(resp, final)
    https_f, note = check_https(fetcher, final, chain)
    findings += https_f
    if note:
        notes.append(note)
    findings += check_cookies(resp, final) + check_mixed(parser, final)
    backend = assets.pop("backend", {})
    owner_info = None
    has_db = backend.get("supabase_urls") or backend.get("firebase_urls")
    if args.owner_check and has_db:
        owner_f, owner_info = owner_check(fetcher, final, backend)
        findings += owner_f
    elif has_db:
        which = "Supabase" if backend.get("supabase_urls") else "Firebase"
        findings.append(finding("security", "db-not-tested", "LOW",
                                f"{which} database found in your page: run with --owner-check to test whether "
                                "anyone can read your tables",
                                "Run launch_check.py again with --owner-check (only on a site you own), or open the "
                                f"{which} security advisor and confirm every table has access rules."))
        notes.append(f"{which} found: add --owner-check (your own site only) to test if your tables are open")
    repo_info = None
    if args.repo:
        repo_f, repo_info = scan_repo(args.repo)
        findings += repo_f

    scores = {"security": area_score([f for f in findings if f["area"] == "security"])}
    if any(f["severity"] == "HIGH" for f in findings if f["area"] == "security"):
        scores["security"] = min(scores["security"], 30)

    shot = None
    if "phone" in skip:
        scores["phone"], skipped["phone"] = None, "skipped (--skip phone)"
    else:
        scores["phone"], phone_f, why = check_phone(final, args.timeout)
        findings += phone_f
        if why:
            skipped["phone"] = why
    search_info = {}
    if "search" in skip:
        scores["search"], skipped["search"] = None, "skipped (--skip search)"
    else:
        scores["search"], search_f, why, search_info = check_search(final, args.timeout, "speed" not in skip)
        findings += search_f
        if why:
            skipped["search"] = why
    metrics = None
    if "speed" not in skip and have_playwright() and not args.no_browser:
        shot = Path(tempfile.gettempdir()) / f"launch-check-{hashlib.sha1(final.encode()).hexdigest()[:10]}.jpg"
        metrics = browser_metrics(final, args.timeout, shot if args.report else None)
    if "speed" in skip:
        scores["speed"], skipped["speed"], basics_info = None, "skipped (--skip speed)", {}
    else:
        basic_f, basics_info = check_basics(fetcher, resp, parser, metrics, assets)
        findings += basic_f
        scores["speed"] = area_score(basic_f)

    findings.sort(key=lambda f: (SEV_ORDER[f["severity"]], [k for k, _ in AREAS].index(f["area"])))
    overall = combine(scores, findings)
    highs = sum(1 for f in findings if f["severity"] == "HIGH")
    fix_first = [f for f in findings if f["severity"] in ("HIGH", "MEDIUM")][:5]
    sec_high = sum(1 for f in findings if f["severity"] == "HIGH" and f["area"] == "security")
    word, sub = verdict(overall, highs, len(fix_first), sec_high)
    report = {
        "tool": "launch-check", "version": VERSION, "url": clean(url, 300), "final_url": clean(final, 300),
        "seconds": round(time.time() - t0, 1), "mode": "passive + owner check" if args.owner_check else "passive",
        "score": overall, "verdict": word, "verdict_detail": sub,
        "pass": overall >= args.fail_under and highs == 0, "fail_under": args.fail_under,
        "areas": {k: {"label": label, "score": scores.get(k), "grade": grade(scores.get(k)),
                      "note": area_note(k, findings, scores.get(k), skipped.get(k))} for k, label in AREAS},
        "counts": {s.lower(): sum(1 for f in findings if f["severity"] == s) for s in SEV_ORDER},
        "fix_first": fix_first, "findings": findings,
        "facts": {"assets": assets, "basics": basics_info, "search": search_info, "repo": repo_info,
                  "requests_made": fetcher.requests, "owner_check": owner_info, "refused_urls": fetcher.refused[:20]},
        "notes": notes, "skipped": skipped,
        "screenshot": (metrics or {}).get("screenshot"),
    }
    return report


# ------------------------------------------------------------------------------------------- output
MARK = {"green": "PASS", "amber": "WARN", "red": "FAIL", "skip": "SKIP"}


def ai_prompt(report):
    items = report["fix_first"] or [f for f in report["findings"] if f["severity"] != "INFO"][:5]
    if not items:
        return ""
    lines = [f"My app at {report['final_url']} was checked before launch. Please fix these, in order, "
             "and tell me what you changed:"]
    for i, f in enumerate(items, 1):
        where = f" (found in: {f['where']})" if f["where"] else ""
        lines.append(f"{i}. {f['title']}{where}. {f['fix']}")
    return "\n".join(lines)


def human(report):
    out = []
    w = out.append
    w(f"Launch Check  {report['final_url']}   ({report['seconds']:.1f} s, {report['mode']})")
    w(f"SCORE {report['score']}/100  {report['verdict']}: {report['verdict_detail']}")
    w("")
    for key, label in AREAS:
        a = report["areas"][key]
        sc = "--" if a["score"] is None else f"{a['score']:>3}"
        w(f"{MARK[a['grade']]}  {label:<21} {sc}  {clean(a['note'], 80)}")
    w("")
    fix = report["fix_first"]
    if fix:
        w("FIX THIS FIRST")
        for i, f in enumerate(fix, 1):
            w(f" {i}. {f['severity']:<6} {short(f['title'], 100)}")
            bits = [b for b in (f"in {clean(f['where'], 48)}" if f["where"] else "",
                                f"value {f['value']}" if f["value"] else "") if b]
            if bits:
                w("              " + "   ".join(bits))
    else:
        w("PASS  nothing HIGH or MEDIUM to fix")
    rest = len([f for f in report["findings"] if f["severity"] != "INFO"]) - len(fix)
    if rest > 0:
        w(f"   + {rest} smaller item(s) in the report")
    for note in report["notes"]:
        w(f"note: {note}")
    for key, why in report["skipped"].items():
        if not why.startswith("skipped (--skip"):
            w(f"note: {dict(AREAS)[key]} {why}")
    if fix:
        w("next: paste the 'fix this first' prompt (in the report or --prompt) to the AI that built your app")
    return "\n".join(out)


def headline(report):
    n = len(report["fix_first"])
    if n:
        return f"{n} thing{'s' if n != 1 else ''} to fix before you launch"
    return "Ready to launch" if report["verdict"] == "READY TO LAUNCH" else "Almost ready to launch"


def render_html(report, shot_b64=None):
    e = html.escape
    color = {"green": "#16a34a", "amber": "#d97706", "red": "#dc2626", "skip": "#94a3b8"}
    soft = {"green": "#dcfce7", "amber": "#fef3c7", "red": "#fee2e2", "skip": "#f1f5f9"}
    word = {"green": "Good", "amber": "Needs work", "red": "Fix now", "skip": "Skipped"}
    g = grade(report["score"]) if report["verdict"] != "NOT READY" else "red"
    circ = 2 * 3.14159 * 54
    dash = circ * report["score"] / 100
    cards = []
    for key, label in AREAS:
        a = report["areas"][key]
        sc = "–" if a["score"] is None else str(a["score"])
        cards.append(
            f'<div class="card" style="--c:{color[a["grade"]]};--s:{soft[a["grade"]]}">'
            f'<div class="dot"></div><div class="lab">{e(label)}</div>'
            f'<div class="num">{e(sc)}</div><div class="pill">{word[a["grade"]]}</div>'
            f'<div class="note">{e(a["note"])}</div></div>')
    fixes = []
    for i, f in enumerate(report["fix_first"], 1):
        meta = " · ".join(e(x) for x in (f["where"], f["value"]) if x)
        fixes.append(f'<li class="sev-{f["severity"].lower()}"><span class="n">{i}</span><div><b>{e(f["title"])}</b>'
                     f'{f"<small>{meta}</small>" if meta else ""}<p>{e(f["fix"])}</p></div></li>')
    details = []
    for key, label in AREAS:
        rows = [f for f in report["findings"] if f["area"] == key]
        if not rows:
            continue
        items = "".join(f'<tr><td><span class="tag t-{f["severity"].lower()}">{f["severity"]}</span></td>'
                        f'<td>{e(f["title"])}<br><small>{e(f["where"])} {e(f["value"])}</small></td></tr>' for f in rows)
        details.append(f'<details><summary>{e(label)} <span>{len(rows)}</span></summary><table>{items}</table></details>')
    prompt = ai_prompt(report)
    phone = (f'<div class="phone"><img alt="Your site on a phone" src="data:image/jpeg;base64,{shot_b64}"></div>'
             if shot_b64 else "")
    b = report["facts"].get("basics") or {}
    facts = []
    if b.get("weight_kb") is not None:
        kb = b["weight_kb"]
        facts.append(f"{kb / 1024:.1f} MB page" if kb >= 1024 else f"{kb:.0f} KB page")
    if b.get("requests"):
        facts.append(f"{b['requests']} requests")
    if b.get("load_s"):
        facts.append(f"{b['load_s']} s load")
    a = report["facts"].get("assets") or {}
    n = a.get("scanned", 0)
    facts.append(f"{n} script{'s' if n != 1 else ''} scanned for keys")
    host = urlparse.urlsplit(report["final_url"]).netloc
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Launch Check: {e(host)}</title>
<style>
:root{{--ink:#0f172a;--mut:#64748b;--line:#e2e8f0;--bg:#f8fafc;--card:#fff}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 "Inter","Segoe UI",system-ui,-apple-system,sans-serif}}
.wrap{{max-width:1080px;margin:0 auto;padding:36px 28px 48px}}
.top{{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}}
.brand{{font-weight:800;letter-spacing:-.01em;font-size:17px}}.brand i{{font-style:normal;color:#16a34a}}
.url{{color:var(--mut);font-size:14px;overflow-wrap:anywhere}}
.hero{{display:grid;grid-template-columns:auto 1fr auto;gap:32px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:22px 32px;box-shadow:0 1px 2px rgba(15,23,42,.04),0 12px 32px rgba(15,23,42,.06)}}
.dial{{position:relative;width:150px;height:150px}}.dial b{{position:absolute;inset:0;display:grid;place-items:center;font-size:46px;font-weight:800;letter-spacing:-.03em}}
.dial b small{{display:block;font-size:13px;color:var(--mut);font-weight:600;margin-top:-30px}}
.verdict{{font-size:34px;font-weight:800;letter-spacing:-.02em;line-height:1.1;color:{color[g]}}}
.sub{{font-size:18px;color:#334155;margin-top:6px}}.facts{{color:var(--mut);font-size:13px;margin-top:14px}}
.phone{{width:124px;height:236px;border-radius:22px;border:6px solid #0f172a;overflow:hidden;background:#fff;box-shadow:0 10px 30px rgba(15,23,42,.18)}}
.phone img{{width:100%;display:block}}
.grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:18px 0}}
.card{{position:relative;background:var(--card);border:1px solid var(--line);border-top:5px solid var(--c);border-radius:16px;padding:16px 18px 18px}}
.dot{{position:absolute;right:16px;top:16px;width:14px;height:14px;border-radius:50%;background:var(--c);box-shadow:0 0 0 5px var(--s)}}
.lab{{font-weight:700;font-size:14px;color:#334155}}.num{{font-size:40px;font-weight:800;letter-spacing:-.03em;color:var(--c);line-height:1.15;margin-top:4px}}
.pill{{display:inline-block;background:var(--s);color:var(--c);font-weight:700;font-size:12px;border-radius:99px;padding:2px 10px}}
.note{{font-size:13px;color:var(--mut);margin-top:8px;min-height:38px}}
h2{{font-size:19px;margin:26px 0 10px;letter-spacing:-.01em}}
ol.fix{{list-style:none;margin:0;padding:0;display:grid;gap:10px}}
ol.fix li{{display:flex;gap:14px;background:var(--card);border:1px solid var(--line);border-left:5px solid #d97706;border-radius:14px;padding:14px 18px}}
ol.fix li.sev-high{{border-left-color:#dc2626}}.n{{flex:none;width:28px;height:28px;border-radius:50%;background:#0f172a;color:#fff;display:grid;place-items:center;font-weight:800;font-size:14px}}
ol.fix b{{font-size:16px}}ol.fix small{{display:block;color:var(--mut);font-family:Consolas,monospace;font-size:12px;margin-top:2px;overflow-wrap:anywhere}}
ol.fix p{{margin:6px 0 0;color:#334155;font-size:14px}}
.ask{{background:#0f172a;color:#e2e8f0;border-radius:16px;padding:18px 20px;margin-top:14px;position:relative}}
.ask pre{{margin:0;white-space:pre-wrap;font:13px/1.55 Consolas,"Cascadia Mono",monospace;max-height:220px;overflow:auto}}
.ask button{{position:absolute;right:14px;top:14px;background:#22c55e;color:#052e16;border:0;border-radius:10px;padding:7px 14px;font-weight:800;cursor:pointer}}
.ask .h{{color:#86efac;font-weight:700;font-size:13px;margin-bottom:8px}}
details{{background:var(--card);border:1px solid var(--line);border-radius:14px;margin:8px 0;padding:10px 16px}}
summary{{cursor:pointer;font-weight:700}}summary span{{color:var(--mut);font-weight:600;margin-left:6px}}
table{{width:100%;border-collapse:collapse;margin-top:8px}}td{{border-top:1px solid var(--line);padding:8px 6px;vertical-align:top;font-size:14px}}
td small{{color:var(--mut);font-family:Consolas,monospace;overflow-wrap:anywhere}}
.tag{{font-size:11px;font-weight:800;border-radius:6px;padding:2px 7px}}.t-high{{background:#fee2e2;color:#b91c1c}}.t-medium{{background:#fef3c7;color:#b45309}}
.t-low,.t-info{{background:#f1f5f9;color:#475569}}
.foot{{color:var(--mut);font-size:12px;margin-top:22px}}
@media (max-width:820px){{.hero{{grid-template-columns:1fr;justify-items:center;text-align:center}}.grid{{grid-template-columns:1fr 1fr}}.phone{{display:none}}}}
</style></head><body><div class="wrap">
<div class="top"><div class="brand">Launch<i>Check</i></div><div class="url">{e(report['final_url'])}</div></div>
<section class="hero"><div class="dial"><svg width="150" height="150" viewBox="0 0 120 120">
<circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" stroke-width="10"/>
<circle cx="60" cy="60" r="54" fill="none" stroke="{color[g]}" stroke-width="10" stroke-linecap="round"
stroke-dasharray="{dash:.1f} {circ:.1f}" transform="rotate(-90 60 60)"/></svg><b>{report['score']}</b></div>
<div><div class="verdict">{e(headline(report))}</div><div class="sub">{e(report['verdict'].capitalize())} · score {report['score']}/100</div>
<div class="facts">{e(" · ".join(facts))} · checked in {report['seconds']:.0f} s</div></div>{phone}</section>
<div class="grid">{"".join(cards)}</div>
{"<h2>Fix this first</h2><ol class='fix'>" + "".join(fixes) + "</ol>" if fixes else "<h2>Nothing urgent to fix</h2>"}
{f'<div class="ask"><div class="h">Paste to your AI</div><button onclick="navigator.clipboard.writeText(document.getElementById(&quot;p&quot;).innerText);this.textContent=&quot;Copied&quot;">Copy</button><pre id="p">{e(prompt)}</pre></div>' if prompt else ""}
<h2>All findings</h2>{"".join(details) or "<p>None.</p>"}
<div class="foot">Passive check by launch-check {VERSION}: it read only what any visitor's browser downloads. Secret values are cut to their first 4 characters. A good score is not a security audit.</div>
</div></body></html>"""


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:  # not a reconfigurable stream
            pass
    ap = argparse.ArgumentParser(prog="launch_check.py", description="Is my AI-built app safe and ready to launch? "
                                 "Passive 4-area report card with a 0-100 score.")
    ap.add_argument("url", help="your site, e.g. https://myapp.com (http/https only)")
    ap.add_argument("--owner-check", action="store_true",
                    help="I own this site: test, read-only, whether the public Supabase/Firebase key in the page can "
                         "read my tables (GET only, max 20 tables, row contents never shown)")
    ap.add_argument("--repo", metavar="DIR", help="also scan this local project for committed .env files and secrets")
    ap.add_argument("--report", metavar="HTML", help="write the one-page report card (self-contained HTML) here")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    ap.add_argument("--prompt", action="store_true", help="print only the 'fix this first' prompt for your AI")
    ap.add_argument("--skip", metavar="AREAS", help="comma list of areas to skip: phone,search,speed")
    ap.add_argument("--no-browser", action="store_true", help="no page-load metrics or screenshot (phone check still runs)")
    ap.add_argument("--max-assets", type=int, default=MAX_ASSETS, help=f"same-site scripts to scan (default {MAX_ASSETS})")
    ap.add_argument("--timeout", type=float, default=15.0, help="seconds per request (default 15)")
    ap.add_argument("--fail-under", type=int, default=80, help="exit 1 below this score (default 80)")
    ap.add_argument("--version", action="version", version=f"launch-check {VERSION}")
    try:
        args = ap.parse_args(argv)
    except SystemExit as exc:
        return 0 if exc.code in (0, None) else 2
    if args.timeout <= 0 or args.max_assets < 0:
        print("error: --timeout > 0 and --max-assets >= 0", file=sys.stderr)
        return 2
    try:
        report = run(args)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    except ConnectionError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    if args.report:
        shot_b64 = None
        if report.get("screenshot"):
            try:
                shot_b64 = base64.b64encode(Path(report["screenshot"]).read_bytes()).decode()
                Path(report["screenshot"]).unlink()
            except OSError:
                shot_b64 = None
        try:
            Path(args.report).expanduser().write_text(render_html(report, shot_b64), encoding="utf-8")
        except OSError as exc:
            print(f"error: cannot write {args.report}: {exc}", file=sys.stderr)
            return 2
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    elif args.prompt:
        print(ai_prompt(report) or "Nothing to fix.")
    else:
        print(human(report))
        if args.report:
            print(f"report: {args.report}")
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
