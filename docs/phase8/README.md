# SIGNAL MACHINES — Phase 8: REUSE (development candidate)

## Working idea

A performance is also material for another performance. Don't turn the instrument into a DAW or a conventional phrase looper. Let imperfect sound leave its original circuit and return as a different object.

### New actions in the existing LOOP module

- **→ FOUND** copies the current recorded / imported / overdubbed LOOP to a new autonomous sample explorer.
- **→ CUTS** copies the same LOOP into a separate sample-event instrument.
- The original LOOP is unchanged and continues playing with its previous controls.
- Both new modules are created **without cables**. The player chooses what to excite, connect, and feed back. No automatic beat alignment, quantization or sound normalization.
- Up to two FOUND/CUTS combined and 48 modules per patch; valid audio up to 16s.
- Snapshots use exactly the existing PCM export format: locally stored PCM16 stereo WAV, re-imported at FOUND's 24kHz analysis rate.
- The new audio is saved to the browser's local IndexedDB storage when available; otherwise session only, with an explicit warning.
- Patches saved as JSON store a sample reference **not the actual audio bytes**. Keep a WAV export if portability or sharing is required.
- No new DSP modules, audio effect, arbitrary new palette element or changes to the 20 current presets.

### Short intended musical workflow

1. Create a strange live texture with the existing modular system.
2. Feed it into LOOP, record a short section, optionally DUB/reverse/slow.
3. Select **→ FOUND** to explore that loop as a changing material, or **→ CUTS** for short irregular attacks.
4. Wire the new module's AUDIO output into another resonator, processor or OUTPUT, while the original sound continues.

The sound is not made cleaner. Its history changes, and its relationship to other sounds becomes playable.

### Rollout

Do not merge this branch until CI passes. On a real browser, audition the two transfers, recording/reloading samples after refresh, patch-switch race behavior, Safari memory and permission behavior, and multiple saved patches. Retain the existing CLASSIC voice behavior.

The broader Phase 8 can later explore explicit resampling into LOOP from other modules, but should first establish that this small reuse gesture is musically useful.
