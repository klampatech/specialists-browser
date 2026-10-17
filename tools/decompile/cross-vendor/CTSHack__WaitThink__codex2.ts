     const frameDelta = (gpGlobals as any).frametime;   // or the GOT symbol
     const threshold  = …;                              // resolve from data segment
     ```
   - **Compile-time constants** if D.4 confirms they're literals in
     `.rodata`.

2. **`m_pVictim` is a misnomer.** The receiver is being `Use`d, not
   victimized. Rename to `m_pUseTarget` (or follow whatever name the
   CTSHack decompilation eventually lands on).

3. **`m_flPrimaryTimer` / `m_flSecondaryTimer` should be marked
   provisional.** They're inferred from "adjacent offsets in an
   accumulator pair" but their true identity (e.g., `m_flNextUseTime` /
   `m_flLastUseTime`) is up to D.4. The inline TODO already covers
   this; just make sure the names don't leak into any save-format
   definition in D.4+ without being verified.

4. **Minor style: `export function` for a method-shaped fn.** Callers
   will need `(WaitThink as any).call(entity)`. Acceptable for D.3
   per the conversion guidance ("Output ONE TypeScript function
   declaration"), but flag for D.4 to fold into a class.

**No suggested full rewrite is needed** — the function's logic is
faithful and the issues above are localized. The only mechanicalrewrite I'd recommend is replacing the placeholder constants with
real resolutions; here's a sketch of the targeted edit, not a
full rewrite:
