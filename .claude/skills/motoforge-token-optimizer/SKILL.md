---
name: motoforge-token-optimizer
description: Keeps MOTOFORGE work sessions cheap and resumable — where state lives, what to read first, what never to read whole, and how to save progress before context compaction. Use at the start of a session, before a long task, and before stopping.
---

# MOTOFORGE token optimizer

## Start of session (read in this order, stop when you have enough)
1. `docs/PROGRESS.md` — current state and **next task**.
2. `CLAUDE.md` — permanent rules.
3. Only the skill for the task: `motoforge-pwa`, `-design`, `-catalog`, `-graphics`.

## Never read whole
`web/src/data/catalog.json`, `Packages/.../catalog.json` (query with `python3 -c` / `jq`), `web/src/lib/liquid-glass.js`, `web/package-lock.json`, GLB/PNG files, `tools/bike3d/cb125r_jc91.py` (grep the function you need), Playwright output (pipe to `tail`).

## Work cheaply
- Grep before reading; read line ranges.
- Run tests with `| tail -5`; one Playwright project (`--project chromium-390x844`) while iterating, all projects before committing.
- Look at one screenshot per change, not all of them.
- Batch independent commands in one call.

## Before stopping or when context is large
Update `docs/PROGRESS.md` (done, verified, problems, **next task**), commit, push to the working branch.
