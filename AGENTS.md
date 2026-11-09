# Cardly project instructions

These instructions apply throughout this repository.

## Stack and commands

- Cardly is a vocabulary learning app for Android, iOS, and web. It uses JavaScript, Expo SDK 58, React Native, and React Navigation Stack.
- Expo HAS CHANGED. Read the exact versioned docs at https://docs.expo.dev/versions/v58.0.0/ before writing any code. Check installed versions in `package.json` before choosing APIs.
- Follow the existing functional component, hook, and `StyleSheet` conventions.
- Install dependencies with `npm ci`. Start development with `npm start`, `npm run android`, `npm run ios`, or `npm run web`.
- To clear Metro's cache, use `npm start -- --clear`.
- Export the web app with `npx expo export --platform web`. `wrangler.jsonc` configures Cloudflare Workers to serve `dist` as a single-page application.
- Android preview builds use `eas build --platform android --profile preview`. Builds and deployments should be part of the requested task.
- App version changes must keep `app.json` and `package.json` in sync. EAS manages native build numbers remotely.

## Architecture

- `App.js` coordinates navigation, authentication entry, Home state, session actions, and analytics consent.
- `screens/` contains screens. `components/` contains reusable UI. `screens/MainTabsScreen.js` manages the tab content.
- `theme/` contains shared colors, typography, and layout tokens. `constants/preferences.js` defines language and level options.
- `learning/learning.js` owns word selection, review intervals, active words, and learning state changes. `learning/sessionProgress.js` owns session progress calculations.
- Application data access goes through `db/repository.js`. Application SQL belongs in `db/queries.js`. `db/cache.js` maintains caches scoped to the database instance.
- `db/SQLiteProvider.js` provides native SQLite. `db/SQLiteProvider.web.js` implements the web adapter using sql.js and IndexedDB persistence. Keep platform-specific storage details in these adapters.
- `components/AccountDatabase.js` selects the database for the current account. `db/cardly.db` is the bundled database used to initialize local storage.
- `lib/auth.js`, `lib/sync.js`, and `lib/analytics.js` own authentication, synchronization, and analytics respectively. See `docs/synchronization.md` for sync details and check the implementation when changing them.

## Learning behavior to preserve

- Keep the next-step priority in one place. The current order is a full active queue, a due review, an eligible new word within the daily limit, any remaining active word, then session completion.
- Home previews use `selectNextStep` without writing learning state. Starting the session reuses the prepared step and applies `commitNextStep`. Regular session selection uses `getNextStep`.
- A Home preview must not advance the level, update counters, or mark a word as learned. Invalidate stale previews when relevant settings or data change.
- Only a correct first attempt counts as correct. A later correct answer completes the question without earning a correct-answer streak increment.
- A due review's interval decreases only once after an incorrect first attempt. Active-word answers do not change the review interval.
- Preserve daily date rollover, language scoping, active-word origins, session counters, and progress persistence when changing learning code.
- Keep card animation state and learning mutations coordinated. Reset answer state between questions, and skip the card swap for the final word.

## Data integrity and privacy

- Keep repository caches consistent with database mutations. Preserve account isolation and filter language-specific user records by the selected learning language.
- Local user-data mutations, timestamps, sync metadata, and sync queue entries must remain atomic. Preserve deletion tracking and conflict resolution when changing synchronization.
- Schema updates must support both the bundled database and existing installations. Reuse `db/migrations.js` and query-layer helpers for compatible local upgrades.
- Never overwrite an existing user's database with the bundled file to apply a schema change.
- Preserve Supabase ownership checks and RLS. Keep privileged credentials out of client code and logs.
- Analytics may run only when the saved preference is `accepted`. Consent evaluation follows the initial sync attempt, including offline failure, without blocking normal startup.

## UI and platform behavior

- For Figma tasks, inspect the requested design and reuse shared components and tokens. Apply component states centrally, including `IconButton`, rather than adding screen-specific copies.
- Use `useIsTablet` and `useIsDesktop` for responsive behavior. Tablet layouts apply above 768px. Desktop layouts apply on web at 1200px and wider. Layout must update on resize and rotation.
- Use `useScreenEdgePadding` for phone/tablet safe areas plus the shared 16px content gap. Desktop uses 20px vertical and 24px horizontal padding. Do not hardcode the safe-area sizes shown in Figma examples.
- Home and Session share `useStudyScreenLayout` to align their card stacks. Preserve the reserved four-answer container height even when fewer buttons are visible.
- Keep fixed headers and bottom navigation outside scrolling content. Preserve scrolling on short screens and the existing web overscroll containment.
- Respect system font scaling and prevent text clipping on native and web. Keep TalkBack/VoiceOver labels concise and inactive tabs out of the accessibility tree.
- Reuse the shared delayed press behavior. Do not introduce shrink animations or timing changes unless requested.
- Guard native-only APIs on web. Preserve accessible focus handling after each question and enough time for answer feedback announcements.

## Making and checking changes

- Keep edits focused on the request. Preserve unrelated local changes and existing user data.
- Use JavaScript for project scripts and database tooling, following the project's existing approach.
- Run relevant existing checks. The current tests use Node's built-in runner: `node --test tests/authStorage.test.cjs tests/passwordRecovery.test.cjs tests/sync.test.cjs`.
- There is currently no npm test or lint script. Do not claim checks ran unless they actually ran.
- For learning changes, check selection priorities, first-attempt handling, daily limits, level transitions, and session completion. Include stale-data and account-switch cases when changing caches or sync.
- For responsive UI changes, check the affected phone, tablet, and desktop layouts, short screens, and larger system text. State whether browser or native testing was performed.
- Remove temporary logs, mock responses, and diagnostic files before finishing unless the user asks to keep them.
