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
// 4-arg signature: tag (one of DIAG_* below), entity index (or 0),
// return value (or 0), extra context (or 0). Tagged so the JS side
// can filter for `[HS]` lines.
EM_JS(int, bridge_diagLog, (int tag, int e, int ret, int extra), {
    var tags = ["HS_SPAWN","HS_CLIENT_CONNECT","HS_CLIENT_PUTINSERVER",
                "HS_CLIENT_DISCONNECT","HS_THINK","HS_INIT_HUD",
                "HS_PLAYER_SPAWN","HS_INIT","HS_MISC"];
    var name = tags[tag] || ("HS_TAG_" + tag);
    console.log("[HS]", name, "ent=" + (e>>>0), "ret=" + ret, "extra=" + extra);
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
extern "C" void ts_cmd_pump(void) {
    bridge_diagLog(HS_MISC, 0, 0, 1);
    ts_pump_init_hud();
    ts_pump_player_spawn();
    ts_pump_think();
}

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