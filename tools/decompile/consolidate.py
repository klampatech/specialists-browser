#!/usr/bin/env python3
"""
D.4.9 Consolidation — bundle per-method canonical .ts files in
tools/decompile/output/ into per-class modules in src/mod/<class>.ts.

Each per-class module:
  - Header doc-comment listing the class, source class name,
    field map (offsets known from existing analysis), and method list
  - All class methods exported in source-code order (alphabetical for v1)
  - Stub for any method that is in the target but not in canonical

Run:  python tools/decompile/consolidate.py
"""
from __future__ import annotations
import re
import json
import os
from pathlib import Path

REPO = Path("/home/kyle/Development/specialists-browser")
OUT = REPO / "tools/decompile/output"
CV = REPO / "tools/decompile/cross-vendor"
SRC_MOD = REPO / "src/mod"

# Methods that are GOLD-SRC INTERFACE (in interface.ts already) — skip
INTERFACE_METHODS = {
    "GiveFnptrsToDll", "GetEntityAPI", "GetEntityAPI2", "GetNewDLLFunctions",
    "GiveFnptrsToDll",
}

# Class field map (offsets) — extracted from existing analysis + cross-vendor reviews.
# Populated as we go. Stub if not known.
KNOWN_FIELDS = {
    "CTSSlowMotion": [
        ("pev", "this+0x00", "entvars_t*"),
        ("m_iDeactivateFlag", "this+0x0c", "float"),
        ("m_flSlowEndTime", "this+0x10", "float"),
        ("m_bSlowActive", "this+0x64", "byte"),
        ("m_fNextThink", "this+0x68", "float"),
        ("m_affectedEntities[33]", "this+0x70", "edict-pointer array, 132 B"),
        ("m_flSlowAmount", "this+0xf4", "float"),
        ("m_flSlowAmt", "this+0xf8", "float"),
        ("m_flSlowTime", "this+0xfc", "float"),
        ("m_iUseCount", "this+0x100", "int"),
        ("m_iHasBeenUsed", "this+0x100", "int"),
    ],
}

# Default field map for classes we don't have detailed analysis for
DEFAULT_FIELDS = [
    ("pev", "this+0x00", "entvars_t* (set by Spawn)"),
    # All other class-specific fields unknown — TODO D.4.9
]


def extract_method(parts_1: str) -> str:
    """Take leading run that's the method name."""
    s = parts_1
    for pat in [r"^(.+?)(?:_p_)", r"^(.+?)(?:_r_)",
                r"^(.+?)(?:_int(?:_|$))", r"^(.+?)(?:_float(?:_|$))",
                r"^(.+?)(?:_bool(?:_|$))", r"^(.+?)(?:_char(?:_|$))",
                r"^(.+?)(?:_void(?:_|$))", r"^(.+?)(?:_double(?:_|$))",
                r"^(.+?)(?:_long(?:_|$))", r"^(.+?)(?:_[?])$"]:
        m = re.match(pat, s)
        if m:
            return m.group(1)
    m = re.match(r"^([a-zA-Z][a-zA-Z0-9_]+)", s)
    return m.group(1) if m else s


def parse_nm() -> dict[tuple[str, str], int]:
    """Parse nm-D-CTS-specific.txt → dict (cls, method) → size"""
    symfile = REPO / "tools/decompile/analysis/nm-D-CTS-specific.txt"
    target = {}
    for line in symfile.read_text().split("\n"):
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) != 4 or parts[2] != "T":
            continue
        sym = parts[3]
        m = re.match(r"^(.+?)__(\d+)([A-Za-z0-9_]+)$", sym)
        if not m:
            continue
        method, classlen, rest = m.groups()
        cls = rest[:int(classlen)]
        size = int(parts[1], 16)
        key = (cls, method)
        if key not in target or target[key] < size:
            target[key] = size
    return target


def get_class_methods(cls: str) -> list[tuple[str, str]]:
    """Get (method, filename) pairs for a class from canonical outputs."""
    pairs = []
    seen = set()
    for f in OUT.glob(f"{cls}__*.ts"):
        stem = f.stem
        parts = stem.split("__", 1)
        if len(parts) != 2:
            continue
        meth = extract_method(parts[1])
        if meth in seen:
            continue
        seen.add(meth)
        pairs.append((meth, f.name))
    return sorted(pairs, key=lambda x: x[0])


def extract_exports(filename: str) -> str:
    """Extract the export function (and any declares) from a canonical .ts file."""
    content = (OUT / filename).read_text()
    lines = content.split("\n")
    out = []
    in_export = False
    in_declare = False
    seen_stub = False
    for line in lines:
        # Track export / declare blocks
        if line.startswith("export function ") or line.startswith("declare function "):
            in_export = True
        if line.startswith("type ") or line.startswith("interface "):
            out.append(line)
            seen_stub = True
            continue
        if line.startswith("//") or line.startswith("/*") or line.startswith(" *"):
            out.append(line)
            continue
        if in_export and line.strip() == "":
            in_export = False
        if in_export:
            out.append(line)
    return "\n".join(out).rstrip()


def make_class_module(cls: str, methods: list[tuple[str, str]],
                      target: dict[tuple[str, str], int]) -> str:
    """Generate the per-class .ts file content."""
    fields = KNOWN_FIELDS.get(cls, DEFAULT_FIELDS)
    n_methods = len(methods)
    method_listing = "\n".join(f"  - {m}" for m, _ in methods)
    field_listing = "\n".join(
        f"  - {name} ({offset}) — {desc}" for name, offset, desc in fields
    )
    if not method_listing:
        method_listing = "  (none)"
    if not field_listing:
        field_listing = "  - pev (this+0x00) — entvars_t* (set by Spawn)"

    # Build the file
    parts = []
    parts.append(f"/**")
    parts.append(f" * The Specialists mod — `{cls}` entity (D.4.9 CONSOLIDATED).")
    parts.append(f" *")
    parts.append(f" * Source: ts/dlls/ts_i386.so (NOT stripped, 32-bit ELF).")
    parts.append(f" * Class: `{cls}`.")
    parts.append(f" * Methods: {n_methods} decompiled + bundled from per-method canonical outputs.")
    parts.append(f" *")
    parts.append(f" * **Class state (this+offset):**")
    parts.append(field_listing)
    parts.append(f" *")
    parts.append(f" * **Methods (in this file, alphabetical):**")
    parts.append(method_listing)
    parts.append(f" *")
    parts.append(f" * Each method was generated by D.4 pipeline (chunk.py → codex → codex review)")
    parts.append(f" * and committed to `tools/decompile/output/{cls}__<Method>*.ts`.")
    parts.append(f" * This module is a thin re-export bundle, not a rewrite.")
    parts.append(f" *")
    parts.append(f" * Type contracts: see `src/mod/types.ts` (D.4.9 type consolidation).")
    parts.append(f" * Cross-vendor review files: `tools/decompile/cross-vendor/{cls}__<Method>__codex2-review.md`.")
    parts.append(f" */")
    parts.append(f"")

    # Group methods by their file; multiple .ts files per method (different arg variants)
    method_files: dict[str, list[str]] = {}
    for m, fn in methods:
        method_files.setdefault(m, []).append(fn)

    for m, files in sorted(method_files.items()):
        # Pull the body (export function) from each variant
        # We may have multiple .ts files for the same method (different arg variants)
        # Pick the largest (most general) one
        biggest = max(files, key=lambda f: (OUT / f).stat().st_size)
        body = extract_exports(biggest)
        parts.append(f"// --- {m} (from {biggest}) ---")
        parts.append(body)
        parts.append("")

    # Check for missing methods (in target, not in canonical)
    target_methods = sorted([m for c, m in target if c == cls and m not in INTERFACE_METHODS])
    done_methods = set(m for m, _ in methods)
    missing = [m for m in target_methods if m not in done_methods]
    if missing:
        parts.append(f"")
        parts.append(f"// --- STUBS for v1 (missing from D.4 canonical) ---")
        for m in missing:
            sz = target.get((cls, m), 0)
            parts.append(f"/**")
            parts.append(f" * {cls}::{m} — STUB for v1.")
            parts.append(f" * Target size: {sz}B. Not yet decompiled.")
            parts.append(f" * TODO: re-run D.4 for this method.")
            parts.append(f" */")
            parts.append(f"export function {m}(...args: any[]): any {{")
            parts.append(f"  // STUB for v1 — see {cls}__{m}* in tools/decompile/output/ if decompiled.")
            parts.append(f"  return undefined;")
            parts.append(f"}}")
            parts.append(f"")

    return "\n".join(parts)


def main():
    target = parse_nm()
    target_classes = sorted(set(c for c, _ in target))

    # Get all classes from canonical outputs
    canon_classes = set()
    for f in OUT.glob("*.ts"):
        cls = f.stem.split("__", 1)[0]
        canon_classes.add(cls)
    all_classes = sorted(canon_classes | set(target_classes))

    print(f"Total classes (target ∪ canonical): {len(all_classes)}")
    print(f"Target classes (from nm): {len(target_classes)}")
    print(f"Canonical classes: {len(canon_classes)}")

    # Skip these (already in src/mod/ as part of D.4.1-7)
    skip = {"CTSSlowMotion", "CTSSlowMotionPoint", "CTSGun", "CHalfLifeMultiplay", "CBasePlayer"}
    # Actually CTSGun is split across weapons.ts, scoring.ts; we'll consolidate
    # the per-method files into a single per-class .ts but keep the existing
    # .ts files too as compatibility shims.
    # For now, OVERWRITE weapons.ts and slowmo.ts with consolidated versions.

    for cls in all_classes:
        methods = get_class_methods(cls)
        if not methods and cls not in target_classes:
            continue
        content = make_class_module(cls, methods, target)
        out_path = SRC_MOD / f"{_to_filename(cls)}.ts"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(content)
        print(f"  Wrote {out_path.relative_to(REPO)} ({len(content)}B, {len(methods)} methods)")

    # Generate the barrel
    barrel = "/* D.4.9 barrel — re-exports every per-class module. */\n"
    for f in sorted(SRC_MOD.glob("*.ts")):
        if f.name == "mod.ts":
            continue
        name = f.stem
        barrel += f"export * from \"./{name}\";\n"
    (SRC_MOD / "mod.ts").write_text(barrel)
    print(f"  Wrote src/mod/mod.ts (barrel, {len(barrel)}B)")


def _to_filename(cls: str) -> str:
    """Convert class name to a sensible filename."""
    # e.g. CTSGun -> guns (we already have weapons.ts for CTSGun, so skip)
    # e.g. CTSGameRules -> gamerules
    # e.g. CTSGroundWeapon -> ground-weapon
    mapping = {
        "CTSGun": "guns",  # primary weapon class
        "CTSGameRules": "gamerules",
        "CTSAnimation": "animation",
        "CTSStunt": "stunt",
        "CBasePlayer": "player",
        "CTSKnife": "knife",
        "CTSWorldGun": "world-gun",
        "CTSFlag": "flag",
        "CTSBriefcase": "briefcase",
        "CTSBomb": "bomb",
        "CTSHack": "hack",
        "CTSPowerUp": "powerup",
        "CTSGroundWeapon": "ground-weapon",
        "CTSSellZone": "sellzone",
        "CTSDMHill": "dmhill",
        "CTSTeamEscape": "team-escape",
        "CTSWind": "wind",
        "CTSObjective": "objective",
        "CTSObjectiveManager": "objective-manager",
        "CTSWinGiver": "win-giver",
        "CTSMapGlobals": "map-globals",
        "CTSPhysicObject": "physic-object",
        "CTSTrigger": "trigger",
        "CTSTimer": "timer",
        "CTSCustomTarget": "custom-target",
        "CTSSharedEmitter": "shared-emitter",
        "CTSParticle": "particle",
        "CTSObjectivePointer": "objective-pointer",
        "CTSShrapnel": "shrapnel",
        "CTSPlayerAmount": "player-amount",
        "CTSSMGAmmo": "smg-ammo",
        "CTSSMGWeapon": "smg-weapon",
        "CTSShotgunWeapon": "shotgun-weapon",
        "CTSEffector": "effector",
        "CTSOBSERVER": "observer",
        "CTSAmmoPack": "ammo-pack",
        "CTSDeadCorpse": "dead-corpse",
        "CTSGroundAmmo": "ground-ammo",
        "CTSModel": "model",
        "CTSScoreGiver": "score-giver",
        "CTSSlowMotion": "slowmo",  # already exists
        "CTSSlowMotionPoint": "slowmo-point",  # already exists
        "CHalfLifeMultiplay": "multiplay",  # in scoring.ts
        "CTSEmitter": "emitter",
        "CTSFog": "fog",
        "CTSSuperJump": "super-jump",
        "CTSBigPistolAmmo": "big-pistol-ammo",
        "CTSPistolAmmo": "pistol-ammo",
        "CTSSniperAmmo": "sniper-ammo",
        "CTSShotgunAmmo": "shotgun-ammo",
        "CTSRifleAmmo": "rifle-ammo",
        "CTSBigPistolWeapon": "big-pistol-weapon",
        "CTSPistolWeapon": "pistol-weapon",
        "CTSSniperWeapon": "sniper-weapon",
        "CTSGrenadeWeapon": "grenade-weapon",
        "CTSKatanaWeapon": "katana-weapon",
        "CTSMGWeapon": "mg-weapon",
        "CTSKnifeWeapon": "knife-weapon",
        "CTSRifleWeapon": "rifle-weapon",
        "CTSSMGWeapon": "smg-weapon",  # dup
        "CTSShotgunWeapon": "shotgun-weapon",  # dup
        "GiveFnptrsToDll": "give-fnptrs",
        "GetEntityAPI": "get-entity-api",
        "GetEntityAPI2": "get-entity-api2",
        "GetNewDLLFunctions": "get-new-dll-functions",
        "CTSGrenade": "grenade",
    }
    return mapping.get(cls, cls.lower())


if __name__ == "__main__":
    main()
