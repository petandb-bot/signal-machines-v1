# SIGNAL MACHINES — INTEGRITY, not polish (v0.25 candidate)

## What is deliberately unchanged

- 20 curated patches and 42 archived patches
- All original sound-producing DSP module sources and parameter mappings
- The deliberately noisy and quantized CHIP, CRUSH, FUZZ, etc.
- RESON, PLATE and CHAMBER spectral character
- The existing 0.63 amplitude-ceiling soft saturation
- The current patch JSON format, storage, recording file formats and UI layout

The earlier **Sonic Refinement PR #23** proposed CLEAN/FOCUS/CLEAR alternate tones. The listener preferred the originals. That branch is **not** part of this update.

## Actual protections

### Recording boundary fades

Downloadable **WAV and AIFF PCM24** files now receive an approximately **3ms raised-cosine taper** at their *beginning and end* in `AudioEngine.finishPcm()`.

This prevents a normal take from ending abruptly at an arbitrary nonzero sample. Only the first/last 3ms change. Existing middle samples, dynamic transients, unconventional waveforms and internal crackles remain byte-for-byte untouched.

This is applied on export **after** recording; it does not touch the real-time audio stream and is not applied to compressed MediaRecorder output. `PcmRecording.finish()` without the opt-in option remains sample-identical for existing programmatic callers. The taper is bounded at short take lengths and works across an arbitrary number of recording chunks.

### Headroom and transient diagnostics

`DSPGraph` keeps its **exact existing summation and tanh formula**. New scalar counters, sampled with existing telemetry:

- **Master drive peak**: maximum post-master-gain, pre-saturation amplitude
- **Near-ceiling fraction**: portion of frames whose input would put the existing tanh output above 95% of its 0.63 ceiling
- **Largest one-sample step**: maximum stereo sample-to-sample difference, for diagnosis only

Hovering the existing master meter shows these measurements. No new visible screen controls or automatic loudness normalization. A high derivative is *not* automatically considered a fault: abrupt CHIP transitions and digital interference can be musically intentional.

A "hot sum" metric identifies repeated soft saturation when many sources feed OUTPUT, but **no new limiter** is inserted and master level/preset gain is left to the performer.

### Continuous DSP stress

`scripts/stress-integrity.mjs` renders representative long sections at 44.1 and 48 kHz, repeatedly updates parameters and triggers routing refreshes, checks PCM finiteness, faults, headroom and persistent typed-buffer size. It then simulates a six-hour sample-counter offset and renders another two seconds to expose accidental long-time integer/state issues.

The large counter test **does not** constitute six hours of continuous physical playback. The CI results **do not** constitute a real iPhone Safari benchmark or human audition.

## Commands

```bash
npm ci
npm test
npm run build
npm run verify:build
node scripts/stress-integrity.mjs
```

The PR workflow uploads `integrity-soak`, containing a detailed JSON report. No long WAVs are committed.

## Acceptance

- No change to preset JSON, original DSP classes, recorded interior PCM, or current live master output
- Explicit cut-edge taper for WAV and AIFF while unchanged `PcmRecording.finish()` remains bit-exact
- 44.1/48kHz heavy-layered master never exceeds existing 0.63 ceiling; near-ceiling diagnostics describe saturation rather than suppressing it
- Finite audio, no unexpectedly increasing DSP buffer memory, no faults in stress scenarios
- Preserve existing virtual worklet and legacy PCM comparisons
- Code review and CI approval prior to any release

This is about making a strange instrument more dependable, **not making it polite**.
