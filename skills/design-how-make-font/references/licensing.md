# Licensing and naming

The output is a Modified Version of the base under the SIL Open Font License 1.1. The OFL allows that, with
conditions this skill keeps.

## What the OFL requires

- The licence travels with the fonts. `package.py` copies the base's `OFL.txt` byte for byte and adds one
  copyright line for the modifications at the top.
- The original copyright notice stays. Name ID 0 keeps the base's line, with ours under it.
- A Reserved Font Name may not be used by a Modified Version. The RFN is declared in the base's copyright line
  or OFL.txt (`with Reserved Font Name "X"`). `package.py` refuses a family name that contains one.
- The fonts may not be sold on their own. They may be bundled, embedded and sold as part of a larger work.

## What this skill adds

- **A new family name**, chosen by the person, that contains neither the base's family name nor any word from
  it other than generic ones (Serif, Sans, Mono, Display, Text). Even without an RFN, keeping the base's name
  would misstate who made the modified font.
- **No trademark record.** Name ID 7 names the base's trademark. It is dropped, since the new name does not use
  the mark.
- **No base name outside the copyright line.** `check_font.py` scans every name record and the bytes of every
  other table, in ASCII and UTF-16.
- **No reference name anywhere.** The references are fonts the person likes, often commercial. Their names stay
  out of the font, FONTLOG, README and font book. The FONTLOG says "fitted to measurements of typefaces the
  requester chose".
- **Name IDs 13 and 14** carry the OFL notice and `https://openfontlicense.org`.
- **Vendor ID** is `--vendor`, four characters, or NONE.

## Name table, as written

| ID | Value |
|-|-|
| 0 | base copyright line, then `Copyright <year> <holder> (modifications)` |
| 1, 2 | family and style (non-RIBBI styles: `Family Medium`, `Regular`) |
| 3 | `<version>;<vendor>;<PostScript name>` |
| 4 | `Family Style` |
| 5 | `Version x.xxx` |
| 6 | PostScript name, letters and digits only |
| 8 | holder |
| 9 | base designers (original design); modifier (modifications) |
| 11 | `--url`, if given |
| 13, 14 | OFL notice and URL |
| 16, 17 | typographic family and style |

Stylistic-set names (IDs referenced from GSUB) are kept.

## Refusals

- A base without an OFL or Apache licence: not a base. Apache-licensed bases are fine to measure, but this
  skill ships OFL, so pick an OFL base unless the person accepts Apache terms and you change the packaging.
- A request to keep or echo a commercial font's name ("call it X Neue"): refuse, offer a new name.
- A request to ship the reference's file, or a font made by editing it: refuse.

## FONTLOG.txt

Plain text: what the font is, the base and its axes, each modification with its numbers (y and x locations,
factors, width error per class, side moves, track, guard pairs), and acknowledgements with the base's designers.
