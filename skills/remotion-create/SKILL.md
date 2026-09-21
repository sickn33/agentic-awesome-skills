---
name: remotion-create
description: Create a new Remotion video
version: 4.0.526
source_repo: remotion-dev/skills
source_type: official
source: remotion-dev
date_added: '2026-09-21'
risk: unknown
---
## When to Use
- Use when this upstream workflow matches the user's stated goal.
- Use when the task requires the procedures documented in this skill.

These are instructions for making a new Remotion project and composition.  
If this is not the next task, see Remotion Best Practices

## Scaffold a project

If a project already exists, skip this.
Ensure Node.js and Git is installed, and the current folder is appropriate for starting a new project.

Inspect the current folder, including hidden files, before choosing where to scaffold.

### Empty folder

If it is empty, or contains only disposable operating-system metadata such as `.DS_Store`, create the project directly in the current folder.
Remove only those disposable metadata files first, since `create-video` rejects non-empty folders.
Do not treat all hidden files as disposable: files such as `.env` and directories such as `.git` are meaningful contents.

Scaffold in existing folder:

```bash
npx create-video@latest --yes --blank --no-tailwind .
npm i
```

### Non-empty folder

If the current folder contains meaningful contents and no project already exists, scaffold into a new subfolder.
Replace `my-video` with a suitable project name.


```bash
npx create-video@latest --yes --blank --no-tailwind my-video
cd my-video
npm i
```

## Designing a video

Keep the scaffold and add React Markup.
Follow Remotion React Markup Best Practices and [Video Layout Rules for video-first layout and text sizing guidance.

## Is this a multi-scene video?

If this is a video with multiple subsequence videos, follow guidance at Multi-scene videos.

## Interactivity Best Practices

By structuring the React Markup following Remotion Interactivity Best Practices, you allow the user to make edits in the Studio which write back to code.

## TailwindCSS

If Tailwind is requested, see [tailwind.md for using TailwindCSS in Remotion.

## Open the preview

Start the preview server after building the composition:

```bash
npx remotion studio --no-open
```

This will start a long-running process and print the server URL for the preview.  
If the server is already started, it will print the URL.
If an in-harness browser is available, open it there.
You can visit a specific composition by navigating to `/[composition-id]`, for example `http://localhost:3000/MapAnimation`.

## Render the video

Only render if the user explicitly asks for it.

```
npx remotion render
```

For more options, see Rendering.

## Follow-up

The video creation process has finished.
For follow-up prompts, use Remotion Best Practices


## Examples

```text
User: Apply this skill to my current task.
Assistant: Follow the workflow in this skill, cite limitations, and ask before risky steps.
```

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
