# Platform notes

last-verified: 2026-11-13 · ttl-days: 90 · refresh: search "X Articles who can publish" (X help center), "X article cover image size", "LinkedIn publish article newsletter" (LinkedIn help), and "Gmail clipping message size"; update this file and say so in one line.

Load at Phase 7. The writing is the same everywhere; the build and the launch differ.

## X Article

- **Who can publish:** Premium-tier accounts (X's help page lists Premium and Premium+ subscribers plus Premium Business and Premium Organization accounts). Check the account before promising an X Article.
- **Cover:** shown at about 5:2. Generate wide, keep everything important in the middle band, crop to 5:2.
- **The editor:** headings, bold, italic, links, real numbered and bulleted lists, images, code blocks, dividers. No tables: turn a table into a list and fix any wording that says "rows". Smaller headings than the main subheading may come in as plain text.
- **Links inside the article are fine.** The launch post that shares it is a normal post, so keep that post's own text strong enough to stand without the link.
- Building it in the browser with an agent: `x-articles-build.md` (optional).

## LinkedIn article

- **Any member can publish an article** from the post box ("Write article"). A newsletter is an article series that subscribers get notified about, which reaches past the feed.
- **Cover:** a wide image (16:9 is safe).
- **Launch it with a native post** that makes the point in the first two lines (the part shown before "see more"). A bare link to the article usually reaches fewer people than a native post. A document or carousel post of the core framework is worth testing against the link post.
- Check whether the editor in the account supports code blocks. If not, set prompts as quotes and say "copy this".

## Blog post

- The title becomes the H1; the H2s carry the structure. Route through `/boring-marketing-seo-content` when it needs to rank: title tag, meta description, internal links, Article schema.
- A table of contents helps at this length.
- Put the sources list at the end as a real "Sources" section (links are fine on a blog).

## Newsletter

- **Gmail clips messages over about 102KB** of HTML and hides the rest behind "View entire message". A 4,000-word piece with images often crosses it. Send the first sections in the email with a link to the full web version, or send it plain.
- The subject line is the point, not the title. "Three texts that cut no-shows" beats "Issue 14: Our Guide to No-Shows".
- Test on clicks and replies, never opens (opens are inflated by Apple's mail privacy).
