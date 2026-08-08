# Data Transforms Reference

Patterns for cleaning, normalizing, deduplicating, and enriching
extracted web data. Apply these transforms in Phase 5 (Transform)
between extraction and validation.

---

## Automatic Transforms

Always apply these to every extraction result.

### Whitespace Cleanup

```python
# Remove leading/trailing whitespace, collapse internal whitespace
value = ' '.join(value.split())

# Remove zero-width characters
import re
value = re.sub(r'[\u200b\u200c\u200d\ufeff\u00a0]', ' ', value).strip()
```

Patterns to handle:
- `\n`, `\r`, `\t` inside cell values -> single space
- Multiple consecutive spaces -> single space
- Non-breaking spaces (`&nbsp;`, `\u00a0`) -> regular space
- Zero-width characters -> remove

### HTML Entity Decode

| Entity      | Character | Entity     | Character |
|:------------|:----------|:-----------|:----------|
| `&amp;`     | `&`       | `&quot;`   | `"`       |
| `&lt;`      | `<`       | `&apos;`   | `'`       |
| `&gt;`      | `>`       | `&#39;`    | `'`       |
| `&nbsp;`    | ` `       | `&#8217;`  | (curly ')  |
| `&mdash;`   | `--`      | `&#8212;`  | `--`      |

```python
import html
value = html.unescape(value)
```

### Unicode Normalization

```python
import unicodedata
value = unicodedata.normalize('NFKC', value)
```

This handles:
- Fancy quotes -> standard quotes
- Ligatures -> separate characters (e.g. `ﬁ` -> `fi`)
- Full-width characters -> standard (e.g. `Ａ` -> `A`)
- Superscript/subscript numbers -> regular numbers

### Empty Value Standardization

| Input                   | Markdown Output | JSON Output |
|:------------------------|:----------------|:------------|
| `""` (empty string)     | `N/A`           | `null`      |
| `"-"` or `"--"`         | `N/A`           | `null`      |
| `"N/A"`, `"n/a"`, `"NA"`| `N/A`           | `null`      |
| `"None"`, `"null"`      | `N/A`           | `null`      |
| `"TBD"`, `"TBA"`        | `TBD`           | `"TBD"`     |

---

## Price Normalization

Apply when extracting product, pricing, or financial data.

### Extraction Pattern

```python
import re

def normalize_price(raw):
    if not raw:
        return None
    # Remove currency words
    cleaned = re.sub(r'(?i)(USD|EUR|GBP|BRL|R\$|US\$)', '', raw)
    # Extract numeric value (handles 1,234.56 and 1.234,56 formats)
    match = re.search(r'[\d.,]+', cleaned)
    if not match:
        return None
    num_str = match.group()
    # Detect format: if last separator is comma with 2 digits after, it's decimal
    if re.search(r',\d{2}$', num_str):
        num_str = num_str.replace('.', '').replace(',', '.')
    else:
        num_str = num_str.replace(',', '')
    return float(num_str)
```

### Currency Detection

| Symbol/Code | Currency | Symbol/Code | Currency |
|:------------|:---------|:------------|:---------|
| `$`, `US$`, `USD` | US Dollar | `R$`, `BRL` | Brazilian Real |
| `€`, `EUR` | Euro     | `£`, `GBP`  | British Pound |
| `¥`, `JPY` | Yen      | `₹`, `INR`  | Indian Rupee  |
| `C$`, `CAD` | Canadian Dollar | `A$`, `AUD` | Australian Dollar |

### Output Format

```json
{
  "price": 29.99,
  "currency": "USD",
  "rawPrice": "$29.99"
}
```

For Markdown, show formatted: `$29.99` (right-aligned in table).

---

## Date Normalization

Normalize all dates to ISO-8601 format.

### Common Formats to Handle

| Input Format            | Example              | Normalized         |
|:------------------------|:---------------------|:-------------------|
| Full text               | February 25, 2026    | 2026-02-25         |
| Short text              | Feb 25, 2026         | 2026-02-25         |
| US numeric              | 02/25/2026           | 2026-02-25         |
| EU numeric              | 25/02/2026           | 2026-02-25         |
| ISO already             | 2026-02-25           | 2026-02-25         |
| Relative                | 3 days ago           | (compute from now) |
| Relative                | Yesterday            | (compute from now) |
| Timestamp               | 1740441600           | 2025-02-25         |
| With time               | 2026-02-25T14:30:00Z | 2026-02-25 14:30   |

### Ambiguous Dates

When format is ambiguous (e.g. `03/04/2026`):
- Default to US format (MM/DD/YYYY) unless site is clearly non-US
- Check page `lang` attribute or URL TLD for locale hints
- Note ambiguity in delivery notes

### Relative Date Resolution

```python
from datetime import datetime, timedelta
import re

def resolve_relative_date(text):
    text = text.lower().strip()
    today = datetime.now()

    if 'today' in text: return today.strftime('%Y-%m-%d')
    if 'yesterday' in text: return (today - timedelta(days=1)).strftime('%Y-%m-%d')

    match = re.search(r'(\d+)\s*(hour|day|week|month|year)s?\s*ago', text)
    if match:
        n, unit = int(match.group(1)), match.group(2)
        deltas = {'hour': 0, 'day': n, 'week': n*7, 'month': n*30, 'year': n*365}
        return (today - timedelta(days=deltas.get(unit, 0))).strftime('%Y-%m-%d')

    return text  # Return as-is if can't parse
```

---

## URL Resolution

Convert relative URLs to absolute.

### Patterns

| Input                    | Base URL                    | Resolved                              |
|:-------------------------|:----------------------------|:--------------------------------------|
| `/products/item-1`       | `https://example.com/shop`  | `https://example.com/products/item-1` |
| `item-1`                 | `https://example.com/shop/` | `https://example.com/shop/item-1`     |
| `//cdn.example.com/img`  | `https://example.com`       | `https://cdn.example.com/img`         |
| `https://other.com/page` | (any)                       | `https://other.com/page` (absolute)   |

### JavaScript Resolution

```javascript
function resolveUrl(relative, base) {
  try { return new URL(relative, base || window.location.href).href; }
  catch { return relative; }
}
```

---

## Phone Normalization

For contact mode extraction.

### Pattern

```python
import re

def normalize_phone(raw):
    if not raw:
        return None
    # Remove all non-digit chars except leading +
    digits = re.sub(r'[^\d+]', '', raw)
    if not digits or len(digits) < 7:
        return None
    # Add + prefix if looks international
    if len(digits) >= 11 and not digits.startswith('+'):
        digits = '+' + digits
    return digits
```

### Format by Context

| Context          | Format Example       |
|:-----------------|:---------------------|
| JSON output      | `"+5511999998888"`   |
| Markdown table   | `+55 11 99999-8888`  |
| CSV output       | `"+5511999998888"`   |

---

## Deduplication

### Exact Deduplication

```python
def deduplicate(records, key_fields=None):
    """Remove exact duplicate records.
    If key_fields provided, deduplicate by those fields only.
    """
    seen = set()
    unique = []
    for record in records:
        if key_fields:
            key = tuple(record.get(f) for f in key_fields)
        else:
            key = tuple(sorted(record.items()))
        if key not in seen:
            seen.add(key)
            unique.append(record)
    return unique, len(records) - len(unique)  # returns (unique_list, removed_count)
```

### Near-Duplicate Detection

When records share key fields but differ in details:
1. Group by key fields (e.g. product name + source)
2. For each group, keep the record with fewest null values
3. If tie, keep the first occurrence
4. Report in notes: "Merged N near-duplicate records"

### Dedup Key Selection by Mode

| Mode     | Key Fields                        |
|:---------|:----------------------------------|
| product  | name + source (or name + brand)   |
| contact  | name + email (or name + org)      |
| jobs     | title + company + location        |
| events   | title + date + location           |
| table    | all fields (exact match)          |
| list     | first 2-3 identifying fields      |

---

## Text Cleaning

### Remove Noise

Common noise patterns to strip from extracted text:

| Pattern                            | Action                    |
|:-----------------------------------|:--------------------------|
| `\[edit\]`, `\[citation needed\]`  | Remove (Wikipedia)        |
| `Read more...`, `See more`         | Remove (truncation markers)|
| `Sponsored`, `Ad`, `Promoted`      | Remove or flag            |
| Cookie consent text                | Remove                    |
| Navigation breadcrumbs             | Remove                    |
| Footer boilerplate                 | Remove                    |

### Sentence Case Normalization

When extracting ALL-CAPS or inconsistent-case text:

```python
def normalize_case(text):
    if text.isupper() and len(text) > 3:
        return text.title()  # ALL CAPS -> Title Case
    return text
```

Only apply when: field is clearly ALL-CAPS input (common in older sites),
user requests it, or data looks better normalized.

---

## Data Type Coercion

### Automatic Type Detection

| Raw Value     | Detected Type | Coerced Value     |
|:--------------|:--------------|:------------------|
| `"123"`       | integer       | `123`             |
| `"12.99"`     | float         | `12.99`           |
| `"true"`      | boolean       | `true`            |
| `"false"`     | boolean       | `false`           |
| `"2026-02-25"`| date string   | `"2026-02-25"`    |
| `"$29.99"`    | price         | `29.99` + currency|
| `"4.5/5"`     | rating        | `4.5`             |
| `"1,234"`     | integer       | `1234`            |

### Rating Normalization

```python
import re

def normalize_rating(raw):
    if not raw:
        return None
    match = re.search(r'([\d.]+)\s*(?:/\s*([\d.]+))?', str(raw))
    if match:
        score = float(match.group(1))
        max_score = float(match.group(2)) if match.group(2) else 5.0
        return round(score / max_score * 5, 1)  # Normalize to /5 scale
    return None
```

---

## Enrichment Patterns

### Domain Extraction

Add domain from full URLs:
```python
from urllib.parse import urlparse

def extract_domain(url):
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.replace('www.', '')
        return domain
    except:
        return None
```

### Word Count

For article mode:
```python
def word_count(text):
    return len(text.split()) if text else 0
```

### Relative Time

Add human-readable time since date:
```python
def time_since(date_str):
    from datetime import datetime
    try:
        dt = datetime.fromisoformat(date_str)
        delta = datetime.now() - dt
        if delta.days == 0: return "Today"
        if delta.days == 1: return "Yesterday"
        if delta.days < 7: return f"{delta.days} days ago"
        if delta.days < 30: return f"{delta.days // 7} weeks ago"
        if delta.days < 365: return f"{delta.days // 30} months ago"
        return f"{delta.days // 365} years ago"
    except:
        return None
```

---

## Transform Pipeline Order

Apply transforms in this sequence:

1. **HTML entity decode** - raw text cleanup
2. **Unicode normalization** - character standardization
3. **Whitespace cleanup** - spacing normalization
4. **Empty value standardization** - null/N/A handling
5. **URL resolution** - relative to absolute
6. **Data type coercion** - strings to numbers/dates
7. **Price normalization** - if applicable
8. **Date normalization** - if applicable
9. **Phone normalization** - if applicable
10. **Text cleaning** - noise removal
11. **Deduplication** - remove duplicates
12. **Sorting** - user-requested order
13. **Enrichment** - domain, word count, etc.

Not all steps apply to every extraction. Apply only what's relevant
to the data type and extraction mode.
