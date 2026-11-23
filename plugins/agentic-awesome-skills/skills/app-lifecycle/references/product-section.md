# The product section of the agent instructions

**What it is for:** what every session needs to know about *this* product, in the file every session reads. It sits beside the general section (how we build any app) in the product's agent instructions — the `agent-instructions` skill says how that file is laid out and kept lean. When the two disagree, the general section wins on mechanics and the product section wins on product.

**Written at:** stage 0 (the brief), short, with the shape declared. Updated whenever a decision changes what it says.

**Rules**

- **Only what every session needs.** The depth behind it — segments, value propositions, jobs, use cases — is the brief, and the product section restates none of it. The phases and the full status are the plan. Decisions and their options are the decision log.
- **The shape is declared here** and read by every stage (`product-shapes.md`).
- **The data constraints are stated here and nowhere else**; other documents point here. Each is a sentence a migration can be checked against.
- **Status is at most three lines** — the current stage, what is in production, what is waiting on whom — never the story of how it got there. Receipt: a live Q&A product's status section grew until it was most of the file every session reads, and had to be moved out at least four times in four days.

## Skeleton — copy from here

```markdown
# 2. This app — <product name>

This section holds only what every session needs about the product. The brief behind it — segments, value propositions, jobs, use cases — is <brief path>; the phases and their status are <plan path>; the decisions and their options are <decision log path>.

## 2.1 What it is

<Name the product and describe its complete core journey in one short paragraph: who uses it, what they do, and what they get.>

## 2.2 Users

<One line per user group: who they are and how they are identified. Name the payer, if anyone pays, and name the anonymous public if there is one.>

## 2.3 Product shape and reopened defaults

- **Workspace model:** <organization (the default — every workspace is an organization, roles inside it) | individual (the workspace row keyed to one user; no organization management, no second role)>
- **Billing:** <the identity provider's billing (the default — the workspace pays) | none, because the owner makes the product free>. <A product that charges takes the organization shape until a product has built and proven user plans.>
- **Anonymous public:** <yes | no> — visitors who act without an account.
- **Embedded agents:** <yes | no>
- **Member home:** <the route sign-in lands on — /dashboard, or the product's own noun>

Reopened defaults: <for every default choice this product changes — the choice, the trigger that fired, what replaces it, and the dated decision-log entry that holds the options and the reasoning. If it changes none: "None.">

## 2.4 Who can do what

<A table of actor × identity × can × cannot. Then the permission strings. When the product bills, the entitlement (feature) slugs the code gates on, with what each one unlocks.>

## 2.5 Not in scope

<The adjacent capabilities this product deliberately excludes, in a short paragraph or bullets.>

## 2.6 Constraints that shape the data

<The invariants, limits, ownership and lifecycle rules — each a sentence a migration can be checked against. Stated here and nowhere else; other documents point here.>

## 2.7 Status

<At most three lines: the current stage, what is in production, and what is waiting on whom.> The full status and the phases: <plan path>; what past releases shipped: <release history path>.
```

## A filled example, by kind

For a live Q&A product, *What it is* read: a host opens a room and gets a join code; the audience opens the room's link on their phones, with no account, asks questions and upvotes; the host and moderators approve, hide, pin and mark answered; the room updates live; a projector view shows the top questions; when the room closes, the host gets the Q&A by email. Its shape: workspace model *organization*, billing *the provider's*, anonymous public *yes*, embedded agents *no*. Its users, one line each: solo educators and creators (the first customer, an organization of one); small teams running all-hands and community calls (moderators, a paid tier for higher limits); and the audience — anyone with a phone and a code, never signs up, never the customer, always the reason the product works.
