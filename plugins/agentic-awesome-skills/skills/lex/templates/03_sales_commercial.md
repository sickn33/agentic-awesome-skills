---
name: sales-commercial
description: Agent templates governing long-term commercial relationships, bills of sale, and web-based terms of service.
jurisdictions: [USA, Canada, EU]
---

# Sales & Commercial Transactions Templates

These templates dictate the parameters of sales, services, and online privacy. Note the strict variance in consumer-facing privacy laws and commercial codes.

## Official References
- **USA:** Uniform Commercial Code (UCC) (Varies by State) | FTC Privacy Guidelines.
- **Canada:** [PIPEDA (Privacy Commissioner)](https://www.priv.gc.ca/) | Provincial Sale of Goods Acts.
- **EU (Granular):** [N-Lex Consumer Protection](https://n-lex.europa.eu/) | [EU Consumer Rights Directive](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex:32011L0083)

## Contract Types & Nuances

| Contract Type | USA Context | Canada Context | EU Context |
|---------------|-------------|----------------|------------|
| **Master Service Agreements (MSA)** | The "umbrella" contract. Governed generally by state common law. Limits of liability are crucial. | Similar structure. Often defaults to Ontario or BC jurisdiction. | Governed by B2B commercial regulations of specific member states. |
| **Statements of Work (SOW)** | Sits beneath an MSA. Defines explicitly *what* is delivered. Highly standardized. | Same as US. | Same as US. |
| **Sales Contracts / Bills of Sale** | Heavily governed by the Uniform Commercial Code (UCC) regarding "implied warranties of merchantability". | Governed by provincial Sale of Goods Acts. Similar implied warranties exist. | Heavily governed by the EU Consumer Rights Directive, establishing strict rules on right of withdrawal and implied guarantees (minimum 2 years). |
| **Terms of Service (ToS)** | Defines the legal contract between a website and user. Arbitration clauses and class-action waivers are common. | Similar to US, but class-action waivers are often unenforceable locally (e.g., Quebec). | Extremely strict on consumer fairness (Unfair Contract Terms Directive). Binding arbitration is often unenforceable against consumers without explicit, secondary consent. |
| **Privacy Policies** | Fragmented. Must comply with states like California (CCPA/CPRA), COPPA for children, HIPAA for medical. | Governed federally by PIPEDA (and strictly in Quebec by Law 25). | Governed unilaterally by GDPR. Requires explicit "opt-in" consent, Right to be Forgotten, and Data Processing Agreements (DPA) between entities. |

## Agent Instructions
When generating a Privacy Policy or Terms of Service:
1. Always inject a GDPR compliance clause if the client does *any* business in Europe.
2. Structure MSAs to explicitly cite the governing law (state/province/country).
3. For EU consumer sales, ensure the 14-day right of withdrawal is explicitly mentioned as per the Consumer Rights Directive.
