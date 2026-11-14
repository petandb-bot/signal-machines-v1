# v0.18 review evidence

The four independent designs and overlap decisions are in [FOUR_MACHINES](../FOUR_MACHINES.md). The release adds MIRAGE, LOSS, CUTS and NERVE to the existing 61 machines, and appends five patches after all 37 existing entries. Existing DSP classes, chip geometry, layout CSS, graph rules and JSON version are unchanged.

## Browser check

Real headless Chromium rendered the combined patch at 390×844, 402×874, 320×568, 844×390 and 1280×800. Initial portrait chips fit; cable endpoints match jack centers; all four types animate from actual worklet telemetry. CUTS opens with two sliders and the shared source/file controls. Header trash → Cancel preserves the chip. A real WAV was decoded, stored in IndexedDB, retained through Run/Stop and recovered after page reload. A separate real AudioWorklet run at the browser's 44.1 kHz produced nonzero protected audio and zero faults.

These are browser emulations, not physical iPhone Safari or an audio-device/listening test. Existing portrait, gesture, cable, snapshot, LOOP and recording tests remain in the suite.

| View | Combined patch | CUTS editor |
| --- | --- | --- |
| 390×844 | [image](ecosystem-390x844.png) | [image](cuts-editor-390x844.png) |
| 402×874 | [image](ecosystem-402x874.png) | [image](cuts-editor-402x874.png) |
| 320×568 | [image](ecosystem-320x568.png) | [image](cuts-editor-320x568.png) |
| 844×390 | [image](ecosystem-844x390.png) | [image](cuts-editor-844x390.png) |
| 1280×800 | [image](ecosystem-1280x800.png) | [image](cuts-editor-1280x800.png) |

[Local file restored after reload](cuts-local-restored-390x844.png).

## Audio evidence

`npm run render:four` generates 30 WAVs and `public/listening/audio/four-machines.json`. The [listening page](../../public/listening/four-machines.html) offers DRY, DEFAULT, LOW, HIGH and MOTION examples, existing-module comparisons and all five demos. Rendered files are generated during builds rather than committed. Comparison tracks receive one constant gain toward 0.025 RMS, capped at 4× and 0.9 peak. Demos retain unit gain. Raw peak/RMS, maximum sample step, silence, event times, intervals and gains are retained in the report.

Inputs include a metal strike, harmonic sustain, irregular noise, quiet synthetic room sound and silence. CUTS/FOUND share exactly that recording. NERVE/CHANCE/UNSPENT trigger sequences strike the same short test tone; NERVE additionally receives rectified input energy. This adapter is disclosed in the report and does not pretend these modules accept identical signal types.

[Output comparisons](output-comparison.json) document distinct actual time streams/event sequences. CUTS has substantial rests at high SPARSE; NERVE adapts and respects its refractory interval; MIRAGE's generations change and decay; LOSS's recovery changes its output while DAMAGE=0 remains exact stereo. These observations and different algorithms are evidence of different behavior, **not a claim of perceptual originality or good sound**. Human listening remains unassessed. Please compare the WAVs before making that judgement.

[Legacy comparison](legacy-audio.json): all 37 original patches produced bit-identical stereo Float32 output for a 0.501-second window against the previous DSP. This short comparison supplements longer existing tests and the production-worklet run; it does not prove every possible patch/state identical.

## Performance and memory

`node scripts/measure-four-machines.mjs` renders each machine for 60 seconds at 48 kHz and the combined nine-chip patch for 30 seconds. [Measured results](performance.json) include host CPU, actual wall time, finite outputs, peaks, tails and typed-buffer sizes. Buffers stayed the same size; the combined graph had zero faults. Offline server timings are not iPhone real-time guarantees.

MIRAGE reserves approximately 1.08 MB of stereo packet memory at 48 kHz; LOSS uses under 5 KB. CUTS has three bounded one-shot voices and up to 63 immutable event candidates. CUTS and FOUND together are limited to two sample instruments. Each full 60-second stereo sample uses 11.52 MB of PCM at 24 kHz, shared within each realm; the host and worklet retain separate copies, with additional transient decode/transfer/replacement overhead. IndexedDB still stores the original file. Session fallback remains subject to the existing budget.

No callbacks allocate grains, event queues or growing buffers. Telemetry allocation remains at the existing host update boundary. Sample analysis runs outside the AudioWorklet.

## Commands and review

`npm ci`, `npm test` (559 tests / 41 files), `npm run build` and `npm run verify:build` passed. The production worklet rendered all 42 presets and the original LOOP/recording bridge checks. The final CUTS display-only adjustment also passed its six targeted tests. [Browser results](browser.json) and [render metrics](audio-metrics.json) retain the detailed evidence.

Review covered independence from existing DSP, packet-edge continuity, finite-state recovery, shared sample limits, immutable PCM references and graph compatibility. This led to smoothing LOSS reconstruction boundaries, tapering MIRAGE packet reads and guarding invalid CUTS PCM; the most recently started CUTS voice drives its playhead. Existing DSP files are unchanged. No unresolved blocking defect was found in the exercised cases. The existing Vite large-bundle warning remains; broad engine/chunk restructuring is outside this release.
