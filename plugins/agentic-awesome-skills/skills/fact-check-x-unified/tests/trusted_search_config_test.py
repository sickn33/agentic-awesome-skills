#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from trusted_search_config import (  # noqa: E402
    ConfigurationError,
    configure,
    credential_path,
    load_trusted_search_key,
    locate_onboarding_script,
    trusted_search_key_for_execution,
    validated_trusted_search_key,
    validate_trusted_search_key,
)


TEST_KEY = "fixture_fact_check_x_key_123456"


class SearchHandler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", "0"))
        self.rfile.read(length)
        if self.headers.get("api-key") != TEST_KEY:
            self.send_response(403)
            self.end_headers()
            return
        payload = json.dumps({"code": 200, "content": {"data": {"检索文章": []}}})
        encoded = payload.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format: str, *args: object) -> None:
        return


def main() -> int:
    previous = os.environ.copy()
    server = ThreadingHTTPServer(("127.0.0.1", 0), SearchHandler)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    try:
        with tempfile.TemporaryDirectory(prefix="fact-check-x-key-config-") as temp:
            key_file = Path(temp) / "credentials" / "trusted-search-key"
            key_file.parent.mkdir(parents=True)
            key_file.write_text(f"{TEST_KEY}\n", encoding="utf-8")
            key_file.chmod(0o600)
            os.environ["TRUSTED_SEARCH_KEY"] = "fixture_stale_environment_key_123456"
            os.environ["FACT_CHECK_X_TRUSTED_SEARCH_KEY_FILE"] = str(key_file)
            os.environ["FACTCHECK_TRUSTED_SEARCH_URL"] = (
                f"http://127.0.0.1:{server.server_port}/dependable/search"
            )

            assert credential_path() == key_file
            assert load_trusted_search_key() == TEST_KEY
            validate_trusted_search_key(TEST_KEY)
            selected, source = validated_trusted_search_key()
            assert selected == TEST_KEY
            assert source == "shared_local_credential"
            existing = configure()
            assert existing["status"] == "already_configured"
            assert existing["source"] == "shared_local_credential"
            assert existing["created"] is False
            assert existing["validated"] is True
            assert locate_onboarding_script().name == "trusted-search-onboarding.js"

            with patch(
                "trusted_search_config.urllib.request.urlopen",
                side_effect=OSError("The read operation timed out"),
            ):
                executable, executable_source, validation = (
                    trusted_search_key_for_execution()
                )
            assert executable == TEST_KEY
            assert executable_source == "shared_local_credential"
            assert validation == "service_unavailable"

            process = subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "scripts" / "trusted_search_config.py"),
                    "status",
                ],
                text=True,
                capture_output=True,
                check=False,
                env=os.environ.copy(),
            )
            assert process.returncode == 0
            status = json.loads(process.stdout)
            assert status == {
                "status": "configured",
                "configured": True,
                "source": "shared_local_credential",
                "providerUrl": "https://platform.dknowc.cn/auth/#/login",
            }
            assert TEST_KEY not in process.stdout
            assert TEST_KEY not in process.stderr

            try:
                validate_trusted_search_key("fixture_invalid_key_123456")
            except ConfigurationError as exc:
                assert "无效" in str(exc)
            else:
                raise AssertionError("无效 Key 应被拒绝")

            os.environ["FACTCHECK_TRUSTED_SEARCH_URL"] = (
                "http://127.0.0.1:1/dependable/search"
            )
            executable, executable_source, validation = (
                trusted_search_key_for_execution()
            )
            assert executable == TEST_KEY
            assert executable_source == "shared_local_credential"
            assert validation == "service_unavailable"
            transient = configure()
            assert transient["status"] == "already_configured"
            assert transient["validated"] is False
            assert transient["validation"] == "service_unavailable"
            assert "不会要求重复登录" in transient["message"]

            if os.name != "nt":
                key_file.chmod(0o644)
                try:
                    load_trusted_search_key()
                except ConfigurationError as exc:
                    assert "权限不安全" in str(exc)
                else:
                    raise AssertionError("权限过宽的本机 Key 应被拒绝")
    finally:
        server.shutdown()
        server.server_close()
        os.environ.clear()
        os.environ.update(previous)
    print("PASS 可信搜索跨载体共享配置、Key 验证与秘密不外显")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
