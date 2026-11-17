# Boring Marketing Skills import

The source is [Boring Marketing Skills 4.1.1](https://github.com/boringmarketer/boring-marketing-skills/tree/7c6678c857fe514f79396ea607aa2a56ea82e676) by Boring Marketing, LLC. Each imported skill carries the [upstream MIT license](https://github.com/boringmarketer/boring-marketing-skills/blob/7c6678c857fe514f79396ea607aa2a56ea82e676/LICENSE).

All skill IDs use `boring-marketing-` so they can coexist with the existing AAS marketing skills and route to the matching collection. The source import covers the skill trees. The upstream plugin, hooks and scheduler configuration are distributed separately by their author.

## Compatibility and review

- The shared router looks up the AAS-prefixed directories. Brand-memory tags and existing campaign filenames continue to use the short upstream IDs. A partial install can run selected skills and skip unavailable siblings.
- The first-screen helper reads a bounded HTML response, checks URL resolution and sizes same-origin images by their response headers. The creative motion template pins its GSAP asset with a subresource integrity digest.
- The upstream fixture suite was run against the imported routing, brand context, capability detection, ad-library parsing and crawl helpers using temporary workspace data. Testing live ad delivery, external publishing, paid generation and account mutations requires authorized provider accounts and specific scope.
