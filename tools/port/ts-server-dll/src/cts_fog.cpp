// cts_fog.cpp — Translation of CTSFog::Spawn.
//
// Source: tools/decompile/output/CTSFog__Spawn.ts (35 lines, codex + claude
// review PASS). Disassembly: 33 B at 0x000642e4, calls UTIL_Remove on `this`
// then returns. CTSFog self-destructs the moment it spawns.
//
// This is the smallest complete CTS class method we have decompiled.
// It's small enough to translate as a single-file pattern demo, and
// it shows the full source-to-WASM pipeline working for a real TS
// class — not just the stub entry points.
//
// TODO: this is a minimal translation that compiles. The full C++ needs:
//   - The CBaseEntity parent class (link hlsdk-portable's entities)
//   - UTIL_Remove needs the engine's entvars_s + global state
//   - The 7 other CTSFog methods (when decompiled) to make it useful
//   - Engine-entity registration via REGISTER_ENTITY + UTIL_Precache
// For the demo build, we just declare what we need inline.

#include <cstdio>

// === Minimum HLSDK surface for the CTSFog::Spawn translation ===

// Forward declarations stand in for the engine-provided types
// (entvars_t.cpp, CBaseEntity.cpp from hlsdk-portable). For the demo
// we only need the pointer-to-self + the UTIL_Remove utility.
struct entvars_s;
struct CBaseEntity {
    entvars_s* pev;
    int   iuser1;       // example member at 0x10c (pev offset)
};

// UTIL_Remove takes a CBaseEntity pointer and queues it for cleanup.
// Real hlsdk-portable has this in cbase.cpp / util.cpp.
extern "C" void UTIL_Remove(CBaseEntity* pEntity);

// === Translated class ===

class CTSFog : public CBaseEntity {
    // No instance fields needed for Spawn. The full CTSFog class has
    // ~4-8 fields (m_flStartDist, m_flEndDist, m_iDensity, etc.) that
    // we haven't translated yet — they aren't used by Spawn.
};

// === Translated method (CTSFog::Spawn) ===

// TS body (decompiled):
//   export function Spawn(this: CTSFog): void {
//     UTIL_Remove(this);
//   }
//
// C++ body:
//   void CTSFog::Spawn() {
//       UTIL_Remove(this);
//   }
//   }
// }

// The TS `this` becomes C++ implicit `this`.
// The call to UTIL_Remove is direct (no engine vtable hop).
extern "C" __attribute__((visibility("default")))
void CTSFog_Spawn(CTSFog* pThis) {
    UTIL_Remove(static_cast<CBaseEntity*>(pThis));
}

// Sanity: the translated body matches the TS source exactly.
// Source: UTIL_Remove(this);
// Body:    UTIL_Remove(static_cast<CBaseEntity*>(this));
//   -- same operation, type upcast from CTSFog* to CBaseEntity*.

// === Stub UTIL_Remove so the build links ===
//
// In the full hlsdk-portable build, UTIL_Remove lives in cbase.cpp and
// uses the engine's `g_pEntityHash` + `gpGlobals->time` to defer
// deletion until end-of-frame. For this single-file demo we just print.
void UTIL_Remove(CBaseEntity* pEntity) {
    fprintf(stderr, "[TS] CTSFog::Spawn → UTIL_Remove(self)\n");
}