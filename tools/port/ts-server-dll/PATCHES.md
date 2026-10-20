// === Patches to /tmp/hlsdk-portable/dlls/gamerules.cpp ===
//
// These patch lines are applied during the build of the TS server DLL
// to substitute CTSGameRules for CHalfLifeMultiplay (the default HL1
// multiplayer game rules). When ApplyPatchEdit is loaded by InstallGameRules,
// it returns a TSGameRules instance, hooking every multiplayer code point:
//
//   CGameRules::Think       → CTSGameRules::Think (override)
//   CGameRules::PlayerSpawn → CTSGameRules::PlayerSpawn (override)
//   CGameRules::InitHUD    → CTSGameRules::InitHUD (override)
//   CGameRules::PlayerKilled → (parent + our class loadout)
//   ... etc.
//
// The patch is applied via sed during the build script. To apply manually:
//
//   cd /tmp/hlsdk-portable
//   sed -i 's|return new CHalfLifeMultiplay;|return new CTSGameRules;|g' \\
//       dlls/gamerules.cpp
//
// Or with proper comments:
//
//   sed -i 's|// vanilla deathmatch\n\t\tg_teamplay = 0;\n\t\treturn new CHalfLifeMultiplay;|// TS: replaced with CTSGameRules\n\t\tg_teamplay = 0;\n\t\treturn new CTSGameRules;|g' \
//       dlls/gamerules.cpp
//
// (See build-ts-dll.sh for the actual sed.)

--- Find current `return new CHalfLifeMultiplay;` in gamerules.cpp
--- around line 340-350. Two occurrences (deathmatch=1 and the else branch).
--- Both get replaced.