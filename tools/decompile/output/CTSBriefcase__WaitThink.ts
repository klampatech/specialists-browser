/**
 * CTSBriefcase::WaitThink — periodic rescheduling think for the briefcase.
 *
 * Disassembly (ts_i386.so @ 0x0007db14, 49 bytes):
 *   push   ebx
 *   sub    esp,0x4 *   call   0x7db1d                 ; get EIP for PIC
 *   pop    ebx                      ; ebx = 0x7db1d
 *   add    ebx,0xe82f3              ; ebx = GOT base
 *   mov    eax,[esp+0xc]            ; eax = this
 *   mov    edx,[eax]                ; edx = this->pev     (offset 0)
 *   mov    eax,[ebx+0x1600]         ; eax = gpGlobals ptr
 *   mov    eax,[eax]                ; eax = gpGlobals.time (offset 0 of globalvars_t)
 *   fld    QWORD PTR [ebx-0x6f018]  ; FPU ST(0) = waitTime (double)
 *   fadd   DWORD PTR [eax]          ; ST(0) += gpGlobals.time (float -> double)
 *   fstp   DWORD PTR [edx+0x104]    ; pev+0x104 = (float) ST(0)
 *   add    esp,0x4
 *   pop    ebx
 *   ret
 *
 * Effect:  pev->nextthink = gpGlobals.time + waitTime
 *          (i.e. reschedule this think for `waitTime` seconds from now).
 *
 * @param this  The CTSBriefcase entity instance.
 * @returns     void
 */
export function WaitThink(this: any): void {
  // Engine / module globals — declared `any` so this file compiles in
  // isolation. D.4 will resolve the real symbol names from `nm -D
  // ts_i386.so` and wire them through the engine interface module.
  // TODO(D.4): replace `waitTimeGlobal` placeholder with the resolved
  // symbol (candidate: a `slowamt` / `ts_slowmotion` cvar read, or a
  // file-scope static).
  const gpGlobals: any = undefined as any;
  const waitTimeGlobal: any = undefined as any;

  // CTSBriefcase's first field (offset 0) is `pev` (entvars_t*).
  const pev = (this as any).pev as any;

  // pev + 0x104 = `nextthink` in this build's entvars_t.
  //
  // TODO(asm-ambiguous): confirm offset against the TS mod's actual
  // entvars_t layout. Reference: standard HLSDK has nextthink at
  //   - 0xFC (HLSDK 1.x slim, 2 euser fields)
  //   - 0x100 (HLSDK Updated, 4 euser fields, no extra slots)
  //   - 0x108 (HLSDK Updated + extra fields)
  // The TS mod's disassembly writes to 0x104, which suggests one extra
  // 4-byte slot relative to a0x100 baseline. We trust the disassembly
  // offset; this TODO is to confirm by reading entvars_t in the TS
  // headers once they're located.
  pev[0x104] = (gpGlobals.time + waitTimeGlobal) as number;
}
