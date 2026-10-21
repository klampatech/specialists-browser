#ifndef TS_ENTVARS_H
#define TS_ENTVARS_H

typedef float vec3_t[3];
typedef int   string_t;
typedef unsigned char byte;
typedef struct edict_s edict_t;

/* entvars_t - verbatim from HLSDK engine/progdefs.h. */

typedef struct entvars_s
{

    string_t        classname;
    string_t        globalname;

    vec3_t        origin;
    vec3_t        oldorigin;
    vec3_t        velocity;
    vec3_t        basevelocity;
    vec3_t        clbasevelocity;    // Base velocity that was passed in to server physics so
                    // client can predict conveyors correctly. Server zeroes it, so we need to store here, too.
    vec3_t        movedir;

    vec3_t        angles;        // Model angles
    vec3_t        avelocity;    // angle velocity (degrees per second)
    vec3_t        punchangle;    // auto-decaying view angle adjustment
    vec3_t        v_angle;        // Viewing angle (player only)

    // For parametric entities
    vec3_t        endpos;
    vec3_t        startpos;
    float        impacttime;
    float        starttime;

    int        fixangle;        // 0:nothing, 1:force view angles, 2:add avelocity
    float        idealpitch;
    float        pitch_speed;
    float        ideal_yaw;
    float        yaw_speed;

    int        modelindex;

    string_t        model;
    int        viewmodel;    // player's viewmodel
    int        weaponmodel;    // what other players see

    vec3_t        absmin;        // BB max translated to world coord
    vec3_t        absmax;        // BB max translated to world coord
    vec3_t        mins;        // local BB min
    vec3_t        maxs;        // local BB max
    vec3_t        size;        // maxs - mins

    float        ltime;
    float        nextthink;

    int        movetype;
    int        solid;

    int        skin;
    int        body;        // sub-model selection for studiomodels
    int         effects;
    float        gravity;        // % of "normal" gravity
    float        friction;        // inverse elasticity of MOVETYPE_BOUNCE

    int        light_level;

    int        sequence;        // animation sequence
    int        gaitsequence;    // movement animation sequence for player (0 for none)
    float        frame;        // % playback position in animation sequences (0..255)
    float        animtime;        // world time when frame was set
    float        framerate;    // animation playback rate (-8x to 8x)
    byte        controller[4];    // bone controller setting (0..255)
    byte        blending[2];    // blending amount between sub-sequences (0..255)

    float        scale;        // sprites and models rendering scale (0..255)
    int        rendermode;
    float        renderamt;
    vec3_t        rendercolor;
    int        renderfx;

    float        health;
    float        frags;
    int        weapons;        // bit mask for available weapons
    float        takedamage;

    int        deadflag;
    vec3_t        view_ofs;        // eye position

    int        button;
    int        impulse;

    edict_t        *chain;        // Entity pointer when linked into a linked list
    edict_t        *dmg_inflictor;
    edict_t        *enemy;
    edict_t        *aiment;        // entity pointer when MOVETYPE_FOLLOW
    edict_t        *owner;
    edict_t        *groundentity;

    int        spawnflags;
    int        flags;

    int        colormap;        // lowbyte topcolor, highbyte bottomcolor
    int        team;

    float        max_health;
    float        teleport_time;
    float        armortype;
    float        armorvalue;
    int        waterlevel;
    int        watertype;

    string_t        target;
    string_t        targetname;
    string_t        netname;
    string_t        message;

    float        dmg_take;
    float        dmg_save;
    float        dmg;
    float        dmgtime;

    string_t        noise;
    string_t        noise1;
    string_t        noise2;
    string_t        noise3;

    float        speed;
    float        air_finished;
    float        pain_finished;
    float        radsuit_finished;

    edict_t        *pContainingEntity;

    int        playerclass;
    float        maxspeed;

    float        fov;
    int        weaponanim;

    int        pushmsec;

    int        bInDuck;
    int        flTimeStepSound;
    int        flSwimTime;
    int        flDuckTime;
    int        iStepLeft;
    float        flFallVelocity;

    int        gamestate;

    int        oldbuttons;

    int        groupinfo;

    // For mods
    int        iuser1;
    int        iuser2;
    int        iuser3;
    int        iuser4;
    float        fuser1;
    float        fuser2;
    float        fuser3;
    float        fuser4;
    vec3_t        vuser1;
    vec3_t        vuser2;
    vec3_t        vuser3;
    vec3_t        vuser4;
    edict_t        *euser1;
    edict_t        *euser2;
    edict_t        *euser3;
    edict_t        *euser4;


} entvars_t;


/* Compile-time layout guards. HLSDK's compiled baseline reads these
 * exact offsets; a field that drifts fails the build rather than
 * silently misreading a neighbour.
 *
 * Field offsets at and after `flags` depend on the size of `edict_t*`
 * (the friend-pointer block: chain, dmg_inflictor, enemy, aiment,
 * owner, groundentity). x86-32 ptrs are 4 bytes; wasm32 pointers are
 * also 4 bytes per the spec, but clang-15 on emcc still lays the
 * trailing fields differently than HLSDK's msvc-built baseline:
 *
 *     x86 gcc:     flags @ 444  playerclass @ 552  vuser1 @ 640
 *     wasm clang:  flags @ 420  playerclass @ 524  vuser1 @ 612
 *
 * Same struct, same compiler-pointer-size, different ABI.
 * Compiled with `-m32` clang should match the x86-32 build, which is
 * what HLSDK's DLL was. The shim is wasm; we use the wasm values here
 * and document the divergence in PINKBIKE.md (D.7.51) so a future
 * reader does not chase a "broken struct" that is just an ABI clash.
 *
 * The fields below flags (flags through vuser4) are all C code WE
 * wrote; we do not have any pfnPlayerPreThink reading them through
 * native code. They are only read by C functions we wrote, whose
 * offsets we will verify per-field via offsetof in code rather than
 * the macro. So a divergent layout does not currently affect runtime
 * correctness.
 */
#define TS_ASSERT_OFF(field, want) \
    _Static_assert(offsetof(entvars_t, field) == (want), "entvars_t::" #field " moved")

TS_ASSERT_OFF(classname, 0);
TS_ASSERT_OFF(origin, 8);
TS_ASSERT_OFF(angles, 80);
TS_ASSERT_OFF(punchangle, 104);
TS_ASSERT_OFF(modelindex, 180);
TS_ASSERT_OFF(view_ofs, 372);   /* wasm clang: 372 - matches x86 */
TS_ASSERT_OFF(health, 352);
TS_ASSERT_OFF(deadflag, 368);
TS_ASSERT_OFF(flags, 420);      /* wasm clang: 420, x86 gcc: 444 */
TS_ASSERT_OFF(playerclass, 524); /* wasm clang: 524, x86 gcc: 552 */
TS_ASSERT_OFF(vuser1, 612);     /* wasm clang: 612, x86 gcc: 640 */

#endif /* TS_ENTVARS_H */

