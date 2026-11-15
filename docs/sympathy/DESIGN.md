# SYMPATHY — design before implementation

Base: main abf0634 / v0.18.0. PR13 and PR14 are open and remain independent. No LIVING-mode dependency is introduced.

## Overlap review

- RESON is a six-mode TPT bank: a common excitation drives independent modal states. Increasing its mode count would not create exchange between bodies. Its DSP remains untouched.
- ALLOY is a four-voice envelope-shaped FM source. It transfers no conserved resonant energy between its voices.
- FRICTION integrates a slipping contact and drives three body modes; its surface mechanics and excitation are not the new network.
- CHAMBER stores propagating audio in four delay lines with feedback diffusion. SYMPATHY has no delay memory or recirculating audio path.
- COMB is a tuned, interpolated feedback delay with pluck excitation; the new design does not reuse its delay or feedback algorithm.
- DRONE and PARTIAL sum phase-continuous oscillators; their phases/amplitudes do not exchange a shared mechanical state. No code from the unmerged LIVING candidates is imported.
- MIRAGE exchanges full echo packets with generation-dependent transformations. The new network has no echo packet selection or capture/replay.

## Model and stability

Three imaginary resonant bodies per stereo channel, each with normalized position q and momentum p. Define energy E=sum(q²+p²)/2 (normalized units, not calibrated joules). Split each step into exact damped oscillator half-rotations, orthogonal momentum exchanges on links01/12/01, then another oscillator half-rotation. The exchange is a gyroscopic, skew-symmetric velocity coupling. Each pair rotation exactly conserves squared momentum norm; with no excitation the whole step can only dissipate energy. No forward Euler, output saturation or compressor is used to hide instability.

BODY morphs frequency ratios from near-unison to inharmonic spacing and changes dissipative rates. COUPLE changes the rate of exchanges, with exactly identity rotations at zero. Coefficients and pitch are smoothed; phase/state is never reset by a slider. This is a physically motivated imaginary instrument rather than a calibrated spring model. Retuning preserves normalized state energy, not a literal displacement potential with fixed physical units.

Only body0 is externally excited. Therefore nonzero body1/2 energy after a lone strike is direct evidence of coupling, not a second excitation or level boost. Two channel networks preserve channel independence; different fixed pickup weights on bodies1/2 give mono excitation a small spatial evolution as energy moves. Velocity pickups plus a3Hz output DC blocker remove stationary offsets.

Audio drive is bounded and scaled with dissipation so a finite sustained input has a bounded response. Internal strikes admit only a fixed finite energy budget and have a20ms recovery interval: this limits the mallet input, never clamps existing resonant states. All sources are silent at rest. Tiny sub-audible states may be zeroed below numerical-noise energy to avoid denormals. Fixed arrays only; telemetry allocates only at the existing update boundary.

## Interface / evidence

BODY and COUPLE sliders. Inputs AUDIO, TRIG, PITCH, plus COUPLE CV; outputs AUDIO and ACTIVITY. Four input positions use the existing chip rule. BODY remains a slider rather than another CV jack. Three animated bodies and links read actual stored energy, displacement and signed exchange data.

Tests: exact zero-coupling isolation; nonzero transfer; monotonic unforced total energy; decay; audio/TRIG/both; quiet/silent/invalid/extreme input; continuous controls; seeds;24/44.1/48kHz; independent instances; fixed memory; JSON and graph compatibility. Compare pulse, CHIP, metal, sine, band-limited noise and CUTS at low/mid/high coupling and multiple BODY values. Export RESON/CHAMBER comparisons and three independent demo JSONs. Numerical evidence and audio exports do not establish perceptual originality or good sound. Human listening and physical iPhone Safari are explicitly unverified unless performed. Deliver a review PR; no merge or Pages deployment.
