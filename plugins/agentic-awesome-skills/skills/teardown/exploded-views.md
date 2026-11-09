# Arrange the exploded view

## Explode along the assembly paths

Keep the assembled and exploded cameras identical unless a second angle reveals something necessary. Identify any camera change in the view label.

Choose a primary disassembly axis. Translate components along it, preserving their orientation, then separate secondary hardware along its own insertion axis.

Each offset begins at the component's assembled placement. Setting all explosion offsets to zero must reconstruct the assembly.

Choose gaps in paper space after projection. Start with 8–15 mm of clear space between silhouettes, increasing it where leaders or inner surfaces need room.

Keep stacks such as screw, washer, cover and boss coaxial. Show the real locating features at both ends of an assembly trail.

Use fine chain lines for necessary trails and omit redundant ones. Stop trails at their attachment features or conceal them behind opaque parts. The renderer draws them through **Draw axes and assembly trails** in [geometry-library.md](geometry-library.md).

A part nested inside another clears it only when its travel exceeds the outer part's projected depth. Judge the gap between silhouettes in the proof, not between the parts' faces in the model.

Put small features on the side of a lifted part away from the viewer, toward the front of the page. A post behind a lever vanishes once the lever rises.

Hold fasteners just clear of their holes. A screw sent to the end of a vertical stack lands over unrelated parts and stops pointing at its hole. When the part it joins also moves, combine both motions into one diagonal vector.

An internal part at the back of an enclosure rises behind the lifted shell. Place tall internals toward the viewer's side, raise the shell further or drop a part that only obscures the others.

Coaxial discs at diameter `D` clear each other when their center spacing exceeds `D × tan(elevation)` plus their thickness. A deep stack becomes a tall column using a third of landscape A3, so lower the elevation or accept the narrow composition.

For a long object, explode along its axis and move a secondary mechanism to a parallel row joined by a trail. To set a group beside the stack without changing its depth, offset it along the camera's right vector from **Know which way the camera looks** in [geometry.md](geometry.md). When a straight trail between rows would cross parts, leave the rows unjoined with parallel axes. Fit the whole drawing before judging page use, since a long diagonal leaves empty corners.

Drop a trail that crosses an unrelated part or ends inside a cavity. A trail earns its place by connecting two visible locating features.

Each part takes one explosion vector. When members of a group separate, such as lens elements in their cell, make each a part and name it within the group, such as `Front group, element 1`.

An explosion should reveal mating surfaces, not just spread silhouettes across the page. Preserve enough assembled context to explain where each group belongs.
