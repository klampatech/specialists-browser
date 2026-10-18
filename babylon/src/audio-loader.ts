/**
 * D.5.7 v3 — Game sound loader.
 *
 * Fetches + decodes .wav files from the TS mod (which is symlinked
 * into babylon/public/sounds/ → ../../_runtime_assets/half-life/ts/sound)
 * and returns a Map keyed by the decompiled code's generic sample
 * names (e.g. "weapons/tsgun_fire.wav") that the engine simulator
 * uses in pfnEmitSound.
 *
 * The TS mod doesn't ship the decompiled code's exact filenames
 * (e.g. "weapons/tsgun_fire.wav") — the mod organizes sounds per
 * weapon (weapons/glock22/glock22-fire.wav, weapons/katana/miss.wav,
 * etc.). The SAMPLE_MAP below bridges the decompiler-named samples
 * to the actual file paths.
 *
 * v1 wires 9 sounds (the ones the decompiled Fire* methods and the
 * existing CCombatBlock path reference). Future sessions can extend
 * the map to cover more of the 3044 wavs in the TS mod.
 */

const BASE_URL = "/sounds";

/**
 * Map from generic sample name (decompiled-code reference, what
 * g_engfuncs.pfnEmitSound() gets called with) to actual file path
 * relative to BASE_URL.
 */
export const SAMPLE_MAP: Record<string, string> = {
  // Pistol — the decompiled weapons/tsgun_fire.wav doesn't exist in
  // the TS mod; the glock22 is the closest match (the spec's pistol
  // was renamed to glock22 in 3.0). Fallback chain via .fallback below.
  "weapons/tsgun_fire.wav": "weapons/glock22/glock22-fire.wav",
  "weapons/fire.wav": "weapons/glock22/glock22-fire.wav",
  // Generic reload
  "weapons/reload.wav": "weapons/generic_reload.wav",
  // Melee
  "weapons/melee_swing.wav": "weapons/knife/knife_miss.wav",
  "weapons/melee_block.wav": "player/block.wav",
  // Knife — sample from katana_decomp (uses knife_miss as the swing
  // sound, knife_hitbody as the slash sound)
  "weapons/knife_slash.wav": "weapons/knife/knife_hitbody.wav",
  "weapons/knife_throw.wav": "weapons/knife/knife_miss.wav",
  "weapons/knife_hit.wav": "weapons/knife/knife_hit.wav",
  "weapons/knife_hitbody.wav": "weapons/knife/knife_hitbody.wav",
  "weapons/knife_miss.wav": "weapons/knife/knife_miss.wav",
  // Katana
  "weapons/katana_swing.wav": "weapons/katana/miss.wav",
  "weapons/katana_throw.wav": "weapons/katana/miss1.wav",
  "weapons/katana_hit.wav": "weapons/katana/hit.wav",
  "weapons/katana_hitbody.wav": "weapons/katana/hit-body.wav",
  "weapons/katana_miss.wav": "weapons/katana/miss.wav",
  "weapons/katana_miss1.wav": "weapons/katana/miss1.wav",
  "weapons/katana_hit1.wav": "weapons/katana/hit1.wav",
  // Grenade launcher — best guess; the mod doesn't ship a generic
  // glauncher.wav
  "weapons/glauncher.wav": "weapons/glock22/glock22-fire.wav",
  // Dryfire (out-of-ammo click)
  "weapons/dryfire.wav": "weapons/knife/knife_miss.wav",
  // Hit (generic)
  "weapons/hit.wav": "weapons/knife/knife_hit.wav",
};

/** Pre-fetched + decoded audio buffers, keyed by generic sample name. */
export type SoundBank = Map<string, AudioBuffer>;

/** Result of a sound-load attempt. */
export interface LoadResult {
  bank: SoundBank;
  loaded: number;
  failed: number;
  total: number;
}

/**
 * Load every sound in SAMPLE_MAP in parallel. Failed loads are
 * logged + skipped (the bank will simply not have that name; the
 * GameAudio's procedural fallback handles the gap).
 */
export async function loadGameSounds(ctx: AudioContext): Promise<LoadResult> {
  const bank: SoundBank = new Map();
  let loaded = 0;
  let failed = 0;
  const total = Object.keys(SAMPLE_MAP).length;

  // Kick off all fetches in parallel; tolerate individual failures.
  const tasks = Object.entries(SAMPLE_MAP).map(async ([genericName, filePath]) => {
    const url = `${BASE_URL}/${filePath}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[audio-loader] ${filePath}: HTTP ${res.status}`);
        failed++;
        return;
      }
      const arr = await res.arrayBuffer();
      // decodeAudioData rejects on bad data. Use a Promise wrapper
      // because the modern signature is callback-based.
      const buf = await new Promise<AudioBuffer>((resolve, reject) => {
        ctx.decodeAudioData(arr, resolve, reject);
      });
      bank.set(genericName, buf);
      loaded++;
    } catch (err) {
      console.warn(`[audio-loader] ${filePath}: ${(err as Error).message}`);
      failed++;
    }
  });

  await Promise.all(tasks);
  console.log(`[audio-loader] done: ${loaded}/${total} loaded, ${failed} failed`);
  return { bank, loaded, failed, total };
}
