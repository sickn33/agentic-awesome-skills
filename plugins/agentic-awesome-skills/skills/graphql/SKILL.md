---
name: graphql
description: GraphQL gives clients exactly the data they need - no more, no
  less. One endpoint, typed schema, introspection. But the flexibility that
  makes it powerful also makes it dangerous. Without proper controls, clients
  can craft queries that bring down your server.
risk: safe
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# GraphQL

GraphQL gives clients exactly the data they need - no more, no less. One
endpoint, typed schema, introspection. But the flexibility that makes it
powerful also makes it dangerous. Without proper controls, clients can
craft queries that bring down your server.

This skill covers schema design, resolvers, DataLoader for N+1 prevention,
federation for microservices, and client integration with Apollo/urql.
Key insight: GraphQL is a contract. The schema is the API documentation.
Design it carefully.

2025 lesson: GraphQL isn't always the answer. For simple CRUD, REST is
simpler. For high-performance public APIs, REST with caching wins. Use
GraphQL when you have complex data relationships and diverse client needs.

## Principles

- Schema-first design - the schema is the contract
- Prevent N+1 queries with DataLoader
- Limit query depth and complexity
- Use fragments for reusable selections
- Mutations should be specific, not generic update operations
- Errors are data - use union types for expected failures
- Nullability is meaningful - design it intentionally

## Capabilities

- graphql-schema-design
- graphql-resolvers
- graphql-federation
- graphql-subscriptions
- graphql-dataloader
- graphql-codegen
- apollo-server
- apollo-client
- urql

## Scope

- database-queries -> postgres-wizard
- authentication -> authentication-oauth
- rest-api-design -> backend
- websocket-infrastructure -> backend

## Tooling

### Server

- @apollo/server - When: Apollo Server v4 Note: Most popular GraphQL server
- graphql-yoga - When: Lightweight alternative Note: Good for serverless
- mercurius - When: Fastify integration Note: Fast, uses JIT

### Client

- @apollo/client - When: Full-featured client Note: Caching, state management
- urql - When: Lightweight alternative Note: Smaller, simpler
- graphql-request - When: Simple requests Note: Minimal, no caching

### Tools

- graphql-codegen - When: Type generation Note: Essential for TypeScript
- dataloader - When: N+1 prevention Note: Batches and caches

## Patterns

### Schema Design

Type-safe schema with proper nullability

**When to use**: Designing any GraphQL API

# SCHEMA DESIGN:

"""
The schema is your API contract. Design nullability
intentionally - non-null fields must always resolve.
"""

type Query {
  # Non-null - will always return user or throw
  user(id: ID!): User!

  # Nullable - returns null if not found
  userByEmail(email: String!): User

  # Non-null list with non-null items
  users(limit: Int = 10, offset: Int = 0): [User!]!

  # Search with pagination
  searchUsers(
    query: String!
    first: Int
    after: String
  ): UserConnection!
}

type Mutation {
  # Input types for complex mutations
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(id: ID!, input: UpdateUserInput!): UpdateUserPayload!
  deleteUser(id: ID!): DeleteUserPayload!
}

type Subscription {
  userCreated: User!
  messageReceived(roomId: ID!): Message!
}

# Input types
input CreateUserInput {
  email: String!
  name: String!
  role: Role = USER
}

input UpdateUserInput {
  email: String
  name: String
  role: Role
}

# Payload types (for errors as data)
type CreateUserPayload {
  user: User
  errors: [Error!]!
}

union UpdateUserPayload = UpdateUserSuccess | NotFoundError | ValidationError

type UpdateUserSuccess {
  user: User!
}

# Enums
enum Role {
  USER
  ADMIN
  MODERATOR
}

# Types with relationships
type User {
  id: ID!
  email: String!
  name: String!
  role: Role!
  posts(limit: Int = 10): [Post!]!
  createdAt: DateTime!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  comments: [Comment!]!
  published: Boolean!
}

# Pagination (Relay-style)
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

### DataLoader for N+1 Prevention

Batch and cache database queries

**When to use**: Resolving relationships

# DATALOADER:

"""
Without DataLoader, fetching 10 posts with authors
makes 11 queries (1 for posts + 10 for each author).
DataLoader batches into 2 queries.
"""

import DataLoader from 'dataloader';

// Create loaders per request
function createLoaders(db) {
  return {
    userLoader: new DataLoader(async (ids) => {
      // Single query for all users
      const users = await db.user.findMany({
        where: { id: { in: ids } }
      });

      // Return in same order as ids
      const userMap = new Map(users.map(u => [u.id, u]));
      return ids.map(id => userMap.get(id) || null);
    }),

    postsByAuthorLoader: new DataLoader(async (authorIds) => {
      const posts = await db.post.findMany({
        where: { authorId: { in: authorIds } }
      });

      // Group by author
      const postsByAuthor = new Map();
      posts.forEach(post => {
        const existing = postsByAuthor.get(post.authorId) || [];
        postsByAuthor.set(post.authorId, [...existing, post]);
      });

      return authorIds.map(id => postsByAuthor.get(id) || []);
    })
  };
}

// Attach to context
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

app.use('/graphql', expressMiddleware(server, {
  context: async ({ req }) => ({
    db,
    loaders: createLoaders(db),
    user: req.user
  })
}));

// Use in resolvers
const resolvers = {
  Post: {
    author: (post, _, { loaders }) => {
      return loaders.userLoader.load(post.authorId);
    }
  },
  User: {
    posts: (user, _, { loaders }) => {
      return loaders.postsByAuthorLoader.load(user.id);
    }
  }
};

### Apollo Client Caching

Normalized cache with type policies

**When to use**: Client-side data management

# APOLLO CLIENT CACHING:

"""
Apollo Client normalizes responses into a flat cache.
Configure type policies for custom cache behavior.
"""

import { ApolloClient, InMemoryCache } from '@apollo/client';

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Paginated field
        users: {
          keyArgs: ['query'],  // Cache separately per query
          merge(existing = { edges: [] }, incoming, { args }) {
            // Append for infinite scroll
            if (args?.after) {
              return {
                ...incoming,
                edges: [...existing.edges, ...incoming.edges]
              };
            }
            return incoming;
          }
        }
      }
    },
    User: {
      keyFields: ['id'],  // How to identify users
      fields: {
        fullName: {
          read(_, { readField }) {
            // Computed field
            return `${readField('firstName')} ${readField('lastName')}`;
          }
        }
      }
    }
  }
});

const client = new ApolloClient({
  uri: '/graphql',
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network'
    }
  }
});

// Queries with hooks
import { useQuery, useMutation } from '@apollo/client';

const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`;

function UserProfile({ userId }) {
  const { data, loading, error } = useQuery(GET_USER, {
    variables: { id: userId }
  });

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return <div>{data.user.name}</div>;
}

// Mutations with cache updates
const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      user {
        id
        name
        email
      }
      errors {
        field
        message
      }
    }
  }
`;

function CreateUserForm() {
  const [createUser, { loading }] = useMutation(CREATE_USER, {
    update(cache, { data: { createUser } }) {
      // Update cache after mutation
      if (createUser.user) {
        cache.modify({
          fields: {
            users(existing = []) {
              const newRef = cache.writeFragment({
                data: createUser.user,
                fragment: gql`
                  fragment NewUser on User {
                    id
                    name
                    email
                  }
                `
              });
              return [...existing, newRef];
            }
          }
        });
      }
    }
  });
}

### Code Generation

Type-safe operations from schema

**When to use**: TypeScript projects

# GRAPHQL CODEGEN:

"""
Generate TypeScript types from your schema and operations.
No more manually typing query responses.
"""

# Install
npm install -D @graphql-codegen/cli
npm install -D @graphql-codegen/typescript
npm install -D @graphql-codegen/typescript-operations
npm install -D @graphql-codegen/typescript-react-apollo

# codegen.ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:4000/graphql',
  documents: ['src/**/*.graphql', 'src/**/*.tsx'],
  generates: {
    './src/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo'
      ],
      config: {
        withHooks: true,
        withComponent: false
      }
    }
  }
};

export default config;

# Run generation
npx graphql-codegen

# Usage - fully typed!
import { useGetUserQuery, useCreateUserMutation } from './generated/graphql';

function UserProfile({ userId }: { userId: string }) {
  const { data, loading } = useGetUserQuery({
    variables: { id: userId }  // Type-checked!
  });

  // data.user is fully typed
  return <div>{data?.user?.name}</div>;
}

### Error Handling with Unions

Expected errors as data, not exceptions

**When to use**: Operations that can fail in expected ways

# ERRORS AS DATA:

"""
Use union types for expected failure cases.
GraphQL errors are for unexpected failures.
"""

# Schema
type Mutation {
  login(email: String!, password: String!): LoginResult!
}

union LoginResult = LoginSuccess | InvalidCredentials | AccountLocked

type LoginSuccess {
  user: User!
  token: String!
}

type InvalidCredentials {
  message: String!
}

type AccountLocked {
  message: String!
  unlockAt: DateTime
}

# Resolver
const resolvers = {
  Mutation: {
    login: async (_, { email, password }, { db }) => {
      const user = await db.user.findByEmail(email);

      if (!user || !await verifyPassword(password, user.hash)) {
        return {
          __typename: 'InvalidCredentials',
          message: 'Invalid email or password'
        };
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return {
          __typename: 'AccountLocked',
          message: 'Account temporarily locked',
          unlockAt: user.lockedUntil
        };
      }

      return {
        __typename: 'LoginSuccess',
        user,
        token: generateToken(user)
      };
    }
  },

  LoginResult: {
    __resolveType(obj) {
      return obj.__typename;
    }
  }
};

# Client query
const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      ... on LoginSuccess {
        user { id name }
        token
      }
      ... on InvalidCredentials {
        message
      }
      ... on AccountLocked {
        message
        unlockAt
      }
    }
  }
`;

// Handle all cases
const result = data.login;
switch (result.__typename) {
  case 'LoginSuccess':
    setToken(result.token);
    redirect('/dashboard');
    break;
  case 'InvalidCredentials':
    setError(result.message);
    break;
  case 'AccountLocked':
    setError(`${result.message}. Try again at ${result.unlockAt}`);
    break;
}

## Sharp Edges

### Each resolver makes separate database queries

Severity: CRITICAL

Situation: You write resolvers that fetch data individually. A query for
10 posts with authors makes 11 database queries. For 100 posts,
that's 101 queries. Response time becomes seconds.

Symptoms:
- Slow API responses
- Many similar database queries in logs
- Performance degrades with list size

Why this breaks:
GraphQL resolvers run independently. Without batching, the author
resolver runs separately for each post. The database gets hammered
with repeated similar queries.

Recommended fix:

# USE DATALOADER

import DataLoader from 'dataloader';

// Create loader per request
const userLoader = new DataLoader(async (ids) => {
  const users = await db.user.findMany({
    where: { id: { in: ids } }
  });
  // IMPORTANT: Return in same order as input ids
  const userMap = new Map(users.map(u => [u.id, u]));
  return ids.map(id => userMap.get(id));
});

// Use in resolver
const resolvers = {
  Post: {
    author: (post, _, { loaders }) =>
      loaders.userLoader.load(post.authorId)
  }
};

# Key points:
# 1. Create new loaders per request (for caching scope)
# 2. Return results in same order as input IDs
# 3. Handle missing items (return null, not skip)

### Deeply nested queries can DoS your server

Severity: CRITICAL

Situation: Your schema has circular relationships (user.posts.author.posts...).
A client sends a query 20 levels deep. Your server tries to resolve
it and either times out or crashes.

Symptoms:
- Server timeouts on certain queries
- Memory exhaustion
- Slow response for nested queries

Why this breaks:
GraphQL allows clients to request any valid query shape. Without
limits, a malicious or buggy client can craft queries that require
exponential work. Even legitimate queries can accidentally be too deep.

Recommended fix:

# LIMIT QUERY DEPTH AND COMPLEXITY

import depthLimit from 'graphql-depth-limit';
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    // Limit nesting depth
    depthLimit(10),

    // Limit query complexity
    createComplexityLimitRule(1000, {
      scalarCost: 1,
      objectCost: 2,
      listFactor: 10
    })
  ]
});

# Also consider:
# - Query timeout limits
# - Rate limiting per client
# - Persisted queries (only allow pre-registered queries)

### Introspection enabled in production exposes your schema

Severity: HIGH

Situation: You deploy to production with introspection enabled. Anyone can
query your schema, discover all types, mutations, and field names.
Attackers know exactly what to target.

Symptoms:
- Schema visible via introspection query
- GraphQL Playground accessible in production
- Full type information exposed

Why this breaks:
Introspection is essential for development and tooling, but in
production it's a roadmap for attackers. They can find admin
mutations, internal fields, and deprecated but still working APIs.

Recommended fix:

# DISABLE INTROSPECTION IN PRODUCTION

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  plugins: [
    process.env.NODE_ENV === 'production'
      ? ApolloServerPluginLandingPageDisabled()
      : ApolloServerPluginLandingPageLocalDefault()
  ]
});

# Better: Use persisted queries
# Only allow pre-registered queries in production
const server = new ApolloServer({
  typeDefs,
  resolvers,
  persistedQueries: {
    cache: new InMemoryLRUCache()
  }
});

### Authorization only in schema directives, not resolvers

Severity: HIGH

Situation: You rely entirely on @auth directives for authorization. Someone
finds a way around the directive, or complex business rules don't
fit in a simple directive. Authorization fails.

Symptoms:
- Unauthorized access to data
- Business rules not enforced
- Directive-only security bypassed

Why this breaks:
Directives are good for simple checks but can't handle complex
business logic. "User can edit their own posts, or any post in
groups they moderate" doesn't fit in a directive.

Recommended fix:

# AUTHORIZE IN RESOLVERS

// Simple check in resolver
Mutation: {
  deletePost: async (_, { id }, { user, db }) => {
    if (!user) {
      throw new AuthenticationError('Must be logged in');
    }

    const post = await db.post.findUnique({ where: { id } });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Business logic authorization
    const canDelete =
      post.authorId === user.id ||
      user.role === 'ADMIN' ||
      await userModeratesGroup(user.id, post.groupId);

    if (!canDelete) {
      throw new ForbiddenError('Cannot delete this post');
    }

    return db.post.delete({ where: { id } });
  }
}

// Helper for field-level authorization
User: {
  email: (user, _, { currentUser }) => {
    // Only show email to self or admin
    if (currentUser?.id === user.id || currentUser?.role === 'ADMIN') {
      return user.email;
    }
    return null;
  }
}

### Authorization on queries but not on fields

Severity: HIGH

Situation: You check if a user can access a resource, but not individual
fields. User A can see User B's public profile, and accidentally
also sees their private email and phone number.

Symptoms:
- Sensitive data exposed
- Privacy violations
- Field data visible to wrong users

Why this breaks:
Field resolvers run after the parent is returned. If the parent
query returns a user, all fields are resolved - including sensitive
ones. Each sensitive field needs its own auth check.

Recommended fix:

# FIELD-LEVEL AUTHORIZATION

const resolvers = {
  User: {
    // Public fields - no check needed
    id: (user) => user.id,
    name: (user) => user.name,

    // Private fields - check access
    email: (user, _, { currentUser }) => {
      if (!currentUser) return null;
      if (currentUser.id === user.id) return user.email;
      if (currentUser.role === 'ADMIN') return user.email;
      return null;
    },

    phoneNumber: (user, _, { currentUser }) => {
      if (currentUser?.id !== user.id) return null;
      return user.phoneNumber;
    },

    // Or throw instead of returning null
    privateData: (user, _, { currentUser }) => {
      if (currentUser?.id !== user.id) {
        throw new ForbiddenError('Not authorized');
      }
      return user.privateData;
    }
  }
};

### Non-null field failure nullifies entire parent

Severity: MEDIUM

Situation: You make fields non-null for convenience. A resolver throws or
returns null. The error propagates up, nullifying parent objects,
until the whole query response is null or errors out.

Symptoms:
- Queries return null unexpectedly
- One error affects unrelated fields
- Partial data can't be returned

Why this breaks:
GraphQL's null propagation means if a non-null field can't resolve,
its parent becomes null. If that parent is also non-null, it
propagates further. One failing field can break an entire response.

Recommended fix:

# DESIGN NULLABILITY INTENTIONALLY

# WRONG: Everything non-null
type User {
  id: ID!
  name: String!
  email: String!
  avatar: String!      # What if no avatar?
  lastLogin: DateTime! # What if never logged in?
}

# RIGHT: Nullable where appropriate
type User {
  id: ID!              # Always exists
  name: String!        # Required field
  email: String!       # Required field
  avatar: String       # Optional - may not exist
  lastLogin: DateTime  # Nullable - may be null
}

# For lists:
# [User!]! - Non-null list of non-null users (recommended)
# [User!]  - Nullable list of non-null users
# [User]!  - Non-null list of nullable users (rarely useful)
# [User]   - Nullable list of nullable users (avoid)

# Rule of thumb:
# - Non-null if always present and failure should fail query
# - Nullable if optional or failure shouldn't break response

### Expensive queries treated same as cheap ones

Severity: MEDIUM

Situation: Every query is processed the same. A simple user(id) query uses
the same resources as users(first: 1000) { posts { comments } }.
Expensive queries starve out cheap ones.

Symptoms:
- Expensive queries slow everything
- No way to prioritize queries
- Rate limiting is ineffective

Why this breaks:
Not all GraphQL operations are equal. Fetching 1000 users with
nested data is orders of magnitude more expensive than fetching
one user. Without cost analysis, you can't rate limit properly.

Recommended fix:

# QUERY COST ANALYSIS

import { createComplexityLimitRule } from 'graphql-validation-complexity';

// Define complexity per field
const complexityRules = createComplexityLimitRule(1000, {
  scalarCost: 1,
  objectCost: 10,
  listFactor: 10,
  // Custom field costs
  fieldCost: {
    'Query.searchUsers': 100,
    'Query.analytics': 500,
    'User.posts': ({ args }) => args.limit || 10
  }
});

// For rate limiting by cost
const costPlugin = {
  requestDidStart() {
    return {
      didResolveOperation({ request, document }) {
        const cost = calculateQueryCost(document);
        if (cost > 1000) {
          throw new Error(`Query too expensive: ${cost}`);
        }
        // Track cost for rate limiting
        rateLimiter.consume(request.userId, cost);
      }
    };
  }
};

### Subscriptions not properly cleaned up

Severity: MEDIUM

Situation: Clients subscribe but don't unsubscribe cleanly. Network issues
leave orphaned subscriptions. Server memory grows as dead
subscriptions accumulate.

Symptoms:
- Memory usage grows over time
- Dead connections accumulate
- Server slows down

Why this breaks:
Each subscription holds server resources. Without proper cleanup
on disconnect, resources accumulate. Long-running servers
eventually run out of memory.

Recommended fix:

# PROPER SUBSCRIPTION CLEANUP

import { PubSub, withFilter } from 'graphql-subscriptions';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

const pubsub = new PubSub();

// Track active subscriptions
const activeSubscriptions = new Map();

const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql'
});

useServer({
  schema,
  context: (ctx) => ({
    pubsub,
    userId: ctx.connectionParams?.userId
  }),
  onConnect: (ctx) => {
    console.log('Client connected');
  },
  onDisconnect: (ctx) => {
    // Clean up resources for this connection
    const userId = ctx.connectionParams?.userId;
    activeSubscriptions.delete(userId);
  }
}, wsServer);

// Subscription resolver with cleanup
Subscription: {
  messageReceived: {
    subscribe: withFilter(
      (_, { roomId }, { pubsub, userId }) => {
        // Track subscription
        activeSubscriptions.set(userId, roomId);
        return pubsub.asyncIterator(`ROOM_${roomId}`);
      },
      (payload, { roomId }) => {
        return payload.roomId === roomId;
      }
    )
  }
}

## Validation Checks

### Introspection enabled in production

Severity: WARNING

Message: Introspection should be disabled in production

Fix action: Set introspection: process.env.NODE_ENV !== 'production'

### Direct database query in resolver

Severity: WARNING

Message: Consider using DataLoader to batch and cache queries

Fix action: Create DataLoader and use .load() instead of direct query

### No query depth limiting

Severity: WARNING

Message: Consider adding depth limiting to prevent DoS

Fix action: Add validationRules: [depthLimit(10)]

### Resolver without try-catch

Severity: INFO

Message: Consider wrapping resolver logic in try-catch

Fix action: Add error handling to provide better error messages

### JSON or Any type in schema

Severity: INFO

Message: Avoid JSON/Any types - they bypass GraphQL's type safety

Fix action: Define proper input/output types

### Mutation returns bare type instead of payload

Severity: INFO

Message: Consider using payload types for mutations (includes errors)

Fix action: Create CreateUserPayload type with user and errors fields

### List field without pagination arguments

Severity: INFO

Message: List fields should have pagination (limit, first, after)

Fix action: Add arguments: field(limit: Int, offset: Int): [Type!]!

### Query hook without error handling

Severity: INFO

Message: Handle query errors in UI

Fix action: Destructure and handle error: const { error } = useQuery(...)

### Using refetch instead of cache update

Severity: INFO

Message: Consider cache update instead of refetch for better UX

Fix action: Use update function to modify cache directly

## Collaboration

### Delegation Triggers

- user needs database optimization -> postgres-wizard (Optimize queries for GraphQL resolvers)
- user needs authentication system -> authentication-oauth (Auth for GraphQL context)
- user needs caching layer -> caching-strategies (Response caching, DataLoader caching)
- user needs real-time infrastructure -> backend (WebSocket setup for subscriptions)

## Related Skills

Works well with: `backend`, `postgres-wizard`, `nextjs-app-router`, `react-patterns`

## When to Use
- User mentions or implies: graphql
- User mentions or implies: graphql schema
- User mentions or implies: graphql resolver
- User mentions or implies: apollo server
- User mentions or implies: apollo client
- User mentions or implies: graphql federation
- User mentions or implies: dataloader
- User mentions or implies: graphql codegen
- User mentions or implies: graphql query
- User mentions or implies: graphql mutation

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
