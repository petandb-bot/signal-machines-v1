# Module directions / v0.14

## v0.15 — Home computer windows

Visual-only release: shared eight-family palette, Tiny5 chip titles, readable monospace controls, flat square windows and instrument-like sliders. Chip/jack geometry, all 57 modules and signal-driven pixel motion are preserved.

The library now contains 57 implemented modules. The utility/memory roles, basic waveform/noise sources and six additional frequency/effect roles are implemented. Existing compact chip dimensions and larger reactive displays remain in place.

| New chip | Implemented role | Starting patch |
| --- | --- | --- |
| **VCA** | Multiplicative LEVEL CV and equal-power two-source BLEND | DRONE → VCA, SHAPE → LEVEL |
| **SHAPE** | Retriggerable rise/fall envelope and inverse | PULSE → SHAPE → VCA or SIEVE |
| **SWITCH** | Seeded probabilistic A/B choice, CV override, adjustable crossfade | Separate clean/corroded branches → SWITCH → TAPE |
| **LOOP** | 16-second stereo capture, overdub, pause, reverse/freeze, WAV import/export | DRONE → CLOUD → LOOP → CHORUS |
| **CHORUS** | Three moving stereo delay voices | DRONE, RESON or LOOP → CHORUS |
| **CLOUD** | Four windowed grains from recent audio, variable size and seeded lookback/reversal | TAPE/DRONE → CLOUD |
| **OSC** | Sine, triangle, saw and pulse; tune/pitch CV | OSC → CAUSTIC → FILTER |
| **NOISE** | Seeded white/pink/brown stereo noise | NOISE → VCA → COMB |
| **FILTER** | Low/band/high pass with cutoff and resonance CV | SHAPE → FILTER CUTOFF |
| **RING** | External audio product or internal sine carrier | DRONE + OSC → RING |
| **COMB** | Tuned resonant delay with audio or trigger excitation | NOISE → COMB → TAPE |
| **SHIFT** | Approximate single-sideband Hz displacement | RING → SHIFT → CHAMBER |
| **CHANCE** | Remembered dual trigger probability and biased scale pitch | PULSE → CHANCE → COMB / ALLOY |
| **PRISM** | Input spectral envelopes become a new live/held harmonic voice | LOOP/OSC → PRISM → CHAMBER |
| **PARTIAL** | Direct additive partial density and warped spacing | PARTIAL → CHORUS → CHAMBER WEAVE |
| **WEFT** | Shared clock, Euclidean lanes, envelope and random CV | WEFT → BRANCH / COMB / VCA |
| **TIDE** | Three independent slow nonlinear flows | TIDE → PARTIAL / FILTER |
| **BOUNCE** | Position, velocity and collision-based events | BOUNCE HIT → RESON |
| **FERAL** | Damped filtering into driven nonlinear oscillation | MAP → FERAL → FILTER |
| **COUNT** | The same modulo arithmetic at rhythm or audio rate | COUNT → MAP |
| **MAP** | Original byte transfer tables for audio/CV/events | COUNT or OSC → MAP |
| **QUANTIZE** | 12/19 octave divisions or 13 tritave divisions, optional partial attraction | TIDE/BOUNCE → QUANTIZE → voice PITCH |
| **SLEW** | Independent rise/fall, exponential lag or constant-rate glide | QUANTIZE → SLEW → FORMANT |
| **FORMANT** | Vowel-shaped source/whisper or external audio resonances | FORMANT → CHAMBER, or LOOP → EXCITE |
| **LOGIC** | Windowed OR/XOR/AND, generated rational/irrational clock ratios and lane delay | PULSE → LOGIC → separate voices |
| **DUCK** | Keyed/triggered stereo attenuation and exposed gain | ALLOY → KEY, DRONE/CHAMBER → TARGET |

LOOP has a four-instance limit, preallocated audio memory and correlated control messages. Captured takes survive Stop/Run within the tab. Presets, JSON, snapshots and page reload do not retain them; export WAV first. Exact performance continuation and a portable snapshot-plus-audio bank remain separate future designs.

## Useful next directions

- **TOUCH:** record a finger's XY motion and loop it into two CONTROL outputs. It would give the phone a playable modulation surface.
- **FUSE:** accumulate audio energy and latch silent until explicitly reset, giving a failure a different role from SNAP's automatic recovery.
- **General undo:** make individual cable edits and parameter experiments reversible while retaining named snapshots for larger states.
- **Audio-backed snapshot banks:** package loop WAVs with explicit module IDs and versioned metadata, with memory/storage limits and transactional import.

## Primary references for these roles

- [Intellijel Quad VCA official manual](https://intellijel.com/downloads/manuals/quad-vca_manual_2021.08.02.pdf): voltage-controlled amplification, manually set or modulated levels, and cascaded mixing. VCA uses a smaller two-macro interface and two audio inputs.
- [Doepfer A-140 official manual](https://doepfer.de/a100_man/A140_man.pdf): gate-triggered envelope voltage. SHAPE implements a rise/fall one-shot with complementary outputs.
- [Joranalogue Select 2](https://joranalogue.com/collections/eurorack/products/select-2): selection, gating, holding and processing voltages, including audio. SWITCH selects explicit typed audio paths with seeded event choice or a CV override.
- [Make Noise Morphagene](https://www.makenoisemusic.com/modules/morphagene/): recording, rearranging and sound-on-sound layering suggest a broader loop-memory role. LOOP is a smaller original design with a 16-second stereo take, overdub, variable speed and WAV transfer.

## Visual direction implemented in v0.5

The logical chip display is 104 × 80 (previously 96 × 32), about 2.7 times the pixel area. The chip remains 128 × 132 so the patch layout and cable/jack coordinates stay stable. Only signal imagery is displaced, by at most two logical pixels; ports and click targets do not jitter.

PULSE ignites a dot train; BRANCH shows the retained phrase and current step; FLOCK shows related positions; ALLOY/RESON/CHAMBER draw larger interacting traces; DRONE and CAUSTIC form signal phase portraits; VENOM scatters real sample values; FRACTURE breaks the time display around its read cursor; SNAP shows a genuinely open/broken contact; TAPE shows its wow-phase reels and traces; SIEVE expands its spectral window according to output energy; PARASITE spreads pressure and fever; OUTPUT has larger stereo meters.

Borders and a small perimeter react to measured activity. The visual generator does not consult random numbers or wall-clock timers. It reads DSP waveform samples, envelope, phase, contact gain and control values. Stopped chips rest. Lively mode renders at 24 fps; quiet mode and the system reduced-motion setting remove internal jitter/decorative copies and render at 12 fps while continuing to show the signal. This affects appearance only, not the patch or snapshot data.


## v0.8 scope and palette

The module comparison in RESEARCH.md keeps already-covered roles in the existing library. CHAMBER gains WEAVE instead of adding a second large spatial processor. All new chips retain two macros, the established typed jacks and the compact 128 × 132 body; small mode/range buttons use the existing editor.

Each module now has its own quiet accent: harmonic sources use cream/brass, slow modulation and spectral listening use sea glass, memory/grains use lavender/clay, and failures use olive/coral. Canvas colors come directly from the same definitions as library/chip/editor accents. Names, symbols and signal-driven shapes also distinguish modules. Quiet/reduced-motion rendering and fixed patching coordinates remain part of the design.


## Pitch and time freedom shipped in v0.10

QUANTIZE/SLEW are now implemented, alongside FORMANT, LOGIC and DUCK. Quantization is a choice rather than a global rule: PULL zero leaves continuous pitch, 19 equal octave divisions extend beyond the familiar twelve steps, and 13 equal tritave divisions repeat at 3:1 instead of 2:1. LOGIC's generated B lane runs between A events, with 5:3 and other rational ratios plus √2. Physical CV, inharmonic partials and nonlinear voices can still be used without a pitch grid.

BENT VOWELS, SPLIT ORBITS, TRITAVE FIELD and OFF GRID are editable examples. Their modes, macros and cables use the existing JSON/snapshot format. The muted palette and compact reactive displays follow the current interface; there is no additional settings tree.

General edit undo, TOUCH gesture recording, FUSE and portable audio-backed snapshot banks remain useful workflow/instrument directions. These are proposals, not extra module choices in this release.


## v0.11 scope

SWARM, UNSPENT, SIDEWAYS, QUORUM and FAULT LINE are implemented with two macros and real state-driven displays. FAULT LINE deliberately extends the fault/distortion family: accumulated audio stress causes broken time and amplitude coarsening before healing. MISPRINT, CAPILLARY and LOST PROPERTY are omitted because their roles overlap existing remembered sequence/CV, interlinked diffusion and recorded-fragment tools; full versions of those proposals are not claimed.

WIDE ranges give eight source roles ±8-octave pitch, with broad tune on OSC/FORMANT/PRISM; WIDE OUTPUT preserves low motion down toward a 0.05 Hz DC-removal corner. Existing patches retain STANDARD. Four presets demonstrate the roles and broad-band output.

Master PCM24 WAV/AIFF export is shipped, alongside the existing native compressed option. It uses bounded transferred blocks and a 3-minute/48-MiB ceiling, with automatic completion and partial recovery on interruption. Long-form streaming to disk, seamless audio snapshots, TOUCH and edit undo remain separate future work.


## v0.12 additions and organization

CLIP, FUZZ, CRUSH, CHIP, TOUCH and PENDULUM are implemented with two macros and real state displays. The first three support a persisted, smoothly crossfaded bypass. TOUCH records a validated timed XY path; PENDULUM converts coupled angular motion into CV and events. Four starting patches demonstrate all six roles.

The library now groups types by role rather than adding search/favourites. The user explicitly prefers this arrangement. Undo/Redo is deferred because current editing and named snapshots already support their workflow; the remaining useful direction is parameter-only movement between compatible snapshots. Exact audio-state recall, long-form recording and general edit history remain future designs.


## v0.13 scope

ALLOY, RESON, PARTIAL, CAUSTIC and DRONE are refined; LPG and OPERATOR are the only additions. Graph feedback rules, preset content, snapshots, recording and interaction methods remain unchanged. iPhone module deletion is a reported open issue explicitly deferred from this audio-only scope.


## v0.14 scope

The iPhone removal issue is addressed with a sticky-header trash button and a small named Cancel/Remove confirmation. No long-press or swipe deletion is added. EDGE, MESH and ORBIT are the only new modules, providing audio onsets, cross-spectral band gain interaction and smooth stereo movement. Existing voices/effects, preset data and engine rules are unchanged. Native iPhone appearance, touch feel and listening still need a device check.
