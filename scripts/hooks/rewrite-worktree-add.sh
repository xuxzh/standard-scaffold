#!/usr/bin/env bash
# Claude Code PreToolUse hook (matcher: Bash).
# Routes `git worktree add ...` through the repo's
# scripts/worktree-add.sh wrapper so the new worktree (a) inherits the
# gitignored files declared in `.worktreeinclude` and (b) is validated
# by the wrapper's placement + branch-prefix guardrail.
#
# Contract:
#   - Reads the tool-call payload as JSON on stdin.
#   - Detects any `git worktree add` invocation, tolerating a leading
#     `rtk ` proxy prefix and surrounding whitespace.
#   - Plain, safely-rewritable form (optionally `rtk `-prefixed):
#     emit `hookSpecificOutput.updatedInput` replacing the command with
#     the wrapper path + the rest.
#   - A `git worktree add` that is NOT safely rewritable (compound
#     command with `&&`/`;`/pipe, `git -C <dir> worktree add`, unusual
#     spacing): `deny` with guidance to use an isolated command /
#     `pnpm worktree:add`, so the guardrail cannot be bypassed.
#   - Anything that is not a worktree-add: emit nothing, exit 0.
#   - Never hard-locks the user: if jq/git/wrapper are unavailable, fall
#     through silently (exit 0) rather than deny.

set -e

input="$(cat || true)"
[ -z "$input" ] && exit 0

# Need jq to parse the payload; if missing, no action.
command -v jq >/dev/null 2>&1 || exit 0

cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // ""')"
[ -n "$cmd" ] || exit 0

# --- 1. Is this a `git worktree add` at all? -----------------------------
# Match `git [-C <dir>] worktree add` as a word boundary; ignore
# `git worktree list` etc. If grep is missing this returns non-zero and
# we treat the command as unrelated (silent passthrough).
if ! printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_])git[[:space:]]+(-C[[:space:]]+[^[:space:]]+[[:space:]]+)?worktree[[:space:]]+add([[:space:]]|$)'; then
  exit 0
fi

# --- 2. Resolve repo root + wrapper. Silent passthrough if unavailable. ---
repo_root="$(git rev-parse --show-superproject-working-tree 2>/dev/null || true)"
if [ -z "$repo_root" ]; then
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
fi
[ -n "$repo_root" ] || exit 0

wrapper="$repo_root/scripts/worktree-add.sh"
[ -x "$wrapper" ] || exit 0

# --- 3. Normalize: trim leading whitespace, strip leading `rtk ` tokens ---
norm="$cmd"
norm="${norm#"${norm%%[![:space:]]*}"}" # trim leading whitespace
while :; do
  case "$norm" in
    rtk[[:space:]]*)
      norm="${norm#rtk}"
      norm="${norm#"${norm%%[![:space:]]*}"}"
      ;;
    *) break ;;
  esac
done

# --- 4. Plain rewritable form -> route through the wrapper ---------------
case "$norm" in
  "git worktree add "*)
    rest="${norm#git worktree add }"
    new_cmd="$wrapper $rest"
    escaped="$(printf '%s' "$new_cmd" | jq -Rsa .)"
    cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "command": $escaped
    }
  }
}
EOF
    exit 0
    ;;
esac

# --- 5. A worktree-add that we cannot safely rewrite -> deny -------------
reason="检测到 git worktree add，但不是可安全改写的独立形式（复合命令 && / ; / 管道、git -C，或异常空格）。请改用 pnpm worktree:add .worktrees/<name> -b <prefix>/<topic>（前缀限 feat/ fix/ opt/ docs/ refactor/ chore/ test/），或用独立的 git worktree add 命令，以便落位/命名护栏校验生效。"
escaped_reason="$(printf '%s' "$reason" | jq -Rsa .)"
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": $escaped_reason
  }
}
EOF
exit 0
