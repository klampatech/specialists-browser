/**
 * CTSGun::Zoom — apply a zoom level (passed as int, stored as float)
 * to the owning player, and conditionally reset a player-side flag
 * when the weapon's id field is at or below 0x27 (39).
 *
 * @param this  The CTSGun entity instance
 * @param zoom  Zoom level (int input, written to a player field as float)
 */
export function Zoom(this: any, zoom: number): void {
  // [this+0x80][0][0x214] — double-deref through m_pPlayer into a
  // pev-derived struct. fild + fstp converts the int arg to float.
  // TODO(asm-ambiguous): exact field name (m_fZoomLevel / m_flZoomFOV).
  this.m_pPlayer.zoomLevel = zoom;

  // [this+0xd0][0x3c] — a weapon-info id compared to 0x27 (39).
  // jg 71744 skips the clear when id > 0x27.
  // TODO(asm-ambiguous): field meaning.
  if (this.m_pWeaponInfo.id <= 0x27) {
    // [this+0x80][0][0xbc] — clear a flag/animation state on the
    // same player struct reached via the same double deref.
    // TODO(asm-ambiguous): purpose of zeroing this field.
    this.m_pPlayer.zoomFlag = 0;
  }
}
