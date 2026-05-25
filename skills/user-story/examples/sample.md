# User Story Examples

## Example 1: Good User Story

```markdown
### User Story 042:

- **Summary:** Enable Google login for trial users to reduce signup friction

#### Use Case:
- **As a** trial user visiting the app for the first time
- **I want to** log in using my Google account
- **so that** I can access the app without creating and remembering a new password

#### Acceptance Criteria:

- **Scenario:** First-time trial user logs in via Google OAuth
- **Given:** I am on the login page
- **and Given:** I have a Google account
- **and Given:** The "Sign in with Google" button is visible
- **When:** I click the "Sign in with Google" button and authorize the app
- **Then:** I am logged into the app and redirected to the onboarding flow
```

**Why this works:**
- Persona is specific ("trial user visiting for the first time")
- Action is clear ("log in using my Google account")
- Outcome explains motivation ("without creating a new password")
- Acceptance criteria are testable (QA can verify each step)
- Only one When, one Then (appropriately scoped)

---

## Example 2: Bad User Story (Too Vague)

```markdown
### User Story 999:

- **Summary:** Improve login experience

#### Use Case:
- **As a** user
- **I want to** better login
- **so that** I can use the app

#### Acceptance Criteria:

- **Scenario:** User logs in
- **Given:** I want to log in
- **and Given:** I have an active account
- **When:** I log in
- **Then:** It works better
```

**Why this fails:**
- "User" is too generic (trial user? returning user? admin?)
- "Better login" is not an action (what specifically?)
- "Use the app" is not a specific outcome (everyone wants to use the app)
- Acceptance criteria are untestable ("works better" = unmeasurable)

**How to fix it:**
- Narrow the persona: "trial user," "returning user without password manager," etc.
- Define the action: "log in using Google," "reset my password via email," etc.
- Specify the outcome: "without remembering a new password," "in under 30 seconds," etc.
- Make acceptance criteria falsifiable: "Then I am redirected to the dashboard within 2 seconds"

---

## Example 3: Story That Needs Splitting

```markdown
### User Story 100:

- **Summary:** Manage shopping cart

#### Use Case:
- **As a** shopper
- **I want to** add items, remove items, update quantities, apply coupons, and checkout
- **so that** I can complete my purchase

#### Acceptance Criteria:

- **Scenario:** Shopping cart management
- **Given:** I have items in my cart
- **When:** I add an item
- **Then:** It appears in the cart
- **When:** I remove an item
- **Then:** It disappears from the cart
- **When:** I update quantity
- **Then:** The quantity changes
- **When:** I apply a coupon
- **Then:** The discount is applied
- **When:** I checkout
- **Then:** I proceed to payment
```

**Why this needs splitting:**
- Multiple "When" statements = multiple stories
- Scope is too large for a single sprint
- Different outcomes aren't related (adding items ≠ applying coupons)

**How to split it:**
Use `skills/user-story-splitting/SKILL.md` to break this into:
1. "Add items to cart"
2. "Remove items from cart"
3. "Update item quantities"
4. "Apply discount coupons"
5. "Checkout and proceed to payment"

Each becomes its own story with focused acceptance criteria.
