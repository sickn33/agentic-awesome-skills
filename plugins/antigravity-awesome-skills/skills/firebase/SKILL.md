---
name: firebase
description: Firebase gives you a complete backend in minutes - auth, database,
  storage, functions, hosting. But the ease of setup hides real complexity.
  Security rules are your last line of defense, and they're often wrong.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Firebase

Firebase gives you a complete backend in minutes - auth, database, storage,
functions, hosting. But the ease of setup hides real complexity. Security rules
are your last line of defense, and they're often wrong. Firestore queries are
limited, and you learn this after you've designed your data model.

This skill covers Firebase Authentication, Firestore, Realtime Database, Cloud
Functions, Cloud Storage, and Firebase Hosting. Key insight: Firebase is
optimized for read-heavy, denormalized data. If you're thinking relationally,
you're thinking wrong.

2025 lesson: Firestore pricing can surprise you. Reads are cheap until they're
not. A poorly designed listener can cost more than a dedicated database. Plan
your data model for your query patterns, not your data relationships.

## Principles

- Design data for queries, not relationships
- Security rules are mandatory, not optional
- Denormalize aggressively - duplication is cheap, joins are expensive
- Batch writes and transactions for consistency
- Use offline persistence wisely - it's not free
- Cloud Functions for what clients shouldn't do
- Environment-based config, never hardcode keys in client

## Capabilities

- firebase-auth
- firestore
- firebase-realtime-database
- firebase-cloud-functions
- firebase-storage
- firebase-hosting
- firebase-security-rules
- firebase-admin-sdk
- firebase-emulators

## Scope

- general-backend-architecture -> backend
- payment-processing -> stripe
- email-sending -> email
- advanced-auth-flows -> authentication-oauth
- kubernetes-deployment -> devops

## Tooling

### Core

- firebase - When: Client-side SDK Note: Modular SDK - tree-shakeable
- firebase-admin - When: Server-side / Cloud Functions Note: Full access, bypasses security rules
- firebase-functions - When: Cloud Functions v2 Note: v2 functions are recommended

### Testing

- @firebase/rules-unit-testing - When: Testing security rules Note: Essential - rules bugs are security bugs
- firebase-tools - When: Emulator suite Note: Local development without hitting production

### Frameworks

- reactfire - When: React + Firebase Note: Hooks-based, handles subscriptions
- vuefire - When: Vue + Firebase Note: Vue-specific bindings
- angularfire - When: Angular + Firebase Note: Official Angular bindings

## Patterns

### Modular SDK Import

Import only what you need for smaller bundles

**When to use**: Client-side Firebase usage

# MODULAR IMPORTS:

"""
Firebase v9+ uses modular SDK. Import only what you need.
This enables tree-shaking and smaller bundles.
"""

// WRONG: v8-compat style (larger bundle)
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
const db = firebase.firestore();

// RIGHT: v9+ modular (tree-shakeable)
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get a document
const docRef = doc(db, 'users', 'userId');
const docSnap = await getDoc(docRef);

if (docSnap.exists()) {
  console.log(docSnap.data());
}

// Query with constraints
import { query, where, orderBy, limit } from 'firebase/firestore';

const q = query(
  collection(db, 'posts'),
  where('published', '==', true),
  orderBy('createdAt', 'desc'),
  limit(10)
);

### Security Rules Design

Secure your data with proper rules from day one

**When to use**: Any Firestore database

# FIRESTORE SECURITY RULES:

"""
Rules are your last line of defense. Every read and write
goes through them. Get them wrong, and your data is exposed.
"""

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    function isAdmin() {
      return request.auth.token.admin == true;
    }

    // Users collection
    match /users/{userId} {
      // Anyone can read public profile
      allow read: if true;

      // Only owner can write their own data
      allow write: if isOwner(userId);

      // Private subcollection
      match /private/{document=**} {
        allow read, write: if isOwner(userId);
      }
    }

    // Posts collection
    match /posts/{postId} {
      // Anyone can read published posts
      allow read: if resource.data.published == true
                  || isOwner(resource.data.authorId);

      // Only authenticated users can create
      allow create: if isSignedIn()
                    && request.resource.data.authorId == request.auth.uid;

      // Only author can update/delete
      allow update, delete: if isOwner(resource.data.authorId);
    }

    // Admin-only collection
    match /admin/{document=**} {
      allow read, write: if isAdmin();
    }
  }
}

### Data Modeling for Queries

Design Firestore data structure around query patterns

**When to use**: Designing Firestore schema

# FIRESTORE DATA MODELING:

"""
Firestore is NOT relational. You can't JOIN.
Design your data for how you'll QUERY it, not how it relates.
"""

// WRONG: Normalized (SQL thinking)
// users/{userId}
// posts/{postId} with authorId field
// To get "posts by user" - need to query posts collection

// RIGHT: Denormalized for queries
// users/{userId}/posts/{postId} - subcollection
// OR
// posts/{postId} with embedded author data

// Document structure for a post
const post = {
  id: 'post123',
  title: 'My Post',
  content: '...',

  // Embed frequently-needed author data
  author: {
    id: 'user456',
    name: 'Jane Doe',
    avatarUrl: '...'
  },

  // Arrays for IN queries (max 30 items for 'in')
  tags: ['javascript', 'firebase'],

  // Maps for compound queries
  stats: {
    likes: 42,
    comments: 7,
    views: 1000
  },

  // Timestamps
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),

  // Booleans for filtering
  published: true,
  featured: false
};

// Query patterns this enables:
// - Get post with author info: 1 read (no join needed)
// - Posts by tag: where('tags', 'array-contains', 'javascript')
// - Featured posts: where('featured', '==', true)
// - Recent posts: orderBy('createdAt', 'desc')

// When author updates their name, update all their posts
// This is the tradeoff: writes are more complex, reads are fast

### Real-time Listeners

Subscribe to data changes with proper cleanup

**When to use**: Real-time features

# REAL-TIME LISTENERS:

"""
onSnapshot creates a persistent connection. Always unsubscribe
when component unmounts to prevent memory leaks and extra reads.
"""

// React hook for real-time document
function useDocument(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const docRef = doc(db, path);

    // Subscribe to document
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() });
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    // Cleanup on unmount
    return () => unsubscribe();
  }, [path]);

  return { data, loading, error };
}

// Usage
function UserProfile({ userId }) {
  const { data: user, loading } = useDocument(`users/${userId}`);

  if (loading) return <Spinner />;
  return <div>{user?.name}</div>;
}

// Collection with query
function usePosts(limit = 10) {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      where('published', '==', true),
      orderBy('createdAt', 'desc'),
      limit(limit)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(results);
    });

    return () => unsubscribe();
  }, [limit]);

  return posts;
}

### Cloud Functions Patterns

Server-side logic with Cloud Functions v2

**When to use**: Backend logic, triggers, scheduled tasks

# CLOUD FUNCTIONS V2:

"""
Cloud Functions run server-side code triggered by events.
V2 uses more standard Node.js patterns and better scaling.
"""

import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
const db = getFirestore();

// HTTP function
export const api = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    // Verify auth token
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const decoded = await getAuth().verifyIdToken(token);
      // Process request with decoded.uid
      res.json({ userId: decoded.uid });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
);

// Firestore trigger - on document create
export const onUserCreated = onDocumentCreated(
  'users/{userId}',
  async (event) => {
    const snapshot = event.data;
    const userId = event.params.userId;

    if (!snapshot) return;

    const userData = snapshot.data();

    // Send welcome email, create related documents, etc.
    await db.collection('notifications').add({
      userId,
      type: 'welcome',
      message: `Welcome, ${userData.name}!`,
      createdAt: FieldValue.serverTimestamp()
    });
  }
);

// Scheduled function (every day at midnight)
export const dailyCleanup = onSchedule(
  { schedule: '0 0 * * *', timeZone: 'UTC' },
  async (event) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    // Delete old documents
    const oldDocs = await db.collection('logs')
      .where('createdAt', '<', cutoff)
      .limit(500)
      .get();

    const batch = db.batch();
    oldDocs.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log(`Deleted ${oldDocs.size} old logs`);
  }
);

### Batch Operations

Atomic writes and transactions for consistency

**When to use**: Multiple document updates that must succeed together

# BATCH WRITES AND TRANSACTIONS:

"""
Batches: Multiple writes that all succeed or all fail.
Transactions: Read-then-write operations with consistency.
Max 500 operations per batch/transaction.
"""

import {
  writeBatch, runTransaction, doc, getDoc,
  increment, serverTimestamp
} from 'firebase/firestore';

// Batch write - no reads, just writes
async function createPostWithTags(post, tags) {
  const batch = writeBatch(db);

  // Create post
  const postRef = doc(collection(db, 'posts'));
  batch.set(postRef, {
    ...post,
    createdAt: serverTimestamp()
  });

  // Update tag counts
  for (const tag of tags) {
    const tagRef = doc(db, 'tags', tag);
    batch.set(tagRef, {
      count: increment(1),
      lastUsed: serverTimestamp()
    }, { merge: true });
  }

  await batch.commit();
  return postRef.id;
}

// Transaction - read and write atomically
async function likePost(postId, userId) {
  return runTransaction(db, async (transaction) => {
    const postRef = doc(db, 'posts', postId);
    const likeRef = doc(db, 'posts', postId, 'likes', userId);

    const postSnap = await transaction.get(postRef);
    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }

    const likeSnap = await transaction.get(likeRef);
    if (likeSnap.exists()) {
      throw new Error('Already liked');
    }

    // Increment like count and add like document
    transaction.update(postRef, {
      likeCount: increment(1)
    });

    transaction.set(likeRef, {
      userId,
      createdAt: serverTimestamp()
    });

    return postSnap.data().likeCount + 1;
  });
}

### Social Login (Google, GitHub, etc.)

OAuth provider setup and authentication flows

**When to use**: Social login implementation

# SOCIAL LOGIN WITH FIREBASE AUTH

import {
  getAuth, signInWithPopup, signInWithRedirect,
  GoogleAuthProvider, GithubAuthProvider, OAuthProvider
} from "firebase/auth";

const auth = getAuth();

// GOOGLE
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.setCustomParameters({ prompt: "select_account" });

async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    if (error.code === "auth/account-exists-with-different-credential") {
      return handleAccountConflict(error);
    }
    throw error;
  }
}

// GITHUB
const githubProvider = new GithubAuthProvider();
githubProvider.addScope("read:user");

// APPLE (Required for iOS apps!)
const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

### Popup vs Redirect Auth

When to use popup vs redirect for OAuth

**When to use**: Choosing authentication flow

# Popup: Desktop, SPA (simpler, can be blocked)
# Redirect: Mobile, iOS Safari (always works)

async function signIn(provider) {
  if (/iPhone|iPad|Android/i.test(navigator.userAgent)) {
    return signInWithRedirect(auth, provider);
  }
  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code === "auth/popup-blocked") {
      return signInWithRedirect(auth, provider);
    }
    throw e;
  }
}

// Check redirect result on page load
useEffect(() => {
  getRedirectResult(auth).then(r => r && setUser(r.user));
}, []);

### Account Linking

Link multiple providers to one account

**When to use**: User has accounts with different providers

import { fetchSignInMethodsForEmail, linkWithCredential } from "firebase/auth";

async function handleAccountConflict(error) {
  const email = error.customData?.email;
  const pendingCred = OAuthProvider.credentialFromError(error);
  const methods = await fetchSignInMethodsForEmail(auth, email);

  if (methods.includes("google.com")) {
    alert("Sign in with Google to link accounts");
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    await linkWithCredential(result.user, pendingCred);
    return result.user;
  }
}

// Link new provider
await linkWithPopup(auth.currentUser, new GithubAuthProvider());

// Unlink provider (keep at least one!)
await unlink(auth.currentUser, "github.com");

### Auth State Persistence

Control session lifetime

**When to use**: Managing user sessions

import { setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";

// LOCAL: survives browser close (default)
// SESSION: cleared on tab close

async function signInWithRememberMe(email, pass, remember) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  return signInWithEmailAndPassword(auth, email, pass);
}

// React auth hook
function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setLoading(false); }), []);
  return { user, loading };
}

### Email Verification and Password Reset

Complete email auth flow

**When to use**: Email/password authentication

import { sendEmailVerification, sendPasswordResetEmail, reauthenticateWithCredential } from "firebase/auth";

// Sign up with verification
async function signUp(email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(result.user);
  return result.user;
}

// Password reset
await sendPasswordResetEmail(auth, email);

// Change password (requires recent auth)
const cred = EmailAuthProvider.credential(user.email, currentPass);
await reauthenticateWithCredential(user, cred);
await updatePassword(user, newPass);

### Token Management for APIs

Handle ID tokens for backend calls

**When to use**: Authenticating with backend APIs

import { getIdToken, onIdTokenChanged } from "firebase/auth";

// Get token (auto-refreshes if expired)
const token = await getIdToken(auth.currentUser);

// API helper with auto-retry
async function apiCall(url, opts = {}) {
  const token = await getIdToken(auth.currentUser);
  const res = await fetch(url, {
    ...opts,
    headers: { ...opts.headers, Authorization: "Bearer " + token }
  });
  if (res.status === 401) {
    const newToken = await getIdToken(auth.currentUser, true);
    return fetch(url, { ...opts, headers: { ...opts.headers, Authorization: "Bearer " + newToken }});
  }
  return res;
}

// Sync to cookie for SSR
onIdTokenChanged(auth, async u => {
  document.cookie = u ? "__session=" + await u.getIdToken() : "__session=; max-age=0";
});

// Check admin claim
const { claims } = await auth.currentUser.getIdTokenResult();
const isAdmin = claims.admin === true;

## Collaboration

### Delegation Triggers

- user needs complex OAuth flow -> authentication-oauth (Firebase Auth handles basics, complex flows need OAuth skill)
- user needs payment integration -> stripe (Firebase + Stripe common pattern)
- user needs email functionality -> email (Firebase doesn't include email - use SendGrid, Resend, etc.)
- user needs container deployment -> devops (Beyond Firebase Hosting - Kubernetes, Docker)
- user needs relational data model -> postgres-wizard (Firestore is wrong choice for highly relational data)
- user needs full-text search -> elasticsearch-search (Firestore doesn't support full-text search - use Algolia/Elastic)

## Related Skills

Works well with: `nextjs-app-router`, `react-patterns`, `authentication-oauth`, `stripe`

## When to Use
- User mentions or implies: firebase
- User mentions or implies: firestore
- User mentions or implies: firebase auth
- User mentions or implies: cloud functions
- User mentions or implies: firebase storage
- User mentions or implies: realtime database
- User mentions or implies: firebase hosting
- User mentions or implies: firebase emulator
- User mentions or implies: security rules
- User mentions or implies: firebase admin

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
