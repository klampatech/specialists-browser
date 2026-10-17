  // Emit randomized beep via EMIT_SOUND_DYN.
  //   edict*    = pev->owner  (pev+0x208)
  //   channel   = 6           (CHAN_VOICE)
  //   sample    = string at [ebx-0x6ce04]
  //   volume    = RANDOM_FLOAT(0.92, 1.0)   // <-- randomized, not 1.0
  //   attenuation = 1.25
  //   flags     = 0
  //   pitch     = 98 + RANDOM_LONG(0, 3)
  // The asm shuffles args via sub esp / fstp [esp] tricks, so the
  // random_float result ends up in the volume slot before the call.
  const pitch = 98 + RANDOM_LONG(0, 3);
  const volume = RANDOM_FLOAT(0.92, 1.0);
  EMIT_SOUND_DYN(
    pev.owner,    // pev+0x208
    6,            // CHAN_VOICE
    beepSound,    // string at [ebx-0x6ce04]
    volume,       // RANDOM_FLOAT(0.92, 1.0)
    1.25,         // attenuation
    0,            // flags
    pitch         // 98 + RANDOM_LONG(0, 3)
  );
