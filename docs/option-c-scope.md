# Option C Scope — TS Mod Reimplementation in TypeScript + Babylon.js

**Date:** 2026-10-14
**Author:** Evo (Hermes orchestrator)
**Status:** Draft for Kyle's review
**Source of truth:** this doc is canonical; once approved, it folds into SPEC.md and HANDOFF.md.

---

## TL;DR

**Goal:** rebuild The Specialists mod as a TypeScript/Babylon.js browser game, playable in a single tab with bots. Phase 1 MVP = one map, one weapon, basic bot AI, walk around and shoot a bot.

**Why this is the path forward:**
- CheerpX path died (4 architectural surprises in 1 hour; full record at `tools/smokes/tier-3-manual-phase-1-step-1.1.md`).
- specialists-web was doing this kind of work in the weeds on WebGPU/WebTransport/netcode. Kyle has chosen a clean restart in specialists-browser (not continuing specialists-web). No blind copy from specialists-web per the project rule.
- Asset-free repo contract preserved: source files stay in `_runtime_assets/` (gitignored); converted/runtime files also gitignored.

**Honest timeline estimate** (starting from a clean repo, no specialists-web code reuse):
- Phase 1 MVP (1 map + 1 weapon + basic bot): **10-16 weeks** (the slow part is the Babylon.js rendering layer + asset pipeline + BSP conversion tool — these are net-new code with no copyable reference)
- Phase 2 TS-specific features (acrobatics, slowmo, dual-wield, more weapons/maps): **6-10 weeks**
- Phase 3 Multiplayer (WebRTC datachannel): **6-10 weeks**
- Phase 4 Polish (sound, settings, perf, all maps): **variable**

Total shippable single-player TS: **4-7 months**. Multiplayer-ready: **6-9 months**.

These are realistic estimates for one person working part-time. Faster if Kyle contributes directly.

---

## 1. Goal & exit criteria

### Phase 1 MVP — what "done" looks like for a user

1. Open `https://100.95.111.112:5174/` in Vivaldi on Mac.
2. Page loads (HTTPS self-signed cert warning accepted; one-time per device).
3. Click "Load HL1 + TS assets" (or the equivalent asset picker).
4. Page shows a loading progress bar while it loads the converted map.
5. Within ~10s, the player is dropped into **ts_heresy** (smallest TS map, ~5MB .bsp) in first-person view.
6. **Player controls** all work:
   - `WASD` — move
   - `Mouse` — look (with pointer lock)
   - `Space` — jump
   - `Ctrl` — crouch
   - `LMB` — fire pistol
   - `R` — reload
7. **Pistol in hand**, fires hit-scan bullets, kicks back slightly on fire, has cooldown.
8. **One bot** spawns at a TS bot spawn point from the BSP entities, walks toward the player, fires back with imperfect accuracy.
9. **Damage system works:**
   - Player HP starts at 100, bot shots reduce it.
   - Bot HP starts at 100, player shots reduce it.
   - When HP reaches 0, entity dies (ragdoll optional, falls-down for Phase 1).
10. **HUD overlay** (HTML/CSS on top of canvas):
    - Health bar (top left)
    - Ammo counter (bottom right)
    - Crosshair (center)
    - Death screen (brief, then respawn at TS player spawn point)
11. **Tier-3 smoke:** Kyle plays the MVP, takes a screenshot of player model + 1 bot + HUD in action. Save to `docs/cheats/phase-1-mvp-tier-3-smoke.png`.

### What "Phase 1 MVP NOT done" looks like (explicit non-goals)

- **No multiplayer** (Phase 3). Listen server only — single browser tab, client + server in same JS context.
- **Only one map** (ts_heresy). Other maps in Phase 2.
- **Only one weapon** (pistol). Other weapons in Phase 2.
- **No TS-specific features** (acrobatics, slowmo, dual-wield, kick, katana, throwing knives, etc.). All Phase 2.
- **No real bot AI** — direct line-of-sight "move + shoot" only. Proper TS bot logic in Phase 2.
- **No sound** (or placeholder beeps). Sound design in Phase 2.
- **No original asset formats** (`.bsp`, `.mdl`, `.wav` read directly in browser). All Phase 1 assets are pre-converted to glTF (see §2.3).

---

## 2. Architecture

### 2.1 Stack

- **Build:** Vite (already configured with HTTPS + COEP/COOP for crossOriginIsolated).
- **Language:** TypeScript (already configured).
- **3D engine:** Babylon.js 7.x.
- **Rendering:** WebGL2 (Babylon.js default; explicitly avoid WebGPU for Phase 1 to dodge specialists-web's debug trench).
- **Audio:** Web Audio API (Phase 2; Phase 1 silent or placeholder beeps).
- **Physics:** Babylon.js built-in collision (Phase 1). Havok v2 WASM for Phase 2 if needed.
- **Networking:** None in Phase 1. WebRTC datachannel in Phase 3.
- **Server model:** Listen server in browser tab. Client + server in same JS context, server runs in a Web Worker so the main thread stays responsive.

### 2.2 3D engine: Babylon.js (decision)

**Why:** Babylon.js is a mature, well-documented TypeScript-first 3D engine with built-in support for glTF loading, animation blending, character controllers, and Havok physics integration. It's the same engine specialists-web was using, so we know it can run the basics. ~3MB gzipped bundle.

**Alternatives considered:**

| Engine | Bundle | TS support | Risk | Verdict |
|---|---|---|---|---|
| Babylon.js | ~3MB | First-class | Medium (specialists-web was fighting it but mostly on WebGPU/WebTransport, not core Babylon) | ✅ chosen |
| Three.js | ~600KB | Via community types | Lower bundle, less feature coverage, would re-implement more | ❌ more work for less |
| Custom WebGL2 | 0 | N/A | Maximum control, maximum work | ❌ 12+ months |
| xash3d-fwgs WASM | N/A | N/A | Dead end — CheerpX PoC proved it | ❌ excluded |

### 2.3 Asset pipeline — convert to glTF, load at runtime

**Source formats (TS mod + HL1):**

| Format | Used for | GoldSrc detail |
|---|---|---|
| `.bsp` | Maps | BSP29/BSP30 with TS-specific entities |
| `.mdl` | Models (player, weapons, items) | Quake-derived mesh + animation format |
| `.wav` | Sounds | PCM audio |
| `.spr` | Sprites (muzzle flashes, decals) | Custom image format |
| `.wad` | Archives (textures) | Valve's archive format |
| `.tga`/`.bmp` | Standalone textures | Common formats |

**Babylon.js natively supports:** glTF, GLB, OBJ, FBX, STL. None of the GoldSrc formats are direct Babylon formats.

**Phase 1 strategy: pre-convert to glTF via a one-time dev script.**

- `tools/convert-bsp.ts <input.bsp>` → `<input>.gltf` + `<input>.bin` (geometry + entities)
- `tools/convert-mdl.ts <input.mdl>` → `<input>.gltf` + `<input>.bin` (mesh + animations)
- WAD textures: load directly via a small custom WAD parser in TS (texture loading is fast and the WAD format is simple).
- WAV sounds: load directly (Web Audio API plays WAV natively).
- SPR sprites: load directly via a small custom SPR parser (PNG-equivalent).

**Conversion tool placement:**
- Source: `_runtime_assets/half-life/{valve,ts}/` (gitignored)
- Output: `_runtime_assets/converted/` (gitignored, regenerated by `tools/convert-ts-assets.ts`)
- One-time per asset, idempotent

**Runtime loading:**
- Vite serves `/runtime-assets/converted/` from the gitignored working dir
- Browser fetches `.gltf` + `.bin` + `.wad` + `.wav` + `.spr` at runtime
- Asset picker UI (Phase 1) lets Kyle select the converted dir, or a `?assets=/runtime-assets/converted/` query param does it

**Phase 2+ consideration:** writing a runtime `.bsp` parser would eliminate the pre-conversion step but is much more work. Defer until we have the gameplay working and know the conversion tool's pain points.

### 2.4 Map format: glTF (Phase 1 decision)

Phase 1 uses glTF-converted maps loaded via Babylon.js's `SceneLoader.ImportMeshAsync`.

Phase 2+ could add a runtime `.bsp` parser to load original maps without pre-conversion. Not in Phase 1 scope.

**Why glTF for Phase 1:** Babylon.js loads glTF natively, no parser work in the runtime, fast iteration. We can re-evaluate when we have the gameplay working.

### 2.5 Server model: listen server in browser tab (Phase 1)

Phase 1 = single browser tab. The "server" runs in a **Web Worker** in the same tab, the "client" runs on the main thread. They communicate via `postMessage`.

This lets us:
- Test the multiplayer architecture (client and server are separate code paths that exchange messages) without needing two tabs or two devices
- Phase 3 (real multiplayer) becomes "open the WebRTC datachannel between two Web Workers" — the server code is unchanged
- No backend infrastructure needed for Phase 1 development

### 2.6 Multiplayer: deferred to Phase 3

Phase 1 = local only. No networking between tabs/devices.

Phase 3 candidate: WebRTC datachannel P2P (low latency, no backend). SFU bridge is a fallback if P2P NAT traversal fails.

### 2.7 Asset distribution for production (deferred)

For dev, assets stay in `_runtime_assets/` (gitignored). The user (Kyle for now) sources them locally.

For production, three options:

1. **Bundle converted files in the dist/ directory.** Bundle gets large (~50MB+ with all TS maps + models). Acceptable for a dedicated game site, not for general hosting.
2. **Host on a CDN.** Kyle runs his own, or use a public CDN with appropriate licensing. Most scalable.
3. **Make users upload their own HL1+TS files.** Heavy friction; probably not viable for casual players.

Decision deferred to Phase 4 (polish). For Phase 1 MVP, dev-only asset sourcing is fine.

---

## 3. Reimplementation scope

### Phase 1 MVP — 10-16 weeks

11 sub-projects, each its own design + implement + smoke + commit cycle:

1. **Project scaffolding** — Vite + TS + Babylon.js hello world. Render a colored cube. (1-2 days)
2. **Player controller** — first-person camera (Babylon.js UniversalCamera + PointerLock), WASD + mouse look + jump + crouch. (3-5 days)
3. **Map conversion tool** — GoldSrc BSP29 parser, extract geometry + entities, write glTF. Test on ts_heresy.bsp. (3-5 days)
4. **MDL conversion tool** — GoldSrc MDL parser, extract mesh + animations, write glTF. Test on player.mdl. (3-5 days)
5. **Map loading** — load converted glTF into Babylon scene, set up lighting + textures. (2-3 days)
6. **Player collision** — character controller against map geometry (no physics, just raycast + sliding). (2-3 days)
7. **Weapon viewmodel** — render pistol model in front of camera, first-person FOV adjustment, idle bob. (2-3 days)
8. **Weapon firing** — LMB input, fire rate cooldown, hit-scan raycast, hit detection, muzzle flash sprite. (2-3 days)
9. **Bot AI (basic)** — spawn at TS bot spawn entity, move toward player (direct line-of-sight), fire with imperfect accuracy. (3-5 days)
10. **Damage system** — HP on player + bot, damage on hit, death state, respawn at TS player spawn. (1-2 days)
11. **HUD** — HTML overlay with health bar, ammo counter, crosshair, death/respawn UI. (1-2 days)
12. **Tier-3 smoke** — Kyle plays, screenshots, smoke notes, commit. (1 day)

**Total Phase 1: ~25-35 working days = 5-7 weeks at full-time, 10-16 weeks part-time.**

### Phase 2 — TS-specific features (6-10 weeks)

In priority order (each is its own sub-project):

1. **More weapons** (shotgun, SMG, assault rifle, sniper — the TS modded set). Each: model conversion, weapon firing (different behavior — shotgun is multiple pellets, sniper is slow + high damage + scope zoom, etc.), HUD updates. (2-3 weeks)
2. **TS bots** — replace direct-line-of-sight AI with proper TS bot logic: cover-taking, weapon preferences per-bot, voice lines, taunts, etc. Probably the hardest single sub-project. (2-3 weeks)
3. **Acrobatics** — dive (forward + crouch), roll (left/right + crouch), wallrun (jump toward wall at angle), walljump (jump while on wall), climb (hold jump at vertical surface). Animations + movement code + collision tweaks. (2-3 weeks)
4. **Slowmo** — when player gets a headshot, time dilates to 0.25x for 2 seconds. Visual effect (motion blur or chromatic aberration), input scaling, recovery. (1 week)
5. **Dual-wield** — equip two pistols (e.g., two Berettas), fire both with LMB, alternate fire pattern. (1 week)
6. **Kick** — melee attack (F key by default), reach check, damage on hit, knockback. (3-5 days)
7. **Throwing knives / shuriken** — single-shot projectile weapon, knife sticks in geometry, can be picked up. (1 week)
8. **Katana** — melee weapon, longer reach than kick, one-hit-kill on backstab. (1 week)
9. **TS HUD** — round timer, score, names, ping display, death messages. (1 week)
10. **More maps** — tm_harbor, cs_office, banana, etc. Each: BSP conversion + entity setup + bot spawn placement + lighting tuning. (2-3 weeks)
11. **Sound** — load WAV files, ambient soundscape, weapon sounds, footstep sounds, hit sounds. (1-2 weeks)
12. **Map entities** — triggers (teleporters, damage zones), scripts (round start, round end), lights, decals. (2 weeks)

### Phase 3 — Multiplayer (6-10 weeks)

1. **WebRTC datachannel P2P** — connection setup, NAT traversal (STUN/TURN), signaling server (minimal, just for handshake). (2-3 weeks)
2. **Server in Web Worker** (already done in Phase 1, but harden it). (1 week)
3. **Hit registration** — server-side hit validation, lag compensation, client-side prediction. (2 weeks)
4. **Connection flow UI** — host/join menu, server browser (or just direct IP/room code for P2P). (1 week)
5. **Reconnection logic** — drop detection, automatic reconnect, state resync. (1 week)
6. **Multiplayer smoke** — Kyle opens two tabs, plays against himself, verifies. (1 week)

### Phase 4 — Polish (variable)

- All TS weapons and maps
- Settings menu (mouse sensitivity, FOV, volume, etc.)
- Performance optimization (LOD, occlusion, batching)
- Sound design (replace placeholder beeps)
- Bot difficulty levels
- Save/load settings
- Anti-cheat (probably minimal for browser game)
- Packaging (npm package, hosted URL, etc.)

---

## 4. Step plan (Phase 1 in detail)

Each step is a self-contained sub-project. After each step: commit, push, smoke (tier-3 via Kyle in Vivaldi for visible features, tier-2 headless for tools).

### 4.1 — Project scaffolding (1-2 days)

**Goal:** Vite + TypeScript + Babylon.js hello world. Page loads, renders a colored cube.

Tasks:
- Update `package.json` with `babylonjs` dependency (~v7.x)
- Run `npm install` (or `bun install`)
- Create `src/main.ts`, `src/scene.ts`, `src/engine.ts`
- Add a "Hello Babylon" demo: rotating cube on canvas, full viewport
- Verify in Vivaldi at `https://100.95.111.112:5174/`

Exit: Page shows a rotating colored cube.

### 4.2 — Player controller (3-5 days)

**Goal:** First-person camera with WASD + mouse look + jump + crouch. Empty scene.

Tasks:
- Babylon.js `UniversalCamera` with `PointerLock`
- Keyboard input (WASD)
- Mouse input (yaw + pitch with sensitivity)
- Movement physics (gravity, jump impulse, crouch height reduction)
- Basic collision against an invisible bounding box (placeholder for map)

Exit: Kyle gets a first-person view, walks around an empty scene, jumps, crouches.

### 4.3 — Map conversion tool (3-5 days)

**Goal:** `bun run convert-bsp ts_heresy.bsp` produces `ts_heresy.gltf` + `ts_heresy.bin`.

Tasks:
- GoldSrc BSP29/BSP30 parser (header, lumps, vertices, edges, faces, textures, entities)
- Extract geometry as triangle meshes, one per texture
- Extract entities (player spawns, bot spawns, info_player_start, info_player_deathmatch, info_landmark, light, etc.)
- Write glTF (JSON + binary buffer)
- Handle the BSP lumps: VERTICES, EDGES, FACES, SURFEDGES, TEXINFO, TEXTURES, ENTITIES

Reference: <https://hlfx.ru/tech/info/bsp_format.html> (Russian-language but the most complete doc).

Exit: Running the script on `ts_heresy.bsp` (1.8MB) produces a valid glTF that loads in Babylon.js sandbox.

### 4.4 — MDL conversion tool (3-5 days)

**Goal:** `bun run convert-mdl player.mdl` produces `player.gltf` + `player.bin` with mesh + animations.

Tasks:
- GoldSrc MDL parser (header, bodyparts, meshes, textures, sequences, anim frames)
- Extract mesh (one per bodypart, sub-model)
- Extract animation sequences (walk, run, jump, crouch, fire, die)
- Write glTF with mesh + skin + animation tracks
- Reference: <https://hlfx.ru/tech/info/mdl_format.html>

Exit: Loading `player.gltf` in Babylon.js shows the player model with a working walk animation.

### 4.5 — Map loading (2-3 days)

**Goal:** Load converted `.gltf` into Babylon scene, render it.

Tasks:
- Babylon.js `SceneLoader.ImportMeshAsync` or `AssetContainer`
- Apply textures from WAD files (small custom WAD parser: read directory, extract `.bmp`/`.tga`)
- Set up lighting (sun light + ambient; BSP light entities in Phase 2)
- Camera starts at the first `info_player_start` entity from the BSP

Exit: Opening the URL loads ts_heresy.gltf and renders it; player is standing at the correct spawn point.

### 4.6 — Player collision (2-3 days)

**Goal:** Player can't walk through walls.

Tasks:
- Babylon.js scene collision system OR custom character controller
- Detect collisions against map mesh (raycast in movement direction, slide along walls)
- Handle stairs (small height step-up) and slopes

Exit: Player walks to a wall, can't pass through. Walking along walls slides smoothly.

### 4.7 — Weapon viewmodel (2-3 days)

**Goal:** Render a pistol model in front of the camera.

Tasks:
- Convert a pistol MDL (e.g., `ts/weapons/v_beretta.mdl` or `valve/weapons/v_crowbar.mdl` as placeholder)
- Add to scene as a child of the camera (NOT a child of the player mesh — viewmodels are camera-local)
- Render with first-person FOV adjustment (so the weapon looks right)
- Idle bob (subtle position oscillation as player walks)
- Fire animation (recoil + slide back + return)

Exit: Player sees a pistol in their hand; pistol bobs while walking.

### 4.8 — Weapon firing (2-3 days)

**Goal:** Click to fire the pistol. Bullet raycast. Hits register on geometry.

Tasks:
- LMB input handling
- Fire rate cooldown (e.g., 0.2s between shots)
- Hit-scan raycast from camera through crosshair (Babylon.js scene.pickWithRay)
- Hit detection against map geometry (visual decal/sparks at hit point)
- Muzzle flash (SPR sprite at weapon muzzle, brief duration)
- Bullet count decrement (ammo)

Exit: Click to fire; bullet trail + muzzle flash visible; hit point shows spark/decal.

### 4.9 — Bot AI (basic) (3-5 days)

**Goal:** One bot spawns, moves toward player, fires weapon with imperfect accuracy.

Tasks:
- Bot spawn at the first `info_player_deathmatch` entity from BSP (Phase 1 uses one bot)
- Bot model = player model, different color (or use a separate bot MDL if available)
- Bot pathfinding: direct line-of-sight move toward player (Phase 1), proper navmesh in Phase 2
- Bot firing: same as player, with accuracy modifier (Phase 1 bots miss ~50% of the time)

Exit: One bot spawns, walks toward player, fires back imperfectly.

### 4.10 — Damage system (1-2 days)

**Goal:** Bots damage player. Player damages bots. Death + respawn work.

Tasks:
- HP on player + bot (start 100)
- Damage on hit (pistol = 15 damage per shot)
- Death state (HP 0 → falls down / ragdoll / Phase 1 = simple "lie down" animation)
- Respawn: 3s after death, return to spawn point, full HP

Exit: Bot shoots player, HP drops visibly. Player shoots bot, bot dies and respawns.

### 4.11 — HUD (1-2 days)

**Goal:** HTML overlay with health, ammo, crosshair, death UI.

Tasks:
- HTML/CSS overlay (absolute-positioned divs over the Babylon canvas)
- Health bar (top left, green → red gradient as HP drops)
- Ammo counter (bottom right, current magazine / reserve)
- Crosshair (center, small SVG)
- Death screen (fades in on death, "Press F to respawn", fades out on respawn)

Exit: HUD overlays the gameplay correctly. Updates in real-time.

### 4.12 — Tier-3 manual smoke (1 day)

**Goal:** Kyle plays the MVP, takes a screenshot, commits.

Tasks:
- Kyle opens `https://100.95.111.112:5174/`
- Kyle clicks "Load HL1 + TS assets", selects the converted dir
- Kyle plays: spawns at TS player spawn, walks around, fires pistol, kills the bot
- Kyle screenshots: player model + HUD + 1 bot in action → `docs/cheats/phase-1-mvp-tier-3-smoke.png`
- Kyle writes smoke notes → `tools/smokes/tier-3-manual-phase-1-mvp.md`

Exit: Phase 1 MVP GREEN end-to-end.

---

## 5. Risks & fallbacks

### Risk 1: BSP conversion tool is harder than expected (MEDIUM probability)

GoldSrc BSP format is well-documented but quirky. Texture coordinates, lightmaps, surface edges, clipping hulls — each can eat days. The conversion tool alone could take 2x the estimated time.

**Fallback:** if BSP conversion becomes the blocker, defer Phase 1 to use a simple flat-shaded map (no lightmaps, no clipping hulls) and add visual polish in Phase 2. Or use Blender's BSP importer plugin and skip writing our own parser.

### Risk 2: Babylon.js WebGPU issues (LOW probability for Phase 1)

specialists-web was fighting WebGPU. If we hit similar issues, fall back to WebGL2.

**Fallback:** Phase 1 explicitly uses WebGL2 (`new Engine(canvas, true, { disableWebGPU: true })` or similar Babylon.js API). WebGPU can be Phase 4 polish.

### Risk 3: Bundle size too big (LOW probability)

Babylon.js + glTF assets + conversion tools = potentially 5-10MB bundle.

**Fallback:** code-split Babylon.js (only load the parts we use), lazy-load maps on demand (only fetch the map the player selects), use compressed textures (.basis/.ktx2).

### Risk 4: Bot AI "move + shoot" is too boring (HIGH probability)

Direct line-of-sight is "stand and shoot" — not fun gameplay.

**Fallback:** this is expected. Phase 1 is a tech demo, not a fun game. Phase 2 adds proper bot AI. Don't optimize for fun in Phase 1.

### Risk 5: Asset conversion at runtime is too slow (LOW probability)

For Phase 1 we pre-convert, so runtime just loads glTF. If glTF loading is slow (>10s), check if it's the fetch or the parse.

**Fallback:** pre-convert at build time, ship converted files in the bundle.

### Risk 6: Performance (MEDIUM probability)

First-person rendering + bot AI + collision detection + weapon viewmodel + HUD = potentially 30 FPS on mid-tier hardware.

**Fallback:** profile + optimize, reduce bot count, reduce viewmodel detail, disable shadows/post-processing for Phase 1.

### Risk 7: Asset distribution for production (HIGH probability)

We can't ship the original TS mod files. Users need to source them somehow.

**Fallback:** clear instructions on the README; or partner with the TS mod team for distribution; or commit to a different gameplay scope that doesn't need TS-specific assets.

### Risk 8: WebRTC P2P for Phase 3 doesn't work for all network setups (MEDIUM probability)

NAT traversal fails for some users (symmetric NATs, strict firewalls). WebRTC P2P needs STUN/TURN servers; TURN servers cost money for bandwidth.

**Fallback:** small SFU bridge (a $5/mo VPS running a WebRTC forwarding service). This is Phase 3 problem, not Phase 1.

---

## 6. Open questions (need answers from Kyle)

1. **Convert to glTF (Phase 1), or write a runtime BSP parser (slower but more flexible)?** My pick: glTF for Phase 1 (faster to MVP). Phase 2+ can add runtime parser if needed.
2. **One weapon to start, or all weapons from day 1?** My pick: one weapon (pistol) for Phase 1, more weapons in Phase 2.
3. **One map to start, or all TS maps?** My pick: one map (ts_heresy, smallest) for Phase 1, more in Phase 2.
4. **Bot AI sophistication?** My pick: "move + shoot" for Phase 1 (boring but works), proper TS bot logic in Phase 2.
5. **WebGPU or WebGL2?** My pick: WebGL2 for Phase 1 (Babylon.js default, more stable, no WebGPU debugging trench). WebGPU can be Phase 4 polish.
6. **Naming convention?** specialists-browser is the repo. The page could be at `/` (root) or `/specialists/` (sub-path). My pick: `/` (cleaner URL, matches the repo name).
7. **What to do with the webXash submodule?** Remove it (Option C doesn't need it) or keep it for reference? My pick: **remove** (clean repo, dead weight).
8. **Asset distribution strategy?** My pick: dev-only for Phase 1 (Kyle sources locally), defer production decision to Phase 4.
9. **Listen server in same browser tab vs separate tabs even for Phase 1?** My pick: same tab (Web Worker for server). Less moving parts.

---

## 7. Cross-references

- **SPEC.md** — will fold this doc in once approved; the project-wide design doc
- **HANDOFF.md** — per-session state; updated at each step exit
- **tools/smokes/tier-3-manual-phase-1-step-1.1.md** — CheerpX PoC record (what didn't work)
- **tools/smokes/tier-3-manual-phase-0-step-3.md** — Phase 0 smoke (infrastructure partial green)
- **~/Development/specialists-web/** — REFERENCE ONLY, do not blindly copy per Kyle's rule
- **Babylon.js docs:** <https://doc.babylonjs.com/>
- **GoldSrc BSP format:** <https://hlfx.ru/tech/info/bsp_format.html>
- **GoldSrc MDL format:** <https://hlfx.ru/tech/info/mdl_format.html>

---

## 8. Trigger / handoff

**When this doc is approved:**

1. **Update SPEC.md** with the new direction (Option C: TypeScript + Babylon.js).
2. **Update HANDOFF.md** with the new "Next task" = 1.1 Project Scaffolding.
3. **Optionally:** remove the webXash submodule (Kyle's call).
4. **Then:** start step 4.1 (Project Scaffolding) — either by me (Evo) directly or by dispatching to a T3 thread per the project rule.

**Approval gates:**

- 4.1 GREEN (Babylon.js hello world) → 4.2 (Player controller)
- 4.2 GREEN (FPS controller works) → 4.3 (BSP conversion)
- 4.3 GREEN (glTF produced) → 4.4 (MDL conversion)
- 4.4 GREEN → 4.5 (Map loading)
- 4.5 + 4.6 + 4.7 GREEN → 4.8 (Weapon firing)
- 4.8 + 4.9 + 4.10 + 4.11 GREEN → 4.12 (Tier-3 smoke)
- 4.12 GREEN → Phase 1 MVP done

Each gate is a T3 commit + Kyle review.

---

*Draft for Kyle's review. Not yet executed. Once approved, this becomes the canonical plan and feeds into SPEC.md.*