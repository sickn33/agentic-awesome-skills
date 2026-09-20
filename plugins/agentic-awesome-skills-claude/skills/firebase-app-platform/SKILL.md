---
name: firebase-app-platform
description: Build and operate apps on Firebase using Auth, Firestore, Cloud Functions,
  and Hosting. Use when building mobile/web backends with managed services, real-time
  data sync, or serverless APIs.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Firebase App Platform

Ship mobile and web backends with Firebase managed services.

## When to Use This Skill

Use this skill when:
- Building mobile or web apps with real-time data sync
- Need authentication with minimal backend code
- Prototyping quickly with managed infrastructure
- Building serverless APIs with Cloud Functions
- Hosting static sites or SPAs with CDN

## Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud account (Firebase is part of GCP)
- A Firebase project (create at console.firebase.google.com)

## Quick Start

```bash
# Install and authenticate
npm install -g firebase-tools
firebase login

# Initialize in your project directory
firebase init
# Select: Firestore, Functions, Hosting, Emulators

# Start local emulators
firebase emulators:start

# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only functions
firebase deploy --only hosting
firebase deploy --only firestore:rules
```

## Firestore Database

### Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Messages: authenticated users can read, only owner can write
    match /channels/{channelId}/messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.body is string
        && request.resource.data.body.size() <= 5000;
      allow update, delete: if request.auth != null
        && resource.data.userId == request.auth.uid;
    }

    // Admin-only collection
    match /admin/{document=**} {
      allow read, write: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Default: deny everything
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Data Operations

```typescript
// lib/firestore.ts
import { getFirestore, collection, doc, setDoc, getDoc,
         query, where, orderBy, limit, onSnapshot,
         serverTimestamp, increment } from "firebase/firestore";

const db = getFirestore();

// Create document with auto-ID
async function createMessage(channelId: string, body: string, userId: string) {
  const ref = doc(collection(db, "channels", channelId, "messages"));
  await setDoc(ref, {
    body,
    userId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// Real-time listener
function subscribeToMessages(channelId: string, callback: (msgs: any[]) => void) {
  const q = query(
    collection(db, "channels", channelId, "messages"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(messages);
  });
}

// Atomic counter
async function incrementViews(postId: string) {
  await setDoc(doc(db, "posts", postId), {
    views: increment(1),
  }, { merge: true });
}
```

### Indexes

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "channelId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Authentication

```typescript
// lib/auth.ts
import { getAuth, signInWithPopup, GoogleAuthProvider,
         createUserWithEmailAndPassword, signInWithEmailAndPassword,
         signOut, onAuthStateChanged } from "firebase/auth";

const auth = getAuth();

// Google sign-in
async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

// Email/password registration
async function register(email: string, password: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

// Auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Signed in:", user.uid, user.email);
  } else {
    console.log("Signed out");
  }
});
```

## Cloud Functions

```typescript
// functions/src/index.ts
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";

initializeApp();
const db = getFirestore();

// HTTP function (API endpoint)
export const api = onRequest({ cors: true, region: "us-central1" }, async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).send("Method not allowed");
    return;
  }
  const snapshot = await db.collection("posts").orderBy("createdAt", "desc").limit(10).get();
  const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json({ posts });
});

// Firestore trigger — runs when a new message is created
export const onMessageCreated = onDocumentCreated(
  "channels/{channelId}/messages/{messageId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    // Update channel's last message timestamp
    await db.doc(`channels/${event.params.channelId}`).update({
      lastMessageAt: data.createdAt,
      messageCount: FieldValue.increment(1),
    });

    // Send notification (example)
    console.log(`New message in ${event.params.channelId}: ${data.body.substring(0, 50)}`);
  }
);
```

## Hosting

```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "/api/**", "function": "api" },
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|svg|png|jpg|webp|woff2)",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      },
      {
        "source": "**",
        "headers": [
          { "key": "X-Frame-Options", "value": "DENY" },
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "Strict-Transport-Security", "value": "max-age=63072000" }
        ]
      }
    ]
  }
}
```

## Local Emulators

```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only auth,firestore,functions

# Export emulator data for persistence
firebase emulators:export ./emulator-data
firebase emulators:start --import=./emulator-data

# Emulator UI at http://localhost:4000
```

```json
// firebase.json — emulator config
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "hosting": { "port": 5000 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

## Environment Configuration

```bash
# Set environment variables for functions
firebase functions:config:set stripe.key="sk_live_xxx" app.name="MyApp"

# View config
firebase functions:config:get

# Use in functions (v1)
const stripeKey = functions.config().stripe.key;

# For v2 functions, use .env files
# functions/.env
STRIPE_KEY=sk_live_xxx

# functions/.env.local (for emulators)
STRIPE_KEY=sk_test_xxx
```

## Multi-Environment Setup

```bash
# Create separate projects for each environment
firebase use --add   # Add staging project alias
firebase use staging # Switch to staging
firebase use production

# Deploy to specific project
firebase deploy --project my-app-staging
firebase deploy --project my-app-production

# .firebaserc
{
  "projects": {
    "staging": "my-app-staging",
    "production": "my-app-production"
  }
}
```

## CLI Reference

```bash
firebase projects:list              # List all projects
firebase deploy                      # Deploy everything
firebase deploy --only functions     # Deploy only functions
firebase deploy --only hosting       # Deploy only hosting
firebase deploy --only firestore     # Deploy rules + indexes
firebase functions:log               # View function logs
firebase hosting:channel:create pr-123  # Preview channel
firebase hosting:channel:delete pr-123
```

## Security Best Practices

- Write strict Firestore security rules before any other code
- Separate environments by Firebase project (staging/production)
- Enable budget alerts and quota monitoring in GCP console
- Move privileged logic into Cloud Functions (never trust the client)
- Use App Check to prevent API abuse from non-app clients
- Enable Firestore audit logging for compliance
- Review OAuth consent screen settings

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Permission denied | Check Firestore rules, verify auth state |
| Function cold starts | Use min instances (`minInstances: 1`), optimize imports |
| Emulator won't start | Check port conflicts, run `firebase emulators:start --debug` |
| Deploy fails | Run `firebase deploy --debug`, check service account permissions |
| Rules test failing | Use `firebase emulators:exec` to run rules unit tests |

## Related Skills

- gcp-cloud-functions (`gcp-cloud-functions`) — Function runtime patterns
- vercel-deployments (`vercel-deployments`) — Alternative frontend hosting
- convex-backend (`convex-backend`) — Alternative managed backend

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

