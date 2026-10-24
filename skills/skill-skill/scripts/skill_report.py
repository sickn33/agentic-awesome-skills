#!/usr/bin/env python3
"""skill_report.py owner/repo [owner/repo ...] [--out report] — one-command health report for public skill repos.
Shallow-clones each repo (cache: ~/.cache/skill-report), audits every SKILL.md with skill_audit.py, then writes
report/data.json, report/report.md and report/chart.svg (+ chart.png when Chrome is available)."""
import os, sys, json, glob, subprocess, shutil, html
sys.path.insert(0, os.path.dirname(__file__))
from skill_audit import audit, score

args = [a for a in sys.argv[1:] if not a.startswith('--')]
out = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else 'report'
if '--out' in sys.argv: args.remove(out)
if not args: sys.exit(__doc__)
cache = os.path.expanduser('~/.cache/skill-report'); os.makedirs(cache, exist_ok=True); os.makedirs(out, exist_ok=True)

SPEC = ('must be lowercase-hyphen', '≠ folder', 'chars > 1024')
repos = []
for r in args:
    d = os.path.join(cache, r.replace('/', '__'))
    if os.path.exists(d): subprocess.run(['git', '-C', d, 'pull', '-q', '--depth', '1'], check=False)
    else: subprocess.run(['git', 'clone', '-q', '--depth', '1', f'https://github.com/{r}.git', d], check=True)
    sha = subprocess.run(['git', '-C', d, 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
    skills = []
    for p in sorted(glob.glob(os.path.join(d, '**', 'SKILL.md'), recursive=True)):
        sd = os.path.dirname(p); issues, notes = audit(sd, collisions=False)
        skills.append(dict(path=os.path.relpath(sd, d), score=score(issues, notes), issues=issues, notes=[n for n in notes if n.startswith('warn')]))
    n = len(skills) or 1
    pct = lambda f: round(100 * sum(1 for s in skills if f(s)) / n)
    repos.append(dict(repo=r, commit=sha, skills=len(skills), avg=round(sum(s['score'] for s in skills) / n),
                      no_trigger=pct(lambda s: any('trigger clause' in x for x in s['notes'])),
                      spec=pct(lambda s: any(k in x for x in s['issues'] for k in SPEC)),
                      broken_refs=sum(1 for s in skills for x in s['issues'] if 'orphan' in x or 'dangling' in x),
                      details=skills))
json.dump(repos, open(f'{out}/data.json', 'w'), indent=1, ensure_ascii=False)

total = sum(r['skills'] for r in repos)
md = [f'# Claude skill health report\n', f'{total} skills in {len(repos)} repos, audited with [skill-skill](https://github.com/jack-reson8/skill-skill) against the [Agent Skills spec](https://agentskills.io/specification).\n',
      '| Repo | Skills | Avg health | No "when to use" in description | Spec violations (name / folder / length) | Broken file refs |', '|---|---|---|---|---|---|']
md += [f"| [{r['repo']}](https://github.com/{r['repo']}/tree/{r['commit']}) | {r['skills']} | {r['avg']}/100 | {r['no_trigger']}% | {r['spec']}% | {r['broken_refs']} |" for r in repos]
md += ['\n## Findings\n']
for r in repos:
    hits = [s for s in r['details'] if s['issues']]
    if hits:
        md.append(f"**{r['repo']}**")
        md += [f"- `{s['path']}`: " + '; '.join(s['issues']) for s in hits[:8]] + ([f'- …and {len(hits) - 8} more (see data.json)'] if len(hits) > 8 else []) + ['']
md.append('\nReproduce: `python3 scripts/skill_report.py ' + ' '.join(args) + '`')
open(f'{out}/report.md', 'w').write('\n'.join(md))

# chart: one accent (spec violations) + grey (no trigger), one row per repo
W, row = 1040, 92; H = 190 + row * len(repos); x0, bw = 470, 470
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="-apple-system,Helvetica,Arial,sans-serif">',
       f'<rect width="{W}" height="{H}" fill="#fff"/>',
       '<text x="40" y="52" font-size="15" font-weight="700" fill="#d9480f">CLAUDE SKILL HEALTH</text>',
       '<text x="40" y="90" font-size="27" font-weight="800" fill="#1a1a1a">Many skills never tell the model when to use them</text>',
       f'<text x="40" y="120" font-size="16" fill="#6b6b6b">Share of skills per repo · {total} skills audited</text>',
       f'<rect x="{x0}" y="140" width="12" height="12" fill="#d9480f"/><text x="{x0+18}" y="151" font-size="14" fill="#444">spec violation</text>',
       f'<rect x="{x0+150}" y="140" width="12" height="12" fill="#b8b8b8"/><text x="{x0+168}" y="151" font-size="14" fill="#444">no "when to use"</text>']
for i, r in enumerate(repos):
    y = 185 + i * row
    svg.append(f'<text x="40" y="{y+22}" font-size="17" font-weight="600" fill="#1a1a1a">{html.escape(r["repo"])}</text>')
    svg.append(f'<text x="40" y="{y+44}" font-size="14" fill="#6b6b6b">{r["skills"]} skills · avg {r["avg"]}/100</text>')
    for j, (v, c) in enumerate([(r['spec'], '#d9480f'), (r['no_trigger'], '#b8b8b8')]):
        yy = y + 6 + j * 26
        svg.append(f'<rect x="{x0}" y="{yy}" width="{bw}" height="18" fill="#f1f1f1"/><rect x="{x0}" y="{yy}" width="{max(2, bw * v / 100):.0f}" height="18" fill="{c}"/>')
        svg.append(f'<text x="{x0 + bw + 10}" y="{yy + 15}" font-size="15" font-weight="700" fill="#1a1a1a">{v}%</text>')
svg.append(f'<text x="40" y="{H-18}" font-size="12" fill="#8a8a8a">Source: skill-skill audit vs agentskills.io spec · github.com/jack-reson8/skill-skill</text></svg>')
open(f'{out}/chart.svg', 'w').write('\n'.join(svg))
chrome = next((c for c in ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'] if os.path.exists(c)), None)
if chrome:
    subprocess.run([chrome, '--headless=new', '--disable-gpu', f'--screenshot={os.path.abspath(out)}/chart.png', f'--window-size={W},{H}', '--force-device-scale-factor=2',
                    'file://' + os.path.abspath(f'{out}/chart.svg')], capture_output=True)
print(f'wrote {out}/report.md, data.json, chart.svg' + (', chart.png' if chrome else ''))
for r in repos: print(f"  {r['repo']}: {r['skills']} skills, avg {r['avg']}, no-trigger {r['no_trigger']}%, spec {r['spec']}%, broken refs {r['broken_refs']}")
