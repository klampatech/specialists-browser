/**
 * D.5.5 — GoldSrc engine simulator (v1: logging stub).
 *
 * The decompiled code from `ts_i386.so` is GoldSrc engine code. It
 * expects a global `g_engfuncs` function table, a `gpGlobals` state
 * struct, and various utility functions (vec3_*, sprintf, etc.).
 *
 * This module provides a working `g_engfuncs` and `gpGlobals` that
 * LOG every call to the browser console. The goal: prove the decompiled
 * code is running, and surface the engine surface area it uses so we
 * can implement them one at a time.
 *
 * After v1 (logging), v2 will turn the logs into real behavior:
 *   - pfnEmitSound → GameAudio
 *   - pfnSetModel → record entity→model mapping
 *   - pfnMessageBegin/End + pfnWrite* → network message dispatch
 *   - pfnTraceLine → Babylon raycast
 *   - pfnPrecacheModel/Sound → asset registry
 *   - pfnRandomLong → Math.random
 *   - pfnGetCvarFloat → CVAR registry
 *
 * And after that, v3 will add the entity pool, then v4 the network
 * layer, then v5 the console, etc. — incrementally building out a
 * real GoldSrc-compatible engine in TypeScript.
 */

import { Vector3 } from "./types";

// ───────────────────────────────────────────────────────────────
// Logging utility
// ───────────────────────────────────────────────────────────────

let LOG_ENABLED = true;
let LOG_PREFIX = "[engine]";

export function engineLog(...args: any[]): void {
  if (LOG_ENABLED) {
    console.log(LOG_PREFIX, ...args);
  }
}

export function setEngineLogging(enabled: boolean, prefix?: string): void {
  LOG_ENABLED = enabled;
  if (prefix) LOG_PREFIX = prefix;
}

// ───────────────────────────────────────────────────────────────
// gpGlobals — global game state
// ───────────────────────────────────────────────────────────────

interface GlobalVars {
  time: number;          // game time (seconds since start)
  frametime: number;     // time between server ticks
  maxClients: number;
  max_edicts: number;
  mapname: string;
  startspot: string;
  deathmatch: number;    // 0/1
  coop: number;          // 0/1
  teamplay: number;
  serverflags: number;
  trace_flags: number;
  skill: number;
  /** String table base for the engine's string_t offset encoding. */
  pStringBase: number;
  /** Last view forward vector (set by MAKE_VECTORS). */
  v_forward: Vector3;
  v_right: Vector3;
  v_up: Vector3;
  /** Internal field, used by some methods. */
  style: number;
  field_0x28: number;
  internal: number;
  like: number;
  // ... more fields
}

const _gpGlobals: GlobalVars = {
  time: 0,
  frametime: 0.016,
  maxClients: 32,
  max_edicts: 2048,
  mapname: "ts_heresy",
  startspot: "0",
  deathmatch: 1,
  coop: 0,
  teamplay: 0,
  serverflags: 0,
  trace_flags: 0,
  skill: 1,
  pStringBase: 0,
  v_forward: { x: 0, y: 0, z: 1 },
  v_right: { x: 1, y: 0, z: 0 },
  v_up: { x: 0, y: 1, z: 0 },
  style: 0,
  field_0x28: 0,
  internal: 0,
  like: 0,
};

export const gpGlobals: GlobalVars = _gpGlobals;

/** Tick the global game state. Called once per server frame. */
export function tickGpGlobals(dt: number): void {
  _gpGlobals.frametime = dt;
  _gpGlobals.time += dt;
}

// ───────────────────────────────────────────────────────────────
// String table — for the engine's string_t offset encoding
// ───────────────────────────────────────────────────────────────

const _stringTable: string[] = [""];
const _stringLookup = new Map<string, number>();

function internString(s: string): number {
  if (s === "") return 0;
  let idx = _stringLookup.get(s);
  if (idx !== undefined) return idx;
  idx = _stringTable.length;
  _stringTable.push(s);
  _stringLookup.set(s, idx);
  return idx;
}

export function STRING(offset: number): string {
  if (offset < 0 || offset >= _stringTable.length) return "";
  return _stringTable[offset];
}

export function MAKE_STRING(s: string): number {
  return internString(s);
}

/** C++ macro `STRING()` in HLSDK expands to engine string-tables. */
export function STRING_FROM_PTR(s: string): number {
  return internString(s);
}

// ───────────────────────────────────────────────────────────────
// Utility functions
// ───────────────────────────────────────────────────────────────

export function vec3_add(a: Vector3, b: Vector3, out?: Vector3): Vector3 {
  const r = out ?? { x: 0, y: 0, z: 0 };
  r.x = a.x + b.x;
  r.y = a.y + b.y;
  r.z = a.z + b.z;
  return r;
}

export function vec3_sub(a: Vector3, b: Vector3, out?: Vector3): Vector3 {
  const r = out ?? { x: 0, y: 0, z: 0 };
  r.x = a.x - b.x;
  r.y = a.y - b.y;
  r.z = a.z - b.z;
  return r;
}

export function vec3_scale(a: Vector3, s: number, out?: Vector3): Vector3 {
  const r = out ?? { x: 0, y: 0, z: 0 };
  r.x = a.x * s;
  r.y = a.y * s;
  r.z = a.z * s;
  return r;
}

export function vec3_length(a: Vector3): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

export function vec3_normalize(a: Vector3, out?: Vector3): Vector3 {
  const r = out ?? { x: 0, y: 0, z: 0 };
  const len = vec3_length(a);
  if (len > 0) {
    r.x = a.x / len;
    r.y = a.y / len;
    r.z = a.z / len;
  } else {
    r.x = 0; r.y = 0; r.z = 0;
  }
  return r;
}

let _sprintfBuffer: string[] = [];

/** Minimal sprintf (supports %d, %f, %s, %x, %%). */
export function sprintf(fmt: string, ...args: any[]): string {
  let argIdx = 0;
  return fmt.replace(/%([-+0 #]*)([0-9]*)(?:\.([0-9]+))?([dfxsoX%])/g, (_match, _flags, _width, _prec, type) => {
    if (type === "%") return "%";
    const arg = args[argIdx++];
    switch (type) {
      case "d": return String(parseInt(arg, 10));
      case "f": {
        const prec = _prec ? parseInt(_prec, 10) : 6;
        return parseFloat(arg).toFixed(prec);
      }
      case "x": return parseInt(arg, 10).toString(16);
      case "X": return parseInt(arg, 10).toString(16).toUpperCase();
      case "s": return String(arg);
      case "o": return parseInt(arg, 10).toString(8);
    }
    return _match;
  });
}

// ───────────────────────────────────────────────────────────────
// Message registry (gmsg*)
// ───────────────────────────────────────────────────────────────

interface UserMsg {
  id: number;
  name: string;
}

const _userMsgs = new Map<string, number>();
let _nextMsgId = 64;

export function registerUserMsg(name: string, size: number): number {
  if (_userMsgs.has(name)) return _userMsgs.get(name)!;
  const id = _nextMsgId++;
  _userMsgs.set(name, id);
  return id;
}

export function lookupUserMsg(name: string): number {
  return _userMsgs.get(name) ?? -1;
}

export const MSG_TYPES = {
  MSG_ONE: 1,           // one client
  MSG_ALL: 2,           // all clients
  MSG_BROADCAST: 3,     // broadcast (all + console)
  MSG_ONE_UNRELIABLE: 4,// one client, unreliable
  MSG_PVS: 5,           // all clients in PVS
  MSG_PAS: 6,           // all clients in PAS
} as const;

// ───────────────────────────────────────────────────────────────
// CVAR registry
// ───────────────────────────────────────────────────────────────

interface Cvar {
  name: string;
  value: number;
  string: string;
  flags: number;
}

const _cvars = new Map<string, Cvar>();

export function registerCvar(name: string, value: string | number, flags = 0): number {
  const numeric = typeof value === "number" ? value : parseFloat(value);
  _cvars.set(name, { name, value: numeric, string: String(value), flags });
  return _cvars.size;
}

export function getCvarFloat(name: string): number {
  return _cvars.get(name)?.value ?? 0;
}

export function setCvarFloat(name: string, value: number): void {
  const c = _cvars.get(name);
  if (c) {
    c.value = value;
    c.string = String(value);
  } else {
    _cvars.set(name, { name, value, string: String(value), flags: 0 });
  }
}

export function setCvarString(name: string, value: string): void {
  const c = _cvars.get(name);
  if (c) {
    c.string = value;
    c.value = parseFloat(value);
  } else {
    _cvars.set(name, { name, value: parseFloat(value) || 0, string: value, flags: 0 });
  }
}

// Initialize TS-specific cvars referenced in decompiled code
registerCvar("cvar_spectacular", 1);
registerCvar("sv_maxvelocity", 2000);
registerCvar("sv_gravity", 800);

// ───────────────────────────────────────────────────────────────
// g_engfuncs — the engine function table
// ───────────────────────────────────────────────────────────────

/** Handlers can be installed to receive engine events. */
export interface EngineHandlers {
  onEmitSound?: (ent: any, channel: number, sample: string, volume: number, attenuation: number, flags: number, pitch: number) => void;
  onSetModel?: (ent: any, modelName: string) => void;
  onTraceLine?: (start: Vector3, end: Vector3, flags: number, ignoreEnt: any) => TraceResult;
  onMessageBegin?: (msgType: number, msgId: number, origin: Vector3, client: any) => void;
  onMessageEnd?: () => void;
  onPlaybackEvent?: (flags: number, eventIndex: number, delay: number, origin: Vector3, angles: Vector3, fparam1: number, fparam2: number, iparam1: number, iparam2: number, bparam1: number, bparam2: number, ent: any) => void;
  onPrecacheModel?: (name: string) => number;
  onPrecacheSound?: (name: string) => number;
  onAlertMessage?: (level: number, msg: string) => void;
  onChangeLevel?: (map: string) => void;
  onClientPrintf?: (client: any, level: number, msg: string) => void;
  onRemoveEntity?: (ent: any) => void;
  onCreateEntity?: () => any;
  onSetOrigin?: (ent: any, origin: Vector3) => void;
  onSetSize?: (ent: any, mins: Vector3, maxs: Vector3) => void;
  onDropToFloor?: (ent: any) => number;
}

let _handlers: EngineHandlers = {};

export function setEngineHandlers(handlers: EngineHandlers): void {
  _handlers = { ..._handlers, ...handlers };
}

export interface TraceResult {
  fraction: number;
  endPos: Vector3;
  hit: any;            // entity hit, or null
  planeNormal: Vector3;
  planeDist: number;
  hitGroup: number;
}

// Current message being written (for writeByte/Short/String)
let _currentMessage: { type: number; id: number; data: (number | string)[] } | null = null;

/** Build the g_engfuncs table. */
function buildEngFuncs() {
  return {
    // pfnSetModel(pev, modelname)
    pfnSetModel: (pev: any, modelName: string) => {
      engineLog(`pfnSetModel(pev=${pev?.classname ?? "?"}, model="${modelName}")`);
      _handlers.onSetModel?.(pev, modelName);
    },

    // pfnEmitSound(ent, channel, sample, volume, attenuation, flags, pitch)
    pfnEmitSound: (ent: any, channel: number, sample: string, volume: number, attenuation: number, flags: number, pitch: number) => {
      engineLog(`pfnEmitSound(ent=${ent?.classname ?? "?"}, ch=${channel}, sample="${sample}", vol=${volume}, attn=${attenuation}, flags=${flags}, pitch=${pitch})`);
      _handlers.onEmitSound?.(ent, channel, sample, volume, attenuation, flags, pitch);
    },

    // pfnPlaybackEvent(flags, eventIndex, delay, origin, angles, fparam1, fparam2, iparam1, iparam2, bparam1, bparam2, ent)
    pfnPlaybackEvent: (flags: number, eventIndex: number, delay: number, origin: Vector3, angles: Vector3, fparam1: number, fparam2: number, iparam1: number, iparam2: number, bparam1: number, bparam2: number, ent: any) => {
      engineLog(`pfnPlaybackEvent(event=${eventIndex}, ent=${ent?.classname ?? "?"})`);
      _handlers.onPlaybackEvent?.(flags, eventIndex, delay, origin, angles, fparam1, fparam2, iparam1, iparam2, bparam1, bparam2, ent);
    },

    // pfnPrecacheModel(name) -> model index
    pfnPrecacheModel: (name: string): number => {
      engineLog(`pfnPrecacheModel("${name}")`);
      return _handlers.onPrecacheModel?.(name) ?? 0;
    },

    // pfnPrecacheSound(name) -> sound index
    pfnPrecacheSound: (name: string): number => {
      engineLog(`pfnPrecacheSound("${name}")`);
      return _handlers.onPrecacheSound?.(name) ?? 0;
    },

    // pfnAlertMessage(level, msg)
    pfnAlertMessage: (level: number, msg: string) => {
      engineLog(`pfnAlertMessage(level=${level}, msg="${msg}")`);
      _handlers.onAlertMessage?.(level, msg);
    },

    // pfnMessageBegin(msg_type, msg_id, origin, client)
    pfnMessageBegin: (msgType: number, msgId: number, origin: Vector3, client: any) => {
      engineLog(`pfnMessageBegin(type=${msgType}, msgId=${msgId}, origin=${JSON.stringify(origin)}, client=${client?.classname ?? "?"})`);
      _currentMessage = { type: msgType, id: msgId, data: [] };
      _handlers.onMessageBegin?.(msgType, msgId, origin, client);
    },

    // pfnMessageEnd()
    pfnMessageEnd: () => {
      engineLog(`pfnMessageEnd()`);
      _currentMessage = null;
      _handlers.onMessageEnd?.();
    },

    // pfnWriteByte(b)
    pfnWriteByte: (b: number) => {
      if (_currentMessage) _currentMessage.data.push(b & 0xff);
    },

    // pfnWriteShort(s)
    pfnWriteShort: (s: number) => {
      if (_currentMessage) _currentMessage.data.push(s & 0xffff);
    },

    // pfnWriteLong(l)
    pfnWriteLong: (l: number) => {
      if (_currentMessage) _currentMessage.data.push(l | 0);
    },

    // pfnWriteString(s)
    pfnWriteString: (s: string) => {
      if (_currentMessage) _currentMessage.data.push(s);
    },

    // pfnWriteFloat(f)
    pfnWriteFloat: (f: number) => {
      if (_currentMessage) _currentMessage.data.push(f);
    },

    // pfnWriteAngle(f)  -- 16-bit fixed-point angle
    pfnWriteAngle: (f: number) => {
      if (_currentMessage) _currentMessage.data.push((f * 65536 / 360) & 0xffff);
    },

    // pfnWriteCoord(f)  -- 16-bit fixed-point coord
    pfnWriteCoord: (f: number) => {
      if (_currentMessage) _currentMessage.data.push((f * 8) & 0xffff);
    },

    // pfnRandomLong(min, max)
    pfnRandomLong: (min: number, max: number) => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // pfnGetCvarFloat(name)
    pfnGetCvarFloat: (name: string) => {
      return getCvarFloat(name);
    },

    // pfnChangeLevel(map)
    pfnChangeLevel: (map: string) => {
      engineLog(`pfnChangeLevel("${map}")`);
      _handlers.onChangeLevel?.(map);
    },

    // pfnClientPrintf(client, level, msg)
    pfnClientPrintf: (client: any, level: number, msg: string) => {
      engineLog(`pfnClientPrintf(client=${client?.classname ?? "?"}, level=${level}, msg="${msg}")`);
      _handlers.onClientPrintf?.(client, level, msg);
    },

    // pfnRemoveEntity(ent)
    pfnRemoveEntity: (ent: any) => {
      engineLog(`pfnRemoveEntity(ent=${ent?.classname ?? "?"})`);
      _handlers.onRemoveEntity?.(ent);
    },

    // pfnCreateEntity() -> ent
    pfnCreateEntity: () => {
      engineLog(`pfnCreateEntity()`);
      return _handlers.onCreateEntity?.() ?? null;
    },

    // pfnSetOrigin(ent, origin)
    pfnSetOrigin: (ent: any, origin: Vector3) => {
      engineLog(`pfnSetOrigin(ent=${ent?.classname ?? "?"}, origin=${JSON.stringify(origin)})`);
      _handlers.onSetOrigin?.(ent, origin);
    },

    // pfnSetSize(ent, mins, maxs)
    pfnSetSize: (ent: any, mins: Vector3, maxs: Vector3) => {
      engineLog(`pfnSetSize(ent=${ent?.classname ?? "?"}, mins=${JSON.stringify(mins)}, maxs=${JSON.stringify(maxs)})`);
      _handlers.onSetSize?.(ent, mins, maxs);
    },

    // pfnDropToFloor(ent) -> 1 if successful
    pfnDropToFloor: (ent: any) => {
      engineLog(`pfnDropToFloor(ent=${ent?.classname ?? "?"})`);
      return _handlers.onDropToFloor?.(ent) ?? 0;
    },

    // pfnTraceLine(...)
    pfnTraceLine: (start: Vector3, end: Vector3, flags: number, ignoreEnt: any) => {
      const result = _handlers.onTraceLine?.(start, end, flags, ignoreEnt) ?? {
        fraction: 1.0,
        endPos: { x: end.x, y: end.y, z: end.z },
        hit: null,
        planeNormal: { x: 0, y: 0, z: 0 },
        planeDist: 0,
        hitGroup: 0,
      };
      return result;
    },

    // pfnGetGameDir() -> string
    pfnGetGameDir: () => "valve",

    // pfnGetMaxClients() -> int
    pfnGetMaxClients: () => _gpGlobals.maxClients,
  };
}

/**
 * The decompiled code references `g_engfuncs` as a free identifier
 * in the module scope. We need to either:
 *   (a) install a real `g_engfuncs` in a global namespace the decomp can see
 *   (b) pass it as an argument
 *   (c) use TS's `globalThis` to make it ambient
 *
 * For now, we provide a `getEngFuncs()` accessor and an `installGlobals()`
 * function that sets `g_engfuncs` and `gpGlobals` on globalThis so the
 * decompiled code (which uses bare identifiers) can find them.
 */
export const g_engfuncs = buildEngFuncs();

/** Install g_engfuncs + gpGlobals into globalThis so decompiled code can find them. */
export function installGlobals(): void {
  (globalThis as any).g_engfuncs = g_engfuncs;
  (globalThis as any).gpGlobals = gpGlobals;
  (globalThis as any).engine = g_engfuncs; // some methods use engine.X
}

/** Statistics on how many times each engine function was called. */
const _callStats = new Map<string, number>();
let _statsEnabled = false;

export function enableCallStats(enabled: boolean): void {
  _statsEnabled = enabled;
}

export function getCallStats(): Map<string, number> {
  return new Map(_callStats);
}
