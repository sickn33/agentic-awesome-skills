---
name: developer-advocacy
description: When the user wants to do developer advocacy activities including conference talks, live coding, podcasts, and building in public. Trigger phrases include "developer advocacy," "devrel," "conference talk," "CFP," "call for papers," "live coding," "podcast," "building in public,"...
risk: unknown
source: https://github.com/jonathimer/devmarketing-skills/tree/main/skills/developer-advocacy
source_repo: jonathimer/devmarketing-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/jonathimer/devmarketing-skills/blob/main/LICENSE
---

# Developer Advocacy
## When to Use

Use this skill when you need when the user wants to do developer advocacy activities including conference talks, live coding, podcasts, and building in public. Trigger phrases include "developer advocacy," "devrel," "conference talk," "CFP," "call for papers," "live coding," "podcast," "building in public,"...


This skill helps you with developer advocacy activities: conference talks, live coding demos, podcast appearances, and building in public. Covers talk proposals, demo prep, social presence, and measuring impact.

---

## Before You Start

**Load your audience context first.** Read `.agents/developer-audience-context.md` to understand:

- Who you're trying to reach (conferences they attend, podcasts they listen to)
- What topics resonate (pain points, interests)
- Your product's positioning (what story to tell)
- Voice & tone (how formal/technical to be)

If the context file doesn't exist, run the `developer-audience-context` skill first.

---

## Conference Talks

### Finding the Right Conferences

| Conference Type | Best For | Examples |
|-----------------|----------|----------|
| **Large industry** | Brand awareness, reach | KubeCon, AWS re:Invent, React Summit |
| **Regional** | Local community, accessible | Local meetups, city tech conferences |
| **Niche** | Targeted audience, expertise | GraphQL Conf, RustConf |
| **Company-hosted** | Ecosystem presence | Vercel Ship, GitHub Universe |
| **Unconferences** | Community connection | BarCamps, DevOpsDays |

### Talk Proposal (CFP) Framework

**The winning formula:**
```
Specific Problem + Unique Angle + Clear Takeaways = Accepted Talk
```

**CFP Template:**

```markdown
# Title
[Action verb] + [specific outcome] + [with/using what]
Example: "Building Real-Time Features with Edge Functions and WebSockets"

# Abstract (100-200 words)
[Hook: Problem or curiosity gap]
[What you'll cover]
[What attendees will learn/be able to do]

# Description (detailed, for reviewers)
[Problem context]
[Why this approach]
[Talk structure]
[Your credibility to give this talk]

# Outline
- [Time] Introduction / Problem statement
- [Time] Section 1
- [Time] Section 2
- [Time] Section 3
- [Time] Live demo / walkthrough
- [Time] Key takeaways / Q&A

# Audience
[Who this is for]
[Prerequisite knowledge]
[What they'll learn]

# Bio
[Your relevant experience]
[Why you're qualified]
```

### Title Patterns That Work

| Pattern | Example |
|---------|---------|
| **How I X** | "How I Reduced Deploy Time by 80%" |
| **X in Y Minutes** | "Kubernetes Security in 15 Minutes" |
| **The X of Y** | "The Psychology of Error Messages" |
| **Beyond X** | "Beyond Console.log: Modern Debugging" |
| **X for Y** | "GraphQL for REST Developers" |
| **Lessons from X** | "Lessons from 1000 Production Outages" |

### Talk Types

| Type | Length | Best For |
|------|--------|----------|
| **Lightning** | 5-10 min | Single concept, quick demo |
| **Standard** | 25-45 min | Technical deep-dive |
| **Keynote** | 45-60 min | Big picture, inspiring |
| **Workshop** | 2-4 hours | Hands-on learning |
| **Panel** | 30-60 min | Discussion, multiple perspectives |

### Talk Prep Checklist

| Phase | Tasks |
|-------|-------|
| **2 months before** | Outline, start slides, test demos |
| **1 month before** | Draft complete, first practice run |
| **2 weeks before** | Slides polished, demos solid, practice 3x |
| **1 week before** | Record yourself, get feedback, finalize |
| **Day before** | Test all tech, backup slides, rest |
| **Day of** | Arrive early, test A/V, hydrate |

---

## Live Coding & Demos

### The Demo Danger Zone

| Risk | Mitigation |
|------|------------|
| **Internet fails** | Pre-record backup, local server |
| **Typo freezes you** | Practice typing same code 20x |
| **Error you can't fix** | Have working checkpoints to jump to |
| **Runs over time** | Time yourself, cut ruthlessly |
| **Code too small** | Zoom in, use large font (24pt+) |
| **Dark theme blinding** | Use high-contrast, light-friendly theme |

### Demo Prep Framework

**The 10-3-1 Rule:**
- Run your demo **10 times** in practice
- Have **3 checkpoints** you can jump to if stuck
- **1 backup** (video recording of it working)

**Pre-demo checklist:**
- [ ] Close unnecessary apps
- [ ] Clear browser history/tabs
- [ ] Notifications OFF (Slack, email, calendar)
- [ ] Font size: 24pt+ for terminal, 20pt+ for editor
- [ ] Git stash/branch for clean starting point
- [ ] Environment variables ready
- [ ] Test on the actual projector/screen if possible

### Live Coding Tips

| Tip | Why |
|-----|-----|
| **Type slowly** | Audience needs to follow |
| **Narrate what you type** | "I'm creating a new handler..." |
| **Explain errors** | "This error means X, let me fix it" |
| **Use snippets** | For boilerplate, not core concepts |
| **Show the result** | Always run the code, show output |
| **Checkpoint commits** | `git checkout checkpoint-1` |

---

## Podcast Guesting

### Finding Podcasts

| Approach | How |
|----------|-----|
| **Direct search** | "top [your tech] podcasts" |
| **Guest networks** | Podmatch, Matchmaker.fm |
| **Peer asks** | "What podcasts do you listen to?" |
| **Twitter search** | "[topic] podcast episode" |
| **Listen Notes** | Podcast search engine |

### Pitch Template

```
Subject: Guest Idea: [Specific Topic] for [Podcast Name]

Hi [Host Name],

I've been listening to [Podcast] for [time] — loved your episode on [specific episode].

I'd love to come on and talk about [specific topic]. Here's the angle:

[2-3 sentences on what you'd discuss and why it matters to their audience]

A bit about me:
- [Relevant credential 1]
- [Relevant credential 2]
- [Link to past podcast/talk]

Would this be a fit?

[Your name]
```

### Pre-Podcast Prep

| Prep Item | Details |
|-----------|---------|
| **Research the show** | Listen to 2-3 episodes, understand format |
| **Research the host** | Their interests, style, Twitter |
| **Prep talking points** | 3-5 main things you want to say |
| **Prep stories** | Specific examples, not generalities |
| **Audio setup** | Good mic, quiet room, headphones |
| **Water nearby** | You'll be talking a lot |

### During the Podcast

| Do | Don't |
|----|-------|
| Tell stories with specifics | Give generic advice |
| Pause before answering | Um and ah nervously |
| Disagree respectfully | Always agree to be polite |
| Promote subtly | Hard sell your product |
| Be concise | Ramble without structure |
| Show enthusiasm | Be monotone |

### Post-Podcast

| Action | Timing |
|--------|--------|
| Thank the host | Same day |
| Share when published | Immediately |
| Engage with comments | First week |
| Cross-promote | Your newsletter, blog |
| Stay in touch | Ongoing relationship |

---

## Building in Public

### What to Share

| Category | Content Ideas |
|----------|---------------|
| **Progress** | "Shipped X today, here's what I learned" |
| **Challenges** | "Stuck on X, tried Y and Z, here's what worked" |
| **Decisions** | "Why we chose X over Y" |
| **Metrics** | Revenue, users, growth (transparently) |
| **Behind scenes** | Team, process, tools |
| **Learnings** | "Mistake we made and how we fixed it" |

### Build in Public Formats

| Format | Platform | Cadence |
|--------|----------|---------|
| **Tweet thread** | Twitter/X | Daily-weekly |
| **Changelog** | Blog, Notion, website | Weekly |
| **Indie hacker posts** | Indie Hackers, HN | Monthly |
| **Video update** | YouTube, Loom | Weekly-monthly |
| **Newsletter** | Email | Weekly |
| **Livestream** | Twitch, YouTube | Weekly |

### What NOT to Share

| Avoid | Why |
|-------|-----|
| **Customer data** | Privacy, trust |
| **Team conflicts** | Professionalism |
| **Security details** | Vulnerability |
| **Competitor attacks** | Looks petty |
| **Venting** | Not productive |

---

## Social Presence (Twitter/X)

### Developer Twitter Playbook

| Content Type | % of Posts | Example |
|--------------|------------|---------|
| **Value content** | 60% | Tips, tutorials, insights |
| **Engagement** | 20% | Replies, retweets with commentary |
| **Personal** | 10% | Behind-the-scenes, personality |
| **Promotion** | 10% | Your product, talks, content |

### Tweet Formats That Work

| Format | Example |
|--------|---------|
| **Thread** | "10 things I learned building X" |
| **Hot take** | "Unpopular opinion: [opinion]" |
| **Quick tip** | "TIL: You can do X by..." |
| **Question** | "What's your favorite way to..." |
| **Meme/humor** | Tech jokes, relatable content |
| **Showcase** | "Just shipped X, here's how it works" |
| **Appreciation** | "Shoutout to @person for..." |

### Engagement Strategy

| Action | Frequency |
|--------|-----------|
| Tweet original content | Daily |
| Reply to others | 5-10x daily |
| Quote tweet with value | 2-3x weekly |
| DM interesting people | Weekly |
| Join Twitter Spaces | As relevant |

### Growing Your Presence

| Tactic | Implementation |
|--------|----------------|
| **Consistency** | Post daily, engage daily |
| **Niche down** | Be known for ONE thing first |
| **Reply game** | Add value to big accounts' tweets |
| **Collaborate** | Twitter Spaces, threads together |
| **Cross-promote** | Newsletter, talks, blog |

---

## Measuring Impact

### Advocacy Metrics

| Activity | Metrics |
|----------|---------|
| **Talks** | Attendees, feedback scores, recording views |
| **Content** | Views, shares, engagement |
| **Social** | Followers, engagement rate, reach |
| **Podcasts** | Listener estimates, traffic spikes |
| **Community** | Growth, engagement, sentiment |

### Attribution Challenges

Developer advocacy impact is notoriously hard to measure. Proxy metrics:

| Signal | What It Indicates |
|--------|-------------------|
| **Traffic spikes** | Content/talk/podcast drove visits |
| **"How did you hear about us?"** | Direct attribution |
| **Social mentions** | Brand awareness |
| **Inbound leads quality** | Community-qualified leads |
| **Conference invites** | Growing reputation |

### Reporting Framework

Monthly advocacy report:

```markdown
# Developer Advocacy Report - [Month]

## Talks & Appearances
- [Talk 1]: [Conference], [Attendees], [Link]
- [Podcast 1]: [Show], [Episode link]

## Content Published
- [Article 1]: [Views], [Engagement]
- [Video 1]: [Views]

## Social Growth
- Twitter: +X followers, Y impressions
- Notable tweets: [Links]

## Community
- Discord/Slack: +X members, Y messages
- Notable threads/discussions

## Learnings
- What worked: [X]
- What didn't: [Y]
- Trying next: [Z]
```

---

## Advocacy Career Path

### Role Levels

| Level | Focus |
|-------|-------|
| **Junior DA** | Content creation, community support, talk prep |
| **Developer Advocate** | Talks, own content strategy, community building |
| **Senior DA** | Strategy, mentoring, major conferences |
| **Staff DA** | Cross-company impact, industry thought leadership |
| **Head of DevRel** | Team building, strategy, executive alignment |

### Skill Development

| Skill | How to Develop |
|-------|----------------|
| **Public speaking** | Meetups, Toastmasters, practice |
| **Writing** | Blog consistently, get feedback |
| **Video** | YouTube, live streaming, improve iteratively |
| **Technical depth** | Build projects, contribute to OSS |
| **Community** | Moderate, organize events, connect people |

---

## Tools

| Tool | Use Case |
|------|----------|
| **[Octolens](https://octolens.com)** | Monitor your name/brand across GitHub, Twitter, Reddit, HN, Stack Overflow. Track conference mentions. Find podcast opportunities. Measure share of voice. |
| **Cal.com / Calendly** | Schedule podcast appearances |
| **StreamYard** | Live streaming setup |
| **Descript** | Video/podcast editing |
| **Canva / Figma** | Slides and graphics |
| **Otter.ai** | Transcription for talks |
| **Notion** | Talk prep, content calendar |
| **Buffer / Typefully** | Social scheduling |

---

## Related Skills

- `developer-audience-context` — Know who you're reaching
- `devrel-content` — Written content strategy
- `community-building` — Community management
- `open-source-marketing` — OSS-specific advocacy
- `hacker-news-strategy` — HN engagement

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
