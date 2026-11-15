# Phase 3.1A — excitation audit before changes

Base: PR15 dbde9d89 (local identical tree d305a2c), not main. PR13/14/15 are open. The Phase3 source is copied byte-for-byte to `tests/fixtures/sympathy-phase3-source.txt` for reproducible old/new builds. No other branch or public deployment is changed.

Read Sympathy.ts, MachineSafety.ts, render-sympathy.mjs, Phase3 measurements/performance and all Sympathy tests. Existing raw default measurements reproduce the supplied figures: CHIP RMS .00179490, metal .00106202,2ms pulse .000120678, noise .0000823091, CUTS .0000214119. Those are8s integrated RMS with silence, not event-level loudness verdicts.

## Why responses differ

The audio momentum force is1.8(1−exp(−gamma/fs))x, split around the passive update. At BODY=.42, amplitude T60≈1.209s, gamma≈5.716/s and the48kHz coefficient≈.000214/sample. A2ms input has only96 force increments; a sustained near-resonant tone can build energy over many cycles. Most quiet high-frequency fragment energy is also away from the three resonances. This is principally an excitation/time-frequency limitation, not a broken energy exchange.

TRIG instead admits a direct momentum increment of up to .36 (subject to the existing mallet budget). It bypasses the tiny per-sample force accumulation and already creates a clear body response. Its excitation, recovery and budget should remain unchanged.

The output uses .27×(.86p0+.43p1+.25p2), with body1/2 exchanged on the right, followed by a3Hz DC blocker. Body0 dominates the pickup, so energy moving to an indirectly excited body can become less audible. Raising .27 would merely magnify everything and would not improve the audio-to-state relation. Its current norm already leaves useful headroom.

[audit.json](audit.json) records24/44.1/48kHz, pulse lengths, low/resonant/high tones, TRIG,50ms/100–300ms windows and peak stored energy. It was generated before editing the DSP. A change in pickup cannot fix the weak stored-energy response of a short input; excitation and pickup must be evaluated separately.

## Candidate design to validate

Keep all passive oscillator/exchange/damping/TRIG code intact. Keep the direct signed pressure drive. Add a second, orthogonal boundary-displacement drive proportional to the positive crest above a12ms rectified input follower. It is a continuous waveform-derived contact signal, not a detected event replay, AGC or normalized trigger. It vanishes immediately when the input is zero. It scales with signal amplitude: small inputs remain small. No noise, dry feedthrough, delay, output compression or new control is added.

Bound only the work admitted through the audio port, using the incoming sample's squared amplitude. For normalized energy E, a half-injection delta adds dot(state,delta)+||delta||²/2. If positive proposed work exceeds incident power, reduce only that proposed increment to the positive quadratic root. Do not clamp stored states or remove existing vibration. Choose per-half work B=1.62(1−d²)/(1+d²)x², with d the weakest full-step damping. Then E_next≤d²E+(1+d²)B, bounding audio-driven norm by1.8 times bounded input amplitude. At silence both proposed work and budget are zero, leaving exactly the old unforced dynamics. The map is positively homogeneous in input/history (work scales quadratically), unlike loudness leveling.

Separately evaluate a balanced fixed pickup(.78,.48,.40)/(.78,.40,.48), retaining global .27 and nearly the old vector norm. This reduces isolated-body attack by≈.85dB while revealing destination bodies; it is not a uniform gain increase. Keep the original TRIG energy injection. Compare excitation-only and pickup-only ablations as well as the full candidate before accepting this choice.

The input transducer is nonlinear and polarity-sensitive; it can create envelope-derived resonant excitation and even-order components. Do not describe it as a transparent linear preamp or alias-free analogue model. The core remains passive. Incoming-work admission is physical input-port loading, not a limiter on resonant state/output; measure its effect and dynamic range explicitly.

Retain UI, sliders, ports, telemetry/animations and JSON format exactly. Required evidence:7 inputs×9 settings×old/new raw/matched audio; actual event-window/input-output/energy measures,20s release, rates, block-time percentiles, demos, original42-preset PCM, and rebuilt worklet. Human listening and physical iPhone remain unverified. The change remains a stacked review PR, based on codex/sympathy-phase3; no merge/deploy.
