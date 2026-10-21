// cts_game_rules.cpp — implementation of CTSGameRules (header is
// cts_game_rules.h).
//
// In addition to being the explicit-instantiation site that the linker
// needs to see the class, this translation unit also houses the
// `bridge_diagLog` channel used by R1 to discover which engine
// callbacks actually fire when our WASM is loaded. The bridge is a
// tiny `EM_JS` that writes `[HS]` lines to console.log — the test
// harness `side-by-side.js` already captures those.
//
// Why this file: it's ours. We control it. Adding the bridge here
// keeps the diagnostic path inside our overlay sources instead of
// patching HLSDK callers (which would muddy the diff and re-trigger
// the "did we modify upstream?" question).

#include "cts_game_rules.h"

#include <emscripten.h>

#include "extdll.h"   // for enginefuncs_t / DLL_FUNCTIONS
#include "eiface.h"   // for DLL_FUNCTIONS layout (HLSDK-provided)

namespace {

// === Diagnostic bridge to JS console ===
//
// 4-arg signature: tag (one of HS_* below), entity index (or 0),
// return value (or 0), extra context (or 0). Tagged so the JS side
// can filter for `[HS]` lines.
//
// THROTTLING — this is load-bearing, not cosmetic.
//
// The pump drives TS game logic at ~60Hz (48.9Hz measured in real
// Chromium, 17.6Hz in headless). Every bridge_diagLog from a hot
// path is therefore ~60 console lines/sec, which is roughly 3600
// lines/minute. That drowns everything else in the console — a real
// `HS_PLAYER_SPAWN` marker scrolls past before you can read it, and
// the console becomes the single biggest performance cost in the
// frame. Kyle hit exactly this on 2026-10-21 and called it "tons of
// console spam".
//
// So: hot-path tags are rate-limited here, in the bridge, rather
// than at each call site. Doing it centrally means a future call
// site can't reintroduce spam by forgetting to throttle.
//
// Overridable at runtime for debugging — no rebuild needed:
//   window.__hs_log_gate = () => true            // log everything
//   window.__hs_log_gate = k => k === 'HS_PLAYER_SPAWN'
// Without a gate, the default policy below applies.
EM_JS(int, bridge_diagLog, (int tag, int e, int ret, int extra), {
    var tags = ["HS_SPAWN","HS_CLIENT_CONNECT","HS_CLIENT_PUTINSERVER",
                "HS_CLIENT_DISCONNECT","HS_THINK","HS_INIT_HUD",
                "HS_PLAYER_SPAWN","HS_INIT","HS_MISC"];
    var name = tags[tag] || ("HS_TAG_" + tag);

    // Rate-limited tags: these fire per-tick. Everything else (init,
    // connect, spawn, errors) is rare and always logged.
    //
    // The counter lives on globalThis, NOT as a property of this
    // function. Attaching state to the EM_JS function object doesn't
    // survive Emscripten's codegen — the function is re-emitted per
    // call site, so `_n` came back undefined every time and the
    // modulo test never matched. (Caught by pump-smoke.js going from
    // 7 PASS to 3 FAIL when this was first written.)
    var G = (typeof globalThis !== 'undefined') ? globalThis : window;
    G.__hs_diag_n = (G.__hs_diag_n || 0) + 1;

    var allow = true;
    if (G.__hs_log_gate) {
        try { allow = G.__hs_log_gate(name, e, ret, extra) ? 1 : 0; }
        catch (err) { allow = false; }
    } else if (name === "HS_THINK") {
        // 1-in-256 keeps a visible monotonic counter for pump-smoke.js
        // without producing readable-log spam. At 60Hz that's ~4
        // lines/minute instead of 3600.
        allow = (G.__hs_diag_n % 256) === 0;
    }

    if (allow) {
        console.log("[HS]", name, "ent=" + (e>>>0), "ret=" + ret, "extra=" + extra);
    }
    return 0;
})

enum : int {
    HS_SPAWN              = 0,
    HS_CLIENT_CONNECT     = 1,
    HS_CLIENT_PUTINSERVER = 2,
    HS_CLIENT_DISCONNECT  = 3,
    HS_THINK              = 4,
    HS_INIT_HUD           = 5,
    HS_PLAYER_SPAWN       = 6,
    HS_INIT               = 7,   // WASM init-time heartbeat
    HS_MISC               = 8,
};

// Throttle Think() telemetry — it's once per server tick, which is
// far too noisy. Emit every 64th call (~once per second at 64-tick
// rate); reset when counter overflows.
int g_thinkCount = 0;

// === Init-time heartbeat ===
//
// emscripten's `__attribute__((constructor))` runs when the WASM
// instance finishes load — before the engine ever calls into our
// function table. If THIS doesn't fire, the WASM side module is
// not being instantiated by the engine at all (i.e., every byte
// we've shipped is dead weight). If it does fire, we know the
// engine has loaded our module successfully and the absence of
// [HS] calls in Think/InitHUD/PlayerSpawn is a different problem
// (engine mode, dispatch order, vtable installation, etc.).
__attribute__((constructor))
static void ts_overlay_init(void) {
    bridge_diagLog(HS_INIT, 0, 0, 0);
}

}  // namespace

// === Override instrumentation hooks ===
//
// These call bridge_diagLog alongside the existing parent-dispatch
// pattern. They are no-ops *besides* reporting — they do not yet
// implement TS-side behaviour. That comes next (R1 step 2 in the
// HANDOFF plan).
//
// All three overrides are in cts_game_rules.h; the bridge and the
// call sites must be in a .cpp so the EM_JS tag enumeration has a
// single home. We forward-declare the runtime methods here and
// call them. They remain virtual overrides declared in the header.

void CTSGameRules::InitHUD(CBasePlayer *pPlayer) {
    // Layer 1 — parent's HL1 HUD init (health, ammo display, etc.)
    CHalfLifeMultiplay::InitHUD(pPlayer);
    // Layer 2 — TS diagnostic.
    // We pass 0 for the entity index because util.h forward-declares
    // CBasePlayer here and so pPlayer->edict() isn't visible. The
    // fact that bridge_diagLog fires at all is the signal we want
    // from R1 step 1; the ent index is for later.
    bridge_diagLog(HS_INIT_HUD, pPlayer ? 1 : 0, 0, 0);
    g_engfuncs.pfnServerPrint(
        "[TS] CTSGameRules::InitHUD - HUD initialized for player\n");
}

void CTSGameRules::PlayerSpawn(CBasePlayer *pPlayer) {
    // Layer 1 — HL1 default spawn (gives suit, weapons, etc.)
    CHalfLifeMultiplay::PlayerSpawn(pPlayer);
    // Layer 2 — TS diagnostic (see note above re: ent index).
    bridge_diagLog(HS_PLAYER_SPAWN, pPlayer ? 1 : 0, 0, 0);
    g_engfuncs.pfnServerPrint(
        "[TS] CTSGameRules::PlayerSpawn - player spawn done\n");
}

void CTSGameRules::Think(void) {
    // Layer 1 — parent's tick (round timing, etc.)
    CHalfLifeMultiplay::Think();
    // Heartbeat — once per second instead of per-tick. If we don't
    // see THIS line, the rules object isn't being driven at all,
    // which means the engine installed the wrong CHalfLifeMultiplay
    // or our class isn't installed via gamerules.cpp's factory.
    if ((++g_thinkCount & 63) == 0) {
        bridge_diagLog(HS_THINK, 0, g_thinkCount, 0);
    }
}

extern DLL_FUNCTIONS gFunctionTable;

// === External pump — bypasses engine-side loopback connect ===
//
// Emscripten side modules export public symbols into the
// main WASM's dylink table. This means JS can grab the
// function pointer and call it via `Module._<name>()` or
// `Module.dynCall('iii', ptr, ...)`. We rely on this so
// JavaScript can pump our game rules directly, independent
// of whether the engine ever reaches `ca_connected`.
//
// Without this, the engine would need to:
//   1. Begin a server (sv_active)
//   2. Connect its own client to localhost (loopback)
//   3. Get past cl_main.c:1394-1404 handshake
// We're stuck at step 3 because `-noip -noip6` prevents the
// loopback connect from completing.
//
// The `ts_pump_*` symbols are exported with default
// visibility AND __attribute__((used)) so the optimizer
// doesn't strip them. SAME trick keeps `bridge_diagLog`
// visible — LINK_ENTITY_TO_CLASS does it for ts_* classes.

#define TS_EXPORT extern "C" __attribute__((used, visibility("default")))

TS_EXPORT void ts_pump_think(void);
TS_EXPORT void ts_pump_player_spawn(void);
TS_EXPORT void ts_pump_init_hud(void);

extern "C" {

void ts_pump_think(void) {
    static int _ts_pump_count = 0;
    if (g_pGameRules) g_pGameRules->Think();
    bridge_diagLog(HS_THINK, 0, ++_ts_pump_count, 0);
}

void ts_pump_player_spawn(void) {
    CBasePlayer *pPlayer = NULL;
    int max = NUMBER_OF_ENTITIES();
    for (int i = 1; i < max; i++) {
        edict_t *e = INDEXENT(i);
        if (!e || e->free) continue;
        if (!e->pvPrivateData) continue;
        const char *cn = STRING(e->v.classname);
        if (cn && cn[0] == 'p' && strcmp(cn, "player") == 0) {
            pPlayer = (CBasePlayer *)e->pvPrivateData;
            break;
        }
    }
    if (g_pGameRules && pPlayer) g_pGameRules->PlayerSpawn(pPlayer);
}

void ts_pump_init_hud(void) {
    if (!g_pGameRules) return;
    int max = NUMBER_OF_ENTITIES();
    for (int i = 1; i < max; i++) {
        edict_t *e = INDEXENT(i);
        if (!e || e->free) continue;
        if (!e->pvPrivateData) continue;
        const char *cn = STRING(e->v.classname);
        if (cn && cn[0] == 'p' && strcmp(cn, "player") == 0) {
            g_pGameRules->InitHUD((CBasePlayer *)e->pvPrivateData);
            break;
        }
    }
}

TS_EXPORT void ts_pump(void) {
    ts_pump_init_hud();
    ts_pump_player_spawn();
    ts_pump_think();
}

}  // extern "C"

// === Server-command pump (the real hook) ===
//
// JS can't reach side-module exports (the xash3d-fwgs wrapper
// doesn't expose wasmExports), but the ENGINE can dispatch console
// commands straight into the DLL via `g_engfuncs.pfnAddServerCommand`.
// So we register `ts_pump` as a server command at DLL-init time;
// JS then reaches our code with:
//
//   xash.Cmd_ExecuteString('ts_pump')
//
// A rAF/setInterval pump on the JS side becomes our Think driver,
// independent of the engine's broken loopback connect. This is
// the same trick TS itself uses for `ts_*` cvars.
//
// Two commands so JS can drive them separately:
//   ts_pump         — think + spawn + hud (all three)
//   ts_pump_think   — think only (hot path, called every frame)
//
// Throttled inside ts_pump_think so a 60fps pump doesn't flood the
// console; we emit one [HS] line per 64 calls.
// === Local player spawner ===
//
// Nothing calls ClientPutInServer because no client ever connects
// (loopback connect stalls). So we create the player edict
// ourselves: UTIL_PlayerSpawn equivalent via g_engfuncs, then
// run the same HLSDK path the engine would.
//
// g_engfuncs.pfnSpawnPlayer is what ClientConnect uses internally —
// it allocs an edict, sets classname "player", and hands it back.
// Then we call HLSDK's ClientPutInServer (which does Spawn() +
// prefs) and our CTSGameRules::PlayerSpawn on top.
//
// This is the minimum needed for the client renderer to see a
// player: the client draws whatever AddToFullPack sends, and the
// player's model index comes from PlayerSpawn's HL1 default.
static edict_t *ts_local_player = NULL;
static int     ts_spawn_attempts = 0;

// ClientPutInServer lives in HLSDK's client.cpp; declared here rather
// than included so we don't drag that whole TU into ours.
extern void ClientPutInServer( edict_t *pEntity );

// MAKE_STRING is pointer arithmetic against the DLL's own rodata
// (works only for string literals the compiler can see). For a
// runtime-built name we must use the engine's allocator, which is
// what ALLOC_STRING / g_engfuncs.pfnAllocString exist for.
static int ts_alloc_string(const char *s) {
    if (!g_engfuncs.pfnAllocString) return 0;
    return g_engfuncs.pfnAllocString(s);
}

// HLSDK's LINK_ENTITY_TO_CLASS generates an exported function per map
// classname whose only job is to allocate + attach the C++ object:
//
//   extern "C" EXPORT void player(entvars_t *pev);
//   void player(entvars_t *pev) { GetClassPtr((CBasePlayer *)pev); }
//
// That runs BEFORE DispatchSpawn and is what makes GET_PRIVATE() in
// DispatchSpawn return non-NULL. The engine normally calls it via
// COM_GetProcAddress on the classname; we have the symbol directly.
//
// So the correct two-step for a locally-created edict is:
//   player(&pev->v);        → allocate + attach CBasePlayer
//   DispatchSpawn(pev);     → run CBasePlayer::Spawn()
//
// Calling DispatchSpawn alone (as the first attempt did) left
// GET_PRIVATE NULL and trapped. Verified via spawn-diag.js step 35.
extern "C" void player(entvars_t *pev);

extern "C" void ts_spawn_local_player(void) {
    // Already have one — just respawn it.
    if (ts_local_player && !ts_local_player->free) {
        CBasePlayer *p = (CBasePlayer *)ts_local_player->pvPrivateData;
        if (p && g_pGameRules) g_pGameRules->PlayerSpawn(p);
        return;
    }
    if (++ts_spawn_attempts > 30) {
        return;
    }

    // Step markers: a WASM trap kills the whole command, so the last
    // marker we see is the step that trapped. Steps 1..6 map to
    // extra=31..36 in the HS_MISC line.
    bridge_diagLog(HS_MISC, 0, 0, 31);

    if (!g_engfuncs.pfnCreateEntity) {
        bridge_diagLog(HS_MISC, 0, -1, 30);   // engine lacks pfnCreateEntity
        return;
    }
    edict_t *pev = g_engfuncs.pfnCreateEntity();
    if (!pev) {
        bridge_diagLog(HS_MISC, 0, -1, 32);   // CreateEntity returned NULL
        return;
    }
    bridge_diagLog(HS_MISC, ENTINDEX(pev), 0, 33);   // edict allocated

    int cn = ts_alloc_string("player");
    pev->v.classname = cn;
    bridge_diagLog(HS_MISC, ENTINDEX(pev), cn, 34);  // classname allocated

    // Step 1 of the normal engine path: the LINK_ENTITY_TO_CLASS
    // export for "player" allocates and attaches the CBasePlayer.
    player(&pev->v);
    bridge_diagLog(HS_MISC, ENTINDEX(pev), (int)(size_t)pev->pvPrivateData, 41);

    // Step 2: DispatchSpawn runs CBasePlayer::Spawn() (and
    // IsAllowedToSpawn, the FL_KILLME check, global-state handling).
    extern int DispatchSpawn( edict_t *pent );
    int rc = DispatchSpawn(pev);
    bridge_diagLog(HS_MISC, ENTINDEX(pev), rc, 35);   // dispatch returned
    if (!rc) {
        g_engfuncs.pfnRemoveEntity(pev);
        return;
    }

    ts_local_player = pev;
    CBasePlayer *pPlayer = (CBasePlayer *)pev->pvPrivateData;
    bridge_diagLog(HS_PLAYER_SPAWN, ENTINDEX(pev), ts_spawn_attempts, 0);
    if (!pPlayer) {
        bridge_diagLog(HS_MISC, ENTINDEX(pev), -1, 36);  // no private data
        return;
    }

    // Give the player a spawn point from the loaded map.
    edict_t *pSpot = NULL;
    if (g_pGameRules) pSpot = g_pGameRules->GetPlayerSpawnSpot(pPlayer);
    bridge_diagLog(HS_MISC, ENTINDEX(pev), pSpot ? ENTINDEX(pSpot) : -1, 37);
    if (pSpot) {
        pev->v.origin  = pSpot->v.origin;
        pev->v.angles  = pSpot->v.angles;
        pev->v.v_angle = pSpot->v.v_angle;
    }

    pev->v.flags |= FL_CLIENT;

    bridge_diagLog(HS_MISC, ENTINDEX(pev), 0, 38);   // about to InitHUD
    if (g_pGameRules) g_pGameRules->InitHUD(pPlayer);
    bridge_diagLog(HS_MISC, ENTINDEX(pev), 0, 39);   // about to PlayerSpawn
    if (g_pGameRules) g_pGameRules->PlayerSpawn(pPlayer);
    bridge_diagLog(HS_MISC, ENTINDEX(pev), 0, 40);   // survived both

    g_engfuncs.pfnServerPrint("[TS] ts_spawn_local_player: local player in server\n");
}

extern "C" void ts_cmd_pump(void) {
    bridge_diagLog(HS_MISC, 0, 0, 1);
    ts_pump_init_hud();
    ts_pump_player_spawn();
    ts_pump_think();
}

// Dedicated spawn command so JS can create the player on demand
// (after the map finishes loading, which is when spawn points exist).
//
// Deliberately NOT part of ts_pump: pfnCreateEntity + DispatchSpawn
// can trap in this engine (no connected client ⇒ incomplete edict
// state), and a WASM trap kills the whole command including the
// Think() we know works. Keeping spawn behind its own command means
// a spawn failure costs us the player, not the game loop.
//
// Also resets the retry budget — the map only has spawn points once
// it's finished loading, so a failed early attempt shouldn't
// permanently poison later ones.
extern "C" void ts_cmd_spawn_player(void) {
    ts_spawn_attempts = 0;
    ts_spawn_local_player();
}

// The engine knows where to put the local view: when no client
// connects it falls back to a default (usually worldspawn origin,
// which in ts_lobby is inside geometry — that's the "spawned in
// the floor" report). We can't reach that entity from JS directly,
// so ask the server DLL — which CAN enumerate edicts — to report
// every info_player_deathmatch it loaded, plus the local view's
// current origin. Then we can compare and confirm the fallback
// hypothesis instead of guessing.
extern "C" void ts_cmd_report_spawns(void) {
    int max = NUMBER_OF_ENTITIES();
    int found = 0;
    // Classname histogram. The DLL's own LINK_ENTITY_TO_CLASS handlers
    // (ts_groundweapon, ts_powerup, ts_model) are populated at map
    // load; HL1-baseline classes (info_player_*, func_*, etc.) are
    // loaded by SV_Spawn. A histogram tells us what we're missing.
    struct { const char *name; int count; } hist[12];
    hist[0]={"info_player_deathmatch",0};
    hist[1]={"info_player_start",0};
    hist[2]={"worldspawn",0};
    hist[3]={"ts_groundweapon",0};
    hist[4]={"ts_powerup",0};
    hist[5]={"ts_model",0};
    hist[6]={"func_wall",0};
    hist[7]={"func_breakable",0};
    hist[8]={"multi_manager",0};
    hist[9]={"trigger_multiple",0};
    hist[10]={"light",0};
    hist[11]={(const char*)0,0};

    for (int i = 1; i < max; i++) {
        edict_t *pev = g_engfuncs.pfnPEntityOfEntIndex(i);
        if (!pev || pev->free) continue;
        const char *cn = STRING(pev->v.classname);
        if (!cn) continue;

        // Histogram
        for (int k = 0; hist[k].name; k++) {
            if (strcmp(cn, hist[k].name) == 0) { hist[k].count++; break; }
        }

        // strncmp length = strlen("info_player") = 11, not 12.
        // The off-by-one was firing for every entity — the histogram
        // showed 17 loaded but `total_player` was 0 because strncmp
        // compared a '\0' against '_' and always took the continue.
        if (strncmp(cn, "info_player", 11) != 0) continue;
        char buf[128];
        int ox = (int)pev->v.origin[0];
        int oy = (int)pev->v.origin[1];
        int oz = (int)pev->v.origin[2];
        int n = snprintf(buf, sizeof(buf),
            "[TS-SPAWN] idx=%d %s org=%d %d %d\n",
            i, cn, ox, oy, oz);
        if (n > 0) g_engfuncs.pfnServerPrint(buf);
        found++;
    }
    char buf[160];
    int n = snprintf(buf, sizeof(buf), "[TS-SPAWN] total_player=%d maxents=%d\n", found, max);
    g_engfuncs.pfnServerPrint(buf);
    // Then one line per histogram bucket so the harness can match them
    for (int k = 0; hist[k].name; k++) {
        n = snprintf(buf, sizeof(buf), "[TS-CLASS] %s=%d\n", hist[k].name, hist[k].count);
        g_engfuncs.pfnServerPrint(buf);
    }
}

// The engine renders the world from a default observer when no
// client connects — that's the "spawned in the floor" report:
// origin (0,0,0) sits inside the geometry. spawn-report.js confirms
// all 17 info_player_deathmatch entities in ts_lobby.bsp are loaded
// by the engine, so the fix is to move the view onto one of them.
//
// Duck-tape, not a real client: a real player entity is the right
// answer (see R1.1 in HANDOFF.md), but DispatchSpawn traps until
// that's fixed, so there is no player edict to move. This at least
// gets the camera to somewhere a human can look around, which
// unblocks every visual question that was previously answered with
// "you're stuck inside a wall".
extern "C" void ts_cmd_place_camera(void) {
    int max = NUMBER_OF_ENTITIES();
    edict_t *pSpot = NULL;
    // Prefer the spawn point nearest map centre (0,0) — those are the
    // lobby's main entrances rather than the odd corner spawns at
    // ±1312 units out.
    float bestDist = 3.4e38f;
    for (int i = 1; i < max; i++) {
        edict_t *pev = g_engfuncs.pfnPEntityOfEntIndex(i);
        if (!pev || pev->free) continue;
        const char *cn = STRING(pev->v.classname);
        if (!cn) continue;
        if (strcmp(cn, "info_player_deathmatch") != 0) continue;
        float dx = pev->v.origin[0];
        float dy = pev->v.origin[1];
        float d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; pSpot = pev; }
    }
    if (!pSpot) {
        g_engfuncs.pfnServerPrint("[TS] place_camera: no info_player_deathmatch\n");
        return;
    }

    // With no connected client the renderer's view entity is edict 0
    // (worldspawn) — that's the fallback the engine uses, and it's
    // what's currently stuck inside the floor. Move it onto the spawn.
    edict_t *pWorld = g_engfuncs.pfnPEntityOfEntIndex(0);
    if (!pWorld || pWorld->free) {
        g_engfuncs.pfnServerPrint("[TS] place_camera: no worldspawn at index 0\n");
        return;
    }
    pWorld->v.origin = pSpot->v.origin;
    pWorld->v.angles = pSpot->v.angles;
    pWorld->v.v_angle = pSpot->v.v_angle;

    char buf[128];
    snprintf(buf, sizeof(buf), "[TS] place_camera -> %d %d %d (yaw %d)\n",
             (int)pSpot->v.origin[0], (int)pSpot->v.origin[1], (int)pSpot->v.origin[2],
             (int)pSpot->v.angles[1]);
    g_engfuncs.pfnServerPrint(buf);
}

// === Spawn path status, as of 2026-10-21 ================================
//
// spawn-diag.js pins the current failure precisely:
//
//   step 31  ENTER spawn_local_player          ok
//   step 33  pfnCreateEntity() → edict 185     ok
//   step 34  pfnAllocString("player")          ok
//   step 41  player(&pev->v) → private data    ok   (pvPrivateData non-NULL)
//   <trap>   DispatchSpawn → CBasePlayer::Spawn()
//
// The LINK_ENTITY_TO_CLASS + DispatchSpawn sequence is correct — we
// reproduce exactly what SV_Spawn does. The trap is inside
// CBasePlayer::Spawn() itself, which reaches for a long tail of
// g_engfuncs slots (weapon give, model/sound precache, message
// hooks, PM_*, ...). Several of those slots are NULL in this
// Xash3D-FWGS build, exactly like pfnCreateFakeClient was. A NULL
// indirect call through the enginefuncs table is an unconditional
// WASM trap with no way to catch it in JS.
//
// Fixing this needs one of:
//   a) An audit of CBasePlayer::Spawn's g_engfuncs dependencies,
//      then NULL-guarding each call. Tedious but mechanical, and
//      the guard is genuinely correct: the engine can legitimately
//      leave optional slots NULL and a shipped DLL shouldn't trap
//      on them.
//   b) A minimal CTSPlayer that overrides Spawn() to skip the HL1
//      weapon/model machinery and just set up origin, health,
//      movetype and modelindex. Matches what ClientPutInServer
//      would produce for our purposes and avoids the whole tail.
//
// (b) is smaller and doesn't touch HLSDK code at all, so it's the
// one worth doing first. Left for a session with the full build
// loop rather than half-done here.
//
// Until then: the pump is what matters and it works. The world
// renders, the game logic ticks, and the player entity is the only
// thing missing.

extern "C" void ts_cmd_pump_think(void) {
    ts_pump_think();
}

// ts_post_init is called from GiveFnptrsToDll (patched in by
// build-ts-dll.sh step 2b) — the FIRST point where g_engfuncs is
// populated. Constructors run earlier at WASM instantiation, so
// anything touching g_engfuncs has to be deferred to here.
extern "C" void ts_post_init(void) {
    bridge_diagLog(HS_INIT, 1, 0, 0);   // second init marker: fnptrs valid
    if (g_engfuncs.pfnAddServerCommand) {
        g_engfuncs.pfnAddServerCommand("ts_pump", ts_cmd_pump);
        g_engfuncs.pfnAddServerCommand("ts_pump_think", ts_cmd_pump_think);
        g_engfuncs.pfnAddServerCommand("ts_spawn_player", ts_cmd_spawn_player);
        g_engfuncs.pfnAddServerCommand("ts_report_spawns", ts_cmd_report_spawns);
        g_engfuncs.pfnAddServerCommand("ts_place_camera", ts_cmd_place_camera);
        g_engfuncs.pfnServerPrint("[TS] ts_post_init: ts_pump commands registered\n");
    } else {
        g_engfuncs.pfnServerPrint("[TS] ts_post_init: pfnAddServerCommand is NULL\n");
    }
}

// Force the vtable to be emitted in this translation unit.
// Without this, the vtable can land in gamerules.cpp (which now uses
// `new CTSGameRules`) and we get duplicate-symbol at link time.
// Keep the existing anchor so the linker keeps referencing our
// overrides; otherwise the optimizer may dead-strip the impls.
namespace {
    using InitHUDType = void (CTSGameRules::*)(CBasePlayer*);
    InitHUDType init_hud = &CTSGameRules::InitHUD;
    using ThinkType = void (CTSGameRules::*)();
    ThinkType think = &CTSGameRules::Think;
    using PlayerSpawnType = void (CTSGameRules::*)(CBasePlayer*);
    PlayerSpawnType player_spawn = &CTSGameRules::PlayerSpawn;
}