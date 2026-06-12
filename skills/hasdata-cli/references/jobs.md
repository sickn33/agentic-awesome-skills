# Jobs reference

Subcommands: `indeed-listing`, `indeed-job`, `glassdoor-listing`, `glassdoor-job`. Indeed: 5 credits. Glassdoor: 10 credits.

`*-listing` searches by query/location; `*-job` deep-dives a specific posting by URL or ID.

---

## indeed-listing

```bash
hasdata indeed-listing \
  --query "backend engineer" --location "Remote" \
  [--days-since-posted 7] [--job-type fulltime|parttime|contract|temporary|internship] \
  [--remote] [--page 1] \
  --raw | jq '.jobs[] | {title, company, location, posted, salary, url}'
```

Other flags worth knowing:
- `--salary-min N` / `--salary-max N`
- `--experience-level entry|mid|senior`
- `--sort relevance|date`
- `--country us|gb|ca|de|fr|...`

## indeed-job

```bash
hasdata indeed-job --url "https://www.indeed.com/viewjob?jk=..." --raw | jq .
```

Or `--job-key JK`. Returns full description, company info, benefits, hiring insights, similar jobs.

## glassdoor-listing

```bash
hasdata glassdoor-listing --keyword "data scientist" --location "Boston" --raw \
  | jq '.jobs[] | {title, employer, salary_estimate, rating}'
```

Glassdoor includes employer ratings and salary estimates per result. Use this when the user cares about employer reputation alongside the role.

## glassdoor-job

```bash
hasdata glassdoor-job --url "https://www.glassdoor.com/Job/jobs.htm?...JV=..." --raw | jq .
```

Returns full posting plus employer rating breakdown, recent reviews, salary estimate range, interview difficulty.

---

## Non-obvious use cases

- **Salary-negotiation research** — `indeed-listing --query ROLE --location CITY` then `jq '[.jobs[].salary | select(.)] | sort_by(.min)'` to build a defensible range before a comp conversation.
- **"Should I move for this job?"** — same role across 3–5 cities; compare median salaries to local cost of living.
- **Hiring-pattern intel on a competitor** — `indeed-listing --query "company:NAME"` (or use `glassdoor-listing` filtered by employer) returns recent postings; surfaces what teams are growing, what stack they're on, what locations they're in.
- **"Are they really hiring or is this a ghost job?"** — `indeed-job --url X --raw | jq '.posted_at'`. Postings older than 60 days that haven't been refreshed are often ghosts.
- **Stack popularity by region** — `indeed-listing --query "Rust" --location "Berlin"` vs `--location "San Francisco"` to compare absolute postings and salary deltas for a specific tech.
- **Career-pivot research** — `indeed-listing --query "TARGET ROLE" --raw | jq -r '.jobs[].description'` then summarize the most-required skills with an LLM. Reveals the actual gap, not what bootcamps claim.
- **Employer reputation deep-dive** — `glassdoor-listing` returns ratings inline; `glassdoor-job` returns recent reviews + interview difficulty. Use before applying or accepting.
- **Remote-job filter** — `--remote` on `indeed-listing` cuts to fully-remote postings; use `--country gb` etc. to find role markets that are remote-friendly outside the US.
- **Visa-friendly employer detection** — search `indeed-listing --query "ROLE H1B sponsorship"` or `--query "ROLE relocation"` — listings that mention these are more likely to support visa transfers.
- **Internship-only filter** — `--job-type internship` on `indeed-listing` for early-career searches.
- **Salary-band reverse engineering** — Glassdoor's `salary_estimate` is an estimate; cross-check by sampling 5–10 indeed postings for the same role/title in the same city and computing your own median.
- **"Who's leaving Company X?"** — `glassdoor-listing --keyword "previously at: COMPANY"` is a stretch query but sometimes surfaces postings where ex-employees describe their transition.
- **Detect layoffs before the news** — sudden surge in `indeed-listing --query "ex-COMPANY"` postings in a region often precedes the announcement.
- **Negotiation prep — interview difficulty** — `glassdoor-job --url X --raw | jq '.interview_difficulty, .interview_experiences[]'` shows how previous candidates rated the process.

## Common patterns

```bash
# Salary distribution for a role
hasdata indeed-listing --query "senior python developer" --location "New York, NY" \
  --raw | jq '[.jobs[].salary | select(. != null)] | unique'

# Compare same role on both platforms
for src in indeed-listing glassdoor-listing; do
  echo "=== $src ==="
  hasdata "$src" --query "platform engineer" --location "SF" --raw \
    | jq '.jobs[:5][] | {title, company: (.company // .employer), location}'
done
```

Start with Indeed for breadth; escalate to Glassdoor when employer ratings or interview-difficulty data are needed.
