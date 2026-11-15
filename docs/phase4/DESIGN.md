# PLATE / v0.20 release candidate

Base: public v0.19.0, main 8f09add. Review branch only; no merge/deploy. CHIP and all existing DSP remain byte-for-byte unchanged.

## Audit and choice

CHAMBER uses four 1.2s circular buffers, size-dependent moving reads, sinusoidal modulation, a Hadamard/Givens feedback choice, lowpass/DC stages and tanh writes. Its widely spaced reflections, spatial scale and ROOM/WEAVE interaction remain useful. PLATE must not duplicate this topology or code.

MIRAGE exchanges whole echo-packet banks; TAPE has worn cross-feedback delay heads and flutter; SMEAR decorrelates four spectral histories through feedforward allpasses; CLOUD reads four random windowed grains; RESON is a six-mode TPT resonant voice; SYMPATHY exchanges momentum among three damped bodies. None supplies a dense broadband late-reverberation tank with independently shaped low/mid/high decay.

PLATE uses four input lattice diffusers per channel, then an eight-path Householder scattering tank with unequal fixed delay lengths and one additional lattice diffuser per path. This is a new small FDN, not copied CHAMBER or an imported Dattorro implementation. Each lattice uses a normalized two-port orthogonal rotation, so changing its coefficient does not create stored energy as a conventional unnormalized allpass can. Tank lengths never move; there is no LFO, pitch wobble, injected noise, saturation or output compressor. A fixed direct path keeps source contours; the diffuse path supplies the tail.

BODY changes input/loop scattering coefficients and two frequency shelves in each feedback path. DECAY sets a nominal midband T60 (0.25–10s). Per-path gains use actual path lengths and the nominal time, with shorter low/high-band retention. The shelves are contractive combinations of first-order lowpasses and identity. At fixed controls the scattering matrix is orthogonal, filters contract, allpasses conserve energy and every loop gain is strictly below one. Actual band T60 must be measured; it is not identical to the nominal control label. Smoothed, 16-sample coefficient updates bound control rate and cost.

Input excitation is scaled with sqrt(1−g²) so a longer decay does not simply add feedback gain. Stereo input/output vectors are independent orthogonal sign patterns, and unequal paths produce a diffuse mono-to-stereo tail without moving the source position. AC-couple the tank input; preserve the fixed dry stereo path. Follow actual per-path levels for pixel telemetry. No processing allocation or variable buffer size.

## Acceptance before curation

Compare ROOM/WEAVE with low/default/high BODY and long DECAY using identical pulse/electronic, metal, bandlimited noise, CHIP, CUTS and sustained sources. Render RAW and constant-gain-matched WAVs. Quantify early arrival bins, normalized echo density over time, bandwise Schroeder energy decay/T20-to-T60 estimate with regression quality, DC/correlation/mono fold-down, peaks/RMS, buffer bytes and 128-frame timing percentiles. Reject a tank that merely makes longer periodic echoes. Human listening and iPhone real-time performance remain unverified without hardware/listening.

Only after these measurements establish distinct time-density/spectral behavior, curate ten independent musical environments. Keep all old JSON and generator exports, use a separate explicit visible registry, preserve stored browser state, and test legacy PCM against v0.19.0. PLATE and curation are separate commits.

## Step 3 decision before preset work

24kHz wet-only IRs establish a different temporal role: normalized echo density at 200ms is .97 for PLATE default, compared with .04 for both CHAMBER modes at size/density .5. PLATE default rises .44→.63→.78→.97 over 25/50/100/200ms. Low BODY remains grainier (.16→.57); high BODY reaches .95 by100ms. Default broadband T20-extrapolated RT60 is2.18s, versus1.69/2.09s for ROOM/WEAVE; therefore density difference does not depend on simply having a longer tail. Long DECAY reaches8.03s. These are numerical distinctions, not a listening approval. See plate-analysis.json, plate-response.png and84 source/IR/raw/matched WAVs. Proceed to curation; preserve this independent tank.
