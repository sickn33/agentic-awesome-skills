# ITIL Expert: Usage Examples

Common scenarios for applying ITIL 4 and ITIL 5 knowledge.

## Scenario 1: Mapping an AI-Native Incident Value Stream
**Task:** Design a value stream for handling incidents in an AI-powered SaaS.

**Illustrative implementation (not an official ITIL lifecycle mapping):**
1. **Engage:** AI Chatbot identifies user issue via Natural Language Processing (NLP).
2. **Plan:** Auto-triage categorizes the incident as "Automated Fix" or "Human Escalation."
3. **Obtain/Build:** If automated, an approved, bounded runbook may restart an owned service, with rollback and escalation.
4. **Deliver & Support:** AI verifies resolution with the user.
5. **Improve:** Incident data is fed back into the AI model to prevent future occurrences (Predictive Problem Management).

## Scenario 2: Designing a Sustainable Digital Product
**Task:** Ensure the new "Hospital IT Hub" is aligned with the organization's measured sustainability goals.

**Guidance:**
- **Green Compute:** Use serverless architectures to reduce idle provisioning where measurements support it; serverless still consumes infrastructure energy.
- **Resource Lifecycle:** Track all medical IoT devices in the CMDB with "End-of-Life" recycling workflows.
- **SLA Update:** Add a clause: "The service shall target 99.9% uptime with a maximum carbon intensity of X kg CO2 per user transaction."

## Scenario 3: AI Governance Implementation
**Task:** Your company wants to use AI to approve high-risk changes.

**Advice:**
- **HITL Requirement:** As a local governance policy, require an authorized human reviewer for high-risk change recommendations; Categories A/B are not established here as official ITIL classes.
- **Explainability:** The AI must provide a "Reasoning log" for the approval suggestion.
- **Auditability:** Every AI-approved change must be logged with the version of the algorithm used for the decision.

---
*Use these examples as templates for your own ITIL implementation strategy.*
