import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureWithRetries } from "../assets/tool/dist/cli.js";
import { captureGenericChat } from "../assets/tool/dist/capture/generic-chat.js";
import { resolveVisibleBrowserExecutable } from "../assets/tool/dist/capture/browser-session.js";

let pageLoads = 0;
const submitted = [];
const server = createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    if (url.pathname === "/submitted") {
        submitted.push(url.searchParams.get("q"));
        response.end("ok");
        return;
    }
    pageLoads += 1;
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(`<!doctype html><textarea id="q"></textarea><button id="send">发送</button><div id="answer"></div>
      <script>
        const submit = () => {
          const q = document.querySelector('#q').value;
          fetch('/submitted?q=' + encodeURIComponent(q));
          document.querySelector('#answer').textContent = '完整回答：' + q;
          document.querySelector('#q').value = '';
        };
        document.querySelector('#send').onclick = submit;
        document.querySelector('#q').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } };
      </script>`);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const question = "页面关闭后必须真实重放的问题";
const out = await mkdtemp(join(tmpdir(), "fact-check-x-dom-replay-"));
try {
    const config = {
        name: "dom-replay",
        label: "DOM 回放",
        url: `http://127.0.0.1:${address.port}/`,
        profile: `dom-replay-${Date.now()}`,
        requiresLogin: false,
        completionStableMs: 100,
        _testCloseBeforeSubmitOnce: true,
        selectors: { input: ["#q"], submit: ["#send"], answer: ["#answer"] }
    };
    const result = await captureWithRetries(config, {
        question, outDir: out, headed: false, interactive: false,
        executablePath: resolveVisibleBrowserExecutable(),
        launchTimeoutMs: 120000,
        timeoutMs: 10000, loginTimeoutMs: 10000, retryCount: 2, retryDelayMs: 0
    }, captureGenericChat, async () => undefined);
    assert.equal(result.status, "success");
    assert.equal(result.answerMarkdown.includes(question), true);
    assert.deepEqual(submitted, [question]);
    assert.ok(pageLoads >= 2);
    if (process.env.FACT_CHECK_X_ASSERTIONS_OUTPUT) {
        const { writeFile } = await import("node:fs/promises");
        await writeFile(process.env.FACT_CHECK_X_ASSERTIONS_OUTPUT, JSON.stringify({
            schemaVersion: "fact-check-x/test-assertions@1",
            actualAssertionIds: ["browser.question_replayed", "browser.retry_submitted"]
        }));
    }
} finally {
    server.close();
    await rm(out, { recursive: true, force: true });
}
console.log("PASS 关闭页面后真实 DOM 重开并提交原问题");
