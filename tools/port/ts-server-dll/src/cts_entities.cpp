// cts_entities.cpp — minimal TS entity spawn stubs.
//
// Why this file exists: the engine calls `SV_GetEntityClass( pszClassName )`
// to look up our WASM's spawn functions for entities defined in the
// loaded map. With nothing registered for ts_* classes, every ts_*
// entity in `ts_lobby.bsp` produces a `No spawn function for "ts_*"`
// engine error and gets freed. The map still loads, but the gameplay
// layer is hollow — pickup weapons, model points, powerups all
// vanish the moment they're spawned.
//
// REGISTERING CLASSES. We use the HLSDK LINK_ENTITY_TO_CLASS macro
// here, which adds our class to the static spawn-function table at
// load time. The engine's lookup is a static-pointer-table walk, so
// registration has to be in DLL-static-init scope — class methods
// registered at constructor time wouldn't be visible.
//
// STUB QUALITY. Each Spawn() does the absolute minimum the engine
// needs: set solid, movetype, and the SV sent a basic notifier. Real
// TS behavior (model collision, ammo stores, etc.) comes later.
// The point today is to make the engine stop throwing errors and to
// give us a proving-ground where we can see PlayerSpawn / InitHUD /
// Think fire because the world actually has state to react to.
//
// WHEN to expand. Once [HS] HS_PLAYER_SPAWN fires in the test
// harness, replace each Spawn() body with the real TS-equivalent
// logic ported from the upstream TS source (D.7.30 work).

#include "extdll.h"
#include "util.h"
#include "cbase.h"

namespace {

// === ts_groundweapon ===
//
// In TS this is a class-specific weapon pickup (desert eagle, mp5,
// knife for Soldiers; shotgun / gauss / etc for other classes).
// We start with a single base-class body that lets the engine
// place the entity without erroring. Once PlayerSpawn dispatches,
// we can specialize by entity quirk (which class can use which
// weapon) per the TS quirk table.
class CCTSGroundWeapon : public CBaseEntity {
public:
    void Spawn(void) override {
        pev->solid = SOLID_NOT;
        pev->movetype = MOVETYPE_NONE;
        // Real TS: pev->model = idx_for_weapon_class(...); pev->skin
        // = class-id; etc. For now we just need the entity to live.
    }
};
LINK_ENTITY_TO_CLASS(ts_groundweapon, CCTSGroundWeapon)

// === ts_powerup ===
//
// TS powerups: super-jump, strength, regen, slowmo-on-kill, etc.
// Spawn handler here is purely a placeholder until we wire the
// actual powerup-type lookup tables. The entity has to exist for
// the engine to finish the world-load pass; gameplay logic can
// layer in later.
class CCTSPowerup : public CBaseEntity {
public:
    void Spawn(void) override {
        pev->solid = SOLID_NOT;
        pev->movetype = MOVETYPE_NONE;
    }
};
LINK_ENTITY_TO_CLASS(ts_powerup, CCTSPowerup)

// === ts_model ===
//
// Generic placeable entity in TS — a model on a map marker (often
// used as decorative, server-side status trackers, etc). Stays as
// invisible placeholder until we have a real model prototype.
class CCTSModel : public CBaseEntity {
public:
    void Spawn(void) override {
        pev->solid = SOLID_NOT;
        pev->movetype = MOVETYPE_NONE;
    }
};
LINK_ENTITY_TO_CLASS(ts_model, CCTSModel)

}  // namespace
