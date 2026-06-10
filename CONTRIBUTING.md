# SURNA Developer Guidelines

## Golden Rule
**Every change must be isolated, reversible, and non-destructive.**
Extend features without breaking existing ones.

## Principles
1) Isolation — feature code lives in its own module (`/features/...`).  
2) Backwards compatibility — never break existing APIs/DB/client contracts.  
3) Atomic commits — one logical change per commit (DB OR API OR UI).  
4) Review on staging first — then production.

## Database Rules
- Never DROP/RENAME existing columns/tables directly in prod.
- Only ADD columns with safe defaults or `NULL`.
- Name migrations clearly: `YYYY-MM-DD_add_<thing>_to_<table>.sql`.
- Test migrations on staging first.

```sql
-- SAFE (additive)
ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'text';

-- UNSAFE (breaking)
-- ALTER TABLE dm_messages RENAME COLUMN body TO content;
```

## Backend Rules
- Each feature/router inside `/features/<name>/...`.
- Validate all inputs with zod; reject invalid requests (400), don't crash.
- Keep old routes functional until fully deprecated.
- Wrap shared services instead of editing them directly.

## Frontend Rules
- Separate hooks (`/hooks`) from components (`/components`).
- Styling changes must not touch API/logic hooks.
- Keep components small, reusable, monochrome (B/W) as per SURNA spec.

## General
- One commit = one change. No mixing DB+API+UI.
- Use feature flags for unfinished work.
- Review dependency updates; no blind installs.
- No console noise in production (use structured logging).

## Messenger (Package #8) UI Spec (Monochrome)
- Icons: idle = light gray; active/selected = black.
- No color accents. B/W only.
- DM rooms: `dm:<conversationId>`; Group rooms: `group:<groupId>`; User room: `user:<userId>`.
- Voice notes via Media (audio only); Calls via Socket.IO signaling + WebRTC (STUN/TURN env).

## Branch Naming
Format: `<type>/<scope>[/<ticket>]/<short-slug>`

**Types:** feature | fix | hotfix | chore | docs | refactor | release  

**Examples:**
- `feature/messenger/add-groups`
- `fix/events/timezone-bug`
- `chore/infra/ci-cache`
- `release/core/1.4.0`

## Commit Message Format
Use the provided template (.gitmessage.txt) with these types:
- `[DB]` - Database changes (migrations, schema)
- `[API]` - Backend API changes
- `[UI]` - Frontend/UI changes
- `[DOCS]` - Documentation updates
- `[CHORE]` - Build, tools, dependencies
- `[REFACTOR]` - Code refactoring without feature changes

**Examples:**
```
[UI] Messenger: monochrome bubbles
[DB] Add 'kind' to dm_messages (safe default)
[API] Add POST /api/messenger/groups
```