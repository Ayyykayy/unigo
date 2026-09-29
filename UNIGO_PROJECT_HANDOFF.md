# UniGo --- Project Handoff & Implementation Guide

> Generated from the actual contents of `unigo-team.zip` and
> `unigo-backend.zip`. This document distinguishes **implemented code**
> from **placeholders / integration work still required**.

## 1. What UniGo Is

UniGo is a campus navigation and transport application built around two
main ideas:

1.  **Campus navigation** --- students can search campus locations and
    open them on a map.
2.  **Campus bus discovery/tracking** --- campus buses such as `V12` and
    `V13` can report their location, the backend detects when a bus has
    arrived on campus, and a student can use a **Find** flow that
    returns distance, bearing, relative direction and proximity.

The intended Find experience is similar to locating a nearby device:
once a bus has arrived, a student can move toward it using live
proximity/direction information rather than only seeing a static map
pin.

The repository is currently split into:

-   `unigo-team` --- Expo / React Native mobile UI.
-   `unigo-backend` --- TypeScript / Express backend using Firebase
    Authentication and Firebase Realtime Database.

------------------------------------------------------------------------

# 2. Current Architecture

``` text
┌─────────────────────────────┐
│      UniGo Mobile App       │
│ Expo + React Native         │
│                             │
│ Home / Map / Buses / AI     │
│ Google Sign-In UI           │
└──────────────┬──────────────┘
               │ HTTPS + Firebase ID token
               ▼
┌─────────────────────────────┐
│      UniGo Backend API      │
│ Node.js + Express + TS      │
│                             │
│ Auth / Bus status / Find    │
│ Distance / Bearing / Reach  │
└──────────────┬──────────────┘
               │ Firebase Admin SDK
               ▼
┌─────────────────────────────┐
│          Firebase           │
│ Authentication             │
│ Realtime Database          │
└─────────────────────────────┘
```

Important: the backend bus-tracking system is implemented, but the
supplied mobile frontend still contains hard-coded demo bus data and has
**not yet been wired to these backend bus APIs**.

------------------------------------------------------------------------

# 3. Technology Stack

## Mobile / Team App

-   Expo SDK `~57.0.25`
-   React `19.2.3`
-   React Native `0.86.3`
-   React Navigation
    -   native stack
    -   bottom tabs
-   `react-native-maps`
-   `react-native-webview`
-   `expo-location`
-   `expo-auth-session`
-   `expo-web-browser`
-   Google OAuth provider
-   `@expo-google-fonts/figtree`
-   `@expo/vector-icons`
-   React Native Reanimated
-   React Native SVG
-   EAS configuration

## Backend

-   Node.js
-   TypeScript
-   Express
-   Firebase Admin SDK
-   Firebase Authentication
-   Firebase Realtime Database
-   `dotenv`
-   `tsx`
-   Node's built-in test runner

------------------------------------------------------------------------

# 4. Repository Structure

``` text
UniGo/
├── unigo-team/
│   ├── App.js
│   ├── UniGo.jsx
│   ├── index.js
│   ├── app.json
│   ├── eas.json
│   ├── package.json
│   ├── components/
│   │   └── LeafletMap.jsx
│   ├── assets/
│   ├── CLAUDE.md
│   └── AGENTS.md
│
└── unigo-backend/
    ├── src/
    │   ├── app.ts
    │   ├── server.ts
    │   ├── store.ts
    │   └── geo.ts
    ├── tests/
    │   └── core.test.ts
    ├── scripts/
    │   ├── seed.ts
    │   ├── provision-demo.ts
    │   └── simulate-v12.ts
    ├── dev/
    │   ├── index.html
    │   └── app.js
    ├── .env.example
    ├── firebase.json
    ├── database.rules.json
    ├── API.md
    ├── README.md
    ├── package.json
    └── tsconfig.json
```

------------------------------------------------------------------------

# 5. Mobile App --- Implemented UI

The main UI currently lives primarily in `UniGo.jsx`.

## Splash

Displays the UniGo logo and tagline:

> Find Your Way.

After a short animation it navigates into the main tab interface.

## Home

Contains:

-   user greeting
-   profile shortcut
-   campus search
-   quick campus destination cards
-   campus bus shortcut
-   floating AI assistant button

## Campus Map

The app contains a campus map flow and a reusable `LeafletMap`
component.

Campus places currently defined in the frontend include:

-   Main Gate
-   Admission Cell
-   Academic Block
-   Hostel Office
-   Finance Office
-   Medical Center
-   Cafeteria
-   Bus Parking

These coordinates/content are currently frontend constants and should
eventually come from a controlled data source if locations need to
change dynamically.

## Buses

A bus list UI exists.

The frontend currently contains demo buses:

``` text
21 — Zone A — Arrived at parking
34 — Zone B — Near main gate
47 — Zone C — Leaving campus
```

This does **not** match the backend bus IDs (`V12`, `V13`) and must be
replaced with backend data.

## Campus AI

An AI assistant UI exists.

The frontend currently attempts:

``` text
POST https://YOUR_BACKEND/ask
```

with:

``` json
{
  "q": "student question"
}
```

The supplied backend does **not** currently implement `/ask`.

Therefore Campus AI is UI/prototype functionality only until an AI
endpoint is added.

## Google Login

Google OAuth code exists through Expo Auth Session.

Current placeholders:

``` text
COLLEGE_DOMAIN = yourcollege.edu.in
androidClientId = YOUR_ANDROID_CLIENT_ID
webClientId = YOUR_WEB_CLIENT_ID
```

The app retrieves Google user information after successful OAuth.

These values must be configured before production use.

## Profile / ID Setup

The app contains profile and student-ID setup UI.

------------------------------------------------------------------------

# 6. Backend --- Implemented Functionality

The backend is the stronger functional part of the current bus-tracking
module.

It implements:

-   Firebase token verification
-   student/driver roles
-   driver-to-bus assignment
-   bus location updates
-   automatic campus arrival detection
-   bus location freshness checking
-   distance calculation
-   bearing calculation
-   relative direction calculation
-   proximity classification
-   GPS uncertainty information
-   reached confirmations
-   duplicate reached-confirmation protection
-   development helpers
-   automated tests

------------------------------------------------------------------------

# 7. Firebase Data Model

The code uses structures conceptually like:

``` text
users/
  <uid>/
    role: student | driver

drivers/
  <driverUid>/
    activeBus: V12

buses/
  V12/
    status: AWAY | ARRIVED
    driverId: <uid>
    arrivalAt: <timestamp>
    location:
      lat: <number>
      lng: <number>
      accuracy: <number|null>
      heading: <number|null>
      updatedAt: <server timestamp>

reached/
  V12/
    <arrivalAt>/
      <studentUid>: <timestamp>
```

The seed script creates `V12` and `V13` when absent.

The demo provisioning script assigns a Firebase user as a student and
another as the driver of `V12`.

------------------------------------------------------------------------

# 8. Authentication and Roles

All `/api/*` routes require:

``` http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

The backend verifies the ID token through Firebase Admin.

Roles are stored in Firebase:

-   `student`
-   `driver`

A driver may update only the bus assigned to that driver's `activeBus`.

A student cannot submit driver location updates.

A driver cannot use student-only Find operations.

------------------------------------------------------------------------

# 9. API Endpoints

## Health

``` http
GET /health
```

Used to confirm the service is running.

Expected response:

``` json
{
  "ok": true
}
```

------------------------------------------------------------------------

## Current User

``` http
GET /api/me
Authorization: Bearer <token>
```

Returns authenticated user/role information.

------------------------------------------------------------------------

## List Buses

``` http
GET /api/buses
Authorization: Bearer <token>
```

Returns valid bus IDs and status information.

The backend only accepts bus IDs matching:

``` text
V<number>
```

Examples:

``` text
V12
V13
V120
```

The response includes information such as:

-   bus ID
-   status
-   last update timestamp
-   whether the location is currently considered live

------------------------------------------------------------------------

## Driver Location Update

``` http
POST /api/buses/:busId/location
Authorization: Bearer <driver-token>
Content-Type: application/json
```

Example:

``` json
{
  "latitude": 16.46438,
  "longitude": 80.50702,
  "accuracy": 8,
  "heading": 180
}
```

Only the assigned driver can update that bus.

The backend calculates distance from the configured campus center.

If the bus is within:

``` text
CAMPUS_RADIUS_METERS
```

its status becomes:

``` text
ARRIVED
```

Otherwise:

``` text
AWAY
```

When a bus transitions into the campus arrival area, an `arrivalAt`
timestamp identifies that arrival session.

------------------------------------------------------------------------

# 10. The Find Bus Flow

This is the core backend implementation for the requested bus-discovery
feature.

``` http
POST /api/buses/:busId/find
Authorization: Bearer <student-token>
Content-Type: application/json
```

Example request:

``` json
{
  "studentLatitude": 16.4644,
  "studentLongitude": 80.5071,
  "studentAccuracy": 5
}
```

The backend checks that:

1.  the caller is a student;
2.  the bus exists;
3.  the bus has a location;
4.  the bus is currently `ARRIVED`;
5.  the location is not stale.

It then calculates information required by the Find UI.

## Distance

Calculated using a Haversine/geospatial distance function.

## Bearing

The backend calculates the bearing from the student toward the bus.

This can drive an arrow in the mobile UI.

## Relative Direction

A helper calculates:

``` text
(bus bearing - device heading) normalized to 0–360°
```

This is useful for rotating an on-screen arrow relative to the direction
the student is facing.

## Proximity States

Implemented thresholds:

``` text
FOUND       < 5 m
VERY_NEAR   5 m to < 20 m
NEAR        20 m to 100 m
FAR         > 100 m
```

Exact tested boundaries:

``` text
4.99 m  -> FOUND
5 m     -> VERY_NEAR
20 m    -> NEAR
100 m   -> NEAR
100.01m -> FAR
```

This means the frontend can progressively change its Find screen instead
of showing only a raw number.

------------------------------------------------------------------------

# 11. GPS Accuracy / Uncertainty

The backend does not blindly treat GPS coordinates as exact.

It combines:

``` text
student GPS accuracy + bus GPS accuracy
```

and returns uncertainty-related information.

This is important because normal phone GPS cannot provide AirTag-style
centimeter precision.

The intended experience should therefore be presented as **direction +
approximate proximity**, not ultra-wideband precision.

------------------------------------------------------------------------

# 12. Stale Location Protection

Default backend configuration:

``` text
LOCATION_MAX_AGE_SECONDS=30
```

If the bus has not sent a fresh location within the configured age, Find
rejects the location as stale.

The tested error code is:

``` text
LOCATION_STALE
```

This prevents students from following an old bus position.

------------------------------------------------------------------------

# 13. Reached Confirmation

Student:

``` http
POST /api/buses/:busId/reached
```

A student can confirm reaching a bus.

The backend verifies that the student is sufficiently close before
accepting the confirmation.

Duplicate confirmations from the same student for the same bus arrival
are protected.

Driver:

``` http
GET /api/buses/:busId/reached
```

The driver can obtain the reached count for the active arrival.

Because confirmations are tied to `arrivalAt`, a new bus arrival starts
a new reached session.

------------------------------------------------------------------------

# 14. Backend Environment Variables

Create:

``` text
.env
```

from:

``` text
.env.example
```

Required/available values:

``` env
PORT=3000

CAMPUS_LAT=
CAMPUS_LNG=
CAMPUS_RADIUS_METERS=200
LOCATION_MAX_AGE_SECONDS=30

FIREBASE_PROJECT_ID=
FIREBASE_DATABASE_URL=
FIREBASE_WEB_API_KEY=

GOOGLE_APPLICATION_CREDENTIALS=

DRIVER_ID_TOKEN=

STUDENT_UID=
DRIVER_UID=
```

For local emulator development, the project also supports:

``` env
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000
```

------------------------------------------------------------------------

# 15. Firebase Security Approach

`database.rules.json` currently denies direct client database access:

``` json
{
  "rules": {
    ".read": false,
    ".write": false
  }
}
```

That means database operations are intended to go through the trusted
backend using Firebase Admin rather than allowing the mobile client to
directly read/write the Realtime Database.

Keep this architecture unless there is a deliberate reason to redesign
it.

------------------------------------------------------------------------

# 16. Backend Setup

From `unigo-backend`:

``` bash
npm install
```

Create `.env` from `.env.example` and configure Firebase/campus values.

Run development server using the scripts defined by the backend package.

Before integrating the mobile app, verify:

``` http
GET http://localhost:3000/health
```

returns:

``` json
{"ok":true}
```

## Firebase Emulators

The supplied `firebase.json` configures:

-   Authentication emulator: `9099`
-   Realtime Database emulator: `9000`
-   Firebase Emulator UI

Use the backend README/package scripts as the source of truth for the
exact npm commands available in the repository.

------------------------------------------------------------------------

# 17. Seed / Demo Utilities

## Seed buses

`scripts/seed.ts`

Creates these buses when they do not already exist:

``` text
V12
V13
```

## Provision demo users

`scripts/provision-demo.ts`

Requires:

``` env
STUDENT_UID=
DRIVER_UID=
```

It:

-   checks that both Firebase Authentication users exist;
-   gives one the `student` role;
-   gives one the `driver` role;
-   assigns the driver to `V12`.

## Simulate V12

`scripts/simulate-v12.ts`

Uses a real driver ID token and sends a sequence of bus coordinates
toward the configured campus radius.

This is useful for testing the arrival transition without physically
driving a bus.

------------------------------------------------------------------------

# 18. Automated Tests Already Present

`tests/core.test.ts` tests both geospatial logic and API behavior.

Coverage includes:

-   zero distance
-   known approximate earth distance
-   east/west bearing
-   relative heading normalization
-   every proximity boundary
-   authentication failures
-   invalid tokens
-   role restrictions
-   wrong driver restrictions
-   invalid latitude
-   invalid heading
-   malformed JSON
-   missing bus location
-   bus-away behavior
-   automatic ARRIVED state
-   FAR / NEAR / VERY_NEAR / FOUND responses
-   GPS uncertainty
-   reached confirmation
-   duplicate confirmation
-   too-far rejection
-   arrival-session reset
-   stale-location rejection

Do not remove these tests while integrating the frontend.

Any change to the bus algorithm should keep these tests passing or
deliberately update them when behavior is intentionally changed.

------------------------------------------------------------------------

# 19. Mobile App Setup

From `unigo-team`:

``` bash
npm install
npx expo start
```

Available package scripts include:

``` bash
npm start
npm run android
npm run ios
npm run web
```

The project is configured for EAS and uses Android package:

``` text
com.akanksha.unigo
```

EAS project ID is already present in `app.json`.

------------------------------------------------------------------------

# 20. Google Services Present in the Project

Google-related functionality already appears in the codebase in several
places.

## Google OAuth

The mobile app uses:

``` text
expo-auth-session/providers/google
```

Current client IDs are placeholders and must be replaced.

## Google User Info

After OAuth, the app requests Google's user-info endpoint to obtain the
signed-in user's account information.

## Google Maps / Mapping

`react-native-maps` is installed.

The source comments explicitly note that an Android Google Maps key must
be added to `app.json`.

## Firebase

The backend uses Google's Firebase platform for:

-   Authentication
-   Realtime Database
-   Admin token verification

Therefore Google/Firebase services are already part of the intended
architecture; they are not merely future suggestions.

------------------------------------------------------------------------

# 21. Critical Frontend ↔ Backend Integration Still Required

This is the main remaining engineering task.

## A. Replace hard-coded frontend buses

Remove/replace:

``` text
21
34
47
```

with:

``` http
GET /api/buses
```

The UI should display actual backend buses such as `V12` and `V13`.

## B. Use Firebase Authentication-compatible tokens

The backend expects a **Firebase ID token**.

The existing frontend performs Google OAuth, but Google OAuth access
tokens and Firebase ID tokens are not interchangeable.

The login flow must authenticate the Google user into Firebase
Authentication and obtain a Firebase ID token before calling `/api/*`.

Do not simply send the Google access token to the backend.

## C. Add one API client

Create a small centralized frontend API module rather than scattering
`fetch()` calls across screens.

Conceptual responsibilities:

``` text
getMe()
getBuses()
updateBusLocation()
findBus()
confirmReached()
getReachedCount()
```

Every authenticated request should attach:

``` http
Authorization: Bearer <firebase-id-token>
```

## D. Connect Find button

When a bus has:

``` text
status = ARRIVED
```

show:

``` text
Find & Track
```

The button should open a dedicated Find screen.

## E. Implement Find screen

The screen should:

1.  request foreground location permission;
2.  watch the student's location;
3.  read device heading when available;
4.  repeatedly call `/api/buses/:busId/find`;
5.  show distance;
6.  rotate a large arrow using relative direction;
7.  show the proximity state;
8.  clearly indicate stale/unavailable bus data;
9.  allow the student to confirm `Reached`.

Suggested display behavior:

``` text
FAR       -> "Move toward the bus" + distance
NEAR      -> stronger directional state
VERY_NEAR -> "You're very close"
FOUND     -> "Bus found"
```

Do not claim centimeter-level precision.

## F. Driver location source

The backend already supports driver location updates, but the supplied
mobile UI does not currently provide a complete driver tracking
interface.

A driver mode or separate driver app/process must:

-   obtain driver location permission;
-   periodically send location;
-   optionally send heading;
-   stop updates safely when tracking is disabled.

Endpoint:

``` http
POST /api/buses/:busId/location
```

## G. Remove/implement AI placeholder

The frontend calls:

``` text
https://YOUR_BACKEND/ask
```

but the supplied backend has no `/ask`.

Either:

1.  implement the endpoint securely on the backend; or
2.  disable the Campus AI feature until it exists.

Never place a Gemini/API secret directly in the mobile app.

------------------------------------------------------------------------

# 22. Recommended Find Screen Data Flow

``` text
Driver phone
    │
    │ GPS updates
    ▼
POST /api/buses/V12/location
    │
    ▼
Backend
    │
    ├── validates driver
    ├── saves location
    ├── computes campus distance
    └── marks V12 ARRIVED/AWAY
              │
              ▼
Student app: GET /api/buses
              │
              └── V12 = ARRIVED
                       │
                       ▼
                 [Find & Track]
                       │
                       ▼
Student location + heading
                       │
                       ▼
POST /api/buses/V12/find
                       │
                       ▼
distance + bearing + proximity
                       │
                       ▼
Arrow / distance / state UI
                       │
                       ▼
             Student reaches bus
                       │
                       ▼
POST /api/buses/V12/reached
```

------------------------------------------------------------------------

# 23. Suggested Implementation Order

Keep the implementation focused. Do not rebuild the existing UI
unnecessarily.

## Phase 1 --- Make backend reproducibly runnable

-   install backend dependencies;
-   configure `.env`;
-   connect Firebase project/emulators;
-   run tests;
-   run `/health`;
-   seed `V12` / `V13`.

**Done when:** backend tests pass and authenticated bus endpoints work.

## Phase 2 --- Fix authentication bridge

-   configure Google OAuth IDs;
-   configure Firebase Authentication Google provider;
-   sign the Google user into Firebase;
-   retrieve Firebase ID token;
-   create frontend API client;
-   verify `/api/me`.

**Done when:** a real student can call the backend from the app.

## Phase 3 --- Replace demo bus list

-   fetch `/api/buses`;
-   show `V12`, `V13`, status and live state;
-   show Find only for usable arrived buses.

**Done when:** frontend status reflects backend state instead of
hard-coded arrays.

## Phase 4 --- Driver tracking

-   establish driver mode/interface;
-   watch driver GPS;
-   send updates to `/location`;
-   handle permission/error states.

**Done when:** physically moving the driver device changes the backend
bus location.

## Phase 5 --- Find & Track

-   create Find screen;
-   watch student location;
-   obtain heading;
-   call `/find`;
-   render arrow, distance and proximity;
-   handle stale/AWAY/no-location errors.

**Done when:** a student can physically walk toward V12 and see the
state move through the proximity levels.

## Phase 6 --- Reached confirmation

-   call `/reached`;
-   show confirmation;
-   optionally show driver reached count.

**Done when:** confirmations are counted once per student per arrival.

## Phase 7 --- Real-device verification

Test with at least two devices:

``` text
Device A -> driver / V12
Device B -> student
```

Test:

-   bus outside campus;
-   bus enters campus;
-   student sees ARRIVED;
-   Find button appears;
-   direction changes while student rotates/moves;
-   distance decreases;
-   proximity changes;
-   stale driver location is rejected;
-   Reached works;
-   new arrival resets reached session.

## Phase 8 --- Deployment

-   deploy backend over HTTPS;
-   set production Firebase credentials securely;
-   configure production backend base URL in the app;
-   configure Android/iOS Google OAuth;
-   configure Maps key;
-   create EAS development/preview build;
-   repeat physical-device tests;
-   then create production build.

------------------------------------------------------------------------

# 24. Definition of Done for the Bus Module

The bus module should not be considered complete merely because a map
screen renders.

It is complete when:

-   Firebase Authentication works end-to-end;
-   backend verifies Firebase ID tokens;
-   real buses are loaded from backend;
-   driver assignment is enforced;
-   driver GPS reaches backend continuously;
-   campus arrival is detected automatically;
-   Find is available only when appropriate;
-   student GPS is used;
-   distance is live;
-   direction/bearing is live;
-   proximity states work;
-   stale data is visibly rejected;
-   reached confirmation works;
-   automated backend tests pass;
-   two-device physical testing passes.

------------------------------------------------------------------------

# 25. Known Gaps / Mismatches in the Current ZIPs

These should be treated as integration tasks, not hidden.

1.  Frontend buses (`21`, `34`, `47`) do not match backend buses (`V12`,
    `V13`).
2.  Frontend bus list is currently hard-coded.
3.  Frontend is not yet calling the supplied bus API.
4.  Google OAuth client IDs are placeholders.
5.  College domain is a placeholder.
6.  The AI backend URL is a placeholder.
7.  `/ask` is not implemented in the supplied backend.
8.  A Firebase-ID-token bridge is required between frontend
    authentication and backend API authentication.
9.  Android Google Maps configuration is not visibly completed in
    `app.json`.
10. A complete driver-side continuous GPS flow is not present in the
    supplied mobile UI.
11. The final Find/arrow UI still needs to be connected to the backend
    geospatial response.
12. Campus location constants should be verified before production.

------------------------------------------------------------------------

# 26. Rules for Continuing Development with Codex / AI Agents

To avoid wasting tokens and accidentally rewriting working code:

1.  **Read before editing.**
2.  Treat `unigo-team` and `unigo-backend` as one system.
3.  Do not redesign the UI unless required for functionality.
4.  Reuse the existing backend geospatial functions.
5.  Reuse the existing API routes.
6.  Do not replace Firebase unless explicitly requested.
7.  Do not expose Firebase service credentials or AI API keys in the
    app.
8.  Do not confuse Google OAuth access tokens with Firebase ID tokens.
9.  Run existing backend tests after backend changes.
10. Test authentication/permissions, not only happy paths.
11. Prefer small patches per phase.
12. Report exactly which files changed after each phase.
13. Do not claim a feature works until its test or real-device
    verification succeeds.
14. Keep prompts scoped to one phase to reduce token consumption.

A good Codex task format is:

``` text
Read the existing files first.
Implement ONLY Phase X from PROJECT.md.
Reuse existing architecture and UI.
Do not rewrite unrelated files.
Run the relevant tests/checks.
Fix failures caused by your changes.
At the end report:
1. files changed
2. what now works
3. exact test results
4. anything still blocked
```

------------------------------------------------------------------------

# 27. Immediate Next Task

The highest-value next step is **not** another UI redesign.

The next implementation target should be:

``` text
Connect the existing Expo authentication flow to Firebase Authentication,
obtain a Firebase ID token, create one reusable API client, and make
GET /api/me + GET /api/buses work from the real mobile app.
```

Once that works, the existing backend bus-tracking logic can be exposed
to the frontend with relatively small, testable changes.

------------------------------------------------------------------------

# 28. Short Project Summary

UniGo already has two useful foundations:

-   a polished Expo/React Native campus application shell;
-   a tested Firebase-backed bus proximity API.

The key remaining work is the bridge between them.

The backend already contains the important logic for the requested `V12`
/ `V13` arrival and Find experience: authenticated driver updates,
automatic arrival status, stale-location protection, distance, bearing,
relative direction helpers, proximity states and reached confirmations.

The frontend should now be integrated with that backend rather than
rebuilding those calculations locally.
