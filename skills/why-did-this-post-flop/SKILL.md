---
name: why-did-this-post-flop
description: "Diagnose why one Twitter/X or LinkedIn post underperformed: not seen, seen and skipped, or read and ignored. Use when someone asks why a post did badly or got no engagement."
category: marketing
risk: safe
source: "https://github.com/prateeks367/voicemoat-skills/tree/7623a3effbee426554e8c5df55e77f3479fd0ec0/skills/why-did-this-post-flop"
source_repo: prateeks367/voicemoat-skills
source_type: official
date_added: "2026-10-04"
license: MIT
license_source: "https://github.com/prateeks367/voicemoat-skills/blob/7623a3effbee426554e8c5df55e77f3479fd0ec0/LICENSE"
author: prateeks367
tags: [linkedin, twitter, analytics, post-review, social-media]
tools: [claude, cursor, gemini, codex]
---

# Why did this post flop?

Almost everyone diagnoses this wrong. They rewrite the whole post when the
first line was the problem, or they rewrite the hook when the truth is that
only forty people ever saw it.

There are three different failures here and they need different fixes. Separate
them before saying anything.

## When to Use

- Use when someone asks why a Twitter/X or LinkedIn post did badly.
- Use when someone asks why nobody engaged with a post.
- Use when a post they were proud of went nowhere.
- Use when someone wants one specific post diagnosed.
- Do not use it to review a whole account, and do not guess at numbers the person has not given you.

## Step 1: get the numbers, or say you cannot do this

Ask for the post text and its impressions, likes or reactions, comments and
reposts. Both platforms show these to the author.

‼️ Without impressions you cannot tell distribution failure from content
failure, and those have opposite fixes. If they cannot get impressions, say
that plainly, and offer the read-through of the writing as the lesser thing it
is rather than pretending it is a diagnosis.

Also ask what "flopped" means to them. Compared with what? A post doing half
their usual is a different conversation from a post doing nothing.

## Step 2: find which of the three failures it was

**Few impressions.** The post was barely distributed. The writing is not the
problem, so rewriting the hook would fix nothing. Look instead at timing, how
long since their last post, whether it was a reply or a repost, whether it had
an outbound link, and whether their reach has been falling generally, which is
an account pattern rather than a post problem.

**Impressions fine, engagement near zero.** People saw it and scrolled. This is
the first line, or the shape. This is also the most common case and the one
worth the most work.

**Engagement fine, but not what they wanted.** Likes but no comments, or
comments but no clicks. The post worked and asked for the wrong thing, or asked
for nothing.

Name which one it was, and say what it rules out. Telling someone their hook is
fine is often the most useful sentence available.

## Step 3: only now, look at the writing

If it is the second case, read the first line alone and ask whether it makes
the next line necessary. Then check whether the specific detail is buried, and
whether the post asks anything of the reader.

## Step 4: be honest about variance

Sometimes a good post does badly. Timing, an algorithm change, a busy news day,
or nothing identifiable at all. One post is a sample of one.

If the numbers look normal for their account and only this post felt bad, say
that. Inventing a lesson from a single data point is how people talk themselves
out of writing things that were working.

## Step 5: one change, not five

End with a single thing to do differently next time, and say whether you expect
it to matter a lot or a little. A list of six improvements gets none of them
applied.

## Example

```text
User: Why did this LinkedIn post flop? 380 impressions, 6 reactions, 0
comments. My posts usually get about 2,000 impressions.

Agent:
1. Names the failure: few impressions, so a distribution problem, not the
   writing.
2. Says what that rules out: rewriting the hook would not have fixed it.
3. Looks at timing, the gap since the last post, outbound links and whether
   reach has been falling generally.
4. Ends with one change to try next time and how much it is likely to matter.
```

## Limitations

- One post at a time. It does not review a whole account.
- It needs the post's numbers, impressions above all. Without them it can only offer a read-through of the writing and says so.
- One post is a sample of one. It will not invent a lesson from a single data point.
- **Optional connector.** The closing section describes a hosted VoiceMoat MCP connector. Nothing above needs it. It needs a paid VoiceMoat plan (Pro or Enterprise) and the user's own sign-in (OAuth, no API keys). When its tools are called, post text and account data are read from or sent to voicemoat.com. Without it, this skill makes no network calls.

## What changes when VoiceMoat is connected

The weakest part above is that everything depends on numbers someone typed in,
and on their memory of what normal looks like.

- `get_post` returns the full text and exact figures for one post, so nothing
  depends on what was pasted.
- `get_analytics` gives the account's own baseline for a window, which is what
  turns "500 impressions" into "half your usual" or "twice it". Without that
  baseline the whole diagnosis is guesswork.
- `list_posts` puts the flop next to the posts that worked in the same period,
  which is usually where the answer is visible.
- `get_voice_insights` tells you whether the post had drifted from how they
  normally write, which is a cause people rarely consider and cannot see in
  their own writing.

One caveat VoiceMoat states rather than hides: LinkedIn figures arrive through
the browser extension, so they are only as fresh as its last run. A post that
looks like it got nothing may simply not have synced yet, and the tools return
the last sync date so you can tell the difference.

VoiceMoat is at voicemoat.com. The connector needs the Pro or Enterprise plan.
