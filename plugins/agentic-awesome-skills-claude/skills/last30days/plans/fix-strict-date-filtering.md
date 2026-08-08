# fix: Enforce Strict 30-Day Date Filtering

## Overview

The `/last30days` skill is returning content older than 30 days, violating its core promise. Analysis shows:
- **Reddit**: Only 40% of results within 30 days (9/15 were older, some from 2022!)
- **X**: 100% within 30 days (working correctly)
- **WebSearch**: 90% had unknown dates (can't verify freshness)

## Problem Statement

The skill's name is "last30days" - users expect ONLY content from the last 30 days. Currently:

1. **Reddit search prompt** says "prefer recent threads, but include older relevant ones if recent ones are scarce" - this is too permissive
2. **X search prompt** explicitly includes `from_date` and `to_date` - this is why it works
3. **WebSearch** returns pages without publication dates - we can't verify they're recent
4. **Scoring penalties** (-10 for low date confidence) don't prevent old content from appearing

## Proposed Solution

### Strategy: "Hard Filter, Not Soft Penalty"

Instead of penalizing old content, **exclude it entirely**. If it's not from the last 30 days, it shouldn't appear.

| Source | Current Behavior | New Behavior |
|--------|------------------|--------------|
| Reddit | Weak "prefer recent" | Explicit date range + hard filter |
| X | Explicit date range (working) | No change needed |
| WebSearch | No date awareness | Require recent markers OR exclude |

## Technical Approach

### Phase 1: Fix Reddit Date Filtering

**File: `scripts/lib/openai_reddit.py`**

Current prompt (line 33):
```
Find {min_items}-{max_items} relevant Reddit discussion threads.
Prefer recent threads, but include older relevant ones if recent ones are scarce.
```

New prompt:
```
Find {min_items}-{max_items} relevant Reddit discussion threads from {from_date} to {to_date}.

CRITICAL: Only include threads posted within the last 30 days (after {from_date}).
Do NOT include threads older than {from_date}, even if they seem relevant.
If you cannot find enough recent threads, return fewer results rather than older ones.
```

**Changes needed:**
1. Add `from_date` and `to_date` parameters to `search_reddit()` function
2. Inject dates into `REDDIT_SEARCH_PROMPT` like X does
3. Update caller in `last30days.py` to pass dates

### Phase 2: Add Hard Date Filtering (Post-Processing)

**File: `scripts/lib/normalize.py`**

Add a filter step that DROPS items with dates before `from_date`:

```python
def filter_by_date_range(
    items: List[Union[RedditItem, XItem, WebSearchItem]],
    from_date: str,
    to_date: str,
    require_date: bool = False,
) -> List:
    """Hard filter: Remove items outside the date range.

    Args:
        items: List of items to filter
        from_date: Start date (YYYY-MM-DD)
        to_date: End date (YYYY-MM-DD)
        require_date: If True, also remove items with no date

    Returns:
        Filtered list with only items in range
    """
    result = []
    for item in items:
        if item.date is None:
            if not require_date:
                result.append(item)  # Keep unknown dates (with penalty)
            continue

        # Hard filter: if date is before from_date, exclude
        if item.date < from_date:
            continue  # DROP - too old

        if item.date > to_date:
            continue  # DROP - future date (likely parsing error)

        result.append(item)

    return result
```

### Phase 3: WebSearch Date Intelligence

WebSearch CAN find recent content - Medium posts have dates, GitHub has commit timestamps, news sites have publication dates. We should **extract and prioritize** these signals.

**Strategy: "Date Detective"**

1. **Extract dates from URLs**: Many sites embed dates in URLs
   - Medium: `medium.com/@author/title-abc123` (no date) vs news sites
   - GitHub: Look for commit dates, release dates in snippets
   - News: `/2026/01/24/article-title`
   - Blogs: `/blog/2026/01/title`

2. **Extract dates from snippets**: Look for date markers
   - "January 24, 2026", "Jan 2026", "yesterday", "this week"
   - "Published:", "Posted:", "Updated:"
   - Relative markers: "2 days ago", "last week"

3. **Prioritize results with verifiable dates**:
   - Results with recent dates (within 30 days): Full score
   - Results with old dates: EXCLUDE
   - Results with no date signals: Heavy penalty (-20) but keep as supplementary

**File: `scripts/lib/websearch.py`**

Add date extraction functions:

```python
import re
from datetime import datetime, timedelta

# Patterns for date extraction
URL_DATE_PATTERNS = [
    r'/(\d{4})/(\d{2})/(\d{2})/',  # /2026/01/24/
    r'/(\d{4})-(\d{2})-(\d{2})/',  # /2026-01-24/
    r'/(\d{4})(\d{2})(\d{2})/',    # /20260124/
]

SNIPPET_DATE_PATTERNS = [
    r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{1,2}),? (\d{4})',
    r'(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{4})',
    r'(\d{4})-(\d{2})-(\d{2})',
    r'Published:?\s*(\d{4}-\d{2}-\d{2})',
    r'(\d{1,2}) (days?|hours?|minutes?) ago',  # Relative dates
]

def extract_date_from_url(url: str) -> Optional[str]:
    """Try to extract a date from URL path."""
    for pattern in URL_DATE_PATTERNS:
        match = re.search(pattern, url)
        if match:
            # Parse and return YYYY-MM-DD format
            ...
    return None

def extract_date_from_snippet(snippet: str) -> Optional[str]:
    """Try to extract a date from text snippet."""
    for pattern in SNIPPET_DATE_PATTERNS:
        match = re.search(pattern, snippet, re.IGNORECASE)
        if match:
            # Parse and return YYYY-MM-DD format
            ...
    return None

def extract_date_signals(url: str, snippet: str, title: str) -> tuple[Optional[str], str]:
    """Extract date from any available signal.

    Returns: (date_string, confidence)
    - date from URL: 'high' confidence
    - date from snippet: 'med' confidence
    - no date found: None, 'low' confidence
    """
    # Try URL first (most reliable)
    url_date = extract_date_from_url(url)
    if url_date:
        return url_date, 'high'

    # Try snippet
    snippet_date = extract_date_from_snippet(snippet)
    if snippet_date:
        return snippet_date, 'med'

    # Try title
    title_date = extract_date_from_snippet(title)
    if title_date:
        return title_date, 'med'

    return None, 'low'
```

**Update WebSearch parsing to use date extraction:**

```python
def parse_websearch_results(results, topic, from_date, to_date):
    items = []
    for result in results:
        url = result.get('url', '')
        snippet = result.get('snippet', '')
        title = result.get('title', '')

        # Extract date signals
        extracted_date, confidence = extract_date_signals(url, snippet, title)

        # Hard filter: if we found a date and it's too old, skip
        if extracted_date and extracted_date < from_date:
            continue  # DROP - verified old content

        item = {
            'date': extracted_date,
            'date_confidence': confidence,
            ...
        }
        items.append(item)

    return items
```

**File: `scripts/lib/score.py`**

Update WebSearch scoring to reward date-verified results:

```python
# WebSearch date confidence adjustments
WEBSEARCH_NO_DATE_PENALTY = 20  # Heavy penalty for no date (was 10)
WEBSEARCH_VERIFIED_BONUS = 10   # Bonus for URL-verified recent date

def score_websearch_items(items):
    for item in items:
        ...
        # Date confidence adjustments
        if item.date_confidence == 'high':
            overall += WEBSEARCH_VERIFIED_BONUS  # Reward verified dates
        elif item.date_confidence == 'low':
            overall -= WEBSEARCH_NO_DATE_PENALTY  # Heavy penalty for unknown
        ...
```

**Result**: WebSearch results with verifiable recent dates rank well. Results with no dates are heavily penalized but still appear as supplementary context. Old verified content is excluded entirely.

### Phase 4: Update Statistics Display

Only count Reddit and X in "from the last 30 days" claim. WebSearch should be clearly labeled as supplementary.

## Acceptance Criteria

### Functional Requirements

- [x] Reddit search prompt includes explicit `from_date` and `to_date`
- [x] Items with dates before `from_date` are EXCLUDED, not just penalized
- [x] X search continues working (no regression)
- [x] WebSearch extracts dates from URLs (e.g., `/2026/01/24/`)
- [x] WebSearch extracts dates from snippets (e.g., "January 24, 2026")
- [x] WebSearch with verified recent dates gets +10 bonus
- [x] WebSearch with no date signals gets -20 penalty (but still appears)
- [x] WebSearch with verified OLD dates is EXCLUDED

### Non-Functional Requirements

- [ ] No increase in API latency
- [ ] Graceful handling when few recent results exist (return fewer, not older)
- [ ] Clear user messaging when results are limited due to strict filtering

### Quality Gates

- [ ] Test: Reddit search returns 0% results older than 30 days
- [ ] Test: X search continues to return 100% recent results
- [ ] Test: WebSearch is clearly differentiated in output
- [ ] Test: Edge case - topic with no recent content shows helpful message

## Implementation Order

1. **Phase 1**: Fix Reddit prompt (highest impact, simple change)
2. **Phase 2**: Add hard date filter in normalize.py (safety net)
3. **Phase 3**: Add WebSearch date extraction (URL + snippet parsing)
4. **Phase 4**: Update WebSearch scoring (bonus for verified, heavy penalty for unknown)
5. **Phase 5**: Update output display to show date confidence

## Testing Plan

### Before/After Test

Run same query before and after fix:
```
/last30days remotion launch videos
```

**Expected Before:**
- Reddit: 40% within 30 days

**Expected After:**
- Reddit: 100% within 30 days (or fewer results if not enough recent content)

### Edge Case Tests

| Scenario | Expected Behavior |
|----------|-------------------|
| Topic with no recent content | Return 0 results + helpful message |
| Topic with 5 recent results | Return 5 results (not pad with old ones) |
| Mixed old/new results | Only return new ones |

### WebSearch Date Extraction Tests

| URL/Snippet | Expected Date | Confidence |
|-------------|---------------|------------|
| `medium.com/blog/2026/01/15/title` | 2026-01-15 | high |
| `github.com/repo` + "Released Jan 20, 2026" | 2026-01-20 | med |
| `docs.example.com/guide` (no date signals) | None | low |
| `news.site.com/2024/05/old-article` | 2024-05-XX | EXCLUDE (too old) |
| Snippet: "Updated 3 days ago" | calculated | med |

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Fewer results for niche topics | High | Medium | Explain why in output |
| User confusion about reduced results | Medium | Low | Clear messaging |
| Date parsing errors exclude valid content | Low | Medium | Keep items with unknown dates, just label clearly |

## References

### Internal References
- Reddit search: `scripts/lib/openai_reddit.py:25-63`
- X search (working example): `scripts/lib/xai_x.py:26-55`
- Date confidence: `scripts/lib/dates.py:62-90`
- Scoring penalties: `scripts/lib/score.py:149-153`
- Normalization: `scripts/lib/normalize.py:49,99`

### External References
- OpenAI Responses API lacks native date filtering
- Must rely on prompt engineering + post-processing
