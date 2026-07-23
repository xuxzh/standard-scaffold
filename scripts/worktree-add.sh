#!/usr/bin/env bash
# worktree-add.sh — thin wrapper around `git worktree add` that also
# copies files listed in the repo-tracked `.worktreeinclude` from the
# main worktree to the newly created one.
#
# Why: .env files are gitignored, so `git worktree add` alone does not
# carry them over. The repo declares which ignored files to propagate
# in `.worktreeinclude`; this script is the consumer for that contract.
#
# Usage:
#   scripts/worktree-add.sh <path> [<commit-ish>]
#   scripts/worktree-add.sh -b <new-branch> [<path>] [<start-point>]
#   scripts/worktree-add.sh --detach [<path>] [<commit-ish>]
#   scripts/worktree-add.sh -- <path> [<commit-ish>]    # `--` is stripped
#
# Behavior:
#   - Forwards every argument to `git worktree add` unchanged, except
#     a leading `--` is dropped (so `pnpm worktree:add -- ...` works
#     the same way as the bare form).
#   - Enforces repo conventions BEFORE creating the worktree (hard
#     block, exits non-zero): the target path must live under
#     `<repo_root>/.worktrees/`, and any newly created branch (`-b`/
#     `-B`) name must start with an allowed prefix (see ALLOWED_*).
#   - After a successful add, reads `.worktreeinclude` from the repo
#     root and copies each listed path (relative to repo root) to the
#     same path inside the new worktree, creating parent dirs as needed.
#   - Missing source files, missing `.worktreeinclude`, or empty lines
#     / `#` comments are skipped with a warning, never fatal.
#   - Unknown args that prevent path detection are non-fatal; we still
#     leave the new worktree in place and just skip the copy stage.

set -euo pipefail

# pnpm forwards its own `--` end-of-options marker to the script as the
# first arg; git then rejects it as an unknown flag. Drop it here so
# `pnpm worktree:add -- path -b branch ref` works the same as the bare
# form.
if [ "${1:-}" = "--" ]; then
  shift
fi

# --- 1. Resolve the main worktree (repo root) ----------------------------

repo_root="$(git rev-parse --show-superproject-working-tree 2>/dev/null || true)"
if [ -z "$repo_root" ]; then
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
fi
if [ -z "$repo_root" ]; then
  echo "worktree-add.sh: not inside a git working tree" >&2
  exit 128
fi

# --- 2. Parse forwarded args: detect new worktree path + new branch ------
#
# We parse BEFORE running git so we can hard-block non-compliant calls.
# The new path is the first positional (non-flag) argument. The only
# flag whose value is *not* a path is `-b` / `-B` (new branch name).

new_path=""
new_branch=""
prev=""
for arg in "$@"; do
  case "$prev" in
    -b|-B)
      new_branch="$arg" # branch name, not a path
      ;;
    *)
      case "$arg" in
        -*) : ;; # bare flag
        *)
          if [ -z "$new_path" ]; then
            new_path="$arg"
          fi
          ;;
      esac
      ;;
  esac
  prev="$arg"
done

# --- 3. Enforce placement + branch-name conventions (hard block) ---------
#
# Allowed branch prefixes: Conventional-Commit-aligned + a few extensions.
# Keep this list as the single source of truth for the naming policy.
ALLOWED_PREFIXES="feat fix opt docs refactor chore test"
ALLOWED_DISPLAY="feat/ fix/ opt/ docs/ refactor/ chore/ test/"

usage() {
  echo "  正确用法示例: pnpm worktree:add .worktrees/opt-foo -b opt/foo" >&2
  echo "  - 路径必须在 <repo_root>/.worktrees/ 下" >&2
  echo "  - 新建分支(-b/-B)名必须以下列前缀之一开头: ${ALLOWED_DISPLAY}" >&2
}

if [ -z "$new_path" ]; then
  echo "worktree-add.sh: 拒绝创建——无法从参数解析出 worktree 路径" >&2
  usage
  exit 1
fi

# Resolve target to an absolute path for the placement check.
case "$new_path" in
  /*) target="$new_path" ;;
  *)  target="$repo_root/$new_path" ;;
esac

# Placement: target must live *under* <repo_root>/.worktrees/ (a real
# subdirectory, not the `.worktrees` dir itself).
wt_root="$repo_root/.worktrees/"
case "$target/" in
  "$wt_root"?*) : ;;
  *)
    echo "worktree-add.sh: 拒绝创建——路径 '$new_path' 不在 .worktrees/ 下" >&2
    usage
    exit 1
    ;;
esac

# Branch prefix: only enforced when creating a NEW branch (-b/-B). Attaching
# an existing branch or --detach skips this check (path check still applies).
if [ -n "$new_branch" ]; then
  prefix_ok=0
  for p in $ALLOWED_PREFIXES; do
    case "$new_branch" in
      "$p"/?*) prefix_ok=1; break ;;
    esac
  done
  if [ "$prefix_ok" -ne 1 ]; then
    echo "worktree-add.sh: 拒绝创建——新建分支名 '$new_branch' 前缀不合规" >&2
    usage
    exit 1
  fi
fi

# --- 4. Run the real worktree add ---------------------------------------

git worktree add "$@"

if [ ! -d "$target" ]; then
  echo "worktree-add.sh: new worktree path '$target' not found after add; skipping file copy" >&2
  exit 0
fi

# --- 5. Copy files declared in .worktreeinclude -------------------------

include_file="$repo_root/.worktreeinclude"
if [ ! -f "$include_file" ]; then
  exit 0
fi

copied=0
skipped=0
while IFS= read -r line || [ -n "$line" ]; do
  # Trim leading/trailing whitespace.
  f="${line#"${line%%[![:space:]]*}"}"
  f="${f%"${f##*[![:space:]]}"}"
  # Skip blank lines and comments.
  [ -z "$f" ] && continue
  case "$f" in
    \#*) continue ;;
  esac

  src="$repo_root/$f"
  dst="$target/$f"

  if [ ! -e "$src" ]; then
    echo "worktree-add.sh: skip '$f' (source missing in main worktree)" >&2
    skipped=$((skipped + 1))
    continue
  fi

  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
  copied=$((copied + 1))
done < "$include_file"

if [ "$copied" -gt 0 ] || [ "$skipped" -gt 0 ]; then
  echo "worktree-add.sh: .worktreeinclude → copied $copied, skipped $skipped"
fi
