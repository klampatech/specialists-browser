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