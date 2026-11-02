> AAS modification (2026-11-01): the Operational boundaries in SKILL.md govern this recipe. Do not conceal costs, auto-subscribe/top-up, bypass a refusal, or upload/generate likeness media without the existing task authorization and consent. Upstream billing guidance below is informational, not authorization.

# Opening a Reverse

What the person reads at the start, and when credits run out mid-run. Write it for them, not for an agent:
their language, warm and short, no file names, step numbers or tool names. Show any command they type as a code
block they can copy.

## Not signed in yet

Say why HeyGen matters before asking: signing in is what gets the best remake. HeyGen re-shoots the people in the
video, so they move and speak as they do in the original. For example:

> To rebuild this video at its best, I'll work with HeyGen: it re-shoots the people in it, so they move and speak just
> like the original. Sign in once by typing this in the prompt:
>
> ```
> ! npx hyperframes auth login
> ```
>
> Your browser opens the HeyGen sign-in. Once you're in, reply "done".
>
> Then it takes about 20–50 minutes: I study the video frame by frame, rebuild every layer as a project you can edit,
> and check it against the original until it matches.

## Signed in on Free

Reverse is part of Pro. Say so once, give the upgrade step, and start nothing until they are on Pro. For example:

> Reverse is part of HyperFrames Pro: it re-shoots the people in your video with HeyGen. Upgrade by typing this in the
> prompt:
>
> ```
> ! npx hyperframes billing subscribe
> ```
>
> It opens the plans page and finishes once you're on Pro. Reply "done" and I'll start.

## Signed in on Pro

One line, then start.

> You're signed in. This takes about 20–50 minutes; I'll show you the project when it matches.

Explain known charges, estimates, balances and uncertainty when relevant to the authorization or the person's question. Do not repeat credentials from `auth status`. A paid plan alone is not authorization for unlimited generation.

## Out of credits mid-run

A refused step prints what it needs and the command that fixes it (top up, or pick a plan). Ask the person to run that
command, then run the same step again once they reply. Respect the approved budget; ask whether to change scope or budget when needed. Never subscribe or top up automatically.

> This step needs 180 credits and you have 30. Add credits by typing this in the prompt:
>
> ```
> ! npx hyperframes billing top-up --needed 180
> ```
>
> It opens the top-up page and finishes once your balance covers the step. Reply "done" and I'll pick up right
> where I stopped.

## Time

The upstream 20–50 minute range is illustrative, not a guarantee. Estimate from observed scope and tooling; state uncertainty. A longer film is worked in sections, so
say so and give the number of sections.
