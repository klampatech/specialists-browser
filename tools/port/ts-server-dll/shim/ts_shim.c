/**
 * ts_shim.c — The Specialists server DLL, without HLSDK.
 *
 * Why (D.7.38): the 229 imports in build-ts-dll.sh came from HLSDK C++
 * vtables, not SIDE_MODULE itself. Compiling a side module that has
 * only the four entry points xash3d-fwgs dlopen()s produces ZERO
 * imports under identical flags (see build/mintest.wasm). The fix is
 * to drop HLSDK and satisfy the engine↔DLL contract with a thin C
 * shim that forwards every DLL_FUNCTIONS callback into JavaScript via
 * EM_JS. The TS gameplay already written in src/mod/ becomes the
 * implementation body.
 *
 * The DLL_FUNCTIONS table is plain C — 52 function pointers, no C++,
 * no virtual dispatch. Field order is positional in eiface.h.
 */

#include <stdint.h>
#include <stddef.h>
#include <emscripten.h>

typedef int qboolean;
typedef struct edict_s edict_t;
typedef struct { int dummy; } opaque_t;
#define OPAQUE_T(name) typedef opaque_t name
OPAQUE_T(SAVERESTOREDATA);
OPAQUE_T(KeyValueData);
OPAQUE_T(customization_t);
OPAQUE_T(playermove_t);
OPAQUE_T(clientdata_t);
OPAQUE_T(weapon_data_t);
OPAQUE_T(entity_state_t);
OPAQUE_T(netadr_t);
typedef struct usercmd_s usercmd_t;

/* engine/eiface.h:391 — DLL_FUNCTIONS field order is positional. */
typedef struct {
    void  (*pfnGameInit)(void);
    int   (*pfnSpawn)(edict_t *pent);
    void  (*pfnThink)(edict_t *pent);
    void  (*pfnUse)(edict_t *pentUsed, edict_t *pentOther);
    void  (*pfnTouch)(edict_t *pentTouched, edict_t *pentOther);
    void  (*pfnBlocked)(edict_t *pentBlocked, edict_t *pentOther);
    void  (*pfnKeyValue)(edict_t *pentKeyvalue, KeyValueData *pkvd);
    void  (*pfnSave)(edict_t *pent, SAVERESTOREDATA *pSaveData);
    int   (*pfnRestore)(edict_t *pent, SAVERESTOREDATA *pSaveData, int globalEntity);
    void  (*pfnSetAbsBox)(edict_t *pent);

    void  (*pfnSaveWriteFields)(SAVERESTOREDATA *, const char *, void *, void *, int);
    void  (*pfnSaveReadFields)(SAVERESTOREDATA *, const char *, void *, void *, int);
    void  (*pfnSaveGlobalState)(SAVERESTOREDATA *);
    void  (*pfnRestoreGlobalState)(SAVERESTOREDATA *);
    void  (*pfnResetGlobalState)(void);

    qboolean (*pfnClientConnect)(edict_t *, const char *, const char *, char[128]);
    void  (*pfnClientDisconnect)(edict_t *);
    void  (*pfnClientKill)(edict_t *);
    void  (*pfnClientPutInServer)(edict_t *);
    void  (*pfnClientCommand)(edict_t *);
    void  (*pfnClientUserInfoChanged)(edict_t *, char *);
    void  (*pfnServerActivate)(edict_t *pEdictList, int edictCount, int clientMax);
    void  (*pfnServerDeactivate)(void);
    void  (*pfnPlayerPreThink)(edict_t *);
    void  (*pfnPlayerPostThink)(edict_t *);

    void  (*pfnStartFrame)(void);
    void  (*pfnParmsNewLevel)(void);
    void  (*pfnParmsChangeLevel)(void);

    const char *(*pfnGetGameDescription)(void);
    void  (*pfnPlayerCustomization)(edict_t *, customization_t *);

    void  (*pfnSpectatorConnect)(edict_t *);
    void  (*pfnSpectatorDisconnect)(edict_t *);
    void  (*pfnSpectatorThink)(edict_t *);

    void  (*pfnSys_Error)(const char *);

    void  (*pfnPM_Move)(playermove_t *, qboolean);
    void  (*pfnPM_Init)(playermove_t *);
    char  (*pfnPM_FindTextureType)(const char *);
    void  (*pfnSetupVisibility)(edict_t *, edict_t *, unsigned char **, unsigned char **);
    void  (*pfnUpdateClientData)(const edict_t *, int, clientdata_t *);
    int   (*pfnAddToFullPack)(entity_state_t *, int, edict_t *, edict_t *, int, int, unsigned char *);
    void  (*pfnCreateBaseline)(int, int, entity_state_t *, const edict_t *, int, float *, float *);
    void  (*pfnRegisterEncoders)(void);
    int   (*pfnGetWeaponData)(const edict_t *, weapon_data_t *);

    void  (*pfnCmdStart)(const edict_t *, const usercmd_t *, unsigned int);
    void  (*pfnCmdEnd)(const edict_t *);

    int   (*pfnConnectionlessPacket)(const netadr_t *, const char *, char *, int *);
    int   (*pfnGetHullBounds)(int, float *, float *);
    void  (*pfnCreateInstancedBaselines)(void);

    int   (*pfnInconsistentFile)(const edict_t *, const char *, char *);
    int   (*pfnAllowLagCompensation)(void);
} DLL_FUNCTIONS;

typedef struct {
    int (*pfnPrecacheModel)(const char *);
    /* …rest of g_engfuncs; we don't dereference. */
    void *_pad;
} ENGINE_FUNCTIONS;

/* DLL_FUNCTIONS vtable holds OUR callbacks.
 * ENGINE_FUNCTIONS comes from the engine and lets us call back into it. */
static DLL_FUNCTIONS g_dll;
static ENGINE_FUNCTIONS g_eng;

/*
 * Bridge between WASM callbacks and TS gameplay. The JS host installs
 * `Module.ctsBridge` before the DLL loads (see webxash/src/services/ts-bridge.ts).
 * Every EM_JS trampoline calls into that single object, returning 0 when
 * the host hasn't installed a handler yet so the engine can boot with a
 * no-op shim if no implementation is wired up.
 */

EM_JS(int, bridge_spawn, (int e, int op, int flags), {
    if (typeof Module === "undefined" || !Module.ctsBridge || typeof Module.ctsBridge.spawn !== "function") return 0;
    return Module.ctsBridge.spawn(e, op, flags);
})
EM_JS(int, bridge_think, (int e, int op, int flags), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.think !== "function") return 0;
    return Module.ctsBridge.think(e, op, flags);
})
EM_JS(int, bridge_use, (int a, int b, int op), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.use !== "function") return 0;
    return Module.ctsBridge.use(a, b, op);
})
EM_JS(int, bridge_touch, (int a, int b, int op), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.touch !== "function") return 0;
    return Module.ctsBridge.touch(a, b, op);
})
EM_JS(int, bridge_clientConnect, (int e, int nameAddr, int addrAddr), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.clientConnect !== "function") return 0;
    return Module.ctsBridge.clientConnect(e, nameAddr, addrAddr);
})
EM_JS(int, bridge_clientDisconnect, (int e, int op, int flags), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.clientDisconnect !== "function") return 0;
    return Module.ctsBridge.clientDisconnect(e, op, flags);
})
EM_JS(int, bridge_clientCommand, (int e, int op, int flags), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.clientCommand !== "function") return 0;
    return Module.ctsBridge.clientCommand(e, op, flags);
})
EM_JS(int, bridge_playerPreThink, (int e, int op, int flags), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.playerPreThink !== "function") return 0;
    return Module.ctsBridge.playerPreThink(e, op, flags);
})
EM_JS(int, bridge_playerPostThink, (int e, int op, int flags), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.playerPostThink !== "function") return 0;
    return Module.ctsBridge.playerPostThink(e, op, flags);
})
EM_JS(int, bridge_startFrame, (int op, int unused, int flags), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.startFrame !== "function") return 0;
    return Module.ctsBridge.startFrame(op, unused, flags);
})
EM_JS(int, bridge_getGameDescription, (int op, int unused, int flags), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.getGameDescription !== "function") return 0;
    return Module.ctsBridge.getGameDescription(op, unused, flags);
})
EM_JS(int, bridge_precacheModel, (int pathAddr, int unused, int unused2), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.precacheModel !== "function") return 0;
    return Module.ctsBridge.precacheModel(pathAddr, unused, unused2);
})
EM_JS(int, bridge_precacheSound, (int pathAddr, int unused, int unused2), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.precacheSound !== "function") return 0;
    return Module.ctsBridge.precacheSound(pathAddr, unused, unused2);
})
EM_JS(int, bridge_cmdStart, (int playerAddr, int cmdAddr, int flags), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.cmdStart !== "function") return 0;
    return Module.ctsBridge.cmdStart(playerAddr, cmdAddr, flags);
})

/* ── DLL_FUNCTIONS callbacks. Each one is a thin forwarder so the
 *    JS side owns all behaviour. The engine indexes the table
 *    positionally, so pointers must remain stable across reloads
 *    via the same address — that's how this file achieves a
 *    no-allocation, no-static-init footprint. ────────────────────── */

static void ts_GameInit(void)
{
    if (g_eng.pfnPrecacheModel) {
        /* Precache every TS model so the client renders them.
         * Mirrors the mod.cfg content. Null-terminated list. */
        static const char *models[] = {
            "models/v_sealknife.mdl",
            "models/v_beretta.mdl",
            "models/v_anaconda.mdl",
            "models/v_mp5.mdl",
            "models/p_sealknife.mdl",
            "models/player/agent/agent.mdl",
            "models/player/seal/seal.mdl",
            "models/p_knife.mdl",
            "models/p_beretta.mdl",
            "models/p_anaconda.mdl",
            "models/p_mp5.mdl",
            NULL,
        };
        for (int i = 0; models[i] != NULL; ++i) g_eng.pfnPrecacheModel(models[i]);
    }
    (void)bridge_spawn(1, 0, 0); /* TS_OP_GAMEINIT */
}

static int ts_Spawn(edict_t *e)        { return bridge_spawn((int)e, 2, 0); }
static void ts_Think(edict_t *e)       { (void)bridge_think((int)e, 0, 0); }
static void ts_Use(edict_t *a, edict_t *b)      { (void)bridge_use((int)a, (int)b, 0); }
static void ts_Touch(edict_t *a, edict_t *b)    { (void)bridge_touch((int)a, (int)b, 0); }

static qboolean ts_ClientConnect(edict_t *e, const char *name, const char *addr, char reason[128])
{
    int rv = bridge_clientConnect((int)e, (int)name, (int)addr);
    if (rv == 0) reason[0] = 0;
    return rv;
}

static void ts_ClientDisconnect(edict_t *e) { (void)bridge_clientDisconnect((int)e, 0, 0); }
static void ts_ClientCommand(edict_t *e)    { (void)bridge_clientCommand((int)e, 0, 0); }

static void ts_PreThink(edict_t *e)  { (void)bridge_playerPreThink((int)e, 0, 0); }
static void ts_PostThink(edict_t *e) { (void)bridge_playerPostThink((int)e, 0, 0); }

static void ts_StartFrame(void)     { (void)bridge_startFrame(0, 0, 0); }

static const char *ts_GetGameDescription(void)
{
    return "The Specialists";
}

/* xash3d-fwgs also dlsym()s these for physics compatibility, even
 * though we don't ship a physics interface yet. Return nulls. */
/* Visibility:
 *
 *   The four xash3d-fwgs entry points must reach the engine's dlopen.
 *   Under `-fvisibility=hidden`, only symbols with DEFAULT visibility
 *   appear in the dynamic-link export section; hidden symbols get
 *   `.hidden` and the linker's dlsym walk won't find them, which was
 *   the failure mode of the very first shim build:
 *
 *     Sys_Warn: can't initialize dlls/hl_emscripten_wasm32.wasm:
 *       missing GetEntityAPI and GetEntityAPI2 exports
 *
 *   Annotate only these four with visibility("default"). All other
 *   helpers stay hidden so the WASM export table stays minimal.
 */
#define ENGINE_ENTRY __attribute__((visibility("default")))

int ENGINE_ENTRY GetEntityAPI(DLL_FUNCTIONS *p, int version)
{
    /* Fill ALL 52 slots so no UB from uninitialised function pointers
     * on the engine side. Many defaults no-op or defer to JS. */
    p->pfnGameInit = ts_GameInit;
    p->pfnSpawn = ts_Spawn;
    p->pfnThink = ts_Think;
    p->pfnUse = ts_Use;
    p->pfnTouch = ts_Touch;
    p->pfnBlocked = NULL;
    p->pfnKeyValue = NULL;
    p->pfnSave = NULL;
    p->pfnRestore = NULL;
    p->pfnSetAbsBox = NULL;
    p->pfnSaveWriteFields = NULL;
    p->pfnSaveReadFields = NULL;
    p->pfnSaveGlobalState = NULL;
    p->pfnRestoreGlobalState = NULL;
    p->pfnResetGlobalState = NULL;
    p->pfnClientConnect = ts_ClientConnect;
    p->pfnClientDisconnect = ts_ClientDisconnect;
    p->pfnClientKill = NULL;
    p->pfnClientPutInServer = NULL;
    p->pfnClientCommand = ts_ClientCommand;
    p->pfnClientUserInfoChanged = NULL;
    p->pfnServerActivate = NULL;
    p->pfnServerDeactivate = NULL;
    p->pfnPlayerPreThink = ts_PreThink;
    p->pfnPlayerPostThink = ts_PostThink;
    p->pfnStartFrame = ts_StartFrame;
    p->pfnParmsNewLevel = NULL;
    p->pfnParmsChangeLevel = NULL;
    p->pfnGetGameDescription = ts_GetGameDescription;
    p->pfnPlayerCustomization = NULL;
    p->pfnSpectatorConnect = NULL;
    p->pfnSpectatorDisconnect = NULL;
    p->pfnSpectatorThink = NULL;
    p->pfnSys_Error = NULL;
    p->pfnPM_Move = NULL;
    p->pfnPM_Init = NULL;
    p->pfnPM_FindTextureType = NULL;
    p->pfnSetupVisibility = NULL;
    p->pfnUpdateClientData = NULL;
    p->pfnAddToFullPack = NULL;
    p->pfnCreateBaseline = NULL;
    p->pfnRegisterEncoders = NULL;
    p->pfnGetWeaponData = NULL;
    p->pfnCmdStart = NULL;
    p->pfnCmdEnd = NULL;
    p->pfnConnectionlessPacket = NULL;
    p->pfnGetHullBounds = NULL;
    p->pfnCreateInstancedBaselines = NULL;
    p->pfnInconsistentFile = NULL;
    p->pfnAllowLagCompensation = NULL;
    return 1;
}

void ENGINE_ENTRY GiveFnptrsToDll(ENGINE_FUNCTIONS *pe, void *pg)
{
    if (pe) g_eng = *pe;
    (void)pg;
}

/* Physics compatibility entry point. We ship no physics interface;
 * returning 0 tells the engine to use its built-in handling. */
int ENGINE_ENTRY Server_GetPhysicsInterface(int v, void *api, void **i)
{
    (void)v; (void)api; (void)i;
    return 0;
}