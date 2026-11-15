// Built from SKILL.md's example tables: Gold under Scenes, Product studies
// under Real products, Specimen and reference sheets under Kit. Keep the
// names and notes in step with SKILL.md when either changes.
const curated = [
  { id: 'static-card', name: 'Static card', kind: 'Scene', note: 'Quiet hierarchy, a hard crop, one satellite, real words only on the selected customer, its neighbors and the total.' },
  { id: 'dark-bento', name: 'Dark card', kind: 'Scene', note: 'One signal said once; album art keeps it a music app.' },
  { id: 'hero-demo', name: 'Hero demo', kind: 'Scene', note: 'Five beats, named targets, an annotation, a terminal coming forward.' },
  { id: 'payout-flow', name: 'Payout flow', kind: 'Scene', note: 'Slow overlapping arrivals, reading time, a payoff that holds.' },
  { id: 'choreography', name: 'Changing markets', kind: 'Scene', note: 'Retained tracks, soft masks, dependent timing.' },
  { id: 'ai-chat', name: 'AI answer', kind: 'Scene', note: 'The question sent, Thinking, the answer streaming in with its height, sources last; no sparkles, no purple.' },
  { id: 'ai-cards', name: 'AI with cards', kind: 'Scene', note: 'A multiple-choice card answered and kept as the record, a card of options opening in the thread, booked from its own button.' },
  { id: 'form-error', name: 'Form validation', kind: 'Scene', note: 'An error on the field that caused it, cleared by fixing it, then the button confirms on itself.' },
  { id: 'reorder', name: 'Drag to reorder', kind: 'Scene', note: 'A row lifted by its grip, the others making room, dropped into place.' },
  { id: 'chart-scrub', name: 'Chart scrub', kind: 'Scene', note: 'A hairline and dot that follow the pointer, the headline value rolling to the day under it.' },
  { id: 'table-edit', name: 'Edit in a table', kind: 'Scene', note: 'A cell edited in place, then the total it feeds rolls a beat later.' },
  { id: 'loading', name: 'Loading to content', kind: 'Scene', note: 'A skeleton at the content\'s own geometry, rows resolving top to bottom, real chrome throughout.' },
  { id: 'dark-hero', name: 'Dark hero', kind: 'Scene', note: 'Depth from surface steps on black, one lit color, a status that changes on its own pill.' },
  { id: 'presence', name: 'Live collaborators', kind: 'Scene', note: 'Each person one color everywhere, names riding their cursors, work shown in the doc\'s own marks.' },
  { id: 'subscriptions', name: 'Subscription handoff', kind: 'Scene', note: 'A chip flies into a row, MRR rolls, a second scene is the reset.' },
  { id: 'close-up', name: 'Close-up', kind: 'Scene', note: 'One control at 1.4x with its window\'s chrome, the row whole, a large cursor to match.' },
  { id: 'many-of-one', name: 'Many of one', kind: 'Scene', note: 'A grid of one thing off every edge, one tile in focus by depth, the only one with words.' },
  { id: 'fade-crop', name: 'Fade crop', kind: 'Scene', note: 'A window fading out at its foot, over filler, instead of running off an edge.' },
  { id: 'panel-annotation', name: 'Panel over product', kind: 'Scene', note: 'A settings panel over the product\'s margin, one leader from the setting to what it changed.' },
  { id: 'overlap', name: 'Overlapping windows', kind: 'Scene', note: 'A card in front of a window, its edge on the window\'s sidebar line.' },
  { id: 'stacked-cards', name: 'Stacked cards', kind: 'Scene', note: 'Two components at one width, a small gap, the lower one off the bottom.' },
  { id: 'opposite-corners', name: 'Opposite corners', kind: 'Scene', note: 'A bento tile: copy bottom-left, the product hung from the top-right corner.' },
  { id: 'tilted-stack', name: 'Tilted stack', kind: 'Scene', note: 'A loose pile of paper, small alternating angles, only the top card has words.' },
  { id: 'corner-chip', name: 'Corner chip', kind: 'Scene', note: 'A small chip centered on a window\'s corner, half outside.' },
  { id: 'monochrome', name: 'Monochrome', kind: 'Scene', note: 'Other companies\' products in a row, grayscale, faded at the foot.' },
  { id: 'window-row', name: 'Row of windows', kind: 'Scene', note: 'Sessions side by side at one height: focus by depth, neighbors cut by the stage, only filler cropped.' },
  { id: 'device-pair', name: 'Window and phone', kind: 'Scene', note: 'A dashboard and a lock screen telling one event; the phone straddles over margin, never over the figure.' },
  { id: 'story', name: 'Invoice story', kind: 'Scene', note: 'An invoice, a plan, a connector, rolling totals.' },
  { id: 'calendar', name: 'Calendar drag', kind: 'Scene', note: 'A populated week, one focal event, a measured pickup.' },
  { id: 'freeform-drag', name: 'Drag and drop', kind: 'Scene', note: 'Grab offset, a measured grid, a drop slot that snaps.' },
  { id: 'phone-touch', name: 'Card expansion', kind: 'Scene', note: 'A card opens into its screen as one object, and the loop folds back.' },
  { id: 'dynamic-island', name: 'Dynamic Island', kind: 'Scene', note: 'One black shape, its content a separate layer.' },
  { id: 'messages', name: 'Messages', kind: 'Scene', note: 'Composer, typing, receipts, a bubble\'s lifetime.' },
  { id: 'cursors', name: 'Cursor kinds', kind: 'Specimen', note: 'Cursor kinds and direct feedback across common interactions.' },
  { id: 'cursor-morph', name: 'Cursor morph', kind: 'Morph', note: 'One outline becomes four cursor styles. Position, press feedback, and shape share the same stage.' },
  { id: 'cursor-resize', name: 'Resize cursors', kind: 'Scene', note: 'Resize edges and corners, the cursor changing kind as it crosses them.' },
  { id: 'annotations', name: 'Annotations and lines', kind: 'Scene', note: 'Leaders, dimensions, flows and a moving target.' },
  { id: 'bento', name: 'Feature grid', kind: 'Scene', note: 'One hero, one window, a stat, an object, a diagram.' },
  { id: 'ruled-bento', name: 'Technical grid', kind: 'Scene', note: 'Shared rules and technical imagery.' },
  { id: 'staggered-bento', name: 'Consumer grid', kind: 'Scene', note: 'Offset tiles, graphic art, physical objects.' },
  { id: 'hero-grid', name: 'Hero grid', kind: 'Scene', note: 'Different grounds and materials composed as one picture.' },
  { id: 'upload', name: 'Upload', kind: 'Scene', note: 'A file dragged in from the desktop, an upload row with progress that settles as a file row.' },
  { id: 'share', name: 'Share', kind: 'Scene', note: 'A share popover over a document: an email becomes a chip, a role menu, a person added to the list.' },
  { id: 'swipe', name: 'Swipe', kind: 'Scene', note: 'A phone swipe to archive: press, swipe, a throw at the finger\'s speed, the gap closes.' },
  { id: 'contrasts', name: 'Comparisons', kind: 'Teaching', note: 'Paired studies of motion, framing, hierarchy and restraint. Choose a principle to inspect.' },
] as const

const products = [
  ['figma', 'Figma', 'Canvas selection, a color picker, a second cursor.'],
  ['linear', 'Linear', 'Command menu and assignment.'],
  ['slack', 'Slack', 'Messages, a reaction, a thread reply.'],
  ['raycast', 'Raycast', 'Search and clipboard history over a blurred desktop.'],
  ['finder', 'Finder', 'Quick Look over a file list; a file moved into a folder; the same window in frosted glass.'],
  ['finder-glass', 'Finder · glass', 'Quick Look over a file list; a file moved into a folder; the same window in frosted glass.'],
  ['spotify', 'Spotify', 'A dark desktop app with album art.'],
  ['notion', 'Notion', 'A slash command; a comment and its reply.'],
  ['google-docs', 'Google Docs', 'A slash command; a comment and its reply.'],
  ['gmail', 'Gmail', 'Hover actions, archive, an undo toast.'],
  ['google-calendar', 'Google Calendar', 'Drag to create an event, the quick-create popup.'],
  ['powerpoint', 'PowerPoint', 'Slide editing; AutoSum and a chart.'],
  ['excel', 'Excel', 'Slide editing; AutoSum and a chart.'],
  ['wikipedia', 'Wikipedia', 'Search suggestions in a browser.'],
  ['telegram', 'Telegram', 'Native chat apps on an iPhone.'],
  ['imessage', 'iMessage', 'Native chat apps on an iPhone.'],
].map(([id, name, note]) => ({ id, name, note, kind: 'Product', group: 'Real products' }))

const specimens = [
  ['backgrounds', 'Backgrounds', 'One interface over twenty grounds: colorful gradients, light, linework and material.'],
  ['looks', 'Visual styles', 'Type, shape and color working together. Treat the kit defaults as a starting point.'],
  ['brand-marks', 'Brand marks', 'Common payment, app, bank and crypto marks, with original artwork on light and dark surfaces.'],
  ['chrome', 'Window chrome', 'Twelve window frames, including glass with an inset page, card, hairline and native browser variants.'],
  ['phones', 'Phones', 'Every phone frame in the kit.'],
  ['controls', 'Controls', 'Field, Segmented, Toggle, Tabs, Code, Chart, Slot, Scroll and a Camera push-in.'],
  ['parts', 'Parts', 'States, Check, Meter, Stream, Connector arrows, Popover and Menu, the satellite lock screen.'],
  ['kit-extras', 'Kit extras', 'Chip, Swap, Avatar rings, Meter tones, Menu hover, Expand, solid glyphs, BrandMark.'],
  ['glass', 'Glass', 'The glass theme on a window, a chip and a popover.'],
].map(([id, name, note]) => ({ id, name, note, kind: 'Reference', group: 'Kit' }))

// A new example directory shows up at the end of Kit until it is listed above.
// Vite updates this glob when a file is added; no restart needed.
const listed = new Set<string>([...curated, ...products, ...specimens].map(example => example.id))
const extra = Object.keys(import.meta.glob('../examples/*/index.tsx'))
  .map(path => path.split('/').at(-2)!)
  .filter(id => !listed.has(id))
  .sort()
  .map(id => ({ id, name: id.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' '), kind: 'Reference', group: 'Kit', note: 'A new example, not yet listed in the catalog.' }))
export const examples = [...curated.map(example => ({ ...example, group: example.id === 'contrasts' ? 'Comparisons' : 'Scenes' })), ...products, ...specimens, ...extra]
export const groups = ['Scenes', 'Real products', 'Comparisons', 'Kit']
