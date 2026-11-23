# The product brief

**What it is for:** who the product is for and what it does for them — segments, value propositions, jobs to be done and use cases. The product section of the agent instructions keeps the one-paragraph summary, the users in one line each, who can do what, scope and the data invariants; **the brief holds the depth behind them and restates none of them.**

**Read it** before planning a phase or a stage, before writing a use case or a flow, and when judging whether a change serves anyone.

**Written at:** stage 0, with the owner. What the owner's idea does not settle becomes an open entry in the decision log, not a guess here. Product-discovery skills can sharpen a draft; what they produce is a draft the owner confirms.

**Rules**

- **Use cases are written here and only here.** Number them; other documents (flows, tests, the plan) point to them by number.
- **The brief describes the product as it is meant to work now.** Where it is going belongs in the strategy, and only once the owner has confirmed it.

## Skeleton — copy from here

```markdown
# Product brief

Who the product is for and what it does for them: segments, value propositions, jobs to be done and use cases. Read it before planning a phase or a stage, before writing a use case or a flow, and when judging whether a change serves anyone. The product section of the agent instructions keeps the one-paragraph summary, the users in one line each, who can do what, scope and the data invariants; this file holds the depth behind them and restates none of them.

## Segments

<The distinct user groups, one bullet each. Name the first customer, and distinguish the payer from any anonymous public.>

## Value propositions

<One bullet per actor: the outcome they get, the alternative they use today, and why this product is worth choosing.>

## Jobs to be done

<The important jobs as "When …, I want …, so …" statements, in the user's voice.>

## The method

<Only when the product implements a published method: its steps in order, a source for each, which source the owner names as the authority and which as the simplification. The use cases below follow this order; the first is the authority's first step, the first thing a new user does.>

## Use cases

<Numbered end-to-end journeys. Each starts with an actor and an action and ends with an observable result. This is the only place they are written; other documents point here by number.>
```

## A filled example, by kind

For a live Q&A product:

- **Segments:** solo educators and creators running cohorts and webinars (the first customer); small teams running all-hands, community calls and conference tracks; the audience — anyone with a phone and a code, never the customer.
- **A value proposition:** for the host, every question in one ranked list instead of a chat scroll, moderation before anything reaches the screen, nothing lost when the session ends — against the incumbent tool, the same core for less, with an API the host's agent can use.
- **A job:** *When I'm presenting, I want questions collected and ranked without watching a chat, so I answer the ones that matter in the time I have.*
- **A use case:** *1. A host opens a room → the audience joins by code on their phones → asks and upvotes → the projector shows the top questions, ranked.*
