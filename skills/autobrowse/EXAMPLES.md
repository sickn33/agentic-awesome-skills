# AutoBrowse Examples

## Single task — interactive loop

```
/autobrowse --task my-portal
```

Run the evaluate → read trace → improve strategy cycle for one task. Claude iterates until you stop it or the task graduates.

---

## Single task — remote mode

For sites with bot detection (login walls, CAPTCHAs, Cloudflare):

```
/autobrowse --task schwab-login --env remote
```

---

## Fixed iterations

Run exactly 10 cycles then stop:

```
/autobrowse --task my-portal --iterations 10
```

---

## Multiple tasks in parallel

Run all tasks in your `tasks/` directory with 5 iterations each:

```
/autobrowse --all --iterations 5 --env remote
```

Or specify tasks explicitly:

```
/autobrowse --tasks payment-portal,receipt-download,account-summary --iterations 5
```

---

## Nightly skill refresh

Keep skills fresh as websites change. Add to your crontab:

```bash
0 1 * * * cd /path/to/project && claude "/autobrowse --all --iterations 3 --env remote" >> autobrowse.log 2>&1
```

---

## Evaluate only (no improvement)

Run the inner agent once and read the trace yourself:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/evaluate.mjs --task my-portal --env remote
cat traces/my-portal/latest/summary.md
```

---

## What a graduated skill looks like

After several iterations, `tasks/my-portal/skill.md` will contain hard-won site knowledge:

```markdown
## Fast Path
Navigate directly to the form — skip the landing page:
https://portal.example.com/pay?invoice=true

## Form Fields
- Invoice number: `#wpforms-68-field_3`
- Card number: `#wpforms-68-field_6`

## Timing Rules
- After clicking Submit: wait 3s for spinner before checking result
- Dropdown populates 500ms after focus — don't rush

## Failure Recovery
- "Invalid credentials" = bot detection, retry with --env remote
```

This file drops straight into your stagehand/browser-use agent as a system prompt addition.
