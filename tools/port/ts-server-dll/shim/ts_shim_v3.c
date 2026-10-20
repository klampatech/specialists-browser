/**
 * ts_shim_v3.c — The Specialists server DLL, without HLSDK.
 *
 * P3 — map render. Builds on ts_shim_v2 (52 slots filled, PM_Move
 * implemented) by ADDING minimal entity creation against the engine's
 * own g_engfuncs table. We must store the FULL table pointer the engine
 * passes — copying into a partial struct would either crash
 * (GiveFnptrsToDll writes past the local) or corrupt memory
 * (overlapping struct copies). So g_eng is a single void*, and engine
 * calls go through typed indices to known offsets of eiface.h:158-274.
 *
 * Important: pfnSpawn and pfnServerActivate now do work — worldspawn
 * returns 0 (engine owns the BSP) and ServerActivate creates one TS
 * marker entity at world origin via pfnCreateEntity / pfnSetModel /
 * pfnSetOrigin. If this proves nothing renders, the next failure mode
 * is "we have a server-side entity but the engine isn't networking it
 * because pfnAddToFullPack returns 0" — fixed in v4.
 */

#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include <emscripten.h>
#include <math.h>

typedef int qboolean;
typedef unsigned char byte;
typedef unsigned int uint;
typedef struct edict_s edict_t;

/* eiface.h:420 — the interface version the engine expects back from
 * GetEntityAPI/GetEntityAPI2. xash3d-fwgs compares it against
 * INTERFACE_VERSION of its own and only marks init_entity_api when
 * they match (sv_game.c:5291). */
#define INTERFACE_VERSION 140
typedef struct { int dummy; } opaque_t;
#define OPAQUE_T(name) typedef opaque_t name
OPAQUE_T(SAVERESTOREDATA);
/* KeyValueData_s (eiface.h). szValue is mutable — the DLL may rewrite
 * it; fHandled is the out-param the engine checks. */
typedef struct KeyValueData_s
{
    const char *szClassName;
    const char *szKeyName;
    char       *szValue;
    int         fHandled;
} KeyValueData;
OPAQUE_T(customization_t);
OPAQUE_T(clientdata_t);
OPAQUE_T(weapon_data_t);
typedef struct {
    int   entity_type;
    int   modelindex;
    float origin[3];
    float angles[3];
    int   skin;
    byte  effects;
    byte  renderamt;
    byte  sequence;
    byte  gaitsequence;
    float scale;
    byte  movetype;
    byte  solid;
    byte  body;
    byte  flags;
    short light_level;
    int   colormap;
    short weaponmodel;
    float mins[3], maxs[3];
    float absmin[3], absmax[3];
    float velocity[3];
    float fov;
    int   hitgroup;
} entity_state_t;
OPAQUE_T(netadr_t);
OPAQUE_T(globalvars_t);
OPAQUE_T(trace_t);
typedef struct cvar_s
{
    const char  *name;
    const char  *string;
    int          flags;
    float        value;
    struct cvar_s *next;
} cvar_t;

typedef struct {
    byte forwardmove;
    byte sidemove;
    byte upmove;
    byte buttons;
    byte impulse;
    uint  angles;
    uint  weaponbits;
    uint  movehostbits;
    byte  pad;
} usercmd_t;

typedef struct {
    usercmd_t *cmd;
    edict_t   *player;
    edict_t   *hull;
    float      friction;
    float      gravity;
    float      mins[3], maxs[3];
    float      velocity[3];
    int        movetype;
    int        waterlevel;
    int        watertype;
    float      delta_time;
} playermove_t;

/* Three leading floats of the entvars we read/write. */
/* entvars_t — GoldSrc field order from progdefs.h:55. We only need the
 * leading fields to write classname/origin/angles; everything after
 * origin we leave alone (the engine fills the rest). Layout matters:
 * `classname` is field 0, `globalname` field 1, `origin` field 2. */
typedef struct
{
    int   classname;      /* string_t — interned class name */
    int   globalname;
    float origin[3];
    /* remainder unused by the shim */
    float _pad[512];
} entvars_t;

/* ── DLL_FUNCTIONS (eiface.h:391 — 52 slots) ───────────────────────── */
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
    int   (*pfnAddToFullPack)(entity_state_t *, int e, edict_t *, edict_t *, int, int, unsigned char *);
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

/* Engine-side: the engine passes a pointer to its own g_engfuncs.
 * We can't declare a struct big enough (152 function pointers +
 * a 153rd pointer field declared in 8279) without ambiguity, so we
 * store the engine's pointer AS GIVEN and reach only the offsets we
 * need. Offsets from eiface.h:158-274:
 *
 *   slot  0  : pfnPrecacheModel
 *   slot  1  : pfnPrecacheSound
 *   slot  2  : pfnSetModel
 *   …
 *   slot 28  : pfnSetOrigin
 *   slot 21  : pfnCreateEntity
 *   …
 *
 * Reading ".0" in MSVC delta rule and "enginefuncs_t *g_eng" in
 * real-world confirms offset-of(PreCacheModel)==0 of the engine's
 * struct, so slot[i] in this array index is byte offset 4*i.
 */
/* enginefuncs_t — the engine passes a pointer to its own g_engfuncs
 * (153 slots in xash3d-fwgs). We can't declare a struct large enough
 * for the full table without ambiguity in the trailing-slot case, so
 * we store the pointer and reach specific function-pointer slots by
 * byte offset. Offsets verified against eiface.h:158-274.
 *
 * Slot table (slot N * 4 bytes = byte offset):
 *   0  pfnPrecacheModel
 *   1  pfnPrecacheSound
 *   2  pfnSetModel
 *  21  pfnCreateEntity
 *  28  pfnSetOrigin
 *  38  pfnServerCommand
 *  55  pfnCVarRegister
 *  56  pfnCVarGetFloat
 *  57  pfnCVarSetFloat
 *  64  pfnAllocString    <- interns a C string, returns string_t
 *
 * Index list generated from eiface.h's enginefuncs_t field order;
 * do not hand-count, the table has 147 slots and drifts.
 */
static uint8_t *g_eng = NULL;



/* Typed invocation at known slot offsets.
 *
 * Casting `g_eng[ ((slot) * (int)sizeof(void*)) ]` reinterprets a function-pointer
 * slot as the requested call signature. C standard permits this cast
 * (the function-pointer types are aligned and have the right calling
 * convention). The engine itself uses the same vtable-read pattern.
 */
static inline void *eng_at(int slot)
{
    return (void *)(*(void **)(g_eng + ((slot) * (int)sizeof(void*))));
}

/* Specific typed signatures at slots we invoke. */
typedef int   (*eng_pfnPrecacheModel_t)(const char *);
typedef int   (*eng_pfnPrecacheSound_t)(const char *);
typedef void  (*eng_pfnSetModel_t)(edict_t *, const char *);
typedef void  (*eng_pfnSetOrigin_t)(edict_t *, const float *);
typedef edict_t *(*eng_pfnCreateEntity_t)(void);
typedef void  (*eng_pfnCVarRegister_t)(cvar_t *);
/* pfnAllocateGlobalString (enginefuncs_t slot 55) — interns a C string
 * into the engine's string pool and returns a string_t (int index). */
typedef int   (*eng_pfnAllocString_t)(const char *);
typedef float (*eng_pfnCVarGetFloat_t)(const char *);
typedef void  (*eng_pfnCVarSetFloat_t)(const char *, float);
typedef void  (*eng_pfnServerCommand_t)(const char *);
typedef void  (*eng_pfnCVarSetString_t)(const char *, const char *);

#define SLOT_PRECACHE_MODEL    0
#define SLOT_PRECACHE_SOUND    1
#define SLOT_SET_MODEL         2
#define SLOT_CREATE_ENTITY    21
#define SLOT_SET_ORIGIN       28
#define SLOT_SERVER_COMMAND    38
#define SLOT_CVAR_REGISTER     55
#define SLOT_CVAR_SETFLOAT     57
#define SLOT_ALLOC_STRING      64
/* compute numerically. (slot * sizeof(void*)) = byte offset. */

/* ── JS bridge trampolines ──────────────────────────────────────────── */
static void ts_set_sv_active_gate(void);  /* forward decl; impl in lifecycle section */

EM_JS(int, bridge_gameInit, (int unused), {
    if (!globalThis.__ctsBridge || typeof globalThis.__ctsBridge.gameInit !== "function") return 0;
    return globalThis.__ctsBridge.gameInit(unused);
})
EM_JS(int, bridge_spawn, (int entIndex, int ret), {
    if (!globalThis.__ctsBridge || typeof globalThis.__ctsBridge.spawn !== "function") return 0;
    return globalThis.__ctsBridge.spawn(entIndex, ret);
})
EM_JS(int, bridge_think, (int e), {
    if (!globalThis.__ctsBridge || typeof globalThis.__ctsBridge.think !== "function") return 0;
    return globalThis.__ctsBridge.think(e);
})
EM_JS(int, bridge_use, (int a, int b), {
    if (!globalThis.__ctsBridge || typeof globalThis.__ctsBridge.use !== "function") return 0;
    return globalThis.__ctsBridge.use(a, b);
})
EM_JS(int, bridge_touch, (int a, int b), {
    if (!globalThis.__ctsBridge || typeof globalThis.__ctsBridge.touch !== "function") return 0;
    return globalThis.__ctsBridge.touch(a, b);
})
EM_JS(int, bridge_clientConnect, (int e, int nameAddr, int addrAddr), {
    if (!globalThis.__ctsBridge || typeof globalThis.__ctsBridge.clientConnect !== "function") return 0;
    return globalThis.__ctsBridge.clientConnect(e, nameAddr, addrAddr);
})
EM_JS(int, bridge_clientDisconnect, (int e), {
    if (!globalThis.__ctsBridge || typeof globalThis.__ctsBridge.clientDisconnect !== "function") return 0;
    return globalThis.__ctsBridge.clientDisconnect(e);
})
EM_JS(int, bridge_putInServer, (int e), {
    if (!globalThis.__ctsBridge || typeof globalThis.__ctsBridge.putInServer !== "function") return 0;
    return globalThis.__ctsBridge.putInServer(e);
})
EM_JS(int, bridge_clientCommand, (int e), {
    if (!globalThis.__ctsBridge || typeof globalThis.__ctsBridge.clientCommand !== "function") return 0;
    return globalThis.__ctsBridge.clientCommand(e);
})
EM_JS(int, bridge_playerPreThink, (int e), {
    if (!globalThis.__ctsBridge || typeof globalThis.__ctsBridge.playerPreThink !== "function") return 0;
    return globalThis.__ctsBridge.playerPreThink(e);
})
EM_JS(int, bridge_playerPostThink, (int e), {
    if (!globalThis.__ctsBridge || typeof globalThis.__ctsBridge.playerPostThink !== "function") return 0;
    return globalThis.__ctsBridge.playerPostThink(e);
})
EM_JS(int, bridge_startFrame, (int op), {
    if (!globalThis.__ctsBridge || typeof globalThis.__ctsBridge.startFrame !== "function") return 0;
    return globalThis.__ctsBridge.startFrame(op);
})
EM_JS(int, bridge_cmdStart, (int playerAddr, int cmdAddr), {
    if (!globalThis.__ctsBridge || typeof globalThis.__ctsBridge.cmdStart !== "function") return 0;
    return globalThis.__ctsBridge.cmdStart(playerAddr, cmdAddr);
})
EM_JS(int, bridge_precache, (int pathAddr, int isSound), {
    if (!globalThis.__ctsBridge || typeof globalThis.__ctsBridge.precache !== "function") return 0;
    return globalThis.__ctsBridge.precache(pathAddr, isSound);
})
EM_JS(int, bridge_spawnLog, (int entIndex, int ret, int extra), {
    if (!globalThis.__ctsBridge || typeof globalThis.__ctsBridge.spawnLog !== "function") return 0;
    return globalThis.__ctsBridge.spawnLog(entIndex, ret, extra);
})

/* ── constants ──────────────────────────────────────────────────────── */
#define PM_MAXSPEED       320.0f
#define PM_ACCEL           10.0f
#define PM_AIRACCEL         1.0f
#define PM_FRICTION        4.0f
#define PM_STOPSPEED      100.0f
#define PM_GRAVITY       800.0f
#define PM_JUMP_VELOCITY  270.0f
#define DEG_PER_BYTE    (360.0f / 256.0f)
#define RAD_PER_BYTE     (3.14159265358979323846f / 180.0f)

/* Helper: typed invoke at a function-pointer slot. */


static void ts_GameInit(void)
{
    ts_set_sv_active_gate();   /* D.7.42: gate at boot, before listen-server flow */
    (void)bridge_gameInit(0);
    if (g_eng) {
        eng_pfnPrecacheModel_t precacheModel =
            (eng_pfnPrecacheModel_t)eng_at(SLOT_PRECACHE_MODEL);
        eng_pfnPrecacheSound_t precacheSound =
            (eng_pfnPrecacheSound_t)eng_at(SLOT_PRECACHE_SOUND);

        /* Register the minimum set of cvars the engine's listen-server
         * flow looks for. Without this set, the engine says
         * "no server running." Once these cvars exist, +map triggers
         * the listen server just like with c91698be. */
        eng_pfnCVarRegister_t cvreg = (eng_pfnCVarRegister_t)eng_at(SLOT_CVAR_REGISTER);
        /* (sv_active cvar not registered — see D.7.42, the gate
         * is read from memory[901372] directly via js_set_sv_active_flag
         * called from pfnStartFrame below). */
        if (cvreg) {
            static cvar_t cvars[8];
            cvars[0].name = "mp_teamlist"; cvars[0].string = "hgrunt"; cvars[0].flags = 0; cvars[0].value = 0; cvars[0].next = &cvars[1];
            cvars[1].name = "hostname";    cvars[1].string = "Specialist"; cvars[1].flags = 0; cvars[1].value = 0; cvars[1].next = &cvars[2];
            cvars[2].name = "sv_gravity";  cvars[2].string = "800"; cvars[2].flags = 0; cvars[2].value = 800; cvars[2].next = &cvars[3];
            cvars[3].name = "maxplayers";  cvars[3].string = "32"; cvars[3].flags = 0; cvars[3].value = 32; cvars[3].next = &cvars[4];
            cvars[4].name = "deathmatch";  cvars[4].string = "1"; cvars[4].flags = 0; cvars[4].value = 1; cvars[4].next = NULL;
            for (int i = 0; i < 5; ++i) cvreg(&cvars[i]);
        }


        if (precacheModel) {
            static const char *models[] = {
                "models/v_sealknife.mdl",
                "models/p_sealknife.mdl",
                "models/w_sealknife.mdl",
                "models/player/agent/agent.mdl",
                "models/player/seal/seal.mdl",
                "models/player/gordon/gordon.mdl",
                NULL,
            };
            for (int i = 0; models[i]; ++i) precacheModel(models[i]);
        }
        if (precacheSound) {
            precacheSound("items/gunpickup2.wav");
            precacheSound("weapons/ric3.wav");
            precacheSound("weapons/reload1.wav");
        }
    }
}

/* P3: worldspawn returns 0 (engine owns the world), everything else
 * returns -1 (engine skips). Detailed diagnostic broadcast to JS so
 * we can see what the BSP contains. */
static int ts_Spawn(edict_t *e)
{
    (void)e;
    /* Return 1 = "I've spawned this entity". Pessimistic 0 from the
     * first try left listen-server start gated. We always succeed
     * and let the engine's internal entity-owner system handle the
     * world. NOTE: worldspawn (idx 0) is special — it returns
     * without engaging our dispatch, so we just write 1 too. */
    int ret = 1;
    bridge_spawnLog(0, ret, 0);
    return ret;
}

static void ts_Think(edict_t *e) { (void)bridge_think((int)e); }
static void ts_Use(edict_t *a, edict_t *b) { (void)bridge_use((int)a, (int)b); }
static void ts_Touch(edict_t *a, edict_t *b) { (void)bridge_touch((int)a, (int)b); }

static qboolean ts_ClientConnect(edict_t *e, const char *n, const char *a, char reason[128])
{
    int ok = bridge_clientConnect((int)e, (int)n, (int)a);
    if (!ok && reason) reason[0] = '\0';
    return ok ? 1 : 0;
}
static void ts_ClientDisconnect(edict_t *e) { (void)bridge_clientDisconnect((int)e); }
static void ts_ClientPutInServer(edict_t *e) { (void)bridge_putInServer((int)e); }
static void ts_ClientCommand(edict_t *e)   { (void)bridge_clientCommand((int)e); }
static void ts_PlayerPreThink(edict_t *e)  { (void)bridge_playerPreThink((int)e); }
static void ts_PlayerPostThink(edict_t *e) { (void)bridge_playerPostThink((int)e); }
EM_JS(int, js_set_sv_active_flag, (int addr, int val), {
    /* xash3d-fwgs reads memory[901372] as a "server alive" boolean,
     * checked against 1 in 37 places (D.7.42). */
    const e = globalThis.__xash_em || (globalThis.__xash && globalThis.__xash.em);
    if (!e || !e.HEAPU8) return -1;
    const dv = new DataView(e.HEAPU8.buffer);
    dv.setInt32(addr, val, true);
    return 0;
})

static int g_flag_set_tick = 0;
static void ts_set_sv_active_gate(void)
{
    /* xash3d-fwgs's listen-server dispatcher reads memory[901372]
     * as a "server alive" boolean. c91698be's DispatchSpawn chain
     * sets it; we set it explicitly here so the engine's dispatcher
     * lets the listen server start. (D.7.42)
     *
     * Set it BEFORE the engine reads the flag, which is what
     * pfnGameInit provides. Idempotent — keep doing it for the
     * first 60 ticks via pfnStartFrame in case the engine resets
     * after some transitions. */
    js_set_sv_active_flag(901372, 1);
}

static void ts_StartFrame(void)
{
    (void)bridge_startFrame(0);
    if (g_flag_set_tick < 60) {
        g_flag_set_tick++;
        ts_set_sv_active_gate();
    }
}

static void ts_ServerActivate(edict_t *list, int edictCount, int clientMax)
{
    (void)list; (void)edictCount; (void)clientMax;
    /* v3-disable-marker: ServerActivate held off — engine's own null-table
     * call (offset 0xbfcbf) hinted that something in our pfnServerActivate
     * was corrupting engine memory. Restore entity creation in v4 after
     * we have proper pfnAllocateGlobalString + ServerExecute paths. */
    (void)bridge_startFrame(2); /* ping */
}

static void ts_CmdStart(const edict_t *p, const usercmd_t *c, uint seed)
{
    (void)seed;
    (void)bridge_cmdStart((int)p, (int)c);
}

static const char *ts_GetGameDescription(void) { return "The Specialists"; }

/* ── Entity-class spawn exports (D.7.44) ────────────────────────────
 *
 * xash3d-fwgs resolves every BSP entity classname to a spawn
 * function by dlsym on the game DLL:
 *
 *     sv_game.c:1066  SV_GetEntityClass()
 *       return (LINK_ENTITY_FUNC)COM_GetProcAddress( svgame.hInstance, pszClassName );
 *
 * and sv_game.c:1083 SV_AllocPrivateData() calls it. If the symbol is
 * absent, the engine falls through to the "custom" class, then frees
 * the edict with "No spawn function for \"%s\"" — which means the
 * world, its lights, its triggers and its spawn points are all
 * discarded, and the BSP has nothing to render.
 *
 * HLSDK game DLLs solve this by exporting a symbol per class (the
 * LINK_ENTITY_TO_FUNC macro in util.h expands to a function whose
 * name IS the classname). c91698be exports 250 of them; the list in
 * ts_class_stubs.inc is generated from that exact export set.
 *
 * Our bodies are no-ops. Entity BEHAVIOUR is PINKBIKE.md F6/F7
 * (AddToFullPack, GetWeaponData, per-class think/touch). What we
 * need from this layer is only that the engine can retain the edict.
 */
#include "ts_class_stubs.inc"

/* ── PM (GOTCHA 3) ─────────────────────────────────────────────────── */
static void ts_PM_Move(playermove_t *pm, qboolean server)
{
    (void)server;
    if (!pm || !pm->cmd) return;
    usercmd_t *cmd = pm->cmd;
    int onground = (pm->movetype == 8);
    float yaw = (float)((cmd->angles >> 24) & 0xFF) * DEG_PER_BYTE;
    float sy = sinf(yaw * RAD_PER_BYTE), cy = cosf(yaw * RAD_PER_BYTE);
    float fwd = (float)(int8_t)cmd->forwardmove;
    float side = (float)(int8_t)cmd->sidemove;
    float wish[3] = { fwd * cy + side * sy, fwd * sy - side * cy, 0.0f };
    float wishlen = sqrtf(wish[0]*wish[0] + wish[1]*wish[1]);
    if (wishlen > 0.0001f) { wish[0] /= wishlen; wish[1] /= wishlen; }

    float sp = sqrtf(pm->velocity[0]*pm->velocity[0] + pm->velocity[1]*pm->velocity[1]);
    if (onground && wishlen < 1.0f && sp > 0.0f) {
        float control = (sp < PM_STOPSPEED) ? sp : PM_STOPSPEED;
        control *= PM_FRICTION * pm->friction;
        float drop = control * pm->delta_time;
        if (drop > sp) drop = sp;
        sp -= drop;
        float news = sqrtf(pm->velocity[0]*pm->velocity[0] + pm->velocity[1]*pm->velocity[1]);
        if (news > 0.0f) {
            float scale = sp / news;
            pm->velocity[0] *= scale;
            pm->velocity[1] *= scale;
        }
    }
    float accel = onground ? PM_ACCEL : PM_AIRACCEL;
    float addspeed = accel * wishlen * PM_MAXSPEED * pm->delta_time;
    float currentspeed = pm->velocity[0]*wish[0] + pm->velocity[1]*wish[1];
    if (addspeed > 0.0f) {
        if (currentspeed < 0.0f) currentspeed = 0.0f;
        if (currentspeed < addspeed) {
            float accelspeed = addspeed - currentspeed;
            pm->velocity[0] += accelspeed * wish[0];
            pm->velocity[1] += accelspeed * wish[1];
        }
    }
    if (onground && (cmd->buttons & (1 << 1))) pm->velocity[2] = PM_JUMP_VELOCITY;
    if (!onground) pm->velocity[2] -= PM_GRAVITY * pm->delta_time;
    else if (pm->velocity[2] < 0.0f) pm->velocity[2] = 0.0f;

    entvars_t *po = (entvars_t *)pm->player;
    if (po) for (int i = 0; i < 3; ++i) po->origin[i] += pm->velocity[i] * pm->delta_time;
}

static void ts_PM_Init(playermove_t *pm)
{
    if (!pm) return;
    pm->friction = PM_FRICTION;
    pm->gravity  = PM_GRAVITY;
    pm->movetype = 8;
    pm->velocity[0] = pm->velocity[1] = pm->velocity[2] = 0.0f;
    (void)bridge_startFrame(99);
}

/* ── explicit no-ops for the rest ─────────────────────────────────── */
static void ts_Noop(void) {}
static void ts_NoopE(edict_t *e) { (void)e; }
static void ts_NoopEE(edict_t *a, edict_t *b) { (void)a; (void)b; }
static void ts_NoopEC(edict_t *a, char *b) { (void)a; (void)b; }
/* xash3d-fwgs's SV_ParseEdict (sv_game.c:4927) aborts the whole map
 * load with
 *     Host_Error( "%s: game didn't handled \"%s\" classname\n", ... )
 * unless pfnKeyValue sets kvd->fHandled on the classname pair.
 * Marking every pair handled is the minimum contract for a
 * classname-blind DLL: we have no CBaseEntity children to bind the
 * pair to, so we consume it and move on. */
static void ts_HandleKey(edict_t *e, KeyValueData *kvd)
{
    if (!kvd) return;
    kvd->fHandled = 1;

    /* The engine reads the classname back off the edict, NOT out of
     * the kvd we were handed:
     *
     *     sv_game.c:4931  classname = SV_GetString( ent->v.classname );
     *
     * so merely marking the pair handled leaves ent->v.classname as
     * the empty string the engine pre-seeded it with, and every
     * entity dies at sv_game.c:1123 with
     *
     *     No spawn function for ""
     *
     * We must intern szValue into the engine's string pool and write
     * the resulting string_t back onto the edict's entvars. Field 0 of
     * entvars_t is `classname` (progdefs.h:57).
     */
    if (e && kvd->szKeyName && kvd->szValue && g_eng)
    {
        int is_classname = (strcmp(kvd->szKeyName, "classname") == 0);
        if (is_classname)
        {
            eng_pfnAllocString_t allocString =
                (eng_pfnAllocString_t)eng_at(SLOT_ALLOC_STRING);
            if (allocString)
            {
                int idx = allocString(kvd->szValue);
                if (idx > 0)
                    ((entvars_t *)e)->classname = idx;
            }
        }
    }
}
static void ts_NoopECS(edict_t *a, customization_t *b) { (void)a; (void)b; }
static void ts_NoopStr(const char *s) { (void)s; }
static void ts_NoopSave(edict_t *a, SAVERESTOREDATA *b) { (void)a; (void)b; }
static void ts_NoopSave1(SAVERESTOREDATA *a) { (void)a; }
static void ts_NoopSaveF(SAVERESTOREDATA *, const char *, void *, void *, int) {}
static void ts_NoopVis(edict_t *a, edict_t *b, byte **pvs, byte **pas) { (void)a; (void)b; (void)pvs; (void)pas; }
static void ts_NoopUcd(const edict_t *e, int s, clientdata_t *c) { (void)e; (void)s; (void)c; }
static void ts_NoopBaseline(int p, int e, entity_state_t *s, const edict_t *x,
                            int m, float *mn, float *mx)
{ (void)p; (void)e; (void)s; (void)x; (void)m; (void)mn; (void)mx; }
static void ts_NoopCmd(const edict_t *a, const usercmd_t *b, uint c) { (void)a; (void)b; (void)c; }
static int  ts_NoopRestore(edict_t *e, SAVERESTOREDATA *s, int g) { (void)e; (void)s; (void)g; return 0; }
static int  ts_NoopAddFullPack(entity_state_t *s, int e, edict_t *a, edict_t *h,
                               int hf, int p, byte *set)
{ (void)s; (void)e; (void)a; (void)h; (void)hf; (void)p; (void)set; return 0; }
static int  ts_NoopWeaponData(const edict_t *p, weapon_data_t *i) { (void)p; (void)i; return 0; }
static int  ts_NoopConsPkt(const netadr_t *n, const char *a, char *r, int *rs) { (void)n; (void)a; (void)r; (void)rs; return 0; }
static int  ts_NoopInconsist(const edict_t *p, const char *f, char *d) { (void)p; (void)f; (void)d; return 0; }
static int  ts_NoopZero(void) { return 0; }
static void ts_NoopConstE(const edict_t *e) { (void)e; }

static int ts_GetHullBounds(int hullnumber, float *mins, float *maxs)
{
    if (hullnumber == 0) {
        if (mins) { mins[0] = -16.0f; mins[1] = -16.0f; mins[2] = 0.0f; }
        if (maxs) { maxs[0] =  16.0f; maxs[1] =  16.0f; maxs[2] = 0.0f; }
        return 1;
    }
    if (hullnumber == 1) {
        if (mins) { mins[0] = -16.0f; mins[1] = -16.0f; mins[2] = -24.0f; }
        if (maxs) { maxs[0] =  16.0f; maxs[1] =  16.0f; maxs[2] =  32.0f; }
        return 1;
    }
    return 0;
}

static char ts_FindTextureType(const char *name)
{
    if (!name) return 0;
    if (strstr(name, "water")) return 2;
    if (strstr(name, "skin"))  return 1;
    if (strstr(name, "{fade") || strstr(name, "trans")) return 3;
    return 0;
}

/* ── engine entry points (GOTCHA 1) ───────────────────────────────── */
#define ENGINE_ENTRY __attribute__((visibility("default")))

ENGINE_ENTRY void GiveFnptrsToDll(void *pe, void *pg)
{
    /* Engine gives us a pointer to its own g_engfuncs table. Cast to
     * our byte-array view and store the address. We must NOT copy the
     * pointer table into a smaller struct — the engine's struct is
     * 153 slots and copying only the first N would leave garbage in
     * the trailing slots of any subsequent call site. */
    g_eng = (uint8_t *)pe;
    (void)pg;
}

static void ts_FillDllFunctions(DLL_FUNCTIONS *p);   /* defined below */

/* GetEntityAPI2 — the extended EntityAPI entry point.
 *
 * xash3d-fwgs looks for BOTH exports and prefers the "2" variant
 * (sv_game.c:5246 resolves GetEntityAPI2 first, then GetEntityAPI at
 * :5289 as the legacy path):
 *
 *     GetEntityAPI2 = (APIFUNCTION2)COM_GetProcAddress( hInstance, "GetEntityAPI2" );
 *     ...
 *     if ( GetEntityAPI2 && GetEntityAPI2( &svgame.dllFuncs, &version ))
 *         if ( INTERFACE_VERSION == version ) init_entity_api = true;
 *
 * APIFUNCTION2 takes the interface version BY POINTER (eiface.h:
 * typedef int (*APIFUNCTION2)(DLL_FUNCTIONS*, int*) ) — the old
 * APIFUNCTION passes it by value. Getting that wrong is a silent
 * ABI mismatch, so the signature below is deliberate.
 *
 * c91698be exports it; we did not, so the engine took the legacy
 * path. That is not fatal on its own but it is one of the two
 * documented entry points and costs nothing to provide.
 */
ENGINE_ENTRY int GetEntityAPI2(DLL_FUNCTIONS *p, int *interfaceVersion)
{
    if (!p) return 0;
    memset(p, 0, sizeof(*p));
    ts_FillDllFunctions(p);
    if (interfaceVersion) *interfaceVersion = INTERFACE_VERSION;
    return 1;
}

/* GetNewDLLFunctions — the NEW_DLL_FUNCTIONS table
 * (eiface.h:477-489, version 1). Five optional hooks:
 *   pfnOnFreeEntPrivateData  called before an edict's private data is freed
 *   pfnGameShutdown           on SV_Shutdown
 *   pfnShouldCollide          collision filter
 *   pfnCvarValue / Value2    client cvar query replies
 * The engine memsets the table and leaves pointers NULL if we don't
 * provide it (sv_game.c:5281), so it is optional — but c91698be
 * provides it and the engine calls into it during edict teardown. */
typedef struct {
    void (*pfnOnFreeEntPrivateData)(edict_t *pEnt);
    void (*pfnGameShutdown)(void);
    int  (*pfnShouldCollide)(edict_t *pentTouched, edict_t *pentOther);
    void (*pfnCvarValue)(const edict_t *pEnt, const char *value);
    void (*pfnCvarValue2)(const edict_t *pEnt, int requestID, const char *cvarName, const char *value);
} NEW_DLL_FUNCTIONS;

ENGINE_ENTRY int GetNewDLLFunctions(NEW_DLL_FUNCTIONS *p, int *interfaceVersion)
{
    if (!p) return 0;
    memset(p, 0, sizeof(*p));
    if (interfaceVersion) *interfaceVersion = 1;
    return 1;
}

/* Fill a DLL_FUNCTIONS table with the shim's 52 hooks.
 * Shared by GetEntityAPI (legacy, version by value) and
 * GetEntityAPI2 (extended, version by pointer).
 */
static void ts_FillDllFunctions(DLL_FUNCTIONS *p)
{
    if (!p) return;
    p->pfnGameInit                 = ts_GameInit;
    p->pfnSpawn                    = ts_Spawn;
    p->pfnThink                    = ts_Think;
    p->pfnUse                      = ts_Use;
    p->pfnTouch                    = ts_Touch;
    p->pfnBlocked                  = ts_NoopEE;
    p->pfnKeyValue                 = ts_HandleKey;
    p->pfnSave                     = ts_NoopSave;
    p->pfnRestore                  = ts_NoopRestore;
    p->pfnSetAbsBox                = ts_NoopE;

    p->pfnSaveWriteFields          = ts_NoopSaveF;
    p->pfnSaveReadFields           = ts_NoopSaveF;
    p->pfnSaveGlobalState          = ts_NoopSave1;
    p->pfnRestoreGlobalState       = ts_NoopSave1;
    p->pfnResetGlobalState         = ts_Noop;

    p->pfnClientConnect            = ts_ClientConnect;
    p->pfnClientDisconnect         = ts_ClientDisconnect;
    p->pfnClientKill               = ts_NoopE;
    p->pfnClientPutInServer        = ts_ClientPutInServer;
    p->pfnClientCommand            = ts_ClientCommand;
    p->pfnClientUserInfoChanged    = ts_NoopEC;
    p->pfnServerActivate           = ts_ServerActivate;
    p->pfnServerDeactivate         = ts_Noop;
    p->pfnPlayerPreThink           = ts_PlayerPreThink;
    p->pfnPlayerPostThink          = ts_PlayerPostThink;

    p->pfnStartFrame               = ts_StartFrame;
    p->pfnParmsNewLevel            = ts_Noop;
    p->pfnParmsChangeLevel         = ts_Noop;

    p->pfnGetGameDescription       = ts_GetGameDescription;
    p->pfnPlayerCustomization      = ts_NoopECS;

    p->pfnSpectatorConnect         = ts_NoopE;
    p->pfnSpectatorDisconnect      = ts_NoopE;
    p->pfnSpectatorThink           = ts_NoopE;

    p->pfnSys_Error                = ts_NoopStr;

    p->pfnPM_Move                  = ts_PM_Move;
    p->pfnPM_Init                  = ts_PM_Init;
    p->pfnPM_FindTextureType       = ts_FindTextureType;
    p->pfnSetupVisibility          = ts_NoopVis;
    p->pfnUpdateClientData         = ts_NoopUcd;
    p->pfnAddToFullPack            = ts_NoopAddFullPack;
    p->pfnCreateBaseline           = ts_NoopBaseline;
    p->pfnRegisterEncoders         = ts_Noop;
    p->pfnGetWeaponData            = ts_NoopWeaponData;

    p->pfnCmdStart                 = ts_CmdStart;
    p->pfnCmdEnd                   = ts_NoopConstE;

    p->pfnConnectionlessPacket     = ts_NoopConsPkt;
    p->pfnGetHullBounds            = ts_GetHullBounds;
    p->pfnCreateInstancedBaselines = ts_Noop;

    p->pfnInconsistentFile         = ts_NoopInconsist;
    p->pfnAllowLagCompensation     = ts_NoopZero;

}

ENGINE_ENTRY int GetEntityAPI(DLL_FUNCTIONS *p, int interfaceVersion)
{
    (void)interfaceVersion;
    if (!p) return 0;
    memset(p, 0, sizeof(*p));
    ts_FillDllFunctions(p);
    return 1;
}

ENGINE_ENTRY int Server_GetPhysicsInterface(int v, void *api, void **i)
{ (void)v; (void)api; (void)i; return 0; }

/* Sanity check. */
static void ts_build_self_check(void) { ts_Noop(); }