# Obsidian Web Clipper Variables

**Official Docs:** [help.obsidian.md/web-clipper/variables](https://help.obsidian.md/web-clipper/variables)

## Preset Variables
Automatically extracted from the page.

- `{{content}}`: Main article content (markdown).
- `{{contentHtml}}`: Main article content (HTML).
- `{{title}}`: Page title.
- `{{url}}`: Page URL.
- `{{author}}`: Author name.
- `{{date}}`: Current date.
- `{{published}}`: Publication date (if detected).
- `{{site}}`: Site name.
- `{{description}}`: Meta description.
- `{{highlights}}`: Highlighted text (if any).
- `{{selection}}`: Selected text.
- `{{fullHtml}}`: Full page HTML.
- `{{favicon}}`: Favicon URL.
- `{{image}}`: Social share image URL.
- `{{words}}`: Word count.
- `{{domain}}`: Domain name.

## Prompt Variables (AI)
Use `{{"Your prompt here"}}` to ask the AI Interpreter to extract or summarize info.
*Requires Interpreter to be enabled.*

Examples:
- `{{"Summarize in 3 bullet points"}}`
- `{{"Extract the ingredients list"}}`
- `{{"Translate to English"}}`

## Selector Variables
Extract content using CSS selectors.
Syntax: `{{selector:css-selector}}` or `{{selector:css-selector?attribute}}`

Examples:
- `{{selector:h1}}`: Text of H1 tag.
- `{{selector:img.hero?src}}`: Source of image with class 'hero'.
- `{{selector:.author}}`: Text of element with class 'author'.
- `{{selectorHtml:body|markdown}}`: Full HTML converted to markdown.

## Meta Variables
Extract data from meta tags.
Syntax: `{{meta:name}}` or `{{meta:property}}`

Examples:
- `{{meta:description}}`
- `{{meta:og:title}}`

## Schema.org Variables
Extract structured data.
Syntax: `{{schema:Property}}` or `{{schema:@Type:Property}}`

Examples:
- `{{schema:Recipe:recipeIngredient}}`
- `{{schema:author.name}}`
- `{{schema:Article:headline}}`

## Fallbacks
When a variable is empty, you can supply a default value (fallback). 
Fallbacks can be chained (try variable A, then B, then a literal default) and used with filters. 
For syntax and evaluation order, see [logic.md](logic.md).
