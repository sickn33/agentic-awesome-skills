#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path


PROVIDER_URL = "https://platform.dknowc.cn/auth/#/login"
DEFAULT_ENDPOINT = "https://open.dknowc.cn/dependable/search"


class ConfigurationError(RuntimeError):
    pass


class InvalidCredentialError(ConfigurationError):
    pass


class ServiceUnavailableError(ConfigurationError):
    pass


def trusted_search_ssl_context() -> ssl.SSLContext:
    candidates: list[str] = []
    try:
        import certifi

        candidates.append(certifi.where())
    except ImportError:
        pass
    defaults = ssl.get_default_verify_paths()
    candidates.extend(
        path
        for path in (
            defaults.cafile,
            "/etc/ssl/cert.pem",
            "/opt/homebrew/etc/openssl@3/cert.pem",
            "/usr/local/etc/openssl@3/cert.pem",
        )
        if path
    )
    for candidate in dict.fromkeys(candidates):
        if Path(candidate).is_file():
            return ssl.create_default_context(cafile=candidate)
    return ssl.create_default_context()


def credential_path() -> Path:
    override = os.getenv("FACT_CHECK_X_TRUSTED_SEARCH_KEY_FILE", "").strip()
    if override:
        return Path(override).expanduser()
    return Path.home() / ".fact-check-x" / "credentials" / "trusted-search-key"


def _validate_key_shape(key: str) -> str:
    normalized = key.strip()
    if (
        len(normalized) < 16
        or any(character.isspace() for character in normalized)
        or "*" in normalized
    ):
        raise ConfigurationError("可信搜索 Key 格式不正确。")
    return normalized


def _shared_trusted_search_key() -> str:
    path = credential_path()
    if not path.is_file():
        return ""
    if os.name != "nt" and path.stat().st_mode & 0o077:
        raise ConfigurationError("本机可信搜索配置权限不安全，请重新执行自动配置。")
    return _validate_key_shape(path.read_text(encoding="utf-8"))


def trusted_search_key_candidates() -> list[tuple[str, str]]:
    candidates = []
    shared_key = _shared_trusted_search_key()
    if shared_key:
        candidates.append(("shared_local_credential", shared_key))
    environment_key = os.getenv("TRUSTED_SEARCH_KEY", "").strip()
    if environment_key:
        normalized = _validate_key_shape(environment_key)
        if all(normalized != key for _, key in candidates):
            candidates.append(("environment", normalized))
    return candidates


def load_trusted_search_key() -> str:
    candidates = trusted_search_key_candidates()
    return candidates[0][1] if candidates else ""


def key_source() -> str:
    candidates = trusted_search_key_candidates()
    return candidates[0][0] if candidates else "missing"


def clear_trusted_search_key() -> bool:
    path = credential_path()
    existed = path.exists()
    path.unlink(missing_ok=True)
    return existed


def validate_trusted_search_key(key: str) -> None:
    normalized = _validate_key_shape(key)
    endpoint = os.getenv("FACTCHECK_TRUSTED_SEARCH_URL", DEFAULT_ENDPOINT).strip()
    payload = {
        "query": "住房公积金管理条例",
        "segmentCount": 1,
        "simplified": True,
        "return_full_content": False,
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json", "api-key": normalized},
    )
    try:
        with urllib.request.urlopen(
            request,
            timeout=20,
            context=trusted_search_ssl_context(),
        ) as response:
            raw = response.read().decode("utf-8")
            status = response.status
    except urllib.error.HTTPError as exc:
        if exc.code in {401, 403}:
            raise InvalidCredentialError("MaaS 返回的 Key 无效或无可信搜索权限。") from None
        raise ServiceUnavailableError(f"可信搜索服务暂时不可用（HTTP {exc.code}）。") from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise ServiceUnavailableError("暂时无法连接可信搜索服务，请检查网络后重试。") from None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise ServiceUnavailableError("可信搜索服务返回异常，请稍后重试。") from None
    code = data.get("code") if isinstance(data, dict) else None
    if status != 200 or not isinstance(data, dict):
        raise ServiceUnavailableError("可信搜索服务返回异常，请稍后重试。")
    if code not in (None, 0, 200):
        if code in (401, 403):
            raise InvalidCredentialError("MaaS 返回的 Key 无效或无可信搜索权限。")
        raise ServiceUnavailableError("可信搜索服务返回异常，请稍后重试。")


def validated_trusted_search_key() -> tuple[str, str]:
    for source, key in trusted_search_key_candidates():
        try:
            validate_trusted_search_key(key)
        except ConfigurationError:
            continue
        return key, source
    return "", "missing"


def trusted_search_key_for_execution() -> tuple[str, str, str]:
    transient_candidate: tuple[str, str] | None = None
    for source, key in trusted_search_key_candidates():
        try:
            validate_trusted_search_key(key)
        except ServiceUnavailableError:
            if transient_candidate is None:
                transient_candidate = (source, key)
            continue
        except ConfigurationError:
            continue
        return key, source, "valid"
    if transient_candidate is not None:
        source, key = transient_candidate
        return key, source, "service_unavailable"
    return "", "missing", "missing"


def onboarding_script_candidates() -> list[Path]:
    script_root = Path(__file__).resolve().parent
    skill_root = script_root.parent
    candidates = [
        skill_root
        / "modules"
        / "llm-answer-reference-compare"
        / "assets"
        / "tool"
        / "dist"
        / "trusted-search-onboarding.js",
        skill_root.parent
        / "llm-answer-reference-compare"
        / "assets"
        / "tool"
        / "dist"
        / "trusted-search-onboarding.js",
    ]
    output = []
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved not in output:
            output.append(resolved)
    return output


def locate_onboarding_script() -> Path:
    for candidate in onboarding_script_candidates():
        if candidate.is_file():
            return candidate
    searched = "、".join(str(path) for path in onboarding_script_candidates())
    raise ConfigurationError(f"未找到可信搜索自动配置组件；已检查：{searched}")


def run_onboarding(*, force: bool = False) -> dict:
    script = locate_onboarding_script()
    command = [
        "node",
        str(script),
        "--credential-file",
        str(credential_path()),
        "--provider-url",
        PROVIDER_URL,
    ]
    if force:
        command.append("--force")
    process = subprocess.run(
        command,
        text=True,
        capture_output=True,
        check=False,
        env=os.environ.copy(),
    )
    lines = [line for line in process.stdout.splitlines() if line.strip()]
    result = {}
    if lines:
        try:
            result = json.loads(lines[-1])
        except json.JSONDecodeError:
            result = {}
    if process.returncode or result.get("status") not in {
        "configured",
        "already_configured",
    }:
        message = str(result.get("error") or "").strip()
        if not message:
            message = "可信搜索自动配置未完成，请保持浏览器打开并完成登录。"
        raise ConfigurationError(message)
    load_trusted_search_key()
    return {
        "status": result["status"],
        "providerUrl": PROVIDER_URL,
        "validated": True,
        "source": str(result.get("source") or "maas_console"),
        "created": bool(result.get("created")),
        "message": (
            "检测到已有有效配置，已跳过 MaaS 登录。"
            if result["status"] == "already_configured"
            else "MaaS 登录与可信搜索配置已完成，流水线可以自动继续。"
        ),
    }


def configure() -> dict:
    existing, source, validation = trusted_search_key_for_execution()
    if existing:
        return {
            "status": "already_configured",
            "providerUrl": PROVIDER_URL,
            "validated": validation == "valid",
            "validation": validation,
            "source": source,
            "created": False,
            "message": (
                "检测到已有有效可信搜索配置，已跳过 MaaS 登录。"
                if validation == "valid"
                else "检测到已有可信搜索配置；服务暂时不可达，已保留配置且不会要求重复登录。"
            ),
        }
    return run_onboarding(force=True)


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="Fact-Check-X 可信搜索跨载体自动配置。")
    commands = root.add_subparsers(dest="command", required=True)
    commands.add_parser("configure", help="登录 MaaS 后自动获取或创建 Key 并完成配置")
    commands.add_parser("status", help="检查共享配置，不显示 Key")
    commands.add_parser("clear", help="清除本机共享的可信搜索 Key")
    return root


def main() -> int:
    args = parser().parse_args()
    try:
        if args.command == "configure":
            print(json.dumps(configure(), ensure_ascii=False))
            return 0
        if args.command == "clear":
            print(json.dumps({
                "status": "cleared",
                "removed": clear_trusted_search_key(),
            }, ensure_ascii=False))
            return 0
        configured = bool(load_trusted_search_key())
        print(json.dumps({
            "status": "configured" if configured else "configuration_required",
            "configured": configured,
            "source": key_source(),
            "providerUrl": PROVIDER_URL,
        }, ensure_ascii=False))
        return 0 if configured else 3
    except (ConfigurationError, OSError) as exc:
        print(json.dumps({
            "status": "failed",
            "error": str(exc),
            "providerUrl": PROVIDER_URL,
        }, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
