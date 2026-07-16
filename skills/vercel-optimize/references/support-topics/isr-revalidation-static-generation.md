---
id: isr-revalidation-static-generation
title: ISR revalidation and static generation
status: active
candidateKinds: ["isr_overrevalidation"]
frameworks: ["next@>=13.4.0"]
priority: 95
citations: ["https://vercel.com/docs/incremental-static-regeneration", "https://nextjs.org/docs/app/api-reference/functions/revalidateTag", "https://nextjs.org/docs/app/api-reference/functions/revalidatePath"]
maxBriefChars: 1000
---

## Investigation Brief
For ISR over-revalidation, the goal is to reduce unnecessary regeneration work without making content stale beyond the product’s tolerance.

## Evidence To Check
Compare ISR writes to reads, then inspect the route’s `revalidate`, `cacheLife()`, tag invalidation, and content update path. Look for very short timer revalidation on routes where updates are event-driven. If recommending `cacheLife()` or `cacheTag()` for tagged content, prove the exact tags are invalidated by `revalidateTag()` or `updateTag()`; near-matches do not count.

## Do Not Recommend When
Do not lengthen revalidation for inventory, pricing, auth, or other user-critical freshness without source evidence that stale content is acceptable. Do not claim existing CMS or webhook invalidation unless the matching invalidation call or config is in the allowed files.

## Verification
Tie the fix to the observed ISR writes per read and the line that controls revalidation or on-demand invalidation.
