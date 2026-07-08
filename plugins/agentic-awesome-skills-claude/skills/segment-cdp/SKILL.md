---
name: segment-cdp
description: Expert patterns for Segment Customer Data Platform including
  Analytics.js, server-side tracking, tracking plans with Protocols, identity
  resolution, destinations configuration, and data governance best practices.
risk: safe
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Segment CDP

Expert patterns for Segment Customer Data Platform including Analytics.js,
server-side tracking, tracking plans with Protocols, identity resolution,
destinations configuration, and data governance best practices.

## Patterns

### Analytics.js Browser Integration

Client-side tracking with Analytics.js. Include track, identify, page,
and group calls. Anonymous ID persists until identify merges with user.

// Next.js - Analytics provider component
// lib/segment.ts
import { AnalyticsBrowser } from '@segment/analytics-next';

export const analytics = AnalyticsBrowser.load({
  writeKey: process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY!,
});

// Typed event helpers
export interface UserTraits {
  email?: string;
  name?: string;
  plan?: 'free' | 'pro' | 'enterprise';
  createdAt?: string;
  company?: {
    id: string;
    name: string;
  };
}

export function identify(userId: string, traits?: UserTraits) {
  analytics.identify(userId, traits);
}

export function track<T extends Record<string, any>>(
  event: string,
  properties?: T
) {
  analytics.track(event, properties);
}

export function page(name?: string, properties?: Record<string, any>) {
  analytics.page(name, properties);
}

export function group(groupId: string, traits?: Record<string, any>) {
  analytics.group(groupId, traits);
}

// React hook for analytics
// hooks/useAnalytics.ts
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics, page } from '@/lib/segment';

export function usePageTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Track page view on route change
    page(pathname, {
      path: pathname,
      search: searchParams.toString(),
      url: window.location.href,
      title: document.title,
    });
  }, [pathname, searchParams]);
}

// Usage in _app.tsx or layout.tsx
function RootLayout({ children }) {
  usePageTracking();

  return <html>{children}</html>;
}

// Event tracking in components
function PricingButton({ plan }: { plan: string }) {
  const handleClick = () => {
    track('Plan Selected', {
      plan_name: plan,
      page: 'pricing',
      source: 'pricing_page',
    });
  };

  return <button onClick={handleClick}>Select {plan}</button>;
}

// Identify on auth
function onUserLogin(user: User) {
  identify(user.id, {
    email: user.email,
    name: user.name,
    plan: user.plan,
    createdAt: user.createdAt,
  });

  track('User Signed In', {
    method: 'email',
  });
}

### Context

- browser tracking
- website analytics
- client-side events

### Server-Side Tracking with Node.js

High-performance server-side tracking using @segment/analytics-node.
Non-blocking with internal batching. Essential for backend events,
webhooks, and sensitive data.

// lib/segment-server.ts
import { Analytics } from '@segment/analytics-node';

// Initialize once
const analytics = new Analytics({
  writeKey: process.env.SEGMENT_WRITE_KEY!,
  flushAt: 20,      // Batch size before flush
  flushInterval: 10000,  // Flush every 10 seconds
});

// Typed server-side tracking
export interface ServerContext {
  ip?: string;
  userAgent?: string;
  locale?: string;
}

export function serverIdentify(
  userId: string,
  traits: Record<string, any>,
  context?: ServerContext
) {
  analytics.identify({
    userId,
    traits,
    context: {
      ip: context?.ip,
      userAgent: context?.userAgent,
      locale: context?.locale,
    },
  });
}

export function serverTrack(
  userId: string,
  event: string,
  properties?: Record<string, any>,
  context?: ServerContext
) {
  analytics.track({
    userId,
    event,
    properties,
    timestamp: new Date(),
    context: {
      ip: context?.ip,
      userAgent: context?.userAgent,
    },
  });
}

// Flush on shutdown
export async function closeAnalytics() {
  await analytics.closeAndFlush();
}

// Usage in API routes
// app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const event = await req.json();

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;

      serverTrack(
        session.client_reference_id,
        'Order Completed',
        {
          order_id: session.id,
          total: session.amount_total / 100,
          currency: session.currency,
          payment_method: session.payment_method_types[0],
        },
        { ip: req.headers.get('x-forwarded-for') || undefined }
      );

      // Also update user traits
      serverIdentify(session.client_reference_id, {
        total_spent: session.amount_total / 100,
        last_purchase_date: new Date().toISOString(),
      });
      break;

    case 'customer.subscription.created':
      serverTrack(
        event.data.object.metadata.user_id,
        'Subscription Started',
        {
          plan: event.data.object.items.data[0].price.nickname,
          amount: event.data.object.items.data[0].price.unit_amount / 100,
          interval: event.data.object.items.data[0].price.recurring.interval,
        }
      );
      break;
  }

  return new Response('ok');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closeAnalytics();
  process.exit(0);
});

### Context

- server-side tracking
- backend events
- webhook processing

### Tracking Plan Design

Design event schemas using Object + Action naming convention.
Define required properties, types, and validation rules.
Connect to Protocols for enforcement.

// Tracking plan definition (conceptual YAML structure)
// This maps to Segment Protocols configuration
/*
tracking_plan:
  display_name: "MyApp Tracking Plan"
  rules:
    events:
      - name: "User Signed Up"
        description: "User completed registration"
        rules:
          required:
            - signup_method
          properties:
            signup_method:
              type: string
              enum: [email, google, github]
            referral_code:
              type: string
            utm_source:
              type: string

      - name: "Product Viewed"
        description: "User viewed a product page"
        rules:
          required:
            - product_id
            - product_name
          properties:
            product_id:
              type: string
            product_name:
              type: string
            category:
              type: string
            price:
              type: number
            currency:
              type: string
              default: USD

      - name: "Order Completed"
        description: "User completed a purchase"
        rules:
          required:
            - order_id
            - total
            - products
          properties:
            order_id:
              type: string
            total:
              type: number
            currency:
              type: string
            products:
              type: array
              items:
                type: object
                properties:
                  product_id: { type: string }
                  name: { type: string }
                  price: { type: number }
                  quantity: { type: integer }

    identify:
      traits:
        - name: email
          type: string
          required: true
        - name: name
          type: string
        - name: plan
          type: string
          enum: [free, pro, enterprise]
        - name: company
          type: object
          properties:
            id: { type: string }
            name: { type: string }
*/

// TypeScript implementation with type safety
// types/segment-events.ts
export interface TrackingEvents {
  'User Signed Up': {
    signup_method: 'email' | 'google' | 'github';
    referral_code?: string;
    utm_source?: string;
  };

  'Product Viewed': {
    product_id: string;
    product_name: string;
    category?: string;
    price?: number;
    currency?: string;
  };

  'Order Completed': {
    order_id: string;
    total: number;
    currency?: string;
    products: Array<{
      product_id: string;
      name: string;
      price: number;
      quantity: number;
    }>;
  };

  'Feature Used': {
    feature_name: string;
    usage_count?: number;
  };
}

// Type-safe track function
export function trackEvent<T extends keyof TrackingEvents>(
  event: T,
  properties: TrackingEvents[T]
) {
  analytics.track(event, properties);
}

// Usage - compile-time type checking
trackEvent('Order Completed', {
  order_id: 'ord_123',
  total: 99.99,
  products: [
    { product_id: 'prod_1', name: 'Widget', price: 49.99, quantity: 2 },
  ],
});

// This would be a TypeScript error:
// trackEvent('Order Completed', { total: 99.99 });  // Missing order_id

### Context

- tracking plan
- data governance
- event schema

### Identity Resolution

Track anonymous users, then merge with identified users via identify().
Use alias() for identity merging between systems. Group users into
companies/organizations.

// Identity flow implementation
// lib/identity.ts

// Anonymous user tracking
export function trackAnonymousAction(event: string, properties?: object) {
  // Analytics.js automatically generates anonymousId
  analytics.track(event, properties);
}

// When user signs up or logs in
export async function identifyUser(user: {
  id: string;
  email: string;
  name?: string;
  plan?: string;
}) {
  // This merges anonymous history with user profile
  await analytics.identify(user.id, {
    email: user.email,
    name: user.name,
    plan: user.plan,
    created_at: new Date().toISOString(),
  });

  // Track the identification event
  analytics.track('User Identified', {
    method: 'signup',
  });
}

// B2B: Associate user with company
export function associateWithCompany(company: {
  id: string;
  name: string;
  plan?: string;
  employees?: number;
  industry?: string;
}) {
  analytics.group(company.id, {
    name: company.name,
    plan: company.plan,
    employees: company.employees,
    industry: company.industry,
  });
}

// Alias: Link identities (e.g., pre-signup email to user ID)
export function linkIdentities(previousId: string, newUserId: string) {
  // Use when you identified someone with a temporary ID
  // and now have their permanent user ID
  analytics.alias(newUserId, previousId);
}

// Full signup flow
export async function handleSignup(
  email: string,
  password: string,
  company?: { name: string; size: string }
) {
  // 1. Create user in your system
  const user = await createUser(email, password);

  // 2. Identify with Segment (merges anonymous history)
  await identifyUser({
    id: user.id,
    email: user.email,
    name: user.name,
    plan: 'free',
  });

  // 3. Track signup event
  analytics.track('User Signed Up', {
    signup_method: 'email',
    plan: 'free',
  });

  // 4. If B2B, associate with company
  if (company) {
    const companyRecord = await createCompany(company, user.id);

    associateWithCompany({
      id: companyRecord.id,
      name: company.name,
      employees: parseInt(company.size),
    });
  }
}

### Context

- user identification
- anonymous tracking
- b2b tracking

### Destinations Configuration

Route data to analytics tools, data warehouses, and marketing platforms.
Use device-mode for client-side tools, cloud-mode for server processing.

// Segment destinations are configured in the Segment UI
// but here's how to optimize your implementation

// Conditional tracking based on destination needs
// lib/segment-destinations.ts

interface DestinationConfig {
  mixpanel: boolean;
  amplitude: boolean;
  googleAnalytics: boolean;
  warehouse: boolean;
  hubspot: boolean;
}

// Only send events needed by specific destinations
export function trackWithDestinations(
  event: string,
  properties: Record<string, any>,
  options?: {
    integrations?: Partial<DestinationConfig>;
  }
) {
  analytics.track(event, properties, {
    integrations: {
      // Override specific destinations
      All: true,  // Send to all by default
      ...options?.integrations,
    },
  });
}

// Example: Track revenue event only to revenue-tracking destinations
export function trackRevenue(order: {
  orderId: string;
  total: number;
  currency: string;
}) {
  analytics.track('Order Completed', {
    order_id: order.orderId,
    revenue: order.total,
    currency: order.currency,
  }, {
    integrations: {
      // Explicitly enable revenue destinations
      'Google Analytics 4': true,
      'Mixpanel': true,
      'Amplitude': true,
      // Disable non-revenue destinations
      'Intercom': false,
      'Zendesk': false,
    },
  });
}

// Send PII only to secure destinations
export function identifyWithPII(userId: string, traits: {
  email: string;
  phone?: string;
  address?: string;
}) {
  analytics.identify(userId, traits, {
    integrations: {
      'All': false,  // Disable all by default
      // Only send PII to trusted destinations
      'HubSpot': true,
      'Salesforce': true,
      'Warehouse': true,  // Your data warehouse
      // Don't send PII to analytics tools
      'Mixpanel': false,
      'Amplitude': false,
    },
  });
}

// Context enrichment for all events
export function enrichedTrack(
  event: string,
  properties: Record<string, any>
) {
  analytics.track(event, {
    ...properties,
    // Add common context
    app_version: process.env.NEXT_PUBLIC_APP_VERSION,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }, {
    context: {
      app: {
        name: 'MyApp',
        version: process.env.NEXT_PUBLIC_APP_VERSION,
      },
    },
  });
}

### Context

- data routing
- destination setup
- tool integration

### HTTP Tracking API

Direct HTTP API for any environment. Useful for edge functions,
workers, and non-Node.js backends. Batch up to 500KB per request.

// Edge/Serverless tracking via HTTP API
// lib/segment-http.ts

const SEGMENT_WRITE_KEY = process.env.SEGMENT_WRITE_KEY!;
const SEGMENT_API = 'https://api.segment.io/v1';

// Base64 encode write key for auth
const authHeader = `Basic ${btoa(SEGMENT_WRITE_KEY + ':')}`;

interface SegmentEvent {
  userId?: string;
  anonymousId?: string;
  event?: string;
  name?: string;  // For page calls
  properties?: Record<string, any>;
  traits?: Record<string, any>;
  context?: Record<string, any>;
  timestamp?: string;
}

async function segmentRequest(
  endpoint: string,
  payload: SegmentEvent
): Promise<void> {
  const response = await fetch(`${SEGMENT_API}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    console.error('Segment API error:', await response.text());
  }
}

// HTTP API methods
export async function httpIdentify(
  userId: string,
  traits: Record<string, any>,
  context?: Record<string, any>
) {
  await segmentRequest('/identify', {
    userId,
    traits,
    context,
  });
}

export async function httpTrack(
  userId: string,
  event: string,
  properties?: Record<string, any>,
  context?: Record<string, any>
) {
  await segmentRequest('/track', {
    userId,
    event,
    properties,
    context,
  });
}

export async function httpPage(
  userId: string,
  name: string,
  properties?: Record<string, any>
) {
  await segmentRequest('/page', {
    userId,
    name,
    properties,
  });
}

// Batch API for high volume
export async function httpBatch(
  events: Array<{
    type: 'identify' | 'track' | 'page' | 'group';
    userId?: string;
    anonymousId?: string;
    event?: string;
    name?: string;
    properties?: Record<string, any>;
    traits?: Record<string, any>;
  }>
) {
  // Max 500KB per batch, 32KB per event
  await segmentRequest('/batch', {
    batch: events.map(e => ({
      ...e,
      timestamp: new Date().toISOString(),
    })),
  } as any);
}

// Cloudflare Worker example
export default {
  async fetch(request: Request): Promise<Response> {
    const { userId, action, data } = await request.json();

    // Track in edge function
    await httpTrack(userId, action, data, {
      ip: request.headers.get('cf-connecting-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return new Response('ok');
  },
};

### Context

- edge functions
- serverless
- http tracking

## Sharp Edges

### Anonymous ID Persists Until Explicit Reset

Severity: MEDIUM

### Device Mode Bypasses Protocols Blocking

Severity: HIGH

### HTTP API Has Strict Size Limits

Severity: MEDIUM

### Track Calls Without Identify Are Anonymous

Severity: HIGH

### Write Key in Client is Visible (But Intentional)

Severity: LOW

### Events May Be Lost on Page Navigation

Severity: MEDIUM

### Timestamps Without Timezone Cause Analytics Issues

Severity: MEDIUM

### Tracking Before Consent Violates GDPR

Severity: HIGH

## Validation Checks

### Dynamic Event Name

Severity: ERROR

Event names should be static, not include dynamic values

Message: Dynamic event name detected. Use static event names with dynamic properties.

### Inconsistent Event Name Casing

Severity: WARNING

Event names should follow consistent casing convention

Message: Mixed casing in event name. Use consistent convention (e.g., Title Case).

### Track Without Prior Identify

Severity: WARNING

Users should be identified before tracking critical events

Message: Revenue/conversion event without identify. Ensure user is identified.

### Missing Analytics Reset on Logout

Severity: WARNING

Analytics should be reset when user logs out

Message: Logout without analytics.reset(). Anonymous ID will persist to next user.

### Hardcoded Segment Write Key

Severity: ERROR

Write key should use environment variables

Message: Hardcoded Segment write key. Use environment variables.

### PII Sent to All Destinations

Severity: WARNING

PII should have destination controls

Message: PII in tracking without destination controls. Consider limiting destinations.

### Event Without Proper Timestamp

Severity: INFO

Explicit timestamps help with historical data

Message: Server track without explicit timestamp. Consider adding timestamp.

### Potentially Large Property Values

Severity: WARNING

Properties over 32KB will be rejected

Message: Potentially large property value. Segment has 32KB per event limit.

### Tracking Before Consent Check

Severity: ERROR

GDPR requires consent before tracking

Message: Tracking without consent check. Implement consent management for GDPR.

## Collaboration

### Delegation Triggers

- user needs A/B testing -> analytics-specialist (Segment + LaunchDarkly/Optimizely integration)
- user needs data warehouse -> data-engineer (Segment to BigQuery/Snowflake/Redshift)
- user needs customer support integration -> zendesk-integration (Identify calls syncing to support tools)
- user needs marketing automation -> hubspot-integration (Segment to HubSpot destination)
- user needs consent management -> privacy-specialist (GDPR/CCPA compliance with Segment)

## When to Use
- User mentions or implies: segment
- User mentions or implies: analytics.js
- User mentions or implies: customer data platform
- User mentions or implies: cdp
- User mentions or implies: tracking plan
- User mentions or implies: event tracking
- User mentions or implies: identify track page
- User mentions or implies: data routing

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
