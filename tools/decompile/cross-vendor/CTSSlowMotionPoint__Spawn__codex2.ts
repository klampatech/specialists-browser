// review-rewrite: PASS-WITH-NOTES cleanup of CTSSlowMotionPoint::Spawn

// --- Stubs so the file compiles in isolation. Replace with real
//     imports / shared headers once D.5 lands. ---
type Vector = { x: number; y: number; z: number };
type Entvars = { [k: string]: any };
type CVar    = { value: number };
const gpGlobals: { time: number }            = { time: 0 } as any;
const cvar_slow_amount: CVar                  = { value: 0 } as any;
const NEXT_THINK_DELAY = 0.1; // TODO(asm-ambiguous): QWORD at [ebx-0x6ecd8]
function UTIL_SetSize(_pev: Entvars, _mins: Vector, _maxs: Vector): void {}
function UTIL_SetOrigin(_pev: Entvars, _origin: Vector): void {}

// --- Class stub. Custom fields are inferred from offsets. ---
class CTSSlowMotionPoint {
  // CTSSlowMotionPoint has no vtable — pev is at offset 0 of `this`
  // (matches the asm pattern `mov ecx, [edi]; … ; mov [ecx], eax`).
  pev: Entvars = {} as Entvars;

  // Offsets within `this`. Names are inferred — TODO marks where
  // confirmation is mandatory.
  // offset 0x0C: disassembly byte pattern is 0xFFFF0000 (NOT -1).
  // TODO(asm-ambiguous): confirm field name + intent vs TS mod source.
  m_iAffectedPlayerIndex: number = 0;
  // offset 0x10
  m_flCurrentSlowAmount: number = 0;
  // offset 0x14
  m_flStartTime: number = 0;
  // offset 0x18
  m_flEndTime: number = 0;
  // offsets 0x64..0xE7 (33 DWORDs)
  m_affectedPlayers: number[] = new Array(33).fill(0);
  // offset 0xE8
  m_iAffectedPlayerCount: number = 0;
  // offset 0xEC
  m_flActivationTime: number = 0;
  // offset 0xF0
  m_flDeactivationTime: number = 0;
  // offset 0xF4 (single byte)
  m_bActive: boolean = false;
}

export function Spawn(this: CTSSlowMotionPoint): void {
  // Classname: PIC-adjusted string index. Original C: pev->classname =
  //   ALLOC_STRING("slowmo_point"); — TS uses a literal for clarity.
  // TODO(asm-ambiguous): PIC constant derived from
  //       GOT - 0x6eea7 - *(*globalPtr + 0x98).
  this.pev.classname = "slowmo_point";

  // Bounds: zero-point trigger zone.
  // TODO(asm-ambiguous): source DWORD at [ebx-0x6f408] presumed zero.
  const mins: Vector = { x: 0, y: 0, z: 0 };
  const maxs: Vector = { x: 0, y: 0, z: 0 };
  UTIL_SetSize(this.pev, mins, maxs);

  // Origin: UTIL_SetOrigin(pev, pev->origin). Asm loads pev+8 (origin
  // offset) as the second argument's `Vector&`.
  UTIL_SetOrigin(this.pev, this.pev.origin);

  // Triple-write to pev+0x108 / 0x10C / 0x118 with values 0, 0, 0x80.
  // TODO(asm-ambiguous): in canonical HLSDK entvars_t these offsets are
  //   netname / message / dmgtime, NOT rendermode / renderfx / renderamt.
  //   The TS mod is either compiling against a fork with a reordered
  //   entvars_t (some leaked / community engines do this), OR the
  //   intent here is different from what the field names suggest.
  //   Verify against TS mod build symbols before merging.
  (this.pev as any).rendermode = 0;
  (this.pev as any).renderfx   = 0;
  (this.pev as any).renderamt  = 0x80;

  // Field at this+0xC. Asm:
  //     mov  ax, 0x0
  //     or   eax, 0xffff0000      ; eax = 0xFFFF0000
  //     mov  DWORD PTR [edi+0xc], eax
  // ⚠️ Byte pattern is 0xFFFF0000 — NOT -1 (= 0xFFFFFFFF).
  // TODO(asm-ambiguous): original TS code likely wrote a 16-bit
  //   sentinel (0xFFFF) into a packed-struct field, or this is a
  //   different field. Preserve the asm pattern until verified.
  (this as any).m_iAffectedPlayerIndex = 0xFFFF0000 as unknown as number;

  // Field at this+0x10 — populated from a cvar (probably "slowamt"
  // or "ts_slowmotion"; cvar name not directly visible in this chunk).
  this.m_flCurrentSlowAmount = cvar_slow_amount.value;

  // Two zero floats.
  this.m_flStartTime = 0;
  this.m_flEndTime   = 0;

  // Schedule first think at gpGlobals->time + delay, stored at pev+0x104.
  // TODO(asm-ambiguous): in canonical HLSDK entvars_t, pev+0x104 =
  //   goalent (string_t); nextthink is at 0x098. Confirm whether the
  //   TS mod has shifted nextthink to 0x104 (custom entvars layout),
  //   or whether the value being stored is actually a different float
  //   field that happens to be set the same way nextthink is.
  // TODO(asm-ambiguous): NEXT_THINK_DELAY value is the QWORD at
  //   [ebx-0x6ecd8].
  (this.pev as any).nextthink = gpGlobals.time + NEXT_THINK_DELAY;

  // Zero out the affected-players tracking buffer (33 DWORDs at
  // 0x64..0xE7).
  this.m_affectedPlayers.fill(0);

  // Zero post-buffer state fields (offsets 0xE8 / 0xEC / 0xF0 dwords,
  // 0xF4 byte).
  this.m_iAffectedPlayerCount = 0;
  this.m_flActivationTime     = 0;
  this.m_flDeactivationTime   = 0;
  this.m_bActive              = false;
}
