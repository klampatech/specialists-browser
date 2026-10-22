# D.7.40 — Spawn investigation findings

## What I got wrong
Kyle's pushback was right. `ts_lobby.bsp` has 17 `info_player_deathmatch` 
spawns; `ts_casa.bsp` has 21. The map is not the problem. The hub 
assumption was wrong — verified by parsing every TS bsp's entity lump.

## What `[TS] place_camera` actually is
The console line `[TS] place_camera: no info_player_deathmatch` is NOT 
the player-spawn-failure indicator. It's a CLIENT-side diagnostic 
command registered in the old `ts-server-dll` C++ WASM. `ts-pump.ts` 
auto-invokes it at delays 3500ms, 6000ms, 9000ms, 12000ms after connect 
to position the camera-near-origin in the lobby. The "no info_player" 
it prints is the CLIENT WASM's view, not the server's. Red herring.

## Real question
Bots can spawn ("Bot Neo spawned (#1) with [13, 25, 28]") and they're 
walk-around-and-shooting. Player ends up in Free Chase-Camera.  
Two spawn paths run:
- bots via `bot_backend::spawn_pre` → ham::player_spawn  
- player via lifecycle::on_spawn → ham::player_spawn  
Both call `spawnpoint::place()`. Why does the player never land in a body?

Kyle's hypothesis: game mode may be off for the map. Real:
- gamemode = "Team DeathMatch (hitman;gordon)" (ruleset 30)
- maps register ok and bots spawn fine
- player gets team-assigned but spectator view

So the spawn path probably works server-side. The chase-cam may be the 
**CLIENT** being stuck in observer because InitHUD hasn't fired or 
the player never gets the "stop observer" signal. Worth checking what 
the client DLL's InitHUD does in the rust port.
