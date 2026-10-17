// ---- Stubs so this compiles in isolation ----
type any_opaque = any;

interface Vector   { x: number; y: number; z: number; }
interface TraceResult extends any_opaque { fraction: number; }
interface CBaseEntity extends any_opaque { /* pev, originVec at +0x20 */ }
interface CBasePlayer extends any_opaque { /* ... */ }

const gpGlobals: any_opaque = {} as any_opaque;     // .time, .frameTimeDouble, .maxClients
declare function UTIL_PlayerByIndex(i: number): CBasePlayer | null;
declare function UTIL_TraceLine(
    a: Vector, b: Vector,
    ignoreMonsters: number, ignoreGlass: number,
    pentIgnore: any_opaque, tr: TraceResult,
): void;
declare function UTIL_EntInArray(
    arr: any_opaque, count: number, ent: CBaseEntity,
): number;
declare function UTIL_FindEntityByClassname(
    start: CBaseEntity | null, classname: string,
): CBaseEntity | null;
declare function entIsAliveInWorld(ent: CBaseEntity): boolean;
declare function eyePosition(self: any_opaque): Vector;

// Sentinel at [ebx-0x6f408] — likely the
// "m_flSlowMoEnd reset" sentinel. Verify via
// tools/decompile/analysis/.
const SLOWMO_END_SENTINEL: number = 0;

export function SlowMotionFlow(this: CBasePlayer): void {
    // ---- 1. Bail-outs (disassembly-driven) -----------------------------
    // 0x86bcd-86bde: fld [ebx-0x6f408]; fcomp [ebp+0x17c];
    //                test ah,0x40; jne 8728d   (== comparison on C3=1)
    if ((this as any).m_flSlowMoEnd === SLOWMO_END_SENTINEL) return;

    // 0x86be4-86bf9: ebp+0x178 > *(*(ebx+0x1600))  (= gpGlobals.time)
    if ((this as any).m_flSlowMoNext > gpGlobals.time) return;

    // 0x86bff-86c07: schedule next trigger.
    (this as any).m_flSlowMoNext =
        gpGlobals.frameTimeDouble + gpGlobals.time;

    // ---- 2. Per-frame player sweep ------------------------------------
    const trace: TraceResult = new TraceResult();
    let anyBlocked = false;

    for (let i = 1; i <= gpGlobals.maxClients; i++) {
        const stale = (this as any).m_pFrameTargets[i];
        if (stale && (stale as any).m_flSlowMoEnd === SLOWMO_END_SENTINEL) {
            (this as any).m_pFrameTargets[i] = null;
        }

        const other = UTIL_PlayerByIndex(i);
        if (!other) continue;
        if (!(other as any).isValidCandidate?.()) continue;
        if (other === this) continue;

        // LOS trace (0x86cd8-86d63).
        const myEye = eyePosition(this);
        const theirEye = eyePosition(other);
        UTIL_TraceLine(
            myEye, theirEye, 1, 1,
            (this as any).pevContainingEdict, trace,
        );
        if (trace.fraction >= 1.0) continue;  // blocked; skip

        // 0x86d68-86da3 — gate AFTER the trace:
        //   if (other.m_flSlowMoEnd == 0) -> store
        //   else if (other.0x180 >= this.0x180) -> store
        //   else -> clear + flag blocked
        if ((other as any).m_flSlowMoEnd === 0) {
            (this as any).m_pFrameTargets[i] = other;
        } else if (
            (other as any).field_0x180 >= (this as any).field_0x180
        ) {
            (this as any).m_pFrameTargets[i] = other;
        } else {
            (this as any).m_pFrameTargets[i] = null;
            anyBlocked = true;
        }
    }

    // ---- 3. Apply slow motion to self (0x86dd6-86dfc) ----------------
    if (!anyBlocked) {
        // Push order was: this, m_flSlowMoEnd (0x17c), buttonByte.
        (this as any).GoSlow(
            (this as any).m_flSlowMoEnd,
            (this as any).buttonByte,
        );
    }

    // ---- 4. Re-apply / prune (0x86e1c-86ea2) -------------------------
    for (let i = 1; i <= gpGlobals.maxClients; i++) {
        const target = (this as any).m_pFrameTargets[i];
        if (!target) continue;

        // 0x86e2f-86e55:
        //   if (SENTINEL == target.m_flSlowMoEnd)              -> keep
        //   else if (target.0x180 != this.0x180) [je jumps on !=] -> keep
        //   else -> clear
        const isStale =
            (target as any).m_flSlowMoEnd === SLOWMO_END_SENTINEL;
        const velocitiesDiffer =
            (target as any).field_0x180 !== (this as any).field_0x180;

        if (!isStale && !velocitiesDiffer) {
            (this as any).m_pFrameTargets[i] = null;
            continue;
        }

        // 0x86e60-86e86: GoSlow(target, this.0x180, 0);
        //                then copy this.buttonByte -> target.buttonByte.
        (target as any).GoSlow((this as any).field_0x180, 0);
        (target as any).buttonByte = (this as any).buttonByte;
    }

    // ---- 5. Persistent-target scan (0x86ea4-8728b) -------------------
    if ((this as any).m_iStoredTargetCount > 31) return;

    const classNames: string[] = [
        "TODO_classname_A",  // ebx - 0x696dc
        "TODO_classname_B",  // ebx - 0x6e62b
        "TODO_classname_C",  // ebx - 0x6b6c5
    ];
    const myEye2 = eyePosition(this);
    const myEdict = (this as any).pevContainingEdict;
    // The "exclusion point" vector at [ebx+0x1888]; a 3-float
    // array against which pool B/C entity-origin values are compared
    // for EXACT equality.
    const exclusionPoint: Vector = (gpGlobals as any).exclusionPoint;

    for (let poolIdx = 0; poolIdx < classNames.length; poolIdx++) {
        let ent: CBaseEntity | null = null;
        while ((ent = UTIL_FindEntityByClassname(ent, classNames[poolIdx])) !== null) {
            if (!entIsAliveInWorld(ent)) continue;
            if (UTIL_EntInArray(
                (this as any).m_pStoredTargets, 32, ent,
            ) !== -1) continue;

            // Pools B & C additionally: skip if entity origin (at +0x20)
            // is the EXACT exclusion point, not "at or above a ceiling".
            if (poolIdx !== 0) {
                const origin: Vector = (ent as any).originVec;
                if (
                    origin.x === exclusionPoint.x &&
                    origin.y === exclusionPoint.y &&
                    origin.z === exclusionPoint.z
                ) continue;
            }

            const entEye = eyePosition(ent);
            UTIL_TraceLine(myEye2, entEye, 1, 1, myEdict, trace);
            if (trace.fraction >= 1.0) continue;

            (ent as any).GoSlow((this as any).field_0x180, 0);
            if ((this as any).m_iStoredTargetCount <= 31) {
                const idx = (this as any).m_iStoredTargetCount;
                (this as any).m_pStoredTargets[idx] = ent;
                (this as any).m_iStoredTargetCount = idx + 1;
            }
        }
    }
}
