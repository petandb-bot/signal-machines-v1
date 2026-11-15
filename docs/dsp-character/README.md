# Phase 2 — optional instrument character candidates

This PR starts independently from main v0.18.0 / abf0634. It does not merge Phase 1 PR #13. That PR's JSON is preserved only as a comparison fixture; `LIVING, ALMOST MOVING` is a separate importable demo, not a preset registry change. No release/merge is requested.

## Audit first

[AUDIT.md](AUDIT.md) records the original-code review and decisions before implementation. [audit.json](audit.json) contains 48 original-class probes at 44.1/48 kHz across eight instruments/processors and macro corners. No demonstrated defect justified changing RESON/ALLOY/FRICTION/CHORUS/LEVEL/OUTPUT. Their exact DSP files remain unchanged, as do MIRAGE/LOSS/CUTS/NERVE and the engine.

DRONE already wanders and PARTIAL already smooths activation/normalization. The new opportunity is **independent, slow harmonic redistribution**, not fixing a supposedly motionless or broken engine. FM alias sidebands still require a more rigorous high-rate-reference test; this limited audit does not prove alias-free operation. Do not change ALLOY ratios or oversample the engine merely from upper-band energy.

## Candidate processing and controls

Original `Drone.ts` and `Partial.ts` remain byte-identical. Thin instrument adapters select those original methods for all old mode values and missing mode. New `LivingDrone`/`LivingPartial` classes are separate DSP paths. A shared CharacterBlend runs both only during a linear transition (360 ms for the slow-attacking DRONE, 30 ms for PARTIAL); at steady CLASSIC the new DSP does not process. It reserves a small fixed state bank even when inactive. There is no noise injection, saturation, new oscillator count, extra slider or new saved JSON field.

The existing frequency-selection buttons gain three `LIVING … Hz` options each. Original frequency labels retain CLASSIC; no existing patch automatically selects LIVING. DRONE keeps 55/110/220 Hz and PARTIAL keeps 110/220/440 Hz. The combined label avoids adding another setting panel; the original two macro sliders, character selectors, WIDE and compact chip design remain intact.

**DRONE:** six oscillators preserve a pitch anchor. A seeded bounded relaxation field couples neighboring oscillator energy to target residence time, drift speed and weak per-harmonic amplitude changes. Frequency deviation is at most .00035×SPREAD² times a bounded state (well under a cent at full SPREAD); at SPREAD=0 tuning stays stable. Fundamental amplitude variation is at most2.5% times that state; second/fourth harmonics vary independently by6.5/8%. This is controlled low-frequency state motion, not six independent periodic LFOs. Nyquist fades and finite input guards remain explicit.

**PARTIAL:**32 phase-continuous sines retain MASS/WARP semantics and Nyquist tapering. Per-partial energy influences the same bounded, multi-timescale field. Relative amplitudes redistribute within ±8.5% of the state envelope; upper partials detune at most .00022 times their state, while the fundamental remains anchored. Smoothed normalization prevents a global gain increase from masquerading as richness. No high-rate random modulation or extra audio noise is generated.

These are deliberately subtle candidates. The control field's random targets are seed-repeatable; target timing, relaxation and neighbor coupling depend on voice energy. No growing per-event queues or per-sample array allocation is introduced.

## Actual comparisons

`node scripts/render-living-character.mjs 120` renders29 WAVs: CLASSIC/LIVING low120s and extracted30s; high30s; sweep30s; raw and fixed-gain matched pairs; and the combined120s demo. `node scripts/render-audit-baselines.mjs` adds eight unchanged30s baselines, including four-voice ALLOY strikes, RESON excitation/release and original processing responses. There is no fake "modified RESON/ALLOY" comparison because those classes are not modified.

The renderer uses the real source classes/graph and measures peak/RMS/DC/max step, stable typed-buffer memory, instrumented wall time and per-five-second amplitude observations. `python3 scripts/analyze-living-spectrum.py` adds8192-point Hann FFT windows, normalized-power spectral flux, centroid and stereo correlation; it requires NumPy only offline. It is not part of the app or npm dependencies. FFT evidence is in [spectrum.json](spectrum.json); upper-band energy is explicitly not called alias energy. PCM16 floor and finite windows limit the inference.

| Low sustained case | CLASSIC RMS | LIVING RMS | CLASSIC / LIVING peak |
| --- | ---: | ---: | ---: |
| DRONE110Hz | .05500 | .05450 | .1873 / .1772 |
| PARTIAL110Hz | .09300 | .09299 | .2471 / .2743 |

DRONE's mean level is about0.08dB lower; PARTIAL's is essentially unchanged. New harmonic motion and different instantaneous peaks do not establish greater musical quality. [Measurements](living-measurements.json) include all high/sweep cases and CPU details. Observed server processing was roughly1.3–1.7% of audio duration per single voice, including observation, with a fixed state footprint of1254B (DRONE adapter) /3942B (PARTIAL adapter). These figures exclude JS/object/renderer allocations and are **not iPhone real-time guarantees**. Persistent typed buffers did not grow over120s.

## Regression and limits

[Classic PCM results](classic-compat.json) compare all42 original preset stereo streams against original Drone/Partial classes routed through the same compiler: all match exactly for a0.501s window. Direct tests separately compare missing/old frequency modes sample-by-sample at44.1/48kHz with liveCV. Existing long preset, master, recording and graph tests remain in place. Targeted tests cover corners, WIDE, invalid new-mode wires, seeds, transitions, persistence and mode-button snapshot restore. The brief PCM comparison is not proof of every possible saved patch/history.

No physical iPhone Safari or human listening evaluation has been performed. No perceptual improvement, analogue accuracy, alias-free synthesis or production adoption is claimed. RESON/ALLOY may warrant further high-pitch/long-decay spectral investigation; this PR preserves their original sound until a precise defect and compatible remedy are demonstrated.

PR verification renders comparisons into its14-day `four-machines-listening` artifact. Serve that artifact's listening root with a local HTTP server, then open `living-character.html`. Raw files preserve actual levels; matched pairs attenuate the louder member by one constant gain, without dynamic normalization. Source test commands: `npm ci`, `npm test`, `npm run build`, `npm run verify:build`. Main and Pages must remain unchanged pending user review.

Validation before submission: `npm ci`; full `npm test` passed570 tests /42 files. The final dedicated suite (11 cases including two added dense-graph cases) additionally passed at both rates. UI tests verify two sliders and LIVING frequency-mode snapshot restore. Production build and all42 original emitted-worklet preset checks passed; a dedicated emitted-LIVING demo check passed at44.1/48kHz. A final review added invalid-input guards to the legacy side of a character transition as well as the new path, while leaving steady CLASSIC untouched; that change is covered by a deliberately invalid signal at a live switch and rechecked before PR submission. Existing Vite chunk-size warning remains.

Final transition review: DRONE uses360ms so returning to the original slow attack does not expose a freshly started quiet CLASSIC voice after only30ms. PARTIAL retains30ms. This changes only explicit character transitions; steady original modes remain exact.
