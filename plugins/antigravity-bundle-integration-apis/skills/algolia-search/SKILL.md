---
name: algolia-search
description: Expert patterns for Algolia search implementation, indexing
  strategies, React InstantSearch, and relevance tuning
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Algolia Search Integration

Expert patterns for Algolia search implementation, indexing strategies, React InstantSearch, and relevance tuning

## Patterns

### React InstantSearch with Hooks

Modern React InstantSearch setup using hooks for type-ahead search.

Uses react-instantsearch-hooks-web package with algoliasearch client.
Widgets are components that can be customized with classnames.

Key hooks:
- useSearchBox: Search input handling
- useHits: Access search results
- useRefinementList: Facet filtering
- usePagination: Result pagination
- useInstantSearch: Full state access

### Code_example

// lib/algolia.ts
import algoliasearch from 'algoliasearch/lite';

export const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!  // Search-only key!
);

export const INDEX_NAME = 'products';

// components/Search.tsx
'use client';
import { InstantSearch, SearchBox, Hits, Configure } from 'react-instantsearch';
import { searchClient, INDEX_NAME } from '@/lib/algolia';

function Hit({ hit }: { hit: ProductHit }) {
  return (
    <article>
      <h3>{hit.name}</h3>
      <p>{hit.description}</p>
      <span>${hit.price}</span>
    </article>
  );
}

export function ProductSearch() {
  return (
    <InstantSearch searchClient={searchClient} indexName={INDEX_NAME}>
      <Configure hitsPerPage={20} />
      <SearchBox
        placeholder="Search products..."
        classNames={{
          root: 'relative',
          input: 'w-full px-4 py-2 border rounded',
        }}
      />
      <Hits hitComponent={Hit} />
    </InstantSearch>
  );
}

// Custom hook usage
import { useSearchBox, useHits, useInstantSearch } from 'react-instantsearch';

function CustomSearch() {
  const { query, refine } = useSearchBox();
  const { hits } = useHits<ProductHit>();
  const { status } = useInstantSearch();

  return (
    <div>
      <input
        value={query}
        onChange={(e) => refine(e.target.value)}
        placeholder="Search..."
      />
      {status === 'loading' && <p>Loading...</p>}
      <ul>
        {hits.map((hit) => (
          <li key={hit.objectID}>{hit.name}</li>
        ))}
      </ul>
    </div>
  );
}

### Anti_patterns

- Pattern: Using Admin API key in frontend code | Why: Admin key exposes full index control including deletion | Fix: Use search-only API key with restrictions
- Pattern: Not using /lite client for frontend | Why: Full client includes unnecessary code for search | Fix: Import from algoliasearch/lite for smaller bundle

### References

- https://www.algolia.com/doc/api-reference/widgets/react
- https://www.algolia.com/doc/libraries/javascript/v5/methods/search/

### Next.js Server-Side Rendering

SSR integration for Next.js with react-instantsearch-nextjs package.

Use <InstantSearchNext> instead of <InstantSearch> for SSR.
Supports both Pages Router and App Router (experimental).

Key considerations:
- Set dynamic = 'force-dynamic' for fresh results
- Handle URL synchronization with routing prop
- Use getServerState for initial state

### Code_example

// app/search/page.tsx
import { InstantSearchNext } from 'react-instantsearch-nextjs';
import { searchClient, INDEX_NAME } from '@/lib/algolia';
import { SearchBox, Hits, RefinementList } from 'react-instantsearch';

// Force dynamic rendering for fresh search results
export const dynamic = 'force-dynamic';

export default function SearchPage() {
  return (
    <InstantSearchNext
      searchClient={searchClient}
      indexName={INDEX_NAME}
      routing={{
        router: {
          cleanUrlOnDispose: false,
        },
      }}
    >
      <div className="flex gap-8">
        <aside className="w-64">
          <h3>Categories</h3>
          <RefinementList attribute="category" />
          <h3>Brand</h3>
          <RefinementList attribute="brand" />
        </aside>
        <main className="flex-1">
          <SearchBox placeholder="Search products..." />
          <Hits hitComponent={ProductHit} />
        </main>
      </div>
    </InstantSearchNext>
  );
}

// For custom routing (URL synchronization)
import { history } from 'instantsearch.js/es/lib/routers';
import { simple } from 'instantsearch.js/es/lib/stateMappings';

<InstantSearchNext
  searchClient={searchClient}
  indexName={INDEX_NAME}
  routing={{
    router: history({
      getLocation: () =>
        typeof window === 'undefined'
          ? new URL(url) as unknown as Location
          : window.location,
    }),
    stateMapping: simple(),
  }}
>
  {/* widgets */}
</InstantSearchNext>

### Anti_patterns

- Pattern: Using InstantSearch component for Next.js SSR | Why: Regular component doesn't support server-side rendering | Fix: Use InstantSearchNext from react-instantsearch-nextjs
- Pattern: Static rendering for search pages | Why: Search results must be fresh for each request | Fix: Set export const dynamic = 'force-dynamic'

### References

- https://www.npmjs.com/package/react-instantsearch-nextjs
- https://www.algolia.com/developers/code-exchange/instantsearch-and-next-js-starter

### Data Synchronization and Indexing

Indexing strategies for keeping Algolia in sync with your data.

Three main approaches:
1. Full Reindexing - Replace entire index (expensive)
2. Full Record Updates - Replace individual records
3. Partial Updates - Update specific attributes only

Best practices:
- Batch records (ideal: 10MB, 1K-10K records per batch)
- Use incremental updates when possible
- partialUpdateObjects for attribute-only changes
- Avoid deleteBy (computationally expensive)

### Code_example

// lib/algolia-admin.ts (SERVER ONLY)
import algoliasearch from 'algoliasearch';

// Admin client - NEVER expose to frontend
const adminClient = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!  // Admin key for indexing
);

const index = adminClient.initIndex('products');

// Batch indexing (recommended approach)
export async function indexProducts(products: Product[]) {
  const records = products.map((p) => ({
    objectID: p.id,  // Required unique identifier
    name: p.name,
    description: p.description,
    price: p.price,
    category: p.category,
    inStock: p.inventory > 0,
    createdAt: p.createdAt.getTime(),  // Use timestamps for sorting
  }));

  // Batch in chunks of ~1000-5000 records
  const BATCH_SIZE = 1000;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await index.saveObjects(batch);
  }
}

// Partial update - update only specific fields
export async function updateProductPrice(productId: string, price: number) {
  await index.partialUpdateObject({
    objectID: productId,
    price,
    updatedAt: Date.now(),
  });
}

// Partial update with operations
export async function incrementViewCount(productId: string) {
  await index.partialUpdateObject({
    objectID: productId,
    viewCount: {
      _operation: 'Increment',
      value: 1,
    },
  });
}

// Delete records (prefer this over deleteBy)
export async function deleteProducts(productIds: string[]) {
  await index.deleteObjects(productIds);
}

// Full reindex with zero-downtime (atomic swap)
export async function fullReindex(products: Product[]) {
  const tempIndex = adminClient.initIndex('products_temp');

  // Index to temp index
  await tempIndex.saveObjects(
    products.map((p) => ({
      objectID: p.id,
      ...p,
    }))
  );

  // Copy settings from main index
  await adminClient.copyIndex('products', 'products_temp', {
    scope: ['settings', 'synonyms', 'rules'],
  });

  // Atomic swap
  await adminClient.moveIndex('products_temp', 'products');
}

### Anti_patterns

- Pattern: Using deleteBy for bulk deletions | Why: deleteBy is computationally expensive and rate limited | Fix: Use deleteObjects with array of objectIDs
- Pattern: Indexing one record at a time | Why: Creates indexing queue, slows down process | Fix: Batch records in groups of 1K-10K
- Pattern: Full reindex for small changes | Why: Wastes operations, slower than incremental | Fix: Use partialUpdateObject for attribute changes

### References

- https://www.algolia.com/doc/guides/sending-and-managing-data/send-and-update-your-data/in-depth/the-different-synchronization-strategies
- https://www.algolia.com/blog/engineering/search-indexing-best-practices-for-top-performance-with-code-samples

### API Key Security and Restrictions

Secure API key configuration for Algolia.

Key types:
- Admin API Key: Full control (indexing, settings, deletion)
- Search-Only API Key: Safe for frontend
- Secured API Keys: Generated from base key with restrictions

Restrictions available:
- Indices: Limit accessible indices
- Rate limit: Limit API calls per hour per IP
- Validity: Set expiration time
- HTTP referrers: Restrict to specific URLs
- Query parameters: Enforce search parameters

### Code_example

// NEVER do this - admin key in frontend
// const client = algoliasearch(appId, ADMIN_KEY);  // WRONG!

// Correct: Use search-only key in frontend
const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
);

// Server-side: Generate secured API key
// lib/algolia-secured-key.ts
import algoliasearch from 'algoliasearch';

const adminClient = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
);

// Generate user-specific secured key
export function generateSecuredKey(userId: string) {
  const searchKey = process.env.ALGOLIA_SEARCH_KEY!;

  return adminClient.generateSecuredApiKey(searchKey, {
    // User can only see their own data
    filters: `userId:${userId}`,
    // Key expires in 1 hour
    validUntil: Math.floor(Date.now() / 1000) + 3600,
    // Restrict to specific index
    restrictIndices: ['user_documents'],
  });
}

// Rate-limited key for public APIs
export async function createRateLimitedKey() {
  const { key } = await adminClient.addApiKey({
    acl: ['search'],
    indexes: ['products'],
    description: 'Public search with rate limit',
    maxQueriesPerIPPerHour: 1000,
    referers: ['https://mysite.com/*'],
    validity: 0,  // Never expires
  });

  return key;
}

// API endpoint to get user's secured key
// app/api/search-key/route.ts
import { auth } from '@/lib/auth';
import { generateSecuredKey } from '@/lib/algolia-secured-key';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const securedKey = generateSecuredKey(session.user.id);

  return Response.json({ key: securedKey });
}

### Anti_patterns

- Pattern: Hardcoding Admin API key in client code | Why: Exposes full index control to attackers | Fix: Use search-only key with restrictions
- Pattern: Using same key for all users | Why: Can't restrict data access per user | Fix: Generate secured API keys with user filters
- Pattern: No rate limiting on public search | Why: Bots can exhaust your search quota | Fix: Set maxQueriesPerIPPerHour on API key

### References

- https://www.algolia.com/doc/guides/security/api-keys
- https://support.algolia.com/hc/en-us/articles/14339249272977-What-are-the-best-practices-to-manage-Algolia-API-keys-in-my-code-and-protect-them

### Custom Ranking and Relevance Tuning

Configure searchable attributes and custom ranking for relevance.

Searchable attributes (order matters):
1. Most important fields first (title, name)
2. Secondary fields next (description, tags)
3. Exclude non-searchable fields (image_url, id)

Custom ranking:
- Add business metrics (popularity, rating, date)
- Use desc() for descending, asc() for ascending

### Code_example

// scripts/configure-index.ts
import algoliasearch from 'algoliasearch';

const adminClient = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_ADMIN_KEY!
);

const index = adminClient.initIndex('products');

async function configureIndex() {
  await index.setSettings({
    // Searchable attributes in order of importance
    searchableAttributes: [
      'name',              // Most important
      'brand',
      'category',
      'description',       // Least important
    ],

    // Attributes for faceting/filtering
    attributesForFaceting: [
      'category',
      'brand',
      'filterOnly(inStock)',  // Filter only, not displayed
      'searchable(tags)',     // Searchable facet
    ],

    // Custom ranking (after text relevance)
    customRanking: [
      'desc(popularity)',     // Most popular first
      'desc(rating)',         // Then by rating
      'desc(createdAt)',      // Then by recency
    ],

    // Typo tolerance
    typoTolerance: true,
    minWordSizefor1Typo: 4,
    minWordSizefor2Typos: 8,

    // Query settings
    queryLanguages: ['en'],
    removeStopWords: ['en'],

    // Highlighting
    attributesToHighlight: ['name', 'description'],
    highlightPreTag: '<mark>',
    highlightPostTag: '</mark>',

    // Pagination
    hitsPerPage: 20,
    paginationLimitedTo: 1000,

    // Distinct (deduplication)
    attributeForDistinct: 'productFamily',
    distinct: true,
  });

  // Add synonyms
  await index.saveSynonyms([
    {
      objectID: 'phone-mobile',
      type: 'synonym',
      synonyms: ['phone', 'mobile', 'cell', 'smartphone'],
    },
    {
      objectID: 'laptop-notebook',
      type: 'oneWaySynonym',
      input: 'laptop',
      synonyms: ['notebook', 'portable computer'],
    },
  ]);

  // Add rules (query-based customization)
  await index.saveRules([
    {
      objectID: 'boost-sale-items',
      condition: {
        anchoring: 'contains',
        pattern: 'sale',
      },
      consequence: {
        params: {
          filters: 'onSale:true',
          optionalFilters: ['featured:true'],
        },
      },
    },
  ]);

  console.log('Index configured successfully');
}

configureIndex();

### Anti_patterns

- Pattern: Searching all attributes equally | Why: Reduces relevance, matches in descriptions rank same as titles | Fix: Order searchableAttributes by importance
- Pattern: No custom ranking | Why: Relies only on text matching, ignores business value | Fix: Add popularity, rating, or recency to customRanking
- Pattern: Indexing raw dates as strings | Why: Can't sort by date correctly | Fix: Use timestamps (getTime()) for date sorting

### References

- https://www.algolia.com/doc/guides/managing-results/relevance-overview
- https://www.algolia.com/doc/guides/managing-results/must-do/custom-ranking

### Faceted Search and Filtering

Implement faceted navigation with refinement lists, range sliders,
and hierarchical menus.

Widget types:
- RefinementList: Multi-select checkboxes
- Menu: Single-select list
- HierarchicalMenu: Nested categories
- RangeInput/RangeSlider: Numeric ranges
- ToggleRefinement: Boolean filters

### Code_example

'use client';
import {
  InstantSearch,
  SearchBox,
  Hits,
  RefinementList,
  HierarchicalMenu,
  RangeInput,
  ToggleRefinement,
  ClearRefinements,
  CurrentRefinements,
  Stats,
  SortBy,
} from 'react-instantsearch';
import { searchClient, INDEX_NAME } from '@/lib/algolia';

export function ProductSearch() {
  return (
    <InstantSearch searchClient={searchClient} indexName={INDEX_NAME}>
      <div className="flex gap-8">
        {/* Filters Sidebar */}
        <aside className="w-64 space-y-6">
          <ClearRefinements />
          <CurrentRefinements />

          {/* Category hierarchy */}
          <div>
            <h3 className="font-semibold mb-2">Categories</h3>
            <HierarchicalMenu
              attributes={[
                'categories.lvl0',
                'categories.lvl1',
                'categories.lvl2',
              ]}
              limit={10}
              showMore
            />
          </div>

          {/* Brand filter */}
          <div>
            <h3 className="font-semibold mb-2">Brand</h3>
            <RefinementList
              attribute="brand"
              searchable
              searchablePlaceholder="Search brands..."
              showMore
              limit={5}
              showMoreLimit={20}
            />
          </div>

          {/* Price range */}
          <div>
            <h3 className="font-semibold mb-2">Price</h3>
            <RangeInput
              attribute="price"
              precision={0}
              classNames={{
                input: 'w-20 px-2 py-1 border rounded',
              }}
            />
          </div>

          {/* In stock toggle */}
          <ToggleRefinement
            attribute="inStock"
            label="In Stock Only"
            on={true}
          />

          {/* Rating filter */}
          <div>
            <h3 className="font-semibold mb-2">Rating</h3>
            <RefinementList
              attribute="rating"
              transformItems={(items) =>
                items.map((item) => ({
                  ...item,
                  label: '★'.repeat(Number(item.label)),
                }))
              }
            />
          </div>
        </aside>

        {/* Results */}
        <main className="flex-1">
          <div className="flex justify-between items-center mb-4">
            <SearchBox placeholder="Search products..." />
            <SortBy
              items={[
                { label: 'Relevance', value: 'products' },
                { label: 'Price (Low to High)', value: 'products_price_asc' },
                { label: 'Price (High to Low)', value: 'products_price_desc' },
                { label: 'Rating', value: 'products_rating_desc' },
              ]}
            />
          </div>
          <Stats />
          <Hits hitComponent={ProductHit} />
        </main>
      </div>
    </InstantSearch>
  );
}

// For sorting, create replica indices
// products_price_asc: customRanking: ['asc(price)']
// products_price_desc: customRanking: ['desc(price)']
// products_rating_desc: customRanking: ['desc(rating)']

### Anti_patterns

- Pattern: Faceting on non-faceted attributes | Why: Must declare attributesForFaceting in settings | Fix: Add attributes to attributesForFaceting array
- Pattern: Not using filterOnly() for hidden filters | Why: Wastes facet computation on non-displayed attributes | Fix: Use filterOnly(attribute) for filters you won't show

### References

- https://www.algolia.com/doc/guides/managing-results/refine-results/faceting
- https://www.algolia.com/doc/api-reference/widgets/refinement-list/react

### Query Suggestions and Autocomplete

Implement autocomplete with query suggestions and instant results.

Uses @algolia/autocomplete-js for standalone autocomplete or
integrate with InstantSearch using SearchBox.

Query Suggestions require a separate index generated by Algolia.

### Code_example

// Standalone Autocomplete
// components/Autocomplete.tsx
'use client';
import { autocomplete, getAlgoliaResults } from '@algolia/autocomplete-js';
import algoliasearch from 'algoliasearch/lite';
import { useEffect, useRef } from 'react';
import '@algolia/autocomplete-theme-classic';

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
);

export function Autocomplete() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const search = autocomplete({
      container: containerRef.current,
      placeholder: 'Search for products',
      openOnFocus: true,
      getSources({ query }) {
        if (!query) return [];

        return [
          // Query suggestions
          {
            sourceId: 'suggestions',
            getItems() {
              return getAlgoliaResults({
                searchClient,
                queries: [
                  {
                    indexName: 'products_query_suggestions',
                    query,
                    params: { hitsPerPage: 5 },
                  },
                ],
              });
            },
            templates: {
              header() {
                return 'Suggestions';
              },
              item({ item, html }) {
                return html`<span>${item.query}</span>`;
              },
            },
          },
          // Instant results
          {
            sourceId: 'products',
            getItems() {
              return getAlgoliaResults({
                searchClient,
                queries: [
                  {
                    indexName: 'products',
                    query,
                    params: { hitsPerPage: 8 },
                  },
                ],
              });
            },
            templates: {
              header() {
                return 'Products';
              },
              item({ item, html }) {
                return html`
                  <a href="/products/${item.objectID}">
                    <img src="${item.image}" alt="${item.name}" />
                    <span>${item.name}</span>
                    <span>$${item.price}</span>
                  </a>
                `;
              },
            },
            onSelect({ item, setQuery, refresh }) {
              // Navigate on selection
              window.location.href = `/products/${item.objectID}`;
            },
          },
        ];
      },
    });

    return () => search.destroy();
  }, []);

  return <div ref={containerRef} />;
}

// Combined with InstantSearch
import { connectSearchBox } from 'react-instantsearch';
import { autocomplete } from '@algolia/autocomplete-js';

// Or use built-in Autocomplete widget
import { Autocomplete as AlgoliaAutocomplete } from 'react-instantsearch';

export function SearchWithAutocomplete() {
  return (
    <InstantSearch searchClient={searchClient} indexName="products">
      <AlgoliaAutocomplete
        placeholder="Search products..."
        detachedMediaQuery="(max-width: 768px)"
      />
      <Hits hitComponent={ProductHit} />
    </InstantSearch>
  );
}

### Anti_patterns

- Pattern: Creating autocomplete without debouncing | Why: Every keystroke triggers search, wastes operations | Fix: Algolia autocomplete handles debouncing automatically
- Pattern: Not using Query Suggestions index | Why: Missing search analytics for popular queries | Fix: Enable Query Suggestions in Algolia dashboard

### References

- https://www.algolia.com/doc/ui-libraries/autocomplete/introduction/what-is-autocomplete
- https://www.algolia.com/doc/guides/building-search-ui/ui-and-ux-patterns/query-suggestions/how-to/optimizing-query-suggestions-relevance/js

## Sharp Edges

### Admin API Key in Frontend Code

Severity: CRITICAL

### Indexing Rate Limits and Throttling

Severity: HIGH

### Record Size and Index Limits

Severity: MEDIUM

### PII in Index Names Visible in Network

Severity: MEDIUM

### Searchable Attributes Order Affects Relevance

Severity: MEDIUM

### Full Reindex Consumes All Operations

Severity: MEDIUM

### Every Keystroke Counts as Search Operation

Severity: MEDIUM

### SSR Hydration Mismatch with InstantSearch

Severity: MEDIUM

### Replica Indices for Sorting Multiply Storage

Severity: LOW

### Faceting Requires attributesForFaceting Declaration

Severity: MEDIUM

## Validation Checks

### Admin API Key in Client Code

Severity: ERROR

Admin API key must never be exposed to client-side code

Message: Admin API key exposed to client. Use search-only key.

### Hardcoded Algolia API Key

Severity: ERROR

API keys should use environment variables

Message: Hardcoded Algolia credentials. Use environment variables.

### Search Key Used for Indexing

Severity: ERROR

Indexing operations require admin key, not search key

Message: Search key used for indexing. Use admin key for write operations.

### Single Record Indexing in Loop

Severity: WARNING

Batch records together for efficient indexing

Message: Single record indexing in loop. Use saveObjects for batch indexing.

### Using deleteBy for Deletion

Severity: WARNING

deleteBy is expensive and rate-limited

Message: deleteBy is expensive. Prefer deleteObjects with specific IDs.

### Frequent Full Reindex

Severity: WARNING

Full reindex wastes operations on unchanged data

Message: Frequent full reindex. Consider incremental sync for unchanged data.

### Full Client Instead of Lite

Severity: INFO

Use lite client for smaller bundle in frontend

Message: Full Algolia client imported. Use algoliasearch/lite for frontend.

### Regular InstantSearch in Next.js

Severity: WARNING

Use react-instantsearch-nextjs for SSR support

Message: Using regular InstantSearch. Use InstantSearchNext for Next.js SSR.

### Missing Searchable Attributes Configuration

Severity: WARNING

Configure searchableAttributes for better relevance

Message: No searchableAttributes configured. Set attribute priority for relevance.

### Missing Custom Ranking

Severity: INFO

Custom ranking improves business relevance

Message: No customRanking configured. Add business metrics (popularity, rating).

## Collaboration

### Delegation Triggers

- user needs e-commerce checkout -> stripe-integration (Product search leading to purchase)
- user needs search analytics -> segment-cdp (Track search queries and results)
- user needs user authentication -> clerk-auth (Secured API keys per user)
- user needs database setup -> postgres-wizard (Source data for indexing)
- user needs serverless deployment -> aws-serverless (Lambda for indexing jobs)

## When to Use
- User mentions or implies: adding search to
- User mentions or implies: algolia
- User mentions or implies: instantsearch
- User mentions or implies: search api
- User mentions or implies: search functionality
- User mentions or implies: typeahead
- User mentions or implies: autocomplete search
- User mentions or implies: faceted search
- User mentions or implies: search index
- User mentions or implies: search as you type

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
