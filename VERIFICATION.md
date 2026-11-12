# Verification / v0.14

## Automated coverage

Host: managed Linux, Node 24.22.1. p5.js is pinned to 2.3.4. `package-lock.json` pins dependencies.

- The test inventory is **387 tests in 30 files**. Existing baseline coverage: graph validation, malformed files and legacy-layout migration; stereo DSP, trigger silence, seed determinism, control summing, three ALLOY characters at extremes, live rewiring and deletion, bounded feedback and a 30-second CHAMBER tail.
- New DSP checks: the original three presets produce nonzero finite audio; BRANCH repeats before mutation and emits scale-constrained seeded pitch/gate; RESON decays and responds to external excitation; FRACTURE is transparent at BREAK zero and retains audible captured audio after input ends at maximum HOLD. The original eight module types also run together at extreme macros without invalid samples or master overshoot.
- Noise modules: seeded stereo VENOM, zero-dose silence, trigger boosts and CV; SNAP dry pass-through, forced interruption/recovery, repeatable automatic dropouts, bounded edge steps and no independent sound from silent input; CAUSTIC dry pass-through, actual waveform changes, extreme drive and decay to silence. BAD CONTACT is checked for finite master output, maximum settings and variable-block deterministic rendering.
- Ambient/feedback modules: all three new presets validate and synthesize; continuous untriggered DRONE, spectral focus response, a stable 20-second tape tail, bounded envelope-derived controls, explicit full-intervening-quantum delay using 17/193/64-frame blocks, order-independent delayed cycle import and continued rejection of unauthorized AUDIO/mixed cycles. Actual host energy reaches SNAP FAULT and BRANCH CHANGE. Maximum feedback/macro settings remain finite.
- Snapshots: independent deep copies, persistent reload, recall/Back, export/import of cyclic patches, collision-preserving merge, repeated-import deduplication, full-bank validation, malformed data, 20-slot limit, deletion and transactional storage-failure behavior, and a blocked browser-storage getter without startup failure.
- Utilities/effects: VCA manual level, zero-envelope silence and two-source blend; SHAPE rise/fall, inverse and retrigger; SWITCH event selection and CV override; CHORUS zero-depth transparency and stereo movement; CLOUD seeded audio overlap and eventual silence. Three new presets render 8 seconds at 24 kHz; maximum macro versions remain finite, master-bounded and sample-identical across 128-frame versus 17/193/64-frame schedules. Fractional-delay wrapping is bounded at floating-point ring edges in CHORUS, TAPE and CHAMBER.
- Basic sources/effects: four OSC waveforms, measured pitch CV, sine purity, reduced saw aliasing; seeded independent stereo noise with decreasing high-frequency energy from WHITE through PINK to BROWN; LOW/BAND/HIGH frequency response; RING sum/difference sidebands with external B, internal-carrier fallback and dry transparency; COMB impulse resonance, decay and PLUCK excitation; SHIFT ±80 Hz on two simultaneous tones with image sideband amplitude below 0.002 for 0.1-amplitude inputs at 24 kHz; silent-input behavior; measured DRONE range changes. Three new presets run eight seconds at 24 kHz and remain deterministic at maximum macros across variable blocks. All six new processors also run together with PARASITE feedback at 8/44.1/48/96 kHz. Mode validation, queued-rewire updates, touch mode selection, snapshot recall and autosaved reload are exercised.
- Generative/spectral: CHANCE density endpoints, complementary middle rhythms, deterministic eight-choice recall, reset, scale pitch and statistical bias; PRISM measured input-band selection and independent harmonic output pitch, stereo anti-phase analysis, silent LIVE release, empty-startup capture, HOLD after source removal, refresh and transport retention versus snapshot reset; PARTIAL measured harmonic/warped components, Nyquist masking and seeds; CHAMBER WEAVE changes the actual delay network while the original ROOM remains sample-identical. New sources and live mode changes are checked at 8/44.1/48/96 kHz. Three new presets render eight seconds at 24 kHz; the two without delayed feedback are also compared across variable block schedules.
- Time/physics/binary: Euclidean hit counts and even gaps; WEFT external/internal clock alignment, three-times-slower B cursor, shaped envelope and reset; forty simulated minutes of bounded Lorenz integration and actual slow-flow movement (equation/control stepping, not forty minutes of native playback); seeded TIDE scales/range and transport retention; physical wall hits, bounded marble coordinates/velocity, seeded kick impulses and suppression of resting-wall chatter; COUNT modulo traversal, bit-rise counts, reset, measured audio counting frequency and external audio clock crossings; distinct bounded lookup tables, audio/CV independence, CV-only clock latching, dry transparency and silent input; FERAL excitation/autonomy and finite extreme settings at 8/44.1/48/96 kHz. Four new presets synthesize eight seconds and remain sample-identical across variable render blocks at maximum macros. A mixed six-role graph also runs with delayed parasitic modulation.
- Pitch/time/voice/dynamics: exact 12-TET, 19-TET and 13-TRIT grids and bounds; a measured 3:1 tritave, free/fractional PULL and clocked hold/CHANGE; zero bypass, separate LAG time constants, linear GLIDE, SNAP and bounded difference; exact 3:5 lane/event counts for OR/XOR/AND, √2 timestamps, signed 100 ms delays, gate coincidence and external-B removal without a catch-up burst; seeded VOICE/WHISPER stereo output, silent external replacement and measured vowel resonance response; DUCK dry transparency, key isolation, coherent stereo gain/recovery, trigger-only operation and self-detector fallback. FORMANT extremes and the five roles together with delayed parasitic modulation run at 8/44.1/48/96 kHz. Four new presets validate and render eight seconds at 24 kHz; maximum macros remain sample-identical across different block schedules. All four new mode choices survive the real editor, snapshot recall, autosave and reload.
- Bodies/faults/ranges: seeded four-body sound/motion and sympathy response; zero-energy silence; event-store conservation, overflow pass-through and reset; attraction/repulsion, inertia and bounds; closest-pair agreement, dissent, clock hold and state-change events; sample-transparent zero-pressure FAULT LINE, stress-driven deterministic fracture, silence and healing. Four new presets run eight seconds and maximum-macro versions remain sample-identical across render block sizes. All five roles also run together with delayed parasitic modulation at 8/44.1/48/96 kHz. WIDE produces measured 6 Hz and 12 kHz OSC tones, preserves six-hertz output, keeps source extremes finite, and survives schema validation, queued updates, editor selection, snapshot recall and reload.
- Master PCM: actual PCM24 WAV roundtrip, AIFF endian/sample/frame headers and extended-rate encoding at 44.1/48/96 kHz; invalid/empty input rejection, exact variable-block capture, transferable buffer recycling, consumer-stall completion and the duration/memory ceiling. Real source worklet output is sample-identical to captured data. Mocked engine checks both lossless formats without MediaRecorder, stale end IDs, one automatic delivery, interrupted partial recovery and playback stop despite an empty take. The actual DOM format selector and download extension are exercised. These do not validate native Safari file downloads or audio-device timing.
- LOOP/WAV: real capture, playback, pause, overdub, independent export copies, 16-second auto-finish, trigger capture, transactional import rejection, four-instance cap, Stop/Run retention and explicit reset priority. Stereo PCM16 WAV roundtrip and resampling; malformed/unsupported files are rejected. Worklet action replies and engine request correlation, local action errors, interruptions and timeout cleanup are exercised.
- Simulated DOM: adding/deleting independent modules, sliders, dragging chips/cables, invalid connections, selecting/deleting cables, all thirty-two preset choices, tapping two jacks, connecting via larger editor jacks across separate chip taps, two-pointer pinch/pan, arrangement preserving audio state, named snapshot capture/recall/Back and persistent reload, touch Disconnect, and per-cable Unplug with disambiguated parallel CONTROL endpoints. LOOP's Record/Finish/Dub controls use the real AppController with mocked AudioEngine replies; the fifth LOOP is refused without changing the patch.
- Mocked browser APIs: RUN/STOP/restart, interruption-to-play behavior, throttled parameter messages, codec choice and matching WebM/Ogg/M4A extensions. These do not exercise native encoders or an actual audio device.
- `npm run typecheck` and `npm run build`: TypeScript and Vite production checks. The normal large-bundle warning applies to p5 (about 1.2 MB before gzip).
- `npm run verify:build`: the actual emitted worklet is loaded in a JavaScript audio-host shim; all thirty-two presets render for 3 seconds at 48 kHz, stereo, variable block lengths. Every sample must be finite, audible energy nonzero, peak ≤0.63 and telemetry free of errors. An additional production-bundle session records, overdubs, exports/imports actual buffers, retains them across transport restart, and clears them on explicit patch reset. A separate production-bundle capture must exactly match the protected stereo master samples, including the final partial block.

Historical v0.12 baseline DSP measurements, 8 seconds at 24 kHz (the five revised voices intentionally sound different in v0.13):

| Preset | Peak | RMS |
| --- | ---: | ---: |
| METAL DRIFT | 0.087986 | 0.024422 |
| UNEVEN MEMORY | 0.111763 | 0.025116 |
| EMPTY CHAMBER | 0.091796 | 0.009190 |
| BAD CONTACT | 0.070468 | 0.013947 |
| TAPE GARDEN | 0.047323 | 0.008572 |
| HOST FEVER | 0.048076 | 0.007264 |
| UNSTABLE CIRCUIT | 0.132488 | 0.029292 |
| BREATHING CIRCUIT | 0.034491 | 0.002631 |
| FORKED MEMORY | 0.116899 | 0.030408 |
| LOOP WEATHER | 0.036719 | 0.009370 |
| CLEAR SIGNAL | 0.051276 | 0.004712 |
| WIRE STRINGS | 0.019778 | 0.002536 |
| SIDEBAND GARDEN | 0.041360 | 0.007085 |
| CHANCE GARDEN | 0.121916 | 0.019715 |
| SPECTRAL GHOST | 0.056792 | 0.012570 |
| HARMONIC WEATHER | 0.126910 | 0.027336 |
| CLOCKWORK GARDEN | 0.112343 | 0.017576 |
| SLOW WEATHER | 0.091302 | 0.030092 |
| MARBLE ROOM | 0.101846 | 0.019773 |
| BINARY FEVER | 0.062866 | 0.018890 |
| BENT VOWELS | 0.113351 | 0.016752 |
| SPLIT ORBITS | 0.110812 | 0.015592 |
| TRITAVE FIELD | 0.121559 | 0.033160 |
| OFF GRID | 0.113959 | 0.010351 |
| COLONY CRACKS | 0.111941 | 0.019007 |
| STORED RAIN | 0.157786 | 0.028547 |
| DISSENTING BODIES | 0.084068 | 0.016641 |
| OUTER BAND | 0.114426 | 0.039823 |
| PIXEL DUST | 0.092311 | 0.039510 |
| BIASED ORBIT | 0.112530 | 0.059074 |
| DRAWN METAL | 0.114677 | 0.037420 |
| TWIN SWINGS | 0.116317 | 0.021789 |

These results establish numerical synthesis and routing. They are not a listening test or native browser playback test.

## Browser and device limits

The selected executor reports remote desktop enabled, state unknown. Tool discovery exposes no `cua_repl.js`, desktop `js`, browser-control tool or `open_in_codex`. The managed Sites instructions prohibit substituting a different preview/browser path in that case, so no preview server, screenshot or browser automation was run.

iPhone Safari, Windows 11 Chrome and macOS Chrome/Safari remain unverified. The touch layout, safe-area handling and multi-pointer implementation exist, but their real-device appearance, hit testing, tactile ease, CPU load and native audio/codec behavior need confirmation. Human listening has not been performed.

## iPhone landscape acceptance

1. Open the deployed app in Safari, rotate to landscape and start at a low device volume. Tap ▶. The connected preset should sound; ■ should fade to silence. Confirm controls clear the notch/home indicator and no document scrolling occurs.
2. Select each preset: METAL DRIFT, UNEVEN MEMORY, EMPTY CHAMBER and BAD CONTACT. Listen for metallic drift, a repeating/mutating pitch sequence with fragments, and modal resonance with a spacious tail.
3. Tap + and add each new chip. Drag it without accidentally opening the editor. Tap it to edit; confirm the open editor leaves enough of the patch visible. Use Arrange chips and FIT after adding several modules.
4. Tap an output, then a same-color input. Matching pins should highlight and a working cable should appear. Also try the larger-jack route: tap a chip → choose its editor output → tap the destination chip → choose its editor input. The pending connection must survive the second editor opening.
5. Pinch with two fingers, including a gesture starting on a chip. The viewed point should stay under the midpoint; no chip should move or editor open. After lifting one finger, pan with the remaining one. Rotate and resize without losing the workspace.
6. Sweep RESON MATERIAL/DECAY, BRANCH CHANGE/MEMORY and FRACTURE BREAK/HOLD. Let a fragment capture, set HOLD to maximum, then remove its source cable. Confirm held audio continues. Listen for unintended clicks at capture/reversal and for material sounds distinct from ALLOY. This requires human judgment.
7. On iPhone, tap a cable and press Disconnect. Alternatively, open a chip’s CONNECTIONS and press the named Unplug button. Confirm both endpoint names distinguish parallel controls and only the intended cable disappears. Delete modules while running; reject AUDIO→CONTROL and mixed feedback cycles that bypass delayed PARASITE outputs without disturbing the existing sound. Add a second copy and adjust it independently.
8. Save JSON, modify the patch, load it back and reload the page for autosave. Import an old large-panel v0.1 patch: sounds/cables should persist and coordinates should compact once. Malformed JSON must leave the current patch intact.
9. Record, stop and play the downloaded native-format file. Try lock/unlock or switching apps during playback; the toolbar should return to ▶ after interruption and resume on a fresh tap. Check recording gaps and permissions separately.
10. Play a longer session with several instances while watching CPU, heat, battery, memory and audio stability. Repeat core checks on desktop Chrome and macOS Safari. Use these device results to decide whether to lower visual frame rate or the module limit on mobile.

## Noise-session manual checks

Play BAD CONTACT at the device’s usual instrument volume. Sweep VENOM DOSE/STRAIN for dust versus abrasive noise; sweep CAUSTIC BURN/STARVE for folding and supply sag; increase SNAP FAULT/RECOVER and confirm short chatter changes into longer gaps. Use its trigger input to force a dropout. Check that gaps are signal interruptions while cables remain connected. Try the new chips with ALLOY/RESON and FRACTURE as well as their preset. Auditory texture, perceived loudness, sharpness and phone interaction still require human/device validation; numerical peak protection is not a listening test.

## Ambient, feedback and snapshot manual checks

1. Select TAPE GARDEN. Confirm sustained sound without clocks, stereo beating as DRONE SPREAD changes, spectral motion in SIEVE and tape wobble/repeats as WEAR/ECHO change. Check tape modulation character and perceived loudness by listening.
2. Select HOST FEVER. Observe PARASITE pressure rise with actual audio. Temporarily unplug pressure from SNAP FAULT and compare interruptions; reconnect. Change FEED/MEMORY to alter how strongly and how long the sound influences its own faults. Confirm it does not grow without bound.
3. Select UNSTABLE CIRCUIT. Observe pressure reaching BRANCH CHANGE; allow several phrases for probabilistic mutations rather than expecting an immediate change on every event. A direct CHAMBER activity return without PARASITE must still be refused.
4. Open ··· → Snapshots. Name and Capture a patch, change chips/cables/macros and Recall it. Check that settings and layout return, while playback restarts with empty sound buffers. Reopen Snapshots and use Back to restore the circuit present before recall.
5. Reload the page, verify saved slots, export the bank, import on another browser/device, and check names/cables/controls. Invalid bank JSON must leave existing entries intact. Browser storage remains device-local; the exported bank is the portable backup.
6. Repeat these checks in iPhone landscape, including scrolling a full snapshot list, entering a name with the keyboard, and saving/recalling during recording/playback. Actual iPhone Safari, native sound/recording, touch ergonomics and human listening remain unverified here.

## Reactive visual checks

The visual/UI files contain 96 checks. These verify the larger logical display, resting without telemetry, energy/trigger/fault/control response, bounded two-pixel displacement, quiet mode, finite and changing drawing geometry for all 57 modules, deterministic repeated frames, unchanged chip/jack anchors during activity, persisted appearance mode, snapshots and patching gestures. The drawing recorder verifies model/geometry calls; it does not render p5 in a native browser.

The displays include actual learned/additive amplitude bars, remembered chance steps, and gain/blend, envelope stage, route crossfade, loop progress/recording mode, chorus phase, granular history, oscillator/noise waveforms, the filter response sketch, multiplication phase portrait, comb teeth and shifted traces. TypeScript, Vite and the emitted-worklet checks validate the updated audio build; this release changes the DSP as well as the module library.

Manual checks remain required: inspect all 57 larger displays on a real browser, confirm reacting chips look lively without obscuring labels/jacks, compare lively/quiet and OS reduced-motion behavior, select and drag a chip while its internal display is active, and verify cables remain visually attached. Test on iPhone landscape with the larger editor beside its sliders. No real-browser screenshot, iPhone appearance/performance check or human listening session was possible with the available tools.

## Utilities, effects and loop manual checks

1. Select BREATHING CIRCUIT. Confirm SHAPE ENV makes VCA open and fully close, sweep RISE/FALL and listen to the change. Unplug LEVEL and confirm manual gain returns. Add a second audio source to B and sweep BLEND.
2. Select FORKED MEMORY. Compare the two paths as PULSE triggers SWITCH. Sweep CHANCE and FADE, then patch PARASITE PRESSURE or SHAPE ENV to SELECT. Confirm SELECT overrides event choice.
3. Run DRONE → CHORUS → CLOUD → OUTPUT. Compare CHORUS at DEPTH zero and maximum, mono and stereo playback, slow/fast drift; sweep grain size/spread and listen for tail/reversal artifacts and perceived level.
4. Select LOOP WEATHER and let the slow REC TRIG capture then play. Unplug REC TRIG to use buttons manually. Record/Finish, Dub, Pause/Play, Clear; sweep SPEED through normal, freeze and reverse. Confirm new Record replaces rather than extends the old take.
5. Export a loop WAV, Stop/Run and confirm the take survives. Recall a snapshot and confirm the take is empty; reimport the WAV to restore it. Try stereo and mono PCM16/float32 files at another sample rate, a long file and an unsupported WAV. Invalid imports must retain the old take.
6. Repeat the recording/import/export flow on iPhone Safari, including the native Files picker/download, automatic 16-second finish, four concurrent LOOPs, interruptions and extended thermal/CPU/memory checks. Numerical tests do not establish native file-picker behavior, audio quality or recording latency.

## v0.7 source/effect acceptance

1. Add OSC, connect it directly to OUTPUT and change SINE/TRIANGLE/SAW/PULSE and TUNE. Then patch PULSE → SHAPE → VCA LEVEL and OSC → VCA AUDIO A. Confirm a steady source becomes articulated notes, with smooth waveform changes.
2. Compare NOISE WHITE/PINK/BROWN at the same LEVEL; patch into FILTER and compare LOW/BAND/HIGH. Listen to resonance and cutoff sweeps. Test mode buttons on the short landscape editor and portrait layout.
3. Select CLEAR SIGNAL, WIRE STRINGS and SIDEBAND GARDEN. Listen for basic pitched articulation, noise-excited string resonance, and two-source metallic sidebands with wandering harmonic relationships.
4. Open DRONE and compare 55/110/220 Hz with headphones and the iPhone speaker. Check COLOR and pitch modulation at each range; old snapshots should remain at the old low range until changed.
5. In RING, unplug AUDIO B and sweep RATE, then reconnect a second source and confirm RATE ceases to control the external product. In SHIFT, compare zero, small positive/negative and large shifts, including wet/dry phase coloration and low/high-frequency image artifacts.
6. Excite COMB with audio and separately with PLUCK, sweep pitch/decay, then remove excitation and listen to its tail. Save/recall a snapshot containing all four selectable mode types; check choices return while live audio buffers restart.
7. Confirm these operations on actual iPhone Safari and desktop browsers, including long-session CPU/heat, switching sources while playing, perceived loudness, filter peaks and native master recording. These are manual checks; no native browser or human listening is claimed here.

## v0.8 listening and appearance checks

1. Select CHANCE GARDEN and compare DENSITY 0, middle and maximum. Hold RECALL at maximum for eight repeated choices, then lower it to invite replacements. Compare LOW/MID/HIGH and BIAS CV; try RESET.
2. In SPECTRAL GHOST, listen to LIVE/HOLD, remove the source cable after learning, change TUNE and refresh CAPTURE. Stop/Run should retain the spectrum, while snapshot/preset recall should require a source again. Try a LOOP-imported WAV as input. The process learns a compact spectral shape rather than replaying audio.
3. Select HARMONIC WEATHER and sweep MASS/WARP at a comfortable level. Compare harmonic center spacing, compressed clusters and stretched partials, including each base range. Confirm the displayed amplitude bars follow the actual bank.
4. On CHAMBER, compare ROOM/WEAVE at the same SIZE/DENSITY; sweep WEAVE from separate repeats into an entangled tail. Listen for mode-transition clicks, resonant peaks and release character.
5. Inspect the muted accents at rest and while active across the full library, editor, title, trace and border. Keep the dark overall atmosphere, legible labels and fixed cable endpoints. Compare lively/quiet and OS reduced motion. Confirm colors do not obscure signal types or become distracting on the iPhone screen.
6. Repeat on native Safari/Chrome, including human listening and longer phone CPU/thermal checks. The tests exercise numerical DSP, p5 drawing calls and simulated DOM; actual browser screenshots, native speaker sound and iPhone interaction remain unverified here.

## v0.9 clock, physical and arithmetic acceptance

1. Select CLOCKWORK GARDEN and vary RATE/FILL/phrase length. Check the shared timing, A/B's distinct periods, envelope articulation and WANDER modulation. Patch external CLOCK and confirm RATE yields to it; RESET should align both cursors.
2. Select SLOW WEATHER, watch three TIDE outputs and try FLOW 10× before returning to 1× for a long session. Listen over tens of minutes, then Stop/Run to retain state; a snapshot recall should restart seeded dynamics. Check native CPU, memory, heat and battery separately from the accelerated equation test.
3. Select MARBLE ROOM and press Kick in BOUNCE's editor. Check the moving body, velocity arrow, position/speed outputs and collision-triggered notes. Compare ELASTIC extremes and externally driven tilt; a settled corner must not chatter continuously.
4. Select BINARY FEVER, compare COUNT CLOCK/AUDIO and different increments. Try audio-clock input from OSC. Compare bit lights, VALUE/CV mapping, the transfer curve and actual processed audio. Patch a slow clock into MAP and confirm CV latches while its audio stays continuous.
5. Feed audio into FERAL at CHAOS zero and compare it with autonomous high CHAOS. Check TUNE, kick excitation, harshness, perceived levels and stereo behavior by listening, including combinations with TAPE and CHAMBER. Numerical bounds do not establish sonic quality or the absence of audible aliasing.
6. Repeat the two new mode/range choices, editor Kick action, snapshot recall and key patching operations on iPhone landscape and desktop. The simulated DOM tests cover the actual button wiring and RATE-unit refresh, but no native file-picker, speaker, screenshot, touch or human listening result is claimed.


## v0.10 pitch, voice and unequal-time acceptance

1. Select BENT VOWELS and compare PULL zero, intermediate and one. Change 12-TET/19-TET/13-TRIT, source TUNE, SPAN and CLOCK patching. Confirm direct continuous pitch is still available. Compare SLEW before and after the grid.
2. Select TRITAVE FIELD, listen to the non-octave grid and compare LAG/GLIDE with separate RISE/FALL. Try SNAP. The timing labels describe an exponential time constant or full-CV-span traversal, not equal durations for every size of pitch change.
3. Select SPLIT ORBITS, compare the three A pulses against five B pulses, then change ratio/SHIFT and OR/XOR/AND. Patch B from WEFT/CHANCE to replace the companion clock. With AND, short-window coincidence matters; with slightly offset XOR, the gate-window tails can create another rising event.
4. Select OFF GRID and listen over several cycles to √2 timing and continuous physical pitch. Native human judgment is needed for rhythmic interest, musical instability, voice character, harshness and perceived levels; numerical tests only establish timing, sound generation, routing and bounds.
5. Feed FORMANT EXCITE from OSC, NOISE and an imported LOOP. Compare VOICE/WHISPER, vowel movement and breath. Patch DUCK before/after CHAMBER; compare separate KEY, clock-only TRIG, both together and self response with neither cable. KEY must remain inaudible in the target mix.
6. Capture and recall a named snapshot with the four new mode selections and DUCK settings. Confirm the same chip positions, typed jacks, macros and choices return while live state restarts. Inspect the five new displays and touch controls on iPhone landscape, then check native Safari CPU/heat/audio over a long session. No actual iPhone, screenshot or listening session was available here.


## v0.11 native recording and body/fault acceptance

1. Choose WAV and AIFF in ··· → Record format, record and stop each; open them in an audio editor and verify stereo PCM24 at the current AudioContext rate. Compare with Browser compressed. Test automatic limit, background suspension, resumed transport, repeated takes and format locking on native iPhone Safari. A suspended worklet may lose its last untransferred partial block; received blocks should still save. Verify the format/limit note is readable in landscape.
2. Select COLONY CRACKS and compare SWARM ENERGY/SYMPATHY, physical dots and resulting pitch/activity. Sweep FAULT LINE PRESSURE/HEAL; compare zero-pressure transparency with stress-driven reversed/crushed fragments, explicit STRIKE and return to a clean path.
3. Select STORED RAIN and vary HOLD/RELEASE. Check stored-dot fill and later event return; hold at zero release, fill capacity, then release. RESET intentionally clears saved events. Compare DISSENTING BODIES with attraction versus repulsion, QUORUM tolerance and stubborn holdoff; check consensus and dissent both change the result.
4. Select OUTER BAND, inspect WIDE on both OSCs and OUTPUT, then compare STANDARD/WIDE. The low source is 6 Hz and the high source nominally 12 kHz with wide pitch motion; perceived silence on some speakers does not mean the source is absent. Verify recorded spectra in an external editor and assess nonlinear aliasing, clicks and musical usefulness by listening.
5. Confirm the five new displays, fixed jacks, two macros, range buttons, cable operations and snapshot recall on native iPhone landscape and desktop. Profile sustained CPU/memory/heat during noncompressed recording. Simulated DOM, drawing calls and offline DSP do not establish real display/touch quality, speaker response, human listening, native codec or file-download behavior.


## v0.11.1 public source packaging

The application icon includes original artwork plus PNG sizes 16/32/48/180/192/512/1024 and a three-size ICO. HTML links the favicon, Apple touch icon and relative web manifest; all paths work under a repository subpath. The main README is a short English introduction; the previous detailed guide is retained in `docs/GUIDE.md`.

The public source ZIP includes the MIT license, font/p5 notices, GitHub Pages workflow, source, locked dependency metadata, tests and presets. Root files/directories are explicitly selected; Git history, `.openai` Site identity, environment files, installed dependencies and generated downloads are excluded. Packaging version and the in-app download link match 0.11.1. GitHub Pages requires the owner to enable GitHub Actions as the Pages source in their new repository. The workflow is provided and reviewed; no remote GitHub deployment is claimed.

Validation for this release covers the existing 310 tests, TypeScript, production build, PNG/ICO dimensions, manifest/document links and ZIP contents/integrity. Native browser/iPhone icon installation and GitHub's remote workflow remain unverified. Audio DSP is unchanged from v0.11.


## v0.12 rough sound, gesture and swing checks

The added checks measure CLIP transfer/harmonic changes, zero-drive transparency, silent input, FUZZ bias gating, CRUSH signed bit steps/sample holding/full-rate transparency, all three bypass paths and release back to dry, seeded/articulated CHIP modes and rounded-timer pitch. Maximum settings run at 8/44.1/48/96 kHz.

Timed TOUCH interpolation, wraps/speed, RESET, smoothing and phase continuity across equivalent updates are exercised. Validated gesture/bypass state roundtrips through JSON and queued routing edits; malformed times, size, coordinates and module combinations are rejected. PENDULUM is checked for bounded seeded motion, two crossing streams, coupling response, Kick/reset and transport retention versus explicit recall. Four new presets validate and render eight seconds at 24 kHz, with maximum-macro block-schedule comparisons and all six roles combined with delayed parasitic modulation across sample rates.

The real DOM library exposes all 57 choices exactly once in six ordered groups. Editor mode selection, drawing commit/cancel/clear, bypass, snapshot recall and pendulum Kick use actual controller wiring. Native drawing feel, touch capture, visual appearance, CPU/heat and human listening still need iPhone/desktop checks; no native browser tool is exposed here. The production-worklet script now includes all 32 presets plus the existing master PCM and LOOP bridges.

Manual acceptance: compare CLIP/HARDNESS and FUZZ/BIAS on the same source with bypass; compare CRUSH bit depth/update speed and the three CHIP modes; draw/replay/cancel/clear a TOUCH path and recall its snapshot; watch both pendulum bodies and their crossing-triggered voices. Confirm the six catalog groups are easy to scan on iPhone landscape and that existing patching/recording still feels familiar.


## v0.13 acceptance

Added tests cover four retained ALLOY pitches, common between-note transposition, all three characters at macro endpoints; RESON material CV response/smoothing and three material regions; PARTIAL component count, smooth WARP and mass-energy balance; CAUSTIC low-drive response and antiderivative error against a 64-substep reference; seeded DRONE; LPG strikes/OPEN/combined/audio-only behavior and measured high-frequency response; OPERATOR sine/modulation/silent-cable behavior; serial operators with LPG, JSON roundtrip, master bounds and continued rejection of direct feedback. All seven roles run at 0/.5/1 macros and 8/44.1/48/96 kHz.

The full existing suite protects legacy patch rendering, grouped catalog, snapshots, TOUCH/PENDULUM, variable-block execution and recording/WAV/AIFF bridges. The production-bundle check additionally renders a two-OPERATOR/LPG graph without adding a preset. Existing jack IDs remain; RESON MATERIAL is appended at position 3.

CPU measurements are offline managed-Linux Node medians, not iPhone/Safari or hard real-time guarantees. ALLOY uses a shared sine table, DRONE also uses it for its six voices, and CAUSTIC avoids an oversampling multiplier. TPT modal motion and ADAA add work; some modules can cost more than their earlier version. A 48kHz mixed nine-module graph and per-module before/after measurements are recorded during acceptance. High-PM aliasing, intentional tone/level changes and native CPU/thermal/listening checks remain limitations.

The iPhone deletion difficulty remains an open interaction issue: the user explicitly excluded module add/delete and rack UI changes from this task. No deletion interaction was changed. There is no exposed native browser tool; audible quality, clicks perceived by ear and native iPhone performance remain unverified.

Offline 48kHz CPU check (median of three warmed one-second direct-module runs; ms per audio second):

| Module | v0.12 | v0.13 |
| --- | ---: | ---: |
| ALLOY | 35.23 | 38.12 |
| RESON | 10.40 | 20.94 |
| PARTIAL | 53.63 | 50.61 |
| CAUSTIC | 6.60 | 10.17 |
| DRONE | 42.04 | 49.43 |
| LPG | — | 7.41 |
| OPERATOR | — | 9.12 |

A nine-module 48kHz graph (clock, all five revised roles, OPERATOR, LPG and OUTPUT) rendered 3 seconds in 1285.6 ms, peak 0.2400, zero faults. This is a managed Linux offline measurement, not a phone playback/deadline guarantee. RESON roughly doubles its direct processing cost; total cost is not universally lower.


## v0.14 interaction and mobile UX

387 tests in 30 files include 11 new DSP cases and six additional UI cases, plus all three drawing branches. EDGE is checked for empty silence, one onset from a sustained stereo anti-phase tone, separate short sounds, recovery suppression, soft-attack sensitivity and a sustained seeded noise bed. MESH is exactly transparent at zero TRANSFER or absent B; measured low/high spectral ratios change with B, B alone produces no output, stereo input is retained and MEMORY outlasts the source. ORBIT follows CV smoothly, preserves instantaneous stereo energy, follows equal-power dual-mono panning, rests at DEPTH zero and moves internally. New state roundtrips through JSON, EDGE events trigger RESON, direct feedback remains rejected, and macro endpoints run at 8/44.1/48/96 kHz without invalid or runaway output.

Simulated phone viewports 390×844 and 844×390 use the real editor/controller and stylesheet. Tests check that the trash control is in the sticky header, 44px minimum dimensions are computed, confirmation names the module, Cancel restores focus without patch/selection/audio-sync changes, Remove deletes its cables, Escape cancels, direct Delete/Backspace works, and a stale confirmation cannot delete another selection. These are happy-dom DOM/CSS tests: they do not provide native layout geometry, screenshots, Safari scrolling or real touchscreen validation. No browser-control tool is exposed, so native portrait/landscape appearance, listening and physical iPhone interaction remain unverified.

The production-worklet acceptance includes an OPERATOR/MESH/EDGE/LPG/ORBIT graph in addition to the unchanged 32 presets, existing PM/LPG acceptance and all recording bridges. Existing 54 DSP implementations, presets, snapshots, recording and patch graph files are unchanged. The new one-pole filterbank is deliberately lightweight; stereo rotation changes phase relationships and MESH has broad overlapping bands rather than FFT precision.

Offline managed Linux Node medians at 48 kHz (three warmed one-second direct-processor runs, not iPhone real-time measurements):

| Module | ms / audio second |
| --- | ---: |
| EDGE | 7.74 |
| MESH | 12.02 |
| ORBIT | 4.57 |
