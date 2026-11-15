# Reading a Figma file

How **Read the design at its source** gets values out of Figma. Tool names here are the official Figma MCP server's. Where a Figma skill ships with the server, load it before the first call and follow its calling rules. This file covers only what this skill needs from the answers.

## From link to node

A Figma URL carries the file key after `/design/` or `/file/` and the node in `node-id`. On a branch URL, `/design/<fileKey>/branch/<branchKey>/`, pass the branch key as the file key. The URL writes the node as `1-2`, and the tools take it as `1:2`. A link with no `node-id` points at no frame in particular, so list the frames with `get_metadata` and confirm which ones ship before reading any of them.

## The calls

| Tool | Gives you | Use it for |
| --- | --- | --- |
| `get_design_context` | Reference code, exact values, bound variables, component instances, asset downloads and optionally a screenshot | Every frame in scope, one call each |
| `get_screenshot` | A render of the node | The comparison target, when the design context returned none |
| `get_variable_defs` | The variables the node uses, with their names and values | Mapping design variables onto project tokens |
| `get_metadata` | The layer tree with ids and sizes, no styling | Large pages, to find which child nodes to read |

Request the screenshot in the same `get_design_context` call. The code it returns is a reference, by default React with Tailwind and raw values. Translate it through **Map the design onto the project** and never paste it.

A design context flagged as sparse is a summary, not values. Read the visible children it names, in parallel, and build from those answers.

## What to trust

- **Variable names over raw values.** A fill bound to `gray/600` maps to the project's `gray-600` even where the hex drifted. A raw hex with no variable goes through the mapping table.
- **Code Connect over name matching.** A node with a Code Connect mapping names the exact component and props. Use that component unless it cannot express the design, and report the case where it cannot.
- **Auto layout over absolute positions.** Gap and padding on an auto layout frame are the spacing intent. Absolute x and y on a free-floating layer are where someone dropped it.
- **Downloaded assets over Figma URLs.** Asset URLs from the server expire. Save each asset into the project the way the design context says, and leave no Figma URL in code.

The screenshot is the target you compare against. It is never an asset in the build.
