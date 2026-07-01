---
name: frontend-optimistic-mutations
description: A portable, framework-agnostic discipline for the write path of any React or React Native app using a query/cache layer. Codifies the optimistic-update lifecycle (cancel in-flight queries → snapshot every affected cache → patch instantly → roll back verbatim on error → invalidate on...
risk: unknown
source: https://github.com/stareezy-1/frontend-architecture-skill/tree/main/skills/frontend-optimistic-mutations
source_repo: stareezy-1/frontend-architecture-skill
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/stareezy-1/frontend-architecture-skill/blob/main/LICENSE
---

# Frontend Optimistic Mutations (the write path)
## When to Use

Use this skill when you need a portable, framework-agnostic discipline for the write path of any React or React Native app using a query/cache layer. Codifies the optimistic-update lifecycle (cancel in-flight queries → snapshot every affected cache → patch instantly → roll back verbatim on error → invalidate on...


> Portable skill — readable by Claude Code, OpenCode, Codex, Cursor, Windsurf, and others.
> This skill describes the **discipline of the write path** — optimistic updates, rollback,
> idempotency, cache coherence — not a UI library or a styling system. It builds directly on the
> **frontend-data-contracts** skill (writes go through the typed client) and the
> **frontend-architecture** skill (mutations live in `modules/{feature}/hooks/`, keyed by a factory).

The goal: a write **feels instant** (the UI reflects it before the server confirms), is **safe**
(a failure restores the exact prior state, and a retry never double-charges), and leaves the cache
**coherent** (the detail view and every list page agree). All three at once — that's the craft.

---

## 0. The five core ideas

1. **The optimistic lifecycle is fixed.** cancel → snapshot → patch → (error: roll back) → (settle: invalidate). Every optimistic mutation follows the same five beats.
2. **Roll back verbatim.** On failure, restore the exact snapshot taken before the patch — not a "best guess" re-derivation. Keep the snapshot in mutation context.
3. **Idempotency is generated once, not per attempt.** The key is created at form init (or first intent), so a network retry replays the original server response instead of performing the action twice.
4. **Caches move in lock-step.** A status change patches the detail cache **and** every list page that contains the entity, so badges never disagree across surfaces.
5. **Server state never enters the client store.** Optimistic state lives in the query cache, not Zustand/Redux. The cache is the single source of truth for server data (per frontend-architecture §4).

---

## 1. When to be optimistic (and when not)

| Situation                                                                     | Strategy                                                                                                                       |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| High-confidence, low-conflict write (toggle status, like, mark-paid, reorder) | **Optimistic** — patch immediately, roll back on error.                                                                        |
| Create that returns a server-generated id/number/total                        | **Pending state**, then `setQueryData` from the server response. A temporary optimistic row is optional; reconcile on success. |
| Destructive or hard-to-reverse write (delete with cascade, send money)        | **Confirm first**, then optimistic _or_ pending — never silent-optimistic.                                                     |
| Write whose result the user can't see yet (background job)                    | **Pending + toast**, invalidate when done. No optimistic patch.                                                                |

Optimism is a UX tool for writes you're confident will succeed. If failure is common or expensive to
undo, prefer a pending state.

---

## 2. The optimistic lifecycle (TanStack Query)

The canonical shape. Each beat has a job; skipping one breaks correctness.

```ts
// modules/invoice/hooks/useInvoiceMutations.ts
interface MarkPaidContext {
  previousInvoice: Invoice | undefined; // detail snapshot
  previousLists: Array<[readonly unknown[], InvoiceListResponse]>; // every list page snapshot
}

export function useMarkInvoicePaid() {
  const queryClient = useQueryClient();
  const notifyError = useApiErrorToast();

  return useMutation<Invoice, ApiError, { id: InvoiceId }, MarkPaidContext>({
    mutationFn: ({ id }) => apiClient.post<Invoice>(INVOICE_API.markPaid(id)),

    // 1 + 2 + 3: cancel in-flight reads, snapshot, patch
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: invoiceKeys.all }); // (1) no late refetch clobber

      const detailKey = invoiceKeys.detail(id);
      const previousInvoice = queryClient.getQueryData<Invoice>(detailKey); // (2) snapshot detail
      if (previousInvoice) {
        queryClient.setQueryData<Invoice>(detailKey, {
          // (3) patch detail
          ...previousInvoice,
          status: InvoiceStatus.Paid,
        });
      }

      const previousLists: MarkPaidContext["previousLists"] = [];
      for (const [key, list] of queryClient.getQueriesData<InvoiceListResponse>(
        {
          queryKey: invoiceKeys.lists(),
        },
      )) {
        if (!list) continue;
        previousLists.push([key, list]); // (2) snapshot each page
        if (!list.invoices.some((i) => i.id === id)) continue;
        queryClient.setQueryData<InvoiceListResponse>(key, {
          // (3) patch matching row
          ...list,
          invoices: list.invoices.map((i) =>
            i.id === id ? { ...i, status: InvoiceStatus.Paid } : i,
          ),
        });
      }
      return { previousInvoice, previousLists };
    },

    // 4: roll back verbatim
    onError: (error, { id }, ctx) => {
      if (ctx?.previousInvoice)
        queryClient.setQueryData(invoiceKeys.detail(id), ctx.previousInvoice);
      for (const [key, list] of ctx?.previousLists ?? [])
        queryClient.setQueryData(key, list);
      notifyError(error);
    },

    // 5: invalidate so authoritative server state (paidAt, aggregates) refetches
    onSettled: (_d, _e, { id }) => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}
```

**Why each beat:**

- **cancel** — without it, a query that was already in flight can resolve _after_ your patch and overwrite the optimistic state.
- **snapshot** — the only safe rollback source; never reconstruct prior state by hand.
- **patch** — the instant UX; mutate detail **and** lists together (§4).
- **roll back** — restore snapshots verbatim, then surface the typed `ApiError`.
- **invalidate on settle** — success or failure, refetch so server-computed fields (timestamps, totals) are authoritative. Settle, not just success: a failed write may still have changed server state.

---

## 3. Non-optimistic writes: create with server-owned fields

A create that returns an id/number/total can't be fully optimistic. Run it as a pending mutation and
seed the cache from the response.

```ts
export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation<Invoice, ApiError, CreateInvoiceInput>({
    mutationFn: ({ document, idempotencyKey }) =>
      apiClient.post<Invoice>("/invoices", document, { idempotencyKey }),
    onSuccess: (invoice) => {
      queryClient.setQueryData(invoiceKeys.detail(invoice.id), invoice); // seed detail
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() }); // refresh lists
    },
    onError: (error) => notifyError(error),
  });
}
```

---

## 4. Cache coherence (lock-step detail + lists)

A single entity appears in many caches: its detail, and every filtered/paginated list page. An
optimistic patch must touch **all of them** or surfaces disagree. Use a **hierarchical key factory**
(from frontend-architecture §4.3) so you can target precisely.

```ts
export const invoiceKeys = {
  all: ["invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  list: (p: IListParams) => [...invoiceKeys.lists(), p] as const,
  detail: (id: InvoiceId) => [...invoiceKeys.all, "detail", id] as const,
} as const;
```

- `getQueriesData({ queryKey: invoiceKeys.lists() })` enumerates **every** cached list page so you can patch each.
- `invalidateQueries({ queryKey: invoiceKeys.lists() })` refreshes them all on settle.
- `detail(id)` targets exactly one entity.

Snapshot **each** page you touch (keyed by its exact query key) so rollback restores every page
verbatim, not just the one currently on screen.

---

## 5. Idempotency (safe retries on money-moving writes)

A retried POST must not perform the action twice. Generate the key **once, at form init** (or first
user intent), carry it through retries, and let the client send it as a header. The server replays
the original response for a repeated key within its window.

```ts
// at form initialisation — stable for the lifetime of this attempt
const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

// mutation forwards it; the typed client puts it on the header
apiClient.post<Invoice>("/invoices", document, { idempotencyKey });
```

**Hard rules:**

- Generate the key at **intent time**, not inside `mutationFn` (which re-runs per retry → defeats the purpose).
- The data client auto-detects financial routes and injects the header; an explicit key always wins so retries replay.
- Pair idempotency with **disabled-while-pending** UI so the user can't fire a second distinct write.

---

## 6. Retry policy

- **Reads:** retry a few times with backoff (default in most query libs) — safe and idempotent.
- **Writes:** do **not** auto-retry non-idempotent mutations. Retry only when an idempotency key guarantees replay, or only on network errors (status 0), never on 4xx.
- **Conflicts (409):** don't retry — surface the typed error, invalidate, and let the user re-decide on fresh data.

```ts
useMutation({
  retry: (count, error: ApiError) => error.isNetworkError && count < 2, // network-only, bounded
});
```

---

## 7. Library adapters

The five-beat lifecycle is the same; the hooks differ.

| Library            | Optimistic mechanism                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TanStack Query** | `onMutate` (cancel + snapshot + patch) → `onError` (rollback) → `onSettled` (invalidate). The reference shape above.                                       |
| **RTK Query**      | `onQueryStarted`: `updateQueryData` returns a `patchResult`; `await queryFulfilled` and call `patchResult.undo()` in `catch`. `invalidatesTags` on settle. |
| **SWR**            | `mutate(key, optimisticData, { rollbackOnError: true, populateCache, revalidate: true })` — optimistic data + automatic rollback + revalidate.             |

For **React Native**, all three libraries work unchanged; the cache is the source of truth on
native too. Keep mutation hooks DOM-free so they're shareable across web and native.

---

## 8. Conventions checklist (enforce in review)

- [ ] Optimistic mutations follow cancel → snapshot → patch → rollback → invalidate.
- [ ] `onMutate` cancels in-flight queries before patching.
- [ ] Rollback restores the **exact** snapshot from context, not a re-derivation.
- [ ] Detail **and** every affected list page are patched and snapshotted together.
- [ ] `onSettled` invalidates so server-computed fields are refetched (on success _and_ error).
- [ ] Idempotency key is generated at intent time and replayed across retries, not regenerated per attempt.
- [ ] Money-moving / destructive writes confirm first and disable the trigger while pending.
- [ ] Non-idempotent writes don't auto-retry; 409s surface rather than retry.
- [ ] Server state stays in the query cache — never copied into a client store.
- [ ] Query keys come from a hierarchical factory; invalidation is scoped, not global-blunt.

---

## 9. How to apply this skill

**Adding an optimistic mutation:** decide it's safe to be optimistic (§1). Write the five beats
(§2). Identify every cache the entity lives in and patch/snapshot all of them (§4).

**Making a write safe to retry:** generate an idempotency key at form init, thread it through the
mutation, confirm the client sends it (§5), and set a network-only bounded retry (§6).

**Debugging a flicker / wrong-state-after-write:** check that `onMutate` cancels queries (late
refetch clobber) and that `onSettled` invalidates (stale server-computed fields). Check that _all_
list pages were patched, not just the visible one.

**Reviewing the write path:** run the checklist in §8. The highest-value catches are missing
`cancelQueries` (race clobber), partial cache patches (detail/list disagreement), and idempotency
keys generated inside `mutationFn` (no longer protect retries).

---

## Publishing / installing this skill

This skill follows the Anthropic `SKILL.md` format and is portable across agents.

1. Keep it under `skills/frontend-optimistic-mutations/SKILL.md` in a public GitHub repo.
2. Keep the frontmatter `name` and high-signal `description` — discovery indexes match against it.
3. Install with: `npx skills add <org>/<repo> --skill "frontend-optimistic-mutations"`.
4. Non-`SKILL.md` agents can be pointed here from `AGENTS.md` / `CLAUDE.md`; Kiro can mirror it as a steering file.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
