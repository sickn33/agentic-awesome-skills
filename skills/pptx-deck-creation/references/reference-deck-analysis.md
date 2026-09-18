# PPTX Reference Deck Analysis Recipes

This file is static guidance for inspecting existing `.pptx` files and defining expected analysis outputs.

## Scope

- Keep only static guidance for reference-deck prompt context, extraction, folder analysis, and style-master inspection.
- Do not place runtime scripts, model assets, importable Python modules, or generated artifacts here.
- This skill ships no importable code; implement the extraction/style-analysis and read-only OOXML inspection contracts on demand with `python-pptx`, `zipfile`, and a secure XML parser.
- `reference-deck-analysis-patterns.md` holds documentation-only `python-pptx` guidance — approach notes plus short illustrative snippets. Do not import from it or recreate packaged `.py` resources from it.
- `ooxml-parsing.md` holds documentation-only package-part, relationship, namespace, and security guidance. It is not a runtime dependency or script template.

## Analysis Recipes

### 1. Prompt Context Recipe

Build compact LLM-ready context from a reference deck.

Expected result:

- `slide_count`, `slide_size`
- `styles`, `brands`, `template`, `layout`
- Per-slide title/text snippets and shape counts

### 2. Full Extraction Recipe

Produce a full JSON extraction including:

- `summary` complexity metrics
- `slides[*].layout_tree` with groups/objects
- `ooxml_elements` for render-aware inspection
- resolved package relationships, OOXML-only markers, and parsing exceptions

### 3. OOXML Package Inspection Recipe

Use read-only package inspection when high-level APIs do not expose the needed
evidence: slide order, theme tokens, masters/layouts, notes, comments,
animations, media, charts, or non-modeled formatting.

- Resolve slide order from `ppt/presentation.xml` and its relationship part.
	Do not derive it from `slideN.xml` filenames.
- Resolve every relationship target relative to its owning source part, not its
	`.rels` part. Retain the relationship type, target, and unreadable XML errors
	in the result.
- Preserve theme colors and fonts as tokens when they cannot be reliably
	resolved to RGB values.
- Parse untrusted XML with a secure parser; do not enable DTDs, entity
	expansion, or network access.
- Keep the source package read-only and never copy its XML parts into a new
	deck.

### 4. Folder Batch Recipe

Process a folder of decks to produce:

- One `.pptx-spec.json` file per deck
- A `manifest.json` to track outputs

### 5. Style Master Recipe

Run style-only analysis when you need design lock signals:

- Palette and accent colors
- Typography and font-size distribution
- Master/layout usage and flow patterns

### 6. Reference Template Catalog Recipe

When a reference deck should inform a new deck's layout rhythm, produce a
human-readable catalog from the existing prompt-context, extraction, and
style-master outputs. This is a view over the same analysis, not a separate
extraction workflow.

- List every source slide by **zero-based** index.
- Record `layout_role`, a short visual description, usable regions,
	placeholder roles, visual structures, and content-fit constraints.
- Use the catalog to select layout inspiration for the new outline. Re-author
	every target slide with an independent coordinate-explicit `layout_tree`.
- Do not clone, rearrange, replace text in, or otherwise mutate the source deck.
- Do not inherit source content, fonts, images, or proprietary assets without
	explicit permission and licensing evidence.

Suggested catalog shape:

```json
{
	"source_deck": "reference.pptx",
	"slide_count": 12,
	"slides": [
		{
			"source_index": 0,
			"layout_role": "cover",
			"description": "Dark cover with title and subtitle regions",
			"regions": ["title", "subtitle", "supporting visual"],
			"placeholder_roles": ["ctrTitle", "subTitle"],
			"visual_structures": ["full-bleed color field", "corner motif"],
			"reuse_constraints": ["best for one title and one short subtitle"]
		}
	]
}
```

## Related Responsibilities

This reference covers PPTX prompt context, extraction, folder batch analysis,
style-master inspection, read-only OOXML package inspection, and the derived
reference-template catalog only. See [OOXML parsing guidance](ooxml-parsing.md)
for the package-part map and parser safety rules.

- Use the parent `pptx-deck-creation` workflow for narrative/source preparation,
	together with [design profiles](design-profiles.md) for profile selection.
- Use [visual asset guidelines](visual-asset-adapters.md) for acquiring and
	placing icons, images, SVGs, and infographics.
