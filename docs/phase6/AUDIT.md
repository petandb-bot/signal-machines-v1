# Phase 6 architecture audit / v0.21.0

Base: `610a6f450e88f1165732a6ced1156befaa7320cf`, merged Phase5 release. Original ten JSON files and all68 DSP source hashes were copied before curation edits. v0.20 references and Phase5 documents remain untouched.

BRANCH and CHANCE both index the identical15-entry minor-pentatonic collection. BRANCH has eight retained indices, root-neutral initialization, changes at the first step after2–5 laps, remembered previous material and probabilistic gate omission. CHANCE remembers eight random choices and eight notes; HIGH/LOW biases the same collection rather than selecting a different tuning. Full RECALL freezes the current loop. Phase5 deliberately selected seeds with root-to-root eight-note contours for seven patches. The common grammar therefore has two origins: the modules' fixed vocabulary/length, and the curation's deliberate seed selection. Distinct voices do not remove that structural similarity.

PULSE selects one of seven tempo ratios and seeded jitter/omission. WEFT's8/12/16 Euclidean groups can clock independently; its second output operates over a three-times-longer pattern. QUANTIZE can sample/hold on a clock and has12-TET,19-TET and13-tritave grids. SPAN changes input range, not the grid vocabulary. TIDE's three Lorenz processes run at different speeds without a phrase boundary. SHAPE articulates every incoming event, including retriggers during decay. COUNT's integer step modulo16 provides2/4/8/16-state relationships; audio-clock priority and its bit gates can displace events. LOGIC supplies interlocking event windows and a learned companion ratio. BOUNCE supplies bounded physical coordinates and collision events. TOUCH replays a drawn path with independent speed/smoothing. LPG can turn a continuous voice into a finite gesture without introducing another sequencer. CUTS has its own seeded spacing and sample-feature history; MIRAGE and TAPE carry audio memory.

## Compatibility decision

No new BRANCH/CHANCE mode is needed for this collection. Existing arithmetic, physical motion, held grids, amplitude relationships and audio memory already supply different grammars. All DSP remains byte-identical, including both old sequencers. This avoids both a hidden reinterpretation of SCALE and an unnecessary new mode. The limitation remains: BRANCH/CHANCE themselves still have fixed eight-step pentatonic behavior; old patches keep exactly that behavior. PIXEL alone deliberately retains the familiar Phase5 melody.

## Intended division of roles

| Patch | Primary organization | Time, memory and silence |
|---|---|---|
| STILL | Fixed110/220 harmonic relationship; slowly changing partial overlap | No note clock; TIDE/SLEW gently detune the partial structure over minutes; upper gain stays audible and constant |
| PIXEL | Dry pentatonic melody | Original eight-note phrase, rare omissions and pendulum colour; intentionally familiar |
| ROOM | Nonmetrical environmental presence | Original FOUND history/spatial motion; only a proposed +12dB LEVEL |
| SMALL | Irregular sample fragments | CUTS autonomous spacing/recency, NERVE fatigue and MIRAGE returns; no metrical clock |
| EXCHANGING | Material call/response | LOGIC3:2 clocks two different resonant bodies; first body excites the reply; coupling evolves |
| METAL | Imperfect interval family | Three held TOUCH plateaus, sampled by an independent jittered pulse; unequal7.3s contour |
| BINARY | Counting and displacement | Seven-in-twelve articulation against a three-times-longer reset pattern; no pitch melody |
| TAPE | Two-tone fragment and delayed memory | Modulo16 step8, held tritone pair, LPG gestures and unsynchronized worn returns |
| LATE | Four harmonic spaces connected by tails | Modulo16 step4, held quantized intervals, omitted/unequal arrivals and PLATE overlap |
| OFF | Physical pitch under asymmetric19-TET time | BOUNCE motion sampled on WEFT events; no inherited pentatonic sequence |

The two arithmetic patches share COUNT but differ in cycle length, interval family, articulation and temporal memory. Only PIXEL retains a root-to-root eight-step pentatonic phrase. No higher entropy, denser event count or greater loudness is treated as artistic success. Human listening is required.
