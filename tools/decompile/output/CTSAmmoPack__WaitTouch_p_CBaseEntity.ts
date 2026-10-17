/**
 * CTSAmmoPack::WaitTouch — wait-for-touch handler for the ammo pack.
 *
 * Stage 1: validate the toucher via two vtable calls through
 *   *(pOther+0x60) (offsets +0xc8 then +0xb4); both must return non-null.
 * Stage 2: require the toucher's m_pActiveItem (pOther+0xa10) to be
 *   non-null and have classid 0x10 (CTSGun).
 * Stage 3: walk 16 ammo slots at this+0x64..this+0xa3 (4 outer × 4
 *   inner, stride 0x10); on each non-zero slot, call AddAmmo with
 *   ammoType = (outer*4 + inner) and zero the slot on success. Track
 *   whether anything was given.
 * Stage 4: if anything was given, play a pickup sound on the player.
 * Stage 5: if the pack's stored armor exceeds a cvar threshold
 *   (GOT-0x6f408), transfer the pack's armor to the player. The
 *   player can be skipped if a frozen-like bit (*pOther+0x180 & 0x20)
 *   is **set and** the player's current armor already equals the
 *   threshold. After transfer, zero the pack's armor.
 * Stage 6: if the pack's armor now equals the cvar threshold, UTIL_Remove.
 *
 * @param this   The CTSAmmoPack entity
 * @param pOther The entity that touched the pack
 * @returns      void
 */
export function WaitTouch(this: CTSAmmoPack, pOther: CBaseEntity): void {
  // PIC/GOT base in EBX (from `call $+5; pop ebx; add ebx, GOT`).
  // All [ebx-...] reads below resolve globals / cvars through this base.
  const GOT = 0; // TODO: real GOT base is computed at run-time

  // Stage 1 — validity checks on the toucher
  // TODO(asm-ambiguous): [pOther+0x60] is dereferenced as a pointer to
  // a vtable-ish dispatch table; functions at +0xc8 and +0xb4 are
  // called with `pOther` as their first arg. Both must return non-null.
  const cbTable: any = readDWord(pOther + 0x60);
  if (callIndirect(readDWord(cbTable + 0xc8), pOther) === 0) return;
  if (callIndirect(readDWord(cbTable + 0xb4), pOther) === 0) return;

  // Stage 2 — verify active weapon and class
  const weapon = readDWord(pOther + 0xa10); // m_pActiveItem (TS-specific offset)
  if (weapon === 0) return;
  if (readDWord(weapon + 0x88) !== 0x10) return; // CTSGun class id

  // Stage 3 — iterate 16 ammo slots and AddAmmo each non-zero one
  // Slots live at this+0x64 .. this+0xa3. ammoType = outer*4 + inner.
  let anyAdded = false;
  let counter = 0;
  for (let outer = 0; outer < 4; outer++) {
    const slotBase = this + 0x60 + outer * 0x10;
    for (let inner = 0; inner < 4; inner++) {
      const slotAddr = slotBase + 0x4 + inner * 4;
      const count = readDWord(slotAddr);
      if (count === 0) continue;
      const ammoType = (counter + inner) & 0xff;
      if (AddAmmo(weapon, ammoType, count) !== 0) {
        anyAdded = true;
        writeDWord(slotAddr, 0);
      }
    }
    counter += 4;
  }

  // Stage 4 — play pickup sound if we gave any ammo
  if (anyAdded) {
    // TODO(asm-ambiguous): edx = *pOther; [edx+0x208] is the edict.
    const innerPtr = readDWord(pOther);
    const edict = readDWord(innerPtr + 0x208);
    EMIT_SOUND_DYN(
      edict,                         // entity
      3,                             // CHAN_VOICE
      readStringPtr(GOT - 0x6c8da),  // sample name
      readFloat(GOT - 0x6f3fc),      // volume (cvar)
      readFloat(GOT - 0x6e7e4),      // attenuation (cvar)
      0,                             // flags
      100,                           // pitch
      readDWord(GOT - 0x6ec2c)       // specialFlags / extra (EMIT_SOUND_DYN2)
    );
  }

  // Stage 5 — armor transfer
  // The PACK has its own stored armor at *this+0x1bc (NOT *pOther+0x1bc).
  // The cvar at GOT-0x6f408 is the threshold. Logic:
  //   if cvar >= pack_armor: skip — pack has nothing to give.
  //   else: check the frozen-like bit (*pOther+0x180 & 0x20).
  //     bit NOT set: compare cvar to *pOther+0x1bc; skip if equal.
  //     bit set (or player_armor != cvar): transfer pack_armor → player,
  //       then zero the pack's armor.
  const packInner = readDWord(this);
  const packArmor = readFloat(packInner + 0x1bc);
  const armorCvar = readFloat(GOT - 0x6f408);

  if (armorCvar < packArmor) {
    const playerInner = readDWord(pOther);
    const frozen = (readByte(playerInner + 0x180) & 0x20) !== 0;
    if (!frozen) {
      const playerArmor = readFloat(playerInner + 0x1bc);
      if (playerArmor !== armorCvar) {
        const armorInt = Math.trunc(packArmor); // transfer the pack's armor
        TakeArmor(pOther, armorInt);
        writeDWord(packInner + 0x1bc, 0); // zero the pack's stored armor
      }
    }
  }

  // Stage 6 — remove the pack if its remaining armor equals the threshold
  if (packArmor === armorCvar) {
    UTIL_Remove(this);
  }
}

// ---------------------------------------------------------------------------
// Helpers / engine types referenced above. These are stand-ins; the real
// definitions live in the engine-binding layer that's built in a later step.
// ---------------------------------------------------------------------------

declare const GOT_BASE: number;

declare function readDWord(addr: any): number;
declare function writeDWord(addr: any, value: number): void;
declare function readByte(addr: any): number;
declare function readFloat(addr: any): number;
declare function readStringPtr(addr: number): string;
declare function callIndirect(fnPtr: number, arg: any): number;

declare function AddAmmo(pItem: any, ammoType: number, count: number): number;
declare function EMIT_SOUND_DYN(
  entity: any,
  channel: number,
  sample: string,
  volume: number,
  attenuation: number,
  flags: number,
  pitch: number,
  specialFlags: number
): void;
declare function TakeArmor(player: any, amount: number): void;
declare function UTIL_Remove(entity: any): void;

interface CTSAmmoPack {
  // ammo counts at +0x64 .. this+0xa3 (16 dwords, stride 4)
  // stored armor at *this+0x1bc (read as float)
}

interface CBaseEntity {
  // pev typically at +0x4; m_pActiveItem at +0xa10 for players;
  // +0x60 is a TS-specific callback/dispatch table pointer;
  // +0x180 holds a flag byte (bit 0x20 is frozen-like);
  // +0x1bc holds armor float (pev->armorvalue)
}
