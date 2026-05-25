# Product Requirements Document (PRD) Templates

## Default PRD Template

# [PR][EPIC] [Insert Title Here]

**Author:** [Name]
**Date:** [Date]
**Status:** [Draft / In Review / Approved]

## Objective, Goals, and Success Metrics

> *Include a brief context on the business problem to solve, the objective of the product/feature, and its success metrics.*

### **Problem Context**

The following are our current state:

1. **[Problem 1]**: [Description of problem]
2. **[Problem 2]**: [Description of problem]

### **Objectives**

The goal of this initiative is to resolve problems to increase user adoption / internal efficiency. Through the following main objectives:

1. **[Objective 1]**: [Description]
2. **[Objective 2]**: [Description]

### **Success Metrics**

| Persona | Objective | Success Metrics (Name) | Current | Target |
| :--- | :--- | :--- | :--- | :--- |
| [Persona] | [Goal] | [Metric Name] | [Current] | [Target] |
| [Persona] | [Goal] | [Metric Name] | [Current] | [Target] |

---

## Table of Knowledge

> *Include any docs or files that will be referenced throughout development.*

| Document Titles | Doc Links |
| :--- | :--- |
| PRD - User Flow Diagram & Concept | [Link] |
| PRD - HiFi Design | [Link] |
| ENG - Sprint Preplanning Doc | [Link] |
| ENG - Technical Docs | [Link] |
| ENG - User Story Kanban | [Link] |
| Meeting Notes | [Link] |

---

## Requirements & Functionality

> *Include user stories of the intended function that your product want to build.*

### **Concept & Glossary**

Following are concepts or terms and the definition of each item.

| Terms | Description |
| :--- | :--- |
| **[Term]** | [Definition] |

### **Alternative Approaches**

> *List every approach considered during the design review. Only the selected approach is implemented. Include rejection reasons for traceability.*

| Option | Description | Status | Rejection Reason |
| :--- | :--- | :--- | :--- |
| **[Option A — Name]** | [Brief description of the approach] | Rejected | [Why this was not chosen] |
| **[Option B — Name ✅]** | [Brief description of the selected approach] | Selected | — |
| **[Option C — Name]** | [Brief description of the approach] | Rejected | [Why this was not chosen] |

> *Include any technical flow and diagrams that can be helpful to explain the intended flow. I.e. Process flow diagram, ERD, Activity Diagram, Sequence Diagram.*

1. **[Flow Name] Technical Flow**

The following diagram explains how the flow of the process will look like.

```mermaid
%% Insert Diagram Code Here
graph TD;
    A-->B;
```

### **Scope Grouping & Feature List**

> *A quick-reference map of every user story to the page or system component it belongs to. Use this to understand what pages need to be created and which user stories fall under each scope before diving into the full requirements.*

| `Scope / Page` | `Persona` | `US ID` | `Feature Title` | `Priority` |
| :--- | :--- | :--- | :--- | :--- |
| **[Page / Scope Name]** [URL or component description] | [Persona] | `US-X` | [Feature Title] | `P1` |

### **Requirements Detail SSOT**

> *Use this segment to add detail and ensure clarity of the requirement as well as the priority of each. Include any detail of the high-level requirements which could include: interaction, functionality, UI behavior, and user flows.*
> *Group the requirements by **Theme**.*

#### Theme: [Theme Name] (e.g., MTV Enhancements)

**`[US-1]` [Requirement Title]**

* **Priority:** [P1 / P2 / P3]
* **User Story:** **As a** [Persona] **I want to** [Action] **So that** [Benefit]

**Scope:**
[Specify bounded context where this feature applies, e.g., STV only, Dashboard, Native Table]

**Specs (Functional & Non-Functional):**

* **Entry Point / Trigger:** [e.g. Checkbox selection on grid, Button XYZ]
* **UI Component:** [e.g. Existing "Force Match" button, Modal, Dropdown]
* **Visuals & States:** [e.g. Loading state/Toast notification, Empty states, Error highlights]
* **Data / Constraints:** [e.g. Caching strategy, Limits, Pagination boundaries]

**User Flow:**

1. [User takes an initial action, e.g., clicks to add a condition]
2. [System responds, e.g., checks cache or fetches data]
3. [User makes a selection or decision]
4. [System finalizes state, e.g., applies filter and shows results]

**Behavior & Logic:**

* **Logic:** [e.g. Send list of Match IDs to backend (1 Request, Multiple IDs)]
* **Validation:** [e.g. Proactively disable button if invalid combination is selected]
* **State Management:** [e.g. Staged rows must remain persistent on device storage until execution]
* **Edge Cases:** [e.g. What happens on API timeout? What if trying to exceed a limit?]

---

## Decision Logs

> *Include any decision that is taken for the requirements from ongoing meetings.*

| Date | Decision | Context/Rationale | Stakeholder | Status |
| :--- | :--- | :--- | :--- | :--- |
| [MMM DD, YYYY] | [Change Description] | [Reason for change] | [Name] | [Approved/Rejected] |

---

## Acknowledgement

> *Include a table which informs stakeholders sign-off of the docs.*

| Stakeholder | Sign Off/Not | Sign off Date |
| :--- | :--- | :--- |
| Product - [Name] | [Approve/Acknowledge/Pending] | [Date] |
| Eng - [Name] | [Approve/Acknowledge/Pending] | [Date] |
| Proj Lead - [Name] | [Approve/Acknowledge/Pending] | [Date] |
| CS - [Name] | [Approve/Acknowledge/Pending] | [Date] |

---

## Feature Brief Template (Lightweight)

### Feature: [Name]

#### Context

*Why are we considering this?*

#### Hypothesis

*We believe that [building this feature]
For [these users]
Will [achieve this outcome]
We'll know we're right when [we see this metric]*

#### Proposed Solution

*High-level approach*

#### Effort Estimate

* **Size**: XS | S | M | L | XL

* **Confidence**: High | Medium | Low

#### Next Steps

1. [ ] User research
2. [ ] Design exploration
3. [ ] Technical spike
4. [ ] Stakeholder review
