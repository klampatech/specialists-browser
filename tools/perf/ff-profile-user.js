// THE PERF PROFILE'S FIREFOX PREFS.
//
// WHY THESE EXIST
// ---------------
// The engine's WASM in Firefox was TERMINATED mid-game with
//
//     Script terminated by timeout at:
//     _emscripten_glEnableVertexAttribArray@xash3d-...js
//
// and then the browser went down with the client's rAF shim throwing
// every frame. "Script terminated by timeout" is Firefox's **script
// run-time watchdog**: a single main-thread call that runs longer than
// `dom.max_script_run_time` gets interrupted, and when the call is
// inside WebAssembly the whole WASM execution is killed with it.
//
// So the watchdog killed the engine. Whether the underlying stall
// (a GL call that blocked for ten seconds) has its own cause is a
// separate question — but with the watchdog off, a stall is a stall and
// not a dead game.
//
// THE PREFS
// ---------
// `dom.max_script_run_time` — 0 disables the watchdog. Firefox's
// default is 10 (seconds).
// `dom.max_script_run_time.require_critical_input` — the watchdog only
// fires when the browser is NOT receiving input. Off, because a player
// holding the mouse down and moving is exactly the case where the
// watchdog's assumption ("nobody is interacting, so this must be a
// hang") is wrong.
//
// THIS IS THE DEDICATED PERF PROFILE (`~/opt/bb-ff`), NOT THE
// PLAYER'S OWN FIREFOX. Nothing here touches a normal browsing
// profile.
user_pref("dom.max_script_run_time", 0);
user_pref("dom.max_script_run_time.require_critical_input", false);
