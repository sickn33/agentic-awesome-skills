#!/usr/bin/env node
// check-system.mjs: the design system check, a starter. Node 18+, no dependencies.
// Reads whole JSX tags, not lines, so a multi-line <div onClick> is still one tag.
// Run `node scripts/check-system.mjs --help` for usage.
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { execFileSync, execSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
// oklch.mjs beside this script names the nearest color token. Without it, raw-value findings name no color token.
let oklch = null;
try { oklch = await import(new URL("./oklch.mjs", import.meta.url).href); } catch {}

const HELP = `check-system.mjs: design system check (starter)

Usage: node scripts/check-system.mjs [options] [--files <file>...]

With no options it checks the repo against the allowlist, after the self-test when
the repo keeps planted cases (below). Exit 0 clean, 1 on findings or a failed
self-test, 2 on bad setup.

Options
  --root <dir>         repo root. Default: the git root of the first file given to
                       --files, --rehash or --save-stock, else of the current
                       folder, else the current folder. Pass it in a monorepo
                       whose app is not the git root
  --config <file>      config (default: scripts/check-system.config.json)
  --self-test          run only the self-test: the built-in planted cases (a failing
                       and a passing case per core rule), the CLI checks, and the
                       repo's own planted cases when it keeps any
  --fixtures <dir>     the folder of the repo's own planted cases
  --no-self-test       skip the self-test in the default run
  --files <f>...       check only these files. The allowlist still applies
  --no-allowlist       ignore the allowlist, so every finding fails. Shows all a file holds
  --init               write a starter config guessed from the repo. Refuses to overwrite
  --init-allowlist     write the allowlist from today's findings. Refuses to overwrite
  --shrink-allowlist   lower allowlist counts to what is found now. Never raises one
  --prune-allowlist    drop allowlist entries that match no finding now: a fixed
                       literal, a deleted file, a retired rule. Counts that still
                       match stay. The close runs it before --left
  --hash-stock         fill empty sha256 cells in the drift list, for every status
  --rehash <f>... --note "<why>"
                       record the current hash of these drift-list files after a
                       reviewed edit, and write the note into each row. The note
                       is required
  --save-stock <f> <upstream>
                       save upstream's copy of a customized ui file as
                       <stockDir>/<f>.stock. <upstream> is a plain file or a
                       registry item JSON, such as \`npx shadcn@latest view <item>\`. Findings
                       on lines identical to a stock line are upstream's, not drift
  --left               after the scan, print what the allowlist still holds, by
                       file and rule. The close counts come from this output
  --changed <ref>      report only findings on lines added or changed since the merge
                       base of <ref> and HEAD, uncommitted and untracked files
                       included. The allowlist still applies: an allowlisted
                       literal is reported only past its count. For pull requests
  --diff <file>        take the changed lines from a unified diff instead of git
                       ("-" reads stdin)
  --warn               report findings as warnings and always exit 0. Output is
                       GitHub annotations (::warning file=,line=::) when
                       GITHUB_ACTIONS is set, else "file:line warning ...". Skips
                       the self-test. The blocking check stays a separate run
  --format <f>         github or plain, overriding the guess --warn makes
  --summary <file>     also append every finding and warning to <file> as a Markdown
                       table. Pass $GITHUB_STEP_SUMMARY, so nothing is lost past
                       the annotation cap
  --ratchet [<file>]   count findings per rule over the whole repo and compare with
                       <file> (JSON, rule id to count; default
                       scripts/check-ratchet.json). Fails only when a count
                       rises. Writes the file when it is missing. With --warn, a
                       rise is a warning and the exit is 0
  --ratchet-update     with --ratchet, lower the file's counts to what is found now
                       once a count falls. Never raises one
  --explain <rule-id>  print the rule, why it matters and the fix
  --list-rules         print rule id and rule, tab separated
  --list-blind-spots   print what the check cannot see, one line each
  --json               print findings as JSON
  --help               this text

Config keys (all optional, JSON)
  include        folders to scan               ["app","src","components","lib","pages"]
  exclude        path prefixes to skip          node_modules, .next, public, scripts,
                                                .design-system, .migration, __fixtures__,
                                                skill folders and any folder with a SKILL.md
  tokenSources   files where raw values may sit on custom property lines (--x: #fff)
  uiDir          the component folder           "components/ui", else an installed
                                                system's components/<name>/ui
  examplesDir    the docs' example files, always scanned  a gen-docs.config.json's, else
                                                "docs/system/examples"
  registry       registry file                  "registry.json"
  driftList      TSV: file, status, sha256, note "scripts/ui-drift.tsv"
  allowlist      counted exceptions             "scripts/check-allowlist.json"
  nativeControls {"button":"Button","input":"Input","input:checkbox":"Checkbox",...}
                 default: derived from the ui barrel's and ui files' exports and
                 registry ids. An empty {} counts as unset, never as "off"
  buttonFile     the canonical Button source    default: derived
  buttonSignature, buttonSignatureMin (default 4)  classes that mark a Button copy
  linkComponents ["a","Link"]. System link components (exports ending in Link,
                 such as TextLink) are added for the background-and-padding test
  stockDir       upstream copies of customized ui files  "scripts/ui-stock"
  overlayComponents ["Dialog","Sheet","AlertDialog","Popover","Drawer"]
  varIgnore      custom property prefixes set at runtime by a library, never flagged.
                 --init adds the prefix of each one a dependency's code names
  sharedTokens   :root color tokens meant to hold one value in every theme
  aliases        {"@/": "src/"}                 default: from tsconfig paths
  deprecated     extra deprecated import paths, beside registry "replaces"
  rulesOff       rule ids to skip
  bans           the person's bans, each {"id":"rule/ban-<slug>","pattern":"<regex>","why":"<their words>"},
                 scanned in UI code (comments skipped) and in the banDocs pages. A line
                 holding "Don't:" or the ban's own id describes the ban and passes
  banDocs        folders of Markdown pages the bans also scan  ["docs/system"]
  names          outside product names the shipped docs should not carry, each a
                 string or {"name","why"}. A hit in a banDocs page is a
                 rule/outside-name warning, which never fails the check
  projectLint    "auto": skip the four rules a design lint also enforces
                 (rule/raw-value, rule/palette-use, rule/arbitrary-value,
                 rule/component-override) when the project runs one: an
                 installed design system's <name>.<tool>lint.config.* at the
                 root, or a root lint config that loads a design-system lint.
                 false runs them here anyway, true skips them  "auto"

Allowlist: {"<file>": {"<rule>": {"<literal>": <count>}}}. A count may instead be
{"count": <n>, "removeBy": "YYYY-MM-DD"}. Once the date has passed, every run prints
a warning for that row. It never fails the check.

Raw-value, arbitrary-value and px findings name the nearest token: color tokens for
the property's job (text, background, border) by deltaE OK, lengths by kind
(space, radius, type, size) by distance in px.

Planted cases. A rule the repo adds proves itself the way the built-in ones do: a
folder per rule holding case.json ({"rule": "<id>", "expect": {"<id>": <count>}}),
fail/ with exactly the violations, and pass/ with the nearest correct code. Source
files end in .fixture (list.tsx.fixture), so tsc, lint and the framework never
compile them, and the self-test reads each under its inner name. Keep them in
scripts/fixtures/check-system/ beside the copied script, or pass --fixtures <dir>.
For a one-off proof, plant a violation in a scanned file and run
--files <file> --no-allowlist instead.`;

const RULES = {
  "rule/raw-value": ["Hex, rgb(), hsl() or oklch() outside a token source line, including inside Tailwind arbitrary values", "use a semantic token"],
  "rule/named-color": ["A CSS named color in a style, in any quote style", "use a semantic token (transparent, currentColor and inherit pass)"],
  "rule/arbitrary-value": ["A Tailwind arbitrary value such as p-[13px] or bg-[#0f766e]. A transition property list, a CSS-wide keyword, a grid area name and math built only from tokens and env() pass", "use a scale step or a token utility"],
  "rule/palette-use": ["A Tailwind palette class such as text-gray-500, or var(--color-teal-700). Also bg-white, text-black and the other solid white or black utilities when the theme defines a role for that job: a surface (--background, --card, --popover) for bg, a foreground for text, fill and stroke, a border, input or ring for border, outline and ring. Opacity forms such as bg-black/50 and transparent pass", "use a semantic utility such as text-muted-foreground or bg-background"],
  "rule/doubled-utility": ["A Tailwind v4 utility that repeats its property word, such as text-text-muted, bg-bg-subtle or border-border-strong. It comes from a --color-<role> token whose role starts with text, bg or border", "rename the role so the utility reads once: --color-muted-foreground, --color-fg-muted, --color-edge"],
  "rule/inline-px": ["A px, rem or em length for spacing, radius, size or font size in an inline style", "use a spacing, radius, size or type token or utility"],
  "rule/css-px": ["A px, rem or em length for spacing, radius, type or size in a CSS file, outside a custom property line (0 and 1px pass; rem and em pass in line-height, letter-spacing and viewport math; the touch zoom floor font-size: max(16px, 1em) passes)", "use a spacing, radius, type or size token"],
  "rule/token-parity": ["A var(--x) or @theme reference no CSS file defines, or a color key that :root and a dark theme block do not both define", "define the token, fix the name, or list it in sharedTokens"],
  "trap/native-control": ["A native control where a system component exists", "use the system component"],
  "trap/button-div": ["onClick, onPointerDown or onMouseDown on a non-interactive element or an <a> with no href, or tabIndex with onKeyDown on one. A native <dialog> with onCancel passes (the backdrop click)", "render a <button>, or an <a href> when it navigates. Never move the handler into an effect to hide it from this rule"],
  "trap/role-button": ['role="button" on anything but a <button>', "render the Button, or a link when it navigates"],
  "trap/link-as-button": ["An <a>, Link or system link component styled as a button: copied classes, variant props, or a style or class that sets both a background and padding, token values included", "use the Button's link form (render/asChild or buttonVariants)"],
  "trap/button-clone": ["An element other than a link or <button> carrying the Button's classes or an app-CSS button class", "use the Button"],
  "trap/link-wraps-button": ["An <a>, Link or system link component wrapping a <button> or Button, or a <button> or Button (with no asChild or render) wrapping a link. Two tab stops, two roles, and invalid HTML", "one element: a ButtonLink, Button asChild around the Link, or the Button's styles (buttonVariants) on the Link"],
  "trap/label-unbound": ["A <label> or <Label> with no htmlFor and no control inside it. Clicking it focuses nothing, and a screen reader reads the control with no name. A spread ({...props}) passes", "add htmlFor with the control's id, or wrap the control"],
  "trap/overlay-conditional-render": ["An overlay mounted by a condition, such as {open && <Dialog>}", "keep it mounted and pass open={state}"],
  "trap/loading-label-swap": ["A button whose label is a ternary on a loading state, such as {saving ? \"Saving…\" : \"Save\"}, where the condition is also passed to disabled, loading or aria-busy, or is named like one (saving, pending, loading, submitting). The width shifts and a screen reader hears a new name", "keep the label, and show the Button's loading state: a spinner beside it, aria-busy and a blocked repeat click"],
  "rule/component-override": ["A className or style on a component the registry lists that sets padding, radius, shadow or background: Tailwind utilities, inline style keys, or an app-CSS class whose rule sets one. Layout (margin, width, grid or flex placement) passes", "add the variant or prop the screen needs to the component, such as Card inset, or gate it"],
  "rule/stock-edit": ["A ui file on the drift list (stock, customized or forked) changed since its hash was recorded", "revert it, or review the edit, update the row's status and note, and run --rehash <file> in the same commit"],
  "rule/unregistered-ui": ["A file in the ui folder with no registry entry and no drift-list row", "register it, or move it out of the ui folder"],
  "rule/deprecated-import": ["An import of a component the registry says was replaced", "import the canonical component"],
  "rule/outside-name": ["An outside product name from the config's names list in a shipped docs page. A warning, never a failure", "describe the pattern in this app's own words"],
  "trap/motion-transition-all": ["transition: all, transition-property: all or the transition-all utility, in CSS, a class list or an inline style", "name the properties that move, usually transform and opacity, through a motion preset"],
  "trap/motion-ease-in-enter": ["An entrance eased in: ease-in (or an ease-in cubic-bezier) beside an enter keyframe, an enter class such as animate-in, or an open-state selector. Also a motion component whose initial and animate props run with ease easeIn", "ease entrances out: the enter preset"],
  "trap/motion-overshoot": ["A cubic-bezier() whose second or fourth value is outside 0 to 1, so the motion overshoots and springs back", "a preset whose curve stays inside 0 to 1, unless the motion follows the hand"],
  "trap/hover-unguarded": ["A CSS :hover rule outside @media (hover: hover) that changes display or visibility, or reveals a child, sibling or ::before/::after through opacity. On touch, a tap shows it and leaves it stuck", "wrap the rule in @media (hover: hover), and give the content another way to show on touch"],
  "trap/zoom-disabled": ["user-scalable=no, user-scalable=0 or maximum-scale=1 in the viewport meta, or userScalable: false or maximumScale: 1 in a viewport export", "remove it. Fix input zoom with a 16px input text size"],
  "trap/viewport-height": ["100vh or h-screen (height or max-height) on a shell or sheet, with no dvh or svh value beside it. min-height passes", "use dvh, or svh when the height must not change while scrolling"],
  "trap/touch-autofocus": ["autoFocus or autofocus on a field in a page, outside any dialog, sheet, popover or command menu. A conditional value such as autoFocus={!isTouch} passes", "drop it, or set it only where typing is the one thing to do and the device has a keyboard"],
  "trap/touch-tap-highlight": ["-webkit-tap-highlight-color: transparent in CSS, a class or an inline style, in a repo with no pressed style: no :active rule, no active: class and no data-pressed style", "give every control a pressed state that shows from pointer-down, or keep the system highlight"],
};
// Why each rule matters, for --explain.
const WHY = {
  "rule/raw-value": "A literal color skips the theme, so it breaks in dark mode and drifts from its token when the token changes.",
  "rule/named-color": "A named color is a raw value with a friendlier name. It ignores the theme the same way.",
  "rule/arbitrary-value": "An arbitrary value makes a one-off step the scale never agreed on, and the next screen copies it.",
  "rule/palette-use": "A palette step names a hue, not a job, so a theme or brand change cannot reach it.",
  "rule/doubled-utility": "A token role that repeats its utility's property word reads twice in every class and invites near-duplicate roles.",
  "rule/inline-px": "An inline length skips the scale and the responsive rules the stylesheet holds.",
  "rule/css-px": "A literal length in CSS skips the spacing, radius and type scale, so screens drift apart one pixel at a time.",
  "rule/token-parity": "A token read and never defined falls back to nothing. A color with no dark value shows the light value in dark mode.",
  "trap/native-control": "A native control beside the system's own looks and behaves differently, and misses the fixes the component carries.",
  "trap/button-div": "A div with a click handler takes no keyboard focus, no Enter or Space, and no button role, so keyboard and screen reader users cannot use it.",
  "trap/role-button": "role=button promises the keyboard behavior of a button, which a div does not have unless every key is wired by hand.",
  "trap/link-as-button": "A link dressed as a button copies the button's look and drifts from it, and people expect a button to act, not navigate.",
  "trap/button-clone": "A copy of the Button's classes drifts from the Button and misses its states and fixes.",
  "trap/link-wraps-button": "Two nested interactive elements give two tab stops and two roles for one action, and the HTML is invalid.",
  "trap/label-unbound": "A label tied to nothing focuses nothing on click, and the field has no accessible name.",
  "trap/overlay-conditional-render": "Unmounting an overlay cuts its exit animation and breaks focus return and state.",
  "trap/loading-label-swap": "A label that changes while pending shifts the button's width and gives it a new accessible name mid-action.",
  "rule/component-override": "A visual override at the call site forks the component, so the next change to it misses this screen.",
  "rule/stock-edit": "An unreviewed edit to a stock file is lost or fought at the next upgrade.",
  "rule/unregistered-ui": "A file in the ui folder that nothing registers is a component nobody documents or checks.",
  "rule/deprecated-import": "An import of a replaced component keeps the old look and behavior alive.",
  "rule/outside-name": "Another product's name in the docs reads as a dependency or an endorsement the app does not have.",
  "trap/motion-transition-all": "Every property that changes animates, layout included, so unrelated changes lag and the motion stutters.",
  "trap/motion-ease-in-enter": "Ease-in starts slow, so an entrance feels late exactly when the person is waiting for it.",
  "trap/motion-overshoot": "An overshooting curve bounces past its target, which reads as playful and slows the settle.",
  "trap/hover-unguarded": "Touch screens fire hover on tap, so hover-only content flashes or sticks until the next tap elsewhere.",
  "trap/zoom-disabled": "People with low vision need pinch zoom. WCAG 1.4.4 asks that text resize to 200%.",
  "trap/viewport-height": "100vh is the large viewport on phones, so the bottom of a full-height shell sits under the browser bar.",
  "trap/touch-autofocus": "On a phone, autofocus opens the keyboard over the screen before the person asked to type.",
  "trap/touch-tap-highlight": "With the tap highlight gone and no pressed style, a tap gives no feedback until the action lands.",
};
const whyFor = (rule) => WHY[rule] || "";
// The fix a finding prints. A ban's id is the person's, so it has no RULES row.
const fixFor = (rule) => RULES[rule]?.[1] || (rule.startsWith("rule/ban-") ? "remove it, since the person banned it" : "see the rule's own docs");

const BLIND = [
  "Rendered contrast, including non-text contrast of borders, focus rings and checkbox edges. Measure it in a browser",
  "Behavior: what a click, Enter or Escape does, focus order and focus return, and whether Cancel submits",
  "Layout at each viewport, overflow at 390px and touch target sizes",
  "Visual overrides on components the registry does not list, and overrides built at runtime: cn() branches, spread props, a class name held in a variable",
  "A loading state shown some other way than a label ternary on the button, such as a label read from a variable",
  "Class names and values built at runtime, such as template strings, cn() branches or fontSize: size / 2.5",
  "bg-white and text-black when the theme defines no role for their job, their opacity forms such as bg-black/50, and CSS keywords such as white in var() fallbacks",
  "Files outside the include folders, and ui files missing from the drift list (they are scanned, but no hash guards them)",
  "Whether a token's role comment still matches how the token is used",
  "Rules whose Check: clause is review, a test or a probe, which only those enforce",
  "Motion that is only measured: exit slower than enter, frequent-surface motion, linear easing, press delay, input lag and jank. Easing set in script or through a variable, and hover reveals written as Tailwind classes (v4 guards hover: itself, v3 does not)",
  "Whether a pressed style covers the control whose tap highlight was removed: any pressed style in the repo passes trap/touch-tap-highlight",
];
const NAMED = "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen".split(" ");
const NAMED_RE = new RegExp(`(?<![\\w-])(${NAMED.join("|")})(?![\\w-])`, "i");
const PALETTE = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|taupe|mauve|mist|olive";
const INTERACTIVE = new Set(["button", "input", "select", "textarea", "option", "summary", "details", "label", "video", "audio", "iframe"]);
const CODE_EXT = /\.(tsx|jsx|ts|js|mjs|cjs|vue|svelte|astro)$/;
const JSX_EXT = /\.(tsx|jsx)$/;
const CSS_EXT = /\.(css|scss|sass|less|pcss)$/;
const HTML_EXT = /\.html?$/;
const DEFAULTS = {
  include: ["app", "src", "components", "lib", "pages"],
  exclude: ["node_modules", ".next", ".git", "dist", "build", "out", "coverage", ".design-system", ".migration", ".ui-review", "public", "scripts", ".agents", ".claude", ".cursor", ".codex", "__fixtures__"],
  tokenSources: [],
  uiDir: null,
  registry: "registry.json",
  driftList: "scripts/ui-drift.tsv",
  allowlist: "scripts/check-allowlist.json",
  nativeControls: null,
  buttonFile: null,
  buttonSignature: null,
  buttonSignatureMin: 4,
  linkComponents: ["a", "Link"],
  overlayComponents: ["Dialog", "Sheet", "AlertDialog", "Popover", "Drawer"],
  varIgnore: ["--tw-", "--radix-", "--anchor-", "--available-", "--transform-origin", "--popup-", "--positioner-", "--active-tab-", "--accordion-panel-", "--collapsible-panel-", "--scroll-area-", "--reka-", "--kb-", "--toast-", "--drawer-", "--nested-", "--snap-point-"],
  sharedTokens: [],
  aliases: null,
  deprecated: [],
  rulesOff: [],
  projectLint: "auto",
  bans: [],
  banDocs: ["docs/system"],
  stockDir: "scripts/ui-stock",
};

// ---------- small helpers ----------
const posix = (p) => p.split(sep).join("/");
// JSON with comments and trailing commas (tsconfig), string-aware.
const readJSON = (p) => JSON.parse(lex(readFileSync(p, "utf8"), true).code.replace(/,(\s*[}\]])/g, "$1"));
const sha256 = (p) => createHash("sha256").update(readFileSync(p, "utf8").replace(/\r\n/g, "\n")).digest("hex");
const stripExt = (p) => p.replace(/\.(tsx|jsx|ts|js|mjs|cjs)$/, "").replace(/\/index$/, "");
// Fixtures are stored as <name>.fixture so no compiler sees them. In fixture mode a
// logical path such as ui/button.tsx reads ui/button.tsx.fixture from disk.
const unfix = (name) => name.replace(/\.fixture$/, "");
const phys = (cfg, rel) => (cfg.fixtures && !existsSync(join(cfg.root, rel)) && existsSync(join(cfg.root, rel + ".fixture")) ? rel + ".fixture" : rel);
const readRel = (cfg, rel) => readFileSync(join(cfg.root, phys(cfg, rel)), "utf8");
const existsRel = (cfg, rel) => existsSync(join(cfg.root, phys(cfg, rel)));
const uiEntries = (cfg) => (cfg.uiDir && existsSync(join(cfg.root, cfg.uiDir)) ? readdirSync(join(cfg.root, cfg.uiDir)).map((e) => (cfg.fixtures ? unfix(e) : e)).sort() : []);
const SEGMENT_EXCLUDES = new Set(["node_modules", ".next", ".git", ".design-system", ".migration", ".ui-review", ".agents", ".claude", ".cursor", ".codex", "__fixtures__"]);

// Blank out comments, keep offsets. mask[i] = 1 inside a string or template literal.
function lex(src, js) {
  const out = src.split("");
  const mask = new Uint8Array(src.length);
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "*") {
      const e = src.indexOf("*/", i + 2), end = e < 0 ? n : e + 2;
      for (let k = i; k < end; k++) if (out[k] !== "\n") out[k] = " ";
      i = end; continue;
    }
    if (js && c === "/" && d === "/" && (i === 0 || /[\s;{}(),=]/.test(src[i - 1]))) {
      let e = src.indexOf("\n", i); if (e < 0) e = n;
      for (let k = i; k < e; k++) out[k] = " ";
      i = e; continue;
    }
    if (c === '"' || c === "'" || (js && c === "`")) {
      let k = i + 1;
      while (k < n) {
        if (src[k] === "\\") { k += 2; continue; }
        if (src[k] === c) break;
        if (c !== "`" && src[k] === "\n") break;
        k++;
      }
      for (let j = i; j <= Math.min(k, n - 1); j++) mask[j] = 1;
      i = k + 1; continue;
    }
    i++;
  }
  return { code: out.join(""), mask };
}

function lineIndex(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") starts.push(i + 1);
  return (pos) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; } return lo + 1; };
}

// Skip a balanced {...} starting at code[k] === "{". Returns index after the closing brace, or -1.
function skipBraces(code, k) {
  let depth = 0;
  for (let i = k; i < code.length; i++) {
    const c = code[i];
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < code.length && code[j] !== c) { if (code[j] === "\\") j++; if (c !== "`" && code[j] === "\n") break; j++; }
      i = j; continue;
    }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return i + 1; }
  }
  return -1;
}

const KEYWORDS = new Set(["return", "yield", "default", "case", "else", "do", "in", "of", "await", "typeof", "void"]);
// Find every JSX opening tag with its attributes.
function jsxTags(code, mask) {
  const tags = [];
  for (let i = 0; i < code.length; i++) {
    if (code[i] !== "<" || mask[i] || !/[A-Za-z]/.test(code[i + 1] || "")) continue;
    let p = i - 1;
    while (p >= 0 && /\s/.test(code[p])) p--;
    if (p >= 0 && /[\w$)\].]/.test(code[p])) {
      let w = p; while (w >= 0 && /[\w$]/.test(code[w])) w--;
      if (!KEYWORDS.has(code.slice(w + 1, p + 1))) continue;
    }
    const nm = /^[A-Za-z][\w.:-]*/.exec(code.slice(i + 1, i + 200));
    if (!nm) continue;
    let k = i + 1 + nm[0].length;
    const attrs = [];
    let ok = false;
    while (k < code.length) {
      while (/\s/.test(code[k])) k++;
      if (code[k] === "/" && code[k + 1] === ">") { k += 2; ok = true; break; }
      if (code[k] === ">") { k += 1; ok = true; break; }
      if (code[k] === "{") { const e = skipBraces(code, k); if (e < 0) break; attrs.push({ name: "...", value: code.slice(k + 1, e - 1), expr: true, pos: k }); k = e; continue; }
      const an = /^[A-Za-z_$][\w:.$-]*/.exec(code.slice(k, k + 100));
      if (!an) break;
      const pos = k;
      k += an[0].length;
      while (/\s/.test(code[k])) k++;
      if (code[k] !== "=") { attrs.push({ name: an[0], value: true, pos }); continue; }
      k++;
      while (/\s/.test(code[k])) k++;
      const q = code[k];
      if (q === '"' || q === "'") {
        const e = code.indexOf(q, k + 1); if (e < 0) break;
        attrs.push({ name: an[0], value: code.slice(k + 1, e), expr: false, pos }); k = e + 1;
      } else if (q === "{") {
        const e = skipBraces(code, k); if (e < 0) break;
        attrs.push({ name: an[0], value: code.slice(k + 1, e - 1), expr: true, pos }); k = e;
      } else break;
    }
    if (ok) tags.push({ name: nm[0], attrs, pos: i, end: k });
  }
  return tags;
}

const attr = (tag, name) => tag.attrs.find((a) => a.name === name);
// Where an opening tag's element ends: the index of its matching </Name>, or -1 when it closes itself or never closes.
function closingTag(code, tags, t) {
  if (code.slice(t.end - 2, t.end) === "/>") return -1;
  const esc = t.name.replace(/[.$]/g, "\\$&");
  const events = tags.filter((u) => u.name === t.name && u.pos > t.pos && code.slice(u.end - 2, u.end) !== "/>").map((u) => [u.pos, 1]);
  for (const m of code.slice(t.end).matchAll(new RegExp(`</${esc}\\s*>`, "g"))) events.push([t.end + m.index, -1]);
  events.sort((a, b) => a[0] - b[0]);
  let depth = 1;
  for (const [pos, d] of events) { depth += d; if (!depth) return pos; }
  return -1;
}
const literalOf = (a) => {
  if (!a) return null;
  if (!a.expr) return a.value;
  const m = /^\s*(["'`])([^"'`]*)\1\s*$/.exec(a.value);
  return m ? m[2] : null;
};
const classTokens = (a) => {
  if (!a) return [];
  if (!a.expr) return a.value.split(/\s+/).filter(Boolean);
  const out = [];
  for (const m of a.value.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) out.push(...m[2].split(/\s+/).filter(Boolean));
  return out;
};

// ---------- config ----------
function loadConfig(root, file, override) {
  const cfgPath = resolve(root, file || "scripts/check-system.config.json");
  let user = {};
  if (existsSync(cfgPath)) {
    try { user = readJSON(cfgPath); } catch (e) { console.error(`check-system: cannot parse ${cfgPath}: ${e.message}`); process.exit(2); }
  } else if (file) { console.error(`check-system: config not found: ${cfgPath}`); process.exit(2); }
  const cfg = { ...DEFAULTS, ...user, ...(override || {}) };
  cfg.root = root;
  cfg.varIgnore = [...DEFAULTS.varIgnore, ...(user.varIgnore || []), ...((override || {}).varIgnore || [])];
  // A namespaced registry install (shadcn, from a system registry) puts a system's primitives in components/<name>/ui
  // and its lint plugin in lib/<name>/lint. The plugin's messages quote the values it forbids, so it is not scanned.
  const systems = [...installedSystems(cfg)].sort();
  if (!cfg.uiDir) cfg.uiDir = [...UI_DIRS, ...systems.flatMap((n) => [`components/${n}/ui`, `src/components/${n}/ui`])].find((d) => existsSync(join(root, d))) || null;
  cfg.installedUi = !!cfg.uiDir && systems.some((n) => [`components/${n}/ui`, `src/components/${n}/ui`].includes(posix(cfg.uiDir)));
  cfg.exclude = [...cfg.exclude, ...systems.flatMap((n) => [`lib/${n}/lint`, `src/lib/${n}/lint`]).filter((d) => existsSync(join(root, d)) && !cfg.exclude.includes(d))];
  cfg.aliases = cfg.aliases || tsAliases(root);
  // The docs' example files are product code a reader copies, so the scan covers them: examplesDir from the config,
  // else from scripts/gen-docs.config.json, else docs/system/examples.
  let gd = {};
  try { gd = readJSON(join(root, "scripts/gen-docs.config.json")); } catch {}
  cfg.examplesDir = posix(cfg.examplesDir || gd.examplesDir || "docs/system/examples").replace(/^\.\//, "").replace(/\/+$/, "");
  const inc = cfg.include.map((d) => posix(d).replace(/^\.\//, "").replace(/\/+$/, ""));
  if (existsSync(join(root, cfg.examplesDir)) && !inc.some((d) => d === "." || d === "" || cfg.examplesDir === d || cfg.examplesDir.startsWith(d + "/"))) cfg.include = [...cfg.include, cfg.examplesDir];
  // registry
  cfg.registered = new Set();
  cfg.replaces = new Set((cfg.deprecated || []).map(stripExt));
  const ids = [];
  const regPath = cfg.registry && join(root, cfg.registry);
  if (regPath && existsSync(regPath)) {
    let reg;
    try { reg = readJSON(regPath); } catch (e) { console.error(`check-system: cannot parse ${regPath}: ${e.message}`); process.exit(2); }
    for (const it of [...(reg.components || []), ...(reg.items || [])]) {
      const meta = it.meta || {};
      for (const s of [it.source, meta.source, ...(it.files || []).map((f) => (typeof f === "string" ? f : f.path))]) if (s) cfg.registered.add(posix(s).replace(/^\.\//, ""));
      for (const r of [...(it.replaces || []), ...(meta.replaces || [])]) cfg.replaces.add(stripExt(posix(r)));
      ids.push(String(it.id || it.name || "").toLowerCase());
    }
  }
  // Component names the registry lists: its ids and names in PascalCase, plus what its source files export.
  cfg.registryIds = ids.filter(Boolean);
  // drift list
  cfg.drift = new Map();
  const dPath = cfg.driftList && join(root, cfg.driftList);
  if (dPath && existsSync(dPath)) {
    readFileSync(dPath, "utf8").split("\n").forEach((l, i) => {
      if (!l.trim() || l.startsWith("#")) return;
      const [f, status, hash, note] = l.split("\t");
      if (i === 0 && /^file$/i.test(f)) return;
      cfg.drift.set(posix(f.trim()), { status: (status || "").trim(), hash: (hash || "").trim(), note, line: i + 1 });
    });
  }
  // native controls and button. An empty object is not a way to turn the rule off (rulesOff is), so it counts as unset.
  cfg.notes = [];
  if (cfg.nativeControls && typeof cfg.nativeControls === "object" && !Object.keys(cfg.nativeControls).length) {
    cfg.notes.push("nativeControls is {} in the config, which would silently turn trap/native-control off. It is treated as unset and derived. Delete the key, or list the rule in rulesOff to turn it off");
    cfg.nativeControls = null;
  }
  const exported = uiExports(cfg);
  cfg.registryComponents = registryComponents(cfg);
  cfg.systemLinks = [...exported].filter((n) => /^[A-Z]\w*Link$/.test(n) && n !== "Link");
  if (!cfg.nativeControls) cfg.nativeControls = deriveNativeControls(exported, ids);
  if (!cfg.buttonFile && cfg.uiDir) {
    const e = uiEntries(cfg).find((x) => /^button\.(tsx|jsx)$/i.test(x));
    const f = e ? join(cfg.uiDir, e) : null;
    if (f) cfg.buttonFile = posix(f);
  }
  if (!cfg.buttonSignature && cfg.buttonFile && existsRel(cfg, cfg.buttonFile)) {
    const src = lex(readRel(cfg, cfg.buttonFile), true).code;
    const toks = new Set();
    for (const m of src.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) for (const t of m[2].split(/\s+/)) if (/^[!a-z0-9[\]&_:/.%()=,*'-]+$/i.test(t) && t.length > 1 && !t.includes("${")) toks.add(t);
    cfg.buttonSignature = [...toks];
  }
  cfg.buttonSignature = cfg.buttonSignature || [];
  cfg.off = new Set(cfg.rulesOff || []);
  // A design lint the project runs owns raw values, arbitrary values and restyled components, so the overlapping
  // rules run once, there, and the output says which config they deferred to.
  const lint = cfg.projectLint === false ? null : cfg.projectLint === true ? "the config's projectLint" : projectLintSource(cfg);
  if (lint) {
    for (const r of PROJECT_LINT_RULES) cfg.off.add(r);
    cfg.notes.push(`${lint} runs a design lint, so ${PROJECT_LINT_RULES.join(", ")} are skipped here. Run the project's lint first, since it owns them. Set "projectLint": false in the config to run them here too`);
  }
  return cfg;
}

const UI_DIRS = ["components/ui", "src/components/ui", "src/ui", "ui"];
const PROJECT_LINT_RULES = ["rule/raw-value", "rule/palette-use", "rule/arbitrary-value", "rule/component-override"];
// A linter's config at the root, by name shape: <tool>lint.config.<js|ts>, or a .<tool>lintrc file.
const LINT_CONFIG = /^(?:[a-z]*lint\.config\.[cm]?[jt]s|\.[a-z]*lintrc(?:\.(?:[cm]?js|json|ya?ml))?)$/i;
const SYSTEM_LINT_CONFIG = /^([a-z0-9][\w-]*)\.[a-z]*lint\.config\.[cm]?[jt]s$/i;

// Design systems installed in the project: a folder in components/ (or src/components/), or a skill in
// .claude/skills/<name>/ or .agents/skills/<name>/, as a registry install leaves them.
function installedSystems(cfg) {
  const names = new Set();
  const list = (rel) => (existsSync(join(cfg.root, rel)) && statSync(join(cfg.root, rel)).isDirectory() ? readdirSync(join(cfg.root, rel)) : []);
  for (const dir of ["components", "src/components"]) for (const e of list(dir)) if (statSync(join(cfg.root, dir, e)).isDirectory()) names.add(e);
  for (const dir of [".claude/skills", ".agents/skills"]) for (const e of list(dir)) if (existsRel(cfg, `${dir}/${e}/SKILL.md`)) names.add(e);
  return names;
}

// Where the project runs a design lint, as the file that turns it on, or null. Either an installed system's own
// lint config at the root (<name>.<tool>lint.config.mjs beside components/<name>/), or the project's own lint
// config loading one: an installed system's config or its lint plugin (lib/<name>/lint/), or a package named for
// design-system linting.
function projectLintSource(cfg) {
  const systems = installedSystems(cfg);
  for (const e of readdirSync(cfg.root).map((x) => (cfg.fixtures ? unfix(x) : x)).sort()) {
    const m = SYSTEM_LINT_CONFIG.exec(e);
    if (m && systems.has(m[1])) return `${e} (${m[1]}'s lint)`;
  }
  const loads = (text) => [...systems].some((n) => new RegExp(`(?:^|[/"'\\s])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.[a-z]*lint\\.config`).test(text) || text.includes(`/${n}/lint/`)) || /design[-_]?system[\w@/.-]*lint|lint[\w@/.-]*design[-_]?system/i.test(text);
  const root = readdirSync(cfg.root).map((x) => (cfg.fixtures ? unfix(x) : x)).sort();
  for (const f of root.filter((x) => LINT_CONFIG.test(x) && !SYSTEM_LINT_CONFIG.test(x))) if (existsRel(cfg, f) && statSync(join(cfg.root, phys(cfg, f))).isFile() && loads(readRel(cfg, f))) return f;
  return null;
}

// Component names the system exports: the ui barrel (index.ts and friends), every file directly in the ui folder,
// and registry sources. `export * from "./x"` in the barrel is covered because ./x is read too.
function uiExports(cfg) {
  const names = new Set();
  const files = new Set();
  if (cfg.uiDir) for (const e of uiEntries(cfg)) if (/\.(tsx|jsx|ts|js)$/.test(e) && !/\.(test|spec|stories)\./.test(e)) files.add(`${posix(cfg.uiDir)}/${e}`);
  for (const r of cfg.registered) if (/\.(tsx|jsx|ts|js)$/.test(r)) files.add(r);
  for (const rel of files) {
    if (!existsRel(cfg, rel) || statSync(join(cfg.root, phys(cfg, rel))).isDirectory()) continue;
    const code = lex(readRel(cfg, rel), true).code;
    for (const m of code.matchAll(/\bexport\s+(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
    for (const m of code.matchAll(/\bexport\s*\{([^}]*)\}/g)) for (const part of m[1].split(",")) {
      const nm = /(?:^|\s)(?:type\s+)?([\w$]+)\s*(?:as\s+([\w$]+))?\s*$/.exec(part.trim());
      if (nm && !/^\s*type\s/.test(part)) names.add(nm[2] || nm[1]);
    }
  }
  names.delete("default");
  return names;
}

// The registry's component list: PascalCase ids and names, and the capitalized exports of registered source files.
function registryComponents(cfg) {
  const out = new Set();
  const pascal = (x) => x.replace(/(^|[-_ /])(\w)/g, (_, __, c) => c.toUpperCase());
  for (const id of cfg.registryIds || []) if (/^[a-z][\w-]*$/i.test(id)) out.add(pascal(id));
  for (const rel of cfg.registered) {
    if (!/\.(tsx|jsx)$/.test(rel) || !existsRel(cfg, rel) || statSync(join(cfg.root, phys(cfg, rel))).isDirectory()) continue;
    const code = lex(readRel(cfg, rel), true).code;
    for (const m of code.matchAll(/\bexport\s+(?:default\s+)?(?:function|const|let|class)\s+([A-Z][\w$]*)/g)) out.add(m[1]);
    for (const m of code.matchAll(/\bexport\s*\{([^}]*)\}/g)) for (const part of m[1].split(",")) { const nm = /([A-Z][\w$]*)\s*$/.exec(part.trim()); if (nm && !/^\s*type\s/.test(part)) out.add(nm[1]); }
  }
  return out;
}

// Native tag -> system component, from real export names, so a finding names the component to use.
const NATIVE_CANDIDATES = {
  button: ["Button"],
  input: ["Input", "TextInput", "TextField"],
  select: ["Select", "NativeSelect"],
  textarea: ["Textarea", "TextArea"],
  dialog: ["Dialog", "Modal"],
  "input:checkbox": ["Checkbox"],
  "input:radio": ["RadioGroup", "Radio"],
};
function deriveNativeControls(exported, ids) {
  const out = {};
  const pascal = (s) => s.replace(/(^|[-_ ])(\w)/g, (_, __, c) => c.toUpperCase());
  const idSet = new Set(ids.map((i) => i.toLowerCase().replace(/[-_ ]/g, "")));
  for (const [tag, cands] of Object.entries(NATIVE_CANDIDATES)) {
    const hit = cands.find((c) => exported.has(c)) || cands.find((c) => idSet.has(c.toLowerCase()));
    if (hit) out[tag] = exported.has(hit) ? hit : pascal(hit);
  }
  return out;
}

function tsAliases(root) {
  for (const f of ["tsconfig.json", "jsconfig.json"]) {
    const p = join(root, f);
    if (!existsSync(p)) continue;
    try {
      const paths = readJSON(p).compilerOptions?.paths || {};
      const out = {};
      for (const [k, v] of Object.entries(paths)) if (k.endsWith("/*") && v[0]) out[k.slice(0, -1)] = posix(v[0]).replace(/^\.\//, "").replace(/\*$/, "");
      if (Object.keys(out).length) return out;
    } catch {}
  }
  return { "@/": "" };
}

// ---------- motion, touch and viewport traps ----------
const CUBIC = /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/g;
// ease-in, or a cubic-bezier that starts slow and ends straight (ease-in-out ends eased, so it passes).
const easeIn = (v) => /(?<![\w-])ease-in(?![\w-])/.test(v) || [...String(v).matchAll(CUBIC)].some((m) => +m[1] >= 0.3 && +m[2] <= 0.1 && +m[3] >= 0.8 && +m[4] >= 0.8);
const ENTER_NAME = /(?:^|[-_])(?:in|enter|entering|appear|show|open|reveal)(?:$|[-_])|(?:fade|slide|zoom|scale|pop|grow|drop|rise|blur)-?in(?![a-z])|enter|appear|reveal/i;
const ENTER_SEL = /\[data-(?:state|status)\s*=\s*["']?(?:open|entering|entered|visible|shown)\b|\[data-(?:enter|entering|entered|open|starting-style|show|visible)\b|[-_](?:enter|appear)(?:-(?:active|to|done))?\b|\.(?:enter|entering|appear|is-open|is-visible|open|show)\b|:popover-open|\[open\]/;
const TIMING_WORD = /^(?:ease(?:-in|-out|-in-out)?|linear|step-start|step-end|infinite|alternate(?:-reverse)?|reverse|normal|forwards|backwards|both|none|running|paused|initial|inherit|[-\d.(]|cubic-bezier|steps|linear\().*$|^[\d.]+\)?$/;
const animNames = (v) => String(v).split(/[\s,]+/).filter((n) => n && !TIMING_WORD.test(n));
const ENTER_CLASS = /^(?:animate-in|fade-in(?:-\d+)?|zoom-in(?:-\d+)?|spin-in(?:-\d+)?|slide-in-from-[\w-]+|animate-[\w-]*?(?:-in|enter|appear)(?:-[\w-]*)?)$/;
const OPEN_VARIANT = /(?:^|:)(?:data-\[state=open\]|data-open|open|group-data-\[state=open\]|starting|data-\[entering\]|data-entering|data-\[starting-style\]|data-starting-style):/;
const NO_TAP = /^(?:transparent|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)|#0000(?:0000)?|hsla?\([^)]*[,/]\s*0\s*\))$/i;
const OVERLAY_FILE = /(?:dialog|modal|sheet|drawer|popover|command|palette|lightbox|overlay)[^/]*$/i;
const vh100 = (v) => /(?<![\d.])100vh\b/.test(v);
const overshoot = (m) => [+m[2], +m[4]].some((y) => y < 0 || y > 1);
const utilOf = (tok) => tok.replace(/^(?:[^:\s]*?\[[^\]]*\][^:\s]*:|[a-z0-9@/-]+:)+/, "").replace(/^!/, "");

// Zoom and autofocus in markup: HTML pages, and templates in .vue, .svelte and .astro files.
function markupTraps(cfg, rel, code, inStr, hit, autofocus = true) {
  for (const m of code.matchAll(/user-scalable\s*=\s*(?:no|0)\b|maximum-scale\s*=\s*1(?:\.0*)?(?![\d.])/gi)) if (inStr(m.index)) hit(m.index, "trap/zoom-disabled", m[0]);
  if (!autofocus || OVERLAY_FILE.test(rel)) return;
  for (const m of code.matchAll(/<(input|textarea|select)\b[^>]*?\sautofocus\b/gi)) if (!/<dialog\b[^>]*>(?![\s\S]*<\/dialog>)/i.test(code.slice(0, m.index)) && !/type\s*=\s*["']?(?:checkbox|radio|button|submit|reset|hidden|range|color|file)\b/i.test(m[0])) hit(m.index, "trap/touch-autofocus", `<${m[1]} autofocus>`);
}

// The CSS side: transition all, overshoot, eased-in entrances, unguarded hover reveals, 100vh and the tap highlight.
function cssMotionTraps(cfg, code, hit) {
  const blocks = cssBlocks(code);
  const enterKf = new Set();
  for (const b of blocks) {
    const kf = b.chain.map((p) => /^@(?:-webkit-)?keyframes\s+([\w-]+)/.exec(p)).find(Boolean);
    if (!kf) continue;
    if (ENTER_NAME.test(kf[1])) enterKf.add(kf[1]);
    if (/^(?:from|0%)$/.test(b.prelude) && b.decls.some((d) => (d.prop === "opacity" && /^0(?:\.0*)?$/.test(d.value)) || (d.prop === "transform" && /scale\(0?\.\d|translate/.test(d.value)))) enterKf.add(kf[1]);
  }
  const enterName = (n) => enterKf.has(n) || ENTER_NAME.test(n);
  for (const b of blocks) {
    if (b.chain.some((p) => /^@(?:-webkit-)?keyframes/.test(p))) continue;
    const decl = (re) => b.decls.filter((d) => re.test(d.prop));
    for (const d of decl(/^transition(?:-property)?$/)) if (/(?:^|,)\s*all\b/.test(d.value)) hit(d.pos, "trap/motion-transition-all", `${d.prop}: ${d.value}`);
    // An entrance eased in: an enter animation with ease-in, or a transition with ease-in in an open or enter state.
    const anim = decl(/^animation$/), names = decl(/^animation-name$/).map((d) => d.value), timing = decl(/^animation-timing-function$/).map((d) => d.value).join(" ");
    for (const d of anim) { const ns = animNames(d.value); if (ns.some(enterName) && (easeIn(d.value) || easeIn(timing))) hit(d.pos, "trap/motion-ease-in-enter", `animation: ${d.value}`); }
    if (!anim.length && names.some((v) => animNames(v).some(enterName)) && easeIn(timing)) hit(b.pos, "trap/motion-ease-in-enter", `animation-name: ${names.join(", ")}; animation-timing-function: ${timing}`);
    if (ENTER_SEL.test(b.prelude) || b.chain.some((p) => /^@starting-style/.test(p))) for (const d of decl(/^transition(?:-timing-function)?$/)) if (easeIn(d.value)) hit(d.pos, "trap/motion-ease-in-enter", `${b.prelude} { ${d.prop}: ${d.value} }`);
    // Hover that reveals or hides, outside a hover media query.
    if (/:hover\b/.test(b.prelude) && !b.chain.some((p) => /^@media[^{]*\((?:any-)?hover\s*:\s*(?:hover|none)\s*\)|^@media[^{]*\((?:any-)?pointer\s*:\s*fine\s*\)/.test(p))) {
      const reveal = b.prelude.split(",").some((sel) => { const i = sel.indexOf(":hover"); return i >= 0 && /^(?::[\w-]+(?:\([^)]*\))?)*(?:\s+|\s*[>+~]\s*|::?(?:before|after))\S?/.test(sel.slice(i + 6)) && sel.slice(i + 6).trim() !== ""; });
      const d = b.decls.find((x) => /^(?:display|visibility)$/.test(x.prop) || (reveal && x.prop === "opacity"));
      if (d) hit(d.pos, "trap/hover-unguarded", `${b.prelude.replace(/\s+/g, " ")} { ${d.prop}: ${d.value} }`);
    }
    for (const prop of ["height", "max-height"]) {
      const ds = decl(new RegExp(`^${prop}$`));
      const bad = ds.find((d) => vh100(d.value)), fix = ds.some((d) => /\d[dsl]vh\b|fill-available|-moz-available|stretch/.test(d.value));
      if (bad && !fix) hit(bad.pos, "trap/viewport-height", `${prop}: ${bad.value}`);
    }
    if (!cfg.hasPress) for (const d of decl(/^-webkit-tap-highlight-color$/)) if (NO_TAP.test(d.value)) hit(d.pos, "trap/touch-tap-highlight", `-webkit-tap-highlight-color: ${d.value}, and the repo has no pressed style`);
  }
}

// The code side: class lists and CSS in strings, and style objects.
function jsMotionTraps(cfg, rel, code, mask, hit) {
  const markup = /\.(vue|svelte|astro)$/.test(rel);
  markupTraps(cfg, rel, code, (i) => mask[i] || markup, hit, markup);
  for (const m of code.matchAll(/(?<![\w$])(userScalable\s*:\s*(?:false|0|["'`]no["'`])|maximumScale\s*:\s*1(?:\.0*)?(?![\d.]))/g)) if (!mask[m.index]) hit(m.index, "trap/zoom-disabled", m[1]);
  for (const m of code.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    if (!mask[m.index]) continue;
    const text = m[2], at = m.index + 1;
    const toks = [...text.matchAll(/\S+/g)].map((t) => ({ t: t[0], u: utilOf(t[0]), pos: at + t.index }));
    for (const x of toks) if (x.u === "transition-all") hit(x.pos, "trap/motion-transition-all", x.t);
    // Tailwind: ease-in in an open state, or bare ease-in beside an enter class.
    const enter = toks.some((x) => ENTER_CLASS.test(x.u) && !/(?:closed|exit|leav)/.test(x.t));
    for (const x of toks) if (x.u === "ease-in" && !/(?:closed|exit|leav)/.test(x.t) && (OPEN_VARIANT.test(x.t) || (enter && x.t === x.u))) hit(x.pos, "trap/motion-ease-in-enter", `${x.t} beside ${toks.find((y) => ENTER_CLASS.test(y.u))?.t || "an open state"}`);
    const dyn = toks.some((x) => /^(?:max-)?h-(?:dvh|svh|lvh|\[\d+[dsl]vh\])$/.test(x.u));
    for (const x of toks) if (/^(?:max-)?h-(?:screen|\[[^\]]*(?<![\d.])100vh[^\]]*\])$/.test(x.u) && !dyn) hit(x.pos, "trap/viewport-height", x.t);
    if (!cfg.hasPress) for (const x of toks) if (/^\[-webkit-tap-highlight-color:(?:transparent|rgba\(0,0,0,0\))\]$/.test(x.u)) hit(x.pos, "trap/touch-tap-highlight", `${x.t}, and the repo has no pressed style`);
    // CSS written in a string, such as a styled-components template.
    for (const c of text.matchAll(/(?<![\w-])transition(?:-property)?\s*:\s*all\b/g)) hit(at + c.index, "trap/motion-transition-all", c[0]);
    for (const c of text.matchAll(/(?<![\w-])(?:max-)?height\s*:\s*[^;"'`]*?(?<![\d.])100vh\b/g)) if (!/\d[dsl]vh\b/.test(text)) hit(at + c.index, "trap/viewport-height", c[0]);
    if (!cfg.hasPress) for (const c of text.matchAll(/(?<!\[)-webkit-tap-highlight-color\s*:\s*(transparent|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\))/g)) hit(at + c.index, "trap/touch-tap-highlight", `${c[0]}, and the repo has no pressed style`);
    for (const c of text.matchAll(/(?<![\w-])animation\s*:\s*([^;"'`]*)/g)) if (easeIn(c[1]) && animNames(c[1]).some((n) => ENTER_NAME.test(n))) hit(at + c.index, "trap/motion-ease-in-enter", c[0].trim());
  }
  // Style objects: the key sits outside the string.
  const obj = (re, rule, detail) => { for (const m of code.matchAll(re)) if (!mask[m.index]) hit(m.index, rule, detail(m)); };
  obj(/(?<![\w$-])transition(?:Property)?\s*:\s*(["'`])\s*all\b[^"'`]*\1/g, "trap/motion-transition-all", (m) => m[0]);
  obj(/(?<![\w$-])(?:height|maxHeight)\s*:\s*(["'`])[^"'`]*?(?<![\d.])100vh[^"'`]*\1/g, "trap/viewport-height", (m) => m[0]);
  if (!cfg.hasPress) obj(/(?<![\w$-])WebkitTapHighlightColor\s*:\s*(["'`])\s*(?:transparent|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\))\s*\1/g, "trap/touch-tap-highlight", (m) => `${m[0]}, and the repo has no pressed style`);
  for (const m of code.matchAll(/(?<![\w$-])animation\s*:\s*(["'`])([^"'`]*)\1/g)) if (!mask[m.index] && easeIn(m[2]) && animNames(m[2]).some((n) => ENTER_NAME.test(n))) hit(m.index, "trap/motion-ease-in-enter", m[0]);
  // Overshoot in a motion library's ease array.
  for (const m of code.matchAll(/(?<![\w$])ease\s*:\s*\[\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\]/g)) if (!mask[m.index] && [+m[2], +m[4]].some((y) => y < 0 || y > 1)) hit(m.index, "trap/motion-overshoot", m[0]);
}

// ---------- nearest token ----------
// A raw value's nearest token, chosen by the job of the property it sits on and then by distance: color tokens by
// deltaE OK (oklch.mjs), lengths by px. Token values come from the repo's own CSS, light and :root blocks only.
const PALETTE_TOKEN = new RegExp(`^--(?:color-)?(?:${PALETTE})-\\d+$`);
const hsl2rgb = (h, s, l) => { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return [0, 8, 4].map((n) => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))); };
function colorLab(v, vars, depth = 0) {
  v = String(v).trim().toLowerCase();
  const ref = /^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/.exec(v);
  if (ref) return depth < 6 && vars.has(ref[1]) ? colorLab(vars.get(ref[1]), vars, depth + 1) : null;
  if (!oklch) return null;
  let m;
  if ((m = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)(%?)\s+([\d.]+|none)(?:deg)?\s*(?:\/[^)]*)?\)$/.exec(v))) {
    const L = m[2] ? m[1] / 100 : +m[1], C = m[4] ? (m[3] / 100) * 0.4 : +m[3], H = m[5] === "none" ? 0 : (m[5] * Math.PI) / 180;
    return [L, C * Math.cos(H), C * Math.sin(H)];
  }
  if ((m = /^(?:hsla?\()?\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*(?:[,/][^)]*)?\)?$/.exec(v))) return oklch.toOklab(hsl2rgb(((+m[1] % 360) + 360) % 360, +m[2], +m[3]));
  const rgb = oklch.parse(v);
  return rgb ? oklch.toOklab(rgb) : null;
}
const toPx = (v) => { const m = /(-?\d*\.?\d+)(px|r?em)?\b/.exec(String(v)); return m ? Number(m[1]) * (m[2] && m[2] !== "px" ? 16 : 1) : null; };
// The job a property or Tailwind utility does: a color's purpose (fg, bg, border) or a length's kind.
function propJob(p) {
  p = String(p || "").replace(/^(?:[a-z0-9-]+:)+/, "").replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()).replace(/^-/, "");
  if (/^(?:background|bg|from|via|to)(?:-|$)/.test(p)) return { color: "bg" };
  if (/^(?:border|outline|ring|divide|column-rule)(?:-|$)/.test(p) && !/radius/.test(p)) return { color: "border", length: "size" };
  if (/^(?:color|text|fill|stroke|caret|decoration|text-decoration|placeholder|accent)(?:-color)?$/.test(p)) return { color: "fg", length: "type" };
  if (/radius|^rounded/.test(p)) return { length: "radius" };
  if (/^font-size$/.test(p)) return { length: "type" };
  if (/^(?:margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left|scroll-(?:margin|padding)|space|[pm][xytrblse]?)(?:-|$)/.test(p)) return { length: "space" };
  if (/^(?:(?:min-|max-)?(?:width|height|[wh])|size|flex-basis|basis)(?:-|$)/.test(p)) return { length: "size" };
  return {};
}
const COLOR_PURPOSE = { bg: /(?:^|-)(?:bg|background|surface|card|popover|panel|canvas|base|muted|secondary|accent|primary|destructive|fill)(?:$|-(?!foreground|fg))/, fg: /foreground|(?:^|-)(?:fg|text|ink|content|icon)(?:$|-)/, border: /border|edge|ring|outline|divider|separator|stroke|input/ };
const LENGTH_KIND = { radius: /radius|rounded/, type: /^--(?:text|font-size|fs|type)-|font-size/, space: /space|spacing|gap|gutter|inset|pad|margin|^--[pms]-\d/, size: /size|height|width|control|^--[hw]-/ };
function tokenIndex(cfg) {
  if (cfg._tokenIndex) return cfg._tokenIndex;
  const vars = cfg.tokenValues || new Map(), colors = [], lengths = [];
  for (const [name, v] of vars) {
    if (PALETTE_TOKEN.test(name) || cfg.varIgnore.some((x) => name.startsWith(x))) continue;
    const bare = name.replace(/^--color-/, "--");
    const lab = colorLab(v, vars);
    if (lab) { colors.push({ name, lab, purpose: Object.keys(COLOR_PURPOSE).filter((k) => COLOR_PURPOSE[k].test(bare)) }); continue; }
    if (/^-?\d*\.?\d+(px|r?em)$/.test(v.trim()) && !/leading|tracking|line-height|letter/.test(name)) {
      const kind = Object.keys(LENGTH_KIND).find((k) => LENGTH_KIND[k].test(name));
      if (kind) lengths.push({ name, px: toPx(v), kind });
    }
  }
  return (cfg._tokenIndex = { vars, colors, lengths });
}
// "--name (deltaE 1.2)" or "--name (12px)", or null when no token of that job exists.
function nearestToken(cfg, prop, value) {
  const idx = tokenIndex(cfg), job = propJob(prop);
  const lab = colorLab(value, idx.vars);
  if (lab) {
    if (!idx.colors.length) return null;
    const own = idx.colors.filter((c) => job.color && c.purpose.includes(job.color));
    const best = (own.length ? own : idx.colors).map((c) => [c, 100 * Math.hypot(c.lab[0] - lab[0], c.lab[1] - lab[1], c.lab[2] - lab[2])]).sort((a, b) => a[1] - b[1] || (a[0].name < b[0].name ? -1 : 1))[0];
    return `${best[0].name} (deltaE ${best[1].toFixed(1)})`;
  }
  const px = toPx(value);
  if (px === null || !job.length) return null;
  const own = idx.lengths.filter((l) => l.kind === job.length);
  if (!own.length) return null;
  const best = own.map((l) => [l, Math.abs(l.px - Math.abs(px))]).sort((a, b) => a[1] - b[1] || (a[0].name < b[0].name ? -1 : 1))[0][0];
  return `${best.name} (${+best.px.toFixed(2)}px)`;
}
// The property a literal at code[i] sits on: a Tailwind utility "bg-[", or a declaration or style key "color: ".
function ctxProp(code, i) {
  const before = code.slice(Math.max(0, i - 80), i);
  const u = /([a-z][\w-]*)-\[$/.exec(before);
  if (u) return u[1];
  const d = /([A-Za-z][\w-]*)\s*:\s*["'`]?[^;{}"'`:]*$/.exec(before);
  return d ? d[1] : "";
}
const shown = (f) => f.detail + (f.nearest ? ` (nearest token ${f.nearest})` : "");

// ---------- the scan ----------
const GENERIC = /^((inline-)?flex|grid|block|relative|items-.*|justify-.*|gap-.*|shrink.*|grow.*|whitespace-.*|transition.*|outline-none|select-none|text-(xs|sm|base|lg)|font-(normal|medium)|underline.*|hover:underline|w-.*|truncate|sr-only|group(\/.*)?)$/;

// A line of a customized ui file that is identical (whitespace aside) to a line of upstream's copy is upstream's.
const normLine = (l) => l.trim().replace(/\s+/g, " ");
// Arbitrary values that pick no step off a scale, so rule/arbitrary-value passes them: a transition's property list
// (what trap/motion-transition-all asks for), a CSS-wide keyword, a grid area or line name, and math built only from
// tokens, env(), unitless numbers, % and viewport units, such as calc(var(--header)+env(safe-area-inset-top)).
const CSS_WIDE = /^(?:inherit|initial|unset|revert|revert-layer)$/;
function arbitraryOk(util, value) {
  if (util === "transition" && /^[a-z-]+(?:,[a-z-]+)*$/.test(value) && !/(?:^|,)all(?:,|$)/.test(value)) return true;
  if (CSS_WIDE.test(value)) return true;
  if (/^\[grid-(?:area|row|column)(?:-start|-end)?\]$/.test(util) && /^[a-z_][\w-]*$/i.test(value)) return true;
  if (/^(?:calc|min|max|clamp|env)\(/.test(value) && /var\(--|env\(/.test(value)) {
    const rest = value.replace(/var\(--[\w-]+\)|env\([\w-]+\)/g, "").replace(/\b(?:calc|min|max|clamp)\(/g, "(").replace(/\d*\.?\d+(?:[dsl]?v[hw]|%)?/g, "");
    return /^[()+\-*/_,]*$/.test(rest);
  }
  return false;
}
// Only literal-value rules exempt upstream lines. A var() upstream reads and the app never defines is still broken.
const VALUE_RULES = new Set(["rule/raw-value", "rule/named-color", "rule/arbitrary-value", "rule/palette-use", "rule/inline-px", "rule/css-px"]);
function checkFile(cfg, rel, report, stockLines) {
  const src = readRel(cfg, rel);
  const js = CODE_EXT.test(rel), css = CSS_EXT.test(rel), jsx = JSX_EXT.test(rel), html = HTML_EXT.test(rel);
  const { code, mask } = lex(src, js);
  const lineOf = lineIndex(src);
  const srcLines = stockLines ? src.split("\n") : null;
  const on = (r) => !cfg.off.has(r);
  const hit = (pos, rule, detail, nearest) => {
    if (!on(rule)) return;
    const line = lineOf(pos);
    if (stockLines && VALUE_RULES.has(rule) && stockLines.has(normLine(srcLines[line - 1] || ""))) { cfg.stockExempt = (cfg.stockExempt || 0) + 1; return; }
    report({ file: rel, line, rule, detail, ...(nearest ? { nearest } : {}) });
  };
  if (html) { markupTraps(cfg, rel, code, () => true, hit); return; }
  const isToken = cfg.tokenSources.map(posix).includes(rel);
  const lines = code.split("\n");
  const tokenLine = (pos) => isToken && /^\s*--[\w-]+\s*:/.test(lines[lineOf(pos) - 1]);
  const inUi = cfg.uiDir && rel.startsWith(posix(cfg.uiDir) + "/");
  const systemFile = inUi || cfg.registered.has(rel);

  // raw colors: in CSS anywhere; in code only inside string literals
  const rawRe = /(?<![&\w#])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])|(?<![A-Za-z0-9-])(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/g;
  for (const m of code.matchAll(rawRe)) {
    if (js && !mask[m.index]) continue;
    if (tokenLine(m.index)) continue;
    // hsl(var(--x)) and hsl(var(--x) / 50%) read a token that stores bare channels (Tailwind v3 with shadcn).
    if (m[0].endsWith("(") && /^[a-z]+\(\s*var\(--[\w-]+\)\s*(?:\/\s*[\d.]+%?\s*)?\)/i.test(code.slice(m.index, m.index + 120))) continue;
    const call = m[0].endsWith("(") ? /^[a-z]+\([^()]*\)/i.exec(code.slice(m.index, m.index + 80)) : null;
    const lit = call ? call[0].replace(/\s+/g, " ") : m[0].endsWith("(") ? m[0] + ")" : m[0].toLowerCase();
    hit(m.index, "rule/raw-value", lit, nearestToken(cfg, ctxProp(code, m.index), lit));
  }
  // named colors
  if (css) {
    for (const m of code.matchAll(/(?:^|[;{\s])((?:background|border(?:-(?:top|right|bottom|left))?|outline|text-decoration|caret|accent|column-rule)?-?color|background|border(?:-(?:top|right|bottom|left))?|outline|fill|stroke|box-shadow)\s*:\s*([^;{}]*)/g)) {
      const nm = NAMED_RE.exec(m[2]);
      if (nm && !tokenLine(m.index + m[0].indexOf(m[1]))) hit(m.index + m[0].indexOf(m[1]), "rule/named-color", `${m[1]}: ${nm[1]}`);
    }
  }
  if (js) {
    for (const m of code.matchAll(/(?<![\w-])(color|background(?:Color)?|border(?:Top|Right|Bottom|Left)?(?:Color)?|outline(?:Color)?|fill|stroke|textDecorationColor|caretColor|accentColor|boxShadow)\s*:\s*(["'`])([^"'`\n]*)\2/g)) {
      const nm = NAMED_RE.exec(m[3]);
      if (nm) hit(m.index, "rule/named-color", `${m[1]}: ${nm[1]}`);
    }
  }
  // Tailwind: arbitrary values and palette classes, inside strings in code
  if (js) {
    for (const m of code.matchAll(/(?<![\w\-[\]])((?:[a-z0-9-]+:)*!?-?[a-z][a-z0-9]*(?:-[a-z0-9.]+)*)-\[([^\]\s'"`]+)\](?!:|\/[\w-]*:|[\w-])/g)) {
      if (!mask[m.index] || /^var\(--[\w-]+\)$/.test(m[2])) continue;
      const util = m[1].replace(/^(?:[a-z0-9-]+:)+/, "").replace(/^!?-?/, "");
      if (arbitraryOk(util, m[2])) continue;
      hit(m.index, "rule/arbitrary-value", `${m[1].replace(/^(?:[a-z0-9-]+:)+/, "")}-[${m[2]}]`, nearestToken(cfg, util, m[2]));
    }
    for (const m of code.matchAll(/(?<![\w\-[\]&])\[([a-z][a-z-]*):([^\]\s'"`]+)\](?!:|\/[\w-]*:|[\w-])/g)) {
      if (mask[m.index] && !arbitraryOk(`[${m[1]}]`, m[2])) hit(m.index, "rule/arbitrary-value", m[0], nearestToken(cfg, m[1], m[2]));
    }
    const pal = new RegExp(`(?<![\\w-])(?:[a-z0-9-]+:)*(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|fill|stroke|from|via|to|outline|decoration|divide|placeholder|caret|accent|shadow)-(?:${PALETTE})-(?:50|[1-9]00|950)(?:\\/\\d+)?(?![\\w-])`, "g");
    for (const m of code.matchAll(pal)) if (mask[m.index]) hit(m.index, "rule/palette-use", m[0]);
    // Solid white and black utilities count as palette use once the theme has a role for that job.
    if (cfg.tokens) {
      const has = (re) => [...cfg.tokens.defined].some((n) => re.test(n));
      const roles = { surface: has(/^--(?:color-)?(?:background|card|popover|surface)$/), fg: has(/^--(?:color-)?(?:[\w-]+-)?foreground$/), edge: has(/^--(?:color-)?(?:border|input|ring)$/) };
      const job = { bg: "surface", from: "surface", via: "surface", to: "surface", text: "fg", fill: "fg", stroke: "fg", placeholder: "fg", caret: "fg", decoration: "fg", border: "edge", divide: "edge", outline: "edge", ring: "edge" };
      for (const m of code.matchAll(/(?<![\w-])(?:[a-z0-9-]+:)*!?(bg|text|border(?:-[trblxyse])?|ring|fill|stroke|from|via|to|outline|decoration|divide|placeholder|caret)-(white|black)(?![\w/-])/g)) {
        if (mask[m.index] && roles[job[m[1].replace(/-.*/, "")]]) hit(m.index, "rule/palette-use", m[0]);
      }
    }
    for (const m of code.matchAll(/(?<![\w-])(?:[a-z0-9-]+:)*!?(text|bg|border)-\1-[a-z0-9][\w-]*(?:\/\d+)?(?![\w-])/g)) if (mask[m.index]) hit(m.index, "rule/doubled-utility", m[0].replace(/^(?:[a-z0-9-]+:)+/, ""));
  }
  for (const m of code.matchAll(new RegExp(`var\\(--color-(?:${PALETTE})-\\d+\\)`, "g"))) if (!tokenLine(m.index)) hit(m.index, "rule/palette-use", m[0]);

  // px, rem and em lengths in CSS declarations (custom property lines are token definitions).
  // rem and em pass in line-height and letter-spacing, and beside a viewport unit or %, as in calc(100dvh - 2rem).
  if (css) {
    const props = /(?:^|[;{\s])((?:margin|padding|inset|scroll-margin|scroll-padding)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?|gap|row-gap|column-gap|top|right|bottom|left|border(?:-(?:top|bottom)-(?:left|right))?-radius|font-size|line-height|letter-spacing|(?:min-|max-)?(?:width|height)|flex-basis)\s*:\s*([^;{}]*?)\s*(?=[;}])/g;
    for (const m of code.matchAll(props)) {
      const at = m.index + m[0].indexOf(m[1]);
      const relOk = /^(?:line-height|letter-spacing)$/.test(m[1]) || /\d(?:[dsl]?v[hw]|%)/.test(m[2]);
      const len = [...m[2].matchAll(/(-?\d*\.?\d+)(px|r?em)\b/g)].filter((x) => x[2] === "px" ? Math.abs(Number(x[1])) > 1 : !relOk && Number(x[1]) !== 0);
      // The touch zoom floor, font-size: max(16px, <a token or em size>), is trap/touch-input-zoom's fix.
      const zoomFloor = m[1] === "font-size" && /^max\(\s*16px\s*,[^,]+\)$/.test(m[2].trim()) && !/\dpx\b/.test(m[2].trim().slice(4).replace(/^\s*16px/, ""));
      if (len.length && !zoomFloor && !tokenLine(at)) hit(at, "rule/css-px", `${m[1]}: ${m[2].trim()}`, nearestToken(cfg, m[1], len[0][0]));
    }
  }

  // custom property references that nothing defines
  if (on("rule/token-parity") && cfg.tokens) {
    const refs = [];
    for (const m of code.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)) if (!js || mask[m.index]) refs.push([m.index, m[1], m[2] === ","]);
    if (js) for (const m of code.matchAll(/-\((--[\w-]+)\)/g)) if (mask[m.index]) refs.push([m.index, m[1], false]);
    for (const [pos, name, fallback] of refs) {
      if (fallback || cfg.tokens.defined.has(name) || cfg.varIgnore.some((p) => name.startsWith(p))) continue;
      hit(pos, "rule/token-parity", `${name} is used and never defined`);
    }
    for (const f of cfg.tokens.parity) if (f.file === rel) hit(f.pos, "rule/token-parity", f.detail);
  }

  // overlays mounted by a condition
  if (jsx && on("trap/overlay-conditional-render")) {
    const re = new RegExp(`(&&|\\?)\\s*\\(?\\s*<(${cfg.overlayComponents.join("|")})(?:\\.Root)?(?=[\\s>/])`, "g");
    for (const m of code.matchAll(re)) {
      const lt = m.index + m[0].lastIndexOf("<");
      if (!mask[lt]) hit(lt, "trap/overlay-conditional-render", `{${m[1] === "&&" ? "cond &&" : "cond ?"} <${m[2]}>}`);
    }
  }

  // deprecated imports
  if (js && cfg.replaces.size) {
    for (const m of code.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\(\s*)(["'])([^"']+)\1/g)) {
      const target = resolveImport(cfg, rel, m[2]);
      if (target && cfg.replaces.has(target) && !cfg.replaces.has(stripExt(rel))) hit(m.index, "rule/deprecated-import", m[2]);
    }
  }

  // motion, touch and viewport traps
  for (const m of code.matchAll(CUBIC)) if ((!js || mask[m.index]) && overshoot(m)) hit(m.index, "trap/motion-overshoot", m[0].replace(/\s+/g, ""));
  if (css) cssMotionTraps(cfg, code, hit);
  if (css) for (const m of code.matchAll(/@apply\s[^;]*?(?<![\w-])transition-all(?![\w-])/g)) hit(m.index, "trap/motion-transition-all", "@apply transition-all");
  if (js) jsMotionTraps(cfg, rel, code, mask, hit);

  // whole JSX tags
  if (!jsx) return;
  const tags = jsxTags(code, mask);
  for (const t of tags) {
    const lower = /^[a-z]/.test(t.name);
    const role = literalOf(attr(t, "role"));
    // named colors on SVG paint attributes
    if (lower) for (const a of ["fill", "stroke", "color"]) { const v = literalOf(attr(t, a)); if (v && NAMED_RE.test(v) && NAMED_RE.exec(v)[0] === v.trim()) hit(attr(t, a).pos, "rule/named-color", `${a}="${v}"`); }
    // inline px in style={{...}}
    const style = attr(t, "style");
    if (style && style.expr) {
      const re = /(?<![\w$])(margin\w*|padding\w*|gap|rowGap|columnGap|top|right|bottom|left|inset\w*|borderRadius|border\w*Radius|width|height|minWidth|maxWidth|minHeight|maxHeight|fontSize|lineHeight|letterSpacing|flexBasis)\s*:\s*(-?\d*\.?\d+(?![\w%.])|(["'`])[^"'`]*?\d(?:px|r?em)\b[^"'`]*\3)/g;
      for (const m of style.value.matchAll(re)) {
        const num = /^-?\d*\.?\d+$/.test(m[2]);
        if (num && (Number(m[2]) === 0 || m[1] === "lineHeight")) continue;
        // a string with rem or em and no px: rem and em pass in lineHeight, letterSpacing and viewport math, and at 0
        if (!num && !/\dpx\b/.test(m[2]) && (/^(?:lineHeight|letterSpacing)$/.test(m[1]) || /\d(?:[dsl]?v[hw]|%)/.test(m[2]) || ![...m[2].matchAll(/(-?\d*\.?\d+)r?em\b/g)].some((x) => Number(x[1]) !== 0))) continue;
        const off = code.indexOf(style.value, t.pos) + m.index;
        hit(off, "rule/inline-px", `${m[1]}: ${m[2]}`, nearestToken(cfg, m[1], m[2].replace(/^["'`]|["'`]$/g, "")));
      }
    }
    // activation handlers on non-interactive elements
    // A native <dialog> closes on Escape through its cancel event, so a click handler on the element itself is the
    // backdrop pattern, not a fake button. It passes only with onCancel wired, the keyboard path.
    const nativeDialog = t.name === "dialog" && attr(t, "onCancel");
    if (lower && !role && !nativeDialog && !INTERACTIVE.has(t.name) && !(t.name === "a" && attr(t, "href"))) {
      const press = ["onClick", "onPointerDown", "onMouseDown", "onPointerUp", "onMouseUp"].find((h) => attr(t, h));
      const tab = attr(t, "tabIndex"), key = ["onKeyDown", "onKeyUp", "onKeyPress"].find((h) => attr(t, h));
      const focusable = tab && !/^\s*-\d/.test(String(tab.value));
      if (press) hit(t.pos, "trap/button-div", `<${t.name} ${press}>${t.name === "a" ? " with no href" : t.name === "dialog" ? " with no onCancel" : ""}`);
      else if (focusable && key) hit(t.pos, "trap/button-div", `<${t.name} tabIndex ${key}>`);
    }
    // a label that names nothing
    if (!systemFile && (t.name === "label" || t.name === "Label") && on("trap/label-unbound") && !attr(t, "htmlFor") && !attr(t, "for") && !attr(t, "...")) {
      const controls = new Set(["input", "select", "textarea", "Input", "Select", "SelectTrigger", "Textarea", "Checkbox", "Switch", "RadioGroup", "RadioGroupItem", "Slider", ...Object.values(cfg.nativeControls)]);
      const close = closingTag(code, tags, t);
      // Read the element's inner source, since a tag after plain JSX text ("Remember me <input />") is not in tags.
      const inner = close > 0 ? code.slice(t.end, close) : "";
      if (![...inner.matchAll(/<([A-Za-z][\w.]*)(?=[\s/>])/g)].some((m) => controls.has(m[1]))) hit(t.pos, "trap/label-unbound", `<${t.name}> with no htmlFor and no control inside`);
    }
    // autofocus on a field in a page, not in a dialog
    const af = attr(t, "autoFocus") || attr(t, "autofocus");
    if (af && !systemFile && on("trap/touch-autofocus") && (af.value === true || (af.expr ? /^\s*true\s*$/.test(af.value) : af.value !== "false"))) {
      const type = (literalOf(attr(t, "type")) || "text").toLowerCase();
      const field = (["input", "textarea", "select"].includes(t.name) && !/^(?:checkbox|radio|button|submit|reset|hidden|range|color|file)$/.test(type)) || /(?:Input|Textarea|TextArea|Field|Search|Combobox|Editor|Select)$/.test(t.name);
      const overlay = (u) => u.name === "dialog" || /Dialog|Modal|Sheet|Drawer|Popover|Command|Popup/.test(u.name) || cfg.overlayComponents.some((o) => u.name.startsWith(o)) || /^(?:alert)?dialog$/.test(literalOf(attr(u, "role")) || "");
      const inside = tags.some((u) => u.pos < t.pos && overlay(u) && closingTag(code, tags, u) > t.pos);
      if (field && !inside && !OVERLAY_FILE.test(rel)) hit(af.pos, "trap/touch-autofocus", `<${t.name} ${af.name}> in a page`);
    }
    // a motion component whose entrance eases in
    if (on("trap/motion-ease-in-enter") && attr(t, "initial") && attr(t, "animate")) {
      const v = ["transition", "animate"].map((n) => String(attr(t, n)?.value || "")).join(" ");
      if (/(?<![\w$])ease\s*:\s*["'`]easeIn["'`]|(?<![\w$])ease\s*:\s*\[\s*0?\.4\d*\s*,\s*0\s*,\s*1\s*,\s*1\s*\]/.test(v)) hit(t.pos, "trap/motion-ease-in-enter", `<${t.name} initial animate> with ease easeIn`);
    }
    // role="button" on non-buttons
    if (role === "button" && t.name !== "button") hit(attr(t, "role").pos, "trap/role-button", `<${t.name} role="button">`);
    // a link wrapping a button, or a button wrapping a link
    if (on("trap/link-wraps-button")) {
      const links = [...cfg.linkComponents, ...cfg.systemLinks];
      const buttons = ["button", "Button", cfg.nativeControls.button].filter(Boolean);
      const outerLink = links.includes(t.name);
      const outerButton = buttons.includes(t.name) && !attr(t, "asChild") && !attr(t, "render");
      if (outerLink || outerButton) {
        const close = closingTag(code, tags, t);
        const inner = close > 0 && tags.find((u) => u.pos > t.end && u.pos < close && (outerLink ? buttons : links).includes(u.name));
        if (inner) hit(t.pos, "trap/link-wraps-button", `<${t.name}> wraps <${inner.name}>`);
      }
    }
    // a button label that swaps while it loads
    if (!systemFile && on("trap/loading-label-swap") && ["button", "Button", cfg.nativeControls.button].filter(Boolean).includes(t.name)) {
      const close = closingTag(code, tags, t);
      const inner = close > 0 ? code.slice(t.end, close) : "";
      const lit = (x) => /^(["'`])[^"'`]*\1$/.test(x.trim());
      for (const m of inner.matchAll(/\{\s*(!?\s*[\w$.]+)\s*\?\s*([^:{}]+?)\s*:\s*([^{}]+?)\s*\}/g)) {
        const [a, b] = [m[2], m[3]];
        // An attribute value, such as className={busy ? "invisible" : ""} on a stacked label, is not the label.
        if (/=\s*$/.test(inner.slice(0, m.index))) continue;
        if (!(lit(a) || lit(b)) || !(lit(a) || a.trim().startsWith("<")) || !(lit(b) || b.trim().startsWith("<"))) continue;
        const cond = m[1].replace(/^!\s*/, ""), last = cond.split(".").pop();
        const state = ["disabled", "loading", "pending", "isLoading", "isPending", "busy", "aria-busy", "aria-disabled"].map((n) => attr(t, n)).filter((x) => x && x.expr).some((x) => new RegExp(`(^|[^\\w$.])${cond.replace(/[.$]/g, "\\$&")}(?![\\w$])`).test(x.value));
        if (state || /(load|sav|pend|submit|busy|send|delet|creat|updat|process|progress|work)/i.test(last))
          hit(t.pos + (t.end - t.pos) + m.index, "trap/loading-label-swap", `<${t.name}> label swaps on ${cond}: ${a.trim().slice(0, 30)} / ${b.trim().slice(0, 30)}`);
      }
    }
    // visual overrides on components the registry lists
    if (!systemFile && on("rule/component-override") && cfg.registryComponents.has(t.name)) {
      const why = [];
      const cls = attr(t, "className"), sty = attr(t, "style");
      for (const x of classTokens(cls)) {
        const bare = x.replace(/^(?:[a-z0-9-]+:)+/, "").replace(/^!/, "");
        if (/^(p[xytrblse]?-|rounded(-|$)|shadow(-|$)|bg-)/.test(bare) && !BG_NOT_COLOR.test(bare) && !/^shadow-none$/.test(bare)) why.push(x);
        else if (cfg.cssVisual && cfg.cssVisual.has(x)) why.push(`.${x} (${cfg.cssVisual.get(x)})`);
      }
      if (sty && sty.expr) for (const m of sty.value.matchAll(/(?<![\w$])(padding\w*|borderRadius|border\w*Radius|boxShadow|background(?:Color)?)\s*:/g)) why.push(`style ${m[1]}`);
      if (why.length) hit(t.pos, "rule/component-override", `<${t.name}> ${why.slice(0, 4).join(", ")}`);
    }
    // native control where a system component exists
    if (lower && !systemFile) {
      let key = t.name;
      if (t.name === "input") {
        const type = (literalOf(attr(t, "type")) || "text").toLowerCase();
        key = cfg.nativeControls[`input:${type}`] ? `input:${type}` : /^(text|email|password|search|tel|url|number|date|time|datetime-local|month|week)$/.test(type) ? "input" : null;
      }
      if (key && cfg.nativeControls[key]) hit(t.pos, "trap/native-control", `<${t.name}${key.includes(":") ? ` type=${key.split(":")[1]}` : ""}> where the system has ${cfg.nativeControls[key]}`);
    }
    // links styled as buttons, and Button copies on any other element
    const plainLink = cfg.linkComponents.includes(t.name);
    const isLink = plainLink || cfg.systemLinks.includes(t.name);
    if (!systemFile && (isLink || (lower && !["button", "input", "select", "textarea"].includes(t.name)))) {
      const rule = isLink ? "trap/link-as-button" : "trap/button-clone";
      const cls = attr(t, "className");
      if (cls && /\bbuttonVariants\s*\(/.test(cls.value)) continue;
      if (plainLink && attr(t, "variant")) { hit(t.pos, rule, `<${t.name} variant=...>`); continue; }
      const toks = classTokens(cls);
      // A link whose own styles set a background and padding is a button, whatever the values. A block, flex or grid
      // link is a card or row link and passes, and so does a background that shows only on hover or focus.
      if (isLink) {
        const why = linkBgPad(cfg, toks, attr(t, "style"));
        if (why) { hit(t.pos, rule, `<${t.name}> sets a background and padding (${why})`); continue; }
      }
      const sig = new Set(cfg.buttonSignature);
      const shared = toks.filter((x) => sig.has(x) && !GENERIC.test(x));
      const named = shared.filter((x) => /btn|button/i.test(x));
      const appCss = toks.filter((x) => cfg.cssButtons.has(x) && !named.includes(x));
      const sized = toks.some((x) => /^(h|size|py|min-h)-/.test(x.replace(/^(?:[a-z0-9-]+:)+/, "")));
      if (appCss.length) { hit(t.pos, rule, `<${t.name}> uses the app-CSS button class .${appCss[0]} (${cfg.cssButtons.get(appCss[0])})`); continue; }
      if (named.length || (shared.length >= cfg.buttonSignatureMin && sized)) hit(t.pos, rule, `<${t.name}> shares ${named.length ? named.join(" ") : shared.length + " classes"} with ${cfg.buttonFile || "the Button"}`);
    }
  }
}

// Does a link's own styling set both a background and padding? Returns the evidence, or null.
// Tailwind: an unconditional bg-* color utility (responsive and dark: prefixes count, hover: and focus: do not)
// plus a p-, px-, py-... utility other than 0. Inline style: background plus padding. App CSS: a class whose rule
// sets both. Block, flex and grid links pass: they are card and row links.
const BG_NOT_COLOR = /^bg-(?:transparent|none|inherit|current|auto|cover|contain|center|top|bottom|left|right|left-top|left-bottom|right-top|right-bottom|repeat.*|no-repeat|fixed|local|scroll|clip-.*|origin-.*|blend-.*|linear-.*|radial-.*|conic-.*|gradient-.*|size-.*|position-.*|top-.*|bottom-.*|left-.*|right-.*)$/;
const LAYOUT_VARIANT = /^(?:(?:sm|md|lg|xl|2xl|dark|max-sm|max-md|max-lg|max-xl):)*/;
function linkBgPad(cfg, toks, style) {
  const base = toks.filter((x) => { const bare = x.replace(LAYOUT_VARIANT, ""); return !bare.includes(":"); }).map((x) => x.replace(LAYOUT_VARIANT, "").replace(/^!/, ""));
  const blockLevel = (v) => /^(block|flex|grid|table|list-item)$/.test(v);
  if (base.some(blockLevel)) return null;
  const bg = base.find((x) => /^bg-/.test(x) && !BG_NOT_COLOR.test(x));
  const pad = base.find((x) => /^p[xytrblse]?-/.test(x) && !/^p[xytrblse]?-0$/.test(x));
  if (bg && pad) return `${bg} ${pad}`;
  if (style && style.expr) {
    const v = style.value;
    const disp = /(?<![\w$])display\s*:\s*["'`](block|flex|grid)["'`]/.exec(v);
    const sbg = /(?<![\w$])background(?:Color)?\s*:\s*(?!["'`](?:transparent|none|inherit|initial|unset)["'`])\S/.test(v);
    const spad = /(?<![\w$])padding\w*\s*:\s*(?!["'`]?0["'`]?\s*[,}])\S/.test(v);
    if (!disp && sbg && spad) return "inline style";
  }
  for (const c of toks) {
    const hitCss = cfg.cssBgPad && cfg.cssBgPad.get(c);
    if (hitCss && !hitCss.block) return `.${c}, ${hitCss.loc}`;
  }
  return null;
}

function resolveImport(cfg, from, spec) {
  let p = null;
  for (const [a, target] of Object.entries(cfg.aliases)) if (spec.startsWith(a)) { p = target + spec.slice(a.length); break; }
  if (p === null && spec.startsWith(".")) p = posix(join(dirname(from), spec));
  if (p === null) return null;
  return stripExt(posix(p).replace(/^\.\//, ""));
}

function listFiles(cfg) {
  const out = [];
  const ex = cfg.exclude.map(posix);
  const skip = (rel) => ex.some((e) => rel === e || rel.startsWith(e + "/") || (SEGMENT_EXCLUDES.has(e) && rel.split("/").includes(e)));
  const walk = (rel) => {
    const abs = join(cfg.root, rel);
    const st = statSync(abs, { throwIfNoEntry: false });
    if (!st || skip(rel)) return;
    if (st.isDirectory()) { if (rel && existsSync(join(abs, "SKILL.md"))) return; for (const e of readdirSync(abs).sort()) walk(rel ? `${rel}/${e}` : e); return; } // a folder holding a SKILL.md is a skill, not product code
    const logical = cfg.fixtures ? unfix(rel) : rel;
    if (cfg.fixtures && logical === rel && /\.(tsx|jsx|ts|js)$/.test(rel)) return; // fixtures must be .fixture files
    if (CODE_EXT.test(logical) || CSS_EXT.test(logical) || HTML_EXT.test(logical)) out.push(logical);
  };
  for (const d of cfg.include) walk(d === "." || d === "./" ? "" : posix(d).replace(/^\.\//, ""));
  for (const t of cfg.tokenSources) if (!out.includes(posix(t)) && existsRel(cfg, t)) out.push(posix(t));
  return [...new Set(out)];
}

// Walk CSS rule blocks: every declaration with the chain of selectors or at-rules around it.
function cssBlocks(code) {
  const blocks = [];
  const stack = [];
  let start = 0;
  const decl = (a, b) => {
    const text = code.slice(a, b);
    const m = /^(\s*)([\w-]+)\s*:([\s\S]*)$/.exec(text);
    if (m && stack.length) stack[stack.length - 1].decls.push({ prop: m[2], value: m[3].trim(), pos: a + m[1].length });
  };
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (c === '"' || c === "'") { const e = code.indexOf(c, i + 1); i = e < 0 ? code.length : e; continue; }
    if (c === "(") { let d = 1, j = i + 1; while (j < code.length && d) { if (code[j] === "(") d++; else if (code[j] === ")") d--; j++; } i = j - 1; continue; }
    if (c === "{") { const pre = code.slice(start, i); stack.push({ prelude: pre.trim(), chain: [...stack.map((b) => b.prelude), pre.trim()], decls: [], pos: start + pre.length - pre.trimStart().length }); start = i + 1; }
    else if (c === ";") { decl(start, i); start = i + 1; }
    else if (c === "}") { decl(start, i); const b = stack.pop(); if (b) blocks.push(b); start = i + 1; }
  }
  return blocks;
}

const DARK = /\.dark\b|\[data-(?:theme|mode|color-scheme)=["']?dark|prefers-color-scheme:\s*dark|\.theme-dark\b/;
const LIGHT_ROOT = /^(?::root|html|:host|\.light|\[data-(?:theme|mode)=["']?light["']?\])(?:\s*,\s*(?::root|html|:host|\.light|\[data-(?:theme|mode)=["']?light["']?\]))*$/;
// Bare HSL channels, as Tailwind v3 with shadcn stores them (222.2 47.4% 11.2%), are colors too.
const COLOR_VALUE = new RegExp(`^(?:#[0-9a-f]{3,8}|(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color-mix|color)\\(.*|-?[\\d.]+(?:deg)?\\s+[\\d.]+%\\s+[\\d.]+%(?:\\s*\\/\\s*[\\d.]+%?)?|${NAMED.join("|")})$`, "i");

// CSS files a stylesheet imports from node_modules (such as tailwindcss or a component library's CSS), for definitions only.
function importedCss(root, spec, from) {
  const cands = [];
  if (/^(\.|\/)/.test(spec)) cands.push(join(dirname(from), spec));
  else {
    const base = join(root, "node_modules", spec);
    cands.push(base, base + ".css", join(base, "index.css"));
    try { const pj = JSON.parse(readFileSync(join(base, "package.json"), "utf8")); for (const k of [pj.style, pj.exports?.["."]?.style, typeof pj.exports?.["."] === "string" ? pj.exports["."] : null]) if (k) cands.push(join(base, k)); } catch {}
  }
  return cands.find((p) => CSS_EXT.test(p) && existsSync(p) && statSync(p).isFile()) || null;
}

// One pass over the repo: defined custom properties, theme parity, app-CSS button classes.
function indexRepo(cfg) {
  const files = listFiles(cfg);
  const defined = new Set();
  const lightDefs = new Set();
  const rootKeys = new Map(), darkKeys = new Map();
  const candidates = new Map();
  const bgPad = new Map();
  const visual = new Map();
  const onButtons = new Set();
  const tokenValues = new Map();
  let hasPress = false;
  const seenCss = new Set();
  const readCssDefs = (abs, depth) => {
    if (depth > 4 || seenCss.has(abs)) return;
    seenCss.add(abs);
    const code = lex(readFileSync(abs, "utf8"), false).code;
    for (const m of code.matchAll(/(?:^|[;{\s])(--[\w-]+)\s*:/g)) { defined.add(m[1]); lightDefs.add(m[1]); }
    for (const m of code.matchAll(/@import\s+(?:url\()?["']([^"']+)["']/g)) { const p = importedCss(cfg.root, m[1], abs); if (p) readCssDefs(p, depth + 1); }
  };
  for (const rel of files) {
    const js = CODE_EXT.test(rel), css = CSS_EXT.test(rel);
    const { code, mask } = lex(readRel(cfg, rel), js);
    if (css) {
      for (const m of code.matchAll(/@import\s+(?:url\()?["']([^"']+)["']/g)) { const p = importedCss(cfg.root, m[1], join(cfg.root, rel)); if (p) readCssDefs(p, 0); }
      for (const b of cssBlocks(code)) {
        const dark = b.chain.some((p) => DARK.test(p));
        const root = !dark && LIGHT_ROOT.test(b.prelude);
        for (const d of b.decls) {
          if (!d.prop.startsWith("--")) continue;
          defined.add(d.prop);
          if (!dark) lightDefs.add(d.prop);
          if (!dark && !tokenValues.has(d.prop) && !b.chain.some((p) => /^@(?:-webkit-)?keyframes/.test(p))) tokenValues.set(d.prop, d.value);
          const at = { file: rel, pos: d.pos, value: d.value };
          if (dark && !darkKeys.has(d.prop)) darkKeys.set(d.prop, at);
          if (root && !rootKeys.has(d.prop)) rootKeys.set(d.prop, at);
        }
        if (/(?<!not\()\:active\b|\[data-pressed\b|\[aria-pressed=["']?true/.test(b.prelude)) hasPress = true;
        const classes = b.prelude.split(",").map((x) => /^\.([\w-]+)$/.exec(x.trim())?.[1]);
        if (!classes.length || classes.some((x) => !x)) continue;
        const bg = b.decls.find((d) => /^background(-color)?$/.test(d.prop) && !/^(transparent|none|inherit|initial|unset)\b/.test(d.value));
        const pad = b.decls.some((d) => /^padding/.test(d.prop));
        const block = b.decls.some((d) => d.prop === "display" && /^(block|flex|grid|table|list-item)\b/.test(d.value));
        if (bg && pad) for (const c of classes) if (!candidates.has(c)) candidates.set(c, `${rel}:${lineIndex(code)(b.pos)}`);
        if (bg && pad) for (const c of classes) if (!bgPad.has(c)) bgPad.set(c, { loc: `${rel}:${lineIndex(code)(b.pos)}`, block });
        const vis = b.decls.find((d) => /^(padding(-\w+)*|border(-\w+)?-radius|box-shadow|background(-color)?)$/.test(d.prop));
        if (vis) for (const c of classes) if (!visual.has(c)) visual.set(c, `${vis.prop} at ${rel}:${lineIndex(code)(b.pos)}`);
      }
    } else if (js) {
      for (const m of code.matchAll(/(["'`])(--[\w-]+)\1/g)) defined.add(m[2]);
      for (const m of code.matchAll(/\[(--[\w-]+):/g)) if (mask[m.index]) defined.add(m[1]);
      if (JSX_EXT.test(rel)) for (const t of jsxTags(code, mask)) if (t.name === "button" || t.name === "Button") for (const c of classTokens(attr(t, "className"))) onButtons.add(c);
      if (!hasPress && [...code.matchAll(/(?<![\w-])(?:[\w\-[\]=&]+:)*(?:active|data-pressed|data-\[pressed\]|pressed):[!\w[-]|(?<![\w$])whileTap\b|:active\b/g)].some((m) => mask[m.index] || /whileTap/.test(m[0]))) hasPress = true;
    }
  }
  const parity = [];
  if (darkKeys.size && rootKeys.size) {
    for (const [k, v] of darkKeys) if (!lightDefs.has(k)) parity.push({ ...v, detail: `${k} is defined in the dark theme only` });
    for (const [k, v] of rootKeys) if (!darkKeys.has(k) && COLOR_VALUE.test(v.value) && !(cfg.sharedTokens || []).includes(k)) parity.push({ ...v, detail: `${k} has a light color and no dark value` });
  }
  const cssButtons = new Map();
  for (const [c, loc] of candidates) if (/btn|button|cta/i.test(c) || onButtons.has(c)) cssButtons.set(c, loc);
  return { tokens: { defined, parity }, cssButtons, cssBgPad: bgPad, cssVisual: visual, tokenValues, hasPress, _tokenIndex: null };
}

// Upstream's copy of a customized ui file, saved by --save-stock as <stockDir>/<file>.stock.
const stockPath = (cfg, rel) => join(cfg.root, cfg.stockDir || DEFAULTS.stockDir, rel + ".stock");
function stockLinesFor(cfg, rel) {
  const p = stockPath(cfg, rel);
  if (!existsSync(p)) return null;
  return new Set(readFileSync(p, "utf8").split("\n").map(normLine).filter(Boolean));
}

function scan(cfg, only) {
  const findings = [];
  const report = (f) => findings.push(f);
  Object.assign(cfg, indexRepo(cfg));
  const files = only || listFiles(cfg);
  const drift = (rel, d, why) => { if (!cfg.off.has("rule/stock-edit")) report({ file: rel, line: 1, rule: "rule/stock-edit", detail: why }); };
  for (const rel of files) {
    if (/\.mdx?$/.test(rel)) continue;
    const d = cfg.drift.get(rel);
    if (d) {
      // every drift-list row carries a hash, so any edit to a primitive shows up as a reviewed drift-list change
      if (!d.hash) drift(rel, d, `${d.status || "unmarked"} row has no sha256 (${cfg.driftList}:${d.line}); run --hash-stock`);
      else if (existsRel(cfg, rel) && sha256(join(cfg.root, phys(cfg, rel))) !== d.hash) drift(rel, d, `${d.status || "unmarked"} file changed since its hash was recorded (${cfg.driftList}:${d.line})`);
      else if (d.status === "stock") continue; // an untouched stock file carries upstream's values, not drift
    }
    checkFile(cfg, rel, report, d && d.status === "customized" ? stockLinesFor(cfg, rel) : null);
  }
  // unregistered files directly in the ui folder
  // An installed system's ui folder came from someone else's registry, so with no registry file here nothing to
  // register against exists.
  const foreignUi = cfg.installedUi && !existsSync(join(cfg.root, cfg.registry || "registry.json"));
  if (foreignUi && !cfg.off.has("rule/unregistered-ui")) cfg.notes.push(`${cfg.uiDir} is an installed system's ui folder and ${cfg.registry} does not exist, so rule/unregistered-ui is skipped`);
  if (cfg.uiDir && !foreignUi && !cfg.off.has("rule/unregistered-ui")) {
    for (const e of uiEntries(cfg)) {
      const rel = `${posix(cfg.uiDir)}/${e}`;
      if (!/\.(tsx|jsx|ts|js|vue|svelte)$/.test(e) || /^index\.\w+$/.test(e) || /\.(test|spec|stories)\./.test(e)) continue;
      if (statSync(join(cfg.root, phys(cfg, rel))).isDirectory()) continue;
      if (only && !only.includes(rel)) continue;
      if (!cfg.registered.has(rel) && !cfg.drift.has(rel)) report({ file: rel, line: 1, rule: "rule/unregistered-ui", detail: `not in ${cfg.registry} and not in ${cfg.driftList}` });
    }
  }
  checkBans(cfg, files, report, !!only);
  if (!only) checkNames(cfg, report);
  // allowlist key: the literal, without whitespace runs or (file:line) pointers, so it survives edits elsewhere
  for (const f of findings) f.key = f.detail.replace(/\s*\([^()]*:\d+\)/g, "").replace(/\s+/g, " ");
  return findings;
}

// The person's bans (config bans), such as a middle dot or an em dash, in UI code with comments stripped and in
// the docs pages. A line holding "Don't:" or the ban's own id describes the ban, so it passes.
function checkBans(cfg, files, report, onlyGiven) {
  const bans = (cfg.bans || []).filter((b) => b && b.id && b.pattern && !cfg.off.has(b.id)).map((b) => ({ ...b, re: new RegExp(b.pattern, b.flags || "u") }));
  if (!bans.length) return;
  const docs = [];
  if (!onlyGiven) {
    const walk = (rel) => {
      const st = statSync(join(cfg.root, rel), { throwIfNoEntry: false });
      if (!st) return;
      if (st.isDirectory()) { for (const e of readdirSync(join(cfg.root, rel)).sort()) walk(`${rel}/${e}`); return; }
      if (/\.mdx?$/.test(rel) && !/(^|\/)(?:spec-template|changelog)\.md$/.test(rel)) docs.push(rel); // the changelog quotes commit subjects
    };
    for (const d of cfg.banDocs || []) walk(posix(d).replace(/^\.\//, "").replace(/\/$/, ""));
  }
  for (const rel of [...new Set([...files, ...docs])]) {
    const md = /\.mdx?$/.test(rel);
    if (!md && !CODE_EXT.test(rel) && !CSS_EXT.test(rel)) continue;
    const text = md ? readFileSync(join(cfg.root, rel), "utf8") : lex(readRel(cfg, rel), CODE_EXT.test(rel)).code;
    text.split("\n").forEach((l, i) => {
      if (/Don['\u2019]t:/.test(l)) return;
      for (const b of bans) if (b.re.test(l) && !l.includes(b.id)) report({ file: rel, line: i + 1, rule: b.id, detail: `${b.why || "banned by the person"}: ${l.trim().slice(0, 60)}` });
    });
  }
}

// Outside product names (config names) in the shipped docs pages. Each hit is a warning: it prints, and never fails.
function checkNames(cfg, report) {
  const names = (cfg.names || []).map((n) => (typeof n === "string" ? { name: n } : n)).filter((n) => n && n.name);
  if (!names.length || cfg.off.has("rule/outside-name")) return;
  const res = names.map((n) => ({ ...n, re: new RegExp(`(?<![\\p{L}\\p{N}])${n.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu") }));
  const walk = (rel) => {
    const st = statSync(join(cfg.root, rel), { throwIfNoEntry: false });
    if (!st) return;
    if (st.isDirectory()) { for (const e of readdirSync(join(cfg.root, rel)).sort()) walk(`${rel}/${e}`); return; }
    if (!/\.mdx?$/.test(rel) || /(^|\/)(?:spec-template|changelog)\.md$/.test(rel)) return;
    readFileSync(join(cfg.root, rel), "utf8").split("\n").forEach((l, i) => {
      if (l.includes("rule/outside-name")) return;
      for (const n of res) if (n.re.test(l)) report({ file: rel, line: i + 1, rule: "rule/outside-name", detail: `${n.name}${n.why ? ` (${n.why})` : ""}: ${l.trim().slice(0, 60)}`, warn: true });
    });
  };
  for (const d of cfg.banDocs || []) walk(posix(d).replace(/^\.\//, "").replace(/\/$/, ""));
}

// ---------- changed lines (--changed, --diff) ----------
// Lines added or changed per file, from a unified diff: Map(file -> Set(line numbers in the new file)).
function parseDiff(text) {
  const out = new Map();
  const lines = text.split("\n");
  let file = null, line = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("--- ") && (lines[i + 1] || "").startsWith("+++ ")) {
      const p = lines[i + 1].slice(4).replace(/\t.*$/, "").replace(/^"|"$/g, "");
      file = p === "/dev/null" ? null : p.replace(/^[bw]\//, "");
      if (file && !out.has(file)) out.set(file, new Set());
      line = 0; i++; continue;
    }
    const h = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(l);
    if (h) { line = Number(h[1]); continue; }
    if (!file || !line) continue;
    if (l.startsWith("+")) out.get(file).add(line++);
    else if (l.startsWith(" ")) line++;
  }
  return out;
}
// Changed lines against the merge base of ref and HEAD, with the working tree's edits. Untracked files count whole.
function gitChanged(root, ref) {
  const git = (args) => execFileSync("git", args, { cwd: root, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 << 20 }).toString();
  const base = git(["merge-base", ref, "HEAD"]).trim();
  const out = parseDiff(git(["diff", "--unified=0", "--no-color", "--no-ext-diff", "--relative", base]));
  for (const f of git(["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean)) out.set(f, "all");
  return out;
}
const FILE_RULES = new Set(["rule/stock-edit", "rule/unregistered-ui"]);
// An allowlist count: a number, or {"count": n, "removeBy": "YYYY-MM-DD"}.
const capOf = (v) => (typeof v === "number" ? v : v && typeof v === "object" ? Number(v.count) || 0 : 0);
// Allowlist rows whose removeBy date is before today (YYYY-MM-DD): [{ file, rule, key, removeBy }].
function expiredRows(allow, today) {
  const out = [];
  for (const [file, rules] of Object.entries(allow || {})) for (const [rule, v] of Object.entries(rules || {})) {
    if (!v || typeof v !== "object") continue;
    for (const [key, c] of Object.entries(v)) if (c && typeof c === "object" && /^\d{4}-\d{2}-\d{2}$/.test(c.removeBy || "") && c.removeBy < today) out.push({ file, rule, key, removeBy: c.removeBy });
  }
  return out;
}
// Per-rule counts now against the ratchet file's: which rose, which fell, and the file lowered to what fell.
function ratchetCompare(old, now) {
  const rose = [], fell = [], next = {};
  for (const r of [...new Set([...Object.keys(old), ...Object.keys(now)])].sort()) {
    const a = Number(old[r]) || 0, b = now[r] || 0;
    if (b > a) rose.push([r, a, b]);
    else if (b < a) fell.push([r, a, b]);
    if (r in old && Math.min(a, b) > 0) next[r] = Math.min(a, b);
  }
  return { rose, fell, next };
}
const ratchetCounts = (findings) => { const c = {}; for (const f of findings) if (!f.warn) c[f.rule] = (c[f.rule] || 0) + 1; return c; };
// Findings as a Markdown table, for a job summary.
function summaryMarkdown(title, list, extra = []) {
  const cell = (x) => String(x).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  const rows = list.map((f) => `| \`${cell(f.file)}\` | ${f.line} | \`${f.rule}\` | ${cell(shown(f))} | ${cell(fixFor(f.rule))} |`);
  return `### ${title}\n\n${rows.length ? `| File | Line | Rule | Found | Fix |\n|---|---|---|---|---|\n${rows.join("\n")}\n` : "Nothing found.\n"}${extra.length ? `\n${extra.map((e) => `- ${cell(e)}`).join("\n")}\n` : ""}\n`;
}
// The findings a change adds: on a changed line (a file-level rule on any changed file), and past the allowlist's
// count for that file, rule and literal. With changed null, every line counts.
function newFindings(findings, changed, allow) {
  const hit = (f) => { if (!changed) return true; const c = changed.get(f.file); return !!c && (c === "all" || FILE_RULES.has(f.rule) || c.has(f.line)); };
  const groups = new Map();
  for (const f of findings) { const k = `${f.file}\t${f.rule}\t${f.key}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
  const out = [];
  for (const [k, list] of groups) {
    const [file, rule, key] = k.split("\t");
    const entry = allow[file]?.[rule];
    const over = list.length - (typeof entry === "number" ? entry : capOf(entry?.[key]));
    if (over > 0) out.push(...list.filter(hit).slice(0, over));
  }
  return out.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));
}

// Custom properties the code reads that nothing in the repo defines and a dependency's code sets: a headless
// library sets them on its parts at runtime (swipe offsets, anchor sizes, panel heights). A name the library only
// mentions or reads is the app's to define, so it stays reported. Each comes back as its full name, or as a prefix
// such as --toast- when the library builds the name from that prefix, with the package that sets it. Each file is
// tested as it is read and dropped; the walk stops at a file and byte budget.
function libraryVars(cfg, tokenFiles) {
  const defined = new Set(), read = new Map();
  for (const rel of [...listFiles(cfg), ...tokenFiles]) {
    const text = readRel(cfg, rel);
    for (const m of text.matchAll(/(?:^|[;{\s"'`])(--[\w-]+)["'`]?\s*:/g)) defined.add(m[1]);
    for (const m of text.matchAll(/setProperty\(\s*["'`](--[\w-]+)/g)) defined.add(m[1]);
    for (const m of text.matchAll(/var\(\s*(--[\w-]+)\s*\)|-\((--[\w-]+)\)/g)) { const n = m[1] || m[2]; if (!read.has(n)) read.set(n, rel); }
  }
  const open = new Set([...read.keys()].filter((n) => !defined.has(n) && !cfg.varIgnore.some((p) => n.startsWith(p))));
  if (!open.size) return [];
  let pkg = {};
  try { pkg = readJSON(join(cfg.root, "package.json")); } catch {}
  const deps = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}), ...(pkg.peerDependencies || {}) });
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const out = [];
  let bytes = 64e6;
  // A file sets a name when it declares it (--x: in CSS, "--x": in a style object) or passes it to setProperty. It
  // sets a family when it builds names from a literal prefix: `--x-${k}` or "--x-" + k.
  const test = (d, text) => {
    for (const m of text.matchAll(/["'`](--[\w-]+-)(?:\$\{|["'`]\s*\+)/g)) {
      for (const n of [...open]) if (n.startsWith(m[1])) { out.push({ name: n, prefix: m[1], pkg: d }); open.delete(n); }
    }
    for (const n of [...open]) {
      if (!text.includes(n)) continue;
      const q = esc(n);
      if (new RegExp(`(?:^|[;{\\s"'\`])${q}["'\`]?\\s*:|setProperty\\(\\s*["'\`]${q}["'\`]`).test(text)) { out.push({ name: n, prefix: n, pkg: d }); open.delete(n); }
    }
  };
  for (const d of deps) {
    const base = join(cfg.root, "node_modules", d);
    let files = 3000;
    const walkPkg = (abs) => {
      if (files <= 0 || bytes <= 0 || !open.size) return;
      const st = statSync(abs, { throwIfNoEntry: false });
      if (!st) return;
      if (st.isDirectory()) { if (/(?:^|\/)node_modules$/.test(abs) && abs !== base) return; for (const e of readdirSync(abs)) walkPkg(join(abs, e)); return; }
      if (!/\.(?:[cm]?js|css)$/.test(abs) || st.size > 4e6) return;
      files--;
      bytes -= st.size;
      test(d, readFileSync(abs, "utf8"));
    };
    walkPkg(base);
  }
  return out;
}

// ---------- self-test ----------
// Built-in planted cases: one failing and one passing folder per rule, with the exact count the failing folder
// must produce. A repo adds its own for the rules it adds, in the same shape (see --help, Planted cases).
const BUILTIN = [
  {"rule": "rule/raw-value", "config": {"tokenSources": ["tokens.css"]}, "expect": {"rule/raw-value": 5}, "fail": {"card.tsx": "export function Card() {\n  return (\n    <div\n      style={{ background: \"#f5f5f5\" }}\n      data-accent=\"oklch(0.62 0.19 256)\"\n    >\n      <p style={{ color: 'rgb(17, 17, 17)' }}>Total</p>\n    </div>\n  );\n}\n", "styles.css": ".card { border-color: hsl(0 0% 90%); }\n", "tw.ts": "export const raised = \"shadow-[0_1px_2px_rgba(0,0,0,0.08)]\";\n"}, "pass": {"card.tsx": "// Order #123 in a comment is not a color: #fff\nexport function Card() {\n  return (\n    <div className=\"bg-muted text-foreground shadow-sm\" style={{ color: \"var(--foreground)\" }}>\n      <a href=\"#main\">Order #123</a>\n    </div>\n  );\n}\n", "tokens.css": ":root {\n  --background: oklch(1 0 0);\n  --foreground: oklch(0.15 0 0);\n  --border: oklch(0.92 0 0);\n  --muted: #f5f5f5;\n}\n.card { border-color: var(--border); }\n"}},
  {"rule": "rule/palette-use", "expect": {"rule/palette-use": 3}, "fail": {"note.tsx": "export function Note() {\n  return <p className=\"text-gray-500 dark:bg-blue-600/50\" style={{ color: \"var(--color-teal-700)\" }}>Saved</p>;\n}\n"}, "pass": {"note.tsx": "export function Note() {\n  return <p className=\"text-muted-foreground bg-primary/80 bg-black/10\">Saved</p>;\n}\n"}},
  {"rule": "rule/arbitrary-value", "config": {"tokenSources": ["tokens.css"]}, "expect": {"rule/arbitrary-value": 4}, "fail": {"row.tsx": "export function Row() {\n  return (\n    <div className=\"p-[13px] hover:text-[13px]\">\n      <span className={cn(\"rounded-[14px]\", \"[mask-type:luminance]\")} />\n    </div>\n  );\n}\n"}, "pass": {"row.tsx": "export function Row() {\n  return (\n    <div className=\"p-3 text-sm data-[state=open]:bg-muted w-[var(--sidebar-width)] bg-(--brand) [&_svg]:size-4\">\n      <a href=\"/projects/[id]\">Open</a>\n    </div>\n  );\n}\n", "tokens.css": ":root {\n  --sidebar-width: 16rem;\n  --brand: var(--primary);\n  --primary: oklch(0.5 0.2 250);\n}\n"}},
  {"rule": "rule/named-color", "config": {"tokenSources": ["tokens.css"]}, "expect": {"rule/named-color": 5}, "fail": {"badge.css": ".badge { color: tomato; }\n", "badge.tsx": "export function Badge() {\n  return (\n    <span style={{ color: 'teal', background: \"red\" }}>\n      <svg fill=\"black\" />\n      <i style={{ borderColor: `navy` }} />\n    </span>\n  );\n}\n"}, "pass": {"badge.css": ".badge { color: var(--foreground); background: transparent; }\n", "badge.tsx": "export function Badge({ tone = \"red\" }) {\n  const label = \"red\";\n  return (\n    <span data-tone={tone} style={{ color: \"currentColor\", background: \"transparent\", borderColor: 'inherit' }}>\n      <svg fill=\"currentColor\" />\n      {label} white paper\n    </span>\n  );\n}\n", "tokens.css": ":root {\n  --foreground: oklch(0.15 0 0);\n}\n"}},
  {"rule": "rule/inline-px", "expect": {"rule/inline-px": 4}, "fail": {"panel.tsx": "export function Panel() {\n  return (\n    <section\n      style={{\n        padding: 12,\n        borderRadius: \"8px\",\n        maxWidth: 720,\n        margin: \"4px 0\",\n      }}\n    />\n  );\n}\n"}, "pass": {"panel.tsx": "export function Panel() {\n  return <section className=\"p-3\" style={{ padding: 0, lineHeight: 1.5, width: \"100%\", gridTemplateColumns: \"1fr 2fr\", opacity: 0.5, margin: \"0 auto\" }} />;\n}\n"}},
  {"rule": "rule/css-px", "config": {"tokenSources": ["tokens.css"]}, "expect": {"rule/css-px": 5}, "fail": {"app.css": ".page { max-width: 1040px; padding: 24px var(--space-4); }\n.logo {\n  font-size: 18px;\n  border-radius: 6px;\n}\n.row { gap: 12px; }\n"}, "pass": {"app.css": ":root { --space-4: 1rem; --radius-sm: 6px; }\n@media (min-width: 768px) { .page { padding: var(--space-4); } }\n.divider { height: 1px; margin: 0 0 -1px; border: 1px solid var(--border); }\n.logo { font-size: var(--text-lg); border-radius: var(--radius-sm); }\n", "tokens.css": ":root {\n  --border: oklch(0.92 0 0);\n  --text-lg: 1.125rem;\n}\n"}},
  {"rule": "rule/token-parity", "config": {"tokenSources": ["globals.css"]}, "expect": {"rule/token-parity": 5}, "fail": {"globals.css": "@theme inline {\n  --color-background: var(--background);\n  --color-muted-foreground: var(--muted-foreground);\n}\n:root {\n  --background: oklch(1 0 0);\n  --muted-fg: oklch(0.55 0 0);\n}\n.dark {\n  --background: oklch(0.15 0 0);\n  --muted-foreground: oklch(0.7 0 0);\n}\n.card { border-color: var(--border); }\n", "page.tsx": "export function Page() {\n  return <p className=\"bg-(--surface-raised)\" style={{ color: \"var(--text-subtle)\" }}>Hi</p>;\n}\n"}, "pass": {"globals.css": "@theme inline {\n  --color-background: var(--background);\n  --color-muted-foreground: var(--muted-foreground);\n}\n:root {\n  --background: oklch(1 0 0);\n  --muted-foreground: oklch(0.55 0 0);\n  --radius: 0.625rem;\n  --border: oklch(0.92 0 0);\n}\n.dark {\n  --background: oklch(0.15 0 0);\n  --muted-foreground: oklch(0.7 0 0);\n  --border: oklch(1 0 0 / 10%);\n}\n.card { border-color: var(--border); border-radius: var(--radius); outline-color: var(--ring, currentColor); }\n", "page.tsx": "export function Page({ w }) {\n  return (\n    <div style={{ \"--panel-w\": `${w}px` }}>\n      <p className=\"w-(--panel-w) origin-(--transform-origin)\" style={{ color: \"var(--muted-foreground)\" }}>Hi</p>\n    </div>\n  );\n}\n"}},
  {"rule": "rule/doubled-utility", "expect": {"rule/doubled-utility": 3}, "fail": {"card.tsx": "export function Card({ title, children }) {\n  return (\n    <div className=\"rounded-lg border border-border-strong bg-bg-subtle p-4\">\n      <h3 className=\"text-sm font-medium\">{title}</h3>\n      <p className=\"hover:text-text-muted\">{children}</p>\n    </div>\n  );\n}\n"}, "pass": {"card.tsx": "export function Card({ title, children }) {\n  return (\n    <div className=\"rounded-lg border border-border bg-muted p-4\">\n      <h3 className=\"text-sm text-foreground font-medium\">{title}</h3>\n      <p className=\"text-muted-foreground hover:text-fg-muted border-edge\">{children}</p>\n    </div>\n  );\n}\n"}},
  {"rule": "trap/button-div", "expect": {"trap/button-div": 8}, "fail": {"list.tsx": "export function List({ open, items }) {\n  return (\n    <ul>\n      <div\n        className=\"row\"\n        onClick={() => open()}\n      >\n        Row\n      </div>\n      <span onClick={open}>More</span>\n      <a onClick={open}>Details</a>\n      {items.map((i) => <li key={i} onClick={() => open(i)}>{i}</li>)}\n      <li onPointerDown={open}>Pressed row</li>\n      <span onMouseDown={open}>Mouse only</span>\n      <div\n        tabIndex={0}\n        onKeyDown={(e) => e.key === \"Enter\" && open()}\n      >\n        Keyboard row\n      </div>\n      <dialog open onClick={open}>No keyboard path</dialog>\n    </ul>\n  );\n}\n"}, "pass": {"list.tsx": "export function List({ open, track, onKey, close, dialogRef }) {\n  return (\n    <div onKeyDown={onKey}>\n      <Button type=\"button\" onClick={open}>Row</Button>\n      <a href=\"/projects\" onClick={track}>Projects</a>\n      <div role=\"tab\" tabIndex={0} aria-selected=\"true\" onClick={open}>Tab</div>\n      <li role=\"option\" aria-selected=\"false\" onMouseDown={open}>Option</li>\n      <div tabIndex={-1} onKeyDown={onKey}>Scroll region</div>\n      <Card onClick={open} />\n      <dialog\n        ref={dialogRef}\n        onClick={(e) => e.target === dialogRef.current && close()}\n        onCancel={close}\n      >\n        Backdrop click closes, Escape fires cancel\n      </dialog>\n    </div>\n  );\n}\n"}},
  {"rule": "trap/role-button", "expect": {"trap/role-button": 3}, "fail": {"actions.tsx": "export function Actions() {\n  return (\n    <>\n      <div role=\"button\" tabIndex={0}>Save</div>\n      <a role='button' href=\"#\">Cancel</a>\n      <Link\n        href=\"/settings\"\n        role={\"button\"}\n      >\n        Settings\n      </Link>\n    </>\n  );\n}\n"}, "pass": {"actions.tsx": "export function Actions() {\n  return (\n    <>\n      <Button type=\"button\">Save</Button>\n      <div role=\"tab\" aria-selected=\"false\">Cancel</div>\n      <Link href=\"/settings\">Settings</Link>\n    </>\n  );\n}\n"}},
  {"rule": "trap/label-unbound", "expect": {"trap/label-unbound": 2}, "fail": {"settings.tsx": "import { Label } from \"@/components/ui/label\";\nimport { Input } from \"@/components/ui/input\";\n\nexport function Settings() {\n  return (\n    <form>\n      <Label>Name</Label>\n      <Input id=\"name\" />\n      <label className=\"text-sm\">Time zone</label>\n      <select id=\"tz\"><option>UTC</option></select>\n    </form>\n  );\n}\n"}, "pass": {"settings.tsx": "import { Label } from \"@/components/ui/label\";\nimport { Input } from \"@/components/ui/input\";\nimport { Checkbox } from \"@/components/ui/checkbox\";\n\nexport function Settings(props: { className?: string }) {\n  return (\n    <form>\n      <Label htmlFor=\"name\">Name</Label>\n      <Input id=\"name\" />\n      <Label>\n        <Checkbox /> Email me\n      </Label>\n      <label>\n        Time zone <select><option>UTC</option></select>\n      </label>\n      <Label {...props}>Role</Label>\n    </form>\n  );\n}\n"}},
  {"rule": "trap/loading-label-swap", "expect": {"trap/loading-label-swap": 3}, "fail": {"save.tsx": "export function Save({ saving, isPending, loading, save }) {\n  return (\n    <form>\n      <button type=\"submit\" disabled={saving}>{saving ? \"Saving…\" : \"Save\"}</button>\n      <Button disabled={isPending}>\n        {isPending ? <Spinner /> : \"Send invite\"}\n      </Button>\n      <Button onClick={save}>{loading ? \"Please wait\" : \"Continue\"}</Button>\n    </form>\n  );\n}\n"}, "pass": {"save.tsx": "export function Save({ saving, open, toggle }) {\n  return (\n    <form>\n      <Button type=\"submit\" loading={saving}>Save</Button>\n      <Button type=\"button\" onClick={toggle} aria-expanded={open}>{open ? \"Hide details\" : \"Show details\"}</Button>\n      <Button type=\"button\" aria-busy={saving}>{saving && <Spinner />} Export</Button>\n    </form>\n  );\n}\n", "stacked.tsx": "export function Publish({ publishing }) {\n  return (\n    <Button type=\"submit\" aria-busy={publishing} aria-disabled={publishing}>\n      <span className=\"grid\">\n        <span className={publishing ? \"invisible col-start-1 row-start-1\" : \"col-start-1 row-start-1\"}>Publish</span>\n        <span aria-hidden={!publishing} className={publishing ? \"col-start-1 row-start-1\" : \"invisible col-start-1 row-start-1\"}>Publishing</span>\n      </span>\n    </Button>\n  );\n}\n"}},
  {"rule": "trap/overlay-conditional-render", "expect": {"trap/overlay-conditional-render": 3}, "fail": {"team.tsx": "export function Team({ inviteOpen, setInviteOpen, confirm, menu }) {\n  return (\n    <section>\n      {inviteOpen && (\n        <Dialog open onOpenChange={(open) => !open && setInviteOpen(false)}>\n          <DialogContent>Invite</DialogContent>\n        </Dialog>\n      )}\n      {confirm && <AlertDialog open>Delete?</AlertDialog>}\n      {menu ? <Popover open>Menu</Popover> : null}\n    </section>\n  );\n}\n"}, "pass": {"team.tsx": "export function Team({ inviteOpen, setInviteOpen, error }) {\n  return (\n    <section>\n      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>\n        <DialogContent>\n          {error && <DialogDescription>{error}</DialogDescription>}\n        </DialogContent>\n      </Dialog>\n      {/* {open && <Dialog>} in a comment is not code */}\n      <p>{\"a && <Dialog> inside a string\"}</p>\n    </section>\n  );\n}\n"}},
  {"rule": "trap/motion-transition-all", "expect": {"trap/motion-transition-all": 5}, "fail": {"app.css": ".card { transition: all 200ms ease-out; }\n.row { transition-property: all; }\n.chip { @apply transition-all; }\n", "card.tsx": "export function Card() {\n  return <div className=\"rounded transition-all duration-200\" style={{ transition: \"all 0.2s\" }} />;\n}\n"}, "pass": {"app.css": ".card { transition: transform 200ms ease-out, opacity 200ms ease-out; }\n.row { transition-property: opacity; }\n", "card.tsx": "export function Card() {\n  return <div className=\"all-caps transition-transform duration-200\" style={{ transition: \"opacity 0.2s\" }} />;\n}\n"}},
  {"rule": "trap/motion-overshoot", "expect": {"trap/motion-overshoot": 4}, "fail": {"app.css": ".pop { transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1); }\n.dip { animation-timing-function: cubic-bezier(.5, -0.4, .5, 1); }\n", "pop.tsx": "import { motion } from \"motion/react\";\n\nexport function Pop() {\n  return <motion.div className=\"ease-[cubic-bezier(0.3,1.4,0.5,1)]\" transition={{ ease: [0.3, 1.4, 0.5, 1] }} />;\n}\n"}, "pass": {"app.css": ".pop { transition: transform 300ms cubic-bezier(0.2, 0, 0, 1); }\n", "pop.tsx": "import { motion } from \"motion/react\";\n\nexport function Pop() {\n  return <motion.div style={{ transitionTimingFunction: \"cubic-bezier(0.2, 0, 0, 1)\" }} transition={{ ease: [0.2, 0, 0, 1] }} />;\n}\n"}},
  {"rule": "trap/hover-unguarded", "expect": {"trap/hover-unguarded": 4}, "fail": {"app.css": ".card:hover .actions { opacity: 1; }\n.menu:hover > .submenu { display: block; }\n.tip:hover::after { opacity: 1; }\n.row:hover { visibility: visible; }\n"}, "pass": {"app.css": ".btn:hover { opacity: 0.9; }\n.link:hover { text-decoration: underline; }\n@media (hover: hover) {\n  .card:hover .actions { opacity: 1; }\n  .menu:hover > .submenu { display: block; }\n}\n"}},
  {"rule": "trap/viewport-height", "expect": {"trap/viewport-height": 4}, "fail": {"app.css": ".shell { height: 100vh; }\n.sheet { max-height: calc(100vh - 2rem); }\n", "shell.tsx": "export function Shell() {\n  return (\n    <div className=\"flex h-screen flex-col\">\n      <aside style={{ height: \"100vh\" }} />\n    </div>\n  );\n}\n"}, "pass": {"app.css": ".shell { height: 100vh; height: 100dvh; }\n.page { min-height: 100vh; }\n.sheet { max-height: calc(100dvh - 2rem); }\n", "shell.tsx": "export function Shell() {\n  return (\n    <div className=\"flex min-h-screen flex-col\">\n      <main className=\"min-h-dvh\" />\n      <aside className=\"h-screen h-dvh\" />\n    </div>\n  );\n}\n"}},
  {"rule": "trap/zoom-disabled", "expect": {"trap/zoom-disabled": 4}, "fail": {"app/layout.tsx": "export const viewport = { width: \"device-width\", initialScale: 1, maximumScale: 1, userScalable: false };\n", "index.html": "<!doctype html>\n<html><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no\"></head><body></body></html>\n"}, "pass": {"app/layout.tsx": "export const viewport = { width: \"device-width\", initialScale: 1, maximumScale: 5 };\n", "index.html": "<!doctype html>\n<html><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head><body></body></html>\n"}},
  {"rule": "trap/native-control", "config": {"uiDir": "ui", "nativeControls": {"button": "Button", "input": "Input", "select": "Select"}}, "expect": {"trap/native-control": 3}, "fail": {"invite.tsx": "export function Invite() {\n  return (\n    <form>\n      <input type=\"email\" name=\"email\" />\n      <select name=\"role\"><option>Admin</option></select>\n      <button\n        type=\"submit\"\n      >\n        Send\n      </button>\n    </form>\n  );\n}\n"}, "pass": {"invite.tsx": "import { Button } from \"./ui/button\";\nexport function Invite() {\n  return (\n    <form>\n      <input type=\"hidden\" name=\"token\" value=\"x\" />\n      <Input type=\"email\" name=\"email\" />\n      <Button type=\"submit\">Send</Button>\n    </form>\n  );\n}\n", "registry.json": "{ \"components\": [ { \"id\": \"button\", \"source\": \"ui/button.tsx\" } ] }\n", "ui/button.tsx": "export function Button(props) {\n  return <button className=\"rounded-md bg-primary px-3\" {...props} />;\n}\n"}},
];

const writeTree = (root, files) => { for (const [f, text] of Object.entries(files)) { mkdirSync(dirname(join(root, f)), { recursive: true }); writeFileSync(join(root, f), text); } };
const defaultFixtures = () => join(dirname(fileURLToPath(import.meta.url)), "fixtures", "check-system");
function judge(spec, kind, root, fixtures) {
  const cfg = loadConfig(root, null, { include: ["."], exclude: DEFAULTS.exclude, fixtures, ...(spec.config || {}), ...(spec[`${kind}Config`] || {}) });
  let found = scan(cfg);
  // A changed-lines case: the folder's diff and allowlist decide what a pull request would be warned about.
  if (spec.changed) found = newFindings(found, parseDiff(readFileSync(join(root, spec.changed), "utf8")), existsSync(join(root, cfg.allowlist)) ? readJSON(join(root, cfg.allowlist)) : {});
  const count = (r) => found.filter((f) => f.rule === r).length;
  if (kind === "pass") return { good: found.length === 0, msg: found.length ? found.map((f) => `${f.file}:${f.line} ${f.rule} ${f.detail}`).join("; ") : "0 findings" };
  const exp = spec.expect || { [spec.rule]: 1 };
  const bad = Object.entries(exp).filter(([r, k]) => count(r) !== k);
  // nearest: { "<detail or part of it>": "<token the finding must name>" }
  const near = Object.entries(spec.nearest || {}).filter(([d, tok]) => !found.some((f) => f.detail.includes(d) && (f.nearest || "").split(" ")[0] === tok));
  const msg = Object.entries(exp).map(([r, k]) => `${r} ${count(r)}/${k}`).join(", ") + (spec.nearest ? `, nearest ${Object.keys(spec.nearest).length - near.length}/${Object.keys(spec.nearest).length}${near.length ? ` (missed ${near.map(([d, t]) => `${d} -> ${t}: got ${found.filter((f) => f.detail.includes(d)).map((f) => f.nearest || "none").join(", ") || "no finding"}`).join("; ")})` : ""}` : "");
  return { good: !bad.length && !near.length, msg };
}
function selfTest(dirArg) {
  let ok = true, n = 0;
  const report = (label, kind, r) => { n++; if (!r.good) ok = false; console.log(`self-test ${r.good ? "ok  " : "FAIL"} ${label} ${kind}: ${r.msg}`); };
  const tmp = realpathSync(mkdtempSync(join(tmpdir(), "check-system-cases-")));
  try {
    BUILTIN.forEach((spec, i) => {
      for (const kind of ["fail", "pass"]) {
        const root = join(tmp, String(i), kind);
        mkdirSync(root, { recursive: true });
        writeTree(root, spec[kind]);
        report(spec.rule, kind, judge(spec, kind, root, false));
      }
    });
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  // The repo's own planted cases, from --fixtures <dir> or a fixtures/check-system/ folder beside this script.
  const dir = dirArg ? resolve(dirArg) : defaultFixtures();
  if (dirArg && !existsSync(dir)) { console.log(`self-test: FAIL, no planted cases at ${dir}`); ok = false; }
  else if (existsSync(dir)) {
    for (const c of readdirSync(dir).sort()) {
      const caseFile = join(dir, c, "case.json");
      if (!existsSync(caseFile)) continue;
      const spec = readJSON(caseFile);
      for (const kind of ["fail", "pass"]) {
        const root = join(dir, c, kind);
        if (!existsSync(root)) { console.log(`self-test: ${c}/${kind} missing`); ok = false; continue; }
        report(`${spec.rule} (${c})`, kind, judge(spec, kind, root, true));
      }
    }
  }
  const u = unitTests();
  console.log(`self-test: ${n} planted cases and ${u.n} checks, ${ok && u.ok ? "all as expected" : "FAILED"}`);
  return ok && u.ok;
}

// Checks that are not one rule on one case: the traps list, the allowlist, ratchet and summary helpers, the CLI
// modes on a small app written to a temp folder, and --init on a namespaced system install.
const CLI_APP = {
  "app/globals.css": ":root {\n  --background: #0a0a0a;\n  --foreground: #fafafa;\n}\n",
  "app/page.tsx": 'export default function Page() {\n  return <div style={{ color: "#fafafa", background: "#0a0a0a" }} />;\n}\n',
  "scripts/check-allowlist.json": '{\n  "app/page.tsx": {\n    "rule/raw-value": {\n      "#fafafa": { "count": 1, "removeBy": "2000-01-01" },\n      "#0a0a0a": 1\n    }\n  }\n}\n',
  "scripts/check-ratchet.json": '{ "rule/raw-value": 1 }\n',
  "scripts/check-system.config.json": '{ "include": ["app"], "tokenSources": ["app/globals.css"] }\n',
};
const INIT_APP = {
  ".agents/skills/brand/SKILL.md": "---\nname: brand\ndescription: Build UI with the installed system.\n---\n",
  "app/page.tsx": 'import { Button } from "@/components/brand/ui/button";\nimport { Sheet } from "@/components/brand/ui/sheet";\nexport default function Page() {\n  return <Sheet><Button>Save</Button></Sheet>;\n}\n',
  "components/brand/tokens.css": '[data-system="brand"], .brand {\n  --surface: oklch(0.99 0 0);\n  --on-surface: oklch(0.2 0 0);\n  --space-4: 1rem;\n}\n',
  "components/brand/ui/button.tsx": 'export function Button(props: React.ComponentProps<"button">) {\n  return <button className="bg-(--surface) text-(--on-surface) p-(--space-4)" {...props} />;\n}\n',
  "components/brand/ui/sheet.tsx": 'export function Sheet({ children }: { children: React.ReactNode }) {\n  return (\n    <div className="translate-y-(--drawer-swipe-movement-y) bottom-(--sheet-offset) w-(--rail-size) bg-(--surface) text-(--color-primary)">\n      {children}\n    </div>\n  );\n}\n',
  "lib/brand/lint/plugin.mjs": 'export const rules = {\n  "tokens-only": { meta: { docs: { url: "docs/system/colors.md#rule-colors-tokens-only" }, messages: { raw: "Use bg-surface instead of bg-[#ffffff] or color: #fff." } } },\n};\n',
  "package.json": '{ "name": "init-app", "private": true, "dependencies": { "headless-kit": "1.0.0" } }\n',
};
function unitTests() {
  let ok = true, n = 0;
  const t = (name, good, got) => { n++; if (!good) ok = false; console.log(`self-test ${good ? "ok  " : "FAIL"} ${name}: ${got}`); };
  const traps = join(dirname(fileURLToPath(import.meta.url)), "..", "references", "traps.md");
  if (existsSync(traps)) {
    const ids = readFileSync(traps, "utf8").split("\n").map((l) => /^\|\s*`(trap\/[a-z0-9-]+)`\s*\|/.exec(l)?.[1]).filter(Boolean);
    const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
    t("traps.md ids", ids.length > 0 && !dup.length, dup.length ? `listed twice: ${dup.join(", ")}` : `${ids.length} trap ids, each once`);
  } else console.log("self-test: no references/traps.md beside this script, so the duplicate trap id check is skipped");
  t("rules explained", Object.keys(RULES).every((r) => WHY[r]), `${Object.keys(RULES).filter((r) => !WHY[r]).join(", ") || "every rule has a why"}`);
  const rc = ratchetCompare({ "rule/a": 3, "rule/b": 2, "rule/d": 1 }, { "rule/a": 4, "rule/b": 1, "rule/c": 1 });
  t("ratchet compare", JSON.stringify(rc.rose.map((x) => x[0])) === '["rule/a","rule/c"]' && JSON.stringify(rc.fell.map((x) => x[0])) === '["rule/b","rule/d"]' && JSON.stringify(rc.next) === '{"rule/a":3,"rule/b":1}', JSON.stringify(rc));
  const ex = expiredRows({ "a.tsx": { "rule/raw-value": { "#fff": { count: 1, removeBy: "2000-01-01" }, "#000": { count: 1, removeBy: "2999-01-01" }, "#111": 2 } }, "b.tsx": { "rule/css-px": 3 } }, "2026-01-01");
  t("removeBy expiry", ex.length === 1 && ex[0].key === "#fff" && capOf({ count: 2 }) === 2 && capOf(3) === 3, JSON.stringify(ex));
  const md = summaryMarkdown("t", [{ file: "a|b.tsx", line: 2, rule: "rule/raw-value", detail: "#fff", nearest: "--bg (deltaE 0.0)" }]);
  t("summary markdown", md.includes("| `a\\|b.tsx` | 2 | `rule/raw-value` | #fff (nearest token --bg (deltaE 0.0)) |"), md.split("\n")[4] || md);
  const lintDir = realpathSync(mkdtempSync(join(tmpdir(), "check-system-lint-")));
  try {
    writeFileSync(join(lintDir, "xlint.config.mjs"), "export default [];\n");
    const none = loadConfig(lintDir, null, { include: ["."] });
    mkdirSync(join(lintDir, "components", "brand"), { recursive: true });
    writeFileSync(join(lintDir, "xlint.config.mjs"), 'import brand from "./brand.xlint.config.mjs";\nexport default [...brand];\n');
    const merged = loadConfig(lintDir, null, { include: ["."] });
    writeFileSync(join(lintDir, "brand.xlint.config.mjs"), "export default [];\n");
    const lc = loadConfig(lintDir, null, { include: ["."] });
    const lo = loadConfig(lintDir, null, { include: ["."], projectLint: false });
    const skips = (c) => PROJECT_LINT_RULES.every((r) => c.off.has(r));
    t("a design lint skips its rules", !skips(none) && skips(merged) && skips(lc) && !PROJECT_LINT_RULES.some((r) => lo.off.has(r)) && merged.notes.some((x) => /^xlint\.config\.mjs runs a design lint/.test(x)) && lc.notes.some((x) => /^brand\.xlint\.config\.mjs \(brand's lint\) runs a design lint/.test(x)), lc.notes.find((x) => /design lint/.test(x)) || "no note");
  } finally { rmSync(lintDir, { recursive: true, force: true }); }
  const tmp = realpathSync(mkdtempSync(join(tmpdir(), "check-system-")));
  try {
    writeTree(tmp, CLI_APP);
    const run = (...a) => { const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--root", tmp, "--no-self-test", ...a], { cwd: tmp, encoding: "utf8", env: { ...process.env, GITHUB_ACTIONS: "" } }); return { code: r.status, out: (r.stdout || "") + (r.stderr || "") }; };
    let r = run("--files", "app/page.tsx");
    t("--files honours the allowlist", r.code === 0 && /2 allowlisted/.test(r.out), `exit ${r.code}, ${r.out.split("\n").find((l) => l.startsWith("check-system:")) || r.out.slice(0, 200)}`);
    t("removeBy warns", /warning: .*"#fafafa" passed its removeBy date 2000-01-01/.test(r.out) && !/"#0a0a0a" passed/.test(r.out), r.out.split("\n").find((l) => /removeBy/.test(l)) || "no warning");
    r = run("--files", "app/page.tsx", "--no-allowlist");
    t("--no-allowlist fails", r.code === 1 && /nearest token --foreground/.test(r.out), `exit ${r.code}, ${r.out.split("\n")[0]}`);
    r = run("--ratchet", "scripts/check-ratchet.json");
    t("--ratchet fails on a rise", r.code === 1 && /rule\/raw-value rose 1 -> 2/.test(r.out), `exit ${r.code}, ${r.out.split("\n")[0]}`);
    r = run("--ratchet", "scripts/check-ratchet.json", "--warn");
    t("--ratchet --warn exits 0", r.code === 0 && /warning: ratchet: rule\/raw-value rose/.test(r.out), `exit ${r.code}, ${r.out.split("\n")[0]}`);
    writeFileSync(join(tmp, "scripts/high.json"), '{ "rule/raw-value": 5, "rule/css-px": 2 }\n');
    r = run("--ratchet", "scripts/high.json", "--ratchet-update");
    const high = readFileSync(join(tmp, "scripts/high.json"), "utf8");
    t("--ratchet-update lowers", r.code === 0 && JSON.stringify(JSON.parse(high)) === '{"rule/raw-value":2}', `exit ${r.code}, file ${high.replace(/\s+/g, " ").trim()}`);
    r = run("--ratchet", "scripts/new.json");
    t("--ratchet starts a file", r.code === 0 && existsSync(join(tmp, "scripts/new.json")), `exit ${r.code}, ${r.out.split("\n")[0]}`);
    r = run("--warn", "--no-allowlist", "--summary", join(tmp, "summary.md"));
    const sum = existsSync(join(tmp, "summary.md")) ? readFileSync(join(tmp, "summary.md"), "utf8") : "";
    t("--summary writes every finding", r.code === 0 && (sum.match(/`rule\/raw-value`/g) || []).length === 2, `exit ${r.code}, ${(sum.match(/`rule\/raw-value`/g) || []).length} rows`);
    r = run("--explain", "trap/viewport-height");
    t("--explain", r.code === 0 && /^Why: \S/m.test(r.out) && /^Fix: \S/m.test(r.out), r.out.split("\n").slice(0, 2).join(" / "));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  // --init on a namespaced registry install: components/<name>/ui, a scoped tokens.css, the system's lint plugin
  // in lib/<name>/lint, no registry.json, and a dependency that sets a custom property at runtime.
  const it = realpathSync(mkdtempSync(join(tmpdir(), "check-system-init-")));
  try {
    writeTree(it, INIT_APP);
    mkdirSync(join(it, "node_modules", "headless-kit"), { recursive: true });
    writeFileSync(join(it, "node_modules", "headless-kit", "package.json"), '{ "name": "headless-kit", "main": "index.js" }\n');
    // It sets --sheet-offset by name and the --rail- family from a prefix, and only reads --color-primary, which
    // stays the app's to define.
    writeFileSync(join(it, "node_modules", "headless-kit", "index.js"), 'export const pin = (el, y) => el.style.setProperty("--sheet-offset", `${y}px`);\nexport const rail = (el, k, v) => el.style.setProperty(`--rail-${k}`, v);\nexport const tint = "color: var(--color-primary)";\n');
    const run = (...a) => { const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--root", it, "--no-self-test", ...a], { cwd: it, encoding: "utf8", env: { ...process.env, GITHUB_ACTIONS: "" } }); return { code: r.status, out: (r.stdout || "") + (r.stderr || "") }; };
    let r = run("--init");
    let c = {};
    try { c = JSON.parse(readFileSync(join(it, "scripts/check-system.config.json"), "utf8")); } catch {}
    t("--init finds a namespaced install", r.code === 0 && c.uiDir === "components/brand/ui" && (c.tokenSources || []).includes("components/brand/tokens.css") && JSON.stringify([...(c.varIgnore || [])].sort()) === '["--rail-","--sheet-offset"]', `exit ${r.code}, uiDir ${c.uiDir}, tokenSources ${JSON.stringify(c.tokenSources)}, varIgnore ${JSON.stringify(c.varIgnore)}`);
    r = run("--no-allowlist");
    const lines = r.out.split("\n").filter((l) => /^\S+:\d+ /.test(l));
    t("an installed system reports only the undefined app token", lines.length === 1 && /rule\/token-parity/.test(lines[0]) && /--color-primary is used and never defined/.test(lines[0]) && !/rule\/unregistered-ui|lib\/brand\/lint|--sheet-offset|--rail-size|--drawer-/.test(r.out.replace(/^note: .*$/gm, "")), `exit ${r.code}, ${lines.slice(0, 3).join(" | ") || r.out.split("\n")[0]}`);
  } finally { rmSync(it, { recursive: true, force: true }); }
  return { ok, n };
}

// ---------- CLI ----------
const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
// The values after a flag, up to the next flag.
const listAfter = (f) => { const i = argv.indexOf(f); if (i < 0) return null; const out = []; for (let k = i + 1; k < argv.length && !argv[k].startsWith("--"); k++) out.push(argv[k]); return out; };
if (flag("--help") || flag("-h")) { console.log(HELP); process.exit(0); }
if (flag("--list-rules")) { for (const [id, [rule, fix]] of Object.entries(RULES)) console.log(`${id}\t${rule}. Fix: ${fix}.`); process.exit(0); }
if (flag("--list-blind-spots")) { BLIND.forEach((b) => console.log(b)); process.exit(0); }
if (flag("--explain") && RULES[val("--explain")]) {
  const id = val("--explain");
  console.log(`${id}\nRule: ${RULES[id][0]}.\nWhy: ${whyFor(id)}\nFix: ${RULES[id][1]}.`);
  process.exit(0);
}

// --root, else the git root of the first path argument, else of the current folder, else the current folder.
function repoRoot(rootFlag, firstPath) {
  if (rootFlag) return resolve(rootFlag);
  const git = (d) => { try { return execSync("git rev-parse --show-toplevel", { cwd: d, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; } };
  if (firstPath) {
    let d = resolve(firstPath);
    while (!existsSync(d) && dirname(d) !== d) d = dirname(d);
    if (!statSync(d).isDirectory()) d = dirname(d);
    const g = git(d); if (g) return g;
  }
  return git(process.cwd()) || process.cwd();
}
const firstPath = [listAfter("--files"), listAfter("--rehash"), listAfter("--save-stock")].map((l) => l && l.find((a) => a !== val("--note"))).find(Boolean);
const root = repoRoot(val("--root"), firstPath);
// A path argument resolves against the current folder, and against the root when nothing is there.
const inRoot = (f) => { const a = resolve(f); return existsSync(a) || !existsSync(join(root, f)) ? a : join(root, f); };
if (flag("--self-test")) process.exit(selfTest(val("--fixtures")) ? 0 : 1);

if (flag("--init")) {
  const p = join(root, "scripts/check-system.config.json");
  if (existsSync(p)) { console.error(`check-system: ${p} exists. Edit it by hand.`); process.exit(2); }
  const cfg = loadConfig(root, null);
  // The default folders, plus a root styles/ folder and the ui folder when no default folder holds them.
  const include = [...DEFAULTS.include, "styles", cfg.uiDir && cfg.uiDir.split("/")[0]].filter((d, i, a) => d && a.indexOf(d) === i && existsSync(join(root, d)));
  const css = [];
  // A token file: custom properties under :root or @theme, or under any selector in a file named tokens, theme or
  // variables, or one at the top of an installed system's folder, which scopes its tokens to its own selector.
  const systemTops = [...installedSystems(cfg)].flatMap((n) => [`components/${n}`, `src/components/${n}`]);
  const tokenFile = (rel, text) => /(:root|@theme)[^{]*\{[^}]*--[\w-]+\s*:/.test(text) || ((/(?:^|\/)(?:tokens|theme|variables)\.[a-z]+$/.test(rel) || systemTops.includes(dirname(rel))) && /\{[^}]*--[\w-]+\s*:/.test(text));
  const walk = (rel) => { const abs = join(root, rel); const st = statSync(abs, { throwIfNoEntry: false }); if (!st || /node_modules|\.next|\.git/.test(rel)) return; if (st.isDirectory()) readdirSync(abs).forEach((e) => walk(rel ? `${rel}/${e}` : e)); else if (CSS_EXT.test(rel) && tokenFile(rel, readFileSync(abs, "utf8"))) css.push(rel); };
  include.forEach(walk);
  // Never write an empty value for a key a rule reads: an empty {} or [] reads as a decision. Leave the key out,
  // so the default applies at every run, and say so.
  const out = { include };
  const said = [];
  const put = (k, v, why) => { const empty = v == null || (Array.isArray(v) ? !v.length : typeof v === "object" && !Object.keys(v).length); if (empty) said.push(`${k}: ${why}`); else out[k] = v; };
  put("tokenSources", css, "no CSS file with :root or @theme custom properties found. Left out, so raw values count everywhere until you list the token files");
  put("uiDir", cfg.uiDir, "no components/ui, src/components/ui, src/ui, ui or installed components/<name>/ui folder. Left out; set it when the system's folder exists");
  const lib = libraryVars(cfg, css);
  put("varIgnore", lib.map((x) => x.prefix).filter((x, i, a) => a.indexOf(x) === i), "every custom property the code reads is defined in the repo or already ignored");
  Object.assign(out, { registry: DEFAULTS.registry, driftList: DEFAULTS.driftList, allowlist: DEFAULTS.allowlist });
  const exported = uiExports(cfg);
  put("nativeControls", cfg.nativeControls, `no Button, Input, Select, Textarea, Dialog, Checkbox or RadioGroup export found in ${cfg.uiDir || "a ui folder"}, its barrel or the registry. Left out, so each run derives it again once one exists`);
  put("buttonFile", cfg.buttonFile, "no button file in the ui folder. Left out; derived once one exists");
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(out, null, 2) + "\n");
  console.log(`wrote ${p}. Read it: tokenSources, uiDir and nativeControls are guesses.`);
  if (out.nativeControls) console.log(`nativeControls from the ui exports (${[...exported].filter((n) => /^[A-Z]/.test(n)).length} exported names): ${Object.entries(out.nativeControls).map(([k, v]) => `<${k}> -> ${v}`).join(", ")}`);
  for (const x of lib) console.log(`varIgnore ${x.prefix}: ${x.name} is read and never defined here, and ${x.pkg} sets it at runtime`);
  if (cfg.installedUi && !existsSync(join(root, cfg.registry))) console.log(`${cfg.uiDir} is an installed system's ui folder and ${cfg.registry} does not exist, so rule/unregistered-ui is skipped`);
  for (const d of cfg.exclude.filter((e) => /(?:^|\/)lib\/[^/]+\/lint$/.test(e))) console.log(`${d} is an installed system's lint plugin, so it is not scanned`);
  for (const l of said) console.log(`left at the default, ${l}`);
  process.exit(0);
}

const cfg = loadConfig(root, val("--config"));
if (flag("--explain")) {
  const id = val("--explain"), ban = (cfg.bans || []).find((b) => b && b.id === id);
  if (ban) { console.log(`${id}\nRule: the person's ban, /${ban.pattern}/, in UI code and the docs pages.\nWhy: ${ban.why || "the person banned it"}\nFix: ${fixFor(id)}.`); process.exit(0); }
  console.error(`check-system: no rule ${id || "(none given)"}. Rules: ${Object.keys(RULES).join(", ")}`);
  process.exit(2);
}

if (flag("--save-stock")) {
  const [file, upstream] = listAfter("--save-stock");
  if (!file || !upstream) { console.error("check-system: --save-stock <ui file> <upstream file or shadcn item JSON>"); process.exit(2); }
  const rel = posix(relative(root, inRoot(file)));
  const d = cfg.drift.get(rel);
  if (!d) { console.error(`check-system: ${rel} has no row in ${cfg.driftList}. Only a customized row uses a stock copy.`); process.exit(2); }
  if (!existsSync(upstream)) { console.error(`check-system: ${upstream} does not exist`); process.exit(2); }
  let text = readFileSync(upstream, "utf8");
  try {
    // shadcn's item JSON (`npx shadcn@latest view <item>`): one item, a list of items, or {items: [...]}
    const j = JSON.parse(text);
    const items = Array.isArray(j) ? j : j.items || [j];
    const files = items.flatMap((it) => it.files || []);
    const base = rel.split("/").pop();
    const f = files.find((x) => String(x.path || x.target || "").split("/").pop() === base) || (files.length === 1 ? files[0] : null);
    if (!f || typeof f.content !== "string") { console.error(`check-system: ${upstream} is JSON with no file named ${base}. Files: ${files.map((x) => x.path).join(", ") || "none"}`); process.exit(2); }
    text = f.content;
  } catch (e) { if (!(e instanceof SyntaxError)) throw e; }
  const out = stockPath(cfg, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text);
  const shared = new Set(text.split("\n").map(normLine).filter(Boolean));
  const mine = readFileSync(join(root, rel), "utf8").split("\n").map(normLine).filter(Boolean);
  console.log(`wrote ${posix(relative(root, out))}: ${mine.filter((l) => shared.has(l)).length} of ${mine.length} non-empty lines of ${rel} match upstream and are exempt${d.status === "customized" ? "" : `. The row's status is ${d.status || "empty"}, so the copy is not used until it is customized`}.`);
  process.exit(0);
}

if (flag("--hash-stock") || flag("--rehash")) {
  const p = join(root, cfg.driftList);
  if (!existsSync(p)) { console.error(`check-system: no drift list at ${p}`); process.exit(2); }
  // Files are every bare argument after --rehash except the value of --note, so either order works.
  const ri = argv.indexOf("--rehash"), ni = argv.indexOf("--note");
  const targets = ri >= 0 ? new Set(argv.slice(ri + 1).filter((a, k) => !a.startsWith("--") && ri + 1 + k !== ni + 1).map((f) => posix(relative(root, inRoot(f))))) : null;
  if (targets && !targets.size) { console.error("check-system: --rehash needs one or more files"); process.exit(2); }
  const note = (val("--note") || "").replace(/[\t\r\n]+/g, " ").trim();
  if (targets && (!note || note.startsWith("--"))) { console.error('check-system: --rehash needs --note "<what changed and why>". The note goes into each row of the drift list, so the reviewed edit is on record.'); process.exit(2); }
  let filled = 0;
  const seen = new Set();
  const out = readFileSync(p, "utf8").split("\n").map((l, i) => {
    const c = l.split("\t");
    const f = c[0]?.trim();
    if (!f || l.startsWith("#") || (i === 0 && /^file$/i.test(f)) || !existsSync(join(root, f))) return l;
    const want = targets ? targets.has(f) : !c[2]?.trim();
    if (!want) return l;
    seen.add(f);
    while (c.length < 4) c.push("");
    c[2] = sha256(join(root, f)); filled++;
    if (targets) c[3] = note;
    return c.join("\t");
  });
  writeFileSync(p, out.join("\n"));
  if (targets) {
    for (const f of targets) if (!seen.has(f)) console.error(`check-system: ${f} has no row in ${cfg.driftList}. Add one with its status and note first.`);
    console.log(`recorded ${filled} new hash(es) and the note in ${cfg.driftList}. Check each row's status, and commit it with the edit.`);
    process.exit(seen.size === targets.size ? 0 : 2);
  }
  console.log(`filled ${filled} empty sha256 cell(s) in ${cfg.driftList}. Existing hashes are never changed; use --rehash <file> after a reviewed edit.`);
  process.exit(0);
}

// The default run self-tests only when the repo keeps planted cases beside this script (or --fixtures names a
// folder), so a repo with none pays nothing for it. --self-test always runs the built-in cases.
let testOk = true;
const fixturesAt = val("--fixtures") || (existsSync(defaultFixtures()) ? null : undefined);
if (!flag("--no-self-test") && !flag("--files") && !flag("--warn") && !flag("--ratchet") && !flag("--changed") && !flag("--diff") && !flag("--init-allowlist") && !flag("--shrink-allowlist") && !flag("--prune-allowlist") && fixturesAt !== undefined) testOk = selfTest(fixturesAt);

const onlyArgs = listAfter("--files");
const only = onlyArgs ? onlyArgs.map((f) => posix(relative(root, inRoot(f)))) : null;
const outside = (only || []).filter((f) => f.startsWith("../") || f === "..");
if (outside.length) { console.error(`check-system: ${outside.join(", ")} is outside the root ${root}. Pass --root <the app's folder>.`); process.exit(2); }
// No files is never a pass: run from the wrong folder, every count is 0.
if (!only && !listFiles(cfg).length) { console.error(`check-system: no source files under ${root} in ${cfg.include.join(", ")}. Run it from inside the app, or pass --root <the app's folder>.`); process.exit(2); }
const findings = scan(cfg, only);

// The allowlist is keyed by file, rule and literal value: {"app/x.tsx": {"rule/raw-value": {"#166534": 2}}}.
// Swapping an allowed value for a new one fails, because the new literal has no entry.
const byKey = new Map();
const warnings = findings.filter((f) => f.warn);
for (const f of findings) { if (f.warn) continue; const k = `${f.file}\t${f.rule}\t${f.key}`; if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(f); }
const alPath = join(root, cfg.allowlist);

if (flag("--prune-allowlist")) {
  if (!existsSync(alPath)) { console.error(`check-system: no allowlist at ${cfg.allowlist}`); process.exit(2); }
  const al = readJSON(alPath);
  const live = new Set([...byKey.keys()]);
  const liveRule = new Set([...byKey.keys()].map((k) => k.split("\t").slice(0, 2).join("\t")));
  const gone = [];
  for (const [file, rules] of Object.entries(al)) {
    for (const [rule, v] of Object.entries(rules)) {
      if (typeof v === "number") { if (!liveRule.has(`${file}\t${rule}`)) { gone.push(`${file} ${rule} (${v})`); delete rules[rule]; } continue; }
      for (const [key, n] of Object.entries(v)) if (!live.has(`${file}\t${rule}\t${key}`)) { gone.push(`${file} ${rule} "${key}" (${capOf(n)})`); delete v[key]; }
      if (!Object.keys(v).length) delete rules[rule];
    }
    if (!Object.keys(rules).length) delete al[file];
  }
  writeFileSync(alPath, JSON.stringify(al, null, 2) + "\n");
  gone.forEach((g) => console.log(`pruned\t${g}`));
  console.log(`pruned ${gone.length} stale entr${gone.length === 1 ? "y" : "ies"} from ${cfg.allowlist}. Commit it with the close.`);
  process.exit(0);
}

if (flag("--init-allowlist") || flag("--shrink-allowlist")) {
  const exists = existsSync(alPath);
  if (flag("--init-allowlist") && exists) { console.error(`check-system: ${cfg.allowlist} exists. Use --shrink-allowlist.`); process.exit(2); }
  const old = exists ? readJSON(alPath) : null;
  const al = {};
  for (const [k, list] of [...byKey].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const [file, rule, key] = k.split("\t");
    const prev = old?.[file]?.[rule];
    const n = !old ? list.length : typeof prev === "number" ? list.length : Math.min(list.length, capOf(prev?.[key]));
    const removeBy = prev && typeof prev === "object" && prev[key]?.removeBy;
    if (n) ((al[file] ||= {})[rule] ||= {})[key] = removeBy ? { count: n, removeBy } : n;
  }
  mkdirSync(dirname(alPath), { recursive: true });
  writeFileSync(alPath, JSON.stringify(al, null, 2) + "\n");
  let total = 0;
  for (const r of Object.values(al)) for (const v of Object.values(r)) for (const n of Object.values(v)) total += capOf(n);
  console.log(`wrote ${cfg.allowlist}: ${total} allowed finding(s) in ${Object.keys(al).length} file(s), keyed by literal value`);
  process.exit(0);
}

let allow = {};
if (!flag("--no-allowlist")) {
  if (existsSync(alPath)) allow = readJSON(alPath);
  else if (!only && findings.length && !flag("--json") && !flag("--warn") && !flag("--ratchet")) console.log(`note: no allowlist at ${cfg.allowlist}. Every finding fails. Create one once with --init-allowlist.`);
}
const format = val("--format") || (process.env.GITHUB_ACTIONS === "true" ? "github" : "plain");
const esc = (s) => String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
const warnLine = (msg) => console.log(format === "github" && (flag("--warn") || process.env.GITHUB_ACTIONS === "true") ? `::warning::${esc(msg)}` : `warning: ${msg}`);
// Allowlist rows past their removeBy date: a warning on every run, never a failure.
const expired = expiredRows(allow, new Date().toISOString().slice(0, 10)).map((x) => `${cfg.allowlist}: ${x.file} ${x.rule} "${x.key}" passed its removeBy date ${x.removeBy}. Fix those findings, or move the date with a reason`);
const summaryPath = val("--summary");
const summarize = (title, list, extra = []) => { if (summaryPath) try { appendFileSync(resolve(summaryPath), summaryMarkdown(title, list, extra)); } catch (e) { console.error(`check-system: cannot write --summary ${summaryPath}: ${e.message}`); } };

// --ratchet: per-rule counts over the whole repo. Fails only when a count rises.
if (flag("--ratchet")) {
  const rp = !val("--ratchet") || val("--ratchet").startsWith("--") ? "scripts/check-ratchet.json" : val("--ratchet");
  if (only || flag("--changed") || flag("--diff")) { console.error("check-system: --ratchet counts the whole repo. Drop --files, --changed and --diff, or run them as a separate step."); process.exit(2); }
  const p = inRoot(rp), now = ratchetCounts(findings);
  expired.forEach(warnLine);
  if (!existsSync(p)) {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(Object.fromEntries(Object.entries(now).sort()), null, 2) + "\n");
    console.log(`check-system: wrote ${rp} with ${Object.keys(now).length} rule count(s), ${findings.filter((f) => !f.warn).length} finding(s). Commit it; later runs fail only when a count rises.`);
    summarize(`check-system ratchet: started at ${findings.filter((f) => !f.warn).length} finding(s)`, [], expired);
    process.exit(0);
  }
  let old;
  try { old = readJSON(p); } catch (e) { console.error(`check-system: cannot parse ${rp}: ${e.message}`); process.exit(2); }
  const { rose, fell, next } = ratchetCompare(old, now);
  for (const [r, a, b] of rose) (flag("--warn") ? warnLine : console.log)(`ratchet: ${r} rose ${a} -> ${b}. ${fixFor(r)}. List the new ones with --changed <base>`);
  for (const [r, a, b] of fell) console.log(`ratchet: ${r} fell ${a} -> ${b}`);
  if (fell.length && flag("--ratchet-update")) { writeFileSync(p, JSON.stringify(next, null, 2) + "\n"); console.log(`check-system: lowered ${rp} for ${fell.length} rule(s). Commit it.`); }
  else if (fell.length) console.log(`check-system: ${fell.length} count(s) fell. Run --ratchet-update to lock them in.`);
  summarize(`check-system ratchet: ${rose.length ? `${rose.length} rule(s) rose` : "no count rose"}`, findings.filter((f) => !f.warn && rose.some(([r]) => r === f.rule)), [...rose.map(([r, a, b]) => `${r} rose ${a} -> ${b}`), ...fell.map(([r, a, b]) => `${r} fell ${a} -> ${b}`), ...expired]);
  console.log(`check-system: ratchet ${rose.length ? `${rose.length} rule(s) rose` : "held"}${fell.length ? `, ${fell.length} fell` : ""}${rose.length && flag("--warn") ? ", reported as warnings. Exit 0" : ""}`);
  process.exit(rose.length && !flag("--warn") ? 1 : 0);
}

// --changed, --diff and --warn: what a pull request adds, as warnings (--warn) or as failures scoped to its lines.
if (flag("--changed") || flag("--diff") || flag("--warn")) {
  const warn = flag("--warn");
  const ref = val("--changed"), diffFile = val("--diff");
  let changed = null;
  if (ref || diffFile) {
    try { changed = diffFile ? parseDiff(readFileSync(diffFile === "-" ? 0 : diffFile, "utf8")) : gitChanged(root, ref); }
    catch (e) {
      const why = `check-system: cannot read the changed lines${ref ? ` against ${ref}` : ""}: ${String(e.stderr || e.message).trim().split("\n")[0]}. In CI, fetch the base branch and enough history for a merge base`;
      if (warn) { console.log(format === "github" ? `::warning::${esc(why)}` : `warning: ${why}`); process.exit(0); }
      console.error(why); process.exit(2);
    }
  }
  // GitHub reads annotation paths from the repo root, so a --root below it adds its prefix.
  let prefix = "";
  try { prefix = execFileSync("git", ["rev-parse", "--show-prefix"], { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch {}
  const list = newFindings(findings, changed, allow);
  for (const f of list) {
    const msg = `${f.rule}: ${fixFor(f.rule)}. Found: ${shown(f)}`;
    if (warn && format === "github") console.log(`::warning file=${esc(prefix + f.file).replace(/:/g, "%3A").replace(/,/g, "%2C")},line=${f.line}::${esc(msg)}`);
    else console.log(`${f.file}:${f.line} ${warn || f.warn ? "warning " : ""}${msg}`);
  }
  const hard = list.filter((f) => !f.warn).length;
  const scope = changed ? `on lines changed${ref ? ` since ${ref}` : ` in ${diffFile}`}` : "past the allowlist";
  expired.forEach(warnLine);
  summarize(`check-system: ${list.length} finding(s) ${scope}`, list, expired);
  console.log(`check-system: ${list.length} finding(s) ${scope}${warn ? ", reported as warnings. Exit 0" : ""}`);
  process.exit(warn || !hard ? 0 : 1);
}

let failed = 0, allowed = 0, legacy = 0;
const shrink = [];
const failing = [];
const printed = [];
const legacyLeft = new Map(); // old per-file counts, spent across literals
for (const [k, list] of byKey) {
  const [file, rule, key] = k.split("\t");
  const entry = allow[file]?.[rule];
  let cap;
  if (typeof entry === "number") { legacy++; const left = legacyLeft.has(`${file}\t${rule}`) ? legacyLeft.get(`${file}\t${rule}`) : entry; cap = Math.min(left, list.length); legacyLeft.set(`${file}\t${rule}`, left - cap); }
  else cap = capOf(entry?.[key]);
  if (list.length > cap) {
    failed += list.length - cap;
    const why = typeof entry === "number" ? ` (legacy allowlist count for this file is used up)` : cap ? ` (allowlist holds ${cap} of "${key}" here, found ${list.length})` : entry ? ` ("${key}" is not in the allowlist for this file)` : "";
    for (const f of list) { printed.push(`${f.file}:${f.line} ${f.rule} ${shown(f)}. Fix: ${fixFor(f.rule)}${why}`); failing.push(f); }
  } else { allowed += list.length; if (list.length < cap) shrink.push(`${file} ${rule} "${key}" ${cap} -> ${list.length}`); }
}
for (const [file, rules] of Object.entries(allow)) for (const [rule, v] of Object.entries(rules)) {
  if (typeof v === "number") continue;
  if (only && !only.includes(file)) continue;
  for (const [key, c] of Object.entries(v)) { const cap = capOf(c); if (!byKey.has(`${file}\t${rule}\t${key}`) && cap > 0) shrink.push(`${file} ${rule} "${key}" ${cap} -> 0`); }
}

// What the allowlist still holds, by file and rule: the "left" numbers a final message quotes.
const left = new Map();
for (const [k, list] of byKey) {
  const [file, rule, key] = k.split("\t");
  const entry = allow[file]?.[rule];
  const cap = typeof entry === "number" ? entry : capOf(entry?.[key]);
  const n = Math.min(cap, list.length);
  if (n) left.set(`${file}\t${rule}`, (left.get(`${file}\t${rule}`) || 0) + n);
}

summarize(`check-system: ${failed} failing, ${allowed} allowlisted`, [...failing, ...warnings], expired);
if (flag("--json")) console.log(JSON.stringify({ findings, failed, expired, allowed, warnings: warnings.length, shrink, left: [...left].map(([k, n]) => { const [file, rule] = k.split("\t"); return { file, rule, count: n }; }), stockExempt: cfg.stockExempt || 0, notes: cfg.notes, blindSpots: BLIND }, null, 2));
else {
  printed.forEach((l) => console.log(l));
  for (const f of warnings) console.log(`${f.file}:${f.line} warning ${f.rule} ${shown(f)}. Fix: ${fixFor(f.rule)}`);
  expired.forEach(warnLine);
  if (shrink.length) console.log(`allowlist can shrink (run --shrink-allowlist):\n  ${shrink.join("\n  ")}`);
  if (legacy) console.log(`note: ${cfg.allowlist} still holds per-file counts. Delete it and run --init-allowlist to key it by literal value.`);
  for (const n of cfg.notes) console.log(`note: ${n}`);
  if (cfg.stockExempt) console.log(`note: ${cfg.stockExempt} finding(s) sit on lines identical to upstream's copy in ${cfg.stockDir}/ and are exempt`);
  if (flag("--left")) {
    const files = new Set([...left.keys()].map((k) => k.split("\t")[0]));
    const byRule = new Map();
    for (const [k, n] of left) { const r = k.split("\t")[1]; byRule.set(r, (byRule.get(r) || 0) + n); }
    console.log(`left: ${allowed} allowlisted finding(s) in ${files.size} file(s)${byRule.size ? `: ${[...byRule].sort((x, y) => y[1] - x[1]).map(([r, n]) => `${r} ${n}`).join(", ")}` : ""}`);
    for (const [k, n] of [...left].sort(([x], [y]) => (x < y ? -1 : 1))) console.log(`left\t${k}\t${n}`);
  }
  console.log(`check-system: ${only ? only.length : listFiles(cfg).length} file(s) under ${root}, ${failed} failing, ${allowed} allowlisted${warnings.length ? `, ${warnings.length} warning(s)` : ""}${testOk ? "" : ", self-test FAILED"}`);
  console.log(`The check cannot see:\n${BLIND.map((b) => `  - ${b}`).join("\n")}`);
}
// exitCode, not exit(): a large --json report on a pipe is written asynchronously, and exit() would cut it at 64 KB.
process.exitCode = failed || !testOk ? 1 : 0;
