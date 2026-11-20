# Behaviour parity

Dozens of behaviour regressions in one migration passed typecheck, lint, unit tests and the system's check. A verifier driving a browser caught them, and many first verdicts were not clean. Each class below is a table you run on the old control and the new one with the same inputs. Every differing row is approved by a person or fixed.

`parity.mjs number|date --old <module or json> --new <module or json>` runs the first two classes. A results file needs a result for every input (and a date file every zone) on both sides, or the row fails. For the rest, drive the app and fill the table by hand or with the host's browser tool.

## The classes

**Numbers and amounts.** Type and paste these 19 into each control: `2.5`, `-3`, `1e3`, `12.50`, `0.123456789`, `1,234.56`, `  42 `, empty, `abc`, `12abc`, `007`, `-0`, a 20-digit number, `1.2.3`, `.5`, `5.`, `+3`, a Unicode minus, `1 000`. Compare what the box shows, what the control commits, and whether submit is enabled.
Wrong: an integer field commits 25 for `2.5`, 3 for `-3`, 13 for `1e3`, and sends `12.50` as `12.5`. Wrong: a box holding `abc` submits the last good value. Right: the same answers as before, a rejected row a person approved, and submit refused while the text does not parse.

**Dates.** Run every date surface under `TZ=America/Los_Angeles` and `TZ=Asia/Tokyo` at least, and compare the payload, not the label. If legacy already answers differently per zone, report it and fix it only as an `intended change` row.
Wrong: a date entered as `2025-03-15` shows `03/14/2025` west of UTC. Right: it comes back as the same calendar day.

**Upload inputs.** Test extension only, MIME only, an upper-case extension, a wrong MIME and a rejected type.
Wrong: `accept` checks the extension, so a file delivered with the right MIME type and no extension is refused.

**Enter and Space on open.** For a picker that writes on select, press Enter and Space immediately after it opens, at 0 and 300 ms. Expect no write.
Wrong: the first enabled option fires a switch write.

**Accessible names.** Diff the accessibility tree before and after: names, roles, headings, `aria-current`. A shortened visible label keeps its full accessible name.
Wrong: size buttons announced as "S", "M", "L".

**Focus.** For each dialog read `document.activeElement` after Escape, Cancel, confirm success, confirm failure and when the opener disappears. Record the old value first.
Wrong: a confirmed row delete leaves focus on `body`.

**Refetch error.** Force the next fetch of a loaded record to 500 and dispatch focus events on `window`. The page keeps its data.
Wrong: a background refetch replaces a loaded record with an error page.

**Filter values.** Assert the stored value for every filter operator, not the chip that shows it.
Wrong: "is" stores the complement.

**Widths inside the scroller.** Measure row controls and headers inside the scroll container at 390, 768, 1280 and 1920. A control reachable before stays reachable.
Wrong: no row control in view while a window-based script passed.

**Fixtures.** Use a long title (over 100 characters), a long file name and more rows than fit at 1920. Short fixtures hid truncation and unreachable pages on several surfaces.

## Reading the table

Columns: case, old result, new result, expectation, verdict. Expectations are `same`, `rejected`, `intended change` and `preexisting`. An `intended change` row that does not change fails, so a fix that quietly did not land is caught. Exit 0 only when every row is as expected, which makes the table one a person can approve.

## When there is no browser

Run the pure functions with `parity.mjs` and say in the verdict that the control itself was `blocked`. A write surface is never `verified` on that.
