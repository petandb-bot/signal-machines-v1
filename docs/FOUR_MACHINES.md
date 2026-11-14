# Four sound machines — design before implementation

Base: public main `666b252` (v0.17.9). These designs were recorded before writing the new DSP. The existing 61 module definitions, compiler, sample transport and visual interfaces were inspected. No existing sound algorithm is copied or changed.

## MIRAGE

1. **Difference.** TAPE has continuously moving, interpolated delay heads and flutter; CHAMBER uses a four-line feedback diffusion matrix; CLOUD overlaps grains; SMEAR disperses bands through fixed allpasses; CHORUS modulates short taps. MIRAGE instead exchanges discrete, complete echo packets.
2. **Principle.** Two bounded stereo banks alternate capture and replay. Each packet generation changes a sparse temporal kernel and a phase-coherent heterodyne coefficient. The previous generation's energy influences the next transformation. Recirculation is contractive.
3. **State.** Packet length, two banks, generation counter, packet energy, modulation phase, boundary fade. No random moving read head.
4. **Time.** DISTANCE is latched at packet boundaries. MUTATE changes the sound inside succeeding generations; input cessation leaves diminishing packet echoes.
5. **Output.** Separated reflections acquire sidebands and altered attacks, rather than only becoming darker or more diffuse. This is a design expectation; the rendered comparison and measurements must establish the actual result.
6. **Patching.** Short ALLOY/RESON strikes reveal generations; slow CV changes DISTANCE/MUTATE; ACTIVITY can influence other controls.

## LOSS

1. **Difference.** CRUSH quantizes amplitude and rate; CHIP synthesizes stepped waves; FAULT LINE accumulates stress and displaces fragments; CAUSTIC folds and starves; FUZZ clips, gates and rectifies. LOSS preserves sample precision but loses selected band packets.
2. **Principle.** A complementary three-band decomposition feeds a causal packet decoder. Received bands update a short good-frame history; erased packets use a bounded, damped continuation and remembered waveform. RECOVER changes the reconstruction method/horizon, never a dry/wet blend.
3. **State.** Shared stereo erasure decisions, independent channel predictors and last-good frames, transition ramps, per-band loss history.
4. **Time.** Seeded, correlated erasure runs produce missing contours followed by imperfect recoveries; no arbitrary seeking into a long live recording.
5. **Output.** Spectral gaps and briefly persistent tonal shadows, including on quiet material; DAMAGE=0 is exact stereo passthrough, silence remains silent. Compare against CRUSH/FAULT LINE before accepting.
6. **Patching.** Quiet FOUND material exposes missing detail; CV alters transmission damage without quantization; the stereo-linked mask preserves channel correspondence.

## CUTS

1. **Difference.** FOUND continuously reads and crossfades selected regions; LOOP explicitly records/overdubs; FRACTURE repeats live captured fragments; CLOUD overlaps live grains. CUTS plays finite, enveloped sample events with explicit silence.
2. **Principle.** Outside the worklet, independent short-frame analysis classifies attack, texture and tail candidates using local energy/changes, including quiet anchors. A bounded event scheduler selects candidates using class and recent history, and triggers a small fixed voice pool.
3. **State.** Immutable candidate metadata, recent-event history, next-onset timer and three finite one-shot voices. PCM, decoding, IndexedDB and reference IDs are shared with FOUND; its region selector/readers are not used.
4. **Time.** SPARSE lengthens the gaps; CHANGE expands candidate/class/speed/direction choices. External TRIG requests an event, otherwise the instrument runs autonomously. No additional CLOCK is needed.
5. **Output.** Short recognizable gestures separated by actual silence; compare the same material through FOUND/FRACTURE and measure event density/silent fraction.
6. **Patching.** EVENT can strike RESON or stimulate NERVE. Shared FOUND+CUTS limit is two sample instruments, avoiding a doubled PCM budget. Existing sample JSON IDs, missing-file warnings and snapshots are reused.

## NERVE

1. **Difference.** CHANCE makes probabilistic clock decisions; UNSPENT stores integer event debt; EDGE detects audio onsets; QUORUM compares CV agreement; PULSE schedules a tempo clock. NERVE integrates continuous excitation and adaptation.
2. **Principle.** Deterministic leaky integrate-and-fire model with input-driven depolarization, threshold, after-response, fatigue and a bounded refractory interval. No random firing decision.
3. **State.** Charge, adaptive threshold/resource, after-response and refractory countdown. RESET holds these at rest.
4. **Time.** Sustained/triggered stimulation can accumulate, fire in groups, adapt, pause and recover. No stimulation produces no spontaneous events. SENSE and FATIGUE affect distinct parts of the model.
5. **Output.** SPIKE is a one-sample trigger; CHARGE exposes the evolving membrane state. Compare event intervals to CHANCE/UNSPENT under identical stimulation.
6. **Patching.** BOUNCE/TIDE/TOUCH control excitation; SPIKE excites short voices; CHARGE shapes timbre. Audio feedback/cycle rules remain unchanged.

## Acceptance plan

Implement MIRAGE and LOSS first, with dedicated tests and actual comparative WAV renders; proceed to CUTS/NERVE only after those pass. Test 44.1/48 kHz, seeds, macro corners, continuous modulation, silence/quiet/loud/invalid input, finite state, bounded memory, independent instances and graph persistence. Produce DRY/DEFAULT/LOW/HIGH/MOTION examples and existing-module comparisons. Measure peak/RMS, discontinuity, silence, event density/intervals, decay, CPU and estimated memory. No metric proves musical quality: human listening remains explicitly unverified unless actually performed.

Each new module gets a separate commit. Existing DSP, patch version, layout and graph rules remain intact. Browser screenshots and touch checks cover the sample controls and new chip visuals. Updated icon is a separate visual asset change.
