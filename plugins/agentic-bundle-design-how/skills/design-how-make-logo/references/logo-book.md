# Logo book

The book is how the person chooses. It presents every direction the way a studio presents logo directions: each one
in use, its construction and its colour, then all of them side by side with their checks. It shows no reference logo
and no other studio's logo; its only photographs are free ones with a credits page (see Photos).

`logo_book.py` writes `book/index.html` and `pages.json`; `render_book.mjs` prints `pages/NN-slug.png` and
`logobook.pdf` at 1600 x 900 (16:9), and exits 1 if the book's font didn't load or anything runs off a page or out of
its tile.

## Pages

| Page | What |
|-|-|
| Cover | the product's name and "Logo directions" on ink, beside a photo (or the first mark on its colour field) |
| Directions | three marks to a page, each with its title and idea |
| For each direction: in use | the lockup reversed on ink; a browser tab with the mark as its icon; a poster: a photo with the tagline and lockup over a dark foot (or the colour field) |
| For each direction: construction | the lockup on paper; the mark on its grid with dashed guides run edge to edge; a phone with the app icon and the `--note` notification |
| For each direction: colour | the five palette colours with their hex values |
| For each direction: sizes | the mark at 16, 24, 32 and 64 px with its stroke at 16 px; reversed; on colour; the stacked lockup |
| Side by side | three marks to a page, each large and at 16 px, with every check and its number |
| Photos | each photo's title, creator, licence and source, when the book has photos |

No page carries a numbered label or a dot separator, and the cover carries no line about how the marks were made.

## Photos

`fetch_photos.mjs` searches Openverse for free photos, public domain and CC BY only, StockSnap's CC0 stock first and
Flickr after, and keeps each one's creator, licence and source for the credits page. Broad mood words work ("laptop
office", "doctor", "architect"); specific ones return museum scans and news photos. Look at every photo and delete any
that doesn't fit before printing. Without `--photos` the cover and posters use each direction's colour field.

## Guides

The construction page draws a few clean guides, not every line in the recipe: the mark's edges, then the recipe's own
lines that sit at least an eighth of the grid from those already drawn, at most five a side.

## Words

The cover and the directions page take `--line` (what the product does). The poster takes `--tagline`. Keep both
plain and short; they're placeholders the person will rewrite.
