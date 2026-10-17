/**
 * CTSGameRules::AddObjectiveInList — append a CTSObjective to the
 * rules' objective list, returning its index. Returns the existing
 * index if the objective is already present, or -1 if the list
 * (capacity 32) is full.
 *
 * Demangled signature: CTSGameRules::AddObjectiveInList(CTSObjective*, int*)
 *
 * Layout is INFERRED from the disassembly — there is no TS source for
 * CTSGameRules yet, so field names are best-effort. Reconcile against
 * real source in D.4.
 *
 *   +0x2d0  int32          m_iObjectiveCount
 *   +0x2d4  CTSObjective*  m_Objectives[i].pObjective
 *   +0x2d8  int32[4]       m_Objectives[i].data        // payload semantics unknown
 *
 * Each entry is 20 bytes (4 + 16); capacity is 32 (indices 0..31).
 */

// Ambient declarations so this file compiles in isolation.
// In the real emit these types live alongside the rest of the class
// definitions produced by D.4.
declare function FindIndexByObjective(this: any, pObjective: any): number;

interface CTSObjectiveEntry {
    pObjective: any;
    data: Int32Array;
}

interface CTSGameRulesShape {
    m_iObjectiveCount: number;
    m_Objectives: CTSObjectiveEntry[]; // fixed length 32, sized by C++ definition
}

export function AddObjectiveInList(
    this: CTSGameRulesShape,
    pObjective: any,
    pData: Int32Array
): number {
    // Branch 1: already in the list → return its index.
    // Asm: `cmp eax, -1; jg 6ac76` jumps straight to the epilogue,
    // returning the existing index that FindIndexByObjective left in eax.
    // The asm pushes both `this` and pObjective on the stack; in TS
    // that's `Function.prototype.call(thisArg, arg)`.
    const existingIndex = FindIndexByObjective.call(this, pObjective);
    if (existingIndex >= 0) {
        return existingIndex;
    }

    // Branch 2: list is at capacity. Asm: `cmp [ebp+0x2d0], 0x1f; jg`.
    // `jg` is strict: count == 31 still has the 32nd slot open; only
    // count >= 32 returns -1.
    const count = this.m_iObjectiveCount;
    if (count > 31) {
        return -1;
    }

    // Branch 3: append.
    //   pObjective → this + count*20 + 0x2d4
    //   pData      → this + count*20 + 0x2d8  (16 bytes via `rep movsd ecx=4`)
    this.m_Objectives[count].pObjective = pObjective;
    for (let i = 0; i < 4; i++) {
        this.m_Objectives[count].data[i] = pData[i];
    }
    this.m_iObjectiveCount = count + 1;
    return count;
}
