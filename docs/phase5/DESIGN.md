# Phase5 / WALLS and preset balance

Base: public v0.20.0 main e93ac301. The release changes after Phase4 only align version/lockfile; the DSP and curated patches are the reviewed Phase4 state. Review branch only; no merge, tag or deployment.

## Existing spatial DSP audit

CHAMBER: four size-dependent delay reads, sinusoidal read motion, Hadamard/Givens feedback, lowpass/DC states and nonlinear writes. ROOM and WEAVE are recursive reverberant memory, not a finite image-source group.
PLATE: eight fixed paths with normalized lattice diffusion and contractive frequency-dependent feedback, dense late decay. MIRAGE: two packet banks exchange mutating generations with recirculation. TAPE: cross-feedback echoes, worn filtering/saturation and moving flutter heads. CHORUS: three continuously sinusoidally moving short taps. ORBIT: direct orthogonal stereo rotation without delayed reflections. These implementations stay untouched.

WALLS instead writes only incoming stereo audio into one short circular history. Four positive reflection paths per output channel read this history; no reflected sample is ever written back. A fixed setting produces a finite sparse FIR response. The direct stereo path has zero added latency. DISTANCE jointly changes direct/reflected ratio, first arrival, later distribution, channel bleed, and surface brightness. Its direct gain remains .8–1, so distance cannot hide the source by volume alone.

## Proposed independent geometry

Nominal path times span about6–47ms nearby,18–132ms far away, with bounded channel/seed differences and at most150ms total history. Each path has a stable current and target tap. Changes use a complementary smoothstep crossfade between stationary reads; read positions never sweep during the fade. Fractional interpolation is only used within each fixed read. Coherent material can have temporary interference coloration during overlap; this is not claimed to be phase-transparent or a physical room model.

Surface response is a positive, normalized five-point binomial FIR blended with the unfiltered tap. It is finite, contractive and sample-rate-aware; unlike a lowpass IIR it cannot create an extended residual tail. The same fixed stereo input history supplies all paths. Stereo reflection mixes remain positive and mostly same-channel; no polarity inversion or mono collapse is used for width.

MOTION=0 freezes autonomous geometry (distance automation still works). At nonzero MOTION a seeded scheduler occasionally changes one path, with strength/rate set by MOTION; it does not oscillate every delay or move the dry image. Stopping motion schedules no further state changes, while a current crossfade finishes smoothly. DISTANCE CV requests bounded tap snapshots and smooth direct gain. Geometry and reflected meters drive pixel telemetry. Memory is fixed; no processing allocations, noise, saturation, tank, limiter or normalization.

## Preset evidence policy

Capture all ten unmodified60s renders, and180s for ROOM AIR, OFF GRID, SMALL HOURS and STILL, before source/integration edits. Preserve copied JSON, Float32 graph-output hashes, DSP hashes, original measurements and Phase4 documents. Candidate data is separate. Active20ms RMS uses a documented1e−4 threshold; level-matched listening copies target active-window .03 RMS with a constant gain and .8 sample-peak ceiling. Neither metric nor comparison gain is LUFS or preset normalization.

Measure stereo-summed spectral power (not the spectrum of mono fold-down), full/active RMS, quiet spans, source trigger timing, DC/correlation/fold-down and A-weighted RMS as an explicitly limited spectral proxy. Preserve sparse timing and individual identities. Any actual changes require old/new settings, numerical differences and musical trade-offs. If a preset lacks an existing spectral control, document a separate structural proposal rather than silently adding a module to the curated collection. Human listening and physical iPhone Safari are unverified.

## Verified static role before curation changes

The unchanged-seed impulse at DISTANCE0/.45/1 produces first reflections4.46/9.71/16.13ms and last nonzero samples49.71/88.54/136ms. Reflected/direct energy rises from .000895 to .03339 while immediate direct gain changes only1→.8. There is no response after the finite history: this is different from the recursive ROOM/WEAVE/PLATE tails in the level-matched comparisons. MOTION changes measured tap positions, and never creates output at rest. WAVs and geometry curves support a listening review; no perceptual approval is claimed.

The1/4/8-voice benchmarks include both44.1/48kHz. At48kHz eight voices average .713ms, p99≈1.435ms per128frames, fixed64,531 bytes each. Deadline excursions remain: the supplementary CPU/wall probe after6s warmup found both descheduling and actual CPU-time spikes. Warmup does not establish a mobile realtime guarantee; CPU/JIT/GC/instrumentation causes cannot be fully isolated on this shared host. Raw outlier timings are retained in spikes.json, without hiding them behind average timings.

## Additional musical-direction request

During implementation the user requested more recognizable musical form, beyond conservative tonal balancing. Candidate work may therefore add existing clocks/sequencers to establish repeating phrases, tonal relationships and rhythm while retaining the ten identities/order and all original references. ROOM AIR is explicitly excluded from structural changes: the user chose to keep its five-module composition and submit a FILTER variant as a separate JSON. The original ten before-renders and Phase4 documents remain immutable.
