# Customs & Trade Compliance — Communication Templates

> Tier 2 reference. Load when drafting communications with customs brokers, regulatory authorities, internal stakeholders, or trade partners.

These templates provide the structural framework for common trade compliance communications. Adapt language to the specific situation, jurisdiction, and relationship. Variables are indicated with `{curly_braces}`. Remove all instructional notes before sending.

---

## How to Use This File

Select the template closest to your communication need. Fill in all variables. Adjust tone based on the communication patterns guidance in the main SKILL.md. All templates assume US jurisdiction unless otherwise noted — adapt regulatory references for EU, UK, or other jurisdictions as needed.

---

## Template 1: Customs Broker Entry Instructions

**Use when:** Filing a new import entry. Provides the broker with classification, valuation, and preference instructions.

---

**To:** {broker_contact_name}, {brokerage_firm}
**From:** {compliance_contact}, {company}
**Date:** {date}
**Re:** Entry Instructions — {PO_number} / {shipment_reference} — {origin_country} to {destination_port}

**Shipment Details:**

| Field | Value |
|---|---|
| Importer of Record | {IOR_name} — IOR# {IOR_number} |
| Exporter / Seller | {exporter_name}, {exporter_country} |
| Ultimate Consignee | {consignee_name}, {consignee_address} |
| Bill of Lading / AWB | {BOL_or_AWB_number} |
| Vessel / Flight | {vessel_name_or_flight} |
| ETA Port of Entry | {ETA_date} |
| Incoterms | {incoterm} {named_place} |
| Currency | {currency} |
| Total Declared Value | {total_value} ({incoterm} basis) |

**Classification Instructions:**

| Line | Description | HTS Number | Duty Rate | Country of Origin | Quantity | Value |
|---|---|---|---|---|---|---|
| 1 | {product_description_1} | {HTS_1} | {rate_1} | {origin_1} | {qty_1} | {value_1} |
| 2 | {product_description_2} | {HTS_2} | {rate_2} | {origin_2} | {qty_2} | {value_2} |

**Classification Notes:**
{GRI_rationale_or_ruling_reference. Example: "HTS 8471.30.0100 per GRI 1 — portable ADP machine meeting all four Note 5(A) criteria. Consistent with CBP Ruling HQ H298456 (2019)."}

**Valuation Notes:**
- Transaction value per Method 1. {Note any additions: assists, royalties, or other adjustments.}
- Related party: {Yes/No}. {If Yes: "Circumstances of sale test satisfied per attached transfer pricing analysis."}
- Reconciliation flag: {Yes/No}. {If Yes: "Final price subject to year-end transfer pricing adjustment."}

**Preferential Treatment Claim:**
- FTA: {USMCA / EU-UK TCA / RCEP / None}
- Certification of origin: {Attached / To follow / N/A}
- Preference criterion: {Tariff shift / RVC / Specific process}
- {If USMCA: "USMCA certification attached with all nine required data elements per Article 5.2."}

**PGA Requirements:**
- FDA: {Prior notice filed — confirmation # {PN_number} / Not applicable}
- EPA/TSCA: {TSCA positive certification attached / Exemption: {basis} / N/A}
- FCC: {Declaration of Conformity — FCC ID {FCC_ID} / N/A}
- CPSC: {General Certificate of Conformity attached / N/A}
- {Other PGA: USDA, TTB, DOE, etc.}

**Special Instructions:**
{Any specific instructions: "Hold entry until ISF confirmation received." / "This entry requires ADD deposit of {rate}% under order {order_number}." / "Request CF-28 response coordination before liquidation."}

**Attached Documents:**
1. Commercial invoice
2. Packing list
3. Bill of lading / air waybill
4. Certificate of origin {if applicable}
5. {Additional: FDA prior notice confirmation, TSCA certification, etc.}

Please confirm receipt and advise if any documentation is missing.

---

## Template 2: CBP Binding Ruling Request

**Use when:** Seeking a prospective classification or valuation ruling from CBP. Follow HQ format per 19 CFR Part 177.

---

{company_letterhead}

{date}

U.S. Customs and Border Protection
Regulations and Rulings
Office of Trade
90 K Street NE, 10th Floor
Washington, DC 20229-1177

**Re: Request for Binding Ruling — Tariff Classification of {product_name}**

Dear Sir or Madam:

Pursuant to 19 CFR § 177.1, {company_name} hereby requests a prospective ruling on the tariff classification of the merchandise described below.

**1. Description of the Merchandise**

{Provide a thorough and technically precise description of the product. Include:
- Physical characteristics (dimensions, weight, material composition by percentage)
- Manufacturing process
- Function and how it operates
- Intended use
- How it is marketed and sold (retail, industrial, OEM)
- Any applicable industry standards or specifications it meets}

{If a sample is being submitted: "A sample of the subject merchandise is enclosed with this request, identified as Exhibit A."}

**2. Commercial and Trade Information**

- Importer of Record: {IOR_name}, IOR# {IOR_number}
- Country of Exportation: {country}
- Port of Entry: {port}
- Anticipated annual import volume: {volume} units / {value} USD
- {If this concerns an existing import programme: "Currently being imported under HTS {current_HTS}. We request confirmation of this classification." OR "Currently classified under HTS {current_HTS}. We believe the correct classification is HTS {proposed_HTS} for the reasons stated below."}

**3. Legal Analysis**

{Present your classification analysis following the GRIs in order:}

**GRI 1 Analysis:**
The subject merchandise is {prima facie / most aptly} described by heading {XXXX}, which covers "{heading text}." The relevant Chapter Note {X} {includes/excludes/defines} {relevant term}. {Explain why this heading applies or why it does not definitively resolve classification.}

{If GRI 1 does not resolve:}

**GRI {2/3} Analysis:**
{Explain the composite nature, set classification, or essential character analysis. Cite the specific factors (function, value, bulk, role in use) that determine essential character.}

**Proposed Classification:**
Based on the foregoing analysis, {company_name} respectfully submits that the subject merchandise is properly classified under HTS {proposed_10_digit_code}, with a general rate of duty of {rate}.

**4. Supporting Authorities**

{Cite relevant prior CBP rulings, WCO classification opinions, or Explanatory Notes:}
- CBP Ruling {ruling_number} ({year}): {Brief description of the ruling and its relevance}
- WCO Classification Opinion {number}: {Brief description}
- Harmonized System Explanatory Notes to Heading {XXXX}: {Relevant language}

**5. Statement Pursuant to 19 CFR § 177.1(d)(4)**

To the best of our knowledge, this request involves no issue that is the same as, or substantially similar to, one that is pending before CBP or any court, or one that has been settled by any court.

Respectfully submitted,

{name}
{title}
{company}
{address}
{phone}
{email}

Enclosures:
{List: sample, photographs, technical specifications, prior rulings cited}

---

## Template 3: Prior Disclosure Filing

**Use when:** Voluntarily disclosing a customs violation to CBP before an investigation is commenced. This is the most powerful penalty mitigation tool available.

---

{company_letterhead}

{date}

VIA CERTIFIED MAIL, RETURN RECEIPT REQUESTED

Fines, Penalties and Forfeitures Officer
U.S. Customs and Border Protection
{Port of Entry}
{Port Address}

{OR, if CEE has jurisdiction:}

Center Director
Center of Excellence and Expertise — {CEE_name}
{CEE_address}

**Re: Prior Disclosure Pursuant to 19 CFR § 162.74**

Dear Sir or Madam:

{company_name} (IOR# {IOR_number}) hereby makes a prior disclosure of customs violations pursuant to 19 CFR § 162.74. To the best of our knowledge, CBP has not commenced a formal investigation or issued a pre-penalty notice concerning the matters disclosed herein.

**1. Nature of the Violation**

{Describe the specific violation clearly and concisely:}

{Example for classification error:}
"Between {start_date} and {end_date}, {company_name} imported {product_description} under HTS {incorrect_HTS} at a duty rate of {incorrect_rate}%. Based on a subsequent internal review, we have determined that the correct classification is HTS {correct_HTS} at a duty rate of {correct_rate}%. This misclassification resulted in an underpayment of duties."

{Example for valuation error:}
"Between {start_date} and {end_date}, {company_name} failed to include the value of assists (tooling/engineering provided to the foreign manufacturer) in the declared transaction value of imported {product_description}. The total unreported assist value is {assist_value}, resulting in an underpayment of duties."

{Example for country of origin error:}
"Between {start_date} and {end_date}, {company_name} declared the country of origin of imported {product_description} as {incorrect_origin} when the correct country of origin is {correct_origin}. This resulted in {failure to pay Section 301 duties / incorrect AD/CVD deposit / incorrect marking}."

**2. Affected Entries**

| Entry Number | Entry Date | Port | Declared Value | Correct Value | Duty Underpayment |
|---|---|---|---|---|---|
| {entry_1} | {date_1} | {port_1} | {declared_1} | {correct_1} | {underpayment_1} |
| {entry_2} | {date_2} | {port_2} | {declared_2} | {correct_2} | {underpayment_2} |
| ... | ... | ... | ... | ... | ... |
| **TOTAL** | | | | | **{total_underpayment}** |

{If the exact entries cannot be identified: "We are continuing our investigation to identify all affected entries and will supplement this disclosure with complete entry-level detail within {30/60} days. The estimated total duty underpayment based on our analysis to date is {estimate}."}

**3. Circumstances of the Violation**

{Explain how the violation occurred. Be factual, not defensive:}

{Example: "The classification error originated from reliance on the supplier's suggested HS code without independent verification by a licensed customs broker. Our internal compliance review programme identified the discrepancy during a routine quarterly audit on {discovery_date}."}

**4. Corrective Actions**

{Describe what you have done and will do to prevent recurrence:}

1. {Immediate correction: "All future entries of this product will be classified under HTS {correct_HTS}."}
2. {Process improvement: "We have implemented a mandatory independent classification review for all new HTS codes before first entry."}
3. {Training: "All import operations staff will complete CBP Informed Compliance training by {date}."}
4. {Monitoring: "Quarterly classification audits will be conducted by {internal team or external firm}."}

**5. Tender of Duties and Interest**

Pursuant to 19 CFR § 162.74(c), {company_name} hereby tenders the total underpaid duties in the amount of **${total_underpayment}** plus estimated interest of **${interest_amount}**, for a total tender of **${total_tender}**.

{Check enclosed payable to "U.S. Customs and Border Protection" / ACH payment details}

{If you cannot calculate the exact amount: "We are prepared to tender the full amount upon CBP's calculation of the precise duty and interest owed. This disclosure and tender are made in good faith based on the information available to us as of the date of this filing."}

**6. Conclusion**

{company_name} is committed to compliance with US customs laws and regulations. This disclosure is made voluntarily and in good faith. We respectfully request that this matter be treated as a valid prior disclosure under 19 CFR § 162.74, limiting any penalty assessment to the statutory minimum.

We are prepared to cooperate fully with any CBP review of this disclosure and to provide additional documentation upon request.

Respectfully submitted,

{name}
{title}
{company}
{address}
{phone}
{email}

Enclosures:
1. Check / payment confirmation for ${total_tender}
2. Spreadsheet of affected entries with calculations
3. {Supporting documentation: corrected classification analysis, valuation report, etc.}

cc: {Legal counsel}
    {VP Trade Compliance}

---

## Template 4: Penalty Response / Mitigation Request

**Use when:** Responding to a CBP pre-penalty notice or penalty assessment under 19 USC § 1592.

---

{company_letterhead}

{date}

Fines, Penalties and Forfeitures Officer
U.S. Customs and Border Protection
{Port/CEE Address}

**Re: Response to {Pre-Penalty Notice / Penalty Notice} — Case No. {case_number}
Penalty Claim: ${penalty_amount}
Entry/Entries: {entry_numbers}**

Dear Sir or Madam:

{company_name} acknowledges receipt of the {pre-penalty notice dated {date} / penalty assessment dated {date}} in the above-referenced matter. We respectfully submit the following response and request for mitigation.

**1. Summary of CBP's Allegations**

{Concisely restate what CBP alleges. Do not argue yet — demonstrate that you understand the issue.}

**2. Response to Allegations**

{Address each allegation factually. Acknowledge what is correct. Contest what is incorrect. Do NOT admit fraud if the facts support negligence.}

{If contesting the culpability level: "While we acknowledge that {the classification was incorrect / the value was understated / the origin was misdeclared}, we respectfully submit that the violation resulted from negligence, not gross negligence. The evidence does not support a finding that {company_name} acted with 'conscious disregard of a known duty' or 'gross indifference.' Specifically:"}

- {Factor 1: "The company maintained a compliance programme that included {specific measures}."}
- {Factor 2: "The error was identified through {internal audit / broker review}, not as a result of CBP enforcement action."}
- {Factor 3: "The company has no prior violations in {X} years of import activity."}

**3. Mitigating Factors**

Pursuant to CBP's Mitigation Guidelines, {company_name} submits the following mitigating factors:

| Factor | Evidence |
|---|---|
| Contributory CBP error | {CBP accepted {X} prior entries with the same classification without comment / N/A} |
| Cooperation | {Company has cooperated fully, producing all requested records within {X} days} |
| Corrective action | {Specific actions taken: new SOPs, training, classification audit, broker change} |
| Prior good record | {No penalties or adverse findings in {X} years of import activity, {Y} entries} |
| Compliance programme | {Description of internal compliance programme: staffing, training, audits, systems} |
| Proportionality | {The penalty of ${penalty_amount} is disproportionate to the actual loss of revenue of ${revenue_loss}} |

**4. Requested Mitigation**

Based on the foregoing, {company_name} respectfully requests that CBP:

{Option A — if acknowledging negligence:}
"Reduce the penalty to the statutory minimum for negligence under 19 USC § 1592(c)(4), specifically {interest on unpaid duties / 1× lost revenue}, consistent with the mitigating factors presented."

{Option B — if contesting entirely:}
"Cancel the proposed penalty in its entirety. The entry information, as submitted, was {correct / supported by a reasonable interpretation of the tariff schedule / consistent with prior CBP treatment of this merchandise}."

{Option C — if seeking settlement:}
"Accept a settlement in the amount of ${proposed_amount}, representing {calculation basis}, in full resolution of this matter."

Respectfully submitted,

{name}
{title}
{company}

Enclosures: {List supporting exhibits}
cc: {Legal counsel}

---

## Template 5: USMCA Certification of Origin

**Use when:** Certifying that goods qualify for preferential treatment under USMCA. The certification must include all nine data elements per Article 5.2. No prescribed form is required.

---

**CERTIFICATION OF ORIGIN**
**(United States-Mexico-Canada Agreement)**

**1. Certifier:** {Select one: Exporter / Producer / Importer}
   Name: {certifier_name}
   Title: {certifier_title}
   Company: {company_name}
   Address: {address}
   Phone: {phone}
   Email: {email}

**2. Exporter** {if different from certifier}:
   Name: {exporter_name}
   Company: {company_name}
   Address: {address}

**3. Producer** {if different from exporter}:
   Name: {producer_name}
   Company: {company_name}
   Address: {address}
   {If multiple producers: "Various — see attached list" OR "Available upon request"}

**4. Importer:**
   Name: {importer_name}
   Company: {company_name}
   Address: {address}

**5. Description of Goods:**

| # | Description | HS Tariff Classification (6-digit) | Origin Criterion | Country of Origin |
|---|---|---|---|---|
| 1 | {product_description} | {HS_code} | {criterion_code} | {US/MX/CA} |

**Origin Criterion Codes:**
- A: Wholly obtained or produced entirely in the territory of one or more USMCA Parties
- B: Produced entirely in the territory using non-originating materials that satisfy the applicable product-specific rule of origin (Annex 4-B)
- C: Produced entirely in the territory exclusively from originating materials
- D: Goods classified under HS chapters/headings listed in Article 4.3

**6. Blanket Period** {if applicable}:
   From: {start_date} To: {end_date} {maximum 12 months}

**7. I certify that:**

The goods described in this document qualify as originating and the information contained in this document is true and accurate. I assume responsibility for proving such representations and agree to maintain and present upon request or to make available during a verification visit, documentation necessary to support this certification, and to inform, in writing, all persons to whom the certification was given of any changes that could affect the accuracy or validity of this certification.

**Signature:** ______________________
**Date:** {date}

---

## Template 6: Internal Compliance Advisory

**Use when:** Notifying internal stakeholders of a regulatory change, new compliance requirement, or enforcement action that requires operational changes.

---

**To:** {distribution_list: Import Operations, Procurement, Product Development, Legal}
**From:** {Trade Compliance Team / compliance_officer_name}
**Date:** {date}
**Subject:** COMPLIANCE ACTION REQUIRED: {topic} — Effective {effective_date}

**BUSINESS IMPACT:**
{Lead with the operational impact — what changes for the business:}

{Example: "Effective {date}, all imports of {product_category} from {country} will require {new documentation / additional testing / modified classification}. Failure to comply will result in {shipment detention, penalties up to $X per entry, import refusal}. Estimated cost impact: {$X per shipment / $Y annually}."}

**WHAT CHANGED:**
{Brief regulatory background — 2-3 sentences maximum:}

{Example: "CBP issued CSMS Message #{number} on {date} implementing {regulation/ruling}. This modifies the requirements for {specific area} under {statutory reference}."}

**REQUIRED ACTIONS:**

| # | Action | Owner | Deadline |
|---|---|---|---|
| 1 | {Specific action item} | {Team/person} | {Date} |
| 2 | {Specific action item} | {Team/person} | {Date} |
| 3 | {Specific action item} | {Team/person} | {Date} |

**WHAT HAPPENS IF WE DON'T COMPLY:**
{Specific consequences:}
- Shipment detention at port (average {X} days to resolve, demurrage cost ${Y}/day)
- Penalty exposure: ${amount} per violation under {statute}
- {If applicable: import refusal, product recall, licence revocation}

**QUESTIONS / ESCALATION:**
Contact {compliance_officer_name} at {email} / {phone}. Do NOT attempt to self-resolve classification or entry questions — route all inquiries to the trade compliance team.

---

## Template 7: Supplier Questionnaire — Origin Determination

**Use when:** Collecting information from suppliers to determine whether imported goods qualify for preferential treatment under an FTA.

---

**SUPPLIER ORIGIN QUESTIONNAIRE**

**From:** {importer_company} — Trade Compliance Department
**To:** {supplier_company}
**Date:** {date}
**Product(s):** {product_description}
**Applicable FTA:** {USMCA / EU-UK TCA / RCEP / other}

We are evaluating whether the above product(s) qualify for preferential duty treatment under {FTA}. Your responses to the following questions will be used to prepare the required origin certification. Please provide accurate and complete information — incorrect origin claims can result in penalties for both the importer and the exporter.

**SECTION A: PRODUCT INFORMATION**

1. Product description (technical, not marketing): ________________________________
2. HS classification at the 6-digit level: ________________________________
3. Country where the product is manufactured: ________________________________
4. Facility address where final production occurs: ________________________________

**SECTION B: BILL OF MATERIALS**

For each material/component used in the manufacture of the product, please provide:

| # | Material Description | HS Code (6-digit) | Country of Origin | Supplier Name | % of Total Product Value | Originating under {FTA}? (Y/N) |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

{Add rows as needed. If the BOM contains more than 20 items, please provide as an attached spreadsheet.}

**SECTION C: MANUFACTURING PROCESS**

5. Describe the manufacturing process performed at your facility: ________________________________
   {Specifically identify: cutting, assembly, machining, chemical processing, finishing, testing}

6. List any processes performed by subcontractors and the country where subcontracting occurs: ________________________________

7. What is the total value added at your facility as a percentage of the FOB price? _____%

**SECTION D: COST INFORMATION** {Required only if RVC calculation is needed}

8. FOB price of the finished product: ________________________________
9. Total cost of non-originating materials: ________________________________
10. Total cost of originating materials: ________________________________
11. Direct labour cost: ________________________________
12. Manufacturing overhead: ________________________________
13. Profit: ________________________________

**SECTION E: CERTIFICATION**

I certify that the information provided above is true and accurate to the best of my knowledge. I understand that false statements may result in penalties under the laws of the importing country.

Name: ________________________________
Title: ________________________________
Signature: ________________________________
Date: ________________________________

Please return the completed questionnaire to {compliance_email} by {deadline_date}.

---

## Template 8: Binding Ruling Appeal / Request for Reconsideration

**Use when:** CBP has issued a ruling or revocation that you believe is incorrect, and you wish to request reconsideration or appeal to the Court of International Trade.

---

{company_letterhead}

{date}

U.S. Customs and Border Protection
Regulations and Rulings, Office of Trade
90 K Street NE, 10th Floor
Washington, DC 20229-1177

**Re: Request for Reconsideration of Ruling Letter {ruling_number}
Product: {product_description}
Current Classification: HTS {current_HTS}
Proposed Reclassification: HTS {proposed_HTS}**

Dear Sir or Madam:

Pursuant to 19 CFR § 177.12, {company_name} respectfully requests reconsideration of CBP Ruling Letter {ruling_number}, issued {ruling_date}, which classified {product_description} under HTS {classification_in_ruling}.

**1. Basis for Reconsideration**

{State the specific grounds:}

{Option A — Error of law:}
"The ruling incorrectly applied GRI {X} by {specific error}. The correct application of GRI {X} yields classification under heading {XXXX} because {analysis}."

{Option B — Error of fact:}
"The ruling was based on an incomplete or inaccurate description of the merchandise. Specifically, {identify the factual error and provide the correct facts with supporting evidence}."

{Option C — Changed circumstances:}
"Since the issuance of the ruling, {identify the change: new WCO classification opinion, new Explanatory Note, product modification, new CBP ruling on analogous goods} has occurred, warranting reconsideration."

**2. Detailed Analysis**

{Present the full GRI analysis supporting your position, structured identically to a ruling request (see Template 2). Address each point in CBP's original ruling that you are contesting.}

**3. Supporting Authorities**

{Cite any authorities that support your position and distinguish any that CBP relied upon:}

- {Authority supporting your position}
- {Distinguish CBP's cited authority: "CBP relied on Ruling {number}, which addressed {different product}. That ruling is distinguishable because {specific differences}."}

**4. Commercial Impact**

{Explain the practical impact of the ruling on your business:}

"The reclassification from HTS {current} to HTS {proposed} {increases the duty rate from X% to Y% / removes FTA eligibility / triggers AD/CVD deposits / changes PGA requirements}, affecting approximately ${annual_value} in annual imports."

**5. Requested Action**

{company_name} respectfully requests that CBP:
1. Reconsider Ruling Letter {ruling_number}
2. Classify {product_description} under HTS {proposed_classification}
3. {If applicable: "Limit any reclassification to prospective application only, providing a reasonable transition period per 19 USC § 1625(c)."}

Respectfully submitted,

{name}
{title}
{company}

Enclosures: {List: product sample, technical specifications, prior rulings, WCO opinions}
cc: {Legal counsel}

---

## Template 9: Restricted Party Screening — Hit Adjudication Memorandum

**Use when:** Documenting the adjudication of a restricted party screening hit (false positive clearance or true positive block).

---

**SCREENING HIT ADJUDICATION MEMORANDUM**

**Date:** {date}
**Adjudicator:** {name}, {title}
**Transaction Reference:** {PO/order/shipment number}
**Screening Tool:** {tool_name} (version {version})
**Screening Date:** {screening_date}

**PARTIES SCREENED:**

| Party | Role | Name Screened | Country |
|---|---|---|---|
| {party_1} | Buyer | {name} | {country} |
| {party_2} | Consignee | {name} | {country} |
| {party_3} | End User | {name} | {country} |

**HIT DETAILS:**

| Hit # | Screened Name | Matched List | Listed Name | Match Score | List Entry Date |
|---|---|---|---|---|---|
| 1 | {screened_name} | {list_name} | {listed_name} | {score}% | {date} |

**ADJUDICATION ANALYSIS:**

{For each hit, analyse the following factors:}

| Factor | Screened Entity | Listed Entity | Match? |
|---|---|---|---|
| Full legal name | {name} | {name} | {Y/N/Partial} |
| Address | {address} | {address} | {Y/N/Partial} |
| Country | {country} | {country} | {Y/N} |
| Date of birth / incorporation | {date} | {date} | {Y/N/Unknown} |
| Aliases | {known aliases} | {listed aliases} | {Y/N} |
| Additional identifiers | {tax ID, D&B#} | {identifiers on list} | {Y/N} |

**CONCLUSION:**

{Select one:}

**[ ] FALSE POSITIVE** — The screened entity is NOT the listed entity. Basis: {specific reasons — e.g., "Different country (screened entity is in Germany; listed entity is in Iran), different industry sector (screened entity is a pharmaceutical distributor; listed entity is an individual designated for terrorism support), no address correlation."}

**Disposition:** Transaction may proceed.

**[ ] TRUE POSITIVE** — The screened entity IS the listed entity or cannot be distinguished.

**Disposition:** Transaction BLOCKED. Escalated to {compliance officer / legal counsel} on {date}. {If OFAC: "OFAC blocking report to be filed within 10 business days." / If Entity List: "BIS licence application under consideration." / If DPL: "Absolute prohibition — no licence available. Transaction permanently blocked."}

**[ ] INCONCLUSIVE** — Cannot determine with confidence. Escalated to {compliance officer} for additional investigation on {date}.

**Approved by:** _______________________ Date: ___________
{Compliance Officer / Manager}

**Record Retention:** This memorandum and all supporting documentation will be retained for {5 years from the date of adjudication / indefinitely for true positives}.
