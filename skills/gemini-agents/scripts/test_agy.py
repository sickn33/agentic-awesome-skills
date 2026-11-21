#!/usr/bin/env python3
"""Synthetic safety regressions. Never invokes a real agy binary or network."""
import contextlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import shlex
import subprocess
import sys
import tempfile
import textwrap
import time
import unittest
from unittest import mock

import agy


def tool(index, name, state="DONE", params=None, output=None, error=None):
    info = {"name": name, "parameters": params or {}}
    if output is not None:
        info["output"] = output
    if error is not None:
        info["error"] = {"message": error}
    return {"event": "step_update", "step_update": {"conversation_id": "synthetic-session", "step_index": index,
            "step_type": "tool", "tool_name": name, "state": state, "tool_info": info}}


def stream(*steps, result=None, brief=None, subject_root="/synthetic", subject_paths=()):
    run = agy.Events(replay=True, brief=brief)
    run.subject_root = subject_root
    run.subject_paths = list(subject_paths)
    run.feed(json.dumps({"event": "init", "init": {"model": "test-model"}}))
    for step in steps:
        run.feed(json.dumps(step))
    run.feed(json.dumps({"event": "result", "result": result if result is not None else {
        "conversation_id": "synthetic-session", "status": "SUCCESS", "response": "Synthetic answer.", "duration_seconds": 1}}))
    return run


def read(index=1, path="/synthetic/subject.txt"):
    return tool(index, "read_file", params={"Path": path}, output="2 lines, 12 bytes")


def command(index, text="cat subject.txt", code=0):
    return tool(index, "run_command", params={"CommandLine": text}, output="Command exited with code %s.\nCommand output:\nsubject" % code)


class VerdictTests(unittest.TestCase):
    def code(self, run, mode="consult", **kwargs):
        return agy.judge(run, mode, **kwargs)[0]

    def test_done_count_and_last_step_state(self):
        run = stream(read(), tool(2, "search_web", "ACTIVE"), tool(2, "search_web", "DONE"),
                     tool(3, "write_file", "ERROR", error="Permission denied"),
                     tool(4, "run_command", "ERROR", error="Permission denied"))
        verdict = agy.judge(run, "consult")
        self.assertEqual(verdict[0], 0)
        self.assertEqual(verdict[3], {"reads": 1, "searches": 1, "commands": 0, "tool_errors": 2})
        run.feed(json.dumps(tool(2, "search_web", "ERROR", error="failed")))
        self.assertEqual(agy.judge(run, "consult")[3]["searches"], 0)

    def test_consult_manage_task_and_failed_delegation_attempts_are_boundary_failures(self):
        for name,state in [("manage_task","DONE"),("invoke_subagent","ERROR"),("run_workflow","ERROR")]:
            with self.subTest(name=name,state=state):
                self.assertEqual(self.code(stream(read(),tool(2,name,state))),2)


    def test_delegation_any_state_and_unknown_consult_done_fail_closed(self):
        for mode in ("consult","review"):
            for name in ("invoke_subagent","define_subagent","manage_subagents","browser_subagent","run_workflow"):
                for state in ("ACTIVE","DONE","ERROR"):
                    with self.subTest(mode=mode,name=name,state=state):
                        verdict = agy.judge(stream(read(),tool(2,name,state)),mode)
                        self.assertEqual(verdict[0],2)
                        self.assertIn(mode + " attempted delegation tool " + name," ".join(verdict[1]))
            self.assertEqual(agy.judge(stream(read(),tool(2,"write_file","ERROR")),mode)[0],0)
        for mode,state,expected in [("consult","DONE",2),("consult","ERROR",0),("build","DONE",0),("review","ERROR",2)]:
            verdict = agy.judge(stream(read(),tool(2,"unestablished_tool",state)),mode)
            self.assertEqual(verdict[0],expected)
            self.assertIn("unknown tool unestablished_tool"," ".join(verdict[2]))
            if mode == "consult" and state == "DONE":
                self.assertIn("boundary is unestablished"," ".join(verdict[1]))

    def test_manage_task_is_status_retrieval_and_not_positive_subject_evidence(self):
        for mode in ("build","review"):
            verdict = agy.judge(stream(read(),tool(2,"manage_task")),mode)
            self.assertEqual(verdict[0],0)
            self.assertNotIn("unknown tool manage_task"," ".join(verdict[2]))
            self.assertEqual(verdict[3]["commands"],0)
            self.assertEqual(verdict[3]["reads"],1)
        self.assertEqual(agy.judge(stream(tool(1,"manage_task")),"review")[0],2)
        self.assertEqual(agy.judge(stream(read(),tool(2,"manage_task","ERROR")),"consult")[0],0)


    def test_partial_updates_keep_parameters_and_output(self):
        run = stream(tool(1, "run_command", "ACTIVE", {"CommandLine": "git show HEAD"}),
                     tool(1, "run_command", "ACTIVE", output={"exit_code": 0, "stdout": "subject"}))
        run.feed(json.dumps({"event": "step_update", "step_update": {"step_index": 1, "state": "DONE"}}))
        self.assertEqual(self.code(run, "review"), 2)
        self.assertEqual(len(run.tools()), 1)
        info = run.tools()[0]["tool_info"]
        self.assertEqual(info["parameters"], {"CommandLine": "git show HEAD"})
        self.assertEqual(info["output"], {"exit_code": 0, "stdout": "subject"})

    def test_failures_precede_boundary_and_name_every_denied_action(self):
        run = stream(read(), tool(2, "edit_file"), result={"status": "SUCCESS", "response": "A plausible answer",
                     "denied_actions": [{"action": "command"}, {"action": "write_file"}]})
        verdict = agy.judge(run, "consult")
        self.assertEqual(verdict[0], 1)
        detail = " ".join(verdict[1])
        self.assertIn("command", detail)
        self.assertIn("write_file", detail)
        self.assertIn("turn ended there", detail)

    def test_missing_result_empty_status_and_subprocess_failure(self):
        run = agy.Events()
        run.feed('{"event":"init","init":{}}')
        self.assertEqual(self.code(run), 1)
        for result in ({"status": "SUCCESS", "response": ""}, {"status": "ERROR", "response": "answer"},
                       {"response": "answer"}):
            self.assertEqual(self.code(stream(read(), result=result)), 1)
        run = stream(read()); run.code = 8
        self.assertEqual(self.code(run), 1)

    def test_consult_checks_writes_commands_and_status(self):
        for name in ("write_file", "edit_file", "run_workflow", "invoke_subagent", "define_subagent", "manage_subagents", "run_command"):
            self.assertEqual(self.code(stream(read(), tool(2, name))), 2, name)
            expected = 2 if name in agy.SUBAGENTS or name == "run_workflow" else 0
            self.assertEqual(self.code(stream(read(), tool(2, name, "ERROR", error="denied"))), expected, name)
        self.assertEqual(self.code(stream(read()), git_changed=True), 2)
        self.assertEqual(self.code(stream(read()), git_observable=False), 0)

    def test_review_fails_unknown_even_refused_and_search_any_state(self):
        self.assertEqual(self.code(stream(read()), "review"), 0)
        for state in ("ACTIVE", "DONE", "ERROR"):
            for name in ("new_tool", "search_web"):
                self.assertEqual(self.code(stream(read(), tool(2, name, state)), "review"), 2)
        verdict = agy.judge(stream(read(), tool(2, "new_tool", "ERROR")), "consult")
        self.assertEqual(verdict[0], 0)
        self.assertIn("unknown tool", " ".join(verdict[2]))

    def test_reads_must_succeed_and_review_brief_is_excluded(self):
        self.assertEqual(self.code(stream()), 2)
        self.assertEqual(self.code(stream(tool(1, "read_file", "ERROR", error="No such file"))), 2)
        for exit_code in (1, 128):
            self.assertEqual(self.code(stream(command(1, code=exit_code)), "review"), 2)
        run = stream(read(path="/synthetic/brief.txt"), brief="/synthetic/brief.txt")
        self.assertEqual(self.code(run, "review"), 2)
        self.assertEqual(self.code(run, "consult"), 0)
        self.assertEqual(self.code(stream(command(1, text="touch empty.txt")), "review"), 2)
        run = stream(command(1, "git log -1"))
        self.assertEqual(self.code(run, "review"), 2)
        self.assertEqual(agy.judge(run, "review")[3]["reads"], 1)
        run.tools()[0]["tool_info"]["output"] += "\nfatal: cannot read repository"
        self.assertEqual(self.code(run, "review"), 2)
        self.assertEqual(agy.judge(run, "review")[3]["reads"], 0)

    def test_quota_uses_error_context_only_and_timeout_wins(self):
        for error in ("RESOURCE_EXHAUSTED: capacity", "HTTP 429 quota exhausted"):
            run = stream(result={"status": "ERROR", "error": error, "response": ""})
            self.assertEqual(self.code(run), 3)
            run.result["finished_reason"] = "print_timeout"
            self.assertEqual(self.code(run), 1)
            run.result.pop("finished_reason"); run.timed_out = True
            self.assertEqual(self.code(run), 1)
        run = stream(read(), result={"status": "SUCCESS", "response": "The source quotes RESOURCE_EXHAUSTED and 429 quota."})
        run.tools()[0]["tool_info"]["output"] = "RESOURCE_EXHAUSTED: 429 quota"
        self.assertEqual(self.code(run), 0)
        self.assertEqual(self.code(stream(result={"status": "ERROR", "response": "HTTP 429 RESOURCE_EXHAUSTED: quota exceeded"})), 3)

    def test_nonzero_three_is_not_automatically_quota(self):
        run = stream(result={"status": "ERROR", "response": "", "finished_reason": "print_timeout"})
        run.code = 3
        self.assertEqual(self.code(run), 1)

    def test_network_and_mcp_defaults_enforced(self):
        for mode in ("consult", "build", "review"):
            self.assertEqual(self.code(stream(read(), tool(2, "read_url_content")), mode), 2)
            self.assertEqual(self.code(stream(read(), tool(2, "call_mcp_tool")), mode), 2)
        self.assertEqual(self.code(stream(read(), tool(2, "call_mcp_tool")), "build", mcp=True), 0)

    def test_bare_json_allowed_replay_only(self):
        text = '{"status":"ERROR","finished_reason":"print_timeout","response":""}'
        run = agy.Events(replay=True); run.feed(text)
        self.assertEqual(self.code(run), 1)
        self.assertIsNotNone(run.result)
        run = agy.Events(); run.feed(text)
        self.assertIsNone(run.result)

    def test_guessed_registry_tools_fail_review_and_no_read_build_fails(self):
        for name in ("view_file", "list_dir", "find_by_name", "grep_search", "finish", "command_status"):
            self.assertEqual(self.code(stream(read(), tool(2, name)), "review"), 2)
        self.assertEqual(self.code(stream(), "build"), 2)

    def test_session_mismatch_never_succeeds(self):
        self.assertEqual(self.code(stream(read()), expected_session="another-id"), 1)


FAKE = r'''
import json, os, pathlib, re, subprocess, sys, time
config = json.loads(pathlib.Path(os.environ['FAKE_CONFIG']).read_text())
args = sys.argv[1:]
record = {'argv': args, 'cwd': os.getcwd()}
if '--help' in args:
    print(config.get('help', '-p --output-format --print-timeout --settings --sandbox --conversation --model --effort --add-dir'))
elif '--version' in args:
    print('agy synthetic version')
else:
    record['stdin'] = sys.stdin.read()
    pointer = args[args.index('-p') + 1]
    match = re.match(r'Read (.+?) and do what it says\.', pointer)
    brief = match.group(1)
    record['brief'] = brief
    record['brief_contents'] = pathlib.Path(brief).read_text()
    record['prepared_files'] = {str(p):p.read_bytes().hex() for p in pathlib.Path(brief).parent.iterdir() if p.is_file()}
    listing_match = re.search(r'Repository file list: (.+?); entries', pointer)
    record['listing'] = pathlib.Path(listing_match.group(1)).read_text() if listing_match else None
    if config.get('reread'):
        record['reread_contents'] = pathlib.Path(config['reread']).read_text()
    record['subject_contents'] = pathlib.Path('notes.txt').read_text() if pathlib.Path('notes.txt').exists() else None
    if config.get('sleep'):
        time.sleep(config['sleep'])
    if config.get('mutate'):
        pathlib.Path('changed.txt').write_text('changed')
    def send(obj):
        print(json.dumps(obj), flush=True)
    send({'event':'init','conversation_id':config.get('init_id'),'init':{'model':'synthetic-model','cwd':os.getcwd()}})
    session = config.get('session', args[args.index('--conversation') + 1] if '--conversation' in args else 'new-synthetic-session')
    steps = config.get('steps')
    if steps is None:
        steps = [('read_file', 'DONE', {'Path': brief}, '1 lines, 10 bytes'),
                 ('read_file', 'DONE', {'Path': str(pathlib.Path('notes.txt').absolute())}, '1 lines, 10 bytes')]
    if config.get('brief_only'):
        steps = steps[:1]
    if config.get('listing_only'):
        steps = [('read_file','DONE',{'Path':listing_match.group(1)},'generated file list')]
    if config.get('commit_mutation'):
        pathlib.Path('notes.txt').write_text('committed by reviewer')
        subprocess.run(['git','add','notes.txt'],check=True)
        subprocess.run(['git','-c','user.name=Probe','-c','user.email=probe@example.invalid','commit','-m','review mutation'],capture_output=True,check=True)
    for index, (name,state,params,output) in enumerate(steps):
        send({'event':'step_update','step_update':{'conversation_id':session,'step_index':index,'step_type':'tool','tool_name':name,'state':state,'tool_info':{'parameters':params,'output':output}}})
    if not config.get('no_result'):
        result={'conversation_id':session,'status':'SUCCESS','response':'Synthetic successful answer.','duration_seconds':0.2}
        result.update(config.get('result', {}))
        send({'event':'result','result':result})
    if config.get('stderr'):
        print(config['stderr'], file=sys.stderr)
with open(os.environ['FAKE_CALLS'], 'a') as stream:
    stream.write(json.dumps(record) + '\n')
sys.exit(config.get('exit',0) if '-p' in args else 0)
'''


class IntegrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="agy-test-")
        self.root = Path(self.tmp.name).resolve()
        self.cwd = self.root / "workspace with spaces"
        self.cwd.mkdir()
        self.home = self.root / "home"
        self.home.mkdir()
        self.bin = self.root / "fake agy"
        self.bin.write_text("#!" + sys.executable + "\n" + textwrap.dedent(FAKE), encoding="utf-8")
        self.bin.chmod(0o755)
        self.config = self.root / "config.json"
        self.config.write_text("{}")
        self.calls = self.root / "calls.jsonl"
        self.state = self.root / "saved-state.json"
        self.env = dict(os.environ, HOME=str(self.home), AGY_BIN=str(self.bin), AGY_AGENTS_STATE=str(self.state),
                        FAKE_CONFIG=str(self.config), FAKE_CALLS=str(self.calls), PYTHONDONTWRITEBYTECODE="1")
        self.env.pop("GEMINI_API_KEY", None)
        self.env.pop("AGY_ADC_AUTH", None)
        self.git("init")
        (self.cwd / "notes.txt").write_text("committed subject\n")
        self.git("add", "notes.txt")
        self.git("-c", "user.name=Synthetic", "-c", "user.email=synthetic@example.invalid", "commit", "-m", "subject")

    def tearDown(self):
        self.tmp.cleanup()

    def git(self, *args):
        result = agy.git(self.cwd, *args)
        self.assertEqual(result.returncode, 0, result.stderr.decode())
        return result.stdout.decode().strip()

    def configure(self, **kwargs):
        self.config.write_text(json.dumps(kwargs))

    def invoke(self, *args, stdin=None):
        return subprocess.run([sys.executable, str(Path(agy.__file__).absolute()), "--cwd", str(self.cwd), *args],
                              input=stdin, text=True, capture_output=True, env=self.env, timeout=20)

    def records(self, models=False):
        values = [json.loads(x) for x in self.calls.read_text().splitlines()] if self.calls.exists() else []
        return [r for r in values if "-p" in r["argv"]] if models else values

    def test_check_dry_run_replay_and_status_do_not_launch_model(self):
        checked = self.invoke("--check")
        self.assertEqual(checked.returncode, 0, checked.stderr)
        self.assertIn("version=agy synthetic version", checked.stderr)
        self.assertEqual(len(checked.stderr.splitlines()), 2)
        dry = self.invoke("--dry-run", "Message")
        self.assertEqual(dry.returncode, 0, dry.stderr)
        data = json.loads(dry.stdout)
        self.assertEqual(data["stdin"], "DEVNULL")
        self.assertFalse(Path(data["brief"]).exists())
        saved = self.root / "replay.jsonl"
        saved.write_text("\n".join(json.dumps(x) for x in [read(), {"event": "result", "result": {"status":"SUCCESS","response":"Replay"}}]))
        self.assertEqual(self.invoke("--replay", str(saved), "--mode", "consult").returncode, 0)
        self.assertEqual(self.invoke("--status").returncode, 0)
        self.assertEqual(self.records(models=True), [])

    def test_missing_execution_flag_fails_before_model(self):
        self.configure(help="-p --settings --output-format --print-timeout --add-dir")
        result = self.invoke("--mode", "build", "Do work")
        self.assertEqual(result.returncode, 1)
        self.assertIn("--sandbox", result.stderr)
        self.assertEqual(self.records(models=True), [])
        self.assertEqual(self.invoke("--check").returncode, 1)

    def test_prompt_file_pointer_dirs_cwd_and_devnull(self):
        result = self.invoke("Message with spaces and quotes ' ` $()", "--mode", "consult")
        self.assertEqual(result.returncode, 0, result.stderr)
        record = self.records(models=True)[0]
        self.assertEqual(record["stdin"], "")
        self.assertEqual(record["cwd"], str(self.cwd))
        self.assertEqual(record["brief_contents"], "Message with spaces and quotes ' ` $()")
        self.assertFalse(agy.within(record["brief"], self.cwd))
        self.assertIn(str(Path(str(self.state) + ".handoff")), record["argv"])
        self.assertTrue(Path(record["brief"]).is_file())
        self.assertNotIn("Message with spaces", " ".join(record["argv"]))
        self.assertIn("Google does not support", result.stderr)

    def test_read_file_and_stdin(self):
        folder = self.root / "external input"
        folder.mkdir()
        brief = folder / "brief with spaces.txt"
        brief.write_text("File message")
        self.assertEqual(self.invoke("--read", str(brief)).returncode, 0)
        self.assertNotEqual(self.records(models=True)[0]["brief"], str(brief))
        self.assertEqual(self.records(models=True)[0]["brief_contents"], "File message")
        self.assertTrue(brief.exists())
        result = self.invoke("--new", "--read", "-", stdin="stdin message")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.records(models=True)[-1]["brief_contents"], "stdin message")

    def test_mode_flags_and_resume_settings(self):
        extra = self.root / "extra files"
        extra.mkdir()
        result = self.invoke("--mode", "build", "--model", "chosen-model", "--effort", "high", "--add-dir", str(extra), "Build")
        self.assertEqual(result.returncode, 0, result.stderr)
        result = self.invoke("Continue")
        self.assertEqual(result.returncode, 0, result.stderr)
        argv = self.records(models=True)[-1]["argv"]
        for flag, value in [("--conversation", "new-synthetic-session"), ("--model", "chosen-model"), ("--effort", "high")]:
            self.assertEqual(argv[argv.index(flag) + 1], value)
        self.assertIn(str(extra), argv)
        self.assertIn("--sandbox", argv)
        self.assertNotIn("--mode", argv)
        self.assertNotIn("-c", argv)
        self.assertNotIn("Google does not support", result.stderr)
        self.assertNotIn("sign-in route", result.stderr)
        settings = json.loads(argv[argv.index("--settings") + 1])
        self.assertEqual(settings, {"permissions":{"deny":["read_url(*)","execute_url(*)","mcp(*)"]}})
        result = self.invoke("--new", "--mode", "build", "--mcp", "--no-sandbox", "Build again")
        self.assertEqual(result.returncode, 0, result.stderr)
        argv = self.records(models=True)[-1]["argv"]
        self.assertNotIn("--sandbox", argv)
        self.assertNotIn("--effort", argv)
        self.assertNotIn("mcp(*)", argv[argv.index("--settings") + 1])
        self.assertIn("user's own rights", result.stderr)
        result = self.invoke("--no-sandbox", "Continue unsafe")
        self.assertIn("user's own rights", result.stderr)

    def test_consult_exact_deny_and_unknown_state_warns(self):
        self.state.write_text("corrupt")
        result = self.invoke("Question")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("cannot use state", result.stderr)
        argv = self.records(models=True)[-1]["argv"]
        settings = json.loads(argv[argv.index("--settings") + 1])
        self.assertEqual(settings, {"permissions":{"deny":["write_file(*)","command(*)","unsandboxed(*)","read_url(*)","execute_url(*)","mcp(*)"]}})
        self.assertNotIn("--sandbox", argv)

    def test_failed_run_keeps_id_and_no_success_answer(self):
        out = self.cwd / "answer.txt"
        self.configure(result={"denied_actions":[{"action":"command"}]})
        result = self.invoke("--out", str(out), "Try")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertEqual(result.stdout, "")
        self.assertEqual(out.read_text(), "")
        self.assertIn('"event": "result"', Path(str(out) + ".events.jsonl").read_text())
        self.assertEqual(json.loads(self.state.read_text())["session"], "new-synthetic-session")
        self.configure(session="different-synthetic-session")
        result = self.invoke("--session", "requested-session", "Continue")
        self.assertEqual(result.returncode, 1)
        self.assertIn("mismatch", result.stderr)
        self.assertEqual(len(self.records(models=True)), 2)

    def test_output_and_log_own_writes_not_consult_mutations(self):
        out = self.cwd / "answer.txt"
        log = self.cwd / "events.txt"
        out.write_text(""); log.write_text("")
        self.git("add", "answer.txt", "events.txt")
        self.git("-c", "user.name=Synthetic", "-c", "user.email=synthetic@example.invalid", "commit", "-m", "empty outputs")
        result = self.invoke("--out", str(out), "--log", str(log), "Question")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("successful answer", out.read_text())
        self.assertIn('"event": "step_update"', log.read_text())
        self.configure(mutate=True)
        result = self.invoke("Question")
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertEqual(result.stdout, "")

    def test_snapshot_excludes_uncommitted_and_isolated_objects(self):
        (self.cwd / "notes.txt").write_text("uncommitted source\n")
        self.git("config", "example.private", "must-not-copy")
        self.configure(mutate=True)
        result = self.invoke("--mode", "review", "--keep-snapshot", "Review")
        self.assertEqual(result.returncode, 0, result.stderr)
        record = self.records(models=True)[0]
        clone = Path(record["cwd"])
        try:
            self.assertEqual(record["subject_contents"], "committed subject\n")
            self.assertEqual((self.cwd / "notes.txt").read_text(), "uncommitted source\n")
            self.assertTrue((clone / ".git").is_dir())
            self.assertNotIn("must-not-copy", (clone / ".git" / "config").read_text())
            self.assertNotIn("[remote", (clone / ".git" / "config").read_text())
            self.assertIn("changed.txt", result.stderr)
            self.assertIn("uncommitted source changes", result.stderr)
            self.assertIn("five built-in skills", result.stderr)
            self.assertFalse(self.state.exists())
            source_objects = {p.relative_to(self.cwd / ".git" / "objects"): p.stat().st_ino for p in (self.cwd / ".git" / "objects").rglob("*") if p.is_file()}
            compared = 0
            for rel, inode in source_objects.items():
                copied = clone / ".git" / "objects" / rel
                if copied.exists():
                    compared += 1
                    self.assertNotEqual(copied.stat().st_ino, inode)
            self.assertGreater(compared, 0)
        finally:
            shutil.rmtree(clone.parent)

    def test_snapshot_cleanup_revision_validation_and_no_resume(self):
        self.assertEqual(self.invoke("--mode", "build", "Build").returncode, 0)
        result = self.invoke("--mode", "review", "Review")
        self.assertEqual(result.returncode, 0, result.stderr)
        record = self.records(models=True)[-1]
        self.assertFalse(Path(record["cwd"]).exists())
        self.assertNotIn("--conversation", record["argv"])
        self.assertNotIn("--effort", record["argv"])
        self.assertNotIn("--model", record["argv"])
        self.assertEqual(json.loads(self.state.read_text())["mode"], "build")
        count = len(self.records(models=True))
        self.assertEqual(self.invoke("--mode", "review", "--rev", "no-such-local-ref", "Review").returncode, 1)
        self.assertEqual(len(self.records(models=True)), count)

    def test_live_review_log_replay_keeps_exact_brief_exclusion(self):
        self.configure(brief_only=True)
        output = self.root / "review.txt"
        live = self.invoke("--mode", "review", "--out", str(output), "Review")
        self.assertEqual(live.returncode, 2, live.stderr)
        events = Path(str(output) + ".events.jsonl")
        replay = self.invoke("--replay", str(events), "--mode", "review")
        self.assertEqual(replay.returncode, 2, replay.stderr)
        self.assertIn("review read nothing in the snapshot or its attachments", replay.stderr)
        self.assertEqual(replay.stdout, "")

    def test_colliding_paths_fail_without_truncation_or_model(self):
        target = self.root / "retained.txt"
        target.write_text("retained contents")
        result = self.invoke("--out", str(target), "--log", str(target), "Question")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertEqual(target.read_text(), "retained contents")
        self.assertEqual(self.records(models=True), [])
        alias = self.root / "alias.txt"
        os.link(target, alias)
        result = self.invoke("--out", str(target), "--log", str(alias), "Question")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(target.read_text(), "retained contents")

    def test_init_id_is_retained_when_failure_precedes_steps(self):
        self.configure(no_result=True, steps=[], init_id="opened-synthetic-session")
        result = self.invoke("--mode", "build", "Do work")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(json.loads(self.state.read_text())["session"], "opened-synthetic-session")

    def test_explicit_mismatch_leaves_saved_state(self):
        self.assertEqual(self.invoke("Question").returncode, 0)
        before = self.state.read_text()
        self.configure(session="unexpected-id")
        result = self.invoke("--session", "requested-id", "Continue")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(self.state.read_text(), before)

    def test_committed_snapshot_mutation_is_reported_with_clean_status(self):
        self.configure(commit_mutation=True)
        result = self.invoke("--mode", "review", "Review")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("notes.txt", result.stderr)
        self.assertIn(".git/HEAD", result.stderr)
        self.assertNotIn("changes inside review snapshot: none", result.stderr)
        self.assertEqual((self.cwd / "notes.txt").read_text(), "committed subject\n")

    def test_empty_key_warns_incomplete_route_and_not_configured_key(self):
        settings = self.home / ".gemini" / "antigravity-cli" / "settings.json"
        settings.parent.mkdir(parents=True)
        settings.write_text('{"modelProvider":"gemini"}')
        self.env["GEMINI_API_KEY"] = ""
        result = self.invoke("--check")
        self.assertEqual(result.returncode, 0)
        self.assertIn("incomplete AI Studio key configuration", result.stderr)
        self.assertIn("a Google account sign-in", result.stderr)
        self.assertNotIn("sign-in route=AI Studio key", result.stderr)

    def test_incomplete_probe_is_failure_and_does_not_save_session(self):
        result = self.invoke("--probe")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn("not attempted", result.stderr)
        self.assertFalse(self.state.exists())
        self.assertEqual(len(self.records(models=True)), 1)
        pointer = self.records(models=True)[0]["argv"][1]
        self.assertIn("Attempt each boundary test", pointer)

    def test_failed_probe_still_reports_attempted_boundaries(self):
        self.configure(no_result=True, steps=[])
        result = self.invoke("--probe")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn("consult file-tool write deny: not attempted", result.stderr)
        self.assertIn("consult command deny: not attempted", result.stderr)
        self.assertFalse(self.state.exists())

    def test_bad_arguments_use_wrapper_diagnostic_prefix(self):
        result = self.invoke("--unknown-wrapper-flag")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("[agy.py]", result.stderr)
        self.assertNotIn("Traceback", result.stderr)


    def test_external_inputs_are_copied_without_exposing_parent(self):
        external = self.root / "external inputs"
        external.mkdir()
        source = external / "brief.txt"
        source.write_text("Question")
        (external / "unrelated.txt").write_text("not handed off")
        result = self.invoke("--read", str(source))
        self.assertEqual(result.returncode, 0, result.stderr)
        record = self.records(models=True)[0]
        self.assertNotEqual(record["brief"], str(source))
        self.assertNotIn(str(external), record["argv"])
        self.assertEqual(source.read_text(), "Question")
        self.assertTrue(Path(record["brief"]).is_file())

    def test_handoff_survives_resume_and_dry_run_then_reset_cleans_it(self):
        self.assertEqual(self.invoke("First question").returncode, 0)
        first = Path(self.records(models=True)[0]["brief"])
        self.assertTrue(first.is_file())
        self.assertEqual(self.invoke("--new", "--dry-run", "Preview").returncode, 0)
        self.assertTrue(first.is_file())
        self.assertEqual(self.invoke("Continue using " + str(first)).returncode, 0)
        self.assertEqual(first.read_text(), "First question")
        self.assertEqual(self.invoke("--reset").returncode, 0)
        self.assertFalse(first.exists())

    def test_review_rejects_user_add_dir_before_model(self):
        result = self.invoke("--mode", "review", "--add-dir", str(self.root), "Review")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertEqual(self.records(models=True), [])

    def test_review_missing_named_snapshot_file_fails_before_model(self):
        missing = self.cwd / "uncommitted-subject.txt"
        missing.write_text("not committed")
        result = self.invoke("--mode", "review", "Read `" + str(missing) + "`.")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn("--attach", result.stderr)
        self.assertEqual(self.records(models=True), [])

    def test_consult_outside_git_warns_and_remains_usable(self):
        nongit = self.root / "plain folder"
        nongit.mkdir()
        # The test sandbox is inside a repository: stop discovery at this boundary.
        (nongit / ".git").write_text("gitdir: missing-git-directory\n")
        result = self.invoke("--cwd", str(nongit), "Question")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("listing skipped", result.stderr)
        self.assertEqual(result.stderr.count("not a git repository"), 1, result.stderr)

    def test_error_diagnostic_is_once_and_denial_advice_is_last(self):
        detail = "invalid model selection: synthetic-missing"
        self.configure(result={"status":"ERROR","response":"","error":detail}, stderr="Error: " + detail)
        result = self.invoke("--mode", "build", "Work")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stderr.count(detail), 1, result.stderr)
        denial = "Permission denied for command(synthetic)"
        self.configure(result={"status":"ERROR","response":"","error":denial,"denied_actions":[{"action":"command"}]},
                       stderr="Error: " + denial + "\nAdd an allow rule or use --dangerously-skip-permissions to proceed.")
        result = self.invoke("--mode", "build", "Work")
        self.assertEqual(result.stderr.count(denial), 1, result.stderr)
        self.assertIn("Do not add an allow rule", result.stderr.splitlines()[-1])


    def test_attachments_are_binary_safe_and_names_and_aliases_do_not_collide(self):
        left = self.root / "left"
        right = self.root / "right"
        left.mkdir(); right.mkdir()
        first = left / "brief.txt"
        second = right / "brief.txt"
        first.write_bytes(b"\x00\xffbinary")
        second.write_bytes(b"other attachment")
        alias = self.root / "input alias.txt"
        alias.symlink_to(first)
        hardlink = self.root / "hardlink.txt"
        os.link(first, hardlink)
        body = "Read `" + str(first) + "` and `" + str(alias) + "` and `" + str(hardlink) + "`, then `" + str(second) + "`. Keep `" + str(first) + "-other` unchanged."
        source = self.root / "brief.txt"
        source.write_text(body)
        result = self.invoke("--read", str(source), "--attach", str(alias), "--attach", str(hardlink), "--attach", str(second))
        self.assertEqual(result.returncode, 0, result.stderr)
        record = self.records(models=True)[0]
        prepared = {Path(name).name: bytes.fromhex(data) for name, data in record["prepared_files"].items()}
        self.assertEqual(sum(name.startswith("attachment-") for name in prepared), 2)
        self.assertIn(b"\x00\xffbinary", prepared.values())
        self.assertIn(b"other attachment", prepared.values())
        self.assertEqual(source.read_text(), body)
        self.assertEqual(first.read_bytes(), b"\x00\xffbinary")
        self.assertIn(str(first) + "-other", record["brief_contents"])
        self.assertNotIn("`" + str(first) + "`", record["brief_contents"])
        self.assertIn("handoff path rewrites: 4", result.stderr)
        self.assertNotIn(str(left), record["argv"])
        self.assertNotIn(str(right), record["argv"])

    def test_internal_brief_keeps_path_unless_attachment_substitution_needs_copy(self):
        brief = self.cwd / "task.txt"
        attached = self.root / "extra.txt"
        attached.write_text("input")
        brief.write_text("Read `" + str(attached) + "`.")
        result = self.invoke("--mode", "build", "--read", str(brief))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.records(models=True)[-1]["brief"], str(brief))
        result = self.invoke("--read", str(brief), "--attach", str(attached))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotEqual(self.records(models=True)[-1]["brief"], str(brief))
        self.assertEqual(brief.read_text(), "Read `" + str(attached) + "`.")

    def compose_subject_prompt(self, cwd, directory):
        subject = directory / "review-subject-synthetic.md"
        subject.write_text("synthetic range and diff\n")
        prompt = directory / "review-prompt-synthetic.md"
        prompt.write_text("Review the supplied change.\n\n## Reading the subject\n\nYou have read-only tools. "
                          + "The subject is in `" + str(subject) + "`: the range's commits with their diffs "
                          + "(and the range's cumulative diff when it contains a merge; for a bare ref such as HEAD, "
                          + "its log, every file it holds and every line its history removed, as its first line says), "
                          + "then the uncommitted working tree, untracked files with their content. It has 3 lines. "
                          + "A single read is not the subject. Everything else you need is in the repository's files, "
                          + "at `" + str(cwd) + "`. Name any instruction files or other context still loaded in the report.\n")
        return prompt, subject

    def test_compose_prompt_subject_requires_attachment_and_uses_only_handoff(self):
        prompt, subject = self.compose_subject_prompt(self.cwd, self.cwd / ".git")
        original = prompt.read_text()
        forgotten = self.invoke("--mode", "review", "--read", str(prompt))
        self.assertEqual(forgotten.returncode, 1, forgotten.stderr)
        self.assertIn("review-subject-synthetic.md", forgotten.stderr)
        self.assertIn("--attach", forgotten.stderr)
        self.assertEqual(self.records(models=True), [])
        result = self.invoke("--mode", "review", "--read", str(prompt), "--attach", str(subject), "--keep-snapshot")
        self.assertEqual(result.returncode, 0, result.stderr)
        record = self.records(models=True)[-1]
        clone = Path(record["cwd"])
        try:
            folders = [record["argv"][i+1] for i, flag in enumerate(record["argv"]) if flag == "--add-dir"]
            self.assertEqual(folders, [str(clone.parent / "handoff")])
            copied_subject = re.search(r"The subject is in `([^`]+)`", record["brief_contents"]).group(1)
            self.assertTrue(agy.within(copied_subject, clone.parent / "handoff"))
            self.assertEqual(Path(copied_subject).read_bytes(), subject.read_bytes())
            self.assertIn("at `" + str(clone) + "`", record["brief_contents"])
            self.assertEqual(prompt.read_text(), original)
        finally:
            shutil.rmtree(clone.parent)

    def test_linked_worktree_external_git_subject_is_not_accidentally_exposed(self):
        linked = self.root / "linked workspace"
        self.git("worktree", "add", "--detach", str(linked), "HEAD")
        gitdir_run = agy.git(linked, "rev-parse", "--absolute-git-dir")
        gitdir = Path(os.fsdecode(gitdir_run.stdout).strip())
        prompt, subject = self.compose_subject_prompt(linked, gitdir)
        forgotten = self.invoke("--cwd", str(linked), "--mode", "review", "--read", str(prompt))
        self.assertEqual(forgotten.returncode, 1, forgotten.stderr)
        self.assertIn("--attach", forgotten.stderr)
        self.assertEqual(self.records(models=True), [])
        result = self.invoke("--cwd", str(linked), "--mode", "review", "--read", str(prompt), "--attach", str(subject))
        self.assertEqual(result.returncode, 0, result.stderr)
        argv = self.records(models=True)[0]["argv"]
        self.assertNotIn(str(gitdir), argv)
        self.assertNotIn(str(linked), argv)

    def test_review_symlink_subdirectory_rewrite_and_neighbor_boundary(self):
        nested = self.cwd / "nested"
        nested.mkdir()
        (nested / "item.txt").write_text("nested")
        self.git("add", "nested/item.txt")
        self.git("-c", "user.name=Synthetic", "-c", "user.email=synthetic@example.invalid", "commit", "-m", "nested subject")
        alias = self.root / "repository alias"
        alias.symlink_to(self.cwd, target_is_directory=True)
        neighbor = str(self.cwd) + "-other/notes.txt"
        windows = r"C:\neutral\repo-other\example.txt"
        message = "Read `" + str(alias / "notes.txt") + "` and `" + str(self.cwd / "nested" / "item.txt") + "`. Examples `" + neighbor + "` and `" + windows + "`."
        result = self.invoke("--cwd", str(alias / "nested") + os.sep, "--mode", "review", message)
        self.assertEqual(result.returncode, 0, result.stderr)
        record = self.records(models=True)[0]
        self.assertIn(neighbor, record["brief_contents"])
        self.assertIn(windows, record["brief_contents"])
        self.assertIn(str(Path(record["cwd"]) / "notes.txt"), record["brief_contents"])
        self.assertNotIn("`" + str(alias), record["brief_contents"])
        self.assertIn("handoff path rewrites: 2", result.stderr)

    def test_new_cleans_old_state_even_if_no_id_and_preloads_owned_inputs(self):
        self.assertEqual(self.invoke("First question").returncode, 0)
        first = Path(self.records(models=True)[0]["brief"])
        self.configure(no_result=True, steps=[])
        result = self.invoke("--new", "--read", str(first), "--attach", str(first))
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertFalse(first.exists())
        self.assertFalse(self.state.exists())
        self.assertEqual(self.records(models=True)[-1]["brief_contents"], "First question")
        self.assertTrue(Path(self.records(models=True)[-1]["brief"]).is_file())

    def test_dry_run_never_changes_durable_handoff_or_state(self):
        self.assertEqual(self.invoke("First question").returncode, 0)
        root = Path(str(self.state) + ".handoff")
        before = {str(path.relative_to(root)):path.read_bytes() for path in root.rglob("*") if path.is_file()}
        state_before = self.state.read_bytes()
        attached = self.root / "attachment.txt"
        attached.write_text("input")
        result = self.invoke("--new", "--dry-run", "--attach", str(attached), "Read " + str(attached))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.state.read_bytes(), state_before)
        self.assertEqual({str(path.relative_to(root)):path.read_bytes() for path in root.rglob("*") if path.is_file()}, before)
        self.assertEqual(self.invoke("--reset", "--dry-run").returncode, 0)
        self.assertEqual(self.state.read_bytes(), state_before)

    def test_probe_dry_run_does_not_create_output_or_log_files(self):
        output = self.root / "preview.txt"
        log = self.root / "preview-events.jsonl"
        result = self.invoke("--probe", "--dry-run", "--out", str(output), "--log", str(log))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(output.exists())
        self.assertFalse(Path(str(output) + ".events.jsonl").exists())
        self.assertFalse(log.exists())
        self.assertEqual(self.records(models=True), [])

    def test_resume_can_read_previous_brief_and_always_readds_handoff(self):
        self.assertEqual(self.invoke("--mode", "build", "First brief").returncode, 0)
        first = Path(self.records(models=True)[0]["brief"])
        self.configure(reread=str(first))
        internal = self.cwd / "internal.txt"
        internal.write_text("Continue")
        result = self.invoke("--session", "explicit-session", "--read", str(internal))
        self.assertEqual(result.returncode, 0, result.stderr)
        record = self.records(models=True)[-1]
        self.assertEqual(record["reread_contents"], "First brief")
        self.assertIn(str(Path(str(self.state) + ".handoff")), record["argv"])
        self.assertEqual(len(self.records(models=True)), 2)

    def test_consult_lists_workdir_relative_files_each_turn_and_list_alone_is_not_read(self):
        (self.cwd / "new untracked.txt").write_text("new")
        self.assertEqual(self.invoke("Question").returncode, 0)
        first = self.records(models=True)[-1]
        listing = [json.loads(line) for line in first["listing"].splitlines()]
        self.assertIn("notes.txt", listing)
        self.assertIn("new untracked.txt", listing)
        self.assertEqual(listing[0]["workdir"], str(self.cwd))
        (self.cwd / "later.txt").write_text("later")
        self.assertEqual(self.invoke("Again").returncode, 0)
        self.assertIn('"later.txt"', self.records(models=True)[-1]["listing"])
        self.configure(listing_only=True)
        result = self.invoke("Inspect")
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn("reads=0", result.stderr)

    def test_permission_advice_without_result_keeps_boundary_warning_last(self):
        self.configure(no_result=True, steps=[], exit=1, stderr="Permission denied. Add an allow rule to proceed.")
        result = self.invoke("--mode", "build", "Build")
        self.assertEqual(result.returncode, 1)
        self.assertIn("Permission denied. Add an allow rule to proceed.", result.stderr)
        self.assertIn("Do not add an allow rule", result.stderr.splitlines()[-1])


    def test_contractions_do_not_swallow_backticked_review_paths(self):
        message = "Review the user's code at `" + str(self.cwd / "notes.txt") + "`; don't change it."
        result = self.invoke("--mode", "review", message)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("path is missing", result.stderr)

    def test_build_warns_user_added_reach_on_every_turn(self):
        extra = self.root / "named external folder"
        extra.mkdir()
        self.assertEqual(self.invoke("--mode", "build", "--add-dir", str(extra), "Build").returncode, 0)
        result = self.invoke("Continue")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("build shell can write user-added directory: " + str(extra), result.stderr)
        pointer = self.records(models=True)[-1]["argv"][1]
        self.assertIn("Named added folders: " + str(extra), pointer)
        self.assertIn("cannot stage or commit", pointer)
        result = self.invoke("--no-sandbox", "Continue")
        self.assertNotIn("cannot stage or commit", self.records(models=True)[-1]["argv"][1])
        self.assertIn("user's own rights", result.stderr)


    def test_structured_errors_deduplicate_and_empty_success_advice_stays_last(self):
        message = "invalid model selection: structured-synthetic"
        for result in ({"status":"ERROR","response":"","error":{"message":message,"code":"INVALID_ARGUMENT"}},
                       {"status":"ERROR","response":"","errors":[{"message":message}]}):
            self.configure(result=result, stderr="[agy] Error: " + message + "\nAdditional distinct detail")
            completed = self.invoke("--mode", "build", "Work")
            self.assertEqual(completed.returncode, 1)
            self.assertEqual(completed.stderr.count(message), 1, completed.stderr)
            self.assertIn("Additional distinct detail", completed.stderr)
        self.configure(result={"status":"SUCCESS","response":""}, stderr="Permission denied. Add an allow rule to proceed.")
        completed = self.invoke("--mode", "review", "Review")
        self.assertEqual(completed.returncode, 1)
        self.assertIn("Do not add an allow rule", completed.stderr.splitlines()[-1])

    def test_probe_canary_is_in_state_root_and_temp_write_is_informational(self):
        sentinel = self.root / "unrelated-state-neighbor.txt"
        sentinel.write_text("untouched")
        self.state.write_text("existing state remains untouched")
        for temp_lands in (False, True):
            with self.subTest(temp_lands=temp_lands):
                observed = []
                def fake_execute(command_line, cwd, timeout, sinks, brief):
                    text = Path(brief).read_text()
                    marker = re.search(r"Use write_file to write (\S+) to ", text).group(1)
                    target = Path(re.search(r"Use write_file to write \S+ to (.+)\.", text).group(1))
                    steps = [read(path=str(cwd / "notes.txt")), tool(2, "write_file", "ERROR", {"Path":str(target)}, error="Matches user-configured deny rule")]
                    shell_text = re.search(r"Use run_command for this exact command: (.+)", text).group(1)
                    mode = "review" if "--sandbox" in command_line else "consult"
                    if mode == "consult":
                        steps.append(tool(3, "run_command", "ERROR", {"CommandLine":shell_text}, error="Matches user-configured deny rule"))
                    else:
                        self.review_probe_cwd = cwd
                        shell = Path(shlex.split(shell_text)[-1])
                        shell.write_text(marker)
                        steps.append(command(3, shell_text))
                        outside_text = re.search(r"Use run_command once: (printf .+)", text).group(1)
                        outside = Path(shlex.split(outside_text)[-1])
                        self.assertEqual(outside.parent, self.state.parent)
                        self.assertFalse(agy.within(outside, cwd.parent))
                        dirs = [command_line[i+1] for i, arg in enumerate(command_line) if arg == "--add-dir"]
                        self.assertNotIn(str(outside.parent), dirs)
                        steps.append(tool(4,"run_command",params={"CommandLine":outside_text},output="Command exited with code 1.\nOperation not permitted"))
                        network_text = re.search(r"Use run_command once: (curl .+)", text).group(1)
                        steps.append(tool(5,"run_command",params={"CommandLine":network_text},output="Command exited with code 6.\nThere were sandbox errors.\nCould not resolve host"))
                        temporary_text = re.search(r"Informational temp-write test; use run_command once: (.+)", text).group(1)
                        temporary = Path(shlex.split(temporary_text)[-1])
                        if temp_lands:
                            temporary.write_text(marker)
                        steps.append(command(6, temporary_text, 0 if temp_lands else 1))
                    observed.append((mode, text))
                    return stream(*steps, brief=str(brief))
                output = io.StringIO()
                with mock.patch.dict(os.environ, self.env), mock.patch.object(agy, "find_binary", return_value=str(self.bin)), mock.patch.object(agy,"inspect_binary"), mock.patch.object(agy,"execute", side_effect=fake_execute), mock.patch.object(agy,"judge", wraps=agy.judge) as judge_spy, contextlib.redirect_stderr(output):
                    args = agy.parser().parse_args(["--probe", "--cwd", str(self.cwd)])
                    self.assertEqual(agy.probe(args), 0, output.getvalue())
                review_run = judge_spy.call_args_list[-1][0][0]
                self.assertEqual(review_run.subject_root, str(self.review_probe_cwd))
                self.assertEqual(review_run.subject_paths, [])
                self.assertEqual([mode for mode, _ in observed], ["consult", "review"])
                self.assertIn("informational temp write: " + ("landed" if temp_lands else "did not land"), output.getvalue())
                self.assertEqual(self.state.read_text(), "existing state remains untouched")
                self.assertEqual(sentinel.read_text(), "untouched")
                self.assertEqual(list(self.state.parent.glob(".agy-probe-*.txt")), [])


    def test_relative_symlink_cwd_maps_its_absolute_spelling_without_replacing_dots(self):
        alias = self.root / "relative alias"
        alias.symlink_to(self.cwd, target_is_directory=True)
        relative = os.path.relpath(alias, Path.cwd())
        message = "Read `" + str(alias / "notes.txt") + "`. Keep version 1.2 and ./relative-example unchanged."
        result = self.invoke("--cwd", relative, "--mode", "review", message)
        self.assertEqual(result.returncode, 0, result.stderr)
        record = self.records(models=True)[0]
        self.assertIn(str(Path(record["cwd"]) / "notes.txt"), record["brief_contents"])
        self.assertIn("version 1.2 and ./relative-example unchanged", record["brief_contents"])
        self.assertNotIn(str(alias / "notes.txt"), record["brief_contents"])


    def test_review_subject_metadata_survives_deleted_snapshot_and_exact_attachment_set(self):
        attachment = self.root / "review-subject.md"
        attachment.write_text("synthetic subject")
        output = self.root / "scoped-review.txt"
        completed = self.invoke("--mode","review","--out",str(output),"--attach",str(attachment),"Review `" + str(attachment) + "`.")
        self.assertEqual(completed.returncode,0,completed.stderr)
        events = Path(str(output) + ".events.jsonl")
        metadata = json.loads(Path(str(events) + ".meta.json").read_text())
        self.assertFalse(Path(metadata["subject_root"]).exists())
        self.assertEqual(len(metadata["subject_paths"]),1)
        self.assertIn("attachment-001-",metadata["subject_paths"][0])
        self.assertNotEqual(metadata["subject_paths"][0],metadata["brief_path"])
        replay = self.invoke("--replay",str(events),"--mode","review")
        self.assertEqual(replay.returncode,completed.returncode,replay.stderr)
        self.assertNotIn("subject reads unverified",replay.stderr)
        # Explicit attachment evidence also survives cleanup, without granting
        # the rest of the old handoff directory the same status.
        saved = agy.load_replay(events)
        saved.steps = {1: tool(1,"read_file",params={"Path":metadata["subject_paths"][0]})["step_update"]}
        self.assertEqual(agy.judge(saved,"review")[0],0)
        saved.steps[1]["tool_info"]["parameters"]["Path"] = str(Path(metadata["brief_path"]).parent / "other.txt")
        self.assertEqual(agy.judge(saved,"review")[0],2)
        metadata.pop("subject_root")
        Path(str(events) + ".meta.json").write_text(json.dumps(metadata))
        legacy = self.invoke("--replay", str(events), "--mode", "review")
        self.assertEqual(legacy.returncode, 2, legacy.stderr)
        self.assertIn("subject reads unverified", legacy.stderr)

    def test_review_subject_root_matches_execution_directory_with_symlinked_temp(self):
        actual = self.root / "actual temporary folder"
        actual.mkdir()
        alias = self.root / "temporary alias"
        alias.symlink_to(actual, target_is_directory=True)
        self.env["TMPDIR"] = str(alias)
        output = self.root / "review-through-alias.txt"
        completed = self.invoke("--mode", "review", "--out", str(output), "Review notes.txt")
        self.assertEqual(completed.returncode, 0, completed.stderr)
        metadata = json.loads(Path(str(output) + ".events.jsonl.meta.json").read_text())
        self.assertEqual(metadata["subject_root"], self.records(models=True)[-1]["cwd"])


    def test_quoted_path_validation_runs_before_model_and_accepts_command_span(self):
        missing = self.cwd / "missing filename with spaces.txt"
        completed = self.invoke("--mode","review","Read `" + str(missing) + "`.")
        self.assertEqual(completed.returncode,1,completed.stderr)
        self.assertIn("missing filename with spaces.txt",completed.stderr)
        self.assertEqual(self.records(models=True),[])
        completed = self.invoke("--mode","review","Run `git -C " + str(self.cwd) + " status --short`.")
        self.assertEqual(completed.returncode,0,completed.stderr)
        self.assertEqual(len(self.records(models=True)),1)


    def test_workspace_hooks_refuse_before_any_cli_startup(self):
        folder = self.cwd / ".agents"
        folder.mkdir()
        (folder / "hooks.json").write_text("synthetic invalid JSON; never interpret")
        completed = self.invoke("Question")
        self.assertEqual(completed.returncode,1,completed.stderr)
        self.assertEqual(self.records(),[])
        self.assertIn("--allow-hooks",completed.stderr)

    def test_failed_recorded_answer_has_one_locator_without_stdout(self):
        output = self.root / "withheld.txt"
        log = self.root / "withheld-log.jsonl"
        self.configure(steps=[("read_file","DONE",{"Path":"notes.txt"},"subject"),
                              ("write_file","DONE",{"Path":"changed.txt"},"")])
        cases = [(["--out",str(output)],str(output) + ".events.jsonl"),
                 (["--log",str(log)],str(log)),
                 (["--out",str(output),"--log",str(log)],str(output) + ".events.jsonl"),([],None)]
        for flags,expected in cases:
            with self.subTest(flags=flags):
                completed = self.invoke(*flags,"Question")
                self.assertEqual(completed.returncode,2,completed.stderr)
                self.assertEqual(completed.stdout,"")
                self.assertNotIn("Synthetic successful answer.",completed.stderr)
                lines = [line for line in completed.stderr.splitlines() if "answer withheld" in line]
                self.assertEqual(len(lines),int(expected is not None),completed.stderr)
                if expected:
                    self.assertIn("result event of " + expected,lines[0])
                if "--out" in flags:
                    self.assertEqual(output.read_text(),"")
        self.configure(result={"response":""})
        completed = self.invoke("--out",str(output),"Question")
        self.assertNotIn("answer withheld",completed.stderr)
        self.configure(result={"denied_actions":[{"action":"command"}]},stderr="Permission denied. Add an allow rule to proceed.")
        completed = self.invoke("--out",str(output),"Question")
        self.assertEqual(completed.returncode,1)
        self.assertEqual(completed.stderr.count("answer withheld"),1)
        self.assertIn("Do not add an allow rule",completed.stderr.splitlines()[-1])

    def test_workspace_customizations_block_new_resume_and_dry_run_without_mutation(self):
        self.assertEqual(self.invoke("First question").returncode,0)
        before_calls = self.records()
        before_state = self.state.read_bytes()
        handoff = Path(str(self.state) + ".handoff")
        before_inputs = {str(path.relative_to(handoff)):path.read_bytes() for path in handoff.rglob("*") if path.is_file()}
        config = self.cwd / ".agent" / "mcp_config.json"
        config.parent.mkdir()
        config.write_text("DO_NOT_PRINT_CUSTOMIZATION_CONTENT")
        output = self.root / "existing-answer.txt"
        output.write_text("preserve output")
        for flags in ([],["--new"],["--dry-run"],["--new","--dry-run"],["--mode","build"]):
            with self.subTest(flags=flags):
                completed = self.invoke(*flags,"--out",str(output),"Question")
                self.assertEqual(completed.returncode,1,completed.stderr)
                self.assertEqual(self.records(),before_calls)
                self.assertEqual(self.state.read_bytes(),before_state)
                self.assertEqual(output.read_text(),"preserve output")
                self.assertEqual({str(path.relative_to(handoff)):path.read_bytes() for path in handoff.rglob("*") if path.is_file()},before_inputs)
                self.assertIn(".agent/mcp_config.json",completed.stderr)
                self.assertNotIn("DO_NOT_PRINT_CUSTOMIZATION_CONTENT",completed.stderr)
        # Parent entries are reported relative to the actual nested model cwd.
        nested = self.cwd / "nested"
        nested.mkdir()
        completed = self.invoke("--cwd",str(nested),"Question")
        self.assertEqual(completed.returncode,1)
        self.assertIn("../.agent/mcp_config.json",completed.stderr)
        self.assertEqual(self.records(),before_calls)

    def test_workspace_allow_hooks_is_explicit_each_turn_and_not_cli_or_state(self):
        config = self.cwd / "_agents" / "plugins.json"
        config.parent.mkdir()
        config.write_text("not JSON; inspection must not interpret it")
        completed = self.invoke("--allow-hooks","Question")
        self.assertEqual(completed.returncode,0,completed.stderr)
        lines = [line for line in completed.stderr.splitlines() if "permits workspace customizations" in line]
        self.assertEqual(len(lines),1,completed.stderr)
        self.assertIn("outside the sandbox and deny rules",lines[0])
        self.assertNotIn("--allow-hooks",self.records(models=True)[0]["argv"])
        self.assertNotIn("allow_hooks",json.loads(self.state.read_text()))
        before_calls = self.records()
        completed = self.invoke("Continue")
        self.assertEqual(completed.returncode,1)
        self.assertEqual(self.records(),before_calls)

    def test_review_customizations_follow_selected_snapshot_not_dirty_source(self):
        clean_revision = self.git("rev-parse","HEAD")
        config = self.cwd / ".agents" / "hooks.json"
        config.parent.mkdir()
        config.write_text("synthetic hook registration")
        # The uncommitted source customization is absent from a HEAD snapshot.
        completed = self.invoke("--mode","review","Review")
        self.assertEqual(completed.returncode,0,completed.stderr)
        self.git("add",".agents/hooks.json")
        self.git("-c","user.name=Synthetic","-c","user.email=synthetic@example.invalid","commit","-m","customization presence")
        before_calls = self.records()
        completed = self.invoke("--mode","review","Review")
        self.assertEqual(completed.returncode,1,completed.stderr)
        self.assertEqual(self.records(),before_calls)
        snapshot = Path(re.search(r"review snapshot: (.+); commit ",completed.stderr).group(1))
        self.assertFalse(snapshot.exists())
        completed = self.invoke("--mode","review","--dry-run","Review")
        self.assertEqual(completed.returncode,1)
        self.assertEqual(self.records(),before_calls)
        completed = self.invoke("--mode","review","--rev",clean_revision,"Review")
        self.assertEqual(completed.returncode,0,completed.stderr)
        completed = self.invoke("--mode","review","--allow-hooks","Review")
        self.assertEqual(completed.returncode,0,completed.stderr)
        before_calls = self.records()
        completed = self.invoke("--mode","review","--keep-snapshot","Review")
        self.assertEqual(completed.returncode,1,completed.stderr)
        self.assertEqual(self.records(),before_calls)
        kept = Path(re.search(r"kept review snapshot: (.+)",completed.stderr).group(1))
        self.assertTrue(kept.is_dir())
        shutil.rmtree(kept.parent)

    def test_user_customizations_warn_each_normal_turn_and_check_never_print_contents(self):
        config = self.home / ".gemini" / "config" / "plugins.json"
        config.parent.mkdir(parents=True)
        config.write_text("DO_NOT_PRINT_USER_REGISTRATION")
        for flags in ([],["--new"],["--dry-run"],["--check"]):
            with self.subTest(flags=flags):
                completed = self.invoke(*flags,*([] if "--check" in flags else ["Question"]))
                self.assertEqual(completed.returncode,0,completed.stderr)
                lines = [line for line in completed.stderr.splitlines() if "user command customizations" in line]
                self.assertEqual(len(lines),1,completed.stderr)
                self.assertIn(str(config),lines[0])
                self.assertNotIn("DO_NOT_PRINT_USER_REGISTRATION",completed.stderr)
        before_calls = self.records()
        for flags in (["--status"],["--reset"]):
            self.assertEqual(self.invoke(*flags).returncode,0)
            self.assertEqual(self.records(),before_calls)


    def test_cli_timeout_maps_own_three_to_one(self):
        self.configure(exit=3, result={"status":"ERROR","response":"","finished_reason":"print_timeout"})
        result = self.invoke("--mode", "build", "Wait")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertEqual(result.stdout, "")

    def test_failure_metadata_replay_preserves_timeout_and_mismatch(self):
        output = self.root / "failure.txt"
        self.configure(exit=3, result={"status":"ERROR","response":"","finished_reason":"print_timeout"})
        self.assertEqual(self.invoke("--mode", "build", "--out", str(output), "Wait").returncode, 1)
        replay = self.invoke("--replay", str(output) + ".events.jsonl", "--mode", "build")
        self.assertEqual(replay.returncode, 1, replay.stderr)
        self.assertIn("timed out", replay.stderr)
        self.configure(session="unexpected-session")
        self.assertEqual(self.invoke("--session", "requested-session", "--out", str(output), "Continue").returncode, 1)
        replay = self.invoke("--replay", str(output) + ".events.jsonl", "--mode", "build")
        self.assertEqual(replay.returncode, 1)
        self.assertIn("mismatch", replay.stderr)


    def test_missing_binary_status_and_reset_without_model(self):
        self.env["AGY_BIN"] = str(self.root / "missing")
        self.assertEqual(self.invoke("--status").returncode, 0)
        self.assertEqual(self.invoke("--reset").returncode, 0)
        self.assertEqual(self.invoke("--check").returncode, 1)

    def test_auth_does_not_print_secret_value(self):
        settings = self.home / ".gemini" / "antigravity-cli" / "settings.json"
        settings.parent.mkdir(parents=True)
        settings.write_text('{"modelProvider":"gemini","unrelated":"ignored"}')
        self.env["GEMINI_API_KEY"] = "synthetic-secret-never-print"
        result = self.invoke("--check")
        self.assertIn("AI Studio key", result.stderr)
        self.assertNotIn("synthetic-secret-never-print", result.stderr + result.stdout)
        result = self.invoke("Question")
        self.assertNotIn("Google does not support", result.stderr)

    def test_streams_flush_before_process_completes(self):
        child = self.root / "slow-child.py"
        child.write_text("import json,time\nprint(json.dumps({'event':'init','init':{}}),flush=True)\ntime.sleep(0.4)\n")
        observed = []
        class Sink:
            def write(self, line):
                observed.append(time.monotonic())
            def flush(self):
                pass
        start = time.monotonic()
        run = agy.execute([sys.executable, str(child)], self.cwd, 2, [Sink()], None)
        elapsed = time.monotonic() - start
        self.assertLess(observed[0] - start, elapsed - 0.2)
        self.assertEqual(agy.judge(run, "build")[0], 1)

    def test_wrapper_kills_timeout_without_waiting_for_full_child(self):
        child = self.root / "sleep-child.py"
        child.write_text("import time\ntime.sleep(30)\n")
        with mock.patch.object(agy, "TIMEOUT_GRACE", 0):
            start = time.monotonic()
            run = agy.execute([sys.executable, str(child)], self.cwd, 0.05, [], None)
        self.assertLess(time.monotonic() - start, 5)
        self.assertTrue(run.timed_out)
        self.assertEqual(agy.judge(run, "build")[0], 1)


class CustomizationTests(unittest.TestCase):
    def test_each_root_and_entry_is_detected_without_reading_json(self):
        for root_name in (".agents",".agent","_agents","_agent"):
            for entry_name in ("hooks.json","mcp_config.json","plugins.json","plugins"):
                with self.subTest(root=root_name,entry=entry_name), tempfile.TemporaryDirectory() as tmp:
                    start = Path(tmp).resolve()
                    root = start / root_name
                    root.mkdir()
                    entry = root / entry_name
                    if entry_name == "plugins":
                        entry.mkdir()
                        (entry / "anything").touch()
                    else:
                        entry.write_text("invalid JSON; never read")
                    with mock.patch.object(Path,"read_text",side_effect=AssertionError("content read")), mock.patch.object(Path,"read_bytes",side_effect=AssertionError("content read")):
                        self.assertEqual(agy.command_customizations(start,start),[entry])

    def test_empty_entries_and_above_root_are_ignored_and_nonrepo_is_start_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            parent = Path(tmp).resolve()
            repo = parent / "repo"
            nested = repo / "nested"
            nested.mkdir(parents=True)
            roots = [(parent / ".agents"),(repo / ".agent"),(nested / "_agents")]
            for root in roots:
                root.mkdir()
                (root / "hooks.json").write_text("present")
            empty = nested / "_agent"
            empty.mkdir()
            for name in ("hooks.json","mcp_config.json","plugins.json"):
                (empty / name).touch()
            (empty / "plugins").mkdir()
            self.assertEqual(agy.command_customizations(nested,repo),sorted([roots[1]/"hooks.json",roots[2]/"hooks.json"],key=str))
            self.assertEqual(agy.command_customizations(nested),[roots[2]/"hooks.json"])
            with self.assertRaises(agy.Failure):
                agy.command_customizations(repo,nested)

    def test_broken_links_and_unclear_metadata_or_directory_access_are_found(self):
        with tempfile.TemporaryDirectory() as tmp:
            start = Path(tmp).resolve()
            outside = start / "target"
            outside.mkdir()
            linked_root = start / ".agents"
            linked_root.symlink_to(outside,target_is_directory=True)
            root = start / ".agent"
            root.mkdir()
            linked_file = root / "hooks.json"
            linked_file.symlink_to(outside / "missing-target")
            plugins = root / "plugins"
            plugins.mkdir()
            original_lstat = Path.lstat
            original_iterdir = Path.iterdir
            unclear_file = root / "mcp_config.json"
            unclear_root = start / "_agent"
            def check_stat(path,*args,**kwargs):
                if path in (unclear_file,unclear_root):
                    raise PermissionError("unclear stat")
                return original_lstat(path,*args,**kwargs)
            def check_iterdir(path):
                if path == plugins:
                    raise PermissionError("unclear directory")
                if path in (linked_root,outside):
                    raise AssertionError("followed configuration symlink")
                return original_iterdir(path)
            with mock.patch.object(Path,"lstat",check_stat), mock.patch.object(Path,"iterdir",check_iterdir):
                expected = [linked_file,plugins,unclear_file,unclear_root]
                self.assertEqual(agy.command_customizations(start,start),sorted(expected,key=str))

    def test_readable_empty_links_skip_and_nonempty_links_are_presence_signals(self):
        with tempfile.TemporaryDirectory() as tmp:
            start = Path(tmp).resolve()
            target_root = start / "linked-root-target"
            target_root.mkdir()
            linked_root = start / ".agents"
            linked_root.symlink_to(target_root,target_is_directory=True)
            root = start / ".agent"
            root.mkdir()
            file_target = start / "empty-file-target"
            file_target.touch()
            linked_file = root / "hooks.json"
            linked_file.symlink_to(file_target)
            plugins_target = start / "empty-plugins-target"
            plugins_target.mkdir()
            linked_plugins = root / "plugins"
            linked_plugins.symlink_to(plugins_target,target_is_directory=True)
            with mock.patch.object(Path,"read_text",side_effect=AssertionError("read configuration contents")), mock.patch.object(Path,"read_bytes",side_effect=AssertionError("read configuration contents")):
                self.assertEqual(agy.command_customizations(start,start),[])
                with file_target.open("wb") as target_stream:
                    target_stream.write(b"metadata presence")
                (plugins_target / "entry").touch()
                with (target_root / "mcp_config.json").open("w") as target_stream:
                    target_stream.write("invalid JSON")
                expected = [linked_file,linked_plugins,linked_root / "mcp_config.json"]
                self.assertEqual(agy.command_customizations(start,start),sorted(expected,key=str))
            broken = start / "_agents"
            broken.symlink_to(start / "missing-root",target_is_directory=True)
            self.assertIn(broken,agy.command_customizations(start,start))

    def test_user_root_links_are_metadata_only_and_access_errors_are_signals(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp).resolve()
            gemini = home / ".gemini"
            gemini.mkdir()
            root = gemini / "config"
            target = home / "target"
            target.mkdir()
            root.symlink_to(target,target_is_directory=True)
            with mock.patch.object(Path,"home",return_value=home), mock.patch.object(Path,"iterdir",side_effect=AssertionError("followed user config")):
                self.assertEqual(agy.user_command_customizations(),[])
            (target / "hooks.json").write_text("nonempty synthetic metadata")
            with mock.patch.object(Path,"home",return_value=home):
                self.assertEqual(agy.user_command_customizations(),[root / "hooks.json"])
            root.unlink()
            original_lstat = Path.lstat
            def unclear(path,*args,**kwargs):
                if path == root:
                    raise PermissionError("user config inaccessible")
                return original_lstat(path,*args,**kwargs)
            with mock.patch.object(Path,"home",return_value=home), mock.patch.object(Path,"lstat",unclear):
                self.assertEqual(agy.user_command_customizations(),[root])


class ReviewSubjectTests(unittest.TestCase):
    ROOT = "/synthetic/snapshot"
    BRIEF = "/synthetic/handoff/turn-x/brief.txt"
    ATTACHMENT = "/synthetic/handoff/turn-x/attachment-001-subject.md"

    def review(self, *steps, brief=None, attachments=()):
        return stream(*steps, brief=brief or self.BRIEF, subject_root=self.ROOT, subject_paths=attachments)

    def code(self, run):
        return agy.judge(run, "review")[0]

    def test_relative_brief_shell_read_is_not_review_subject_evidence(self):
        run = self.review(command(1, "cat ../handoff/turn-x/brief.txt"))
        self.assertEqual(self.code(run), 2)
        # The historical diagnostics count is deliberately unchanged.
        self.assertEqual(agy.judge(run, "review")[3]["reads"], 1)

    def test_file_tool_placement_uses_snapshot_or_exact_current_attachment(self):
        cases = [(self.ROOT + "/README.md", 0), ("README.md", 0), (self.ATTACHMENT, 0),
                 ("../handoff/turn-x/brief.txt", 2), (self.ROOT + "/../handoff/turn-x/brief.txt", 2),
                 ("/synthetic/home/.gemini/rules.txt", 2), ("/etc/hosts", 2),
                 ("/synthetic/handoff/turn-x/other.txt", 2), (self.ROOT + "-other/README.md", 2),
                 (self.ATTACHMENT + "-other", 2)]
        for path, expected in cases:
            with self.subTest(path=path):
                self.assertEqual(self.code(self.review(read(path=path), attachments=[self.ATTACHMENT])), expected)
        run = self.review(read(path=self.ROOT + "/brief.txt"), brief=self.ROOT + "/brief.txt",
                          attachments=[self.ROOT + "/brief.txt"])
        self.assertEqual(self.code(run), 2)

    def test_shell_output_cannot_replace_file_tool_review_reads(self):
        explanation = "review read nothing in the snapshot or its attachments; only file-tool reads there count"
        commands = ["git diff A..B", "git -C " + self.ROOT + " log -1", "git --no-pager show HEAD",
                    "git diff /etc/hosts /etc/hosts", "cat README.md"]
        for text in commands:
            with self.subTest(command=text):
                run = self.review(read(1,self.BRIEF),command(2,text))
                verdict = agy.judge(run,"review")
                self.assertEqual(verdict[0],2)
                self.assertIn(explanation,verdict[1])

    def test_git_output_with_snapshot_file_tool_read_can_pass_review(self):
        run = self.review(command(1,"git show HEAD"),read(2,self.ROOT + "/README.md"))
        verdict = agy.judge(run,"review")
        self.assertEqual(verdict[0],0)
        self.assertEqual(verdict[3]["reads"],2)

    def test_tool_completion_and_shell_failure_checks_still_apply(self):
        for state in ("ACTIVE", "ERROR"):
            self.assertEqual(self.code(self.review(tool(1,"read_file",state,{"Path":"README.md"}))), 2)
        run = self.review(tool(1,"read_file",params={"Path":"README.md"},error="internal read failure"))
        self.assertEqual(self.code(run), 2)
        self.assertEqual(self.code(self.review(command(1,"git log",128))), 2)
        run = self.review(command(1,"git show HEAD"))
        self.assertEqual(agy.judge(run,"review")[3]["reads"],1)
        run.tools()[0]["tool_info"]["output"] += "\nPermission denied"
        self.assertEqual(self.code(run), 2)
        self.assertEqual(agy.judge(run,"review")[3]["reads"],0)

    def test_review_without_subject_root_reports_unverified_reads(self):
        run = stream(command(1,"cat legacy-subject.txt"), subject_root=None)
        verdict = agy.judge(run,"review")
        self.assertEqual(verdict[0], 2)
        self.assertIn("subject reads unverified", " ".join(verdict[2]))
        run.replay = False
        verdict = agy.judge(run,"review")
        self.assertEqual(verdict[0], 2)
        self.assertIn("subject reads unverified", " ".join(verdict[2]))

    def test_placement_is_lexical_even_after_snapshot_is_gone(self):
        run = self.review(read(path="README.md"), read(2,self.ATTACHMENT), attachments=[self.ATTACHMENT])
        with mock.patch.object(Path,"resolve",side_effect=AssertionError("filesystem resolution")), \
             mock.patch.object(Path,"exists",side_effect=AssertionError("filesystem existence")), \
             mock.patch.object(os,"stat",side_effect=AssertionError("filesystem stat")):
            self.assertEqual(self.code(run), 0)


class PathTests(unittest.TestCase):
    def test_quoted_git_command_can_name_existing_snapshot_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            clone = Path(tmp) / "snapshot"
            clone.mkdir()
            agy.validate_snapshot_paths("Run `git -C " + str(clone) + " status --short`.", clone)


    def test_quoted_path_candidates_accept_commands_spaces_and_line_references(self):
        with tempfile.TemporaryDirectory() as tmp:
            clone = Path(tmp) / "snapshot with spaces"
            clone.mkdir()
            for name in ("notes.txt","a.txt","b.txt","filename with spaces.txt"):
                (clone / name).write_text("subject")
            messages = ["Run `git -C " + str(clone) + " status --short`.",
                        "Read `" + str(clone / "filename with spaces.txt") + "`.",
                        "Run `diff " + str(clone / "a.txt") + " " + str(clone / "b.txt") + "`.",
                        "Read `" + str(clone / "notes.txt") + ":12`.",
                        "Read `" + str(clone / "notes.txt") + ":12:4`.",
                        "Read " + str(clone / "notes.txt") + ".",
                        "Review the user's code at `" + str(clone / "notes.txt") + "`; don't edit."]
            for message in messages:
                with self.subTest(message=message):
                    agy.validate_snapshot_paths(message,clone)

    def test_missing_quoted_paths_name_whole_filename_or_command_word(self):
        with tempfile.TemporaryDirectory() as tmp:
            clone = Path(tmp) / "snapshot"
            clone.mkdir()
            for message,expected in [("Read `" + str(clone / "missing filename with spaces.txt") + "`.",str(clone / "missing filename with spaces.txt")),
                                     ("Run `cat " + str(clone / "missing.txt") + " | head`.",str(clone / "missing.txt"))]:
                with self.subTest(message=message):
                    with self.assertRaises(agy.Failure) as raised:
                        agy.validate_snapshot_paths(message,clone)
                    self.assertIn(expected,str(raised.exception))
                    self.assertNotIn("| head",str(raised.exception))


    def test_attachment_hash_line_anchor_maps_to_its_copy(self):
        source = "/synthetic/repository/subject.md"
        copy = "/synthetic/handoff/attachment-001-subject.md"
        changed,count = agy.rewrite_paths("Read `" + source + "#L12`.",[(source,copy)])
        self.assertEqual(changed,"Read `" + copy + "#L12`.")
        self.assertEqual(count,1)


    def test_hash_line_anchors_validate_and_rewrite_repo_and_attachment_paths(self):
        with tempfile.TemporaryDirectory() as tmp:
            parent = Path(tmp)
            source = parent / "source"
            clone = parent / "snapshot"
            clone.mkdir()
            base = clone / "notes.txt"
            base.write_text("subject")
            original_attachment = source / "subject.md"
            copied_attachment = parent / "handoff" / "attachment-001-subject.md"
            for anchor in ("#L12","#L12-L24","#L12-24"):
                with self.subTest(anchor=anchor):
                    text = "Read `" + str(source / "notes.txt") + anchor + "` and `" + str(original_attachment) + anchor + "`."
                    changed,count = agy.rewrite_paths(text,[(str(original_attachment),str(copied_attachment)),(str(source),str(clone))])
                    self.assertEqual(count,2)
                    self.assertIn(str(base) + anchor,changed)
                    self.assertIn(str(copied_attachment) + anchor,changed)
                    agy.validate_snapshot_paths(changed,clone)
                    with self.assertRaises(agy.Failure) as raised:
                        agy.validate_snapshot_paths("Read `" + str(clone / "missing.txt") + anchor + "`.",clone)
                    self.assertNotIn(anchor,str(raised.exception))
            for suffix in ("#section","#L12-other","#L12more","#l12","#L12/nested","#L12:literal","#L12.txt"):
                text = str(original_attachment) + suffix
                self.assertEqual(agy.rewrite_paths(text,[(str(original_attachment),str(copied_attachment))]),(text,0))
            literal = clone / "notes.txt#section"
            literal.write_text("literal hash filename")
            agy.validate_snapshot_paths("Read `" + str(literal) + "`.",clone)


    def test_boundary_replacement_uses_callable_and_does_not_replace_prose_dot(self):
        text = r'Read /synthetic/repo/file.txt, /synthetic/repo-other/file.txt and C:\neutral\repo-other. See file:///synthetic/repo/file.txt. Version 1.2.'
        changed, count = agy.rewrite_paths(text, [("/synthetic/repo", r"D:\snapshot\repo")])
        self.assertEqual(count, 2)
        self.assertIn(r'D:\snapshot\repo/file.txt', changed)
        self.assertIn('/synthetic/repo-other/file.txt', changed)
        self.assertIn(r'C:\neutral\repo-other', changed)
        self.assertIn('Version 1.2.', changed)
        changed, count = agy.rewrite_paths('Read /synthetic/subject.md.', [("/synthetic/subject.md", "/handoff/subject.md")])
        self.assertEqual(changed, 'Read /handoff/subject.md.')
        self.assertEqual(count, 1)


class ProbeTests(unittest.TestCase):
    def test_no_attempts_and_arbitrary_error_are_not_held(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            evidence = agy.probe_evidence(stream(read()), "consult", root, root / "outside", "marker")
            self.assertEqual(evidence["file-tool write deny"], "not attempted")
            run = stream(read(path=str(root / "notes.txt")), tool(2, "write_file", "ERROR", {"Path": str(root / "file-tool-canary.txt")}, error="an arbitrary internal failure"))
            evidence = agy.probe_evidence(run, "consult", root, root / "outside", "marker")
            self.assertEqual(evidence["file-tool write deny"], "NOT HELD")

    def test_all_attempts_and_disk_must_hold(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "file-tool-canary.txt"
            shell = root / "shell-canary.txt"
            refused = "Permission denied. Matches user-configured deny rule."
            run = stream(read(path=str(root / "notes.txt")),
                         tool(2, "write_file", "ERROR", {"Path": str(target)}, error=refused),
                         tool(3, "run_command", "ERROR", {"CommandLine": "printf marker > " + str(shell)}, error=refused))
            self.assertEqual(set(agy.probe_evidence(run, "consult", root, root / "outside", "marker").values()), {"held"})
            target.write_text("violation")
            self.assertEqual(agy.probe_evidence(run, "consult", root, root / "outside", "marker")["file-tool write deny"], "NOT HELD")
            target.unlink()
            run.feed(json.dumps(tool(4, "write_file", "DONE", {"Path": str(target)})))
            self.assertEqual(agy.probe_evidence(run, "consult", root, root / "outside", "marker")["file-tool write deny"], "NOT HELD")

    def test_sandbox_requires_matching_nonzero_refusal_and_inside_disk(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            outside = root / "outside"
            target = root / "shell-canary.txt"
            target.write_text("marker")
            run = stream(read(path=str(root / "notes.txt")),
                         tool(2, "write_file", "ERROR", {"Path": str(root / "file-tool-canary.txt")}, error="Matches user-configured deny rule"),
                         command(3, "printf marker > " + str(target)),
                         tool(4, "run_command", params={"CommandLine":"printf marker > " + str(outside)}, output="Command exited with code 1.\nOperation not permitted"),
                         tool(5, "run_command", params={"CommandLine":"curl https://example.com"}, output="Command exited with code 6.\nThere were sandbox errors.\nCould not resolve host"))
            self.assertEqual(set(agy.probe_evidence(run, "review", root, outside, "marker").values()), {"held"})
            run.tools()[-1]["tool_info"]["output"] = "Command exited with code 28.\nTimed out"
            self.assertEqual(agy.probe_evidence(run, "review", root, outside, "marker")["network deny"], "NOT HELD")


if __name__ == "__main__":
    unittest.main()
