# SYMPATHY / Phase 3.1

Stacked review only, based on PR15 `dbde9d89`. Do not merge or deploy. PR13/14 are not included. The audit was committed before DSP edits. See [AUDIT.md](AUDIT.md), [old measurements](audit.json), [new response](response.json), [full matrix](comparison.json), [timing/release tests](performance.json), and [measured curves](response.png).

## What changed

Only the production DSP in `src/audio/modules/Sympathy.ts` changes. BODY / COUPLE, ports, state serialization, seeded mallet, three bodies, orthogonal momentum exchange, half-step damped rotations, CV smoothing, DC rejection and telemetry shape remain intact. No new module, noise, dry path, output gain stage, saturation, AGC, compressor, reverb or delay. No other DSP, graph, UI, animation or preset JSON is changed.

The old pressure drive was `1.8(1−d)x`, where `d=exp(−gamma/fs)`. Its tiny per-sample increments largely cancel for short, off-resonance material. A resonant sustained sine can accumulate energy; a small CUTS event cannot do so for long. TRIG already supplies a direct finite mallet impulse and needs no stronger excitation.

The signed pressure path remains. A parallel contact displacement is `6(1−d)max(0,abs(x)−follower)` in normalized q coordinates, split over both half-steps. The independent channel followers use 12ms smoothing; the existing seeded mallet direction sets contact orientation. This uses the waveform's crest above recent amplitude, rather than converting each onset to the same internal strike. At zero input contact force immediately vanishes, even while the follower releases. At a constant input it settles away. The direct pressure still retains polarity and frequency information. Scaling a complete input history by a positive factor scales the response by that factor: a −60dB source stays −60dB.

This is an abstract nonlinear contact transducer, not a calibrated analogue model. Rectification generates envelope/even-order content. The resonators integrate the drive; there is no direct folded audio feedthrough. We do not claim alias-free processing or universal timbral improvement.

### Incoming work, not resonator limiting

Let `E=||state||²/2`. A proposed increment δ=(dq,dp) changes energy by `state·δ+||δ||²/2`. Each half-step admits at most `B=1.62(1−d²)/(1+d²)x²` of positive incoming work. If the proposal exceeds B, solve its positive quadratic root for a smaller increment. Negative work can remove energy. The code never scales or clips stored vibration or output. This input-port loading is amplitude homogeneous, not automatic loudness normalization.

The unchanged passive core retains at most `D=d²` of energy each full step, so `E_next ≤ D E +(1+D)B`. For bounded peak input A, steady state is bounded by `E≤1.62A²`, or normalized state norm≤1.8A. This is a conservative bound, not a musical loudness target. With zero input, δ=0 and the original passive dynamics apply exactly, including during macro changes. The existing separate TRIG mallet budget remains unchanged.

### Pickup

Keep the global .27 coefficient. Left weights change from (.86,.43,.25) to (.78,.48,.40), with the destination weights exchanged on the right. Vector norm changes only .9935→.9984. This reduces body0 by .85dB and reveals later bodies (body2 up to +4.08dB); it does not multiply the entire response by a new gain. Channels have no crossfeed, but correlated inputs can produce more correlated output because the two pickup weightings are closer. This stereo tradeoff needs listening review.

TRIG-only per-body energy trajectories are bit-identical to the historical fixture at 24/44.1/48kHz and COUPLE 0/.55/1. TRIG output timbre/level can change through the pickup; it is not promised to be PCM-identical.

## Measured results, not a listening verdict

Default BODY=.42 / COUPLE=.55, 24kHz. The baseline reproduces the supplied 8s raw RMS values. The event column uses the actual first 50ms after each source event, rather than dividing its short response by 8s of mostly silence.

| Input | Raw RMS before → after | Event-near change |
|---|---|---|
| 2ms pulse | .00012068 → .00036337 | +9.72dB |
| CHIP | .00179490 → .00234224 | −2.40 / +5.18 / +5.30dB |
| ALLOY metal | .00106202 → .00093712 | +.22dB |
| 110Hz sine | .00280043 → .00254021 | −.73dB |
| 80–1500Hz noise | .00008231 → .00011100 | +8.50dB |
| CUTS | .00002141 → .00002396 | +.57 / +4.23 / +9.26 / +3.27dB |
| CUTS at −60dB | 2.1412e−8 → 2.3960e−8 | same changes as CUTS |

The first quiet CUTS event improves only modestly. Not every attack improves: the first CHIP attack decreases. There is no universal 6–12dB lift, and no attempt to meet that range by increasing gain. Pulse stored peak energy rises about 10.6×, confirming a real excitation change. Low/resonant/high sine probes and both pulse lengths are in audit/response JSON.

Ablation results isolate the causes. At the first pulse event, excitation-only yields RMS .0033348 vs baseline .0009941; pickup-only yields .0009108. For the first CUTS event, excitation-only .0001307 vs baseline .0001113; pickup-only .0001012. The improvement principally comes from contact drive, not pickup gain. Exact values and all seven sources are retained in `comparison.json`.

### Existing demos, unchanged JSON

| Demo | 16s raw RMS before → after | Interpretation |
|---|---|---|
| SMALL RESONANCE | .00148679 → .00304953 | Audio-driven short input now excites more vibration. |
| EXCHANGING BODIES | .00845534 → .00767875 | TRIG-driven energy is unchanged; pickup redistributes the sound. |
| LIVING MATERIAL | .00741390 → .00669390 | TRIG dominates much of the full mix; this RMS is not evidence that quiet AUDIO excitation improved. Compare CUTS-only events and the matched demo. |

All three rendered with nonzero finite output and no graph faults. The WAVs permit review of attacks, silence and evolving tails. Whether the quieter events, spectral movement and original electronic character are musically preferable remains a listening decision. No demo was overwritten to make this measurement look better.

## Comparisons and reproduction

```sh
npm ci
npm test
npm run build
npm run verify:build
node scripts/verify-sympathy-worklet.mjs
node scripts/audit-sympathy-excitation.mjs          # immutable Phase3 fixture
node scripts/audit-sympathy-excitation.mjs --after  # current response
node scripts/render-sympathy-excitation.mjs
node scripts/measure-sympathy-excitation.mjs
# Optional: Python with numpy/matplotlib
python3 scripts/plot-sympathy-excitation.py
```

The renderer creates **271 WAVs**: seven inputs, 7×9×2×2 source/settings/version/raw-or-matched responses, and 3×2×2 demos. Inputs are generated once and shared byte-for-byte. Quiet material is CUTS×.001. CUTS event windows use its actual EVENT output. All files are 24kHz stereo IEEE float32 WAV, preserving quiet raw responses that PCM16 would round to zero. This offline format does not change the application's export code. Level matching is one constant gain per file toward .025 RMS, capped at .8 peak. Gains and achieved RMS are recorded; there is no changing normalization. Especially quiet files use very large comparison gains. Windows can overlap and normalization cannot establish perceptual quality.

Open `public/listening/sympathy-excitation.html` over HTTP after rendering. In the PR's Actions run, download **phase31-sympathy-excitation**, extract it, serve its root (`python3 -m http.server`), then open `sympathy-excitation.html`. The listening page and report include RAW/MATCHED pairs, all slider corners/midpoints and actual energy timelines. WAVs are generated artifacts, not committed binaries, and nothing is published to Pages.

## Regression and review

- `npm ci` completed; dependencies unchanged.
- `npm test`: 44 files / **585 tests passed**, including ten new contact/passivity/dynamic-range tests.
- `npm run build`: passed. Existing bundle-size and dependency-comment warnings remain.
- All 42 original presets produce byte-identical stereo PCM against unchanged main for the checked .5013s at 48kHz; hashes and scope are in `legacy-compat.json`. This short comparison alone is not exhaustive long-duration equivalence.
- Original damping / exchange / TRIG / telemetry methods reviewed unchanged. New contact work is explicitly bounded, zero input adds no force, no per-sample arrays are allocated.
- Energy isolation, transfer, nonfinite/max inputs, both drivers, continuous macros, seed repeatability, independent channels, −60dB scaling and 24s release checked at 24/44.1/48kHz. Rate/macro release matrix: 54 old/new cases with zero unforced energy increases and negligible final energy.
- Two fixed Float64 channel followers add **16 bytes** per voice: typed buffers 684→700 bytes, zero growth during eight-voice 60s stress. This excludes JS heap/browser overhead.
- 128-frame / eight-voice /48kHz timings are retained in `performance.json` with mean/p95/p99/max. The benchmark includes synthesis/observation on a shared Linux Xeon host. Shared-host scheduling and GC affect wall-clock outliers; no iPhone real-time guarantee follows from these numbers.

Final timing run (verification/rendering finished first; shared host still applies):

| Eight voices / 128 frames | Before | After |
|---|---:|---:|
| Mean ms | 0.225 | 0.280 |
| p95 ms | 0.341 | 0.403 |
| p99 ms | 0.533 | 0.654 |
| Maximum ms | 11.163 | 6.156 |

The nominal 48kHz block interval is 2.667ms; maximum wall-clock outliers exceed it even in this offline run. Average overhead increases and deadline safety is not established for mobile devices.

- `browser.json`: comparative page rendered at 1280×800 and390×844, no horizontal overflow or runtime exception. Chromium Web Audio decoded the quiet/raw/demo float WAVs as nonzero stereo. This is automated decoding, not human listening.

The production AudioWorklet passed `npm run verify:build` (45 demo fixtures plus LOOP record/import/overdub/export, master recording and interaction checks). `verify-sympathy-worklet.mjs` then passed at both 44.1 and 48kHz, including actual body-energy transfer and protected finite output. Physical iPhone Safari, real-time device deadlines, human listening, calibrated loudness and broad aliasing/perceptual assessment remain unverified. The change is ready for comparative review, not merged production acceptance.
