/**
 * CTSBomb::Restore — restore a CTSBomb entity from a save-game buffer.
 *
 * Demangled:  CTSBomb::Restore(CRestore &restore)
 * Sequence:   1) call CTSObjective::Restore(this, restore)
 *             2) if ok, call CRestore::ReadFields(name, this, pTypeDesc, 2)
 *             3) return ReadFields' result; on parent-fail return 0.
 */
export function Restore(this: any, restore: any): number {
  // [asm head] call-next; pop ebx; add 0xe99e8
  //   ebx <- 0x7c428 (return address of self-call)
  //   ebx <- 0x7c428 + 0xe99e8 = 0x165e10  (module image base for PIC)
  // Subsequent "[ebx ± k]" reads are globals in .data/.rodata:
  //   - [ebx - 0x6ccdb] : rodata string   → ReadFields `name` arg
  //   - [[ebx + 0x1334]] : static TYPEDESCRIPTION[] → ReadFields `pTypeDesc` arg
  //                       (almost certainly CTSBomb::m_TypeDesc in C++;
  //                        rebuild in D.4 with count = 2)

  // 7c43a-7c441: __thiscall CTSObjective::Restore(this=esi, restore=edi)
  //   sub esp, 0x8; push edi; push esi; call; add esp, 0x10
  const parentOk: number = (CTSObjective.Restore as any)(this, restore);
  if (parentOk === 0) {
    // 7c444 test/jne + 7c448 mov eax,0 + 7c44d jmp epilogue
    return 0;
  }

  // 7c450-7c469: __thiscall CRestore::ReadFields(restore, name, this, pTypeDesc, 2)
  //   arg-push order (right-to-left): 2, pTypeDesc, this, name, restore
  //   call ReadFields; add esp, 0x20
  return (restore as any).ReadFields(
    /* name      */ undefined as any, // TODO(asm): string at [ebx - 0x6ccdb];
                                     // likely 'CTSBomb' (GoldSrc class-name
                                     // sentinel convention) — verify
                                     // against strings-n5.txt in D.4.
    /* data      */ this,
    /* pTypeDesc */ undefined as any, // TODO(asm): static TYPEDESCRIPTION[]
                                     // pointed to by [ebx + 0x1334];
                                     // count = 2. Reconstruct in D.4
                                     // from CTSBomb's serializable fields.
    /* count     */ 2,
  );
}
