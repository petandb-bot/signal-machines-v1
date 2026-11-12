# Modular rack research and design / 2026-11-11

Official manufacturer pages were consulted for module roles and patching ideas. SIGNAL MACHINES uses original, deliberately simplified DSP and a two-macro interface; it does not reproduce these products or claim component-level/sonic equivalence. No manufacturer assets or source code were incorporated.

| Primary source | Observed idea | Adaptation in this application |
| --- | --- | --- |
| [Strymon Magneto](https://www.strymon.net/product/magneto/) and [official support](https://www.strymon.net/support/magneto/) | Stereo multi-head tape delay; saturation, tape-age coloration, wow/flutter and crinkle controls | **TAPE** combines a short moving tape path, two echo heads, bounded cross-feedback, saturation, bandwidth loss and seeded mechanical drift. WEAR/ECHO replace a large front panel. It does not implement Magneto's looper, sampler, spring reverb or other modes. |
| [Instruō saïch](https://www.instruomodular.com/product/saich/) | Multiple oscillators, detuning, interval offsets and mixing create sustained harmonic structures | **DRONE** uses six digital additive oscillators, slow detuning, continuously opening intervals and stereo spread. It sustains without clock/gate and exposes SPREAD/COLOR. It is not a four-analogue-saw or diatonic-mode emulation. |
| [Frap Tools FUMANA](https://frap.tools/products/fumana/) | Parallel bandpass arrays and macro spectral control; envelopes derived from modulation audio can affect spectral balance | **SIEVE** scans a weighted window across six fixed TPT bandpass filters. FOCUS/WIDTH can receive CV, including PARASITE feedback. It does not implement FUMANA's sixteen-band dual analogue architecture or full spectral-transfer routing. |
| [Doepfer A-119](https://doepfer.de/a119.htm) | An envelope follower derives a control signal from audio amplitude | **PARASITE** extracts bounded PRESSURE from sound energy and adds a seeded, bipolar FEVER movement with memory. A separate graph design explicitly delays its outputs, enabling a circuit to affect its own future behavior. This delay/feedback scheme is our design, not a claim about the A-119. |

## Why these roles were selected

A continuous source, a spectral shaper, a memory/echo processor and an audio-to-control analyzer add different building blocks. They work with the existing sequencers, resonators, corruption modules and spatial memory. They also make the requested behavior directly patchable:

`DRONE → SIEVE → TAPE → SNAP → OUTPUT`

`SNAP.audio → PARASITE.audio`

`PARASITE.pressure → SNAP.fault`

`PARASITE.fever → DRONE.spread / SIEVE.focus`

More output energy can increase interruptions; interrupted sound then stops feeding the parasite, which releases according to MEMORY. The held control outputs wait a full intervening audio quantum, so this is a causal feedback circuit rather than an algebraic loop. All non-delayed AUDIO/CONTROL cycles remain rejected. A source-level metadata flag defines eligible ports; imported JSON cannot authorize its own delay bypass.

In UNSTABLE CIRCUIT, chamber audio feeds PARASITE and its pressure drives BRANCH CHANGE. The evolving sound can therefore influence subsequent sequence mutations. Mutations remain probabilistic and phrase-based, rather than occurring on every visual frame.

## Snapshots as an instrument feature

Named snapshots preserve the entire patch configuration: modules/IDs/seeds, cables, positions, parameters, character, BPM and master. They store immediately in the current browser, with up to 20 slots and a validated export/import bank. Recall keeps the patch that was present just before recall available through Back.

This release recalls a seeded restart, not an exact continuation of oscillator phase, held fragments, evolving random cursors or delay buffers. Such a continuous performance snapshot would require an audio-thread state-transfer format, schema migrations and an explicit memory/latency budget. The UI states the restart behavior rather than implying volatile audio is saved.

In v0.6, LOOP adds a separate 16-second recording and overdub role. Its take stays in memory across Stop/Run in the current tab, and WAV import/export carries the audio independently. Snapshot recall and JSON/preset replacement deliberately create an empty take; the editor and snapshot panel state this. See `ROADMAP.md` for the official VCA, envelope, selector and sound-on-sound references used for these original simplified roles. CHORUS and CLOUD are original small delay/grain effects, without a hardware-emulation claim.


## Basic sources and frequency effects / v0.7

The following official examples informed the roles discussed before implementation. The application uses original compact digital processors, not replicas of the circuits or commercial firmware.

| Reference | Role used here |
| --- | --- |
| [Doepfer A-110-1](https://doepfer.de/a110.htm) | Separate basic waveform oscillator and selectable base range; OSC offers sine/triangle/saw/pulse, while DRONE gains 55/110/220 Hz ranges. |
| [Doepfer A-118](https://doepfer.de/a118.htm) | Unadorned noise as source material; NOISE offers digital white, approximate octave-row pink and low-frequency brown, separate from VENOM. |
| [Doepfer A-106-5](https://doepfer.de/a1065.htm) | Low/band/high frequency selection with cutoff and resonance; FILTER is a bounded digital state-variable design. |
| [Doepfer A-114](https://doepfer.de/a114.htm) | Multiplication of two bipolar audio signals and sum/difference sidebands; RING accepts two sources and has an optional internal sine. |
| [4ms DLD official manual](https://4mscompany.com/media/DLD/manual/DLD-manual.pdf) | Short resonant delay excited by noise/impulses; COMB uses interpolated feedback and damping with a PLUCK input. |
| [Doepfer A-126-2](https://doepfer.de/a1262.htm) | Additive Hz displacement of every frequency component; SHIFT uses approximate digital quadrature/allpass processing, without claiming the analog device's measured performance. |

These roles are playable in CLEAR SIGNAL, WIRE STRINGS and SIDEBAND GARDEN. Numeric tests measure source purity, noise coloration, filter response, multiplication sidebands and frequency displacement. Perceived character, speaker audibility and native iPhone performance still require listening and device tests.


## Requested design references and coverage / v0.8

Official documentation was reviewed for all eight roles below. The decision is based on patching roles rather than brand names or matching feature counts. Only missing roles receive new chips; already-related processors remain in use. These are original compact designs with two macros, not firmware ports or hardware reproductions.

| Reference | Existing coverage and decision |
| --- | --- |
| [Mutable Instruments Marbles manual](https://pichenettes.github.io/mutable-instruments-documentation/modules/marbles/manual/) | PULSE/BRANCH already cover a clock and remembered phrases. New **CHANCE** adds correlated density-shaped trigger choices and biased scale pitch with an eight-decision recall probability. It has one external clock, two triggers and one pitch output, without the full t/X/Y sections, scale learning or channel options. |
| [Qu-Bit Bloom v2](https://www.qubitelectronix.com/shop/p/bloom-v2) | **BRANCH** already retains, mutates and revisits seeded phrases. Keep it rather than adding a near-duplicate sequencer. This does not provide Bloom's three 64-step channels, MIDI or full branch editor. |
| [Make Noise Spectraphon](https://www.makenoisemusic.com/modules/spectraphon/) | New **PRISM** analyzes sixteen fixed spectral envelopes and resynthesizes a harmonic voice, with LIVE/HOLD and trigger refresh. This adds actual analysis/resynthesis missing from SIEVE's filtering and LOOP's audio replay. It is one small bank, without Spectraphon's dual complex-oscillator architecture, complete arrays or internal FM bus. |
| [Xaoc Odessa](https://xaocdevices.com/main/odessa/) | DRONE already provides sustained beating, but only a small fixed voice structure. New **PARTIAL** directly shapes up to 32 sine partials, rolloff and compressed/stretched spacing. It does not claim 2,560 partials, five voices, through-zero FM or hardware equivalence. |
| [Noise Engineering Basimilus Iteritas Alia manual](https://noiseengineering.us/manuals/basimilus-iteritas-alia/) | **ALLOY/RESON** cover triggered FM and modal hits; **NOISE/VENOM/CAUSTIC** add noise and folding. Reuse these related roles; no additional drum clone or identical six-oscillator engine is claimed. |
| [Make Noise Morphagene manual](https://www.makenoisemusic.com/wp-content/uploads/2024/03/morphagene-manual.pdf) | **LOOP/CLOUD/FRACTURE** already cover capture, overdub, speed/reverse and grain/fragment processing. Connect LOOP → CLOUD or FRACTURE to layer time edits. Full Splice/Gene/reel semantics, simultaneous reverse recording and SD-card workflows are not claimed. |
| [Qu-Bit Data Bender](https://www.qubitelectronix.com/shop/p/data-bender) | **FRACTURE/SNAP/TAPE** provide captured repeats/reversal, interrupted contacts and worn transport. Keep these related roles rather than a duplicate fault buffer. Full hardware corruption/clock algorithms are not claimed. |
| [Make Noise Plexiphon](https://www.makenoisemusic.com/modules/plexiphon/) | **CHAMBER** already provides spatial feedback. New **WEAVE mode** extends its DENSITY macro to rotate feedback connections from independent echoes toward an entangled field. Four orthogonal Givens rotations keep interpolation bounded. ROOM remains the legacy sound; this is not Tom Erbe's algorithm or the hardware's full Plexus/Couple/Skew controls. |

CHANCE GARDEN, SPECTRAL GHOST and HARMONIC WEATHER demonstrate these roles. PRISM's analyzed/held amplitudes are runtime memory, retained across routing and transport in the tab, but excluded from JSON/snapshot recall. Names, layout, modes and macros remain portable in existing version-1 patches. The muted per-module accents express different roles while keeping the established dark green instrument atmosphere.


## Shared time, physical CV and arithmetic / v0.9

The repeated ADDAC503 entry in the request is treated as one role. The first five manufacturer references below were consulted for role definitions; the Sprott manufacturer's original manual was not verified in this pass. No manufacturer code, transfer tables, panel artwork or circuit model was imported.

| Reference | Compact adaptation and explicit scope |
| --- | --- |
| [ALM Pamela's PRO Workout](https://busycircuits.com/pages/alm034) and [official manual](https://busycircuits.com/docs/alm034-manual.pdf) | **WEFT** adds a shared timebase, two Euclidean trigger lanes at different cursor rates, an envelope and a smoothed random control. RATE/FILL and 8/12/16-step selection replace a per-channel configuration tree. It has four outputs, not Pamela's eight independent fully programmable channels. Probability/recalled choices remain patchable through CHANCE. |
| [Nonlinearcircuits Triple Sloth](https://www.nonlinearcircuits.com/modules/p/triple-sloth) | **TIDE** adds three independent deterministic nonlinear flows on seconds, minutes and tens-of-minutes scales. It uses numerical Lorenz systems with shared FLOW/RANGE, not Sloth's analog circuits or exact timing. FLOCK remains the correlated wandering/LFO-like role; TIDE emphasizes independent nonperiodic state evolution. |
| [ADDAC503 Marble Physics](https://www.addacsystem.com/en/products/modules/addac500-series/addac503) | **BOUNCE** exposes a small bounded moving body's X/Y, speed and wall events. TILT/ELASTIC, two external tilt inputs and a Kick action provide the useful patching roles without a full physical-settings panel. The particle/tray equations, damping and collision thresholds are our own simplified design. |
| [Schlappi Nibbler](https://schlappiengineering.com/products/nibbler-preorder) | **COUNT** advances a modulo-16 accumulator using internal tempo/audio rate or external trigger/audio crossings. Two bit-rise events, the numeric CV and DC-removed audio expose the low/high-speed relationship. It does not reproduce the CMOS logic, all bit gates or full accumulator architecture. |
| [Xaoc Jena](https://xaocdevices.com/main/jena/) | **MAP** uses eight original 256-entry byte mappings on audio/CV, plus a crossing event output and optional CV latch. These are our transfer tables and ports, without the hardware's Leibniz byte bus, complete banks or Walsh functions. |
| Sprott role supplied in the request | **FERAL** adds the requested filter-to-nonlinear-oscillator behavior using an original driven Duffing-style resonator with bounded midpoint integration. It is not Sprott's jerk equation, circuit, calibration or product model. The older maker-domain link found during research redirected to unrelated material, so it is not treated as a product source or linked here. |

Four presets demonstrate the roles together: CLOCKWORK GARDEN, SLOW WEATHER, MARBLE ROOM and BINARY FEVER. All new chips keep the existing compact body, typed jacks, muted accent palette and two macros. TIDE/BOUNCE runtime dynamics survive a transport pause in this tab; configuration recall restarts seeded state. The accelerated forty-minute Lorenz test validates numerical bounds and slow movement, not actual device temperature, battery, native audio or human listening.


## Original pitch/time utilities / v0.10

QUANTIZE, SLEW, FORMANT, LOGIC and DUCK implement the roles requested after the rack survey. They do not adapt additional commercial firmware or claim a particular hardware model. No new manufacturer research was required for these generic roles.

QUANTIZE defines its tuning mathematically: 12 or 19 equal octave divisions, or 13 equal divisions of the tritave (frequency ratio 3:1). Fractional attraction and bypass preserve pitches between the grid steps. SLEW uses standard exponential lag or bounded constant-rate motion with separate rise/fall. FORMANT is a stylized three-resonance voice/noise filter with vowel targets, not a speech model. LOGIC combines 6 ms event windows and an independently accumulating companion clock; rational frequency ratios and √2 allow coincident and drifting phases. DUCK uses a sidechain/trigger envelope to attenuate a separate target without mixing in the key.

These choices widen composition beyond the pentatonic BRANCH/CHANCE defaults without imposing a new global scale or settings hierarchy. BENT VOWELS, SPLIT ORBITS, TRITAVE FIELD and OFF GRID demonstrate them. Cultural tuning systems and full hardware control architectures are not inferred from these mathematical grids.


## User-proposed interacting bodies and fault memory / v0.11

The five original roles here follow the user's supplied descriptions, without importing a commercial module's code or claiming a hardware/circuit simulation. SWARM uses four damped XY bodies with neighbour pitch/activity influence; UNSPENT conserves events in an explicit bounded store; SIDEWAYS applies damped mutual attraction to numeric controls; QUORUM compares CV proximity/dissent rather than trigger coincidence; FAULT LINE accumulates actual audio energy/onset stress and temporarily opens a displaced/reversed, crushed history path.

The requested overlap filter omits MISPRINT (BRANCH/CHANCE/MAP), CAPILLARY (CHAMBER WEAVE) and LOST PROPERTY (LOOP/CLOUD/FRACTURE). Those existing modules cover related useful roles, without claiming identical persistent-error or context-triggered archival-recall algorithms. FAULT LINE remains a separate addition because audio-driven fracture/healing was explicitly prioritized even alongside existing fault/distortion tools. The two-macro editor and physical-state display pattern remain unchanged.


## v0.12 rough sound and playable motion

These additions implement the user-approved original roles without new manufacturer models. CLIP uses rounded/hard transfer curves, FUZZ a biased nonlinear stage with gating/rectification, and CRUSH explicit amplitude quantization plus slowed audio updates. CHIP combines generic timer-stepped waveforms, pulse duties, a small LFSR and arpeggio behavior; no console firmware, game sound or branded chip reproduction is used.

TOUCH stores the user's actual XY/time samples as a replayable control path. PENDULUM uses two bounded driven angular bodies and center-crossing events, extending the physical interaction approach of BOUNCE with different timing and coupling. The library groups all module types once by role; search, favourites and Undo/Redo were not added. Existing CAUSTIC folding, MAP byte transforms and FAULT LINE temporal stress keep their distinct roles.
