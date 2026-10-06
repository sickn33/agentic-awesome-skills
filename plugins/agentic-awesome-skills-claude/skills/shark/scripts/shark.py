#!/usr/bin/env python3
"""Bookkeeping for the shark skill: pitch your idea to a Shark Tank-style panel of Claude sharks who want to say no.

The skill's orchestrator (Claude) drives the session with these commands. Every sub-agent reads a
brief this script writes and writes one output file; this script checks the files, counts the deals
and renders the board. All state lives in .shark/<run>/ in the current directory.

    python3 shark.py plan [--investors N]
    python3 shark.py init --pitch-file PATH [--investors N] [--seed S]
    python3 shark.py next
    python3 shark.py prompts <phase>
    python3 shark.py check <phase>
    python3 shark.py tally
    python3 shark.py render

Phases, in order: grill, answers, decide.
"""
import argparse
import json
import os
import random
import re
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = ".shark"
LATEST = os.path.join(ROOT, "LATEST")
PHASES = ["grill", "answers", "decide"]
DEFAULT_INVESTORS = 5
WAVE = 5
CREDIT = ("_Made with [/shark](https://github.com/alexyc9381/shark-skill), a free Claude Code skill by Alex Chen ([@nocodealex](https://instagram.com/nocodealex))._")


def load_investors():
    with open(os.path.join(HERE, "..", "references", "investors.json")) as f:
        return json.load(f)


def run_dir():
    if not os.path.exists(LATEST):
        sys.exit("shark: no session yet. Run: shark.py init --pitch-file .shark/pitch.md")
    with open(LATEST) as f:
        return f.read().strip()


def load_state(rd=None):
    rd = rd or run_dir()
    with open(os.path.join(rd, "state.json")) as f:
        return json.load(f)


def save_state(state):
    with open(os.path.join(state["dir"], "state.json"), "w") as f:
        json.dump(state, f, indent=2)


def panel_size(args):
    n = getattr(args, "investors", None) or DEFAULT_INVESTORS
    if n < 2 or n > len(load_investors()):
        sys.exit("shark: the panel must be 2 to %d investors" % len(load_investors()))
    return n


def jobs(state, phase):
    d = state["dir"]
    if phase in ("grill", "decide"):
        ids = ["investor-%d" % (i + 1) for i in range(len(state["panel"]))]
    elif phase == "answers":
        ids = ["founder"]
    else:
        sys.exit("shark: unknown phase %r (phases: %s)" % (phase, ", ".join(PHASES)))
    return [{"id": jid,
             "brief": os.path.abspath(os.path.join(d, "briefs", "%s-%s.md" % (phase, jid))),
             "output": os.path.abspath(os.path.join(d, phase, "%s.md" % jid))} for jid in ids]


def done(job):
    p = job["output"]
    return os.path.exists(p) and os.path.getsize(p) > 0


def missing(state, phase):
    return [j for j in jobs(state, phase) if not done(j)]


def _abs(state, *parts):
    return os.path.abspath(os.path.join(state["dir"], *parts))


def brief_text(state, phase, job):
    pitch = _abs(state, "pitch.md")
    head = ("You are one part of a practice investor panel run by the shark skill. You cannot see the "
            "user's conversation: everything you know is in the files named below. Never invent facts, "
            "numbers or traction the pitch does not give. Write your answer to exactly this file and "
            "nothing else:\n\n    %s\n\nThe pitch: %s\n\n" % (job["output"], pitch))
    if phase in ("grill", "decide"):
        idx = int(job["id"].split("-")[1]) - 1
        inv = state["panel"][idx]
        who = ("You are %s, shark %d of %d on a Shark Tank-style panel. %s Your signature line is \"%s\": use it "
               "once, where it fits naturally.\n\nYou have heard a thousand pitches and you want to say no. You only "
               "say yes when the founder's answers remove your biggest worry. Being nice is not your job; being right "
               "with your money is. Talk like a sharp, blunt investor on TV, never like a polite assistant.\n\n"
               % (inv["name"], idx + 1, len(state["panel"]), inv["lens"], inv.get("signature", "")))
        if phase == "grill":
            return head + who + (
                "Read the pitch. Then write:\n\n"
                "BIGGEST WORRY: one sentence\n"
                "QUESTIONS:\n1. ...\n2. ...\n3. ...\n\n"
                "Three questions, the hardest ones you would really ask, each about something specific in "
                "the pitch or something it leaves out. 120 words at most.\n")
        return head + who + (
            "Read the pitch, your own questions in %s, and the founder's answers in %s.\n\n"
            "Decide. Write exactly these lines and nothing else:\n\n"
            "DECISION: IN or OUT\n"
            "OFFER: if IN, an amount for a share of the company, for example \"$50,000 for 10%%\"; if OUT, "
            "write none\n"
            "REASON: one sentence, in your own voice. If you are OUT, end it with the words: For that reason, "
            "I'm out.\n"
            "WHAT WOULD CHANGE MY MIND: one specific thing the founder could show you\n"
            % (job["output"].replace("/decide/", "/grill/"), _abs(state, "answers", "founder.md")))
    if phase == "answers":
        qs = "\n".join("    " + j["output"] for j in jobs(state, "grill"))
        return head + (
            "You are the FOUNDER, speaking for the user. Read the pitch, then every investor's questions:\n\n"
            "%s\n\n"
            "Answer every question, grouped by investor, in the order asked. Answer only from what the "
            "pitch says. When the pitch does not contain the answer, write \"NOT ANSWERED: the founder needs "
            "to find out ...\" and say exactly what to find out. Never make up numbers, customers or "
            "plans. 450 words at most.\n" % qs)
    raise ValueError(phase)


DECISION_RE = re.compile(r"^\s*\**DECISION\**\s*:\s*\**\s*(IN|OUT)\b", re.I | re.M)
FIELD_RE = r"^\s*\**%s\**\s*:\s*(.+)$"


def parse_decision(text):
    m = DECISION_RE.search(text or "")
    if not m:
        return None
    out = {"decision": m.group(1).upper()}
    for key, name in (("offer", "OFFER"), ("reason", "REASON"), ("change", "WHAT WOULD CHANGE MY MIND")):
        f = re.search(FIELD_RE % name, text, re.I | re.M)
        out[key] = f.group(1).strip().strip("*").strip() if f else ""
    if out["decision"] == "OUT":
        out["offer"] = "none"
    return out


def count_not_answered(state):
    a = jobs(state, "answers")[0]
    if not done(a):
        return []
    lines = open(a["output"]).read().splitlines()
    return [l.split("NOT ANSWERED:", 1)[1].strip() for l in lines if "NOT ANSWERED:" in l]


def tally(state):
    rows = []
    for j, inv in zip(jobs(state, "decide"), state["panel"]):
        d = parse_decision(open(j["output"]).read()) if done(j) else None
        rows.append({"investor": inv["name"], "decision": d["decision"] if d else "NO DECISION",
                     "offer": d["offer"] if d else "", "reason": d["reason"] if d else "",
                     "change": d["change"] if d else ""})
    ins = sum(1 for r in rows if r["decision"] == "IN")
    result = {"in": ins, "out": sum(1 for r in rows if r["decision"] == "OUT"), "panel": len(rows),
              "investors": rows, "homework": count_not_answered(state)}
    with open(os.path.join(state["dir"], "tally.json"), "w") as f:
        json.dump(result, f, indent=2)
    return result


def headline(t):
    if t["in"] == 0:
        return "No deal: all %d sharks are out" % t["panel"]
    return "%d of %d sharks are in" % (t["in"], t["panel"])


def render(state):
    t = tally(state)
    pitch = open(os.path.join(state["dir"], "pitch.md")).read().strip()
    first = pitch.splitlines()[0].lstrip("# ").strip() if pitch else "(empty pitch)"
    lines = ["# %s" % headline(t), "", "**The pitch:** %s" % first, "",
             "## The sharks", "", "| Shark | Decision | Offer | Why |", "|---|---|---|---|"]
    for r in t["investors"]:
        lines.append("| %s | %s | %s | %s |" % (r["investor"], r["decision"], r["offer"].replace("|", "/"),
                                                r["reason"].replace("|", "/")))
    lines += ["", "## What would change their minds", ""]
    for r in t["investors"]:
        if r["change"]:
            lines.append("- **%s:** %s" % (r["investor"], r["change"]))
    if t["homework"]:
        lines += ["", "## Your homework: questions you could not answer", ""]
        lines += ["- %s" % (h[:1].upper() + h[1:]) for h in t["homework"]]
    lines += ["", "_The full session is in %s: every investor's questions, the answers and their decisions. "
              "The investors are language models and the offers are practice, not real money._"
              % os.path.abspath(state["dir"]), "", CREDIT]
    text = "\n".join(lines) + "\n"
    with open(os.path.join(state["dir"], "BOARD.md"), "w") as f:
        f.write(text)
    return text


def cmd_plan(args):
    n = panel_size(args)
    print("panel of %d: %d sets of questions, 1 founder answering, %d decisions = %d sub-agent calls"
          % (n, n, n, 2 * n + 1))


def cmd_init(args):
    n = panel_size(args)
    if not os.path.exists(args.pitch_file):
        sys.exit("shark: pitch file not found: %s" % args.pitch_file)
    pitch = open(args.pitch_file).read().strip()
    if not pitch:
        sys.exit("shark: the pitch file is empty")
    seed = args.seed if args.seed is not None else random.randrange(1, 10 ** 6)
    investors = load_investors()
    panel = investors[:n] if args.seed is None and n == DEFAULT_INVESTORS else \
        random.Random(seed).sample(investors, n)
    rd = os.path.join(ROOT, time.strftime("%Y%m%d-%H%M%S"))
    for sub in ("briefs", "grill", "answers", "decide"):
        os.makedirs(os.path.join(rd, sub), exist_ok=True)
    with open(os.path.join(rd, "pitch.md"), "w") as f:
        f.write(pitch + "\n")
    state = {"dir": rd, "seed": seed, "panel": panel, "created": time.strftime("%Y-%m-%dT%H:%M:%S")}
    save_state(state)
    with open(LATEST, "w") as f:
        f.write(rd)
    print("shark: session opened in %s (%d investors, seed %d)" % (rd, n, seed))
    print("next: python3 scripts/shark.py prompts grill")


def cmd_prompts(args):
    state = load_state()
    todo = missing(state, args.phase)
    for j in jobs(state, args.phase):
        with open(j["brief"], "w") as f:
            f.write(brief_text(state, args.phase, j))
    if not todo:
        print("shark: %s is complete. Run: shark.py next" % args.phase)
        return
    for w in range(0, len(todo), WAVE):
        print("wave %d:" % (w // WAVE + 1))
        for j in todo[w:w + WAVE]:
            print("  %s  brief=%s" % (j["id"], j["brief"]))
    print("Launch one Agent call per job, one wave at a time. Prompt: "
          "\"Read <brief> and follow it exactly. It is your whole brief.\"")


def cmd_check(args):
    state = load_state()
    todo = missing(state, args.phase)
    if not todo:
        print("shark: %s complete" % args.phase)
    for j in todo:
        print("missing: %s -> %s" % (j["id"], j["output"]))


def cmd_next(args):
    state = load_state()
    for phase in PHASES:
        if missing(state, phase):
            print("next phase: %s. Run: python3 shark.py prompts %s" % (phase, phase))
            return
    print("shark: the panel has decided. Run: python3 shark.py render")


def cmd_tally(args):
    print(headline(tally(load_state())))


def cmd_render(args):
    sys.stdout.write(render(load_state()))


def main(argv=None):
    p = argparse.ArgumentParser(prog="shark.py")
    sub = p.add_subparsers(dest="cmd")
    pl = sub.add_parser("plan")
    pl.add_argument("--investors", type=int)
    pi = sub.add_parser("init")
    pi.add_argument("--pitch-file", required=True)
    pi.add_argument("--investors", type=int)
    pi.add_argument("--seed", type=int)
    for name in ("prompts", "check"):
        sp = sub.add_parser(name)
        sp.add_argument("phase", choices=PHASES)
    for name in ("next", "tally", "render"):
        sub.add_parser(name)
    args = p.parse_args(argv)
    if not args.cmd:
        p.print_help()
        return 1
    {"plan": cmd_plan, "init": cmd_init, "prompts": cmd_prompts, "check": cmd_check,
     "next": cmd_next, "tally": cmd_tally, "render": cmd_render}[args.cmd](args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
