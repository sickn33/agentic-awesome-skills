---
name: employment-workforce
description: Agent templates governing hiring, independent contractors, restrictive covenants, and IP assignment.
jurisdictions: [USA, Canada, EU]
---

# Employment & Workforce Templates

These templates dictate the relationship between a business and its workforce. This domain exhibits the highest variance across global jurisdictions.

## Official References
- **USA:** [Department of Labor (DOL)](https://www.dol.gov/)
- **Canada:** [Canada Labour Code & Standards](https://www.canada.ca/en/services/jobs/workplace/federal-labour-standards.html)
- **EU (Granular):** [N-Lex Employment Laws](https://n-lex.europa.eu/) | [Working Time Directive](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32003L0088)

## Contract Types & Nuances

| Contract Type | USA Context | Canada Context | EU Context |
|---------------|-------------|----------------|------------|
| **Employment Agreements** | Focus strictly on "At-Will" employment status. | Focus on "Reasonable Notice" for termination (Common Law) or statutory minimums. | "At-Will" does not exist. Focus on "Statutory Notice Periods" (e.g., Zákoník práce in Czech Republic), fixed-term limits, and the Working Time Directive. |
| **Independent Contractor Agreements** | Critical to avoid IRS/DOL misclassification. Must emphasize lack of control and independence. | Strict CRA rules on "Personal Services Businesses" vs True Contractors. | Misclassification is heavily penalized. Must avoid elements of subordination. In Czechia, "Švarcsystém" is strictly prohibited. |
| **Non-Disclosure Agreements (NDA)** | Unilateral or Mutual. Can be perpetual for trade secrets. | similar to US, but careful detailing of what constitutes a trade secret is necessary. | Similar, but often more bound by local whistleblowing directives. |
| **Non-Compete Agreements** | Highly restricted or banned in several states (e.g., California). | Enforceable only if narrowly tailored. | Highly restricted. Often requires "Garden Leave" or mandatory financial compensation (e.g., Konkurenční doložka in Czech law requires at least 50% average monthly earnings). |
| **IP Assignment Agreements** | Usually standard format (Work Made For Hire). | Similar to US, but Moral Rights must be explicitly waived by the author. | Extremely localized. In Germany/France, complete transfer is impossible; in Czechia, only usage licenses can be granted for "personal rights." |

## Agent Instructions
When an end-user requests an employment contract:
1. Verify if the worker is an Employee or an Independent Contractor.
2. If EU or Canada, instantly remove "At-Will" clauses and inject localized notice-period clauses.
3. For EU member states, use **N-Lex** to fetch specific Labour Code (e.g., Czech Labour Code Act No. 262/2006 Coll.) references.
4. Validate Non-Compete legality against the specific State/Country and check for mandatory compensation requirements.
