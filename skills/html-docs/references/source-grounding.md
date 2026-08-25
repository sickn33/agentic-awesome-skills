# Source grounding and research

Use this reference for folders, repositories, websites, documents, PDFs,
pasted material, and research topics.

## Snapshot contract

Freeze a `SourceSnapshot` before outlining. Record:

- Stable evidence ID.
- Canonical URI or safe local locator.
- Title and section heading.
- Extracted passage or code excerpt.
- Content checksum.
- File/page/line locator when safe.
- Source type, authorship, date, and retrieval time when known.
- Privacy and publication metadata.

Keep raw sources private. Upload only used excerpts unless the user explicitly
requests a full-source archive.

## Codebases

Respect `.gitignore` plus these exclusions:

- Environment and credential files.
- VCS internals.
- Dependency directories.
- Build output, caches, generated binaries, media, and archives.
- Minified or vendored files unless they are the subject.

Record the commit SHA and selected file hashes. Build evidence around concepts,
architecture, data flow, interfaces, and representative code. Do not turn a
directory listing into a course.

## Websites

For one-page requests, snapshot only that page and directly required assets.
For site-level requests:

- Stay on the same origin by default.
- Crawl to depth two and at most 100 pages.
- Respect authentication and access restrictions.
- Canonicalize URLs and remove tracking parameters.
- Deduplicate content by checksum.
- Preserve heading anchors and page titles.

## Research topics

Research before outlining:

1. Decompose the topic into the learner’s likely questions.
2. Prefer primary papers, standards, official documentation, datasets, and
   first-party technical material.
3. Use secondary sources to orient, not as the only support for technical
   claims.
4. Resolve disagreements and mark uncertainty.
5. Continue until every planned substantive claim has at least one evidence
   record.
6. Freeze the research manifest, then write.

Do not cite search-result pages. Keep claims narrower than their evidence.
Distinguish source facts from agent inference.

For a course, maintain an annotated `learning/RESOURCES.md` alongside the
machine-readable evidence graph. Record what each source is authoritative for,
when to consult it, and any evidence gap still blocking a lesson. Prefer a
small, sharp source set over a long undifferentiated bibliography.

## Evidence graph

Represent:

- `supports`: evidence supports a claim.
- `qualifies`: evidence limits a claim.
- `contradicts`: sources disagree.
- `depends_on`: one idea requires another.
- `demonstrates`: an example makes a mechanism concrete.

Every lesson records evidence IDs and source dependencies. The page shows
human-readable citations; the project retains machine-readable IDs.

## Refresh

Rescan fingerprints and classify each lesson:

- `unchanged`: no dependency changed.
- `stale`: one or more dependencies changed.
- `conflicted`: a changed source removed or replaced an edited semantic target.

Regenerate stale lessons only. Reapply overrides whose semantic IDs survive.
Surface conflicts in Studio. Create a private version and require explicit
publication.
