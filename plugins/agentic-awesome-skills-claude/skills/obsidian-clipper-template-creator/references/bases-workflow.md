# Working with Obsidian Bases

The user maintains "Bases" in `Bases/*.base` which define the schema and properties for different types of notes (e.g., Recipes, Clippings, People).

## Workflow

1.  **Identify the Category:** Determine the type of content the user wants to clip (e.g., a Recipe, a News Article, a YouTube video).
2.  **Find the Base:** Search `Bases/` for a matching `.base` file.
    *   Example: For a recipe, look for `Bases/Recipes.base`.
    *   Example: For a generic article, look for `Bases/Clippings.base`.
3.  **Read the Base:** Read the content of the `.base` file to understand the required properties.

## Interpreting .base Files

Base files use a YAML-like structure. Look for the `properties` section.

```yaml
properties:
  file.name:
    displayName: name
  note.author:
    displayName: author
  note.type:
    displayName: type
  note.ingredients:
    displayName: ingredients
```

*   `note.X` corresponds to a property name `X` in the frontmatter.
*   `displayName` helps understand the intent, but the property key (e.g., `author`, `type`, `ingredients`) is what matters for the template.

## Mapping to Clipper Properties

When creating the JSON for the Web Clipper, map the Base properties to the `properties` array in the JSON.

| Base Property | Clipper JSON Property Name | Value Strategy |
| :--- | :--- | :--- |
| `note.author` | `author` | `{{author}}` or `{{schema:author.name}}` |
| `note.source` | `source` | `{{url}}` |
| `note.published` | `published` | `{{published}}` |
| `note.ingredients` | `ingredients` | `{{schema:Recipe:recipeIngredient}}` |
| `note.type` | `type` | Constant (e.g., `Recipe`) or empty |

**Crucial Step:** Ask the user which properties should be automatically filled, which should be hardcoded (e.g., `type: Recipe`), and which should be left empty for manual entry.
