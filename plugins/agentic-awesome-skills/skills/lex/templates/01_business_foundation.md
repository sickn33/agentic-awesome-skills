---
name: business-foundation
description: Agent templates governing structural creation, operation, and equity of corporate entities.
jurisdictions: [USA, Canada, EU]
---

# Business Foundation & Governance Templates

These templates act as the "birth certificates" of a business entity. When drafting these for a user, cross-reference the jurisdiction metadata.

## Official References
- **USA:** [SBA - Choose a Business Structure](https://www.sba.gov/business-guide/launch-your-business/choose-business-structure)
- **Canada:** [Corporations Canada](https://ised-isde.canada.ca/site/corporations-canada/en) | [CBCA](https://laws-lois.justice.gc.ca/eng/acts/c-44/)
- **EU (Granular):** [N-Lex National Databases](https://n-lex.europa.eu/) | [EUR-Lex Company Law](https://eur-lex.europa.eu/)

## Contract Types & Nuances

| Contract Type | USA Context | Canada Context | EU Context |
|---------------|-------------|----------------|------------|
| **Operating Agreements (LLC)** | Essential document. Governs internal logic of LLCs. Highly variable by state (e.g., Delaware vs. California). | LLCs do not exist inherently in Canada; use Shareholder/Partnership agreements or ULCs depending on province. | "LLC" equivalents (e.g., GmbH in Germany, SARL in France, s.r.o. for Czech Republic) require highly formalized AoA/Statutes. |
| **Shareholders’ Agreements** | Common in C-Corps and S-Corps. Governs equity boundaries, Board seating, and vesting. | Very common under CBCA/OBCA. Often explicitly addresses unanimous shareholder agreements (USA) stripping director powers. | Strictly governed by local corporate codes. Often intersects heavily with statutory pre-emption rights. |
| **Partnership Agreements** | Standard for General (GP), Limited (LP), or Limited Liability Partnerships (LLP). | Similar to US. Governed by provincial Partnership Acts. | Variable. In some states, partnerships possess separate legal personality; in others, they do not. |
| **Articles of Association (AoA)** | Generally termed "Articles of Incorporation" or "Certificate of Formation". Public facing but minimal. | Required foundational document for corporations. Standardized model articles often used. | The required, comprehensive public-facing "rulebook". Must heavily align with EU Company Law Directives and national commercial registers. |

## Agent Instructions
When an end-user requests a company formation document:
1. Ask for the specific jurisdiction (State/Province/Country).
2. For EU-specific requests (e.g., Czech Republic), use **N-Lex** to find the specific national Commercial Register rules.
3. Extract the entity type (LLC, Corp, GmbH, s.r.o., etc.).
4. Reference the metadata array above to structure the document.
