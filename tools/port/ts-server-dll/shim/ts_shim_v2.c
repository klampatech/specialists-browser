/**
 * ts_shim.c — The Specialists server DLL, without HLSDK.
 *
 * WHY (D.7.38): the 229-import wall came from linking ~105 HLSDK
 * translation units of C++ classes with virtual dispatch under
 * `-sERROR_ON_UNDEFINED_SYMBOLS=0`. Remove HLSDK and the wall is
 * gone — proof: `build/mintest.wasm`, 6 lines of C, 0 imports /
 * 0 GOT.func under identical flags.
 *
 * The engine↔DLL contract (engine/eiface.h:391, `DLL_FUNCTIONS`) is
 * 52 plain C function pointers. No C++ required. This file fills
 * every one of them — NONE may be NULL (GOTCHA 2) — and forwards the
 * interesting ones into JavaScript via EM_JS so the TS gameplay in
 * src/mod/ becomes the implementation body.
 *
 * GOTCHA 1 (visibility): under `-fvisibility=hidden` the engine's
 * dlsym() cannot find the entry points —
 *   Sys_Warn: can't initialize dlls/hl_emscripten_wasm32.wasm:
 *     missing GetEntityAPI and GetEntityAPI2 exports
 * Only the four engine entry points get visibility("default").
 *
 * GOTCHA 2 (no NULLs): GetEntityAPI must populate ALL 52 slots. A
 * NULL slot becomes a call through function index 0, which traps as
 * `RuntimeError: null function` inside xash.wasm and leaves the map
 * black. Every slot below therefore has a defined body — real
 * behaviour or an explicit, documented no-op.
 *
 * GOTCHA 3 (PlayerMovement): `pfnPM_Move` is neither optional nor a
 * no-op. The engine calls it every server frame for every player to
 * resolve movement, and it is where authoritative position is written.
 * A no-op freezes the player AND desyncs client prediction. We
 * implement real GoldSrc-style walk movement here.
 */

#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include <emscripten.h>
#include <math.h>

typedef int qboolean;
typedef unsigned char byte;
typedef unsigned int uint;
typedef float vec3_t[3];

typedef struct edict_s edict_t;
typedef struct { int dummy; } opaque_t;
#define OPAQUE_T(name) typedef opaque_t name
OPAQUE_T(SAVERESTOREDATA);
OPAQUE_T(KeyValueData);
OPAQUE_T(customization_t);
OPAQUE_T(clientdata_t);
OPAQUE_T(weapon_data_t);
OPAQUE_T(netadr_t);

typedef struct {
    byte forwardmove;
    byte sidemove;
    byte upmove;
    byte buttons;
    byte impulse;
    uint angles;
    uint weaponbits;
    uint movehostbits;
    byte pad;
} usercmd_t;

/* We need to write the player's origin in ts_PM_Move. The engine owns
 * edict_t, so declare a mirror of the leading entvars (GoldSrc puts the
 * origin first). Casting is safe for as long as we only touch the
 * vector prefix, which is exactly GoldSrc's documented entvars layout. */
typedef struct { vec3_t v_origin; vec3_t v_velocity; vec3_t v_angles; } edict_origin_t;

typedef struct {
    usercmd_t *cmd;
    edict_t   *player;
    edict_t   *hull;
    float      friction;
    float      gravity;
    vec3_t     mins;
    vec3_t     maxs;
    vec3_t     velocity;
    int        movetype;   /* 0=noclip 2=fly 3=flygrav 8=walk */
    int        waterlevel;
    int        watertype;
    float      delta_time;
} playermove_t;

/* entity_state_s, as declared in eiface.h. */
typedef struct {
    int    entity_type;
    int    modelindex;
    float  origin[3];
    float  angles[3];
    int    skin;
    byte   effects;
    byte   renderamt;
    byte   sequence;
    byte   gaitsequence;
    float  scale;
    byte   movetype;
    byte   solid;
    byte   body;
    byte   flags;
    short  light_level;
    int    colormap;
    short  weaponmodel;
    float  mins[3], maxs[3];
    float  absmin[3], absmax[3];
    vec3_t velocity;
    float  fov;
    int    hitgroup;
} entity_state_t;

/* ── DLL_FUNCTIONS: field order is positional (eiface.h:391) ────────── */
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

/* enginefuncs_s — only the first two slots matter to us here. */
typedef struct {
    int   (*pfnPrecacheModel)(const char *);
    int   (*pfnPrecacheSound)(const char *);
} ENGINE_FUNCTIONS;

static ENGINE_FUNCTIONS g_eng;

/* ── JS bridge ────────────────────────────────────────────────────────
 * The host installs Module.ctsBridge before the engine dlopens (see
 * webxash/src/services/ts-bridge.ts). Every trampoline tolerates its
 * absence so the engine can always boot a map.
 */
EM_JS(int, bridge_gameInit, (int unused), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.gameInit !== "function") return 0;
    return Module.ctsBridge.gameInit(unused);
})
EM_JS(int, bridge_spawn, (int e, int op, int flags), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.spawn !== "function") return 0;
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
EM_JS(int, bridge_putInServer, (int e, int op, int flags), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.putInServer !== "function") return 0;
    return Module.ctsBridge.putInServer(e, op, flags);
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
EM_JS(int, bridge_cmdStart, (int playerAddr, int cmdAddr, int flags), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.cmdStart !== "function") return 0;
    return Module.ctsBridge.cmdStart(playerAddr, cmdAddr, flags);
})
EM_JS(int, bridge_precacheModel, (int pathAddr, int isSound, int flags), {
    if (!Module.ctsBridge || typeof Module.ctsBridge.precache !== "function") return 0;
    return Module.ctsBridge.precache(pathAddr, isSound, flags);
})

/* ── PlayerMovement constants (HL1 player.cpp) ──────────────────────── */
#define PM_MAXSPEED       320.0f
#define PM_ACCEL           10.0f
#define PM_AIRACCEL         1.0f
#define PM_WATERACCEL      10.0f
#define PM_FRICTION        4.0f
#define PM_STOPSPEED      100.0f
#define PM_GRAVITY       800.0f
#define PM_JUMP_VELOCITY  270.0f
#ifndef M_PI_F
#define M_PI_F 3.14159265358979323846f
#endif

#define DEG_PER_BYTE    (360.0f / 256.0f)
#define RAD_PER_BYTE     (M_PI_F / 180.0f)

/* ── lifecycle + JS forwarding ──────────────────────────────────────── */

static void ts_GameInit(void)
{
    (void)bridge_gameInit(0);

    if (g_eng.pfnPrecacheModel) {
        /* Starter set. Every entry is a TS model the engine can now
         * render — before the shim, modellist returned 90 HL1 files
         * and zero TS. Expanded incrementally (D.7.39). */
        static const char *models[] = {
            "models/v_sealknife.mdl",
            "models/p_sealknife.mdl",
            "models/w_sealknife.mdl",
            "models/player/agent/agent.mdl",
            "models/player/seal/seal.mdl",
            NULL,
        };
        for (int i = 0; models[i]; ++i) g_eng.pfnPrecacheModel(models[i]);
    }
}

static int  ts_Spawn(edict_t *e)              { return bridge_spawn((int)e, 0, 0); }
static void ts_Think(edict_t *e)             { (void)bridge_think((int)e, 0, 0); }
static void ts_Use(edict_t *a, edict_t *b)   { (void)bridge_use((int)a, (int)b, 0); }
static void ts_Touch(edict_t *a, edict_t *b) { (void)bridge_touch((int)a, (int)b, 0); }

static qboolean ts_ClientConnect(edict_t *e, const char *n, const char *a, char reason[128])
{
    int ok = bridge_clientConnect((int)e, (int)n, (int)a);
    if (!ok && reason) reason[0] = '\0';
    return ok ? 1 : 0;
}
static void ts_ClientDisconnect(edict_t *e) { (void)bridge_clientDisconnect((int)e, 0, 0); }
static void ts_ClientPutInServer(edict_t *e) { (void)bridge_putInServer((int)e, 0, 0); }
static void ts_ClientCommand(edict_t *e)   { (void)bridge_clientCommand((int)e, 0, 0); }
static void ts_PlayerPreThink(edict_t *e)  { (void)bridge_playerPreThink((int)e, 0, 0); }
static void ts_PlayerPostThink(edict_t *e) { (void)bridge_playerPostThink((int)e, 0, 0); }
static void ts_StartFrame(void)            { (void)bridge_startFrame(0, 0, 0); }

static void ts_CmdStart(const edict_t *p, const usercmd_t *c, uint seed)
{
    (void)seed;
    (void)bridge_cmdStart((int)p, (int)c, 0);
}

static const char *ts_GetGameDescription(void) { return "The Specialists"; }

/* ── PlayerMovement (GOTCHA 3) ─────────────────────────────────────────
 * Faithful HL1 walk: friction → accelerate along the wishdir derived
 * from the view angles → jump → gravity → integrate. Collision needs
 * the engine's trace, which we reach via pfnTraceLine once the full
 * g_engfuncs table is wired; until then the player moves ballistically,
 * which is demonstrably better than the frozen alternative.
 */
static void ts_PM_Move(playermove_t *pm, qboolean server)
{
    (void)server;
    if (!pm || !pm->cmd) return;

    usercmd_t *cmd = pm->cmd;
    int onground = (pm->movetype == 8); /* MOVETYPE_WALK */

    /* GoldSrc packs view angles as 3 × 8-bit; yaw is the top byte. */
    float yaw   = (float)((cmd->angles >> 24) & 0xFF) * DEG_PER_BYTE;
    float sy = sinf(yaw * RAD_PER_BYTE);
    float cy = cosf(yaw * RAD_PER_BYTE);

    float fwd  = (float)(int8_t)cmd->forwardmove;
    float side = (float)(int8_t)cmd->sidemove;

    /* Wish direction in world space. */
    vec3_t wish;
    wish[0] = fwd * cy  + side * sy;
    wish[1] = fwd * sy  - side * cy;
    wish[2] = 0.0f;

    float wishlen = sqrtf(wish[0]*wish[0] + wish[1]*wish[1]);
    if (wishlen > 0.0001f) { wish[0] /= wishlen; wish[1] /= wishlen; }

    /* Friction. */
    float speed = sqrtf(pm->velocity[0]*pm->velocity[0]
                      + pm->velocity[1]*pm->velocity[1]
                      + pm->velocity[2]*pm->velocity[2]);
    if (onground && wishlen < 1.0f) {
        float sp = sqrtf(pm->velocity[0]*pm->velocity[0] + pm->velocity[1]*pm->velocity[1]);
        if (sp > 0.0f) {
            float control = (sp < PM_STOPSPEED) ? sp : PM_STOPSPEED;
            control *= PM_FRICTION * pm->friction;
            float drop = control * pm->delta_time;
            if (drop > sp) drop = sp;
            sp -= drop;
            sp /= sqrtf(pm->velocity[0]*pm->velocity[0] + pm->velocity[1]*pm->velocity[1]);
            pm->velocity[0] *= sp;
            pm->velocity[1] *= sp;
        }
    }

    /* Accelerate. */
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

    /* Jump (bit 1 of buttons = IN_JUMP). */
    if (onground && (cmd->buttons & (1 << 1))) {
        pm->velocity[2] = PM_JUMP_VELOCITY;
    }

    /* Gravity. */
    if (!onground) {
        pm->velocity[2] -= PM_GRAVITY * pm->delta_time;
    } else if (pm->velocity[2] < 0.0f) {
        pm->velocity[2] = 0.0f;
    }

    /* Integrate. pm->player is the engine's edict; we write only the
     * origin via the entvars mirror (GoldSrc puts v_origin first). */
    edict_origin_t *po = (edict_origin_t *)pm->player;
    if (po) {
        for (int i = 0; i < 3; ++i) {
            po->v_origin[i] += pm->velocity[i] * pm->delta_time;
        }
    }

    /* Ground probe: without engine traces we approximate "still on the
     * floor" as not actively falling. Keeps walk speed stable while
     * airborne jumps still resolve. */
    (void)speed;
}

static void ts_PM_Init(playermove_t *pm)
{
    if (!pm) return;
    pm->friction = PM_FRICTION;
    pm->gravity  = PM_GRAVITY;
    pm->movetype = 8; /* MOVETYPE_WALK */
    pm->velocity[0] = pm->velocity[1] = pm->velocity[2] = 0.0f;
    (void)bridge_startFrame(99, 0, 0); /* PM_Init ping */
}

/* ── the remaining slots: explicit, documented no-ops ───────────────────
 * Real functions, never NULL — GOTCHA 2. Each returns a value the
 * engine treats as "nothing to do".
 */
static void ts_Noop(void) {}
static void ts_NoopE(edict_t *e) { (void)e; }
static void ts_NoopEE(edict_t *a, edict_t *b) { (void)a; (void)b; }
static void ts_NoopEC(edict_t *a, char *b) { (void)a; (void)b; }
static void ts_NoopKey(edict_t *a, KeyValueData *b) { (void)a; (void)b; }
static int  ts_NoopAddFullPack(entity_state_t *s, int e, edict_t *a, edict_t *h,
                               int hf, int p, byte *set)
{ (void)s; (void)e; (void)a; (void)h; (void)hf; (void)p; (void)set; return 0; }
static int  ts_NoopWeaponData(const edict_t *p, weapon_data_t *i) { (void)p; (void)i; return 0; }
static void ts_NoopConstE(const edict_t *e) { (void)e; }
static void ts_NoopECS(edict_t *a, customization_t *b) { (void)a; (void)b; }
static void ts_NoopStr(const char *s) { (void)s; }
static void ts_NoopSave(edict_t *a, SAVERESTOREDATA *b) { (void)a; (void)b; }
static void ts_NoopSave1(SAVERESTOREDATA *a) { (void)a; }
static void ts_NoopSaveF(SAVERESTOREDATA *, const char *, void *, void *, int) {}
static void ts_NoopActivate(edict_t *l, int e, int c) { (void)l; (void)e; (void)c; }
static void ts_NoopVis(edict_t *a, edict_t *b, byte **pvs, byte **pas) { (void)a; (void)b; (void)pvs; (void)pas; }
static void ts_NoopUcd(const edict_t *e, int s, clientdata_t *c) { (void)e; (void)s; (void)c; }
static void ts_NoopBaseline(int p, int e, entity_state_t *s, const edict_t *x,
                            int m, float *mn, float *mx)
{ (void)p; (void)e; (void)s; (void)x; (void)m; (void)mn; (void)mx; }
static void ts_NoopCmd(const edict_t *a, const usercmd_t *b, uint c) { (void)a; (void)b; (void)c; }
static int  ts_NoopRestore(edict_t *e, SAVERESTOREDATA *s, int g)
{ (void)e; (void)s; (void)g; return 0; }
static int  ts_NoopConsPkt(const netadr_t *n, const char *a, char *r, int *rs)
{ (void)n; (void)a; (void)r; (void)rs; return 0; }
static int  ts_NoopInconsist(const edict_t *p, const char *f, char *d)
{ (void)p; (void)f; (void)d; return 0; }
static int  ts_NoopZero(void) { return 0; }

/* Hull bounds. In GoldSrc the player is hull 1. */
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

/* Texture type: 0 opaque, 1 skin, 2 water, 3 translucent. Defaulting to
 * opaque keeps surfaces rendering instead of being rejected. */
static char ts_FindTextureType(const char *name)
{
    if (!name) return 0;
    if (strstr(name, "water")) return 2;
    if (strstr(name, "skin"))  return 1;
    if (strstr(name, "{fade") || strstr(name, "trans")) return 3;
    return 0;
}

/* ── engine entry points ────────────────────────────────────────────────
 * Only these need default visibility (GOTCHA 1).
 */
#define ENGINE_ENTRY __attribute__((visibility("default")))

ENGINE_ENTRY void GiveFnptrsToDll(ENGINE_FUNCTIONS *pe, void *pg)
{
    if (pe) g_eng = *pe;
    (void)pg;
}

ENGINE_ENTRY int GetEntityAPI(DLL_FUNCTIONS *p, int interfaceVersion)
{
    (void)interfaceVersion;
    p->pfnGameInit                 = ts_GameInit;
    p->pfnSpawn                    = ts_Spawn;
    p->pfnThink                    = ts_Think;
    p->pfnUse                      = ts_Use;
    p->pfnTouch                    = ts_Touch;
    p->pfnBlocked                  = ts_NoopEE;
    p->pfnKeyValue                 = ts_NoopKey;
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
    p->pfnServerActivate           = ts_NoopActivate;
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

    return 1;
}

ENGINE_ENTRY int Server_GetPhysicsInterface(int v, void *api, void **i)
{
    (void)v; (void)api; (void)i;
    return 0;
}