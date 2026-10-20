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
    void InitHUD(CBasePlayer *pPlayer) override {
        // Layer 1 — parent's HL1 HUD init (health, ammo display, etc.)
        CHalfLifeMultiplay::InitHUD(pPlayer);

        // Layer 2 — TS marker so we know our override ran
        g_engfuncs.pfnServerPrint("[TS] CTSGameRules::InitHUD — TS HUD initialized for player\n");
    }

    // PlayerSpawn is called when a player spawns into the world.
    // TS uses it to give class-specific HP and weapons.
    void PlayerSpawn(CBasePlayer *pPlayer) override {
        // Layer 1 — HL1 default spawn behavior
        CHalfLifeMultiplay::PlayerSpawn(pPlayer);

        // Layer 2 — TS-specific spawn (TBD)
        g_engfuncs.pfnServerPrint("[TS] CTSGameRules::PlayerSpawn — TS class loadout pending\n");
    }

    // Think is called every server tick. TS uses it for slowmo timer,
    // round timer, dead-check, etc. For now we just log.
    void Think(void) override {
        // Layer 1 — parent's tick (round timing, etc.)
        CHalfLifeMultiplay::Think();
    }
};

#endif  // CTS_GAME_RULES_H