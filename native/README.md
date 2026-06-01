# AstranoV — Native (Unity + Cesium for Unity)

Native game-engine track. Real GPU rendering, real Cesium globe, native iOS / Android / desktop binaries. The web app at `/index.html` keeps evolving in parallel; this folder is the bet on game-engine smoothness.

## What's in here

| Path | Purpose |
| --- | --- |
| `Packages/manifest.json` | Cesium for Unity 1.13 + Input System + TMP + Cinemachine |
| `ProjectSettings/ProjectVersion.txt` | Unity 2022.3.40f1 LTS (any 2022.3 LTS works) |
| `Assets/Astranov/Scripts/AstranovBoot.cs` | Builds the globe + camera + GPS + Supabase + slumber at runtime |
| `Assets/Astranov/Scripts/Navigation.cs` | Three tiers (GLOBAL / NATIONAL / PERSONAL) + DIVE-TO-ME |
| `Assets/Astranov/Scripts/GPSTracker.cs` | Native GPS, motion-aware DRIVING / DRONE / SLUMBER |
| `Assets/Astranov/Scripts/SlumberController.cs` | Sleeps everything on background / 5-min idle |
| `Assets/Astranov/Scripts/SupabaseClient.cs` | Edge-function client (aicycle, etc.) |
| `Assets/Astranov/Scripts/Vendors.cs` | Overpass nearby-places → globe-anchored pins |
| `Assets/Astranov/Scripts/TapToDescend.cs` | Tap empty globe → descend one tier; tap beacon → DIVE-TO-ME |
| `Assets/Astranov/Scripts/Wordmark.cs` | Always-visible Greek-navy glowing wordmark (no box, by law) |

The MASTER LAW (in `/index.html` and `/CLAUDE.md`) governs this codebase too — Slumber Law, Dive-to-Me, Zero UI, the wordmark ban on chrome.

## Setup (locally, on your machine)

You need Unity Hub + Unity 2022.3 LTS installed.

1. **Open the project**: in Unity Hub click *Add* → select this `native/` folder. Unity will say "no scene" — that's expected on first open.
2. **Cesium ion token**: get one at <https://ion.cesium.com/tokens>. In Unity → *Cesium → Cesium ion → Connect to Cesium ion*, sign in, copy your access token.
3. **Wire up the boot scene**:
   - *File → New Scene* (Empty).
   - Create an empty GameObject called *Boot*, add the `AstranovBoot` component.
   - Paste your Cesium ion token into the Inspector field.
   - Paste your Supabase anon key (project URL is pre-filled).
   - *File → Save Scene As…* → `Assets/Astranov/Scenes/Main.unity`.
   - *File → Build Settings → Add Open Scenes*.
4. **Press Play**. The globe loads, camera starts at GLOBAL altitude over (35°N, 20°E). On a build with GPS, the user's beacon drops in and `DIVE-TO-ME` is one tap away.
5. **Build to mobile**:
   - iOS: *File → Build Settings → iOS → Build*. Open the produced Xcode project, sign, run.
   - Android: install Android Build Support module in Unity Hub, then *File → Build → Android*.

## Why Unity + Cesium for Unity over the web build

- **One GPU pipeline.** The browser was rendering Cesium + a DOM overlay every frame. Unity does the whole scene on the GPU once. No CSS compositor fighting WebGL.
- **AOT compilation.** No JS parse on cold start. Native ARM / x86 binaries, hardware acceleration, all engine optimisations from a 20-year-old game engine.
- **Same Cesium tiles.** The asset pipeline (Cesium World Terrain, Bing imagery, Black Marble overlay) is identical, served by the same ion account.
- **Same brain.** `SupabaseClient.cs` calls the existing `/aicycle`, `/informant-feed`, `/order-intake`, `/council` Edge Functions. No backend change.

## What's NOT ported yet (next surfaces, in order)

1. **Wordmark** — file is in, needs the canvas GameObject in `Main.unity` scene.
2. **User beacon prefab** — a small glowing quad with the `UserBeacon` component, dropped at the GPS fix's globe-anchor position.
3. **Vendor pin prefab** — referenced by `Vendors.pinPrefab`.
4. **AICYCLE ring** — `aicycle-float` equivalent: world-space floating widget bottom-right, tap = open chat panel (uGUI canvas).
5. **Tray / panels** — slide-up panels for Feed / Wallet / You, matching the Zero UI Law.
6. **Informant orbs** — apex orbital agents. In Unity these become `CesiumGlobeAnchor` billboards at high altitude over the camera centre, not DOM divs — that's the whole point of going native.
7. **Krypteia + Council** — owner-only panels behind the same identity gate.
8. **Voice / TTS** — `TextToSpeech` plugin or platform-native (AVSpeechSynthesizer / Android TTS) wrapped behind an interface.

## Notes on the law

- Code lives in the `Astranov` namespace and the `Astranov.asmdef` so the compile unit is sealed off from third-party packages.
- Every `MonoBehaviour` that opens a coroutine, GPS watch, or network connection registers a sleeper with `SlumberController.Register(...)` — same Slumber Law as the web app.
- No keys in source. `ionAccessToken` and `supabaseAnonKey` are Inspector fields, baked into the build at build time (anon key only — service role keys never leave Edge functions).
