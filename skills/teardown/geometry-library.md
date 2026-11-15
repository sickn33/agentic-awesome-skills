# Reuse construction helpers

[assets/geometry.js](assets/geometry.js) builds the parts and [assets/projection.js](assets/projection.js) turns them into ink. Read **Compose parts from profiles**, **Place each part once** and **Project visible ink from the mesh** first. **Draw axes and assembly trails**, **Describe custom surfaces explicitly** and **Keep parameter changes coherent** matter only when the drawing uses them.

The helpers run in Node through `require()` and in a browser or worker through `TechnicalGeometry`. They use caller-defined model units and have no package dependencies.

## Compose parts from profiles

`part(id, name, explosion)` creates a mesh with vertices, triangles and feature lines. Give `explosion` as an `[x, y, z]` translation from its assembled placement.

| Helper | Inputs and result |
| --- | --- |
| `lathe(part, profile, options)` | Revolves a closed `[x, radius]` profile around X, or around world `axis` through point `at`. Inner segments form bores, a third value of `'h'` makes a point hexagonal and a crossing profile throws |
| `ring(part, x, radius, options)` | Adds a circular feature line perpendicular to X, or a hexagonal one matching a lathe's `'h'` points with `hex: true` |
| `helix(part, options)` | Adds a thread line from `x0` to `x1` with `radius` and `pitch`, plus optional `hand` of 1 or -1 and starting `phase` |
| `spring(part, options)` | Builds closed wire around X from `radius`, `wire`, `turns`, `x0` and `x1`, starting at local +Y so whole turns end at the same angle |
| `knurl(part, options)` | Adds crossing helices using `starts`, `pitch`, `radius`, `x0` and `x1` |
| `screw(part, options)` | Builds a head, shank, thread lines and slot along X from `length`, `radius`, `headRadius`, `headHeight` and `pitch`, defaulting to 10, 1.5, 3, 2 and 0.8 |
| `circle(part, center, radius, normal, options)` | Adds a closed circular feature line in the plane facing `normal`, with 144 `segments` to match a default lathe |
| `ringPoints(center, radius, u, v, options)` | Samples an arc from `start` to `end` radians in orthonormal plane axes, to a `tolerance` of 0.008 model units. A full circle repeats its first point at the end |
| `roundedRectangle(width, height, radius, options)` | Returns a rounded profile centered on the origin or on an `[x, y]` `center` |
| `ringAngles(width, height, radius, options)` | Returns polar angles that crowd a rounded rectangle's corners, with `corner` and `side` sample counts defaulting to 12 and 24 per quarter |
| `roundedRing(width, height, radius, options)` | Samples a rounded rectangle at given `angles` and height `z`, so rings of any size share one point count |
| `loft(part, rings, options)` | Joins rings of equal point count into one surface; caps both ends by default, joins the last ring back to the first with `cyclic: true` and winds closed results outward |
| `sweep(part, path, section, options)` | Carries a closed `[u, v]` section along a path of points, for handles, cables and tubes. `closed: true` joins the path into a ring, and `lines` defaults to `'ends'` or `'none'` when closed |
| `polyline(part, points, options)` | Adds a feature line through points, closing it with `closed: true` |
| `box(part, min, max, options)` | Adds an axis-aligned block between two corners, with rounded vertical edges when given `radius` |
| `extrude(part, profile, options)` | Gives a simple XY polygon a positive Z `depth`, with concave outlines and real openings from a `holes` array of profiles inside it |
| `transform(part, frame)` | Places mesh vertices, feature lines and explosion directions in one rigid frame |
| `merge(target, source)` | Copies a positioned construction piece into one complete part, preserving the target's identity and explosion |
| `piece()` | Returns a part named `Construction piece` for building something to merge |
| `along(axis)` | Returns the frame that turns local X onto world `x`, `y` or `z`, for spreading into `transform` |
| `plane(name)` | Returns the frame that lays a local XY profile in world `xy`, `xz` or `yz`, with extrusion depth along `+z`, `-y` or `+x` |
| `line(part, a, b, role)` | Adds one feature segment between two `[x, y, z]` points |

```js
const G = require('./tools/teardown/assets/geometry.js');
const sleeve = G.part('sleeve', 'Knurled sleeve', [25, 0, 0]);
G.lathe(sleeve, [[0, 5], [30, 5], [30, 3], [0, 3]]);
G.knurl(sleeve, {x0: 2, x1: 28, radius: 5.01, starts: 12, pitch: 40});
```

`lathe` without `axis` or `at`, `ring`, `helix`, `knurl`, `spring` and `screw` all work in local X. On a part already placed elsewhere, build them on a `piece()`, transform it the same way and `merge` it.

Surface thread and knurl lines describe appearance, not cut thread solids. The screw's slot is an indication, not a machined recess.

`lathe` uses 144 segments unless given `segments`, which must be divisible by 12 for hexagonal points. `start` and `end` in radians cut a partial sector, whose end caps require a convex radial profile.

`lathe` draws a ring at every profile point. For a sampled curve such as a dome or lens face, pass `creaseAngle` in degrees and only corners turning more than that keep their ring. `omitRings` drops rings by profile index.

`loft` draws every ring the same way. Pass `lines: 'ends'` for a smooth surface or `lines: 'none'` when you author its feature lines yourself.

A lathe cannot blend a round section into a hexagonal one. Build that chamfer as a `loft` whose ring radius is the smaller of the hexagon and the cone at each angle.

Line roles are `outline`, `edge`, `detail`, `texture` and `axis`. `line(part, a, b, role)` and most helpers default to `edge` and take a `role` option. `helix` defaults to `detail`, while `knurl`, `spring` and `screw` set their own roles.

## Build prismatic parts without custom triangulation

Pass `extrude` an ordered polygon without self-intersections. Clockwise and counterclockwise inputs work; a repeated closing point is optional.

Cap triangulation preserves concave notches. Curved profiles need sampled points; `creaseAngle` controls which corners receive longitudinal feature lines, defaulting to 25°.

Pass `holes` for pivot holes, mounting holes and windows. Each hole is its own ordered polygon inside the profile; the extrusion walls it and keeps it open through the part.

```js
const disc = (cx, r) => Array.from({length: 48}, (_, i) => [cx + r * Math.cos(i * Math.PI / 24), r * Math.sin(i * Math.PI / 24)]);
G.extrude(lever, G.roundedRectangle(80, 16, 8), {depth: 3, holes: [disc(-30, 4), disc(30, 3)]});
```

## Place each part once

`transform` mutates the part and accepts `origin`, `xAxis`, `yAxis` and `zAxis`. Axes must form a right-handed orthonormal frame; omitted values use the world frame.

Explosion vectors rotate with that frame but do not receive its origin translation. Build each part with zero explosion, place it, then assign `part.explosion` in world coordinates.

```js
const pin = G.part('pin', 'Hinge pin');
G.lathe(pin, [[0, 0], [0, 1.2], [14, 1.2], [14, 0]], {creaseAngle: 20});
G.transform(pin, {origin: [0, 8, 2], ...G.along('z')});
pin.explosion = [0, 0, 30];
```

Build positioned pieces with `piece()` and combine them through `merge`, which throws when the source has an explosion. Merging copies geometry and leaves the source unchanged.

Merging does not union intersecting solids, draw their intersection curve or erase their authored feature lines. Embed a joined piece just below the surface it meets and add the junction curve as a feature line yourself. Offset that curve about 0.05 mm outward from both surfaces so neither hides it.

Keep such junctions away from a silhouette. Where a junction curve grazes one, sampled visibility leaves short dash fragments.

## Describe custom surfaces explicitly

Use this mesh contract when a construction needs surfaces beyond the helpers:

| Field | Representation |
| --- | --- |
| `vertices` | Finite `[x, y, z]` positions in assembled model coordinates |
| `triangles` | Three zero-based vertex indices per face, wound toward the surface's outside |
| `lines` | Feature segments with `a` and `b` endpoints and a line `role` |
| `explosion` | A translation applied to the complete part, independent of its assembled position |
| `transparent` | Optional; `true` for glass, which draws its own edges but hides nothing behind it |

The renderer throws when a triangle references a missing vertex. An edge used by only one triangle draws as an outline, so an open skin keeps its rim and an unshared seam shows up as a stray line.

A part with feature lines and no triangles still fits the page, which suits a marking or a reference axis.

## Project visible ink from the mesh

```js
const {render} = require('./tools/teardown/assets/projection.js');
const {markup} = render([sleeve], {explosion: 0.6, isolated: null});
```

The model owns its camera. The viewer passes only `explosion`, `fitExplosion`, `isolated`, `fill` and `annotate`, so spread those options and add the camera:

```js
return TechnicalProjection.render(parts, {...options, camera: {azimuth: -128, elevation: 30, roll: 0}});
```

Angles use degrees. [geometry.md](geometry.md) explains choosing them under **Know which way the camera looks**.

`project(point, camera)` accepts the same angles for feature anchors. For many anchors, build the camera once with `createCamera(camera)` and call its `project`.

The render result includes `scale` and `offset` for paper placement. Add the part's current explosion translation to an anchor, then map it with `project(anchor, camera).slice(0, 2).map((n, i) => n * result.scale + result.offset[i])`.

The result contains named part groups and paths carrying `data-line-role`. The viewer supplies their ink styles and dashes `axis`.

Coordinates fit a landscape A3 page with a 28 mm margin, which is the paper space the viewer expects. `explosion` accepts 0–2 and the viewer's spacing slider reaches 1.5, so models must stay coherent across that range.

`fitExplosion` fits the page to a wider spacing than the current one. Above zero spacing the viewer previews with at least the authored spacing of 1, so the scale holds while the slider moves below it. `isolated` accepts one part ID or `null`.

The `sample` option sets visibility sampling in paper millimeters, 0.045 by default within 0.01–0.2. Depth tolerance tracks 0.01 mm on paper, so inspect shallow recesses and nearly touching faces closely.

Each role's path joins line pieces whose ends fall within 0.02 mm, bends as cubic curves through vertices that turn less than 35°, and ends exactly where a line passes out of sight. A curve's handles never reach past a third of the shorter segment at a vertex, so a straight line meeting a curve stays straight. An `edge` that carries on from an `outline` without a corner takes the outline role up to its first corner, so a contour keeps one weight past its silhouette. Coordinates carry three decimals. Anything that reads the path data must accept `C` as well as `M` and `L`.

`fill: true` adds a `data-fills` group behind every part. Each path in it carries `data-fill` with its part ID and `data-covers` with the parts it paints over, and starts with `fill="none"` until the viewer colors it. Paths paint far to near, and a part fully hidden behind others gets none.

`annotate: true` widens the side margins and adds a `data-annotations` group: for each part with visible ink, a dot on its silhouette, a leader and its name in capitals as `<text data-annotation>`, stacked in a column on each side. Leaders and dots carry `data-line-role="detail"` and `data-ink-fill`, so they take the base ink. Name parts as a reader would label them, such as `Focus ring` or `Thermal paste`, since the names become the labels.

Fills rely on closed shells. A closed shell hides its own back faces whichever way its triangles wind, while an open skin fills both sides. Fills roughly double render time, so the viewer requests them only while a part is filled.

Regenerate visibility after changing geometry, spacing or isolation. Previously hidden segments cannot be recovered by moving or hiding already-clipped SVG groups.

## Draw axes and assembly trails

Pass `trails` to `render` for centerlines and insertion paths. Each trail has model-space ends `a` and `b` plus optional part IDs `from` and `to` whose explosion moves that end:

```js
const trails = [{a: [0, 0, 25], b: [0, 0, 25], from: 'screw', to: 'frame'}];
return TechnicalProjection.render(parts, {...options, camera, trails});
```

Trails use the `axis` role by default, hide behind solid parts and render in a `data-trails` group outside every part. A trail between two parts collapses at zero spacing, and isolating a part omits every trail.

Author each trail as one straight segment. A dash pattern restarts at every subpath, so a trail broken into pieces loses its rhythm.

## Keep parameter changes coherent

Expose only meaningful parameters with validated minima, maxima, defaults and units. Use integer steps for counts and label fictional dimensions as concept values.

Derive mating features and repeated instances from shared parameters. Length changes must move attached components without stretching their independent details.

Retain stable part IDs across every parameter value.
