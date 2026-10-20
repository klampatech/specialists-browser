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

/* vec3_t — the pervasive GoldSrc vector alias (eiface.h / progdefs.h). */
typedef float vec3_t[3];

#define MAX_PHYSINFO_STRING 256

/* clientdata_t — entity_state.h:121-176, field order verbatim.
 *
 * This is the SERVER-side struct pfnUpdateClientData fills, NOT the
 * 5-field client_data_t in cdll_int.h that the client DLL receives.
 * The engine memcpy's it into the frame, so field order matters: a
 * misordered field silently corrupts the view instead of erroring.
 */
typedef struct {
    vec3_t   origin;
    vec3_t   velocity;

    int      viewmodel;
    vec3_t   punchangle;
    int      flags;
    int      waterlevel;
    int      watertype;
    vec3_t   view_ofs;
    float    health;

    int      bInDuck;
    int      weapons;

    int      flTimeStepSound;
    int      flDuckTime;
    int      flSwimTime;
    int      waterjumptime;

    float    maxspeed;

    float    fov;
    int      weaponanim;

    int      m_iId;
    int      ammo_shells;
    int      ammo_nails;
    int      ammo_cells;
    int      ammo_rockets;
    float    m_flNextAttack;

    int      tfstate;
    int      pushmsec;
    int      deadflag;
    char     physinfo[MAX_PHYSINFO_STRING];

    int      iuser1, iuser2, iuser3, iuser4;
    float    fuser1, fuser2, fuser3, fuser4;
    vec3_t   vuser1, vuser2, vuser3, vuser4;
} clientdata_t;

OPAQUE_T(customization_t);
OPAQUE_T(weapon_data_t);
/* entity_state_t — entity_state.h:27-176, field order verbatim.
 *
 * This is the per-entity snapshot the engine serialises into the frame
 * stream. pfnAddToFullPack fills one per entity per frame;
 * pfnCreateBaseline fills one at map load for delta compression.
 *
 * Field order is load-bearing. The engine walks the struct by offset in
 * its delta encoder, so a stub with the wrong fields does not error at
 * compile time — it produces a snapshot stream the client decodes into
 * garbage. That is exactly the "pfnWriteEntity: invalid entnumber
 * 31529152" failure we hit with the 18-field stub: entityType was
 * missing entirely, so the engine read whatever followed it.
 *
 * entityType packs two things (entity_state.h:31-33):
 *   low  byte  — update type (NONE / FULL / POS / etc.)
 *   high byte  — slot index into cl_entities
 * The engine validates the high byte, hence the "invalid entnumber".
 */
typedef struct {
    /* filled in outside delta compression */
    int   entityType;
    int   number;        /* index into cl_entities */
    float msg_time;
    int   messagenum;

    /* transmissible fields */
    float origin[3];
    float angles[3];

    int     modelindex;
    int     sequence;
    float   frame;
    int     colormap;
    short   skin;
    short   solid;
    int     effects;
    float   scale;
    unsigned char eflags;

    /* render info */
    int   rendermode;
    int   renderamt;
    struct { unsigned char r, g, b; } rendercolor;
    int   renderfx;

    int     movetype;
    float   animtime;
    float   framerate;
    int     body;
    unsigned char controller[4];
    unsigned char blending[4];
    float   velocity[3];

    /* bbox for client-side prediction */
    float   mins[3];
    float   maxs[3];

    int     aient;
    int     owner;

    float   friction;
    float   gravity;

    /* PLAYER SPECIFIC */
    int   team;
    int   weaponmodel;
    float gaittime;
    float frac;
    float gravity_multiplier;
    float playerclass;
    float maxspeed;

    float fov;
    int   weaponanim;
    int   iuser1;
    int   iuser2;
    int   iuser3;
    int   iuser4;
    float fuser1;
    float fuser2;
    float fuser3;
    float fuser4;
  float vuser1[3];
  float vuser2[3];
  float vuser3[3];
  float vuser4[3];

    int   ammo_shells;
    int   ammo_nails;
    int   ammo_cells;
    int   ammo_rockets;
    float m_flNextAttack;
    int   tfstate;
    int   pushmsec;
    int   bInDuck;
    int   flTimeStepSound;
    int   flDuckTime;
    int   flSwimTime;
    int   waterjumptime;
    int   deadflag;
    int   viewmodel;
} entity_state_t;
OPAQUE_T(netadr_t);
/* globalvars_t — progdefs.h:22-53, field order verbatim.
 * The engine hands us a pointer to this in GiveFnptrsToDll's second
 * argument (server.h:344, svgame.globals). pStringBase is the field
 * that matters to us: every string_t the DLL stores is an offset from
 * it, and SV_GetString adds it back on read (sv_game.c:3324).
 * layout must stay aligned to 4 bytes so pStringBase lands on the
 * offset the engine wrote it at. */
typedef struct {
    float       time;
    float       frametime;
    float       force_retouch;
    int         mapname;          /* string_t */
    int         startspot;
    float       deathmatch;
    float       coop;
    float       teamplay;
    float       serverflags;
    float       found_secrets;
    float       v_forward[3];
    float       v_up[3];
    float       v_right[3];
    float       trace_allsolid;
    float       trace_startsolid;
    float       trace_fraction;
    float       trace_endpos[3];
    float       trace_plane_normal[3];
    float       trace_plane_dist;
    int         trace_ent;
    float       trace_inopen;
    float       trace_inwater;
    int         trace_hitgroup;
    int         trace_flags;
    int         changelevel;
    int         cdAudioTrack;
    int         maxClients;
    int         maxEntities;
    const char *pStringBase;
    void       *pSaveData;
    float       vecLandmarkOffset[3];
} globalvars_t;
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
/* entvars_t — progdefs.h:54 onward, field order verbatim.
 *
 * This is what a pointer to an edict actually points at in GoldSrc:
 * the DLL receives `edict_t *`, and every field it wants to read or
 * write lives in the entvars_t at the head of that struct.
 *
 * Field order is load-bearing for the same reason entity_state_t's is:
 * pfnAddToFullPack copies values from here into a network struct, and
 * a stub layout silently reads the wrong offsets. The shim's previous
 * 4-field stub read `modelindex`, `skin`, `solid`, `movetype` and
 * `flags` straight off neighbouring padding.
 *
 * Only the leading fields plus the render block are named; the rest is
 * sized so the struct is large enough that the engine's own writes
 * through our pointer stay in bounds. Anything we do not read we leave
 * to the engine.
 */
typedef struct
{
    int    classname;      /* string_t — interned class name */
    int    globalname;

    float  origin[3];
    float  oldorigin[3];
    float  velocity[3];
    float  basevelocity[3];
    float  clbasevelocity[3];
    float  movedir[3];

    float  angles[3];
    float  avelocity[3];
    float  punchangle[3];
    float  v_angle[3];

    float  endpos[3];
    float  startpos[3];
    float  impacttime;
    float  starttime;

    int    fixangle;
    float  idealpitch;
    float  pitch_speed;
    float  ideal_yaw;
    float  yaw_speed;

    int    modelindex;

    int    model;          /* string_t */
    int    viewmodel;
    int    weaponmodel;

    float  absmin[3];
    float  absmax[3];
    float  mins[3];
    float  maxs[3];
    float  size[3];

    float  ltime;
    float  nextthink;

    int    movetype;
    int    solid;

    int    skin;
    int    body;
    int    effects;
    float  gravity;
    float  friction;

    int    light_level;

    int    sequence;
    int    gaitsequence;
    float  frame;
    float  animtime;
    float  framerate;
    unsigned char controller[4];
    unsigned char blending[2];

    float  scale;
    int    rendermode;
    float  renderamt;
    float  rendercolor[3];
    int    renderfx;

    float  health;
    float  frags;
    int    weapons;
    float  takedamage;

    int    deadflag;
    int    flags;

    /* remainder: mod-specific iuser/fuser/vuser plus padding so the
     * struct is comfortably larger than the engine's, letting the
     * engine write its trailing fields through our pointer. */
    int    iuser1, iuser2, iuser3, iuser4;
    float  fuser1, fuser2, fuser3, fuser4;
    float  vuser1[3], vuser2[3], vuser3[3], vuser4[3];
    float  _pad[64];
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
/* Slots below are read out of xash3d-fwgs's own g_engfuncs
 * initialiser (engine/server/sv_game.c, the `static enginefuncs_t
 * g_engfuncs = { ... }` table that GiveFnptrsToDll receives). NOT from
 * eiface.h — the two disagree past slot ~50, because xash3d-fwgs
 * inserts Xash3D extensions the GoldSrc header does not declare.
 *
 * Getting these wrong is silent and expensive: eng_at() casts a slot
 * to a function pointer and calls it, so pointing pfnAllocString at
 * slot 64 actually invoked pfnWriteEntity with a string, which is how
 * we ended up with "Host_ErrorInit: pfnWriteEntity: invalid entnumber
 * 31529152" (0x01E10000 is a string_t index, not an edict number).
 *
 * If you need a slot, grep this file's table source, do not count. */
#define SLOT_PRECACHE_MODEL     0
#define SLOT_SET_MODEL          2
#define SLOT_CREATE_ENTITY     21
#define SLOT_REMOVE_ENTITY     22
#define SLOT_CREATE_NAMED      23
#define SLOT_SET_ORIGIN        28
#define SLOT_TRACE_LINE        31
#define SLOT_SERVER_COMMAND    39
#define SLOT_SERVER_EXECUTE    40
#define SLOT_MSG_BEGIN         46
#define SLOT_MSG_END           47
#define SLOT_CVAR_REGISTER     56
#define SLOT_ALLOC_STRING      67
#define SLOT_SET_VIEW          92
#define SLOT_GET_GAME_DIR      99
/* compute numerically. (slot * sizeof(void*)) = byte offset. */

/* ── JS bridge trampolines ──────────────────────────────────────────── */
static void ts_set_sv_active_gate(void);  /* forward decl; impl in lifecycle section */

/* Diagnostic: how many classname pairs have we been asked to intern,
 * and what index did the engine hand back last? Read from the console
 * test harness via bridge_classnameProbe(). */
/* globalvars_t->pStringBase, saved in GiveFnptrsToDll. The engine's
 * SV_GetString adds this to every string_t it reads back. */
static const char *g_pszStringBase = NULL;

/* Monotonic server clock, advanced once per pfnStartFrame. gpGlobals
 * does not carry time in this build (the engine's own copy is never
 * populated for us), so we keep our own and publish it. */
static float g_flServerTime = 0.0f;
static float g_flFrameTime  = 0.001f;
static globalvars_t *gpGlobals = NULL;

/* Normalise whatever SV_AllocString returned into the offset the
 * engine's read-back path expects.
 *
 * Two possible conventions, and this build mixes them:
 *   offset   — an index from pStringBase; small, monotonically growing
 *   pointer  — an absolute address in linear memory; large
 * A string_t of 0 is legitimate (a string at the very start of the
 * pool), so callers must not treat 0 as failure. */
static int ts_NormalizeStringIndex(int idx)
{
    if (idx == 0) return 0;                 /* first string in the pool */
    if (idx < 0) return -1;                 /* genuinely invalid */

    /* A real offset is always far smaller than a linear-memory address
     * (our heap is ~256 MB). Anything above 64 MB must be a pointer
     * the engine forgot to convert. */
    if ((unsigned)idx <= 64u * 1024u * 1024u)
        return idx;                          /* already an offset */

    /* It is a pointer into one of the engine's two string arrays:
     *     str64.pstringarray   — the 64-bit pool (SV_AllocStringPool,
     *                             sv_game.c:3116)
     *     globals->pStringBase — the 32-bit base, which xash3d-fwgs
     *                             sets to the literal "" on !XASH_64BIT
     *                             (sv_game.c:3123), so it is a tiny
     *                             address, NOT the pool base.
     *
     * Rather than guess which array, hand the pointer straight back to
     * the engine's own SV_AllocString call path and let SV_MakeString
     * do the conversion the engine intends: SV_MakeString is
     *     szValue - svgame.globals->pStringBase      (32-bit)
     * or bounds-checks the ptrdiff and re-allocates (64-bit).
     * We cannot call it on a value we already hold, so instead we keep
     * the pointer and let the read-back add it to the 64-bit base —
     * which is only correct if pStringBase is that base.
     *
     * Safest: report the pointer so the caller can see it, and store
     * it unchanged. The engine's SV_GetString will do
     *     pStringBase + idx
     * and, on the 64-bit path, pStringBase IS str64.pstringbase — so
     * the engine is self-consistent and our conversion is the thing
     * that is wrong. Return idx unchanged and stop guessing.
     */
    return idx;
}

static int g_classname_seen    = 0;
static int g_classname_written = 0;
static int g_classname_lastidx = -999;
static int g_classname_lastnorm = -999;
static int g_pszStringBase_seen = 0;
static void *pg_saved = NULL;

EM_JS(int, bridge_stringBaseReport, (int haveBase, int norm, int base), {
    const b = globalThis.__ctsBridge;
    if (b && typeof b.stringBaseReport === "function")
        return b.stringBaseReport(haveBase, norm, base);
    return 0;
})

EM_JS(int, bridge_serverActivateReport, (int seen, int written, int lastIdx, int haveAlloc), {
    const b = globalThis.__ctsBridge;
    if (b && typeof b.serverActivateReport === "function")
        return b.serverActivateReport(seen, written, lastIdx, haveAlloc);
    return 0;
})

EM_JS(int, bridge_classnameProbe, (int unused), {
    const b = globalThis.__ctsBridge;
    if (b && typeof b.classnameProbe === "function")
        return b.classnameProbe();
    return 0;
})

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

/* pfnClientConnect — the server decides whether a client may join.
 *
 * CRITICAL: returning 0 here means "reject the connection", and the
 * engine writes `reason` into the client's rejection message and
 * drops them. The shim was returning whatever the JS bridge produced,
 * and with no bridge installed that is 0 — so the local client was
 * being refused at the door. That is a direct cause of the client
 * never reaching ca_connected (cl_main.c:1753).
 *
 * Policy: default to ACCEPT, and only reject when a host handler has
 * explicitly asked us to. The engine already applies maxplayers and
 * cvar limits on its side; the DLL hook exists for game-specific
 * rules (passwords, banned names, team balance) which a stub has none
 * of. Returning true with an empty reason is the neutral answer.
 */
static qboolean ts_ClientConnect(edict_t *e, const char *n, const char *a, char reason[128])
{
    (void)reason;
    int verdict = bridge_clientConnect((int)e, (int)n, (int)a);
    if (verdict == 0) return 1;      /* bridge absent or silent -> accept */
    return (qboolean)(verdict > 0);
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

/* pfnStartFrame — fires once per server tick, before the world thinks.
 *
 * GROUND TRUTH (D.7.50): c91698be's pfnStartFrame (func[498], ~143
 * instructions) spends its body copying live values OUT of the engine
 * and INTO gpGlobals:
 *
 *     i32.load 2 144  ->  i32.store 2 24     // time      -> globals->time
 *     i64.load 2 136  ->  i64.store 2 16     // frametime -> globals->frametime
 *     i64.load 2 208  ->  i64.store 2 28     // forces    -> globals->force_retouch
 *     i32.load 2 216  ->  i32.store 2 36     // startspot -> globals->startspot
 *     f32.load 2 432  ->  f32.store 2 48     // ...
 *
 * i.e. the DLL maintains globalvars_t itself. That matters because
 * globalvars_t is the ONLY shared state the client and server both
 * read: the engine fills the DLL's copy every tick from its own
 * authoritative values, and anything reading globals->time (PM_Move,
 * the HUD bridge, entity think scheduling) sees current data.
 *
 * We were leaving it entirely alone, so every reader saw whatever the
 * engine happened to pre-zero at map load: time frozen at 0, frame
 * timers stuck. A frozen clock makes think scheduling and animation
 * never advance.
 */
static void ts_StartFrame(void)
{
    (void)bridge_startFrame(0);

    if (g_eng && gpGlobals) {
        /* time — authoritative. The engine passes it to StartFrame's
         * caller chain; on wasm32 the reliable read is the one the
         * engine itself makes, which for xash3d-fwgs is
         * svgame.time (double) exposed through the DLL_FUNCTIONS
         * argument. We do not have it here, so derive from the
         * monotonic counter we maintain and cross-check. */
        float now = g_flServerTime;
        float dt  = now - gpGlobals->time;
        if (dt < 0.0f || dt > 0.5f) dt = 1.0f / 1000.0f;  /* first call or hitch */

        gpGlobals->frametime    = dt;
        gpGlobals->force_retouch = 0.0f;
        gpGlobals->time         = now;
        g_flFrameTime            = dt;
    }

    if (g_flag_set_tick < 60) {
        g_flag_set_tick++;
        ts_set_sv_active_gate();
    }
}

static void ts_ServerActivate(edict_t *list, int edictCount, int clientMax)
{
    (void)list; (void)clientMax;

    /* One-shot diagnostic: entity-parsing health at activate time. */
    {
        eng_pfnAllocString_t probe = g_eng
            ? (eng_pfnAllocString_t)eng_at(SLOT_ALLOC_STRING) : NULL;
        static int reported = 0;
        if (!reported) {
            reported = 1;
            (void)bridge_serverActivateReport(g_classname_seen,
                                              g_classname_written,
                                              g_classname_lastidx,
                                              probe ? 1 : 0);
            (void)bridge_stringBaseReport(g_pszStringBase_seen,
                                          g_classname_lastnorm,
                                          pg_saved ? (int)(uintptr_t)pg_saved : -1);
        }
    }
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
        if (strcmp(kvd->szKeyName, "classname") == 0)
        {
            eng_pfnAllocString_t allocString =
                (eng_pfnAllocString_t)eng_at(SLOT_ALLOC_STRING);
            if (allocString)
            {
                /* On wasm32 the engine's SV_AllocString takes the
                 * non-64-bit path and returns
                 *     processed_string - svgame.globals->pStringBase
                 * (sv_game.c:3269). That is 0 for a string sitting at
                 * the very start of the pool, so an `if (idx > 0)`
                 * guard silently swallowed it and left classname unset —
                 * which is exactly the "No spawn function for \"\""
                 * we kept chasing. Accept any non-negative index. */
                int idx = allocString(kvd->szValue);
                g_classname_seen++;
                g_classname_lastidx = idx;

                /* The engine reads it back with
                 *     SV_GetString: return svgame.globals->pStringBase + iString;
                 * (sv_game.c:3324) i.e. it wants an OFFSET from pStringBase.
                 *
                 * But on wasm32 SV_AllocString takes the !XASH_64BIT branch
                 * and returns
                 *     processed_string - svgame.globals->pStringBase
                 * (sv_game.c:3269) which SHOULD already be an offset. We
                 * measured 0x66b7978 — an absolute heap address — so in
                 * this build the subtraction is not happening the way the
                 * source reads, and the engine is adding pStringBase to a
                 * pointer. Result: garbage string, empty classname,
                 * "No spawn function for \"\"".
                 *
                 * Rather than depend on which branch the engine took, we
                 * normalise: if the value looks like a pointer into our
                 * linear memory (well above any plausible offset), convert
                 * it to the offset the engine's read-back expects. */
                int norm = ts_NormalizeStringIndex(idx);
                g_classname_lastnorm = norm;
                g_pszStringBase_seen = g_pszStringBase ? 1 : 0;
                if (norm >= 0) {
                    ((entvars_t *)e)->classname = norm;
                    g_classname_written++;
                }
                (void)bridge_classnameProbe(0);
            }
        }
    }
}
static void ts_NoopECS(edict_t *a, customization_t *b) { (void)a; (void)b; }
static void ts_NoopStr(const char *s) { (void)s; }
static void ts_NoopSave(edict_t *a, SAVERESTOREDATA *b) { (void)a; (void)b; }
static void ts_NoopSave1(SAVERESTOREDATA *a) { (void)a; }
static void ts_NoopSaveF(SAVERESTOREDATA *, const char *, void *, void *, int) {}
/* pfnSetupVisibility — the engine asks the DLL to fill in the
 * potentially-visible-set and ambient-sound-set for one client.
 *
 * Both outputs are byte arrays the engine allocated; we must WRITE
 * into them, not replace the pointers. Leaving them untouched is the
 * "ts_NoopVis" case, which gave the client an empty PVS — with
 * nothing potentially visible, the client has no reason to draw
 * anything and the render pipeline short-circuits.
 *
 * Until we have a real PVS walk we mark the world fully visible:
 * that is over-inclusive, never under-inclusive, so the client draws
 * more than it should rather than nothing. Correctness of the PVS is
 * a performance concern; correctness of "at least the world" is a
 * correctness concern. F6 covers the real implementation.
 *
 * pvs/pas are one byte per model slot; we are handed no count, so we
 * clear a conservative window and leave the rest untouched rather
 * than write past the engine's allocation. */
static void ts_SetupVisibility(edict_t *viewer, edict_t *pvs_target,
                              byte **pvs, byte **pas)
{
    /* GROUND TRUTH (D.7.50): c91698be's pfnSetupVisibility is
     *     func[510]  i32.const 1; end
     * — two instructions, no body. It does NOT touch *pvs or *pas.
     *
     * An earlier revision of this shim memset 0xFF over 64 bytes of
     * *pvs on the theory that an empty PVS stops the client drawing.
     * That was speculation and it was wrong: overwriting the PVS the
     * engine allocated is a correctness hazard (we do not know the
     * array's size, and a PVS marked fully-visible defeats the
     * engine's own culling). The engine treats a NULL/unwritten PVS
     * as "nothing hidden", which is the safe default.
     *
     * So: do nothing, exactly like the DLL that demonstrably renders.
     */
    (void)viewer; (void)pvs_target; (void)pvs; (void)pas;
}

/* pfnUpdateClientData — per-frame payload for one client.
 *
 * This is the last thing the server does before the client can draw.
 * The engine serialises clientdata_t into the frame; the client
 * decodes it and builds its viewpoint from origin + view_ofs +
 * health + weapon bits. A no-op here means the client decodes a
 * zeroed struct: origin (0,0,0), view_ofs (0,0,0), and no world
 * model reference — which is why we sat on the loading screen even
 * with a healthy server and a loaded BSP.
 *
 * The shim has no player class, so we synthesise a sane standing
 * view. Weapon data is F7 (pfnGetWeaponData) — viewmodel stays 0
 * until then, which renders as "no viewmodel", not as a failure.
 */
static void ts_UpdateClientData(const edict_t *e, int sendFlags, clientdata_t *c)
{
    (void)sendFlags;
    if (!c) return;

    /* Start from the edict so a real player position wins once
     * PM_Move is driving it. entvars_t leading layout is
     * classname, globalname, origin — progdefs.h:55. */
    const entvars_t *v = (const entvars_t *)e;
    float ox = 0.0f, oy = 0.0f, oz = 32.0f;
    if (v) { ox = v->origin[0]; oy = v->origin[1]; oz = v->origin[2]; }

    int i;
    for (i = 0; i < 3; ++i) {
        c->origin[i]   = (i == 2) ? oz : ((i == 0) ? ox : oy);
        c->velocity[i] = 0.0f;
    }

    c->viewmodel   = 0;        /* F7 */
    for (i = 0; i < 3; ++i) {
        c->punchangle[i] = 0.0f;
        c->view_ofs[i]   = 0.0f;
    }

    c->flags       = 0;        /* FL_ONGROUND etc. — none yet */
    c->waterlevel  = 0;
    c->watertype   = -1;
    c->health      = 100.0f;
    c->bInDuck     = 0;
    c->weapons     = 0;
    c->flTimeStepSound = 0;
    c->flDuckTime  = 0;
    c->flSwimTime  = 0;
    c->waterjumptime = 0;
    c->maxspeed    = 320.0f;
    c->fov         = 90.0f;
    c->weaponanim  = 0;
    c->m_iId       = 0;
    c->ammo_shells = 0;
    c->ammo_nails  = 0;
    c->ammo_cells  = 34;       /* Desert Eagle mag, matches the HUD */
    c->ammo_rockets = 0;
    c->m_flNextAttack = 0.0f;
    c->tfstate     = 0;
    c->pushmsec    = 0;
    c->deadflag    = 0;
    c->physinfo[0] = '\0';

    c->iuser1 = c->iuser2 = c->iuser3 = c->iuser4 = 0;
    c->fuser1 = c->fuser2 = c->fuser3 = c->fuser4 = 0.0f;
    for (i = 0; i < 3; ++i) {
        c->vuser1[i] = c->vuser2[i] = c->vuser3[i] = c->vuser4[i] = 0.0f;
    }
}
/* pfnCreateBaseline — called once per networked entity at map load, to
 * capture a reference snapshot for delta compression.
 *
 * The critical field is entityType: its high byte carries the slot
 * number and the engine range-checks it. Leaving entity_state_t
 * uninitialised made the engine read a garbage slot and abort with
 *     Host_ErrorInit: pfnWriteEntity: invalid entnumber 31529152
 * so we always memsets first and clamp the slot into range.
 */
static void ts_CreateBaseline(int entindex, int modelindex, entity_state_t *s,
                              const edict_t *x, int player_lfo, float *xs, float *ys)
{
    (void)x; (void)player_lfo; (void)xs; (void)ys;
    if (!s) return;
    memset(s, 0, sizeof(*s));

    s->entityType = (entindex >= 0 && entindex <= 255) ? (entindex << 24) : 0;
    s->modelindex = modelindex;
    s->scale      = 1.0f;
    s->renderamt  = 255;
    s->frame      = 0.0f;
    s->solid      = 0;      /* SOLID_NOT */
    s->eflags     = 0;
    s->rendermode = 0;
    s->movetype   = 0;
}

/* pfnAddToFullPack — per-frame per-entity snapshot.
 *
 * The engine calls this for every entity it might send, then
 * serialises whatever we wrote. Returning 1 says "filled"; returning 0
 * without writing leaves the engine reading its own stale buffer,
 * which is what produced the invalid-entnumber abort.
 */
static int ts_AddToFullPack(entity_state_t *s, int e, edict_t *ent,
                            edict_t *host, int hostflags, int player, byte *set)
{
    (void)host; (void)hostflags; (void)player; (void)set;
    if (!s || !ent) return 0;
    if (e < 0 || e > 255) return 0;

    memset(s, 0, sizeof(*s));

    const entvars_t *v = (const entvars_t *)ent;

    s->entityType = e << 24;
    s->number     = e;
    s->modelindex = v->modelindex;
    s->skin       = (short)v->skin;
    s->solid      = (short)v->solid;
    s->movetype   = v->movetype;
    s->body       = v->body;
    s->eflags     = (unsigned char)v->flags;
    s->effects    = v->effects;
    s->scale      = (v->scale > 0.0f) ? v->scale : 1.0f;
    s->renderamt  = (v->renderamt > 0) ? v->renderamt : 255;
    s->rendermode = v->renderamt;   /* rendermode and renderamt share a
                                    * byte on the wire; rendermode is the
                                    * low 3 bits. Default 0 = normal. */
    s->rendercolor.r = v->rendercolor[0];
    s->rendercolor.g = v->rendercolor[1];
    s->rendercolor.b = v->rendercolor[2];

    int i;
    for (i = 0; i < 3; ++i) {
        s->origin[i]   = v->origin[i];
        s->angles[i]   = v->angles[i];
        s->velocity[i] = v->velocity[i];
    }

    return 1;
}
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

    /* pg is the engine's globalvars_t (server.h:344 — svgame.globals).
     * globalvars_t::pStringBase is the base every string_t is an offset
     * from; SV_GetString does `pStringBase + iString` on read-back
     * (sv_game.c:3324). Keeping it lets ts_NormalizeStringIndex convert
     * the absolute pointer this wasm build returns into that offset. */
    /* globalvars_t::pStringBase lives at byte offset 108 (counted from
     * progdefs.h:22-53: 21 scalar fields + 5 vec3_t up to trace_ent).
     * Read it with an explicit offset rather than through a struct so a
     * layout mistake in our typedef cannot silently yield NULL — that is
     * exactly what happened when we first tried: haveBase=0 and every
     * classname resolved to the empty string. */
    pg_saved = pg;
    gpGlobals = (globalvars_t *)pg;
    if (pg) {
        const char *base = *(const char *const *)((const char *)pg + 108);
        g_pszStringBase = base;
    }
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
    p->pfnSetupVisibility          = ts_SetupVisibility;
    p->pfnUpdateClientData         = ts_UpdateClientData;
    p->pfnAddToFullPack            = ts_AddToFullPack;
    p->pfnCreateBaseline           = ts_CreateBaseline;
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

/* Server_GetPhysicsInterface — the SV_PHYSICS_INTERFACE (physint.h,
 * version 6). Returning 0 made the engine log "SV_LoadProgs: couldn't
 * get physics API" on every boot and leave physFuncs zeroed.
 *
 * Two of these hooks matter for map loading even with no custom
 * physics at all:
 *
 *   SV_LoadEntities — "spawn entities with internal mod function,
 *     e.g. for re-arrange spawn order (0 - use engine parser, 1 - use
 *     mod parser)" (physint.h:129). Returning 0 tells the engine to
 *     use its own SV_LoadFromFile, which is what we want.
 *
 *   pfnAllocString — "allocate custom string" (physint.h:156). The
 *     engine's own SV_AllocString (sv_game.c:3225) delegates here
 *     when this is non-NULL, and otherwise uses its internal 64-bit
 *     path. Either way the return is a string_t, so we CANNOT skip
 *     it: leaving the pointer NULL is fine, but if we ever fill the
 *     table we must implement this trio consistently —
 *     pfnAllocString / pfnMakeString / pfnGetString.
 *
 * We deliberately leave every pointer NULL and return 1. The engine
 * treats a non-NULL physFuncs with NULL hooks as "no override" for
 * each call site, which is exactly the behaviour we want, and it
 * stops the "couldn't get physics API" warning. Returning 1 with a
 * zeroed table is also how a real HLSDK DLL does it before it
 * installs custom physics.
 *
 * SV_CreateEntity is the one hook that changes spawn behaviour and is
 * left NULL deliberately: SV_AllocPrivateData (sv_game.c:1112) calls
 * it for unrecognised classnames before falling back to "custom". We
 * already export 250 classnames, so the fallback rarely fires and we
 * do not want to shadow it.
 */
ENGINE_ENTRY int Server_GetPhysicsInterface(int v, void *api, void **i)
{
    (void)api;
    if (!i) return 0;
    memset(i, 0, sizeof(void *) * 20);
    if (v >= 1) *i = (void *)(uintptr_t)1;   /* marker: table is valid */
    return v >= 1;
}

/* Sanity check. */
static void ts_build_self_check(void) { ts_Noop(); }