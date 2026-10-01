# Intake — asking the right questions once

The intake exists for one reason: a hundred-page blueprint built on a wrong assumption about the users, the platform, the money or the constraints is a hundred wasted pages. The intake is *not* an interview; it is one well-prepared batch of questions, each with a default, that the user can answer in two minutes or wave through with "defaults".

## Rules

1. **Warm up before asking.** Run 2–5 searches on the idea first (category name, "<idea> app", "<idea> Iran" if the market looks Iranian, the closest known product). You will ask sharper questions ("closest to Snapp Food's model or to a QR-menu like Menu.ir?") and you will not ask things the market already answers.
2. **Mine the message first.** Anything stated or clearly implied is not asked again. Language, currency, city, named services, named stack, named platform, named users — all count as answered.
3. **One batch.** All questions in a single message, grouped under short headers, numbered, each with `(default: …)`. End with one line: "Answer what you like; 'defaults' accepts all the defaults." Where a tappable-options tool exists, put the closed questions in it and the open ones in prose right below.
4. **Only architecture-, persona- or scope-changing questions.** If the answer would only change a detail you can put in the Assumptions table, don't ask — assume and tag `[ASSUMED]`.
5. **Size the batch to the idea.** Whole product: 10–15 questions. Feature or internal tool: 3–6. Never more than 15; if you have more, the leftovers become assumptions.
6. **Defaults must be the choice you would actually make**, not a placeholder. If you would pick phone-OTP login for Iranian consumers, the default says so.
7. **Ask in the user's language.** Keep each question to one line; put the reason in a half-line only when it isn't obvious.

## Market detection cues (decide the working hypothesis, then confirm)

Iranian users are likely when the message has any of: Persian text, تومان/ریال/IRR, Iranian place names, Iranian services (Snapp, Digikala, Tapsi, Shaparak, Zarinpal, IDPay, Kavenegar, Bale, Eitaa, Rubika, Bazaar, Myket…), `.ir`, Jalali dates (۱۴۰۴/…), کد ملی, "کاربر ایرانی", or a Persian product name. Then the question is a one-line confirmation:

> کاربرهای اصلی داخل ایران هستن؟ (default: بله — RTL، تقویم جلالی، پرداخت داخلی، ورود با شماره موبایل)

Do the same for any other market the message reveals (Arabic → Gulf/MENA?, Turkish → Turkey?, mentions of GDPR → EU?). If nothing reveals a market, ask.

## Question bank

Pick from these groups. Skip any group the message already covers. The defaults shown are the ones to use unless the warm-up research says otherwise.

### A. Product and scope
- One sentence: what outcome does the user get that they can't get today? (default: your own reading from the message — state it and ask them to correct it)
- Which of these is in v1, which is later? List 3–6 candidate capabilities you inferred; ask them to strike/mark. (default: the smallest set that delivers the outcome)
- Platform: web app / PWA / native iOS / native Android / Telegram (or Bale/Eitaa) bot / desktop / CLI / API only / several. (default: whatever the benchmark shows the market uses; for Iranian consumers usually PWA or Android-first web)
- Is this a standalone product, a feature inside an existing product, or an internal tool? (default: standalone)

### B. Users and market
- Primary users in one line each — you propose 2–4 based on research; ask them to confirm/rename/remove. (default: your proposal)
- Market/country and language(s) of the UI. (default: detected market; Persian UI with English fallback if Iranian)
- B2C, B2B, or B2B2C? Who pays vs who uses? (default: inferred)
- Device and network reality: low-end Android / poor connectivity / desktop office / mixed. (default: mid-range Android on unstable mobile data for Iranian consumers; desktop Chrome for internal tools)
- Accessibility requirements beyond a sane baseline (screen readers, low vision, motor)? (default: WCAG AA baseline, no special mandate)
- Products they admire or want to beat. (default: the benchmark leaders you found)

### C. Business and compliance
- Monetization: free / one-off / subscription / commission / ads / internal (none). (default: inferred from benchmark; "none" for internal tools)
- Payments needed in v1? Which gateway, if they have one? (default: yes if money changes hands; Iran → a Shaparak-licensed gateway to be verified in research; abroad → to be verified)
- Regulated domain (health, finance, minors, personal data at scale)? (default: no; if yes, a Legal/Compliance open question is created, never answered)

### D. Technical constraints
- Preferred or forbidden languages/frameworks/databases/clouds. (default: none — the stack is chosen by the agentic-engineering criteria)
- Hosting: inside Iran (which provider?) / foreign VPS / managed cloud / on-prem / don't know. (default: Iranian users → hosting reachable without VPN from Iran, to be verified; otherwise a mainstream managed platform)
- Existing systems or APIs to integrate (CRM, ERP, Google Workspace, Telegram, existing DB)? (default: none)
- Login model: phone OTP / email + password / social / SSO / none (single user). (default: phone OTP for Iranian consumers; email for B2B abroad; SSO for internal tools)
- Data sensitivity and retention needs. (default: personal data present → encryption at rest, PII in logs forbidden, deletion on request)
- Expected scale in year one (users/day, records, media volume). (default: small — single region, single DB; note the scale ceiling in Non-goals)
- Offline or real-time requirements? (default: neither)

### E. Design
- Do you have a design reference (Figma, screenshots, a product to mimic, brand colours/fonts)? (default: none → the skill chooses a minimal, mobile-first direction and names it in the Decision brief)
- Dark mode required? (default: no in v1 unless the platform norm requires it)

### F. Delivery and document
- Who builds and with what: solo + Claude Code / solo + Codex / small team / mix. (default: solo with a coding agent)
- One epic per session is the working model — are sessions short (≈1–2 h) or long (half-day)? This sets epic size. (default: half-day → epics of 3–7 stories)
- Deadline or milestone (closed beta, public launch, demo)? (default: none — order by dependency and value)
- Document language: prose in your language + English for stories/AC (default) / all English / all Persian.
- Test rigour: unit + integration only / plus end-to-end for critical flows / plus performance & security gates. (default: unit + integration everywhere, e2e on the 3–5 critical flows)
- Deployment target for v1 (staging + prod? CI/CD required?). (default: one staging, one production, CI running `check` on every push)

### G. Content and data
- Seed content or migration from an existing system? (default: none beyond fixtures)
- Admin/back-office needs in v1 (manage users, content, refunds)? (default: a minimal admin for whatever the core loop creates)

## After the answers

- Restate each answer as a decision in your notes with `[STATED]`.
- Each skipped question becomes an `[ASSUMED — <one-clause reason>]` row.
- Anything the user said that contradicts the warm-up research is *not* silently overruled: note it, and raise it in the Decision brief with the evidence.
- Do not ask follow-ups unless an answer is self-contradictory or blocks the architecture (e.g., "native iOS only" plus "no Apple developer account"). One follow-up message at most; then move to research.

## Example intake (Persian, whole product, market detected)

```
چند سوال کوتاه قبل از ریسرچ عمیق — هر کدوم رو خواستی رد کن، «پیش‌فرض» یعنی همه‌ی پیش‌فرض‌ها قبول.

**محصول**
1. خروجی اصلی برای کاربر رو این‌طور فهمیدم: «…». درسته؟ (پیش‌فرض: بله)
2. کدوم‌ها توی نسخه‌ی اول باشه؟ الف) … ب) … ج) … د) … (پیش‌فرض: الف، ب، ج)
3. پلتفرم: PWA وب / اپ اندروید / بات بله‌–تلگرام / همه (پیش‌فرض: PWA موبایل‌محور)

**کاربرها**
4. کاربرها داخل ایران هستن؟ (پیش‌فرض: بله → RTL، تقویم جلالی، پرداخت داخلی، ورود با شماره موبایل)
5. دو پرسونای اصلی که پیدا کردم: «…» و «…». پرسونای دیگه‌ای هست؟ (پیش‌فرض: همین دو)

**کسب‌وکار**
6. مدل درآمد: … (پیش‌فرض: کمیسیون)
7. درگاه پرداخت مشخصی دارید؟ (پیش‌فرض: یکی از درگاه‌های دارای مجوز شاپرک — در ریسرچ بررسی می‌شه)

**فنی**
8. زبان/فریم‌ورک/دیتابیس ترجیحی یا ممنوع؟ (پیش‌فرض: هیچ — انتخاب با معیارهای Agentic Engineering)
9. هاست داخل ایران یا خارج؟ (پیش‌فرض: داخل ایران / قابل‌دسترس بدون VPN)
10. سیستم موجودی هست که باید وصل بشیم؟ (پیش‌فرض: خیر)

**دیزاین و تحویل**
11. رفرنس دیزاین (فیگما، اسکرین‌شات، محصول نمونه)؟ (پیش‌فرض: هیچ → خودم مینیمال و موبایل‌فرست انتخاب می‌کنم)
12. هر سشن Claude Code/Codex چقدر طول می‌کشه؟ کوتاه (۱–۲ ساعت) یا نیم‌روز؟ (پیش‌فرض: نیم‌روز → اپیک‌های ۳–۷ استوری)
13. زبان سند: نثر فارسی + استوری/AC انگلیسی (پیش‌فرض) / همه انگلیسی / همه فارسی
```
