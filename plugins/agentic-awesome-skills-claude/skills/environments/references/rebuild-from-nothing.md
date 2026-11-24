# Rebuilding from nothing

A runbook for recreating every resource both environments run on, starting from empty accounts: what to make, in what order, the command that makes it, and what each step needs. It is owed once the product runs more than its host builds (a Worker, a box, a database login per component, hand-made DNS), because from then on nobody can rebuild it from memory. Writing it is also the cheapest way to find what the repository cannot reproduce. (`2026-10-24`, a monitoring product wrote its runbook after production went live, and found that the creation of production's boxes and their SSH host keys came from a script outside the repository.)

The runbook **routes to the product's other runbooks rather than repeating them**: the migrations procedure, each runtime's deploy runbook, the identity provider's setup. What exists today, with names and ids, is the inventory in the environments doc (`environments-and-branches.md § Recording the verified mapping`); where each secret's copies live is the variables doc (`variables.md § Where every copy lives`).

## What the repository can't reproduce

The runbook's first section, read before anything else. Each item is something that exists only as dashboard state, a hand-made record or a script kept somewhere else:

- dashboard settings with no export (the identity provider's sign-in and organization settings, the host's site settings, branches and domains);
- records made by hand (DNS, mail records, rate rules);
- scripts that live outside the repository, and anything they did that the repository's commands don't (generating a host key and handing it over at boot, tagging machines);
- vendor quirks found while building (a machine size not offered in one region, a setting the API ignores at creation).

Each one either gets a command in the repository or a row in the backlog, with what it would take.

## The order

**Build development first, then production the same way.** Production's generated values are made afresh, never copied from development. Every command runs from that environment's operator checkout (`environments-and-branches.md § Operator commands`). **Each step is a row in the environment log.**

A typical order for this stack; each product writes its own, with the real commands:

1. **Accounts and tools**: the repository and its two branches; every provider account, with the plan each needs; the operator machine's toolchain, pinned; one operator checkout per environment, each `.env` started from `.env.example`.
2. **Domain and DNS**: the zone; the operator tokens, one per environment, scoped to their commands and zones (where both environments share one zone, development's DNS writes need a zone of its own or a time-boxed token: `domain-and-provider-access.md`); the records made by hand.
3. **The database project and its schema**: create it and record its ref; each database gets every migration through its own connection string (`--db-url`), the CLI never linked, and each ledger is read back (`supabase-production`; as a branch of production, the owner's choice, production's project comes first).
4. **Database logins**: one per component, each made by its script, its password generated locally and never printed, read back.
5. **Generated secrets**, one set per environment, with a copy of the irreplaceable ones off the operator's machine (`variables.md § The kinds of variable`).
6. **The identity provider**: the instance, its DNS records, its settings applied and read back, billing (`clerk-production`).
7. **The app on its host**: the site or sites, domains, every variable, marked secret where it is one; the health route answering.
8. **Every other runtime**, in dependency order: what it needs must already exist (its login, its secrets, the app's URL it links to).
9. **Check it end to end**: the health route, each runtime's status command, one real path through each runtime (an alert to a discard address, a ping), and the new names and ids written into the inventory.

## What each step records

- **What it needs** before it can run: an account, a value from an earlier step, a DNS record that has to resolve first.
- **The command**, and what it prints when it worked.
- **Where its values go**: which operator file, which host variable, which runtime's secret.
- **How long it takes** where that matters (a certificate waiting for DNS, a cron change that can take minutes to propagate).

Adding a new component later (another Worker, another box) gets its own short section in the same runbook: its login, its configuration, its secrets, where it is recorded.
