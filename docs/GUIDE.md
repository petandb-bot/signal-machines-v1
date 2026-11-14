# SIGNAL MACHINES / v0.14

A small modular sound instrument built with TypeScript, Vite, p5.js **2.3.4** and the Web Audio API. Fifty-seven independent modules run in a single AudioWorklet. Compact chips replace the large rack panels; editing and adding modules use temporary panels. The interface intentionally has no large title or permanent sidebar.

## Start locally

Node.js 22.12+ or Node 24:

```sh
npm ci
npm run dev
```

Open Vite's printed localhost URL and press ▶. METAL DRIFT is already wired; an autosaved patch takes precedence. Use the preset selector to restore it. Browser audio requires a user gesture and HTTPS or localhost. Do not open the HTML file directly with `file://`.

```sh
npm test
npm run typecheck
npm run build
npm run verify:build
npm run preview
```

The static `dist/` includes the application, independent worklet, p5, fonts, and a source ZIP. Local operation requires no backend, account, external API, CDN, p5.sound or UI framework. **··· → Source + guide** downloads the complete project and tests. `npm run dev` and `npm run build` regenerate this ZIP automatically.

## Play on a small screen

Landscape is the intended iPhone layout. Portrait also keeps the workspace available, with a bottom editor. This is an implemented touch-oriented layout, **not a claim of real-device Safari validation**.

- ▶ / ■ starts and stops sound. BPM, master volume, preset selection and recording stay in the narrow toolbar.
- **+** opens the 57-chip library. Tap a type to add an independent module at a vacant position. Drag a chip to move it; tap it without dragging to edit.
- **Tap an output, then tap a compatible input** to connect. Green = trigger, blue = control, amber = audio. Drag connections also work. Matching destinations highlight; tap the starting jack again or × in the connection hint to cancel.
- Small chip pins are shortcuts. For larger touch targets, tap a chip, choose a full-size input/output button in its editor, then tap the destination chip and its matching editor jack. The pending connection survives opening the other chip's editor.
- Pinch with two fingers to zoom and pan around their midpoint. Drag the background with one finger to pan. + / − and FIT are also available. Pinching across a chip does not move it or open the editor.
- The editor exposes one or two macro sliders, waveform/noise/filter modes, source ranges, spectral HOLD and room WEAVE, ALLOY character, larger jacks, existing cables and module deletion. Tap a cable and press **Disconnect** to remove it. Every chip also lists its **CONNECTIONS**, with both endpoint names, the other chip’s instance number, and a 44-pixel **Unplug** button per cable. These distinguish parallel cables between the same chips. This path does not require tapping a thin wire. Tapping the background closes panels.
- **··· → Snapshots** captures named circuit/settings snapshots in this browser (up to 20), recalls them and offers Back to the patch present before recall. Export/import a bank to keep a backup or move to another device. Audio restarts on recall; live delay buffers, learned PRISM spectra, phases and sequencer cursors are not stored.
- **··· → Visuals: lively / quiet** changes the signal display motion. The device reduced-motion setting also suppresses internal jitter and extra copies. The preference is device-local and leaves the sound patch and snapshots untouched.
- **···** contains Snapshots, Save JSON, Load JSON, New patch, Arrange chips, How to play and the source download. Arrange changes positions only. Saved version-1 patches retain sounds, connections, seeds and parameters; old large-panel coordinates compact once on import.
- Record ● captures the protected stereo master. **··· → Record format** selects **WAV / AIFF (stereo PCM24)** or the existing browser-compressed WebM/Opus, Ogg/Opus or MP4/M4A. WAV is the interface default. Noncompressed takes auto-save at 3 minutes or 48 MiB of PCM, whichever comes first; the limit is also shown in the menu. Press it again, or STOP, to finish. Unsupported codecs show an error. Browser/device interruptions switch the transport back to ▶; tap it to resume.
- **LOOP editor** has Record/Finish, Dub, Play/Pause, Clear and WAV import/export. Record replaces the take; Dub layers onto it. See recording persistence below before recalling a patch.
- Keyboard: Space transport, F fit, Escape close/cancel, Delete selected cable/module, Enter focused chip. Native buttons retain keyboard activation.

The canvas and floating controls account for safe-area insets. An open editor keeps part of the patch visible. Touch hit areas in the editor are at least 44 CSS pixels; scaled chip pins are deliberately smaller and have the larger editor alternative.

## Fifty-seven modules

| Chip | Function | Macros |
| --- | --- | --- |
| PULSE | Seeded tempo clock with drift and rests | RATE, IRREGULAR |
| BRANCH | Seeded pentatonic memory sequencer; repeats before mutation, branches and recalls earlier phrases | CHANGE, MEMORY |
| FLOCK | Two correlated, slowly wandering controls | SPREAD, DRIFT |
| ALLOY | Four-voice FM/PM with inharmonic ratios and three characters | BODY, TENSION |
| RESON | Six damped, inharmonic modal resonators with noise/trigger and external audio excitation | MATERIAL, DECAY |
| FRACTURE | Captures actual audio into short fragments, loops/stutters/reverses and freezes at maximum HOLD | BREAK, HOLD |
| VENOM | Seeded colored noise, unstable held grains, electrical impulses and trigger-dose bursts | DOSE, STRAIN |
| CAUSTIC | Asymmetric wavefolding and envelope-driven supply starvation; clean at BURN zero | BURN, STARVE |
| SNAP | Probabilistic contact dropouts, tiny edge crackles and automatic recovery; explicit trigger interruption | FAULT, RECOVER |
| TAPE | Saturation, moving tape path, wow/flutter, seeded crinkle and bounded stereo echo heads | WEAR, ECHO |
| DRONE | Six sustained additive oscillators with detuning, opening intervals and stereo spread; no trigger required | SPREAD, COLOR |
| SIEVE | Six-band spectral window with two control inputs | FOCUS, WIDTH |
| PARASITE | Audio-to-control pressure and bipolar fever, with explicit delayed feedback | FEED, MEMORY |
| VCA | Level control and equal-power blend of two stereo sources | LEVEL, BLEND |
| SHAPE | Triggered rise/fall envelope and complementary inverse | RISE, FALL |
| SWITCH | Seeded trigger choice between two audio paths; SELECT CV overrides | CHANCE, FADE |
| LOOP | 16-second stereo recording, overdub, reverse/freeze and WAV transfer | SPEED, MIX |
| CHORUS | Three moving stereo delay copies; unchanged audio at DEPTH zero | DEPTH, DRIFT |
| CLOUD | Four overlapping windowed grains reading actual audio history | GRAIN, SPREAD |
| OSC | Basic sine/triangle/saw/pulse oscillator; continuous, with pitch CV | TUNE, LEVEL |
| NOISE | Seeded independent stereo white/pink/brown noise | LEVEL |
| FILTER | Resonant lowpass/bandpass/highpass, with two modulation inputs | CUTOFF, RESONANCE |
| RING | Four-quadrant multiplication of two sources, or an internal sine carrier | RATE, MIX |
| COMB | Tunable short feedback delay/string, audio excitation and trigger pluck | TUNE, DECAY |
| SHIFT | Approximate single-sideband frequency shift from −500 to +500 Hz | SHIFT, MIX |
| CHANCE | Two density-shaped trigger streams plus biased pentatonic pitch, with eight remembered random choices | DENSITY, RECALL |
| PRISM | 16-band spectral analysis mapped into a new harmonic oscillator, live or held | TUNE, MEMORY |
| PARTIAL | Up to 32 additive sine components, with density/rolloff and compressed/stretched harmonic spacing | MASS, WARP |
| WEFT | Two Euclidean rhythms, an envelope and a slow random CV from one timebase | RATE, FILL |
| TIDE | Three independent nonlinear controls on seconds/minutes/tens-of-minutes scales | FLOW, RANGE |
| BOUNCE | Position, speed and wall-collision events from a moving marble | TILT, ELASTIC |
| FERAL | Input-driven Duffing resonator that opens into autonomous nonlinear oscillation | TUNE, CHAOS |
| COUNT | Modulo-16 arithmetic, bit-rise triggers, held numeric CV and audio-rate counting | STEP, RATE |
| MAP | Original eight-bit transfer tables for audio, CV and threshold events | TABLE, AMOUNT |
| QUANTIZE | Optional pitch grids: 12/19 equal octave divisions or 13 equal tritave divisions, continuous-to-grid pull | SPAN, PULL |
| SLEW | Independent upward/downward CV smoothing; exponential lag or linear glide | RISE, FALL |
| FORMANT | Continuous vowel-shaped buzzing/whisper source or externally excited resonances | TUNE, VOWEL |
| LOGIC | OR/XOR/AND event windows, unequal companion clock and signed lane delays | RATIO, SHIFT |
| DUCK | Stereo attenuation from a separate audio key, trigger or self detector | DEPTH, RECOVER |
| SWARM | Four interacting moving sound bodies, continuous stereo voice, centroid CV and activity events | ENERGY, SYMPATHY |
| UNSPENT | Conserved event storage and density-sensitive release, with 64-event capacity | HOLD, RELEASE |
| SIDEWAYS | Two damped control bodies with attraction/repulsion and inertia | ATTRACTION, INERTIA |
| QUORUM | Closest-pair consensus or a dissenting CV, with decision holdoff and state-change events | AGREEMENT, STUBBORN |
| FAULT LINE | Audio-derived stress opens a displaced/reversed, crushed time fragment, then heals | PRESSURE, HEAL |
| CLIP | Gain-driven rounded saturation or hard clipping, with output compensation | DRIVE, HARDNESS |
| FUZZ | Biased gated fuzz with rectified octave character | DRIVE, BIAS |
| CRUSH | Signed 2–24 bit amplitude steps and 20 Hz…native-rate sample-and-hold | BITS, RATE |
| CHIP | Original timer-stepped pulse/triangle/LFSR noise and optional fast arpeggio | TUNE, CHARACTER |
| TOUCH | Record a timed XY drawing and replay it as controls/events | SPEED, SMOOTH |
| PENDULUM | Two coupled driven swings, angle CVs and center-crossing events | ENERGY, COUPLING |
| CHAMBER | Stereo four-delay network; ROOM or continuously entangled WEAVE feedback | SIZE, DENSITY |
| OUTPUT | Input summing, gain and DC removal | LEVEL |

BRANCH pitch and gate connect separately to a voice. RESON can be struck by a trigger or excited by an audio cable. FRACTURE fades its old fragment before copying a new capture one sample at a time, then fades it back; loop edges are windowed. At maximum HOLD the captured buffer remains frozen until explicitly triggered. Visuals use actual DSP waveform, phrase, phase, fragment cursor, envelope and meter data; no decorative randomness drives them.

## Thirty-two playable presets

- **METAL DRIFT**: PULSE → ALLOY → CHAMBER → OUTPUT; FLOCK → ALLOY tension.
- **UNEVEN MEMORY**: PULSE → BRANCH; BRANCH pitch + gate → ALLOY → FRACTURE → OUTPUT.
- **EMPTY CHAMBER**: PULSE → RESON → CHAMBER → OUTPUT.
- **BAD CONTACT**: PULSE → VENOM trigger; VENOM → CAUSTIC → SNAP → CHAMBER → OUTPUT; FLOCK → SNAP FAULT.

The new noise modules use real sound generation/processing, not decorative animation. VENOM can sound without an audio input; CAUSTIC and SNAP process a wired audio source. SNAP interrupts signal gain while retaining the cable, so it recovers automatically. To permanently remove a connection, use Disconnect/Unplug. The stereo master protection remains in place.

- **TAPE GARDEN**: DRONE → SIEVE → TAPE → CHAMBER → OUTPUT; FLOCK slowly changes spread and spectral focus.
- **HOST FEVER**: DRONE → SIEVE → TAPE → SNAP → OUTPUT; SNAP audio feeds PARASITE, whose pressure alters fault probability and whose fever changes the drone/spectrum.
- **UNSTABLE CIRCUIT**: PULSE → BRANCH → ALLOY → FRACTURE → CHAMBER → OUTPUT; PARASITE listens to chamber audio and returns pressure to BRANCH CHANGE and fever to FRACTURE BREAK.
- **BREATHING CIRCUIT**: PULSE → SHAPE → VCA LEVEL; DRONE → VCA → CHORUS → CHAMBER → OUTPUT. The envelope makes the drone swell and fade.
- **FORKED MEMORY**: ALLOY → CAUSTIC and RESON → CHORUS enter the two sides of SWITCH, then pass through TAPE. PULSE chooses a path each event.
- **LOOP WEATHER**: DRONE → CLOUD → LOOP → CHORUS → OUTPUT. A slow PULSE alternates capture and playback about every 5.45 seconds; unplug its REC TRIG cable to take over manually.

- **CLEAR SIGNAL**: BRANCH tunes OSC SAW → CAUSTIC → FILTER → VCA → OUTPUT; SHAPE opens the level and cutoff together.
- **WIRE STRINGS**: NOISE PINK → VCA → COMB → TAPE → OUTPUT; PULSE/SHAPE create short noise excitations and BRANCH tunes the resonant string.
- **SIDEBAND GARDEN**: DRONE at 110 Hz and OSC enter RING, then SHIFT → CHAMBER → OUTPUT; FLOCK moves pitch and frequency displacement.

- **CHANCE GARDEN**: PULSE → CHANCE; its two rhythms strike COMB and ALLOY, with a shared scale-shaped pitch and slowly moving bias.
- **SPECTRAL GHOST**: OSC → FILTER → PRISM HOLD → CHAMBER WEAVE → OUTPUT; PULSE refreshes the held spectrum and FLOCK animates the learned character/pitch.
- **HARMONIC WEATHER**: PARTIAL → CHORUS → CHAMBER WEAVE → OUTPUT; FLOCK moves harmonic spacing/pitch, and PARASITE returns sound pressure to MASS.

- **CLOCKWORK GARDEN**: WEFT shares a timebase across BRANCH/ALLOY, COMB plucks and an enveloped DRONE; all enter CHAMBER WEAVE.
- **SLOW WEATHER**: TIDE's three rate scales change PARTIAL spacing/density and FILTER cutoff before a woven spatial tail.
- **MARBLE ROOM**: BOUNCE wall hits strike RESON, X changes pitch and speed changes CAUSTIC drive; WEFT supplies occasional kicks and TIDE tilts the tray.
- **BINARY FEVER**: COUNT AUDIO → MAP → FERAL → FILTER → OUTPUT; the same count also maps CV, while TIDE slowly changes the transfer table/nonlinear regime.

- **BENT VOWELS**: BOUNCE X → QUANTIZE 19-TET with partial PULL → SLEW GLIDE → FORMANT; position/velocity also move vowel and breath, while pitch changes dip DUCK.
- **SPLIT ORBITS**: PULSE → LOGIC generates 3 A pulses against 5 B pulses; ALLOY and COMB strike separate lanes, while the keyed DUCK makes space in a 220 Hz drone.
- **TRITAVE FIELD**: TIDE → QUANTIZE 13-TRIT → asymmetric SLEW GLIDE → PARTIAL → CHAMBER WEAVE. The pitch grid repeats at a 3:1 frequency ratio.
- **OFF GRID**: LOGIC generates a √2 companion clock and 40 ms lane offset; BOUNCE controls unquantized FERAL pitch through SLEW while FORMANT WHISPER ducks into the tail.

- **COLONY CRACKS**: SWARM → FAULT LINE → TAPE → OUTPUT; BOUNCE and TIDE interact through SIDEWAYS to change the colony's pitch and sympathy.
- **STORED RAIN**: WEFT → UNSPENT → RESON → FAULT LINE → CHAMBER WEAVE; QUORUM chooses from slow/physical controls and changes pitch/release density.
- **DISSENTING BODIES**: TIDE/BOUNCE → repelling SIDEWAYS → QUORUM → SWARM → CHAMBER WEAVE. Similarity and dissent both affect the audible colony.
- **OUTER BAND**: a 6 Hz OSC and a nominal 12 kHz OSC with slow ±8-octave movement share a WIDE OUTPUT; FAULT LINE breaks the high branch. Parts may be inaudible on a device while still present in the recording.

- **PIXEL DUST**: a TOUCH path changes CHIP pitch; PENDULUM articulates the voice and moves CRUSH rate before CLIP.
- **BIASED ORBIT**: PENDULUM moves OSC TRIANGLE pitch and FUZZ bias before CHORUS.
- **DRAWN METAL**: a saved six-point drawing changes ALLOY pitch and CRUSH rate, before CHAMBER WEAVE.
- **TWIN SWINGS**: each pendulum strikes a separate COMB/RESON path, with FUZZ on one branch and a common woven tail.

All are editable starting points. Only CONTROL outputs explicitly marked delayed on PARASITE may close a dependency cycle. All ordinary AUDIO/CONTROL cycles, including mixed loops that do not cross such a delayed edge, remain rejected. Self-connections remain rejected.

## Basic sources and frequency effects

OSC, NOISE and DRONE sound continuously without a trigger. OSC selects SINE, TRIANGLE, SAW or PULSE in the editor, with TUNE from 55 to 880 Hz plus ±2 octaves from PITCH. SINE is a direct sinusoid; saw/pulse use polyBLEP edge correction and triangle integrates the corrected pulse. Use SHAPE → VCA LEVEL to turn these sustained sources into notes. NOISE offers WHITE, approximate 1/f PINK and low-frequency BROWN at one level control; it is a clean material source alongside VENOM's grains/contacts.

DRONE now has **55 Hz / 110 Hz / 220 Hz** base-range buttons below its macros. These shift the whole oscillator cloud; PITCH still modulates relative to the chosen range. The legacy default is 55 Hz, preserving old patches. For more presence on a small speaker, try 110 or 220 Hz and raise COLOR for extra harmonics. Real phone-speaker audibility remains a listening check.

FILTER selects LOW, BAND or HIGH with cutoff/resonance control, a state-variable design and bounded states/output. Its curve display shows the selected shape and cutoff, not a measured FFT. RING uses AUDIO A × AUDIO B; a connected B replaces its internal carrier and RATE then has no effect. External B is scaled by four for the application's typical signal levels. At MIX zero, RING and SHIFT pass their input unchanged.

COMB accepts either audio excitation or a PLUCK trigger that injects a short noise burst. Pitch controls the short delay's resonance, DECAY changes its bounded feedback and loop damping softens successive repeats. It is a stylized string/resonant delay, separate from RESON's modal bank. SHIFT uses paired allpass cascades for approximate quadrature and one-sided frequency displacement. Its center is 0 Hz, with fine movement near the center and ±500 Hz at the ends. All input partials move by the same Hz rather than a common musical interval. Quadrature/image suppression and residual aliasing near band edges are numerical/sonic limitations, not hardware-emulation claims.

Waveform/noise/filter/range choices live in the optional validated module `mode` field. Autosave, JSON and snapshots preserve them; old patches without the field retain SINE, WHITE, LOW, 55 Hz, MID, LIVE, 220 Hz or ROOM as appropriate. Mode changes in OSC/NOISE/FILTER crossfade over about 6 ms, and the editor keeps sliders/jacks in place.

## Remembered probability and spectral instruments

CHANCE needs an external CLOCK (for example PULSE). DENSITY zero leaves both trigger outputs silent, the middle splits events between A/B, and high values can fire both. RECALL controls replacement of eight stored random decisions; at maximum these decisions repeat, while density and pitch bias remain live. MID/LOW/HIGH choose pitch emphasis and BIAS CV shifts that distribution. PITCH follows a pentatonic scale. RESET returns the decision cursor to the beginning. This complements BRANCH's longer-lived phrase mutations and returns rather than replacing it.

PRISM listens to sixteen fixed logarithmic frequency bands and uses their envelopes as amplitudes for sixteen new harmonics. TUNE and PITCH control the resynthesized voice, independently of the input recording's pitch. MEMORY controls the analysis release. LIVE follows input; HOLD freezes a learned spectrum, and CAPTURE refreshes it. It learns automatically after about 80 ms when a source is present; an empty startup capture does not block learning. For recorded material, import a WAV into LOOP and connect LOOP → PRISM. This is a small filterbank resynthesizer, not a dual Spectraphon, an FFT sampler or sample playback.

A PRISM spectrum survives routing edits and Stop/Run in this tab. Explicit preset/JSON/snapshot recall, deleting the module or reloading the page clears it; configuration snapshots save HOLD/LIVE and macros, not the learned amplitudes. Record the master or capture its output in LOOP/WAV to keep the sound as audio.

PARTIAL is a continuous additive oscillator: MASS opens a single sine into up to 32 partials and changes their rolloff. WARP's center retains integer harmonic spacing; below it the partials cluster together, above it they stretch into inharmonic relationships. The editor's 110/220/440 Hz range and PITCH set the common base. Partials near Nyquist fade out, gains are normalized/smoothed and phases use a shared interpolated sine table. The display's bars come from the actual current partial amplitudes.

CHAMBER now offers ROOM (the original behavior) and WEAVE. In WEAVE, DENSITY rotates the feedback connections continuously from separate repeats toward an interlaced space, while SIZE controls the path lengths. The rotations retain unit norm, overall loop gain stays below one, and the mode transition crossfades. The old ROOM sound is the default for old patches. This is an original small spatial design informed by the Plexiphon role, without its complete controls or algorithm.

The hardware-role mapping in `RESEARCH.md` explains why Bloom, Basimilus, Morphagene and Data Bender ideas primarily use existing BRANCH, ALLOY/RESON, LOOP/CLOUD/FRACTURE and SNAP modules. Hardware panel complexity, channel counts and commercial firmware are not reproduced.

## Shared clocks, slow chaos and arithmetic

WEFT runs from project BPM with the familiar ÷8…×8 RATE choices, or follows an external CLOCK. FILL distributes 0…N hits evenly over an 8/12/16-step phrase. Lane A advances each clock; lane B advances every third clock. ENV is a short attack/exponential release from A; WANDER is a smoothed, seeded bipolar value updated on B hits. RESET aligns both cursors. This gives four useful related outputs without a per-channel menu. CHANCE remains available when probabilistic decisions/recall are wanted after a clock.

TIDE runs three independent Lorenz systems, integrated with allocation-free RK4 at control intervals and smoothed between steps. FLOW sets a shared 0.1×…10× speed; at its center DRIFT moves on a seconds scale, TIDE on a slower minutes scale and AGE over tens of minutes. These are nonperiodic dynamical flows, not fixed-duration loops or precise replicas of Sloth timing. RANGE sets CV depth; RESET returns the seeded states. Turn FLOW up to preview the slow output's movement, then lower it for a long session.

BOUNCE moves a particle inside a bounded two-dimensional tray. TILT changes gravitational strength and ELASTIC changes wall restitution. Unpatched tilt inputs use a slowly turning slope; connected TILT X/Y replace those components. X/Y expose position, SPEED is a unipolar velocity magnitude and HIT is one trigger per significant collision. Low-energy wall contact is silent rather than chattering. KICK or the editor's **Kick** button adds a seeded velocity impulse. The moving dot and velocity vector reflect its actual state.

FERAL is an original driven Duffing-style resonator, not a Sprott circuit model. At CHAOS zero it is a source-driven damped nonlinear-filter role; higher values introduce a double-well restoring force and periodic drive, opening into autonomous oscillation. TUNE/PITCH set its region and KICK excites velocity. Midpoint integration runs four substeps per sample, states are bounded and output DC is removed. Character varies across settings; chaotic behavior is not promised at every knob position.

COUNT adds STEP (1…15) modulo sixteen. In CLOCK mode its internal rate follows project tempo; in AUDIO mode it counts at an audio-rate frequency. External CLOCK triggers take priority, then AUDIO CLK rising Schmitt crossings, then the internal clock. The lowest/highest bit's rising edges are available as BIT 1/4, the complete number as bipolar VALUE, and a DC-removed staircase as AUDIO. The editor changes RATE units when changing mode. This exposes two bit events rather than a full four-bit bus, and is original arithmetic rather than a hardware simulation.

MAP quantizes values to eight bits and applies one of eight original tables: clean, sine, fold, Gray code, bit reversal, gate, triple ramp and curve. TABLE selects the bank and AMOUNT blends it with the input. AUDIO is processed continuously; CV uses its own input or follows AUDIO if CV is unpatched. CLOCK can latch the CV without holding audio. EVENT emits one trigger when the mapped held CV crosses upward through 0.1. Table transitions crossfade, all tables anchor zero audio at zero, and the curve/current dot show the selected transfer relation. This is intentionally digital and can alias at extreme settings; it does not reproduce Jena's banks or Leibniz bus.

TIDE states and BOUNCE motion pause/resume with Stop/Run in the current tab, alongside the existing LOOP/PRISM retention. Explicit JSON/preset/snapshot recall restarts their seeded dynamics. Configuration snapshots do not store a continuous physical/chaotic performance state.

## Optional pitch grids, glides, voice and unequal clocks

**QUANTIZE** works in the shared pitch-CV convention: one CV unit means two octaves. SPAN scales incoming CV by 0.25×…2×, SHIFT adds up to half a CV unit and the result is bounded to −1…1. Select **12-TET**, **19-TET** (19 equal divisions per octave) or **13-TRIT** (13 equal divisions of a 3:1 tritave). The latter grid repeats at triple the frequency rather than double. These are mathematical tuning choices, not claims to reproduce a particular musical tradition. Grids are relative to the downstream source's tuning; adjust its TUNE/base range to transpose.

PULL zero keeps the scaled/shifted pitch continuous, one aligns it fully to the grid, and intermediate amounts bend toward the steps. CLOCK optionally samples and holds the result; without it the result follows continuously. CHANGE emits one event when the selected grid position changes, after initialization. Put SLEW after QUANTIZE for gliding notes; put it before QUANTIZE to soften the control trajectory while retaining hard pitch steps. Quantization remains optional: direct TIDE/BOUNCE → pitch keeps unstable continuous relationships.

**SLEW** has independent RISE/FALL, from immediate zero to 20 seconds. LAG uses exponential time constants (about 63% of a step after the selected time); GLIDE moves at a constant rate, taking the selected time across the full −1…1 span. SNAP jumps to current input and DIFF exposes the bounded remaining difference. It works on any control, including pitch, cutoff, room size or fault probability.

**FORMANT** interpolates three resonant bands through stylized A/E/I/O/U shapes. VOICE excites them with a polyBLEP buzzing oscillator plus a little seeded stereo breath; WHISPER uses noise. TUNE/PITCH remain continuous. BREATH CV varies internal air content, and an EXCITE audio cable replaces the internal source entirely: try OSC, NOISE or LOOP. ACTIVITY follows the resulting sound. It is an original synthetic voice/filter, without speech synthesis or hardware-emulation claims.

**LOGIC** accepts A/B triggers and emits rising events from OR, XOR or AND of 6 ms gate windows. A LATE/B LATE also expose the separate delayed pulses. With no B cable, A starts a phase-accumulating companion clock at a **B:A frequency ratio** of 1:1, 3:2, 4:3, 5:3, 7:4, 11:8 or √2. Thus 5:3 gives five B pulses for three A pulses. B continues between A events; it does not restart each beat. The first interval estimates A from project BPM, then successive A events update its period. A B cable overrides this generated lane. No clock starts before A arrives.

SHIFT delays A by up to 500 ms to the left of center, or B by up to 500 ms to the right; it never predicts future input. The logical result uses actual overlapping short gates, so XOR of slightly offset overlapping windows can create separate events before and after their coincidence. Rational ratios create polyrhythms; √2 produces a continuously drifting, nonrepeating phase relationship at the mathematical design level, within digital timing precision.

**DUCK** attenuates stereo TARGET together. DEPTH zero passes it unchanged; RECOVER sets a 30 ms…3 s exponential release time constant, with a short 3 ms attack. KEY listens to another sound without mixing it into TARGET. TRIG adds a clock-shaped dip. With only TRIG connected, self-detection is disabled; with neither KEY nor TRIG, the target itself drives the detector. With both, KEY and trigger pressure combine. GAIN exposes the actual 0…1 multiplier. Put DUCK after CHAMBER to pull the whole tail, or before it to leave the existing tail ringing.

All five keep the same two-macro editor, typed ports and compact display. Their modes/macros/cables persist in JSON and named snapshots; live detector, clock, smoothing and filter state restarts on recall.

## Bodies, event stores and stress

**SWARM** adds four audible bodies rather than another FLOCK wandering-control pair. Each has an XY position, damped velocity, oscillator and activity cycle. ENERGY changes movement, cycle rate and sound energy; SYMPATHY changes attraction/repulsion and neighbour influence on pitch. PITCH and KICK are patchable, CENTRE exposes the mean X and EVENT fires on activity-cycle wraps. The four dots reflect actual positions and activity. ENERGY zero is silent.

**UNSPENT** makes event memory explicit. HOLD chooses which incoming events enter a 64-event store; others pass immediately. RELEASE sets return rate, accelerated by the number stored. Zero release retains events; full capacity passes new arrivals instead of dropping them. Simultaneous arrivals/releases are serialized so one output pulse still represents one event. STORED exposes fill; RESET intentionally discards the store. Saved patch settings restart an empty event store.

**SIDEWAYS** treats two CV inputs as targets for damped moving bodies. ATTRACTION's center follows them independently, its left repels them, and its right draws them together. INERTIA slows response. Outputs A/B and signed TENSION can drive pitch, faults, room controls or other CV inputs; they stay bounded. The two curves show the actual output positions, not animated decoration.

**QUORUM** compares up to three connected CVs. If the closest pair is within AGREEMENT's tolerance it adopts their mean; otherwise it chooses the value furthest from its current output. STUBBORN adds a decision holdoff (5 ms…3 seconds); CLOCK optionally samples eligible decisions. VALUE is briefly smoothed, AGREE/DISSENT emit transitions, and SPREAD reports maximum separation. Repeated dissent can deliberately alternate values. This is numeric consensus rather than LOGIC's trigger gate algebra.

**FAULT LINE** writes 0.6 seconds of stereo history. Actual signal energy and sudden changes accumulate STRESS; crossing a threshold opens a short displaced or reversed read path with saturation and coarse amplitude steps. HEAL controls stress decay and fracture duration. STRIKE can force a fracture while pressure is nonzero. PRESSURE zero passes input sample-for-sample, and silent empty input cannot invent a sound. CRACK exposes fracture onset as an event. Its visual crack follows actual stress, read state and fracture mix. It complements FRACTURE's externally controlled fragments and SNAP's contact loss with audio-driven stress and recovery.

MISPRINT is omitted because incoming CV tables and remembered pattern mutation already have MAP/BRANCH/CHANCE roles. CAPILLARY overlaps CHAMBER WEAVE's interlinked diffusion; LOST PROPERTY overlaps LOOP/CLOUD/FRACTURE's audio memory and fragment replay. Their complete proposed behavior is not claimed to exist; this release keeps the existing related tools and adds the five more distinct roles above.

## Broad frequency ranges

OSC, FORMANT, PRISM, DRONE, PARTIAL, ALLOY, RESON and SWARM expose **STANDARD / WIDE** below the same two macros. Old patches default to STANDARD. WIDE expands pitch CV from ±2 to ±8 octaves. OSC/FORMANT/PRISM TUNE nominally covers 0.05 Hz…24 kHz before pitch modulation; actual oscillator/partial frequencies remain bounded by each processor's sample-rate limits. WIDE OSC can reach 0.45 × sample rate (21.6 kHz at 48 kHz); additive banks mask components around Nyquist. Nonlinear/FM processing can still generate aliasing. Frequency labels show nominal tuning, not an FFT measurement or a guarantee that a speaker reproduces it.

OUTPUT has its own WIDE range: it lowers its DC-removal corner to 0.05 Hz instead of the legacy `.995` pole (about 38 Hz at 48 kHz). Set **both the source and OUTPUT to WIDE** to keep extreme low motion in the master/recording. Other effects may filter it according to their purpose. WIDE is independent of waveform/range modes and is preserved in JSON, snapshots and live queued rewires. The master peak protection still controls amplitude, without moving pitches into an audible range. Web Audio's sample rate/Nyquist limit and the device's physical output remain real limits; OUTER BAND intentionally includes material outside typical speaker response.

## Master WAV / AIFF recording

WAV and AIFF are genuine uncompressed signed **24-bit stereo PCM**, captured from the protected worklet master at the AudioContext's actual sample rate. WAV uses RIFF/little-endian PCM; AIFF uses FORM/COMM/SSND, big-endian PCM and an 80-bit extended sample rate. This is not a renamed compressed recording. The capture precedes the separate transport GainNode's startup/stop fade. The existing Browser option still uses native compressed codecs after that gain.

Recycled 8192-frame stereo buffers feed chunked PCM encoding on the main thread. No whole floating-point performance is held or copied at finish. Noncompressed recording auto-finishes at the earlier of 180 seconds or 48 MiB of PCM (about 175 seconds at 48 kHz and 87 seconds at 96 kHz). If the page stops consuming blocks, the take ends and received audio is saved rather than blocking playback. On native suspension, a missing final reply times out after 1.5 seconds and saves received blocks; the in-flight partial block may be unavailable. Stop/automatic limit/interruption save once. A page/tab close does not persist an unfinished take.

The recording format selector is disabled during a take. Master WAVs up to the LOOP duration/file limits can be reimported: LOOP now accepts PCM16, PCM24 and float32 WAV. AIFF is an output format only. Native Safari downloads, file-picker behavior and actual device playback remain manual checks.

## LOOP recording and persistence

Each LOOP stores at most 16 seconds of stereo audio; a patch accepts up to four LOOP instances. Tap Record, then Finish (or wait for the limit), to capture its AUDIO input. Playback SPEED ranges from −2× through a stationary read head at 0× to +2×; its default is 1×. MIX blends live input and playback; capture monitors live input. Dub adds input into the existing take. REC TRIG toggles a new recording/finish, so an attached clock can replace a take automatically.

Stop/Run retains the take in the current tab and restarts playback from its beginning. Removing a LOOP, reloading/closing the tab, selecting a preset, loading JSON or recalling a snapshot clears its recording. Autosave, JSON and snapshots contain the circuit/settings only. **Export WAV before recalling a patch if you want to keep a take.** WAV export creates stereo PCM16; import accepts uncompressed PCM16/24 or float32, mono/stereo, up to 16 seconds and 32 MB. Imports resample to the engine sample rate. Unsupported or invalid WAVs leave the current take intact. A loop WAV is separate from the toolbar's full-performance master recording.

## Structure and signal rules

`src/graph` owns types, ports, validation and topology. `src/audio/modules` contains fifty-seven separate processors. `PatchCompiler.ts`, `SignalRouter.ts`, `DSPGraph.ts` and `audio/worklets/processor.ts` compile and execute the graph on the audio thread. `AudioEngine.ts` handles browser transport/recording and correlated loop-action replies; `Wav.ts` handles PCM file transfer. `src/ui` handles chips, gestures and editors; `src/visual` renders 104 × 80 p5 displays; `src/state` owns presets, schema validation and storage.

AUDIO is stereo internally and permits summed inputs. CONTROL sums and clamps to −1…1, then maps macro values as `clamp(base + 0.5 × control, 0, 1)`. PITCH maps −1…1 to ±24 semitones around a source's base pitch (110 Hz for ALLOY/RESON, the selected range for DRONE, TUNE for OSC/COMB). TRIGGER is a one-sample event timestamped by the audio sample counter. Up to 48 modules and 256 cables are accepted.

VCA LEVEL uses a deliberate multiplicative rule: without a cable it is the manual gain; with a cable it is `manual × clamp(control, 0, 1)`. This lets SHAPE ENV at zero fully silence the source. SWITCH SELECT chooses B above 0.5 and A otherwise; without SELECT, each trigger chooses according to CHANCE. The possible paths remain explicit in the validated graph.

Parameters smooth over about 18 ms; UI changes coalesce to 32 ms messages, DSP telemetry is 20 Hz and drawing is 24 fps in lively mode or 12 fps in quiet/reduced-motion mode. Audio is independent of animation. Render blocks may have any length. PARASITE routes use two-stage end-of-quantum sample-and-hold: a full intervening render quantum completes before a sampled value can affect a destination. Both positive pressure and bipolar fever are clamped before being reused. Feedback timing consequently follows the actual render quantum; reproducibility for feedback patches requires the same sample rate and block schedule. Sample loops reuse buffers. Live rewiring fades down over 8 ms, commits at a muted block boundary and fades up over 14 ms; surviving DSP state is retained. Preset/import operations reset generators while muted.

The master has DC removal, headroom and smooth peak protection capped at 0.63, about −4 dBFS. CHAMBER feedback stays below 0.91. Invalid samples are zeroed and counted, and the UI stops on a reported DSP fault. BRANCH randomness and fragment choices use saved seeds.

## Verification and next steps

`VERIFICATION.md` distinguishes numerical DSP execution, simulated DOM/API tests, production bundle checks and unverified native-device behavior. Real iPhone Safari layout, pointer feel, speaker playback, interruptions, native recording and human listening still need the manual procedure there. There was no exposed browser-control tool in the managed environment, so no screenshot or real browser run is claimed.

Delayed CONTROL feedback is now implemented only through PARASITE’s marked outputs. Retain this boundary and the residual DAG checks when extending the graph. JSON and snapshots store a deterministic seeded **restart**, not a seamless snapshot of phrase mutations, phases, random cursors, held audio or delay buffers. Version a separate audio-thread state-transfer schema before adding exact performance continuation. Graph compilation still allocates at muted transaction boundaries; profile large patches and memory on an actual iPhone before raising the 48-module limit. Perceived loudness, metallic brightness and loop transitions need listening checks across devices.

LOOP WAV transfer, named patch snapshots and Back after recall are implemented. General edit undo and seamless audio-state snapshots remain future work; master WAV/AIFF recording is implemented. Font licenses are included in `public/fonts/`; package licenses ship with their dependencies.

## Directions for future development (proposals, not shipped features)

1. **General edit undo:** named snapshots and recall Back are shipped; per-edit undo would still make ordinary cable experiments easier.
2. **TOUCH / gesture memory:** a finger-driven XY control source that records a short gesture, loops it and feeds two CONTROL outputs. It would make the phone itself part of the instrument.
3. **Further parasitic behavior:** PARASITE already lets activity alter future pitch/sequence changes, fault probability and other macros. SWITCH now accepts its delayed pressure at SELECT; further structural mutation would need the same delayed-edge and AUDIO cycle rules.
4. **FUSE / sacrificial contact:** a chip that accumulates incoming energy and latches silent until tapped to replace/reset it. Unlike SNAP’s automatic recovery, it would create a visible, playable failure.

## Research

See `RESEARCH.md` for the official modular-rack sources, module-role comparisons and explicit differences between our stylized DSP and the referenced hardware. These are original simplified instruments, not commercial hardware replicas.

## Larger reactive chip displays

The chip accents now use a muted per-module palette: lavender memories, brass/paper resonances, sea-glass spectral/modulation roles and olive/coral faults. The chip header, library icon, editor and live pixels share the same accent. Dark green backgrounds and the existing workspace geometry remain the visual base.

The chip display now uses 104 × 80 logical pixels, about 2.7 times its former area. Different modules have their own signal-driven trace, particle/phase portrait, broken contact, phrase, spectral window or pressure view. Activity grows the border/perimeter and can displace the inner drawing by up to two pixels. The chip body, jack locations, cable endpoints and saved positions stay fixed, so patching does not chase a shaking target. The editor uses integer scaling, with a compact display beside controls in short landscape windows.

See `ROADMAP.md` for the visual design, implemented module roles, official modular references and remaining directions.


## Rough voices, drawings and the grouped library / v0.12

The + library is ordered by Sources, Clocks & patterns, Motion & control, Tone & damage, Space & memory, and Routing & output. Every module appears once. There is no search or favourites system; the compact workspace and per-patch 48-module limit stay the same even though the catalog has 52 choices. Undo/Redo is deferred; named snapshots and Back remain available.

CLIP blends compensated atan saturation into hard clipping. FUZZ adds asymmetric bias, envelope-controlled gating and upper-range rectification; local DC removal follows the nonlinear stage. Both are sample-transparent at zero DRIVE with no modulation. CRUSH independently reduces signed amplitude resolution (2–24 bits) and audio update rate (20 Hz…native sample rate). At 24 bits/full rate it passes the original samples; low bit depths can silence quiet signals. These are deliberately aliasing/rough digital effects, without hardware-emulation or oversampling claims. Their **Effect on / Bypassed** editor button crossfades over about 5 ms; processing continues while bypassed. The bypass choice persists in JSON and snapshots.

CHIP is an original stepped source: pulse duty choices, a 32-step triangle and a 15-bit LFSR with two taps. TUNE/PITCH drive a rounded virtual timer; CHARACTER changes duty/noise cycle/note decay and introduces a four-note fast arpeggio above 60% in pitched modes. It sustains without a TRIG cable and becomes a short one-shot when patched. PULSE/TRIANGLE/NOISE choices use the familiar editor buttons. The waveform amplitude is stepped to a nominal signed 8-bit grid; it is not a console chip model. WIDE is available, but the virtual timer imposes its own lowest clock near 1.7 Hz and the engine bounds the upper oscillator frequency to 0.45 × sample rate. TUNE labels are nominal before timer rounding.

TOUCH starts with a four-second circle. Draw on its dedicated editor pad to replace it with a timed path (up to 12 seconds / 256 points). Pointer-up commits it; pointer cancellation keeps the previous path. A tap records a short stationary path. Clear path restores the circle. SPEED replays timing at 0.125×…8× and SMOOTH rounds the output corners. X/Y are bipolar controls and LOOP is one event per wrap; RESET returns the playback cursor to the beginning. The path itself is validated and included in version-1 JSON/snapshots/autosave. Recalls restart playback; equal slider updates do not reset the cursor. The pad is separate from chip movement, and clearing it does not require a keyboard.

PENDULUM uses two damped, driven nonlinear angular states with different natural frequencies and reciprocal coupling. ENERGY changes drive/speed, COUPLING the mutual force. ANGLE A/B expose normalized angles; CROSS A/B emit one-sample events when the bodies cross the center with meaningful velocity. The 16-sample physics step bounds angular state/velocity. The editor Kick and KICK input add a seeded impulse; RESET restores initial angles. Motion survives Stop/Run and routing edits, while explicit preset/snapshot recall restarts seeded state. Snapshots save controls and cables, not live angular momentum.

The displays show actual transfer curves, held/quantized waveform samples, gate state, saved XY paths, replay positions and pendulum angles. Chip bodies, jacks and cable anchors remain fixed. The source ZIP includes the repaired GitHub Pages workflow: it builds Vite output and deploys `dist`, so a new repository does not publish raw TypeScript.


## v0.13 voice refinement

ALLOY retains four note voices. A new TRIG latches that voice's pitch without moving older notes to it; PITCH movement between attacks transposes all active voices by the same interval. Pitch glides over 8 ms. SOFT emphasizes near-harmonic FM, METAL an inharmonic ratio sweep, ROUGH stronger non-integer feedback. Envelope-dependent modulation softens the decay, a continuous subphase removes the old wrapped half-phase discontinuity, and a frequency-dependent index budget limits high-band sidebands. This is not alias-free FM.

RESON keeps TRIG/PITCH/EXCITE in their original positions and appends MATERIAL CV as the fourth input. Material and pitch move over 30 ms through six TPT resonant states. Material moves wood → metal → string-like ratio families; damping and modal gains vary across the bank and output is bounded. Existing patches remain valid but their tone/level can change.

PARTIAL keeps 32 components, existing seed phases and Nyquist masking/energy normalization. MASS/WARP now smooth CV; partial entry uses a smoothstep and WARP is gentler around integer harmonics. DRONE retains six oscillators and saved seeds, adding a very slow seeded nonperiodic detune target under SPREAD². At SPREAD zero its pitch is stable. Shared interpolated sine lookup and high-harmonic masking reduce trigonometric work and avoid unnecessary high-band folds.

CAUSTIC keeps asymmetry and supply starvation. First-order antiderivative averaging replaces point sampling of fold crossings, without oversampling. Low BURN becomes more audible through revised drive/mix, and CV is smoothed. This reduces folding error/aliasing but also softens high frequencies and has a half-sample averaging character; it is not an alias-free analog model.

**LPG** couples an opto-like opening to amplitude and a two-pole lowpass. BITE changes open brightness; DECAY changes strike release and closing memory. STRIKE excites an internal envelope, OPEN holds a continuous opening, and the greater of the two drives the gate. If neither control cable is present, AUDIO alone opens continuously. A connected silent STRIKE without OPEN closes it. ACTIVITY and the aperture show the actual opening.

**OPERATOR** is a patchable sine-phase oscillator with TUNE/DEPTH, PITCH and stereo-averaged AUDIO MOD. Unpatched MOD uses limited, internally delayed feedback; a connected MOD replaces it completely, including a silent cable. DEPTH zero is a sine. Two interpolated substeps and averaging plus a high-frequency index budget temper aliasing, without introducing any new patch-graph feedback permission. Strong/high-frequency/noise PM can still alias. WIDE follows the existing source rule. Chain multiple OPERATORs or use OSC/NOISE as MOD.

These are the only two new modules. Presets, snapshots, recording, TOUCH/PENDULUM, cables and module deletion/adding interactions remain unchanged. The reported iPhone module-deletion difficulty is deferred because this release explicitly excludes interaction changes. Actual native browser listening remains necessary.


## v0.14 interaction and mobile editing

Module removal is now in the sticky editor header: tap the trash icon next to Close, then confirm **Cancel / Remove**. The prompt names the module and its instance number. Both header buttons and confirmation choices have at least 44×44 CSS-pixel targets. The bottom removal button is gone. Cancel/Escape preserves patch, selection and audio; Remove uses the existing removal path and deletes the module's cables. Direct Delete/Backspace on the workspace still works. The confirmation is dismissed on editor rerender, and a stale prompt cannot remove a different selected module. The existing portrait 49dvh editor, landscape layout, chip geometry and patching gestures remain.

**EDGE** converts an audio attack into an EVENT. It compares short (6 ms) and long (150 ms) stereo energy, with a sensitivity-dependent relative threshold, noise floor, hysteretic re-arming and a 20 ms…2 s recovery interval. ACTIVITY follows short-term energy. Steady tones/noise do not become an internal clock; a new attack must rise above recent history. This complements PARASITE's sustained energy-driven controls. Patch EVENT into RESON/TRIG, LPG/STRIKE or another trigger input. Low sensitivity ignores soft attacks, and long recovery intentionally misses closely spaced attacks.

**MESH** uses five broad complementary bands formed from four parallel one-pole crossovers. B's stereo band envelopes shape A's band gains; MEMORY sets their 20 ms…2 s release and TRANSFER their strength. The stereo A channels stay independent. Band gains are bounded and smoothed, with bounded energy-based compensation; no B audio is mixed into the output and there is no oscillator/resynthesis. At TRANSFER zero or with no B cable, A is passed sample-for-sample. A connected silent B tends back toward unity; the remembered profile decays rather than disappearing immediately. The displayed upper bars estimate processed A-band energy and lower bars show B's retained energy. The bands are intentionally broad, not a precise FFT or vocoder.

**ORBIT** moves audio with internal 0.01…4 Hz sinusoidal motion or external POSITION CV, with DEPTH setting the range. A 15 ms position smoother avoids abrupt pan steps; POSITION output and the dot show that actual state. Its orthogonal stereo rotation preserves summed instantaneous L²+R² and retains two independent stereo components. Dual-mono input follows equal-power left/right panning; existing stereo material undergoes field/phase rotation rather than being summed to mono. DEPTH zero is centered. This is stereo motion, not a binaural/HRTF spatializer.

These are the only three new modules. All 54 existing DSP classes, saved presets, snapshots, LOOP/recording/export, TOUCH/PENDULUM, master protection and graph cycle rules remain unchanged. The catalog gains one entry in Clocks & patterns (EDGE), Tone & damage (MESH) and Space & memory (ORBIT).


## v0.15 appearance

Small programs inside an old home computer: near-black fields, green text and eight restrained accent families. AUDIO remains amber, CONTROL cyan and TRIGGER green. Each module retains a warm/cool identity; a shared palette now feeds DOM controls, SVG cables and pixel displays. The existing clock-step state uses amber to mark its hot dot. Nothing flashes on a new timer.

Tiny5 is used for chip names and window titles; menus, numbers and descriptions use the existing DM Mono. Both are self-hosted under the SIL Open Font License; copies and sources are listed in THIRD_PARTY_NOTICES.md. The retained Space Grotesk asset/license remains available to older source consumers but is no longer loaded by this theme.

Square, opaque windows and flat buttons replace rounded panels and glow. Sliders use a ruled track and a rectangular marker with the same continuous input behavior. Signal pixels share the chip background. Selected chips have a clear double outline and a small corner marker. Cables keep their original paths, hit areas and signal colors; their visible lines are thin and unblurred.

The 128×132 chip, 104×80 display and all jack anchors are unchanged. Every pixel animation keeps its original geometry and telemetry meaning. Quiet visuals and system Reduced Motion still work. Main toolbar, zoom, panel and deletion controls use 44-pixel targets; compact chip jacks retain their original hit geometry and larger editor-jack alternative. Portrait keeps the bottom editor; landscape keeps the side editor. The sticky delete/cancel confirmation and safe-area spacing remain.

This release changes no DSP, module catalog, parameter, port ID, patch format, snapshot, LOOP/recording action or patching gesture.


### v0.15.1 — Little enclosures

Chips now have tinted shells, a stepped rim, a raised nameplate and a recessed signal window. Small lower ventilation marks and hard, unblurred edges give each machine a physical housing. Library tiles share the material. The 128×132 bodies, header/display positions, jack anchors, touch targets and signal-driven animations are unchanged. All additions are static CSS and ignore pointer events. Audio and patch data are unchanged.


## v0.16 — Dissolution and contact

SMEAR loosens an attack into separate lingering histories with SMEAR/MEMORY. At zero it passes exact stereo dry; MEMORY has no freeze setting. FRICTION generates sound from catching and slipping, controlled by PRESSURE/SPEED, with PITCH CV and a SLIP event for other voices. Both keep the current two-slider housing and typed patching.

Try the appended DISSOLVING METAL and SLIDING GLASS presets, then compare the [listening studies](https://petandb-bot.github.io/signal-machines-v1/listening/). See [Strange sound notes](STRANGE_SOUNDS.md) for connections, cues, overlap decisions and limits. These renders are available for human evaluation; no listening-quality verdict is claimed. All original 57 modules, 32 presets and recording/snapshot/interaction behavior are preserved.

## v0.18 — Four new machines

- **MIRAGE / DISTANCE + MUTATE:** returning echo packets change their spectral outline from generation to generation. DISTANCE changes the next packet's interval; MUTATE changes the transformation. AUDIO in/out, two macro CVs, ACTIVITY out.
- **LOSS / DAMAGE + RECOVER:** lose short packets in three bands and reconstruct their traces. DAMAGE=0 passes the exact stereo original. RECOVER changes the repair method, not the wet mix. AUDIO in/out, two macro CVs, ACTIVITY out.
- **CUTS / SPARSE + CHANGE:** choose finite attacks, textures and tails from a sample, leaving rests. Higher SPARSE means longer gaps; CHANGE explores class, length, speed and occasional reverse playback. It plays autonomously; connected TRIG takes over timing, with a short SPARSE-dependent recovery period. AUDIO and EVENT out. Source/load/storage controls are shared with FOUND. The combined FOUND+CUTS limit is two, up to 60 seconds / 32 MB per file. Local sound stays in this browser; JSON/snapshots store references only.
- **NERVE / SENSE + FATIGUE:** STIM accumulates membrane charge; TRIG adds a short stimulus; RESET holds the machine at rest. SENSE changes sensitivity/threshold, FATIGUE changes adaptation and recovery. SPIKE is an event; CHARGE is a continuous control. No stimulus means no spontaneous random firing.

Try the five appended presets: MIRAGE / AFTERIMAGES, LOSS / UNCERTAIN, CUTS / SMALL HOURS, NERVE / RECOVERY and UNCERTAIN ECOSYSTEM. [Comparison WAVs](https://petandb-bot.github.io/signal-machines-v1/listening/four-machines.html) and [review limits](v018/README.md).
