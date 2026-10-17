// Section 4a — replace the flFraction===0 check with ent nullity:
if (trace.flFraction < 1.0) {
  let victim: CBaseEntity | null = null;
  if (!trace.ent) {                                          // was: trace.flFraction === 0
    const worldEdict = engineApi.edictFromIndex?.(0);
    if (worldEdict) {
      const ent = worldEdict as Record<number, unknown>;
      victim = (ent[0x7c] as CBaseEntity | undefined) ?? null;
    }
  } else {
    const ent = trace.ent as Record<number, unknown>;
    victim = (ent[0x7c] as CBaseEntity | undefined) ?? null;
  }
  // ... unchanged ...

// Section 4b — invert the damageability check:
if (victim) {
  const vtable = (victim as Record<number, unknown>)[0x60] as
    | Record<number, unknown> | undefined;
  const damageCheck = vtable?.[0xc8 / 4] as
    | ((this: CBaseEntity) => unknown) | undefined;
  if (!damageCheck?.call(victim)) {                          // was: if (damageCheck?.call(victim))
    // ... unchanged damage application ...
  }
}
