// ts_stub.cpp — TS overlay marker.
//
// When building with hlsdk-portable as the base (build-ts-dll.sh
// pulls in its 105 source files), HLSDK already provides:
//   - GiveFnptrsToDll, GetEntityAPI2, GetNewDLLFunctions (h_export.cpp)
//   - GameDLLInit, GameDLLShutdown (game.cpp)
//   - All HL1 game logic: weapons, monsters, gamerules
//
// This file only adds a marker so we can confirm the TS overlay
// linked into the combined hl7+ts side module. Real TS translations
// (cts_player.cpp, cts_gamerules.cpp, etc.) land in their own files
// and use HLSDK's parent classes.

#include <cstdio>

extern "C" __attribute__((used, visibility("default"))) void ts_marker(void) {
    fprintf(stderr, "[TS DLL] ts-overlay linked OK\n");
}