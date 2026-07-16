# 💡 Real-World Examples - See Skills in Action

**Learn by example!** This guide shows you real conversations using different skills.

---

## Example 1: Designing a Feature with @brainstorming

### The Scenario
You want to add a "dark mode" feature to your app, but you're not sure how to approach it.

### The Conversation

```
You: @brainstorming I want to add dark mode to my React app

AI: Great! Let me help you think through this. First, let me check your 
    current project structure...
    
    [AI examines your files]
    
    I see you're using React with Tailwind CSS. Now, let's understand 
    your requirements:
    
    What's your primary goal for dark mode?
    a) User preference (toggle in settings)
    b) System preference (follow OS setting)
    c) Both (with manual override)

You: c) Both

AI: Perfect! That's the best user experience. Next question:
    
    Where should the dark mode toggle be located?
    a) In the main navigation
    b) In a settings page
    c) In a dropdown menu
    d) Multiple locations

You: a) In the main navigation

AI: Good choice for accessibility. One more question:
    
    Should dark mode preference persist across sessions?
    a) Yes, save to localStorage
    b) Yes, save to user account (requires backend)
    c) No, reset each session

You: a) Yes, save to localStorage

AI: Excellent! Now I have a clear picture. Let me present the design...
    
    ## Dark Mode Implementation Design
    
    ### Architecture Overview
    We'll use React Context for state management, Tailwind's dark mode
    utilities, and localStorage for persistence. The system will:
    1. Check OS preference on first visit
    2. Allow manual override via toggle
    3. Persist preference in localStorage
    
    Does this approach look good so far?

You: Yes, continue

AI: [Continues with detailed design sections...]
    
    [After design is complete]
    
    I've saved the design to docs/plans/2026-01-20-dark-mode-design.md
    
    Ready to set up for implementation?

You: Yes

AI: I'll create an isolated workspace using git worktrees and write an
    implementation plan. One moment...
```

### What Happened
- ✅ AI asked focused questions one at a time
- ✅ Explored your specific context
- ✅ Presented design in sections
- ✅ Saved documentation
- ✅ Prepared for implementation

---

## Example 2: Debugging with @systematic-debugging

### The Scenario
Your tests are failing, but you're not sure why.

### The Conversation

```
You: @systematic-debugging My tests are failing with "Cannot read property 
     'map' of undefined"

AI: Let me help you debug this systematically. First, I'll gather information:
    
    1. Running the failing test to see the full error...
    
    [AI runs: npm test]
    
    I see the error occurs in UserList.test.tsx at line 45. Let me examine
    the test file and the component...
    
    [AI reads both files]
    
    ## Hypothesis
    The test is failing because `users` prop is undefined when the component
    renders. This suggests the mock data isn't being passed correctly.
    
    ## Verification
    Let me check the test setup...
    
    [AI examines test]
    
    Found it! The test is calling:
    ```typescript
    render(<UserList />)
    ```
    
    But UserList requires a `users` prop. The component expects:
    ```typescript
    interface UserListProps {
      users: User[];
    }
    ```
    
    ## Solution
    The test should pass the users prop:
    ```typescript
    const mockUsers = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ];
    
    render(<UserList users={mockUsers} />)
    ```
    
    Should I apply this fix?

You: Yes

AI: [Applies fix and runs tests]
    
    ✅ All tests passing!
    
    ## Root Cause
    The test was missing required props. This is a common issue when
    components are refactored to require props that were previously optional.
    
    ## Prevention
    Consider adding TypeScript strict mode to catch these at compile time:
    ```json
    "strict": true,
    "strictNullChecks": true
    ```
    
    Would you like me to add this to your tsconfig.json?
```

### What Happened
- ✅ Systematic investigation
- ✅ Clear hypothesis
- ✅ Verification before fixing
- ✅ Root cause analysis
- ✅ Prevention suggestions

---

## Example 3: Adding Payments with @stripe-integration

### The Scenario
You need to add subscription billing to your SaaS app.

### The Conversation

```
You: @stripe-integration I need to add monthly subscription billing

AI: I'll help you implement Stripe subscriptions. Let me understand your
    requirements:
    
    Current stack detected:
    - Next.js 14 (App Router)
    - TypeScript
    - Prisma with PostgreSQL
    
    For subscription billing, we'll need:
    
    1. **Stripe Setup**
       - Stripe account and API keys
       - Webhook endpoint for events
       - Product and price IDs
    
    2. **Backend Implementation**
       - API routes for checkout
       - Webhook handler
       - Database schema for subscriptions
    
    3. **Frontend Implementation**
       - Pricing page
       - Checkout flow
       - Subscription management
    
    Let's start with the backend. First, install dependencies:
    
    ```bash
    npm install stripe @stripe/stripe-js
    ```
    
    Now, let's create the database schema...
    
    [AI provides Prisma schema]
    
    ```prisma
    model User {
      id                 String    @id @default(cuid())
      email              String    @unique
      stripeCustomerId   String?   @unique
      subscriptions      Subscription[]
    }
    
    model Subscription {
      id                 String    @id @default(cuid())
      userId             String
      user               User      @relation(fields: [userId], references: [id])
      stripeSubscriptionId String  @unique
      status             String
      priceId            String
      currentPeriodEnd   DateTime
      createdAt          DateTime  @default(now())
      updatedAt          DateTime  @updatedAt
    }
    ```
    
    Next, let's create the checkout API route...
    
    [AI provides complete implementation with:]
    - API route for creating checkout sessions
    - Webhook handler for subscription events
    - Helper functions for Stripe operations
    - Error handling and logging
    - TypeScript types
    
    Now for the frontend...
    
    [AI provides:]
    - Pricing page component
    - Checkout button component
    - Subscription status display
    - Tailwind styling
    
    Finally, let's set up the webhook:
    
    1. In Stripe Dashboard, add webhook endpoint:
       `https://yourdomain.com/api/webhooks/stripe`
    
    2. Select these events:
       - customer.subscription.created
       - customer.subscription.updated
       - customer.subscription.deleted
       - invoice.payment_succeeded
       - invoice.payment_failed
    
    3. Copy the webhook secret to your .env:
       ```
       STRIPE_WEBHOOK_SECRET=whsec_...
       ```
    
    ## Testing
    
    Test locally with Stripe CLI:
    ```bash
    stripe listen --forward-to localhost:3000/api/webhooks/stripe
    stripe trigger customer.subscription.created
    ```
    
    ## Security Checklist
    - ✅ API keys in environment variables
    - ✅ Webhook signature verification
    - ✅ Server-side price validation
    - ✅ Idempotency keys for operations
    
    Ready to test the implementation?
```

### What Happened
- ✅ Detected existing stack
- ✅ Provided complete implementation
- ✅ Included database schema
- ✅ Added security best practices
- ✅ Included testing instructions

---

## Example 4: Writing Copy with @copywriting

### The Scenario
You need compelling copy for your SaaS landing page.

### The Conversation

```
You: @copywriting Write homepage copy for my project management tool

AI: I'll help you create compelling homepage copy. First, let me understand
    your product:
    
    What makes your project management tool different from competitors
    like Asana, Trello, or Monday.com?

You: It's specifically built for remote teams with built-in video standups
     and async communication features

AI: Excellent differentiator! Who is your primary target audience?
    a) Startups and small teams (2-20 people)
    b) Mid-size companies (20-200 people)
    c) Enterprise (200+ people)
    d) Freelancers and agencies

You: a) Startups and small teams

AI: Perfect. What's the main pain point you solve?

You: Remote teams waste time in unnecessary meetings and lose context
     in async communication

AI: Great! Now I have what I need. Here's your homepage copy:
    
    ---
    
    ## Hero Section
    
    **Headline:**
    Run Your Remote Team Without the Meeting Overload
    
    **Subheadline:**
    The project management tool built for distributed teams. Replace 
    status meetings with async video standups and keep everyone in sync
    without the Zoom fatigue.
    
    **CTA:**
    Start Free Trial → (No credit card required)
    
    ---
    
    ## Problem Section
    
    **Headline:**
    Remote Work Shouldn't Mean More Meetings
    
    **Body:**
    Your team is distributed across time zones. You're spending hours in
    status meetings just to stay aligned. Async updates get lost in Slack.
    Context disappears. Productivity suffers.
    
    Sound familiar?
    
    ---
    
    ## Solution Section
    
    **Headline:**
    Stay Aligned Without the Meeting Marathon
    
    **Features:**
    
    📹 **Async Video Standups**
    Record quick video updates on your schedule. Your team watches when
    it works for them. No more 9am calls for your teammate in Tokyo.
    
    💬 **Context-Rich Communication**
    Every task, comment, and decision stays connected. No more hunting
    through Slack threads or email chains.
    
    📊 **Visual Progress Tracking**
    See what's happening at a glance. Kanban boards, timelines, and
    dashboards that actually make sense.
    
    🔔 **Smart Notifications**
    Get notified about what matters. Ignore the rest. Your focus time
    is sacred.
    
    ---
    
    ## Social Proof Section
    
    **Headline:**
    Trusted by Remote Teams Worldwide
    
    [Testimonial placeholders with structure]
    
    ---
    
    ## CTA Section
    
    **Headline:**
    Ready to Reclaim Your Calendar?
    
    **Body:**
    Join 500+ remote teams who've cut meeting time by 60% while staying
    more aligned than ever.
    
    **CTA:**
    Start Your Free 14-Day Trial →
    
    No credit card required. Cancel anytime.
    
    ---
    
    ## Copy Notes
    
    **Tone:** Professional but conversational
    **Focus:** Pain point (too many meetings) → Solution (async video)
    **Differentiation:** Built specifically for remote teams
    **Social proof:** Quantified benefit (60% fewer meetings)
    
    Would you like me to:
    1. Write alternative versions for A/B testing?
    2. Create copy for specific feature pages?
    3. Write email sequences for onboarding?
```

### What Happened
- ✅ Asked clarifying questions
- ✅ Identified unique value proposition
- ✅ Created benefit-focused copy
- ✅ Included clear CTAs
- ✅ Provided copy notes for consistency

---

## Example 5: Test-Driven Development with @test-driven-development

### The Scenario
You need to implement a new feature: user authentication.

### The Conversation

```
You: @test-driven-development I need to implement user login functionality

AI: Perfect! Let's use TDD to build this. Following the Red-Green-Refactor
    cycle, we'll write tests first, then implement.
    
    ## Step 1: Write the First Test (RED)
    
    Let's start with the simplest case - successful login:
    
    ```typescript
    // auth.test.ts
    import { login } from './auth';
    
    describe('login', () => {
      it('should return user data for valid credentials', async () => {
        const result = await login({
          email: 'user@example.com',
          password: 'correct-password'
        });
        
        expect(result.success).toBe(true);
        expect(result.user).toHaveProperty('id');
        expect(result.user).toHaveProperty('email');
        expect(result.token).toBeDefined();
      });
    });
    ```
    
    Let's run this test to see it fail:
    
    [AI runs: npm test]
    
    ✅ Test fails as expected (auth.ts doesn't exist yet)
    
    ## Step 2: Write Minimal Implementation (GREEN)
    
    Now let's write just enough code to make this test pass:
    
    ```typescript
    // auth.ts
    interface LoginCredentials {
      email: string;
      password: string;
    }
    
    interface LoginResult {
      success: boolean;
      user?: {
        id: string;
        email: string;
      };
      token?: string;
    }
    
    export async function login(
      credentials: LoginCredentials
    ): Promise<LoginResult> {
      // Minimal implementation to pass the test
      return {
        success: true,
        user: {
          id: '1',
          email: credentials.email
        },
        token: 'fake-token'
      };
    }
    ```
    
    [AI runs: npm test]
    
    ✅ Test passes!
    
    ## Step 3: Add Next Test (RED)
    
    Now let's test the failure case:
    
    ```typescript
    it('should return error for invalid credentials', async () => {
      const result = await login({
        email: 'user@example.com',
        password: 'wrong-password'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();
    });
    ```
    
    [AI runs: npm test]
    
    ❌ Test fails (always returns success)
    
    ## Step 4: Implement Real Logic (GREEN)
    
    Now let's add actual authentication:
    
    ```typescript
    import bcrypt from 'bcrypt';
    import jwt from 'jsonwebtoken';
    import { db } from './db';
    
    export async function login(
      credentials: LoginCredentials
    ): Promise<LoginResult> {
      // Find user
      const user = await db.user.findUnique({
        where: { email: credentials.email }
      });
      
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }
      
      // Verify password
      const validPassword = await bcrypt.compare(
        credentials.password,
        user.passwordHash
      );
      
      if (!validPassword) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }
      
      // Generate token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
      
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email
        },
        token
      };
    }
    ```
    
    [AI runs: npm test]
    
    ✅ All tests pass!
    
    ## Step 5: Add Edge Cases
    
    Let's add more tests for edge cases:
    
    ```typescript
    it('should handle missing email', async () => {
      const result = await login({
        email: '',
        password: 'password'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email is required');
    });
    
    it('should handle missing password', async () => {
      const result = await login({
        email: 'user@example.com',
        password: ''
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Password is required');
    });
    
    it('should handle database errors gracefully', async () => {
      // Mock database error
      jest.spyOn(db.user, 'findUnique').mockRejectedValue(
        new Error('Database connection failed')
      );
      
      const result = await login({
        email: 'user@example.com',
        password: 'password'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('An error occurred');
    });
    ```
    
    [AI implements validation and error handling]
    
    ## Step 6: Refactor (REFACTOR)
    
    Now that all tests pass, let's refactor for better code quality:
    
    ```typescript
    // Extract validation
    function validateCredentials(credentials: LoginCredentials): string | null {
      if (!credentials.email) return 'Email is required';
      if (!credentials.password) return 'Password is required';
      return null;
    }
    
    // Extract user verification
    async function verifyUser(
      email: string,
      password: string
    ): Promise<User | null> {
      const user = await db.user.findUnique({ where: { email } });
      if (!user) return null;
      
      const valid = await bcrypt.compare(password, user.passwordHash);
      return valid ? user : null;
    }
    
    // Main function is now cleaner
    export async function login(
      credentials: LoginCredentials
    ): Promise<LoginResult> {
      try {
        const validationError = validateCredentials(credentials);
        if (validationError) {
          return { success: false, error: validationError };
        }
        
        const user = await verifyUser(
          credentials.email,
          credentials.password
        );
        
        if (!user) {
          return { success: false, error: 'Invalid credentials' };
        }
        
        const token = generateToken(user.id);
        
        return {
          success: true,
          user: { id: user.id, email: user.email },
          token
        };
      } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'An error occurred' };
      }
    }
    ```
    
    [AI runs: npm test]
    
    ✅ All tests still pass after refactoring!
    
    ## Summary
    
    We've implemented login functionality using TDD:
    - ✅ 5 tests covering happy path, errors, and edge cases
    - ✅ Clean, testable code
    - ✅ Proper error handling
    - ✅ Type safety with TypeScript
    
    Next steps:
    1. Add rate limiting tests
    2. Add session management tests
    3. Add logout functionality
    
    Should I continue with these?
```

### What Happened
- ✅ Followed Red-Green-Refactor cycle
- ✅ Wrote tests before implementation
- ✅ Covered edge cases
- ✅ Refactored with confidence
- ✅ Maintained test coverage

---

## Key Takeaways

### What Makes These Examples Effective?

1. **Skills ask clarifying questions** before jumping to solutions
2. **Skills provide context-aware help** based on your project
3. **Skills follow best practices** for their domain
4. **Skills include complete examples** not just snippets
5. **Skills explain the "why"** not just the "how"

### How to Get Similar Results

1. **Be specific** in your requests
2. **Provide context** about your project
3. **Answer questions** the skill asks
4. **Review suggestions** before applying
5. **Iterate** based on results

---

## Try These Yourself!

Pick a skill and try it with your own project:

- **Planning:** `@brainstorming` or `@writing-plans`
- **Development:** `@test-driven-development` or `@react-best-practices`
- **Debugging:** `@systematic-debugging` or `@test-fixing`
- **Integration:** `@stripe-integration` or `@firebase`
- **Marketing:** `@copywriting` or `@seo-audit`

---

**Want more examples?** Check individual skill folders for additional examples and use cases!
