#!/usr/bin/env python3
"""Claude Code PreToolUse path guard.
Blocks Write/Edit operations targeting files outside an allowed worktree.
Place this at PROJECT_ROOT/.claude/guards/check_path.py
"""

import sys, json, os

# ── 配置 ──────────────────────────────────────────────────
ALLOWED_DIR = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
# ──────────────────────────────────────────────────────────

def main():
    raw = sys.stdin.read()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        print("OK")  # allow if we can't parse (shouldn't happen)
        sys.exit(0)

    file_path = data.get("file_path", "")
    if not file_path:
        print("OK")
        sys.exit(0)

    abs_path = os.path.abspath(file_path)

    # Always allow files inside allowed dir
    if abs_path.startswith(os.path.abspath(ALLOWED_DIR) + os.sep):
        print("OK")
        sys.exit(0)

    # Also allow the allowed dir itself
    if abs_path == os.path.abspath(ALLOWED_DIR):
        print("OK")
        sys.exit(0)

    # ── Blocked ──
    print(f"BLOCKED: Write outside project directory: {file_path}")
    print(f"Allowed: {ALLOWED_DIR}")
    sys.exit(2)  # exit 2 = Claude Code blocks the operation


if __name__ == "__main__":
    main()
