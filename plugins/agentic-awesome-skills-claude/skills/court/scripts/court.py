#!/usr/bin/env python3
"""Bookkeeping for the court skill: put an idea on trial in front of a jury of Claudes.

The skill's orchestrator (Claude) drives the trial with these commands. Every sub-agent reads a
brief this script writes and writes one output file; this script checks the files, counts the votes
and renders the verdict. All state lives in .court/<run>/ in the current directory.

    python3 court.py plan [--jury N | --quick]
    python3 court.py init --case-file PATH [--jury N | --quick] [--seed S]
    python3 court.py next
    python3 court.py prompts <phase>
    python3 court.py check <phase>
    python3 court.py tally
    python3 court.py render

Phases, in order: opening, rebuttal, jury, judge.
"""
import argparse
import json
import os
import random
import re
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = ".court"
LATEST = os.path.join(ROOT, "LATEST")
PHASES = ["opening", "rebuttal", "jury", "judge"]
DEFAULT_JURY = 12
QUICK_JURY = 6
WAVE = 6
CREDIT = ("_Made with [/court](https://github.com/alexyc9381/court-skill), a free Claude Code skill by Alex Chen ([@nocodealex](https://instagram.com/nocodealex))._")
CHARGE = "The case fails as stated: it should not go ahead the way it is described."


# ---------- state ----------

def load_jurors():
    with open(os.path.join(HERE, "..", "references", "jurors.json")) as f:
        return json.load(f)


def run_dir():
    if not os.path.exists(LATEST):
        sys.exit("court: no trial yet. Run: court.py init --case-file .court/case.md")
    with open(LATEST) as f:
        return f.read().strip()


def load_state(rd=None):
    rd = rd or run_dir()
    with open(os.path.join(rd, "state.json")) as f:
        return json.load(f)


def save_state(state):
    with open(os.path.join(state["dir"], "state.json"), "w") as f:
        json.dump(state, f, indent=2)


def jury_size(args):
    if getattr(args, "quick", False):
        return QUICK_JURY
    n = getattr(args, "jury", None) or DEFAULT_JURY
    if n < 3 or n > 12:
        sys.exit("court: the jury must be 3 to 12 Claudes")
    return n


# ---------- jobs ----------

def jobs(state, phase):
    """Each job: id, brief path, output path."""
    d = state["dir"]
    if phase in ("opening", "rebuttal"):
        ids = ["prosecution", "defense"]
    elif phase == "jury":
        ids = ["juror-%02d" % (i + 1) for i in range(len(state["jury"]))]
    elif phase == "judge":
        ids = ["judge"]
    else:
        sys.exit("court: unknown phase %r (phases: %s)" % (phase, ", ".join(PHASES)))
    out = []
    for jid in ids:
        out.append({
            "id": jid,
            "brief": os.path.abspath(os.path.join(d, "briefs", "%s-%s.md" % (phase, jid))),
            "output": os.path.abspath(os.path.join(d, phase, "%s.md" % jid)),
        })
    return out


def done(job):
    p = job["output"]
    return os.path.exists(p) and os.path.getsize(p) > 0


def missing(state, phase):
    return [j for j in jobs(state, phase) if not done(j)]


# ---------- briefs ----------

def _abs(state, *parts):
    return os.path.abspath(os.path.join(state["dir"], *parts))


def brief_text(state, phase, job):
    case = _abs(state, "case.md")
    head = ("You are one part of a trial run by the court skill. You cannot see the user's conversation: "
            "everything you know is in the files named below. Use only what is in the record. Never invent "
            "facts, numbers, quotes or sources. Where the record is silent, say what is missing and why it "
            "matters. Write your answer to exactly this file and nothing else:\n\n    %s\n\n"
            "The charge: %s\n\nThe case file: %s\n\n" % (job["output"], CHARGE, case))
    if phase == "opening":
        if job["id"] == "prosecution":
            return head + (
                "You are the PROSECUTOR. Build the strongest honest case that the charge holds.\n\n"
                "- 3 to 5 numbered charges. Each names one concrete way the case fails, the evidence for it from "
                "the case file (quote it), and what it would cost if you are right.\n"
                "- Attack the case as the user actually wrote it, never a weaker version of it.\n"
                "- No insults, no hedging, no praise. 350 words at most.\n")
        return head + (
            "You are the DEFENSE. Build the strongest honest case that the charge does NOT hold: the case "
            "should go ahead as described.\n\n"
            "- 3 to 5 numbered points. Each names one concrete strength, the evidence for it from the case "
            "file (quote it), and why it outweighs the obvious objection.\n"
            "- Defend the case as the user actually wrote it. If a part cannot be defended, concede it in one "
            "line instead of spinning it.\n- 350 words at most.\n")
    if phase == "rebuttal":
        side, other = ("prosecution", "defense") if job["id"] == "prosecution" else ("defense", "prosecution")
        return head + (
            "You are the %s. Read the other side's opening statement:\n\n    %s\n\n"
            "Answer each of its numbered points in order: say whether it survives, and why, in one or two "
            "sentences each. Then name the one point the jury should decide on. 250 words at most.\n"
            % (side.upper(), _abs(state, "opening", other + ".md")))
    if phase == "jury":
        idx = int(job["id"].split("-")[1]) - 1
        juror = state["jury"][idx]
        record = "\n".join("    " + _abs(state, p, s + ".md")
                           for p in ("opening", "rebuttal") for s in ("prosecution", "defense"))
        return head + (
            "You are JUROR %d of %d: %s. %s\n\n"
            "Read the case file and all four statements:\n\n%s\n\n"
            "Decide on your own: you will never see the other jurors. You owe the case nothing. Voting for it "
            "to be kind, or against it to look tough, is contempt of court. Judge it through your own eyes "
            "as described above.\n\n"
            "Write exactly these four lines and nothing else:\n\n"
            "VOTE: GUILTY or NOT GUILTY\n"
            "REASON: one sentence, in your own voice\n"
            "DECIDING FACT: the one fact from the record that decided it\n"
            "WOULD FLIP IF: the one change to the case that would make you vote the other way\n"
            % (idx + 1, len(state["jury"]), juror["name"], juror["lens"], record))
    if phase == "judge":
        return head + (
            "You are the JUDGE. The jury has voted and you cannot overturn the vote. Read the case file, the "
            "four statements in %s and %s, every juror's vote in %s, and the count in %s.\n\n"
            "Write these sections, plainly, for someone who has never seen a courtroom:\n\n"
            "## Charges that stuck\nThe 3 objections the jurors cited most, each in one sentence, with how "
            "many jurors leaned on it.\n\n"
            "## What the defense got right\nThe 2 strongest points in the case's favour.\n\n"
            "## Conditions for acquittal\nThe 3 specific changes that would flip the most votes, built from "
            "the jurors' WOULD FLIP IF lines. Each one is something the user can do this week.\n\n"
            "## The sentence\nOne short paragraph in a judge's voice: what the user should do next.\n\n"
            "250 words at most. Do not repeat the vote count: it is printed above your judgment.\n"
            % (_abs(state, "opening"), _abs(state, "rebuttal"), _abs(state, "jury"),
               _abs(state, "tally.json")))
    raise ValueError(phase)


# ---------- votes ----------

VOTE_RE = re.compile(r"^\s*\**VOTE\**\s*:\s*\**\s*(NOT\s+GUILTY|GUILTY)", re.I | re.M)
FIELD_RE = r"^\s*\**%s\**\s*:\s*(.+)$"


def parse_vote(text):
    m = VOTE_RE.search(text or "")
    if not m:
        return None
    vote = "NOT GUILTY" if "NOT" in m.group(1).upper() else "GUILTY"
    out = {"vote": vote}
    for key, name in (("reason", "REASON"), ("fact", "DECIDING FACT"), ("flip", "WOULD FLIP IF")):
        f = re.search(FIELD_RE % name, text, re.I | re.M)
        out[key] = f.group(1).strip().strip("*").strip() if f else ""
    return out


def tally(state):
    rows = []
    for j, juror in zip(jobs(state, "jury"), state["jury"]):
        text = open(j["output"]).read() if done(j) else ""
        v = parse_vote(text)
        rows.append({"juror": juror["name"], "vote": v["vote"] if v else "NO VOTE",
                     "reason": v["reason"] if v else "", "fact": v["fact"] if v else "",
                     "flip": v["flip"] if v else ""})
    guilty = sum(1 for r in rows if r["vote"] == "GUILTY")
    not_guilty = sum(1 for r in rows if r["vote"] == "NOT GUILTY")
    if guilty > not_guilty:
        verdict = "GUILTY"
    elif not_guilty > guilty:
        verdict = "NOT GUILTY"
    else:
        verdict = "HUNG JURY"
    result = {"verdict": verdict, "guilty": guilty, "not_guilty": not_guilty,
              "no_vote": len(rows) - guilty - not_guilty, "jurors": rows}
    with open(os.path.join(state["dir"], "tally.json"), "w") as f:
        json.dump(result, f, indent=2)
    return result


def verdict_line(t):
    if t["verdict"] == "HUNG JURY":
        return "HUNG JURY, %d to %d" % (t["guilty"], t["not_guilty"])
    big, small = (t["guilty"], t["not_guilty"]) if t["verdict"] == "GUILTY" else (t["not_guilty"], t["guilty"])
    return "%s, %d to %d" % (t["verdict"], big, small)


def render(state):
    t = tally(state)
    case = open(os.path.join(state["dir"], "case.md")).read().strip()
    first = case.splitlines()[0].lstrip("# ").strip() if case else "(empty case)"
    judge = jobs(state, "judge")[0]
    judgment = open(judge["output"]).read().strip() if done(judge) else "_The judge has not ruled yet._"
    lines = ["# The verdict: %s" % verdict_line(t), "",
             "**The case:** %s" % first, "", "**The charge:** %s" % CHARGE, "",
             "## How the jury voted", "", "| Juror | Vote | Why |", "|---|---|---|"]
    for r in t["jurors"]:
        lines.append("| %s | %s | %s |" % (r["juror"], r["vote"], r["reason"].replace("|", "/")))
    lines += ["", judgment, "",
              "_The full trial is in %s: the opening statements, the rebuttals and every juror's vote._"
              % os.path.abspath(state["dir"]), "", CREDIT]
    text = "\n".join(lines) + "\n"
    with open(os.path.join(state["dir"], "VERDICT.md"), "w") as f:
        f.write(text)
    return text


# ---------- commands ----------

def cmd_plan(args):
    n = jury_size(args)
    calls = 2 + 2 + n + 1
    print("jury of %d: 2 opening statements, 2 rebuttals, %d jurors, 1 judge = %d sub-agent calls"
          % (n, n, calls))


def cmd_init(args):
    n = jury_size(args)
    if not os.path.exists(args.case_file):
        sys.exit("court: case file not found: %s" % args.case_file)
    case = open(args.case_file).read().strip()
    if not case:
        sys.exit("court: the case file is empty")
    seed = args.seed if args.seed is not None else random.randrange(1, 10 ** 6)
    jurors = load_jurors()
    rng = random.Random(seed)
    jury = jurors[:] if n == len(jurors) else rng.sample(jurors, n)
    rd = os.path.join(ROOT, time.strftime("%Y%m%d-%H%M%S"))
    for sub in ("briefs", "opening", "rebuttal", "jury", "judge"):
        os.makedirs(os.path.join(rd, sub), exist_ok=True)
    with open(os.path.join(rd, "case.md"), "w") as f:
        f.write(case + "\n")
    state = {"dir": rd, "seed": seed, "jury": jury, "created": time.strftime("%Y-%m-%dT%H:%M:%S")}
    save_state(state)
    with open(LATEST, "w") as f:
        f.write(rd)
    print("court: trial opened in %s (jury of %d, seed %d)" % (rd, n, seed))
    print("next: python3 scripts/court.py prompts opening")


def cmd_prompts(args):
    state = load_state()
    todo = missing(state, args.phase)
    for j in jobs(state, args.phase):
        with open(j["brief"], "w") as f:
            f.write(brief_text(state, args.phase, j))
    if not todo:
        print("court: %s is complete. Run: court.py next" % args.phase)
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
        print("court: %s complete" % args.phase)
    for j in todo:
        print("missing: %s -> %s" % (j["id"], j["output"]))


def cmd_next(args):
    state = load_state()
    for phase in PHASES:
        if missing(state, phase):
            if phase == "judge":
                t = tally(state)
                print("court: the jury voted %s." % verdict_line(t))
            print("next phase: %s. Run: python3 court.py prompts %s" % (phase, phase))
            return
    print("court: the trial is over. Run: python3 court.py render")


def cmd_tally(args):
    state = load_state()
    t = tally(state)
    print(verdict_line(t))


def cmd_render(args):
    state = load_state()
    sys.stdout.write(render(state))


def main(argv=None):
    p = argparse.ArgumentParser(prog="court.py")
    sub = p.add_subparsers(dest="cmd")
    pl = sub.add_parser("plan")
    pl.add_argument("--jury", type=int)
    pl.add_argument("--quick", action="store_true")
    pi = sub.add_parser("init")
    pi.add_argument("--case-file", required=True)
    pi.add_argument("--jury", type=int)
    pi.add_argument("--quick", action="store_true")
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
