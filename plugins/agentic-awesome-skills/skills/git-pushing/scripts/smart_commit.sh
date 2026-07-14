#!/bin/bash
set -euo pipefail

# Always inspect and update the repository's real index. An inherited alternate
# index could otherwise make the safety check observe different staged content.
unset GIT_INDEX_FILE

CONVENTIONAL_PATTERN='^(feat|fix|ref|refactor|perf|docs|test|build|ci|chore|style|meta|license|revert)(\([A-Za-z0-9._/-]+\))?(!)?: .+'
MESSAGE="${1:-chore: update code}"
shift || true

validate_message() {
  local subject=$1
  if [[ ! "$subject" =~ $CONVENTIONAL_PATTERN ]]; then
    echo "Commit message must use the conventional '<type>(<scope>): <subject>' format." >&2
    exit 1
  fi
}

validate_message "$MESSAGE"

PATH_MODE=false
if [[ "${1:-}" == "--" ]]; then
  PATH_MODE=true
  shift
elif [[ "$#" -gt 0 ]]; then
  echo "Pass selected paths after an explicit -- separator." >&2
  exit 1
fi

if [[ "$PATH_MODE" == true && "$#" -eq 0 ]]; then
  echo "The -- separator requires at least one path." >&2
  exit 1
fi

BRANCH=$(git symbolic-ref --quiet --short HEAD) || {
  echo "Refusing to commit from a detached HEAD." >&2
  exit 1
}

REF_FORMAT=$(git rev-parse --show-ref-format 2>/dev/null || printf '%s\n' files)
if [[ "$REF_FORMAT" != files ]]; then
  echo "Refusing to run with ref backend '$REF_FORMAT'; safe branch locking currently requires the files backend." >&2
  exit 1
fi

PUSH_REMOTE=$(git config --get "branch.$BRANCH.pushRemote" || true)
if [[ -z "$PUSH_REMOTE" ]]; then
  PUSH_REMOTE=$(git config --get remote.pushDefault || true)
fi
FETCH_REMOTE=$(git config --get "branch.$BRANCH.remote" || true)
MERGE_REF=$(git config --get "branch.$BRANCH.merge" || true)
if [[ -z "$PUSH_REMOTE" ]]; then
  PUSH_REMOTE=${FETCH_REMOTE:-origin}
fi

if [[ "$PUSH_REMOTE" == "." ]] || ! git remote get-url --push "$PUSH_REMOTE" >/dev/null 2>&1; then
  echo "Configured push remote '$PUSH_REMOTE' does not exist or is not pushable." >&2
  exit 1
fi

PUSH_BRANCH=$BRANCH
if [[ "$PUSH_REMOTE" == "$FETCH_REMOTE" && -n "$MERGE_REF" ]]; then
  if [[ "$MERGE_REF" != refs/heads/* ]]; then
    echo "Configured upstream '$MERGE_REF' is not a pushable branch ref." >&2
    exit 1
  fi
  PUSH_BRANCH=${MERGE_REF#refs/heads/}
fi

HAS_UPSTREAM=false
if git rev-parse --verify --quiet '@{upstream}' >/dev/null; then
  HAS_UPSTREAM=true
fi
SET_UPSTREAM=false
if [[ "$HAS_UPSTREAM" == false && "$PUSH_REMOTE" == origin ]]; then
  SET_UPSTREAM=true
fi

GIT_DIR=$(git rev-parse --absolute-git-dir)
GIT_COMMON_DIR=$(git rev-parse --path-format=absolute --git-common-dir)
LIVE_INDEX="$GIT_DIR/index"
LIVE_INDEX_LOCK="$LIVE_INDEX.lock"
BRANCH_REF="$GIT_COMMON_DIR/refs/heads/$BRANCH"
BRANCH_REF_LOCK="$BRANCH_REF.lock"
TEMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/smart-commit.XXXXXX")
TEMP_INDEX="$TEMP_DIR/index"
MESSAGE_FILE="$TEMP_DIR/COMMIT_EDITMSG"
LOCK_HELD=false
BRANCH_LOCK_HELD=false

cleanup() {
  rm -rf "$TEMP_DIR"
  if [[ "$LOCK_HELD" == true ]]; then
    rm -f "$LIVE_INDEX_LOCK"
  fi
  if [[ "$BRANCH_LOCK_HELD" == true ]]; then
    rm -f "$BRANCH_REF_LOCK"
  fi
}
trap cleanup EXIT

if ! (set -o noclobber; : > "$LIVE_INDEX_LOCK") 2>/dev/null; then
  echo "The Git index is busy; refusing to race another staging operation." >&2
  exit 1
fi
LOCK_HELD=true

if ! git diff --cached --quiet; then
  echo "Refusing to commit because the index already contains staged changes." >&2
  echo "Commit or unstage the existing index, then retry with the intended paths." >&2
  exit 1
fi

PARENT=$(git rev-parse --verify HEAD)
if [[ -f "$LIVE_INDEX" ]]; then
  cp "$LIVE_INDEX" "$TEMP_INDEX"
else
  GIT_INDEX_FILE="$TEMP_INDEX" git read-tree "$PARENT"
fi
if [[ "$PATH_MODE" == true ]]; then
  GIT_INDEX_FILE="$TEMP_INDEX" git add -- "$@"
else
  GIT_INDEX_FILE="$TEMP_INDEX" git add -A
fi

if GIT_INDEX_FILE="$TEMP_INDEX" git diff --cached --quiet; then
  echo "No changes staged for commit." >&2
  exit 1
fi

EXPECTED_TREE=$(GIT_INDEX_FILE="$TEMP_INDEX" git write-tree)
printf '%s\n' "$MESSAGE" > "$MESSAGE_FILE"

GIT_INDEX_FILE="$TEMP_INDEX" git hook run --ignore-missing pre-commit
if [[ $(GIT_INDEX_FILE="$TEMP_INDEX" git write-tree) != "$EXPECTED_TREE" ]]; then
  echo "Pre-commit hooks changed the isolated index; review those changes before retrying." >&2
  exit 1
fi

GIT_INDEX_FILE="$TEMP_INDEX" git hook run --ignore-missing prepare-commit-msg -- "$MESSAGE_FILE" message
GIT_INDEX_FILE="$TEMP_INDEX" git hook run --ignore-missing commit-msg -- "$MESSAGE_FILE"
if [[ $(GIT_INDEX_FILE="$TEMP_INDEX" git write-tree) != "$EXPECTED_TREE" ]]; then
  echo "Commit hooks changed the isolated index; review those changes before retrying." >&2
  exit 1
fi
validate_message "$(head -n 1 "$MESSAGE_FILE")"

if [[ $(git config --bool commit.gpgsign || true) == true ]]; then
  CREATED_COMMIT=$(git commit-tree -S "$EXPECTED_TREE" -p "$PARENT" -F "$MESSAGE_FILE")
else
  CREATED_COMMIT=$(git commit-tree "$EXPECTED_TREE" -p "$PARENT" -F "$MESSAGE_FILE")
fi

if ! git update-ref "refs/heads/$BRANCH" "$CREATED_COMMIT" "$PARENT"; then
  echo "The branch changed concurrently; refusing to replace or push it." >&2
  exit 1
fi

mkdir -p "$(dirname "$BRANCH_REF_LOCK")"
if ! (set -o noclobber; : > "$BRANCH_REF_LOCK") 2>/dev/null; then
  CURRENT_BRANCH_COMMIT=$(git rev-parse --verify "refs/heads/$BRANCH")
  if [[ "$CURRENT_BRANCH_COMMIT" != "$CREATED_COMMIT" ]]; then
    GIT_INDEX_FILE="$TEMP_INDEX" git read-tree "$CURRENT_BRANCH_COMMIT"
  fi
  cp "$TEMP_INDEX" "$LIVE_INDEX_LOCK"
  mv -f "$LIVE_INDEX_LOCK" "$LIVE_INDEX"
  LOCK_HELD=false
  echo "The branch ref is busy after commit creation; refusing to continue to hooks or push." >&2
  exit 1
fi
BRANCH_LOCK_HELD=true
CURRENT_BRANCH_COMMIT=$(git rev-parse --verify "refs/heads/$BRANCH")
if [[ "$CURRENT_BRANCH_COMMIT" != "$CREATED_COMMIT" ]]; then
  GIT_INDEX_FILE="$TEMP_INDEX" git read-tree "$CURRENT_BRANCH_COMMIT"
  cp "$TEMP_INDEX" "$LIVE_INDEX_LOCK"
  mv -f "$LIVE_INDEX_LOCK" "$LIVE_INDEX"
  LOCK_HELD=false
  echo "The branch changed before its ref lock was acquired; refusing to push." >&2
  exit 1
fi

if ! GIT_INDEX_FILE="$TEMP_INDEX" git hook run --ignore-missing post-commit; then
  echo "Warning: post-commit hook failed after the commit was created; continuing with a consistent index." >&2
fi
CURRENT_BRANCH_COMMIT=$(git rev-parse --verify "refs/heads/$BRANCH")
if [[ "$CURRENT_BRANCH_COMMIT" != "$CREATED_COMMIT" ]]; then
  GIT_INDEX_FILE="$TEMP_INDEX" git read-tree "$CURRENT_BRANCH_COMMIT"
  cp "$TEMP_INDEX" "$LIVE_INDEX_LOCK"
  mv -f "$LIVE_INDEX_LOCK" "$LIVE_INDEX"
  LOCK_HELD=false
  echo "The branch changed after commit creation; refusing to push another commit." >&2
  exit 1
fi

cp "$TEMP_INDEX" "$LIVE_INDEX_LOCK"
mv -f "$LIVE_INDEX_LOCK" "$LIVE_INDEX"
LOCK_HELD=false

PUSH_REFSPEC="$CREATED_COMMIT:refs/heads/$PUSH_BRANCH"
git push "$PUSH_REMOTE" "$PUSH_REFSPEC"
if [[ "$SET_UPSTREAM" == true ]]; then
  git config "branch.$BRANCH.remote" "$PUSH_REMOTE"
  git config "branch.$BRANCH.merge" "refs/heads/$PUSH_BRANCH"
fi

rm -f "$BRANCH_REF_LOCK"
BRANCH_LOCK_HELD=false

echo "✅ Successfully pushed $BRANCH to $PUSH_REMOTE/$PUSH_BRANCH"
