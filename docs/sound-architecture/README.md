# STILL, ALMOST MOVING II — Phase 1

This is a patch architecture study on v0.18.0, based on main `abf0634`. No existing DSP, engine, module definitions, UI, preset registry or saved patch format changes. The original uploaded JSON is preserved byte-for-byte in `tests/fixtures/still-almost-moving.reference.json`. II is a separate importable JSON, not a replacement for an existing preset. Phases 2/3 and SYMPATHY are not implemented. This PR must remain unmerged pending user listening/structure review.

## What the original actually does

DRONE and PARTIAL both select 110 Hz; RESON's unmodulated base is also 110 Hz. DRONE SPREAD=.31 compresses its six ratios near 1: approximately 110, 110.02, 115.3, 120.6, 125.9 and 131.1 Hz before small detune. COLOR=.23 adds modest second/fourth harmonics. PARTIAL MASS=.29 activates about ten partials; WARP=.47 starts very close to harmonic (ratio exponent .99874), then TIDE changes it. These are related pitches, not three unrelated sources.

The VCA is an equal-power mixer, not an exclusive switch: both sources remain except at blend extremes. At BLEND≈.5 its .43 level gives each about .304 amplitude gain. FLOCK changes that balance at a roughly 31-second cycle plus a seeded walk. Both sources then pass through CHORUS and the same CHAMBER as the event path. This can make the layers share an outline. It is a structural explanation, not proof of the listener's dissatisfaction.

CUTS contributes finite MACHINE gestures. LOSS colours them and feeds PARASITE; CUTS events and measured energy drive NERVE, whose fatigue decides subsequent RESON strikes. NERVE CHARGE changes material, not pitch. MIRAGE collects LOSS and RESON, then CHAMBER collects almost everything. PARASITE FEVER also changes MIRAGE interval. The final LEVEL adds +5.28 dB with some compression. These choices can reduce dry/transient contrast even without any individual DSP defect.

## Revised architecture

19 modules / 24 cables; same BPM, patch seed, existing module seeds and MACHINE asset. Two extra VCAs give independent layer gains; one SLEW shapes only the slow harmonic CV. Additional modules have no new DSP implementation.

- **Foundation:** DRONE stays at 110 Hz with smaller SPREAD=.19 (six nearby frequencies around 110–118 Hz). Existing VCA uses A only, BLEND=0, LEVEL=.43. Its stereo output reaches ORBIT without chorus/reverb.
- **Harmonic layer:** PARTIAL moves to 220 Hz with MASS=.38 and WARP=.515. A separate VCA at .24 controls it; only this layer passes through restrained CHORUS (DEPTH=.12), then reaches ORBIT. This puts the partial ladder above the drone, near an octave relationship, while allowing slow inharmonic interference rather than forcing a chord/scale.
- **Foreground:** CUTS has its own .72 VCA to ORBIT. Its actual rests and short attacks survive independently of its parallel LOSS → MIRAGE → CHAMBER memory path. RESON still follows NERVE but has a shorter decay (.48).
- **Memory:** LOSS DAMAGE=.08, MIRAGE MUTATE=.24, ROOM-mode CHAMBER SIZE=.59 / DENSITY=.36. Sustained voices no longer excite the room. The room belongs to short events and their modal response. A direct event path and a memory path are both present; this is not intended to eliminate every cancellation or seam in the existing DSP.
- **Development:** TIDE RANGE falls from .50 to .24. DRIFT still shades DRONE colour; TIDE through asymmetric SLEW shades PARTIAL WARP; AGE shades MASS on the very slow timescale. FLOCK shades the small chorus instead of changing the main layer balance or whole-patch positioning. PARASITE pressure and NERVE fatigue retain energy/history-dependent event responses. MIRAGE interval is steady, avoiding the old FEVER-driven interval/pitch movement. ORBIT runs its own restrained smooth spatial cycle (DEPTH=.25).
- **Gain:** LEVEL is exactly 0 dB / COMP=0; OUTPUT and master are unchanged. Source gains, range and routing create separation. Global gain is not used as a claim of thickness. A sustained foundation remains: the whole patch does not become silent between events; the event stem has genuine rests.

TIDE's AGE is intentionally much slower than a five-minute comparison. Do not infer an audible minute-scale change merely from having that port connected. Five-second probes and band/RMS windows record what actually changes in this render.

## Reproduce and compare

```
npm ci
node scripts/render-sound-architecture.mjs 300
npm test
npm run build
npm run verify:build
```

The renderer uses the actual DSPGraph at 24 kHz, normal 128-frame quanta and the saved seed. Observational wrappers record every CUTS/NERVE trigger without changing processing or graph timing. It exports raw 60/180/300-second pairs and a matched 300-second pair. Matching applies one fixed attenuation to the louder complete recording, towards the quieter recording's RMS; no time-varying normalization, compression or edge fades are applied.

Outputs: `public/listening/audio/sound-architecture/`. `report.json` records peak, integrated and five-second RMS, approximate <250 / 250–2500 / >2500 Hz analysis-band energy, stereo correlation/side energy, control probes, exact event times, instrumented renderer wall time and typed-buffer memory. Band figures are complementary one-pole estimates, not an orthogonal FFT or loudness standard. CPU includes observation/analysis and is not a real-time/iPhone benchmark; PCM exports/analysis arrays and JS overhead are excluded from the graph's typed-buffer figure. Both candidates use identical measurement methods. No nonfinite output, master-limit violation, fault or growing persistent buffer is accepted by the renderer.

The PR workflow generates the 300-second comparisons and includes them in its `four-machines-listening` artifact (14-day retention). Open `sound-architecture.html` via a local HTTP server at the listening artifact root. The JSON is included alongside the WAVs. No Pages deployment occurs on this PR.

**Human listening is unverified.** Numerical differences establish different outputs and stability, not improved musical quality, analog modelling, wider perceived sound or the absence of every audible artefact. This study is the basis for deciding which DSP issue, if any, warrants Phase 2. Physical iPhone Safari performance is also unverified.

## Observed 300-second result

| Metric | Reference | II |
| --- | ---: | ---: |
| Integrated RMS | .024818 | .017317 |
| Peak | .126388 | .092415 |
| Stereo correlation | .81595 | .89066 |
| Side-energy fraction | .09908 | .05631 |
| Five-second RMS range | .01382–.03159 | .01509–.01936 |
| CUTS events | 180 | 180 |
| NERVE strikes | 81 | 85 |
| Persistent typed buffers | 3,328,794 B | 3,330,150 B |
| DSP faults / buffer growth | 0 / 0 | 0 / 0 |

II is approximately 3.12 dB quieter. Its complementary analysis bands put relatively more energy in the middle/high bands, and less in the low band. The sustained layer balance fluctuates less, while event history still varies. Its measured stereo image is **narrower**, not wider: calmer whole-patch motion was a deliberate choice, but whether that helps depth must be judged by listening. This remains a review candidate, not a claim that every stated sonic goal has been achieved. Full measurements, five-second windows, controls, event times and matched-export gains are in [measurements.json](measurements.json).

`npm ci` and `npm test` passed: 564 tests / 42 files, including both patches at 44.1/48 kHz, deterministic replay, routing refresh, finite output and protected peaks. Production build and emitted-worklet checks are recorded in the PR. Existing 42 presets are unchanged; this independent patch is loaded by importing JSON.
