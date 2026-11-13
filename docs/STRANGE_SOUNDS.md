# Strange sounds / v0.16

Two original modules, not hardware emulations. The selection is based on intended sound and measured behavior; the development environment cannot audition audio. Listen to the examples before treating this as a verdict on musical quality.

[Open the listening studies](https://petandb-bot.github.io/signal-machines-v1/listening/) · [Open the instrument](https://petandb-bot.github.io/signal-machines-v1/)

## What was chosen

**SMEAR** lets an attack lose its togetherness. Some parts catch up quickly, others retain a longer trace. It is intended for soft overlapping metal, frayed sustained tones and uneven noise that hangs in separate layers. There is a continuous path back to the exact original. It does not need a second sound source.

**FRICTION** makes a source out of contact. A moving surface pulls a spring, holds it and releases it; the release excites a small body. Slow motion gives separated catches; faster motion can become a continuous rub with ringing partials. The evolving texture follows distance travelled. There are no per-sample random noise injections. Its SLIP output lets the same physical gesture strike another voice.

### Existing roles checked

| Existing modules | Distinction / decision |
| --- | --- |
| CLOUD, FRACTURE, FAULT LINE | Grain replay, captured fragments or stress-triggered disruption. SMEAR never captures/reverses a fragment or jumps a playback head. |
| TAPE, CHORUS | Moving delay heads, wobble or repeating echoes. SMEAR has fixed histories: MEMORY changes persistence, without moving those heads. |
| CHAMBER | A shared spatial feedback network. SMEAR keeps four independent time histories, with no room model or cross-channel feedback. Diffusion may still sound reverberant; this needs listening judgment. |
| PRISM, MESH | Spectral resynthesis, or B changing A's band gains. SMEAR creates no new oscillator bank and has no second audio input. |
| RESON, COMB | A body excited by a trigger/noise pluck or external sound. FRICTION's contact motion continuously creates the excitation; SLIP can excite those existing bodies. |
| VENOM, FERAL | Noise/discharges or a driven nonlinear oscillator. FRICTION uses static/kinetic contact and its return to sticking, rather than noise or an independent forcing oscillator. |
| RING, OPERATOR | Multiplication or phase modulation of a carrier. Neither models accumulated contact and release. They remain useful after FRICTION. |

**BLOOM** is deferred: a delayed spectral tail risks duplicating SMEAR plus CHAMBER/CLOUD. A later candidate should demonstrate a clearly different time shape in listening tests. **LEAK** is deferred: an imperfect, remembered leakage needs more evidence of a separate musical role beyond VCA, MESH and fragment memories. No additional types or hidden modes were added for either.

## Two controls each

| Module | Slider | What to try |
| --- | --- | --- |
| SMEAR | SMEAR | Zero is sample-exact stereo dry. Increase it to loosen the attack and hear separate histories. |
| SMEAR | MEMORY | Short traces → overlapping, slowly released traces. No freeze/endless setting. |
| FRICTION | PRESSURE | Light contact → firmer catches and a different ringing body. Zero lifts contact. |
| FRICTION | SPEED | A stopped surface → patient catches → faster rubbing. Zero stops it. |

SMEAR has AUDIO, SMEAR CV and MEMORY CV inputs; AUDIO and ACTIVITY outputs. FRICTION has PITCH, PRESSURE CV and SPEED CV inputs; AUDIO, ACTIVITY and SLIP outputs. PITCH moves the contact/body tuning over ±3 octaves around its reference, rather than promising an exactly pitched oscillator. CV uses the existing normalized control convention. No extra settings panel or mode buttons.

Try ALLOY or short OSC/LPG notes into SMEAR. Use TOUCH/TIDE on SMEAR or MEMORY. Connect FRICTION SLIP to RESON TRIG, or use SHAPE on PRESSURE to bow a phrase. FRICTION into OPERATOR MOD provides a contact-driven PM source. Direct feedback rules are unchanged; PARASITE remains the existing way to return delayed control influence.

## Demos in the preset selector

- **DISSOLVING METAL**: irregular ALLOY → SMEAR → ORBIT. FLOCK changes dissolution; the lingering sound reaches PARASITE and influences later metal tones.
- **SLIDING GLASS**: FRICTION SLIP strikes RESON, while ACTIVITY moves its material. Both sounds pass through SMEAR. PARASITE lets the trace affect sliding speed.

Both are appended after the original 32 presets. JSON copies are in `presets/`. Snapshot recall saves the patch and controls; rolling DSP histories restart according to the existing recall behavior. History buffers are not embedded in patch JSON.

## Listening material

The separate listening page has six downloadable WAVs:

- Three SMEAR studies: short metallic/sine attacks, harmonic sustain, and uneven noise bursts. Each repeats identical input at SMEAR/MEMORY `0/.6`, `.25/.2`, `.6/.55`, `1/1`.
- One FRICTION study: three pressure settings, three speed settings, then a CV gesture.
- Eight-second renders of the two named demo patches.

These are stereo PCM16 at 24kHz with a **shared 1.5× gain**, no individual normalization. Short clip-boundary fades avoid editing clicks. Settings, cue times and measured peaks/RMS are in `listening/audio/manifest.json`. They are comparison material, not full-band substitutes for native playback/recording. The live DSP is also tested at 8/44.1/48/96kHz.

`npm ci` then `npm run build` generates the WAVs and publishes them as static assets. `npm run render:examples` regenerates them alone. A source fingerprint avoids rendering unchanged material again. Generated WAVs are excluded from Git and the source ZIP; the renderer, deterministic input recipes and listening page are included, so a fresh build reproduces the material. No external recordings are used.

## Implementation limits

SMEAR uses complementary bands and three unequal allpass histories per band. The instantaneous wet term is removed; coefficients stay below one and smooth over 12ms. The dry path has no latency, while full wet starts with band-dependent history (the shortest stage is about 2.9ms). Persistence changes phase/color as well as attack timing; some settings can cause spectral cancellations. There is no global wet feedback, modulation oscillator, pitch shifting or stereo summing. A bounded wet output guards peaks; zero SMEAR preserves raw input.

FRICTION uses four integration substeps, smooth CV, bounded contact states, three resonant modes and a DC blocker. The return-to-stick tolerance avoids a permanent-slide dead state in the main operating region. It is a small original instrument, not a calibrated physical simulation. At very light/slow contact, long quiet gaps are intentional. Strong or high-pitched contact can still alias; four substeps are not an alias-free guarantee.

The demo patches use existing quantum-delayed PARASITE controls. Their precise trajectories can change with the audio block schedule, as before. Fixed seed and the same schedule repeat; removing those delayed feedback edges yields sample-identical new DSP across block sizes. No graph-engine behavior was changed to force a new timing model.

Human listening, iPhone/desktop audio devices, Safari downloads, actual touch appearance and native CPU/thermal behavior remain unverified. Automated checks establish behavior and bounds, not whether a sound is attractive.
