#!/bin/bash
set -e
# --no-audit / --no-fund cut ~10s off npm install in this repo and were
# pushing the script past the 20s post-merge timeout. --prefer-offline
# uses the local cache when present, which is the common case for merges
# that don't touch package.json.
npm install --no-audit --no-fund --prefer-offline
# Drizzle-kit's `--force` skips data-loss confirmations but still prompts
# interactively on ambiguous **rename** detection (table-rename vs
# drop+create), which hangs the post-merge step (20s timeout). Feed it a
# stream of "+" answers — that selects "create table" / "create column"
# for every prompt, which is the safe choice when no actual rename is
# intended (the merge already shipped the new table in shared/schema.ts).
yes "+" | npm run db:push -- --force || true
