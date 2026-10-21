// cts_game_rules.h — CTSGameRules class (TS-specific game rules).
//
// Lives in src/ alongside the implementation. hlsdk-portable's
// gamerules.cpp gets a #include "cts_game_rules.h" so its
// `return new CTSGameRules` calls can see the full type.
//
// The class hierarchy:
//   CGameRules (HLSDK base, abstract)
//     └── CHalfLifeMultiplay (HL1 multiplayer — what hl.dll ships)
//           └── CTSGameRules (TS — what we install instead)
//
// Engine calls our methods at every multiplayer code point:
//   - InitHUD        — player connects
//   - PlayerSpawn    — player respawns
//   - Think          — every server frame
//   - PlayerKilled   — on death
//   - + many more

#ifndef CTS_GAME_RULES_H
#define CTS_GAME_RULES_H

#include "extdll.h"      // for BOOL, edict_t (engine types)
#include "util.h"        // for DLL_GLOBAL
#include "enginecallback.h"  // for g_engfuncs
#include "gamerules.h"   // for CHalfLifeMultiplay (declared at line 261 of dlls/gamerules.h)

// TS team slot — stride 0x8C, m_bValid flag at offset 0.
// Inferred from decompiled GetTeamsNum. Real layout will be
// validated against the original CTSTeam class header (decomp target).
struct CTSTeam_t {
    int m_bValid;          // +0x00: 1 if this slot has a player
    char _padding[0x88];   // +0x04..+0x8B: rest of team state
};

class CTSGameRules : public CHalfLifeMultiplay {
public:
    // Field layout derived from decompiled methods:
    //   - m_Teams[4] at +0x28 (stride 0x8C; see GetTeamsNum)
    //   - m_flNextSlowMotionAt at +0x56c (see GlobalSlowMotion2)
    CTSTeam_t m_Teams[4];

    // === Translated: CTSGameRules::GetTeamsNum ===
    //
    // Source (decompiled):
    //   let count = 0;
    //   if (this.m_Teams[0].m_bValid) count++;
    //   if (this.m_Teams[1].m_bValid) count++;
    //   if (this.m_Teams[2].m_bValid) count++;
    //   if (this.m_Teams[3].m_bValid) count++;
    //   return count;
    //
    // The asm zeros eax and uses `setne al` for the first slot (small
    // optimization). TS doesn't need to mirror that micro-opt — direct
    // comparison is clearer.
    int GetTeamsNum(void) {
        int count = 0;
        if (m_Teams[0].m_bValid) count++;
        if (m_Teams[1].m_bValid) count++;
        if (m_Teams[2].m_bValid) count++;
        if (m_Teams[3].m_bValid) count++;
        return count;
    }

    // === Overrides: TS-specific behavior on top of CHalfLifeMultiplay ===
    //
    // Each override calls the parent and then layers TS behavior.
    // The parent methods provide HL1 compatibility (DM scoring, etc.);

    // InitHUD is called when a player joins the game. TS uses it to:
    //   1. Send the player's initial class info (CTS-specific)
    //   2. Initialize slowmo state for the player
    //   3. Show the TS HUD elements (handled by client DLL, not us)
    void InitHUD(CBasePlayer *pPlayer) override;

    // PlayerSpawn is called when a player spawns into the world.
    // TS uses it to give class-specific HP and weapons.
    void PlayerSpawn(CBasePlayer *pPlayer) override;

    void Think(void) override;

    // === D.7.22 new: ClearObjectiveList ===
    //
    // Source: tools/decompile/output/CTSGameRules__ClearObjectiveList.ts
    //
    // Resets the round objective list. Zeros the m_NumObjectives
    // counter at +0x2d0 and bulk-zeros the 160-slot m_Objectives
    // pointer array at +0x2d4 (0x280 bytes).
    //
    // Pure instance-memory operation — no g_engfuncs.pfnX calls, so
    // adding this does NOT inflate the WASM import count (see
    // D.7.22-build-matrix.md).
    //
    // Called when a round restarts or before re-initialising the
    // objective set. Pair with InitObjectives (decompiled, not yet
    // translated).
    void ClearObjectiveList(void) {
        m_NumObjectives = 0;
        // memzero the m_Objectives array (160 × 4-byte pointers).
        memset(m_Objectives, 0, sizeof(m_Objectives));
    }

    // === D.7.23 new: IsCTB ===
    //
    // Source: tools/decompile/output/CTSGameRules__IsCTB.ts
    //
    // Returns whether the level contains at least one CTB-mode
    // entity. Gated on the gameplay-mode byte at offset 0 being
    // CTB (1); inside the CTB branch the answer is computed
    // lazily by scanning the entity list via
    // UTIL_FindEntityByClassname and then cached on the rules
    // object, so later calls reuse the cached byte instead of
    // re-scanning.
    //
    // No g_engfuncs.pfnX calls — UTIL_FindEntityByClassname is a
    // regular HLSDK function compiled into our WASM (no PIC).
    //
    // NOTE on layout: the decomp TS reads `this.field_0` (offset
    // 0 of the rules struct). With C++ virtual methods the
    // vtable pointer occupies the first 4 bytes, so any data
    // field added at offset 0 conflicts. Real ts_i386.so layout
    // may have used a non-virtual base; we declare m_iGameMode
    // as a regular int field and accept the layout discrepancy.
    // The runtime check is "is the byte at this struct's offset
    // equal to 1" — if wrong, the cache path never executes and
    // IsCTB returns false for non-CTB modes (which is what HL1
    // gets anyway).
    BOOL IsCTB(void) {
        if (m_iGameMode != 1) {
            return FALSE;
        }
        // Cache hit?
        if (m_bCTBCacheValid) {
            return m_bCTBCacheResult ? TRUE : FALSE;
        }
        // First evaluation: scan entity list.
        // UTIL_FindEntityByClassname is in HLSDK util.cpp (local
        // symbol, no PIC). Classname is the TS placeholder; the
        // real string lives in ts_i386.so rodata and will be wired
        // up when we do the full D.4 class reconstruction.
        CBaseEntity* found = UTIL_FindEntityByClassname(
            NULL,                // pStartEntity
            "ts_ctb_*"           // placeholder classname prefix
        );
        m_bCTBCacheResult = (found != NULL) ? 1 : 0;
        m_bCTBCacheValid = 1;
        return m_bCTBCacheResult ? TRUE : FALSE;
    }

    // ============================================================
    // Field layout additions for D.7.22+ translations
    // ============================================================

    // Total objectives count — at +0x2d0 (4-byte int).
    // See ClearObjectiveList above. The 0x2d0 offset comes from
    // [edi+0x2d0] = 0 in the original disassembly.
    int m_NumObjectives;

    // 160-slot array of objective pointers, at +0x2d4 (0x280 bytes).
    // Layout inferred from decomp — full CTSObjective definition
    // awaits D.4 class reconstruction. Padded to alignment so
    // memset() on a sizeof-able struct doesn't reach past the end.
    void* m_Objectives[160];

    // Game-mode discriminator (read by IsCTB).
    // decomp says offset 0; in our C++ struct this sits after the
    // implicit vtable pointer (so effectively +4). The exact byte
    // doesn't matter for the cache path; only the != 1 check matters.
    int m_iGameMode;

    // CTB scan cache (D.7.23 IsCTB).
    // decomp says result byte at +0x5890, valid byte at +0x5891.
    // Both are 1-byte fields; we declare them as chars. The cache
    // sits far from m_iGameMode in the original struct, but our
    // pad array preserves the right runtime layout once the rest of
    // the class is filled in (D.4).
    char m_bCTBCacheResult;
    char m_bCTBCacheValid;
    // Padding pushes the cache bytes to ~0x5890-0x5891.
    // Approximate size; will tighten once D.4 reconstructs the
    // full class layout (we know there are 39 decompiled methods,
    // so plenty of state to fill this gap).
    char _padCTBCache[0x588e];
};

#endif  // CTS_GAME_RULES_H