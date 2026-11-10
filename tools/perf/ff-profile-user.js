// THE PERF PROFILE'S FIREFOX PREFS.
//
// WHY THESE EXIST
// ---------------
// The engine's WASM in Firefox was TERMINATED mid-game with
//
//     Script terminated by timeout at: <the client bundle>
//
// and then the browser went down with the client's rAF shim throwing
// every frame. "Script terminated by timeout" is Firefox's **script
// run-time watchdog**: a main-thread call that runs longer than
// `dom.max_script_run_time` is interrupted.
//
// **THE FIRST ATTEMPT AT THIS PREF WAS A NO-OP, AND THE PREFS.JS IS
// THE PROOF.** The pref was written as `0` ("disable the watchdog") and
// Firefox **ignored it**: the profile's `prefs.js` came back with
//
//     user_pref("dom.max_script_run_time.require_critical_input", false);
//
// and NO `dom.max_script_run_time` line at all — while the second pref
// from the same file landed perfectly. A value outside the pref's
// static range is refused outright, and this pref's range starts at 1.
// **So `0` does not disable the watchdog; it is not a value the pref
// will take.** The pref is RAISED instead.
//
// THE PREFS
// ---------
// `dom.max_script_run_time` — 3600 seconds. The default is 10, and a
// ten-second main-thread block inside the engine is what kills it.
// Raising the limit turns "the engine dies" into "the game pauses",
// which is the difference between a lost session and a slow one.
//
// `dom.max_script_run_time.require_critical_input` — the watchdog only
// fires when the browser is NOT receiving input. Off, because a player
// holding the mouse down and moving is exactly the case where the
// watchdog's assumption ("nobody is interacting, so this must be a
// hang") is wrong.
//
// THIS IS THE DEDICATED PERF PROFILE (`~/opt/bb-ff`), NOT THE
// PLAYER'S OWN FIREFOX. Nothing here touches a normal browsing
// profile.
user_pref("dom.max_script_run_time", 3600);
user_pref("dom.max_script_run_time.require_critical_input", false);


# THE MICROPHONE IS BLOCKED, AND THAT IS A DELIBERATE CHOICE.
#
# The client calls `navigator.mediaDevices.getUserMedia({audio: true})`
# on the WebRTC peer-to-peer path, and Firefox then asks the PLAYER with
# a modal prompt that sits on top of the game and can swallow a click.
# A measurement run that cannot be sure its clicks land is not a
# measurement run.
#
# THE VALUE MATTERS: Firefox's `permissions.default.*` prefs use
#   1 = allow, 2 = block, 3 = ask (the default)
# — NOT 0. Setting 0 is invalid, so the pref was ignored and the
# prompt kept coming back, which is exactly what happened the first
# time this was written.
#
# Block, not allow: this profile runs on a machine with a real
# microphone in a real room, and a measurement client has no business
# opening it. The game does not need it — it plays fine with the
# permission unanswered.
user_pref("permissions.default.microphone", 2);
