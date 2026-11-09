# Model the object once for every view

## Separate the object from its arrangement on paper

Keep dimensions, local profiles, assembled transforms, explosion vectors and item IDs in plain data. Define holes and their fasteners from shared centers.

Keep annotation anchors in the same coordinate system as their features. Sheet positions belong to the view, never to the part definition.

## Know which way the camera looks

World `z` points up. A camera's `azimuth` places the viewer horizontally at `[cos a, sin a]`, so `-135` looks from the `-x`, `-y` quadrant toward the origin.

The camera's right vector is `[-sin a, cos a, 0]` and its up vector is `[-sin e cos a, -sin e sin a, cos e]`. At azimuth `-135`, world `+x` therefore points right and up the page while `+y` points left and up. Probe `createCamera(camera).project` on unit vectors when unsure.

`createCamera(camera).direction` points from the object toward the viewer. A face is visible when its outward normal has a positive dot product with it. Put openings, ports and labels on those faces, or turn the camera.

Turned helpers build along local `x`, as **Compose parts from profiles** in [geometry-library.md](geometry-library.md) lists. Place them on their world axis before judging which end the camera shows.

Exact diagonal azimuths such as `-135` stack features that sit on the diagonal through the center. Corner fasteners then overlap the parts above them, so move a few degrees off the diagonal.

Features at opposite ends, such as a port and a plug, both show when the camera sits about 60° off the long axis. Protruding parts still read at the far end, while flush openings there do not.

Keep `roll` at `0` for upright objects so vertical edges stay vertical. The renderer's default 16° roll suits an unrotated isometric study only.

## Choose constructions that explain themselves

When the request names a part but not its mechanism, prefer the construction whose parts stack on one explosion axis. A torsion spring around a pivot reads better than a tension spring between two posts.

A mating feature visible only from below cannot appear in a view from above. Name it in `evidence.md` and the delivery message, or show it in a second drawing with its own camera.

## Give parts real boundaries

An enclosure has wall thickness, an inner cavity and mounting features. A grille has an outer frame and repeated openings, not stripes floating across a face.

A fastener has an axis, a head and a shank entering a matching hole. Simplify its threads at small scales while retaining enough shape to identify the connection.

A cable meets a connector or strain relief. A spring wraps around its axis with consistent radius and pitch, then terminates on a seat or attachment.

Choose only the features supported by the evidence record. Conceptual construction should fit together even when its geometry is invented.

## Draw concepts as layered parts

A concept becomes geometry by giving each idea its own part. Display pixels become a backlight, a black matrix, one part per color filter and a cover glass. An interface card becomes page, shadow, surface, image, text and button. Explode along one axis, so each layer lifts off the one below it.

Build layers from thin `box` or `extrude` plates. Leave about a tenth of the plate thickness between stacked layers. Faces that share a plane fight over visibility and break both lines and fills into fragments.

Keep layers from wrapping around each other. Rest a filter on top of the matrix and overlap its bars, rather than sinking it into the matrix's openings. Parts that cover each other in both directions fall back to a slower fill path and heavier markup.

Repeat elements from one loop over shared parameters, such as pixel count and pitch, so a slider changes the whole grid at once. Set `colors` in the drawing configuration when color carries the meaning, as **Describe the drawings and their controls** in [viewer-assets.md](viewer-assets.md) shows.

## Build what the helpers cannot

Plates with holes, bent sheet, tori and blended housings need a custom mesh. Build them as grids of rings with equal point counts, then join neighboring rings into triangles.

Sample every ring of one surface on the same parameter values. `roundedRing` with shared `ringAngles` gives a square ring and a round ring matching points, so they loft into a frame with a round bore and no slivers.

Touching curved surfaces need the same segment counts and start angles too. Equal radii alone leave dotted contact lines where differently faceted meshes meet.

A shell with walls is one cyclic `loft` through its wall section. Step the rings from the outer edge over the fillet, across the face, into an opening and back along the inner wall.

A shell with a closed top steps its rings inward across the top until they shrink to a line, then returns along the inner skin. Make the first inner ring an exact copy of the last outer ring so the turn adds no visible fin.

A turned part with a notch or flutes is a cyclic `loft` with one ring per profile point, each sampled around the axis with a radius that varies by angle. Pair the angle samples at least 0.01 rad apart where a wall should stand vertical, or slivers break its outline into dashes.

Build one body as one surface. Two stacked lathes or extrusions draw their shared face edge as a seam across the part.

A single-skin surface has free edges. They draw as outlines, so close the shell or give it a skirt where a wall should show thickness.

Share vertex indices along every seam. Unshared seams hide the silhouette test, so an edge that should read as an outline draws as a thin crease.

Wind every triangle of a part the same way, toward the outside where you can. One reversed patch swaps silhouette and interior edges, which shows as a heavy front arc beside a light rear arc.

For a thin solid that needs real walls, orient each triangle against a reference point inside the material. That stays correct where a global centroid test fails.

`transform` accepts rigid frames only. For a tilt or shear, map vertices and line endpoints to new arrays with one function, as `transform` does.

Faces closer than about 0.5 mm on paper ink as a solid black shape. Thicken a thin part such as a watch hand, or draw it as one outline with no thickness.

A part a little thicker than that, such as a fan blade, fin or sheet tab, still draws its edges twice. The visible edge jumps between the two faces and leaves steps and stubs that show when zoomed. Build it as one open sheet of triangles with no side walls, since its free edges outline themselves.

Keep hidden internals clear of the surface that covers them by more than its facet error. A post that grazes a coarse patch pokes through as stray arcs.

## Show moving parts in one pose

A hinge, fold or slider becomes a parameter that rotates or moves that part about its real axis. Default it to the pose the request describes, and keep the explosion a pure translation from that pose.

When both poses matter, such as folded and deployed prongs, the parameter's minimum and maximum show them. Use a second drawing only when the poses need different cameras.

## Sample curves finely enough

Sample circles in their own plane with `ringPoints`. An axis-aligned SVG ellipse cannot follow a circle on a sloping face.

Subdivide curves until the projected chord error is below 0.05 mm on paper. The viewer zooms to 400%, so judge facets in a close-up crop rather than at sheet size. A freeform sheet such as a blade needs about 40 samples along each long curved edge.

The renderer bends a path through any vertex where it turns less than 35°, so a sampled circle prints as a smooth curve rather than a polygon. A circle seen at a steep angle squashes into a flat ellipse and concentrates its turn at the two ends: 32 segments reach about 30° there at a 3:1 squash. Where such an ellipse still shows corners at its ends in a close-up, give the circle more segments.

Draw only silhouettes, real boundaries and necessary feature lines. Triangulation diagonals, duplicate coincident edges and tessellation rings on smooth surfaces are not ink.

## Prove the assembly before decorating it

With explosion offsets at zero, check each fastener's alignment and insertion depth against its hole. Check rims against their mating seats and covers against their enclosures.

Fastener heads should contact their seats, with shanks concealed where they enter solid material.

Restore the explosion offsets and verify that the same features stay aligned along their disassembly paths. Fix a misfit in the part data, never by nudging one view's ink.

For orthographic views, compare shared feature coordinates numerically. A hole's horizontal location must agree between front and top views when both display that coordinate.
