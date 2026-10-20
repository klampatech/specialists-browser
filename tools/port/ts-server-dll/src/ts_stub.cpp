
// ts_stub.cpp — Minimal TS game DLL stub.
//
// This is the smallest possible WASM side module that exposes the
// standard GoldSrc game-DLL entry points. It exists to prove the
// build pipeline (emcc + SIDE_MODULE=1 + linker flags) end-to-end.
//
// To grow: add CBaseEntity subclasses here (CTSPlayer, CTSGameRules,
// CTSKnifeWeapon, etc.) translating from
// tools/decompile/output/<class>__<method>.ts files.
//
// Engine interface (enginefuncs_t + DLL_FUNCTIONS) lives in:
//   hlsdk-portable/engine/progdefs.h    (g_engfuncs)
//   hlsdk-portable/dlls/game.cpp         (the entry points)
//   HLSDK reference: FWGS/hlsdk-portable

#include <cstdio>

// Forward declare the engine entry points we'll hook
extern "C" {
    // Engine expects these exports. Stub them — engine gets a no-op
    // game DLL, but it loads without crashing.
    int GetEntityAPI(void *) { return 0; }
    int GetEntityAPI2(void *) { return 0; }
    int GetNewDLLFunctions(void *) { return 0; }
    void GiveFnptrsToDll(void *, void *) {}
    void Initialize(struct edict_s *, void *, void *) {}
    void GameDLLInit(void) {
        // Print a marker so we know our DLL loaded
        fprintf(stderr, "[TS DLL] loaded (stub — no TS logic yet)\n");
    }
    void GameDLLShutdown(void) {}
}

// Prevent linker from stripping these — they must be exported
extern "C" __attribute__((used, visibility("default"))) void ts_marker(void) {
    fprintf(stderr, "[TS DLL] ts_marker called\n");
}
