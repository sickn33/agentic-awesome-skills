---
name: code-review-checklist
description: "Comprehensive checklist for conducting thorough code reviews covering functionality, security, performance, and maintainability"
risk: unknown
source: community
date_added: "2026-02-27"
---

# Code Review Checklist

## Overview

Provide a systematic checklist for conducting thorough code reviews. This skill helps reviewers ensure code quality, catch bugs, identify security issues, and maintain consistency across the codebase.

## When to Use This Skill

- Use when reviewing pull requests
- Use when conducting code audits
- Use when establishing code review standards for a team
- Use when training new developers on code review practices
- Use when you want to ensure nothing is missed in reviews
- Use when creating code review documentation

## How It Works

### Step 1: Understand the Context

Before reviewing code, I'll help you understand:
- What problem does this code solve?
- What are the requirements?
- What files were changed and why?
- Are there related issues or tickets?
- What's the testing strategy?

### Step 2: Review Functionality

Check if the code works correctly:
- Does it solve the stated problem?
- Are edge cases handled?
- Is error handling appropriate?
- Are there any logical errors?
- Does it match the requirements?

### Step 3: Review Code Quality

Assess code maintainability:
- Is the code readable and clear?
- Are names descriptive?
- Is it properly structured?
- Are functions/methods focused?
- Is there unnecessary complexity?

### Step 4: Review Security

Check for security issues:
- Are inputs validated?
- Is sensitive data protected?
- Are there SQL injection risks?
- Is authentication/authorization correct?
- Are dependencies secure?

### Step 5: Review Performance

Look for performance issues:
- Are there unnecessary loops?
- Is database access optimized?
- Are there memory leaks?
- Is caching used appropriately?
- Are there N+1 query problems?

### Step 6: Review Tests

Verify test coverage:
- Are there tests for new code?
- Do tests cover edge cases?
- Are tests meaningful?
- Do all tests pass?
- Is test coverage adequate?

## Examples

### Example 1: Functionality Review Checklist

```markdown
## Functionality Review

### Requirements
- [ ] Code solves the stated problem
- [ ] All acceptance criteria are met
- [ ] Edge cases are handled
- [ ] Error cases are handled
- [ ] User input is validated

### Logic
- [ ] No logical errors or bugs
- [ ] Conditions are correct (no off-by-one errors)
- [ ] Loops terminate correctly
- [ ] Recursion has proper base cases
- [ ] State management is correct

### Error Handling
- [ ] Errors are caught appropriately
- [ ] Error messages are clear and helpful
- [ ] Errors don't expose sensitive information
- [ ] Failed operations are rolled back
- [ ] Logging is appropriate

### Example Issues to Catch:

**❌ Bad - Missing validation:**
\`\`\`javascript
function createUser(email, password) {
  // No validation!
  return db.users.create({ email, password });
}
\`\`\`

**✅ Good - Proper validation:**
\`\`\`javascript
function createUser(email, password) {
  if (!email || !isValidEmail(email)) {
    throw new Error('Invalid email address');
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  return db.users.create({ email, password });
}
\`\`\`
```

### Example 2: Security Review Checklist

```markdown
## Security Review

### Input Validation
- [ ] All user inputs are validated
- [ ] SQL injection is prevented (use parameterized queries)
- [ ] XSS is prevented (escape output)
- [ ] CSRF protection is in place
- [ ] File uploads are validated (type, size, content)

### Authentication & Authorization
- [ ] Authentication is required where needed
- [ ] Authorization checks are present
- [ ] Passwords are hashed (never stored plain text)
- [ ] Sessions are managed securely
- [ ] Tokens expire appropriately

### Data Protection
- [ ] Sensitive data is encrypted
- [ ] API keys are not hardcoded
- [ ] Environment variables are used for secrets
- [ ] Personal data follows privacy regulations
- [ ] Database credentials are secure

### Dependencies
- [ ] No known vulnerable dependencies
- [ ] Dependencies are up to date
- [ ] Unnecessary dependencies are removed
- [ ] Dependency versions are pinned

### Example Issues to Catch:

**❌ Bad - SQL injection risk:**
\`\`\`javascript
const query = \`SELECT * FROM users WHERE email = '\${email}'\`;
db.query(query);
\`\`\`

**✅ Good - Parameterized query:**
\`\`\`javascript
const query = 'SELECT * FROM users WHERE email = $1';
db.query(query, [email]);
\`\`\`

**❌ Bad - Hardcoded secret:**
\`\`\`javascript
const API_KEY = 'sk_live_abc123xyz';
\`\`\`

**✅ Good - Environment variable:**
\`\`\`javascript
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY environment variable is required');
}
\`\`\`
```

### Example 3: Code Quality Review Checklist

```markdown
## Code Quality Review

### Readability
- [ ] Code is easy to understand
- [ ] Variable names are descriptive
- [ ] Function names explain what they do
- [ ] Complex logic has comments
- [ ] Magic numbers are replaced with constants

### Structure
- [ ] Functions are small and focused
- [ ] Code follows DRY principle (Don't Repeat Yourself)
- [ ] Proper separation of concerns
- [ ] Consistent code style
- [ ] No dead code or commented-out code

### Maintainability
- [ ] Code is modular and reusable
- [ ] Dependencies are minimal
- [ ] Changes are backwards compatible
- [ ] Breaking changes are documented
- [ ] Technical debt is noted

### Example Issues to Catch:

**❌ Bad - Unclear naming:**
\`\`\`javascript
function calc(a, b, c) {
  return a * b + c;
}
\`\`\`

**✅ Good - Descriptive naming:**
\`\`\`javascript
function calculateTotalPrice(quantity, unitPrice, tax) {
  return quantity * unitPrice + tax;
}
\`\`\`

**❌ Bad - Function doing too much:**
\`\`\`javascript
function processOrder(order) {
  // Validate order
  if (!order.items) throw new Error('No items');
  
  // Calculate total
  let total = 0;
  for (let item of order.items) {
    total += item.price * item.quantity;
  }
  
  // Apply discount
  if (order.coupon) {
    total *= 0.9;
  }
  
  // Process payment
  const payment = stripe.charge(total);
  
  // Send email
  sendEmail(order.email, 'Order confirmed');
  
  // Update inventory
  updateInventory(order.items);
  
  return { orderId: order.id, total };
}
\`\`\`

**✅ Good - Separated concerns:**
\`\`\`javascript
function processOrder(order) {
  validateOrder(order);
  const total = calculateOrderTotal(order);
  const payment = processPayment(total);
  sendOrderConfirmation(order.email);
  updateInventory(order.items);
  
  return { orderId: order.id, total };
}
\`\`\`
```

## Best Practices

### ✅ Do This

- **Review Small Changes** - Smaller PRs are easier to review thoroughly
- **Check Tests First** - Verify tests pass and cover new code
- **Run the Code** - Test it locally when possible
- **Ask Questions** - Don't assume, ask for clarification
- **Be Constructive** - Suggest improvements, don't just criticize
- **Focus on Important Issues** - Don't nitpick minor style issues
- **Use Automated Tools** - Linters, formatters, security scanners
- **Review Documentation** - Check if docs are updated
- **Consider Performance** - Think about scale and efficiency
- **Check for Regressions** - Ensure existing functionality still works

### ❌ Don't Do This

- **Don't Approve Without Reading** - Actually review the code
- **Don't Be Vague** - Provide specific feedback with examples
- **Don't Ignore Security** - Security issues are critical
- **Don't Skip Tests** - Untested code will cause problems
- **Don't Be Rude** - Be respectful and professional
- **Don't Rubber Stamp** - Every review should add value
- **Don't Review When Tired** - You'll miss important issues
- **Don't Forget Context** - Understand the bigger picture

## Complete Review Checklist

### Pre-Review
- [ ] Read the PR description and linked issues
- [ ] Understand what problem is being solved
- [ ] Check if tests pass in CI/CD
- [ ] Pull the branch and run it locally

### Functionality
- [ ] Code solves the stated problem
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] User input is validated
- [ ] No logical errors

### Security
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Authentication/authorization is correct
- [ ] Sensitive data is protected
- [ ] No hardcoded secrets

### Performance
- [ ] No unnecessary database queries
- [ ] No N+1 query problems
- [ ] Efficient algorithms used
- [ ] No memory leaks
- [ ] Caching used appropriately

### Code Quality
- [ ] Code is readable and clear
- [ ] Names are descriptive
- [ ] Functions are focused and small
- [ ] No code duplication
- [ ] Follows project conventions

### Tests
- [ ] New code has tests
- [ ] Tests cover edge cases
- [ ] Tests are meaningful
- [ ] All tests pass
- [ ] Test coverage is adequate

### Documentation
- [ ] Code comments explain why, not what
- [ ] API documentation is updated
- [ ] README is updated if needed
- [ ] Breaking changes are documented
- [ ] Migration guide provided if needed

### Git
- [ ] Commit messages are clear
- [ ] No merge conflicts
- [ ] Branch is up to date with main
- [ ] No unnecessary files committed
- [ ] .gitignore is properly configured

## Common Pitfalls

### Problem: Missing Edge Cases
**Symptoms:** Code works for happy path but fails on edge cases
**Solution:** Ask "What if...?" questions
- What if the input is null?
- What if the array is empty?
- What if the user is not authenticated?
- What if the network request fails?

### Problem: Security Vulnerabilities
**Symptoms:** Code exposes security risks
**Solution:** Use security checklist
- Run security scanners (npm audit, Snyk)
- Check OWASP Top 10
- Validate all inputs
- Use parameterized queries
- Never trust user input

### Problem: Poor Test Coverage
**Symptoms:** New code has no tests or inadequate tests
**Solution:** Require tests for all new code
- Unit tests for functions
- Integration tests for features
- Edge case tests
- Error case tests

### Problem: Unclear Code
**Symptoms:** Reviewer can't understand what code does
**Solution:** Request improvements
- Better variable names
- Explanatory comments
- Smaller functions
- Clear structure

## Review Comment Templates

### Requesting Changes
```markdown
**Issue:** [Describe the problem]

**Current code:**
\`\`\`javascript
// Show problematic code
\`\`\`

**Suggested fix:**
\`\`\`javascript
// Show improved code
\`\`\`

**Why:** [Explain why this is better]
```

### Asking Questions
```markdown
**Question:** [Your question]

**Context:** [Why you're asking]

**Suggestion:** [If you have one]
```

### Praising Good Code
```markdown
**Nice!** [What you liked]

This is great because [explain why]
```

## Related Skills

- `@requesting-code-review` - Prepare code for review
- `@receiving-code-review` - Handle review feedback
- `@systematic-debugging` - Debug issues found in review
- `@test-driven-development` - Ensure code has tests

## Additional Resources

- [Google Code Review Guidelines](https://google.github.io/eng-practices/review/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Code Review Best Practices](https://github.com/thoughtbot/guides/tree/main/code-review)
- [How to Review Code](https://www.kevinlondon.com/2015/05/05/code-review-best-practices.html)

---

**Pro Tip:** Use a checklist template for every review to ensure consistency and thoroughness. Customize it for your team's specific needs!

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
