[2026-10-16 18:33:55] === STARTING TEST: CTSTimer::Use (33B) — chunk + decompile only ===
[2026-10-16 18:33:55] Step 1: chunk...
[2026-10-16 18:33:55] Chunk: exit=1, elapsed=0.1s
[2026-10-16 18:33:55]   stdout: 
[2026-10-16 18:33:55]   stderr: symbol not found in nm-D-size.txt: Use__8CTSTimer
[2026-10-16 18:33:55] CHUNK FAILED — no file
[2026-10-16 18:33:55] === TEST DONE ===
[2026-10-16 18:34:02] === TEST: Use__8CTSTimerP11CBaseEntityT18USE_TYPEf ===
[2026-10-16 18:34:02] Step 1: chunk...
[2026-10-16 18:34:02] Chunk: exit=0, elapsed=0.1s
[2026-10-16 18:34:02]   stdout: wrote /home/kyle/Development/specialists-browser/tools/decompile/chunks/CTSTimer__Use_p_?_?.chunk.md  (2423 chars, 65 lines)
[2026-10-16 18:34:02] Chunk file: CTSTimer__Use_p_?_?.chunk.md (2429 bytes)
[2026-10-16 18:34:02] Step 2: codex decompile (5-15 min)...
[2026-10-16 18:45:59] === grind: AddAmmo__6CTSGunUci ===
[2026-10-16 18:45:59]   chunk: CTSGun__AddAmmo_?.chunk.md (3472B)
[2026-10-16 18:45:59]   spawn codex pid=3544618 → codex-CTSGun__AddAmmo_?__codex.log
[2026-10-16 18:45:59]   -> codex pid=3544618 started; will check progress later
[2026-10-16 18:45:59] 
=== grind: CallCheckDeads__12CTSGameRules ===
[2026-10-16 18:45:59]   chunk: CTSGameRules__CallCheckDeads.chunk.md (6742B)
[2026-10-16 18:45:59]   spawn codex pid=3544669 → codex-CTSGameRules__CallCheckDeads__codex.log
[2026-10-16 18:45:59]   -> codex pid=3544669 started
[2026-10-16 18:49:23] === cleanup ===
[2026-10-16 18:49:23] Removed 0 corrupt files
[2026-10-16 18:49:23] 
=== verify find_chunk fix (dry-run) ===
[2026-10-16 18:49:23] dry-run exit=0
[2026-10-16 18:49:23]   stderr (first 300): chunk:  /home/kyle/Development/specialists-browser/tools/decompile/chunks/CTSGun__AddAmmo_?.chunk.md

[2026-10-16 18:49:23]   ✓ AddAmmo__6CTSGunUci found in dry-run prompt
[2026-10-16 18:49:23]   | # Single-function AI decompile prompt
[2026-10-16 18:49:23]   | 
[2026-10-16 18:49:23]   | You are decompiling a single function from the closed-source
