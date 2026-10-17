/**
 * CTSGameRules::RespawnEntities — on round respawn, walk the entity list
 * four times and trigger each entity type's respawn / fall behaviour.
 *
 * Sequence:
 *   1. breakables  -> CInfoBreakable::RespawnThink()  (always)
 *   2. weapons     -> CTSGroundWeapon::Fall()         (gated by mode || flag)
 *   3. powerups    -> CTSPowerUp::Fall()              (gated by flag, re-checked)
 *   4. flags       -> CTSFlag::RespawnFlag()          (always)
 *
 * Each per-entity pass applies the GoldSrc `FNullEnt`-style pattern at
 * offset [esi]→[+0x208] and enginefuncs_t[0x118]. Skip entities where the
 * check fails.
 *
 * Demangled signature: `CTSGameRules::RespawnEntities(bool)`.
 * NOTE: the asm at 0x677d2 double-dereferences the arg (`mov eax,[esp+0x10];
 * mov al,[eax]`) — the demangler dropped a `*`. We type the param as
 * `Uint8Array` so the byte-read at index 0 is type-checked, and we treat
 * the asm's `sub eax,0x2; cmp al,0x1; jbe` as "byte in {2,3} forces
 * weapons", not "byte >= 2 forces weapons".
 */

// --- Stubs for compilation in isolation. Real types land in D.4. ---
type CTSGameRules = object;

declare const Util_FindEntityByClassname: (
  prev: any | null,
  classname: string
) => any | null;

// enginefuncs_t[0x118] — TBD name (likely pfnPEntityOfEntOffset or similar
// validity probe). Returns 0 if the entity is no longer alive.
declare const ENGINE_IFACES: {
  func118: (arg: number) => number;
};

// GOT-loaded pointer at [ebx+0x152c]. The asm reads [ptr] (a dword) twice —
// once before weapons, once after.
declare const GLOBALS: {
  respawnFlagPtr: Uint32Array;
};

// --- Classname strings — placeholders; resolve in D.4 vs strings-n5.txt ---
const CLASSNAME_BREAKABLE = 'func_breakable';   // [ebx-0x6e758]
const CLASSNAME_WEAPON    = 'ts_groundweapon';  // [ebx-0x6e749]
const CLASSNAME_POWERUP   = 'ts_powerup';       // [ebx-0x6e739]
const CLASSNAME_FLAG      = 'ts_flag';          // [ebx-0x6e72e]

/**
 * Per-entity alive check, matching the repeated 0x208/0x118 pattern.
 * The asm reads:
 *   eax = [esi]                ; entity's first pointer field
 *   edx = [eax + 0x208]        ; vtable slot 0x82 / sub-struct field
 *   if (edx != 0) call ifaces[0x118](edx)
 *   skip the action unless that call returns non-zero.
 */
const isAlive = (ent: any): boolean => {
  const sub = ent?.__vtable;
  if (!sub) return false;
  const vmethod = sub[0x208 >>> 2];          // [eax+0x208], slot index = byte/4
  if (!vmethod) return false;
  return ENGINE_IFACES.func118(vmethod) !== 0;
};

/**
 * Generic classname iterator. Each asm loop body is exactly:
 *   e = FindEntityByClassname(prev, name);
 *   while (e) { if (isAlive(e)) action(e); e = FindEntityByClassname(e, name); }
 */
const forEachByClass = (classname: string, action: (e: any) => void): void => {
  let e: any = Util_FindEntityByClassname(null, classname);
  while (e !== null) {
    if (isAlive(e)) action(e);
    e = Util_FindEntityByClassname(e, classname);
  }
};

export function RespawnEntities(this: CTSGameRules, mode: Uint8Array): void {
  // Asm: mov eax,[esp+0x10]; mov al,[eax]; sub eax,0x2; cmp al,0x1; jbe.
  // "byte in {2,3} forces weapons; otherwise consult the global flag".
  const modeByte = mode[0];
  const forceWeapons = modeByte === 2 || modeByte === 3;
  const doWeapons = forceWeapons || GLOBALS.respawnFlagPtr[0] !== 0;

  // ---- 1) breakables (always) ----
  forEachByClass(CLASSNAME_BREAKABLE, (e) => {
    (e as any).RespawnThink();
  });

  // ---- 2) weapons ----
  if (doWeapons) {
    forEachByClass(CLASSNAME_WEAPON, (e) => {
      (e as any).Fall();
    });
  }

  // ---- 3) powerups: same global flag, re-checked after weapons ----
  if (GLOBALS.respawnFlagPtr[0] !== 0) {
    forEachByClass(CLASSNAME_POWERUP, (e) => {
      (e as any).Fall();
    });
  }

  // ---- 4) flags (always) ----
  forEachByClass(CLASSNAME_FLAG, (e) => {
    (e as any).RespawnFlag();
  });
}
