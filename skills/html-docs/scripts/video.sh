#!/usr/bin/env bash
set -euo pipefail

# pnpm runs a filtered package script from that package's directory. Preserve
# the caller's path semantics before handing arguments to either renderer path.
caller_dir="$PWD"
renderer_args=("$@")
target_index=1
if (( ${#renderer_args[@]} >= 1 )) && [[ "${renderer_args[0]}" =~ ^(course|project)$ ]]; then
  target_index=2
elif (( ${#renderer_args[@]} >= 1 )) && [[ "${renderer_args[0]}" == "studio" ]]; then
  target_index=-1
fi
if (( target_index >= 0 && ${#renderer_args[@]} > target_index )) && [[ "${renderer_args[$target_index]}" != --* ]] && [[ "${renderer_args[$target_index]}" != /* ]] && [[ "${renderer_args[$target_index]}" != *://* ]]; then
  renderer_args[$target_index]="$caller_dir/${renderer_args[$target_index]}"
fi
for ((i = 0; i < ${#renderer_args[@]}; i++)); do
  if [[ "${renderer_args[$i]}" =~ ^--(output|output-dir|voiceover|source|project)$ ]] && (( i + 1 < ${#renderer_args[@]} )) && [[ "${renderer_args[$((i + 1))]}" != /* ]]; then
    renderer_args[$((i + 1))]="$caller_dir/${renderer_args[$((i + 1))]}"
  fi
done

# Prefer a checked-out HTML Docs workspace so skill development and released
# renderer builds use the exact same open-source implementation. A custom
# checkout can be selected without editing this skill.
video_repo="${HTMLDOCS_VIDEO_REPO:-}"
if [[ -z "$video_repo" ]]; then
  current_dir="$PWD"
  while [[ "$current_dir" != "/" ]]; do
    if [[ -f "$current_dir/packages/html-video/package.json" ]]; then
      video_repo="$current_dir"
      break
    fi
    current_dir="$(dirname "$current_dir")"
  done
fi
if [[ -z "$video_repo" && -f "$HOME/projects/html-docs/packages/html-video/package.json" ]]; then
  video_repo="$HOME/projects/html-docs"
fi

if [[ -n "$video_repo" ]]; then
  exec pnpm --dir "$video_repo" --filter @html-docs/html-video cli "${renderer_args[@]}"
fi

# A scoped package whose executable has a different name must be selected
# explicitly; `npx @html-docs/html-video` cannot infer `html-docs-video`.
exec npx -y --package @html-docs/html-video html-docs-video "${renderer_args[@]}"
