/**
 * D.4.9 barrel — re-exports every per-class module.
 *
 * The per-class modules are doc-comment + method manifests (see each
 * file for details). The actual method bodies are in
 * `tools/decompile/output/<Class>__<Method>.ts`.
 *
 * Use the per-class modules directly (e.g. `import { className_CTSGun }
 * from "./mod/ctsgun"`) to avoid name collisions across classes.
 */
export * from "./types";

// Re-export the legacy consolidated modules with full bodies.
export * as SlowMotion from "./slowmo";
export * as SlowMotionPoint from "./slowmo-point";
export * as Weapons from "./weapons";
export * as Scoring from "./scoring";
export * as Interface from "./interface";
