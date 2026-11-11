// THE PERF PROFILE'S FIREFOX PREFS.
//
// This is the DEDICATED PERF PROFILE on the gaming PC (~/opt/bb-ff).
// It is not the player's own Firefox, and nothing here touches a normal
// browsing profile.
//
// ---------------------------------------------------------------------------
// 1. THE SCRIPT RUN-TIME WATCHDOG
// ---------------------------------------------------------------------------
// The engine's WASM in Firefox was TERMINATED mid-game with
//
//     Script terminated by timeout at: <the client bundle>
//
// and then the browser went down with the client's rAF shim throwing
// every frame. "Script terminated by timeout" is Firefox's script
// run-time watchdog: a main-thread call that runs longer than
// `dom.max_script_run_time` is interrupted — and when that call is
// inside WebAssembly, the whole WASM execution dies with it.
//
// THE FIRST ATTEMPT AT THIS PREF WAS A NO-OP, AND THE PREFS.JS IS THE
// PROOF. The pref was written as `0` ("disable the watchdog") and Firefox
// IGNORED it: the profile's `prefs.js` came back with
//
//     user_pref("dom.max_script_run_time.require_critical_input", false);
//
// and NO `dom.max_script_run_time` line at all — while the second pref
// from the same file landed perfectly. A value outside the pref's static
// range is refused outright, and this pref's range starts at 1. **So `0`
// does not disable the watchdog; it is not a value the pref will take.**
// The pref is RAISED instead.
//
// 3600 seconds. The default is 10, and a ten-second main-thread block
// inside the engine is what kills it. Raising the limit turns "the engine
// dies" into "the game pauses", which is the difference between a lost
// session and a slow one.
//
// `require_critical_input` — the watchdog only fires when the browser is
// NOT receiving input. Off, because a player holding the mouse down and
// moving is exactly the case where the watchdog's assumption ("nobody is
// interacting, so this must be a hang") is wrong.
user_pref("dom.max_script_run_time", 3600);
user_pref("dom.max_script_run_time.require_critical_input", false);

// ---------------------------------------------------------------------------
// 2. THE MICROPHONE IS BLOCKED, AND THAT IS A DELIBERATE CHOICE
// ---------------------------------------------------------------------------
// The client calls `navigator.mediaDevices.getUserMedia({ audio: true })`
// on the WebRTC peer-to-peer path, and Firefox then asks the PLAYER with
// a modal prompt that sits on top of the game and can swallow a click —
// and a measurement run that cannot be sure its clicks land is not a
// measurement run.
//
// THE VALUE MATTERS: Firefox's `permissions.default.*` prefs use
//
//     1 = allow, 2 = block, 3 = ask (the default)
//
// — NOT 0. Setting 0 is invalid, so the pref was ignored and the prompt
// kept coming back, which is exactly what happened the first time this
// was written.
//
// Block, not allow: this profile runs on a machine with a real microphone
// in a real room, and a measurement client has no business opening it.
// The game does not need it — it connects to the dedicated server over
// the game's own protocol, and it plays fine with the permission
// unanswered (verified: the loadout screen came up and the bots were
// playing with the prompt still open).
user_pref("permissions.default.microphone", 2);

// ---------------------------------------------------------------------------
// 3. THE GPU, BY ITS REAL NAME
// ---------------------------------------------------------------------------
// Firefox reports the renderer as
//
//     Radeon R9 200 Series, or similar
//
// which is Firefox's MASK — it matches its own GPU strings for hardware
// it does not recognise. The client's own Export log names the GPU, and
// in Firefox it names that mask, so the in-game readout cannot say which
// card the player is on.
//
// `webgl.enable-renderer-query` is the narrow, documented knob for it,
// and it does NOT work on Firefox 159: with it set, the renderer still
// came back masked. `privacy.fingerprintingProtection = false` was tried
// alongside it and the mask survived that too — so the mask is not a
// pref left unset, and this build does not let a user unmask it.
//
// `privacy.fingerprintingProtection` is therefore NOT set here. It is a
// broad privacy control, it was not shown to buy anything, and a perf
// profile has no reason to relax fingerprinting protection for a guess.
//
// WHICH MEANS: in Firefox the client's own Export log — which reads the
// renderer the same way — names a GPU that is not the player's. On
// Chromium it names the real card. The readout should say "masked by
// the browser" rather than name a fake card.
user_pref("webgl.enable-renderer-query", true);
