// TODO(asm-ambiguous): field semantics inferred from disassembly only; verify
// against CTSGun's class layout (HANDOFF.md / SPEC.md) when D.4 lands.

interface CTSGunFireModeConfig {
  /** +0x2 — current fire mode index (byte, 0..5) */
  currentMode: number;
}

interface CTSGunFireModesList {
  /** +0xc — dword bitmask; bits 0..5 indicate which fire modes are valid */
  fireModeBitmask: number;
}

interface CTSGun {
  /** 0x80 — weapon id, used to index the player's per-weapon client slot */
  m_iId: number;
  /** 0xc8 — pointer to CBasePlayer; treated as a raw byte buffer here */
  m_pPlayer: Uint8Array;
  /** 0xcc — fire-mode config; null means this weapon has no modes */
  m_pFireModeConfig: CTSGunFireModeConfig | null;
  /** 0xd0 — fire-modes table */
  m_pFireModes: CTSGunFireModesList;
}

/**
 * CTSGun::SwitchFireMode — cycle to the next valid fire mode for this weapon.
 *
 * Walks the 6-bit fire-mode bitmask starting at currentMode + 1 (wrapping at 6),
 * picks the first set bit as the new mode, and mirrors the 1-indexed result into
 * the player's per-weapon client slot for the HUD.
 *
 * @param this  The CTSGun weapon entity
 * @returns     void
 */
export function SwitchFireMode(this: CTSGun): void {
  // No config → this weapon doesn't support switching fire modes.
  const config = this.m_pFireModeConfig;
  if (!config) {
    return;
  }

  const mask = this.m_pFireModes.fireModeBitmask;
  let nextMode = config.currentMode + 1;

  // Walk bits 0..5 of the mask (mod 6) until a set bit is found.
  for (;;) {
    if (((mask >>> nextMode) & 1) !== 0) {
      config.currentMode = nextMode;
      break;
    }
    nextMode++;
    if (nextMode >= 6) {
      nextMode = 0;
    }
  }

  // Mirror (1-indexed) into the player's per-weapon client slot:
  //   *(player + 0x490)[weaponId + 0xa] = nextMode + 1
  this.m_pPlayer[0x490 + this.m_iId + 0xa] = (nextMode + 1) & 0xff;
}