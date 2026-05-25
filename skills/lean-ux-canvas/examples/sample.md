# Lean UX Canvas Examples

### ✅ Good: Mobile Checkout Optimization

**Context:** E-commerce company sees mobile traffic surpass desktop, but mobile conversion rate is 15% lower.

**Box 1 (Business Problem):**
"Mobile traffic now represents 60% of site visits, but mobile checkout conversion rate (45%) is 15% lower than desktop (60%). Our checkout flow wasn't designed for mobile—6 form fields, manual address entry, and 3-step payment. Competitors (Amazon, Shopify) offer one-tap checkout. We're losing revenue."

**Box 2 (Business Outcomes):**
- Increase mobile checkout conversion rate from 45% to 60% within 3 months

**Box 3 (Users):**
- Mobile-first millennials (25-35) who order 3+ times per week

**Box 4 (User Outcomes & Benefits):**
- Complete checkout in <30 seconds without typing (avoid frustration of fat-finger errors on mobile keyboard)

**Box 5 (Solutions):**
1. One-tap checkout (Apple Pay, Google Pay)
2. Auto-fill address from device location
3. Save payment method for returning customers

**Box 6 (Hypotheses):**
- "We believe increasing mobile checkout conversion rate from 45% to 60% will be achieved if mobile-first millennials (25-35) attain faster, friction-free checkout with one-tap Apple Pay integration."

**Box 7 (Riskiest Assumption):**
- Users will trust one-tap checkout without seeing itemized charges before confirming purchase

**Box 8 (Experiment):**
- Wizard-of-Oz test: Show one-tap checkout UI, but secretly process payment with existing flow. Measure: Do users click "Pay with Apple Pay"? Do they abandon after seeing the Apple Pay modal?

**Why This Works:**
- Clear business problem (mobile conversion gap)
- Measurable outcome (45% → 60%)
- Specific user segment
- Testable hypothesis
- Smallest experiment (Wizard-of-Oz, not full build)

---

### ❌ Bad: Feature-First Canvas (Solution-Driven)

**Box 1 (Business Problem):**
"We need to build a recommendation engine."

**Why This Fails:** This is a solution, not a problem. What changed? Why does a recommendation engine matter?

**Box 2 (Business Outcomes):**
"Increase revenue."

**Why This Fails:** Too vague. How will you measure? What behavior change indicates success?

**Box 5 (Solutions):**
"Recommendation engine."

**Why This Fails:** Only one solution (the one someone already decided on). No exploration of alternatives.

**Box 6 (Hypotheses):**
"We believe users will like recommendations."

**Why This Fails:** Not testable. Doesn't use the hypothesis template. Doesn't connect business outcome to user benefit.

**What Should Have Been Done:**
- Start with **what changed** in Box 1 (e.g., "Average order value dropped 20% after we removed upsell banners")
- Define **measurable outcome** in Box 2 (e.g., "Increase average order value from $50 to $75")
- List **multiple solutions** in Box 5 (e.g., manual upsell banners, AI recommendations, bundle discounts)
- Test each solution with a hypothesis

---

### ✅ Good: Enterprise Onboarding Friction

**Box 1 (Business Problem):**
"Enterprise customers churn after 6 months because onboarding requires 3+ weeks of manual configuration (SSO, permissions, user imports). Competitors offer self-service onboarding. Our CS team spends 40 hours per customer on setup, limiting our ability to scale."

**Box 7 (Riskiest Assumption):**
"Enterprise IT admins can configure SSO without human support."

**Box 8 (Experiment):**
"Concierge test: Manually guide 5 enterprise customers through a self-service onboarding wizard prototype (Figma mockup + Loom walkthrough). Measure: Can they complete setup in <3 days without calling support?"

**Why This Works:**
- Clear problem (manual onboarding blocks scale)
- Falsifiable assumption (admins can self-serve)
- Minimal experiment (concierge test before building automation)

---
