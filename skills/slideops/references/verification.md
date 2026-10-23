# Verification & PDF export

## Setup: headless Chrome + a staging directory

Headless Chrome is the workhorse for this whole skill: it's how you look at a slide before
telling the user it's done, and it's how you produce a PDF at the end.

**Chrome discovery is platform-dependent.** The Playwright browser cache lives at
`~/Library/Caches/ms-playwright` on macOS and `~/.cache/ms-playwright` on Linux, and the
binary path inside a `chromium-*` bundle differs per platform, so discover it by searching
for the binary itself rather than hardcoding a subpath:

```bash
find_chrome() {
  local base c
  for base in "$HOME/Library/Caches/ms-playwright" "$HOME/.cache/ms-playwright"; do
    [ -d "$base" ] || continue
    c=$(find "$base" -maxdepth 6 -type f \
          \( -name chrome -o -name Chromium -o -name "Google Chrome for Testing" \) \
          2>/dev/null | grep -v headless_shell | sort -V | tail -1)
    [ -n "$c" ] && { printf '%s\n' "$c"; return; }
  done
  # System installs as a last resort
  for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
           "$(command -v google-chrome || true)" "$(command -v chromium || true)"; do
    [ -x "$c" ] && { printf '%s\n' "$c"; return; }
  done
}
CHROME=$(find_chrome)
[ -x "$CHROME" ] || { echo "Reviewed Chrome/Chromium installation required" >&2; exit 1; }
"$CHROME" --version   # sanity-check before the loop
```

(Windows is untested; adapt the cache path, `%LOCALAPPDATA%\ms-playwright`, and binary
name if you're there.) Quote `"$CHROME"` everywhere: the macOS binary path contains spaces.

**Keep the Chrome sandbox on.** The commands below deliberately omit `--no-sandbox`. You
are rendering a page built from repository content, so the sandbox is the layer that
contains a malicious payload if one ever reaches a slide. If Chrome cannot start with its sandbox, use a supported non-root environment; do not disable the sandbox to render repository-derived content. Block outbound network during rendering and inspect embedded HTML/SVG/URLs first.

**Staging directory: always fresh, always per-deck.** Never use fixed shared paths like
`/tmp/slide-01.png`: parallel deck builds (or a second deck in the same session) collide
on them. If your environment provides a session scratchpad directory, create a
subdirectory of it per deck; otherwise:

```bash
STAGE=$(mktemp -d -t slides)
DECK="deck.html"   # your deck's actual filename; the loops below use it
```

All commands below write into `$STAGE`. Delete the whole directory when the deck ships.

## Visual verification (do this for every slide, every edit: see SKILL.md Step 4)

Screenshot a single slide (fast, for spot-checking one edit; the URL hash is 1-indexed,
`#7` is display slide 7, i.e. the section with comment `<!-- 6: ... -->`):

```bash
"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1280,720 --screenshot="$STAGE/slide.png" "file://$(pwd)/$DECK#7"
```

Screenshot every slide (do this at least once before calling a deck "done", and again after
any batch of structural edits: insertions/deletions/reflows, not just wording tweaks).
Each cold Chrome launch takes ~2-3 s; batching a few in parallel keeps a 25-slide deck
under ~30 s:

```bash
N=$(grep -c '<section class="slide' "$DECK")
for i in $(seq 1 $N); do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --window-size=1280,720 --screenshot="$STAGE/slide-$(printf "%02d" $i).png" \
    "file://$(pwd)/$DECK#${i}" &
  [ $((i % 4)) -eq 0 ] && wait
done; wait
```

Then actually view each PNG. Things this catches in practice, every time it's run:

- Text or an image overlapping the bottom nav pill (fix: tighten vertical spacing, reduce a
  `margin-top`, or shorten the offending copy).
- A grid of cards stretching to fill leftover vertical space. The template's `.cols-2` /
  `.cols-3` default to content height; if you added the `fill` class (or a `flex:1`
  inline style) and the content doesn't need the room, remove it, or pin the stretching
  children with `flex:0 0 auto`.
- A relative image path (`../img/foo.png`) that resolves fine when the deck lives in its
  original folder but breaks the moment you copy the HTML somewhere else to screenshot it
  (see "PDF export" below: this is the single most common failure mode when generating a
  PDF export copy).
- Stale slide-number comments after an insertion/deletion: re-derive with
  `grep -n '<!-- [0-9]*:' "$DECK"` and renumber whenever the count changes.

## Redaction scan (before you hand anything over)

Run this on the finished artifacts, not on the source, and read every hit:

```bash
grep -nEi "api[_-]?key|secret|token|password|passwd|BEGIN [A-Z ]*PRIVATE KEY|\bAKIA[0-9A-Z]{16}\b|xox[baprs]-|ghp_[A-Za-z0-9]{20,}|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\b(10|127|172|192)\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\b" "$DECK"
```

The regex is a net, not a verdict: a hit inside the word "tokenized" is fine, a hit on a
real key is a stop-everything. Also check by eye, because these do not grep:

- **Every embedded image**, including ones you generated. Look at window titles, file
  trees, branch names, ticket ids, notification banners, and neighbouring tabs.
- **Speaker notes** (`<aside class="notes">`): they ship inside the HTML even though they
  are hidden, so anyone who opens the file can read them.
- **HTML comments**, including the slide-index comments, for anything pasted while drafting.
- **The PDF**, separately from the HTML: it is a different artifact, and text you cropped
  out of a slide can still sit in the page it was rendered from.

If the deck is going outside the organisation, have the user confirm the artifact before
it is sent. You cannot un-share a deck.

## PDF export

PDF export lives in the companion **slides-to-pdf** skill (self-contained; distributed
alongside this one). In short: build an export copy with absolute image paths and hidden
nav chrome, screenshot every slide at 2x, print a page-per-slide wrapper to PDF, and
verify by rendering the PDF back to images with pypdfium2, since headless Chrome cannot
rasterize a local PDF and image pages can be silently blank. Use that skill's recipe as
written; do not improvise a shortcut here.
