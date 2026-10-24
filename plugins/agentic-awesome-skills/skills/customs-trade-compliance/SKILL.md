---
name: customs-trade-compliance
description: Codified expertise for customs documentation, tariff classification, duty optimisation, restricted party screening, and regulatory compliance across multiple jurisdictions.
risk: safe
source: https://github.com/ai-evos/agent-skills
date_added: '2026-02-27'
---

# Customs & Trade Compliance

## When to Use

Use to prepare classification, origin, valuation, documentation, screening and
post-entry review analyses for a specified shipment and jurisdiction. Draft
broker instructions or questions; do not file entries, certify origin, release
held goods, pay duties, block property or contact regulators without authority.

## Establish the Applicable Facts

Obtain the importing/exporting jurisdiction, entry date and procedure, actual
product specifications and manufacturing history, parties/ownership, end use,
route, invoices, costs and declared Incoterms version/named place. Record the
applicable tariff/regulation version and source checked. Separate classification,
non-preferential origin, preferential origin, export jurisdiction, export-control
classification and sanctions: an HS code does not decide all six.

## Workflow

1. **Classification:** Read the current heading text and legal Section/Chapter
   Notes under GRI 1. Apply further GRIs where applicable, including incomplete
   goods/mixtures, specificity, essential character and numerical order. GRI 2(b)
   does not itself select the essential-character material. Check special legal
   machine/parts provisions before generic essential-character reasoning. GRI 6
   compares subheadings at the same level. Resolve national import/export suffixes
   separately; do not classify from a marketing name or an invented ruling.
2. **Origin:** Document actual production and inputs. Shipping/repacking through
   another country is not proof of changed origin. Apply the particular origin
   rule, AD/CVD scope or FTA annex rather than a universal value-added percentage.
   For preference verify production-period BOM, permitted calculation method,
   cumulation, tolerance, transport and evidence/certification requirements.
3. **Valuation:** Apply the jurisdiction's valuation hierarchy and documented
   adjustments. Related parties do not automatically invalidate transaction
   value, and a tax transfer-pricing study does not automatically validate it.
   Assess actual assists, royalties, proceeds, discounts and costs. Incoterms
   allocate contractual obligations; they do not prescribe the customs method.
4. **Screening and export controls:** Check current applicable lists, ownership
   and control rules, item jurisdiction/classification, destination, end user,
   end use, licences and red flags. A no-hit name search is not permission to ship.
   Put unresolved cases on an operational hold for the authorised compliance
   owner. Distinguish that hold from legally blocking or rejecting a transaction.
5. **Documentation:** Reconcile invoice, packing list, transport documents, origin
   evidence, entry data and relevant product-agency requirements. Determine actual
   filing/claim deadlines and required data for the entry type; do not presume all
   invoice checklists, ISF timings or certifications apply identically.
6. **Corrections:** Preserve entry/payment records and actual liquidation dates.
   Have the broker/counsel identify the applicable correction, reconciliation,
   protest, preference or disclosure route. A normal correction is not
   automatically a legally valid prior disclosure.

## Concrete Corrections to Common Shortcuts

- For US transaction value, international freight/insurance are generally
  excluded subject to documented applicable rules; EU customs value generally
  includes transport/insurance to the place of introduction. Do not reverse
  these or automatically declare a CIF/DDP invoice total. Import VAT can have
  a different base from customs duty.
- USMCA RVC formulas are `100*(TV-VNM)/TV` and `100*(NC-VNM)/NC` with the
  agreement's definitions and product-specific thresholds. A lower denominator
  does not inherently raise RVC. Holding VNM=40 fixed, TV=100 gives 60%, whereas
  NC=80 gives 50%. Choose only a method permitted for the actual good.
- An omitted USMCA preference claim under 19 USC 1520(d) generally has a one-year
  deadline from **importation**, not one year from liquidation. Do not promise
  recovery of all historical entries using a generic protest window.
- Do not plan around the historical US $800 duty-free parcel assumption. CBP
  suspended the relevant de minimis treatment for all countries effective
  August 29, 2025; verify the current procedure for the actual entry date.
- Use the current UK Sanctions List; the old OFSI consolidated list stopped
  updating on January 28, 2026. Verify list/ownership rules at transaction time.
- Retention is regime-specific: do not apply a universal five-year limit to OFAC
  records, whose general requirement was extended to ten years. Preserve legal
  holds and longer contract/program obligations.

## Example Output

For a hypothetical CIF invoice, show goods price, separately evidenced freight
and insurance, any assists/royalties, proposed US and EU adjustments and the
supporting legal basis. Label the result **draft valuation for broker review**.
If freight is unsupported or related-party pricing unresolved, list the missing
records instead of inventing a deduction or declaring the entry ready.

## Escalation and Deliverable

Return a fact table, dated primary authorities, proposed analysis with alternative
headings/methods, calculations, missing evidence, deadlines and authorised owner.
Escalate potential evasion, sanctions matches, forced labour, seizure, ambiguous
jurisdiction and disclosure decisions to qualified compliance counsel. Preserve
truthful evidence; do not infer wrongdoing from routing, nationality or price
alone. Do not promise duty savings, licences, refunds or penalty mitigation.

## References

- [Decision frameworks and primary sources](references/decision-frameworks.md)
- [Ten edge cases](references/edge-cases.md)
- [Draft communication templates](references/communication-templates.md)

## Limitations

No current tariff, sanctions database or filing integration is bundled. Legal
rules, rates, product scopes and deadlines change. Verify the actual transaction
against current official sources and the responsible broker/legal owner; this
skill does not issue a binding classification, origin certificate or legal opinion.
