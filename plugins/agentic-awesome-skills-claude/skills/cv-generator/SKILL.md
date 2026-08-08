---
name: cv-generator
description: "Generate professional, ATS-optimized CVs for FlowCV, Canva, Google Docs, or Word. Handles multi-source merging, JD targeting, seniority adaptation, and humanized rewriting. Outputs paste-ready text with an ATS flaw report and improvement suggestions."
category: content
risk: safe
source: community
date_added: "2026-06-06"
author: "WHOISABHISHEKADHIKARI"
user-invokable: true
tags:
  - cv
  - resume
  - ats
  - career
  - job-application
  - career-change
---

# CV Generator Skill — FlowCV / Canva Edition

## When to Use

Use this skill when you need to:
- Generate a professional, ATS-optimized CV from multiple sources (LinkedIn, GitHub, Portfolio).
- Tailor an existing CV for a specific Job Description (JD).
- Improve the language, metrics, and structure of a draft resume.
- Prepare a paste-ready version of your CV for tools like FlowCV or Canva.

Turns raw profile data into a polished, ATS-ready CV. Outputs a paste-ready plain-text
version formatted for FlowCV, Canva, Google Docs, or Word — with a flaw report and
missing-info checklist.

---

## FLAW REGISTER — KNOWN ISSUES FIXED IN THIS VERSION

The following issues were identified across the two prior skill drafts and are corrected here:

| # | Flaw | Fix applied |
|---|------|-------------|
| F-01 | Output was Markdown-first, not paste-ready plain text | Final output is plain text; Markdown is internal staging only |
| F-02 | FlowCV/Canva field structure was never addressed | Section mapping to tool fields added (section 11c) |
| F-03 | Questionnaire dumped all 20 questions at once in practice | Hard rule: one question at a time, wait for answer |
| F-04 | Anti-hallucination rules listed but never enforced structurally | Enforcement gate added before every output (section 10) |
| F-05 | Cover letter was offered but never scoped for these tools | Cover letter now outputs to a separate plain-text block, not inline |
| F-06 | ATS check listed but had no scored output | Flaw report now scores 0–100 with per-item pass/fail |
| F-07 | Seniority detection was "detect or ask" with no fallback | Default is mid-level if undetectable; user is told the assumption |
| F-08 | No guidance on what FlowCV/Canva cannot render | Added explicit field-by-field paste map (section 11c) |
| F-09 | Tense rules stated but never verified in quality gate | Tense check is now a hard gate — output blocked until corrected |
| F-10 | "Passionate about" and similar banned phrases still appeared in examples | Phrase blocklist now machine-checkable (section 7c) |
| F-11 | Nepal/South Asia market conventions were present but incomplete | Confirmed and expanded (section 14) |
| F-12 | No explicit rule on what to do when LinkedIn scraping is blocked | Hard fallback rule: ask for PDF export immediately, do not proceed empty |
| F-13 | File naming convention mentioned once, never enforced | File name rule is part of the final output block (section 11) |
| F-14 | Skill had no version history or upgrade path | Version field added to frontmatter |
| F-15 | GitHub was listed as a source but extraction rules were missing | GitHub extraction rules added (section 4f) |

---

## 1. Invocation

```
Use @cv-generator to build my CV from my LinkedIn PDF.
Use @cv-generator to tailor my CV for this job description.
Use @cv-generator to improve my existing draft.
Use @cv-generator to create a fresh CV via questionnaire.
Use @cv-generator — I want a FlowCV-ready output.
```

Any combination of sources is valid. Multiple sources are merged and deduplicated
before writing begins.

---

## Source Selection

Ask the user which source(s) to use. At least one is required.
If no source is provided, default immediately to the questionnaire (section 4d).

| # | Source | Instruction |
|---|--------|-------------|
| 1 | LinkedIn profile URL | Fetch page; extract all visible sections. **If blocked or empty: immediately ask for a LinkedIn PDF — do not proceed on an empty extraction.** |
| 2 | LinkedIn PDF export | Parse uploaded file. If scanned image: apply OCR and warn the user to verify accuracy. |
| 3 | Portfolio / personal website | Fetch URL; extract About, Projects, Skills, Services, Testimonials, Case Studies, Contact. |
| 4 | Questionnaire | Step-by-step (section 4d). One question at a time. |
| 5 | Existing CV or draft | Upload or paste; improve only — never alter facts. |
| 6 | GitHub profile | Extract pinned repos, bio, tech stack, contribution summary (section 4f). |
| 7 | Resume file (DOCX / PDF / TXT) | Parse and rewrite. Flag scanned PDFs; apply OCR. |

---

## Purpose, seniority, and format

### Purpose

Ask after source selection:

> "What is the main purpose of this CV?"

| Purpose | Key adaptation |
|---------|----------------|
| Applying for a specific job | Full JD analysis + keyword targeting (section 9) |
| General professional CV | Balanced, role-agnostic, reverse-chronological |
| Internship / entry-level | Education and projects lead; transferable skills foregrounded |
| Academic / research | Publications, grants, teaching, research interests |
| Freelance / client proposal | Deliverables, outcomes, services |
| Career change | Functional or hybrid; transferable skills reframed |
| Executive / board-level | Executive summary, board positions, P&L scope |
| Military-to-civilian | Translate ranks and jargon to civilian equivalents |
| Return to work / career break | Frame gap positively; emphasise upskilling |
| Other | Ask the user to describe the goal in one sentence |

### Seniority

Detect from data. If undetectable, **default to mid-level and tell the user:**
> "I've assumed mid-level (3–8 years). Let me know if this should be different."

| Level | Years | CV emphasis |
|-------|-------|-------------|
| Student / fresh graduate | 0–1 | Education first; projects; extracurriculars; 1 page |
| Junior / entry | 1–3 | Skills + education prominent; 1 page |
| Mid-level | 3–8 | Experience leads; achievements over duties; 1–2 pages |
| Senior | 8–15 | Leadership, scope, impact, mentoring; 2 pages |
| Executive / C-suite | 15+ | Strategic narrative; board roles; P&L; 2–3 pages |
| Academic | Any | No page limit; publications; grants; teaching |

### Format

| Format | Use when |
|--------|----------|
| Chronological (default) | Clear career progression; most job applications |
| Functional / skills-first | Career changers; large gaps; military-to-civilian |
| Hybrid / combination | Senior professionals rebranding; career changers with strong experience |
| Academic CV | University, research, PhDs, postdocs |
| Executive / Board bio | C-suite, NED, advisory |
| Portfolio-led | Designers, architects, creatives |

---

## Data extraction rules

### LinkedIn URL

If the page is blocked or returns no content, **stop immediately** and ask:
> "LinkedIn blocked the fetch. Please export your LinkedIn profile as a PDF
> (LinkedIn → Me → Settings → Data Privacy → Get a copy of your data) and upload it."

If accessible, extract in order:
1. Full name and headline
2. Contact information (email, phone, location — public only)
3. About / Professional Summary
4. Work experience: title, company, location, dates, bullets
5. Education: degree, institution, dates, grade/honours
6. Skills (flag top endorsed skills)
7. Certifications and licences
8. Projects
9. Achievements, honours, awards
10. Volunteer experience
11. Languages and proficiency
12. Publications, patents, courses

### LinkedIn PDF

Hard rules:
- Extract only what is physically present in the document.
- Preserve all dates exactly as written.
- If a section is absent, mark it **[Not provided]** — do not skip silently.
- Do not merge bullets across different roles.
- If scanned: apply OCR and display this warning before continuing:
  > "OCR was used to read this document. Please review the extracted text below
  > for accuracy before we continue."

### Portfolio / personal website

Extract:
- About / bio → Professional Summary
- Projects: name, description, technologies, outcomes, live/repo URLs
- Skills and services
- Testimonials or client logos → Achievements
- Case studies → 2–4 bullets each
- Blog posts or articles → Publications / Thought Leadership
- Contact details

### Questionnaire

**One question at a time. Wait for the answer before continuing.**
Do not display the full list unless the user explicitly asks for a form.

```
Q1.  Full legal name (as it should appear on the CV)
Q2.  Target job title or role
Q3.  Email address
Q4.  Phone number including country code (optional but recommended)
Q5.  City and country of residence
Q6.  LinkedIn URL (optional)
Q7.  Portfolio, GitHub, or personal website URL (optional)
Q8.  Professional summary — describe yourself in 2–3 sentences (will be rewritten)
Q9.  Work experience — for EACH role:
       - Job title
       - Company name and industry
       - Employment type (full-time / part-time / contract / freelance / internship)
       - Location or Remote
       - Start and end date (or "Present")
       - 3–6 key responsibilities and achievements
       - Any measurable results (numbers, %, revenue, team size, budget)
Q10. Education — for EACH qualification:
       - Degree or certificate name
       - Institution name and country
       - Start and graduation year
       - Grade, GPA, or classification if notable
       - Thesis or relevant modules (optional; for academic/entry-level only)
Q11. Technical and professional skills
       (ask to separate: Expert / Proficient / Familiar)
Q12. Projects — for each:
       - Name
       - Purpose
       - Your specific role
       - Technologies or methods used
       - Outcome or impact
Q13. Certifications (name, issuing body, date, expiry if applicable)
Q14. Achievements, awards, or recognitions
Q15. Languages and proficiency: Native / Fluent / Professional / Conversational / Basic
Q16. Volunteer or open-source work (optional)
Q17. Publications, speaking engagements, press mentions (optional)
Q18. Preferred CV format: chronological / functional / hybrid / academic / executive
Q19. Target country or job market
Q20. Any employment gaps? Dates and brief reason — will be framed constructively.
```

### Existing CV or draft

Rules:
- Preserve every fact: titles, companies, dates, institutions, grades.
- Rewrite weak or passive bullets with strong action verbs.
- Remove repetition across roles.
- Correct grammar, punctuation, spelling.
- Fix tense: past for completed roles, present for current role.
- Replace all banned phrases (section 7c).
- Improve ATS keyword density where natural — do not keyword-stuff.
- Restructure section order if it does not match target market or seniority.
- **Do not add experience, qualifications, metrics, or skills not present in the original.**

### GitHub profile

Extract:
- Bio / tagline → supplement Professional Summary
- Pinned repositories: name, description, tech stack, stars/forks
- Contribution activity (years active, languages used)
- README content for context on major projects
- Do not infer seniority from commit count alone

### Employment gaps and special situations

**Gap under 3 months:** no special treatment.

**Gap 3–12 months:** one-line entry:
> "Career break — [brief honest reason: personal development / caregiving / travel / health]"

**Gap over 12 months:** add a neutral framing entry in the experience section;
highlight any upskilling, freelance, volunteering, or relevant activity during the gap.
Never fabricate activity.

**Contract / freelance / part-time:** label employment type clearly. Group multiple
short contracts under one umbrella entry (e.g. "Freelance Consultant") if they share
a skill area.

**Concurrent roles:** list both with accurate overlapping dates; add "(concurrent with
[other role])" if helpful.

**Early or irrelevant roles (> 10 years):** condense to one line for senior professionals
unless directly relevant to the target role.

**Fresh graduate:** lead with Education → Projects → Skills → Internships.
Use academic projects as proof of practical skills.

**Military-to-civilian:** translate all ranks and jargon to civilian equivalents;
quantify command scope (e.g. "Managed 35 personnel and $2M in equipment").

**Non-English source:** translate accurately; preserve institution and company names
in the original language with an English translation in parentheses on first use;
advise the user to have the translation reviewed by a native speaker.

---

## Multi-source merging

1. Build a master profile combining all extracted data.
2. Deduplicate: keep the most detailed version of each entry.
3. If two sources conflict on a date or title, flag it and ask the user to confirm.
4. Identify gaps; ask follow-up questions only for critical missing data.
5. Never fabricate a detail — mark it **[Not provided]** until the user confirms.

---

## CV section order

### Chronological (default — mid / senior)
```
1.  Full Name
2.  Contact Information (email | phone | LinkedIn | portfolio | city, country)
3.  Professional Summary
4.  Core Skills
5.  Work Experience (reverse chronological)
6.  Education (reverse chronological)
7.  Certifications and Licences
8.  Projects
9.  Technical Skills (grouped: Languages | Frameworks | Tools | Platforms)
10. Achievements and Awards
11. Volunteer Experience
12. Publications / Speaking
13. Languages
14. Additional Information
```

### Fresh graduate / student
```
1.  Full Name + Contact Information
2.  Professional Summary / Objective
3.  Education
4.  Projects and Coursework
5.  Skills
6.  Work Experience / Internships
7.  Certifications
8.  Extracurricular / Volunteer
9.  Languages
```

### Functional / skills-first (career changers, large gaps)
```
1.  Full Name + Contact Information
2.  Professional Summary
3.  Core Competencies / Skills
4.  Key Achievements
5.  Work History (company, title, dates — minimal bullets)
6.  Education
7.  Certifications
8.  Languages
```

### Academic CV
```
1.  Full Name + Contact + ORCID / ResearchGate
2.  Research Interests
3.  Education
4.  Academic Positions
5.  Publications
6.  Grants and Funding
7.  Teaching Experience
8.  Supervision
9.  Awards and Honours
10. Conference Presentations
11. Professional Memberships
12. Skills
13. References
```

### Executive / Board
```
1.  Full Name + Contact Information
2.  Executive Summary
3.  Core Competencies
4.  Board and Advisory Roles
5.  Executive Experience
6.  Education and Qualifications
7.  Publications / Media / Speaking
8.  Professional Memberships
```

---

## Writing rules

### Professional Summary

Write 3–5 sentences (executive: 5–7) covering:
1. Who the person is: job title + years of experience
2. Primary domain of expertise
3. One concrete differentiator or standout achievement
4. Value proposition aligned to the target role

- Do not open with "I am".
- Do not open with any banned phrase (section 7c).
- Base strictly on data collected — no padding.

Good example:
> "Software engineer with seven years building distributed systems at scale.
> Deep expertise in Go and Kubernetes, with a track record of cutting infrastructure
> costs 30–40% through cloud-native redesigns. Seeking a staff-level role where
> systems reliability and platform engineering intersect."

### Experience bullets — STAR-lite

Pattern: `[Strong verb] + [what you did] + [scale/scope] + [outcome if available]`

Rules:
- 3–6 bullets per role (2–3 for short-tenure or early roles)
- Past tense for completed roles; present tense for current role
- 15–30 words per bullet
- Different verb to open each bullet — never repeat within one role
- If no metric was provided: write a result-focused statement without inventing numbers
- Never fabricate metrics — if the user says "we grew a lot", ask for specifics

Action verb bank:

```
Leadership:    Led, Directed, Managed, Supervised, Mentored, Coached, Championed
Building:      Built, Developed, Engineered, Architected, Designed, Implemented, Launched, Shipped
Improvement:   Reduced, Improved, Optimised, Streamlined, Accelerated, Automated, Consolidated
Analysis:      Analysed, Researched, Evaluated, Identified, Diagnosed, Assessed, Mapped
Communication: Presented, Authored, Documented, Trained, Negotiated, Advised, Collaborated
Growth:        Grew, Expanded, Scaled, Generated, Increased, Secured, Delivered
Strategy:      Defined, Established, Prioritised, Planned, Coordinated, Oversaw, Aligned
```

Rewrites:
```
BEFORE: "Responsible for managing the team"
AFTER:  "Managed a cross-functional team of 8 engineers, delivering the product roadmap
         on schedule for three consecutive quarters"

BEFORE: "Helped with developing new features"
AFTER:  "Developed four customer-facing features in React, reducing support tickets by 25%"

BEFORE: "Was involved in the migration project"
AFTER:  "Led migration from monolith to microservices, cutting deployment time from
         45 minutes to under 4 minutes"
```

### Banned phrases — machine-checkable blocklist

Before output, scan the full CV text and **reject any bullet or sentence containing**
any of the following strings (case-insensitive):

```
results-driven
dynamic individual
highly motivated
team player
proven track record
passionate about
passionate professional
detail-oriented
self-starter
hard worker
strong communication skills
excellent communication
synergy
leverage (when used as a verb meaning "use")
paradigm shift
thought leader
go-getter
innovative thinker
outside the box
people person
visionary
change agent
```

If found: rewrite the sentence to show the specific evidence instead.

### Tense enforcement

This is a hard gate — output is blocked until tense is correct:

- **Completed role** → all bullets in past tense (Led, Built, Reduced...)
- **Current role** → all bullets in present tense (Lead, Build, Reduce...)
- **Mixed tense within one role** → always fail; fix before output

### Acronym and terminology

- Spell out on first use: "Machine Learning (ML)"; use abbreviation thereafter.
- Consistent capitalisation throughout: "JavaScript" not "Javascript".
- Mirror exact JD phrasing where applicable.
- Include both full form and abbreviation for searchability.

---

## ATS optimisation

### Structural rules

| Rule | Why it matters |
|------|----------------|
| Name must be the very first line of the body | Parsers read top-to-bottom; name in header/footer is often missed |
| Contact info in body, not in header or footer | Header/footer text is invisible to Taleo, Workday, iCIMS |
| Single-column layout only | Two-column layouts break ATS text extraction order |
| No tables for layout | Table cells are read in unpredictable order |
| No text boxes, shapes, or SmartArt | Text inside shapes is invisible to ATS |
| No images or photos (unless market requires it) | Images are ignored; photos risk bias filtering |
| No icons in bullets or headings | Symbols like ➤ ✓ ★ corrupt parsed text |
| Bullet characters: hyphen (-) or plain dot (•) only | Safe across all ATS platforms |
| Standard section headings only | Non-standard headings cause misclassification |
| No "Objective" heading | Flags CV as outdated; use "Professional Summary" |
| Font: minimum 10pt body, 12–14pt headings | Smaller text garbles in PDF-to-text conversion |
| Margins: minimum 0.5 in / 1.27 cm all sides | Narrow margins cause line-wrapping errors |
| Spell out all URLs fully | Anchor text loses URL when ATS strips formatting |
| File format: .docx preferred for ATS; PDF for email | DOCX parses more accurately in most ATS |
| File name: FirstName_LastName_CV.docx | Generic names ("resume.pdf") get buried in recruiter files |

### Keyword strategy

1. Extract top 10–20 keywords from the JD (if provided).
2. Categorise: hard skills | soft skills | qualifications | industry terms.
3. For each keyword, record:
   - Present and prominent
   - Present but weak or buried → strengthen placement
   - Absent but user has the skill → weave in naturally
   - Absent and user lacks the skill → do not add
4. Target keyword density: 2–4 natural occurrences per hard skill across the full CV.
5. Include both spelled-out form and abbreviation for key terms.
6. Mirror exact JD phrasing for shared responsibilities.

### ATS platform quick notes

| Platform | Key quirk |
|----------|-----------|
| Workday | DOCX preferred; complex PDF tables fail |
| Taleo | Strictest; no special characters; plain text preferred |
| Greenhouse | Lenient; weights keyword frequency |
| Lever | Modern parser; handles most formats |
| iCIMS | DOCX preferred; strips header/footer text |
| SmartRecruiters | Handles DOCX and PDF; relatively lenient |

Default when platform is unknown: apply Taleo-level strictness.

---

## Job description integration

When a JD is provided, run four steps:

**Step 1 — Parse:**
- Job title and seniority signals
- Required vs preferred qualifications
- Hard skills: tools, languages, platforms, methodologies
- Soft skills and collaboration patterns
- Industry terminology
- Responsibility verb phrases (mirror these in bullets)

**Step 2 — Score:**
For each of the top 15 keywords, mark: present and prominent / present but weak /
absent.

**Step 3 — Integrate:**
- Strengthen weak keyword placements.
- Weave in missing keywords the user genuinely has experience with.
- Never add a keyword the user cannot truthfully claim.

**Step 4 — Report (include at end of output):**
```
JD KEYWORD MATCH REPORT
Total JD keywords identified: 18
Matched in CV: 14 (78%)
Added naturally during generation: 3
Not added (user lacks skill): 1 — Salesforce
Recommendation: even limited Salesforce exposure is worth noting if any exists
```

---

## Anti-hallucination enforcement gate

Before any output is produced, confirm every item in the CV passes this check.
**Output is blocked until all items pass.**

| Item | Rule |
|------|------|
| Job titles | Sourced directly from user data — not inferred or upgraded |
| Company names | Sourced directly — not corrected, normalised, or embellished |
| Dates | Reproduced exactly as provided — no normalisation without noting it |
| Degrees and institutions | Reproduced exactly as provided |
| Certifications | Only those explicitly named by the user |
| Metrics and numbers | Only those provided by the user — never approximated or invented |
| Awards and achievements | Only those named by the user |
| Skills and tools | Only those provided or clearly evidenced in source data |
| Projects | Only those named by the user |

If any item cannot be verified: mark it **[Not provided]** and include it in the
missing information checklist (section 11d). Never fill gaps silently.

---

## Final output — deliver in this exact order

### Formatted CV (staging draft)

Clean plain-text draft with clear section labels. Used as the working version
before generating the tool-specific paste copies below.

### FlowCV paste-ready version

FlowCV uses structured text fields, not free-form documents. Format accordingly:

```
FULL NAME
[First name] [Last name]

PROFESSIONAL TITLE
[Target job title]

CONTACT
Email: [email]
Phone: [+country code number]
Location: [City, Country]
LinkedIn: [full URL]
Portfolio: [full URL if applicable]

PROFESSIONAL SUMMARY
[3–5 sentence plain paragraph — no bullets, no Markdown]

CORE SKILLS
[skill], [skill], [skill], [skill]
[skill], [skill], [skill], [skill]

WORK EXPERIENCE

[Job Title]
[Company Name] | [City, Country] | [Mon YYYY] – [Mon YYYY or Present]
[Employment type if not full-time: Contract / Freelance / Part-time]
- [Bullet one: action verb + context + outcome]
- [Bullet two]
- [Bullet three]

[Repeat for each role]

EDUCATION

[Degree Name]
[Institution Name], [Country] | [YYYY] – [YYYY]
[Grade or classification if notable]

[Repeat for each qualification]

CERTIFICATIONS
[Certificate Name] — [Issuing Body] — [Month YYYY]

PROJECTS

[Project Name]
[Technologies: tool, tool, tool]
- [What it does / your role / outcome]

ACHIEVEMENTS
- [Achievement one]
- [Achievement two]

VOLUNTEER EXPERIENCE
[Role] — [Organisation] — [YYYY–YYYY]
- [One-line description]

LANGUAGES
[Language]: [Native / Fluent / Professional / Conversational / Basic]

ADDITIONAL INFORMATION
[Anything else: open-source, interests relevant to role]
```

### Canva paste-ready version

Canva CV templates use individual text boxes per section. Provide each section as
a separate clearly labelled block, with no Markdown symbols.

```
--- PASTE INTO: Name field ---
[Full name]

--- PASTE INTO: Job title / headline field ---
[Target job title]

--- PASTE INTO: Contact block ---
[email] | [phone] | [city, country] | [LinkedIn URL]

--- PASTE INTO: Summary / About field ---
[3–5 sentence paragraph, plain text, no hyphens or bullets]

--- PASTE INTO: Skills field ---
[skill] | [skill] | [skill] | [skill] | [skill]

--- PASTE INTO: Experience entry 1 ---
[Job Title]
[Company] | [Location] | [Mon YYYY – Mon YYYY]
- [Bullet]
- [Bullet]
- [Bullet]

[Continue for each role as a separate block]

--- PASTE INTO: Education entry 1 ---
[Degree]
[Institution], [Country] | [YYYY – YYYY]
[Grade if notable]

--- PASTE INTO: Certifications ---
[Certificate] | [Issuer] | [YYYY]

--- PASTE INTO: Languages ---
[Language] ([Proficiency])
```

### Missing information checklist

```
MISSING INFORMATION
[ ] Phone number
[ ] LinkedIn URL
[ ] Portfolio or GitHub URL
[ ] Measurable results for [Role] at [Company]
[ ] Certifications — do you hold any?
[ ] Languages — list any beyond English
[ ] Employment gap [Mon YYYY – Mon YYYY] — add a brief framing note
[ ] [Any other flagged item]
```

### CV flaw report (scored 0–100)

Run all checks. Display a scored report:

```
CV FLAW REPORT
──────────────────────────────────────
Score: [X]/100

PASS  Truthfulness — all facts sourced from user data
PASS  No hallucination — no fabricated details
PASS  Tense correctness — past for completed, present for current
PASS  ATS structure — single column, no tables or images
PASS  Standard headings — all recognisable by parsers
PASS  No forbidden characters — no ➤ ✓ ★
PASS  Humanized — no banned phrases found
PASS  Contact info in body (not header/footer)
FAIL  [Check name] — [specific issue and location in CV]
──────────────────────────────────────
Deductions: -[N] per FAIL item
Final score: [X]/100

ISSUES TO FIX:
1. [Exact location] — [Exact problem] — [Suggested fix]
2. [Exact location] — [Exact problem] — [Suggested fix]
```

Score deductions: -10 per FAIL on truthfulness or hallucination;
-5 per FAIL on tense, ATS structure, or banned phrases;
-3 per FAIL on formatting issues.

### Improvement suggestions (3–7, specific and actionable)

- "Your summary does not state the target role. Open with your job title explicitly."
- "The [Company] role has no metrics. Even approximate scope (team size, users, budget range) strengthens credibility."
- "Skills section mixes expert and basic tools without distinction. Group into Proficient / Familiar."
- "Add a GitHub or portfolio URL — technical recruiters check it before the interview."
- "Three bullets begin with 'Responsible for' — replace with direct action verbs."
- "CV is [N] pages for [N] years of experience. Target is [N] pages; trim older roles to one line."

### Suggested file name

```
Suggested filename: [FirstName]_[LastName]_CV.docx
```

---

## Cover letter companion (optional)

After the CV output, offer:

> "Would you like a tailored cover letter for this application?"

If yes, output as a **separate clearly labelled plain-text block** — not inline with the CV.

Rules:
- Opens with a specific hook — not "I am writing to apply for…"
- References company and role by name
- Bridges 2–3 strongest CV points to the JD's key requirements
- Closes with a clear call to action
- Matches tone of the target industry
- 3 paragraphs maximum, 250–350 words
- Does not repeat the CV verbatim

---

## Limitations

- **No hallucination.** Never invent a title, company, date, degree, cert, skill, metric, or award.
- **No fake metrics.** If the user says "we grew a lot", ask for specifics — never insert a percentage.
- **Respect source truth.** "Junior Developer" stays "Junior Developer" — suggest a reframe if needed; never silently change it.
- **No silent changes.** If something is materially reworded, note the change.
- **One version at a time.** Complete the CV before offering variants.
- **Privacy.** Do not expose full home address, national ID, DOB, marital status, or religion unless the user's target market requires it.
- **No keyword stuffing.** Adding skills the user does not have is fraud. Flag gaps; never fabricate.
- **OCR warning.** Always display before continuing: "OCR was used — please verify the extracted text for accuracy."

---

## Country and market conventions

| Market | Length | Photo | DOB | Marital status | References |
|--------|--------|-------|-----|----------------|------------|
| USA | 1–2 pages | No | No | No | "Available on request" |
| Canada | 1–2 pages | No | No | No | "Available on request" |
| UK | 2 pages | No | No | No | "Available on request" |
| Ireland | 2 pages | No | No | No | "Available on request" |
| Australia / NZ | 2–3 pages | No | No | No | "Available on request" |
| Germany / Austria / Switzerland | 2–3 pages | Yes (expected) | Yes | Sometimes | Listed or on request |
| France | 1–2 pages | Optional | No (illegal to require) | No | On request |
| Netherlands / Scandinavia | 1–2 pages | Optional | No | No | On request |
| Japan | 1–2 pages (rirekisho) | Yes | Yes | Yes | Listed |
| South Korea | 1–2 pages | Yes | Yes | Yes | Listed |
| China | 1–2 pages | Yes | Yes | Yes | Listed |
| India | 2–3 pages | Optional | Yes (common) | Sometimes | Listed |
| Nepal | 2–3 pages | Yes (common) | Yes | Sometimes | Listed |
| Bangladesh / Sri Lanka | 2–3 pages | Yes (common) | Yes | Sometimes | Listed |
| UAE / Gulf (GCC) | 2–3 pages | Yes (common) | Yes | Yes (sometimes) | Listed |
| Nigeria / East Africa | 2–3 pages | Yes (common) | Yes | Sometimes | Listed |
| South Africa | 3–5 pages | Optional | Yes (common) | No | Listed |
| Brazil | 1–2 pages | Optional | Yes (common) | No | On request |
| Academic (global) | No limit | Varies | Varies | No | Full list required |
| Executive / board (global) | 2–3 pages | No | No | No | On request |

Default when market is unknown: UK / international conventions (no photo, no DOB, 2 pages,
"Available on request").

---

## Decision tree

```
User invokes @cv-generator
        |
        v
Source provided? --No--> Run questionnaire (Q1–Q20, one at a time)
        |Yes
        v
LinkedIn URL blocked? --Yes--> Ask for PDF export immediately; do not proceed empty
        |No
        v
Collect all sources --> merge and deduplicate (section 5)
        |
        v
Ask: Purpose? --> Detect or assume seniority (default: mid-level; tell the user)
        |
        v
Select format (section 3c)
        |
        v
Select section order (section 6)
        |
        v
JD provided? --Yes--> Parse JD --> extract and score keywords (section 9)
        |No                  |
        v                    v
Write CV content       Integrate keywords naturally
(sections 7–8)               |
        |<-------------------+
        v
Run anti-hallucination gate (section 10) --> block output until all pass
        |
        v
Run tense enforcement (section 7d) --> block output until all pass
        |
        v
Run banned phrase scan (section 7c) --> fix any found
        |
        v
Output in order:
  Formatted CV (staging draft)
  FlowCV paste-ready version
  Canva paste-ready version
  Missing information checklist
  CV flaw report (scored)
  Improve suggestions
  Suggested file name
        |
        v
Offer cover letter (section 12)
```
