# UX writing guide

Contents: 1 Principles · 2 Voice from personas · 3 Message formulas · 4 Component copy states · 5 Copy table rules · 6 Terminology · 7 Persian pack · 8 Channel templates (SMS/email/push/bot) · 9 Review checklist

## 1. Principles (outcome-driven)

Copy exists to move a specific persona to a specific outcome with the least reading. Concretely:

- **Say the outcome, not the mechanism.** "سفارش شما ثبت شد و تا ۲۰ دقیقه‌ی دیگر می‌رسد" beats "Order created successfully". The user wants to know what happens to them next.
- **One idea per line.** Titles ≤ 6 words, body ≤ 2 short sentences, buttons 1–3 words.
- **Verb-first CTAs that name the result**: «پرداخت ۴۵۰٬۰۰۰ تومان», «ارسال کد», «ذخیره‌ی تغییرات» — never «تأیید», «اوکی», «ادامه» alone when a specific verb exists.
- **Errors: what happened + why (if useful) + what to do now.** Never blame; never expose internals; always leave an action. "کد وارد‌شده درست نیست. دوباره تلاش کنید یا کد جدید بگیرید." not "Invalid OTP".
- **Confirmations describe the consequence**, not "are you sure?": «این آیتم برای مشتری‌ها هم حذف می‌شود. حذف کنم؟» with buttons «حذف» / «نگه‌داشتن».
- **Empty states orient and offer one action**: what this place is for, what will appear here, one button that creates the first item.
- **Success confirms the outcome and points to the next step**; don't celebrate ("🎉 Awesome!!!") — inform.
- **Loading says what is happening** when it takes > 1 s ("در حال بررسی پرداخت…"); use skeletons for < 1 s.
- **Reversible beats confirm**: prefer "done + Undo" for reversible actions; reserve dialogs for irreversible or costly ones.
- **Consistency over cleverness**: one word per concept across the product (glossary), same sentence shape for the same kind of message.
- **Numbers, dates, money, phone numbers are formatted by rule**, never ad hoc (see §7 for Persian).
- **No filler**: «کاربر گرامی», "Please note that", "Oops!", "Successfully" add reading and no meaning.
- **Write for the stressed reader**: the person seeing an error is already frustrated; the person paying is anxious. Short, calm, concrete.

## 2. Voice from personas

Derive voice per persona from the persona sheet, then write a tone matrix.

| Persona trait (from section 5) | Copy consequence |
|---|---|
| Low tech comfort / reads slowly | Shorter lines, plain words, one action per screen, explicit next steps, no icons without labels |
| Expert / high frequency | Terse labels, keyboard hints, fewer confirmations, dense tables allowed |
| Under time pressure (shop floor, driving) | Front-load the key fact, large targets, minimal choices |
| Anxious about money or data | Show amounts and consequences before the action, explicit "nothing was charged" on failure, receipts |
| Formal expectation (B2B, older, official) | Formal register («شما», formal verbs), no jokes, no emoji |
| Casual expectation (young consumers, community) | Warmer, lighter, still respectful; emoji only if the design direction allows and never in errors |
| Screen-reader user | Every icon has text, every state change is announced, no meaning by colour alone |

Tone matrix (write it in the blueprint):

```
| Moment | P1 <name> | P2 <name> | P3 <name> |
| First run | … | … | … |
| Core task success | … | … | … |
| Validation error | … | … | … |
| System failure | … | … | … |
| Money moments | … | … | … |
| Destructive action | … | … | … |
| Notifications | … | … | … |
```

## 3. Message formulas

- **Validation error (inline):** `<what is wrong in the field> + <how to fix>` — "شماره باید ۱۱ رقم و با ۰۹ شروع شود."
- **Operation failure:** `<what didn't happen> + <state of their data/money> + <action>` — "پرداخت انجام نشد. مبلغی از حساب شما کم نشده است. دوباره تلاش کنید."
- **Empty state:** `<what lives here> + <what to do first>` — "هنوز سفارشی ندارید. اولین آیتم منو را اضافه کنید تا مشتری‌ها بتوانند سفارش بدهند." + button «افزودن آیتم».
- **Success:** `<outcome> + <next>` — "منو منتشر شد. مشتری‌ها با اسکن QR همین الان می‌بینند."
- **Destructive confirm:** `<consequence, incl. who else is affected> + <question>` + buttons `<verb>` / `<keep>`.
- **Permission/limit:** `<limit reached> + <how to proceed>` — "امروز ۵ بار کد گرفته‌اید. ۱۰ دقیقه‌ی دیگر دوباره تلاش کنید."
- **Offline:** `<you're offline> + <what is saved> + <what happens when back>`.
- **Session expired:** `<what happened> + <nothing lost> + <action>`.

## 4. Component copy states

Every component that shows text has these states specified when applicable: label, placeholder (an example, not a repeat of the label), helper text, inline error(s) — one per failure reason, disabled reason (tooltip or helper), loading, success, empty, counter/limit text. A button has: default, loading («در حال ارسال…»), done, disabled-with-reason. A list has: loading, empty (first use), empty (filtered — "no results for …"), error with retry, end-of-list.

## 5. Copy table rules

- One table per screen (`SCR-nn`) and one per channel (SMS, email, push, in-app notifications, bot). Every state in §4 for every component on the screen has a row — "error message" as a single row is not acceptable; enumerate variants.
- Columns: `ID | Element | Copy (product language) | English gloss | Persona intent | State / variant | Max length | Notes`.
- IDs `CP-SCRnn-k` are referenced from acceptance criteria; changing copy later means changing the row, not the ID.
- Max length is a number derived from the layout (button width, SMS segment, push title limit); the AC tests truncation against it.
- Persona intent is a half-line: what the reader is trying to do at that moment.
- Variables in braces `{amount}`, `{minutes}`, with their formatting rule referenced (e.g., "{amount}: Toman, Persian digits, thousands separator ٬").
- Pluralisation and gender: specify. Persian has no grammatical gender; English glosses avoid gendered pronouns.
- Never leave copy to the build session; an improvised string in code is a defect (Story DoD).

## 6. Terminology

Build the product's UI glossary in section 21: one Persian term and one English term per concept, with rejected synonyms listed ("سفارش" — not "درخواست"; "منو" — not "فهرست"). Use loanwords that Persian users actually use in interfaces when they are dominant in the category (benchmark shows), otherwise Persian equivalents; decide once. The same applies to any product language.

## 7. Persian pack (users in Iran or Persian-speaking)

Typography and characters
- Use Persian letters ی (U+06CC) and ک (U+06A9), never Arabic ي (U+064A) and ك (U+0643). Normalise user input too (edge case EC-INPUT-08).
- Use ZWNJ (نیم‌فاصله, U+200C) correctly: «می‌روم», «کتاب‌ها», «سفارش‌های», «تأیید‌شده» — never a full space or nothing. Search must treat ZWNJ, space and none as equivalent.
- Persian punctuation: «،» «؛» «؟» and «» for quotes; use «٬» (U+066C) as thousands separator and «٫» (U+066B) as decimal separator when showing Persian digits; a regular space before units («۴۵۰٬۰۰۰ تومان»).
- Digits: decide once (DR) — Persian digits (۰–۹) in all human-facing text is the common expectation in the benchmarked category; Latin digits in codes users must type into other systems (tracking codes, OTP if typed cross-device?), IDs, and developer surfaces. Never mix within one number. Inputs accept both and normalise.
- Mixed-direction text: wrap Latin tokens (emails, URLs, codes, brand names) in bidi isolation so punctuation does not jump; test with a string containing Persian + English + digits (EC-L10N-02).
- Font: a well-maintained open Persian web font with Latin glyph coverage, self-hosted (foreign font CDNs may be blocked or slow from Iran — verify), with a fallback stack; line-height slightly larger than Latin defaults; avoid italics (Persian has none); use weight for emphasis.

Register and tone
- Default to «شما» and polite plural verb forms for all personas unless the persona sheet says casual («تو») is expected by the brand and the segment — and then use it consistently.
- Plain, contemporary Persian; avoid heavy Arabic-derived formal vocabulary when a common Persian word exists («لطفاً دوباره تلاش کنید» not «مجدداً اقدام فرمایید»).
- Drop honorific filler («کاربر گرامی»، «با تشکر از شکیبایی شما») unless a formal B2B persona expects it.
- No exclamation stacking, no emoji in errors or money moments.

Formats
- Dates: Jalali in UI («۱۴۰۵/۰۶/۱۴» or «۱۴ شهریور ۱۴۰۵» — decide once), stored as UTC timestamps; Gregorian only where a foreign counterpart needs it. Relative dates («امروز»، «دیروز»، «۳ روز پیش») follow one rule. Month lengths (31/30/29–30 in Esfand) and leap years handled by a verified library, tested for the current and next year.
- Times: 24-hour, Asia/Tehran, DST policy verified; show timezone only for cross-country cases.
- Money: decide Toman vs Rial once (DR) and always label the unit; thousands separator; no decimals; for large sums the category may use «هزار تومان» shorthand — decide and be consistent.
- Phone: display as «۰۹۱۲ ۳۴۵ ۶۷۸۹» (grouping decided once), accept «+98…», «0098…», Persian digits, spaces, dashes; store E.164.
- Addresses: province, city, street, plaque («پلاک»), unit («واحد»), postal code (10 digits) — field order and labels as the category norm.
- National ID (کد ملی): 10 digits, check-digit validated if collected; show why it is needed.
- Week: Saturday is the first weekday; Friday is the weekend day (Thursday partial in many segments) — pickers, "this week" and scheduling copy follow this.

Messaging realities
- SMS in Persian is Unicode-encoded: segment length is far shorter than Latin SMS (verify provider's limits); OTP templates fit in one segment and lead with the code; include the app name; avoid links unless required.
- Telegram is widely used under filtering; domestic messengers vary by segment — the channel choice comes from research, and copy is written per channel.

## 8. Channel templates

Provide rows for each channel with the same table format:

- **SMS**: OTP (code first, app name, expiry), order/status updates (what changed + next), reminders; max length = one segment.
- **Email** (if used): subject ≤ 50 chars, preheader, body, single CTA, plain-text variant.
- **Push/in-app notification**: title ≤ 40 chars, body ≤ 90 chars, deep link target `SCR-nn`, quiet-hours rule.
- **Bot messages** (Telegram/Bale/…): message text, keyboard button labels, fallback for unknown input, /start onboarding sequence.

## 9. Review checklist for every copy table

- Every state of every component on the screen has a row.
- No adjectives about the system's own quality ("easily", "quickly", "seamlessly").
- Every error names an action.
- Every destructive confirm names the consequence and uses verb buttons.
- Digits, dates, money, phone follow the format rules; variables carry a formatting reference.
- Register consistent with the tone matrix for the persona(s) on this screen.
- Max length set and realistic for the layout/channel.
- Terms match the glossary; no synonyms.
- English gloss present so the coding agent understands intent.
