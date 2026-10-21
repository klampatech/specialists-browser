# Engine reference sources — DO NOT HAND-EDIT

Upstream sources of truth for ABI verification. Fetched from
`github.com/FWGS/xash3d-fwgs` (engine/) and `github.com/FWGS/hlsdk-portable`
(engine/). Vendored here so a fresh session does not depend on `/tmp/`,
which does not survive a reboot.

## Files

| File | Why we need it |
|---|---|
| `engine/cl_main.c` | **The handshake.** `CL_CheckForStatus` / `CL_Connect` — the loopback-connect branch around lines 1394→1753 that we fail to get past. |
| `engine/sv_game.c` | The `static enginefuncs_t g_engfuncs = {...}` initialiser — the ONLY authoritative `g_engfuncs` slot table. `eiface.h` disagrees past ~slot 50. Also `SV_GetEntityClass`, `SV_ParseEdict`, `SV_LoadFromFile`. |
| `engine/server.h` | Server edict/client structures. |
| `engine/eiface.h` | GoldSrc interface: `DLL_FUNCTIONS` (50 fields), `NEW_DLL_FUNCTIONS`, `enginefuncs_t`, `KeyValueData_s`, `APIFUNCTION2`. |
| `engine/physint.h` | `physics_interface_s` — what `Server_GetPhysicsInterface` must return. |
| `engine/progdefs.h` | HLSDK `entvars_t` + `globalvars_t`. `build-matrix/entvars.h` is generated verbatim from this. |
| `engine/hlsdk/` | Full HLSDK header set (282 files) for any other struct lookup. |

## Re-fetch

```bash
mkdir -p reference/engine
curl -sL https://raw.githubusercontent.com/FWGS/xash3d-fwgs/master/engine/server/cl_main.c \
     -o reference/engine/cl_main.c
curl -sL https://raw.githubusercontent.com/FWGS/xash3d-fwgs/master/engine/server/sv_game.c \
     -o reference/engine/sv_game.c
curl -sL https://raw.githubusercontent.com/FWGS/xash3d-fwgs/master/engine/server.h \
     -o reference/engine/server.h
curl -sL https://raw.githubusercontent.com/FWGS/xash3d-fwgs/master/engine/eiface.h \
     -o reference/engine/eiface.h
curl -sL https://raw.githubusercontent.com/FWGS/xash3d-fwgs/master/engine/physint.h \
     -o reference/engine/physint.h
```

Pin the commit SHA in a comment if we ever need to diff against a
different engine build than the one in `webxash/public/`.
