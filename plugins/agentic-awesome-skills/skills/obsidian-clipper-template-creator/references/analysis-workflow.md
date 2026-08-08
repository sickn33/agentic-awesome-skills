# Analysis Workflow: Validating Variables

To ensure your template works correctly, you must validate that the target page actually contains the data you want to extract.

## 1. Fetch the Page

Use the `WebFetch` tool or a browser DOM snapshot to retrieve the content of a representative URL provided by the user.

```text
WebFetch(url="https://example.com/recipe/chocolate-cake")
```

## 2. Analyze the Output

### Check for Schema.org (Recommended)

Look for `<script type="application/ld+json">`. This contains structured data which is the most reliable way to extract info.

**Example Found in HTML:**

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Recipe",
  "name": "Chocolate Cake",
  "author": {
    "@type": "Person",
    "name": "John Doe"
  }
}
```

**Conclusion:**

- `{{schema:Recipe:name}}` is valid.
- `{{schema:Recipe:author.name}}` is valid.
- **Tip:** You can use `schema:Recipe` in the `triggers` array to automatically select this template for any page with this schema.

### Check for Meta Tags

Look for `<meta>` tags in the `<head>` section.

**Example Found in HTML:**

```html
<meta property="og:title" content="The Best Chocolate Cake" />
<meta name="description" content="A rich, moist chocolate cake recipe." />
```

**Conclusion:**

- `{{meta:og:title}}` is valid.
- `{{meta:description}}` is valid.

### Check for CSS Selectors (Verified)

If Schema and Meta tags are missing, look for HTML structure (classes and IDs) to use with `{{selector:...}}`.
Selectors must be verified against the fetched HTML or DOM snapshot. Do not guess selectors.

**Example Found in HTML:**

```html
<div class="article-body">
  <h1 id="main-title">Chocolate Cake</h1>
  <span class="author-name">By John Doe</span>
</div>
```

**Conclusion:**

- `{{selector:h1#main-title}}` or `{{selector:h1}}` can extract the title.
- `{{selector:.author-name}}` can extract the author.

## 3. Verify Against Base

Compare the available data from your analysis with the properties required by the user's Base (see [bases-workflow.md](bases-workflow.md)).

- If the Base requires `ingredients` but the page has no Schema or clear list structure, warn the user that this field might need manual entry or a prompt variable.
