# Device synchronization

The four user tables (`settings`, `session`, `active_words`, `learning_progress`)
sync through `lib/sync.js`. SQL stays in `db/queries.js`, accessed through the
repository. Words and translations remain the bundled shared dictionary.

## Local writes

Each repository mutation writes the record, its UTC `last_modified_at`, a local
`sync_versions` entry, and the queue operation in one SQLite transaction.
Deletions get their own timestamp. Versions are monotonic per record, including
when the clock is behind a previously received timestamp. Queue entries are
removed individually only after Supabase acknowledges the request. Retried
operations are safe.

## Server

Supabase's `apply_sync_change` function verifies the authenticated user matches
the payload owner, uses an allowlist of tables, and locks the record while
comparing timestamps. A strictly newer timestamp wins; an exact tie keeps the
server record. The function applies the row and records the change atomically.

`sync_records` holds each record's latest payload/version, including deletion
markers. Triggers capture changes on the four tables. RLS allows authenticated
users to read only their own change feed; clients cannot directly write it.
The two privileged functions have explicit authentication/ownership checks
(the capture trigger is not executable by clients). Both have a fixed empty
search path. Source definitions are recorded in Supabase migration history.

The advisor's [authenticated SECURITY DEFINER warning](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
is expected for `apply_sync_change`: only authenticated callers can invoke it,
and every target row and change-feed query is explicitly scoped to `auth.uid()`.
The payload must name that same account. Privilege elevation is needed to maintain
the otherwise read-only deletion ledger atomically.

Pulls read the full user change feed in ordered pages of 500. Local newer or
pending changes win; imported records do not generate another queue entry.
Deletion versions prevent an older device from recreating deleted records.
Deletion markers are retained indefinitely, so long-offline devices remain safe.

## Lifecycle

Sync runs on sign-in/startup, after local writes, app resume, browser reconnect,
and Supabase Realtime notifications. Failed requests retain queued work and
retry with exponential backoff up to 60 seconds. Healthy connections do not poll.
Pull application is deferred while a study session is on screen and resumes on
navigation, keeping an in-progress question stable. Imported data invalidates
user caches and refreshes Home and Settings.

Each account has its own SQLite/IndexedDB database. The first signed-in account
claims the pre-existing `cardly.db`; later accounts get separate files. Guest
and new-account databases clear any personal sample data from the bundled file
once on initialization. Account changes abort the prior sync worker, and the
server rejects any request whose expected account no longer matches its token.

Initialization adds the sync metadata tables and missing timestamp columns to
existing local databases. No local migration scripts are required.

Last-write-wins uses device timestamps: clock skew between devices can affect
which write wins. Counters are whole-record values, not additive merges.

## Verification

Run `node --test tests/sync.test.cjs` for isolated SQLite conflict/queue checks.
Server checks were run as the authenticated role inside a rolled-back transaction:
stale updates, retries, deletions, newer recreation, and account isolation.
