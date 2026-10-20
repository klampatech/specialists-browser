// cts_game_rules.cpp — implementation of CTSGameRules (header is
// cts_game_rules.h). The header is the primary artifact; this .cpp
// just provides an explicit instantiation site so the linker sees
// the class definition (some compilers/optimizers strip empty .cpps).

#include "cts_game_rules.h"

// Force the vtable to be emitted in this translation unit.
// Without this, the vtable can land in gamerules.cpp (which now uses
// `new CTSGameRules`) and we get duplicate-symbol at link time.
namespace {
    // Take addresses of the key virtual methods so the vtable is referenced.
    using InitHUDType = void (CTSGameRules::*)(CBasePlayer*);
    InitHUDType init_hud = &CTSGameRules::InitHUD;
    using ThinkType = void (CTSGameRules::*)();
    ThinkType think = &CTSGameRules::Think;
    using PlayerSpawnType = void (CTSGameRules::*)(CBasePlayer*);
    PlayerSpawnType player_spawn = &CTSGameRules::PlayerSpawn;
}