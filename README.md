<img src="public/icons/icon-192.png" width="96" height="96" alt="Signal Machines icon">

# SIGNAL MACHINES

A tiny modular playground for sound, chance and happy accidents.

Connect little machines. Make strange sounds. See what happens.

73 modules, 20 curated starting patches, snapshots and stereo WAV / AIFF recording. FOUND/CUTS and LOOP import WAV, PCM AIFF and browser-decodable audio including MP3 and M4A. OUTPUT offers an optional CLEAN 5 Hz DC filter; CLASSIC remains the unchanged default. Runs in your browser. No account or backend needed.

An old-computer face for a living sound circuit: green text, small pixel windows and a handful of signal colors.

## English module help

Open **gear (Patch menu) → Module help** for a searchable guide to the installed modules. Each entry gives a short description, parameters, signal ports and available modes. The guide is read-only: it does not simplify timing, impose scales, or change the sound engine.

A steady timebase or a small pitch vocabulary can coexist with unusual sounds. PULSE, BRANCH, QUANTIZE and LOGIC are useful starting points, but their relationships are yours to make.

## Reverse audio and abrupt structural changes

**REVERSE** is a bounded stereo reverse-slice recorder, not a pitch inversion or a
zero-latency reversal of live sound. Connect a source to **AUDIO** and connect
the module to an OUTPUT or another effect. It records 50 ms–2.45 s slices and
plays the last completed slice backward. The first slice passes through dry
while memory fills. **SPAN** selects the slice duration; **SPEED** runs
0.25×–4× backward, **MIX** selects the reversed proportion, and **EDGE**
controls the short fade at slice boundaries. Modes:
- **REVERSE** (default): continuous reverse-slice playback
- **FLIP**: a rising FLIP TRIG or the editor's **Flip** button toggles forward/reverse
- **GATE**: reverse whenever SELECT CV is positive enough (greater than 0.5)

The **SEAM** trigger marks the end of a capture slice; the reverse stream has a
one-slice startup latency. Buffer allocation is fixed: four stereo-channel
Float32 arrays across two bounded capture/playback banks (~1.9 MB at 48 kHz
per REVERSE module). No file access, memory allocation or full buffer clearing
is performed on the audio callback.

**JUMP** makes sudden, held bipolar control changes. Set **EDGE** to 0 for
an immediate step, or increase it to smooth the transition. **FLIP** mode
alternates between ±DEPTH on every TRIG; **RANDOM** chooses a seeded
bipolar state; **SAMPLE** captures SOURCE CV on TRIG. The editor's
**Jump now** button sends an event manually. Use JUMP **VALUE** → SWITCH
**SELECT** with a short SWITCH FADE for an audible A/B scene cut.
Alternatively, send VALUE to FILTER CUTOFF, REVERSE SPAN, or other control
ports. Connect JUMP EVENT to a second module's trigger for simultaneous
structural changes. The short crossfade at an audio switch is preferable to
a completely unguarded waveform discontinuity when exporting usable audio.

Existing patches, recording and stem export modes remain compatible.
The new modules are opt-in and do not alter the signal of legacy patches.

## Play

- Pick a preset and press **▶**.
- Tap a chip to edit. Use the header trash button, then **Remove**, to delete it. **+** adds another, grouped by kind.
- Tap an output, then an input to connect them.
- Draw a motion path in TOUCH, or let PENDULUM swing.
- Try a few changes. Save a snapshot. Keep wandering.

[Four new machines](docs/FOUR_MACHINES.md): mutating echoes, imperfect transmission, sample events and excitable triggers. [Compare WAVs](https://petandb-bot.github.io/signal-machines-v1/listening/four-machines.html).

[New sound studies](https://petandb-bot.github.io/signal-machines-v1/listening/): dissolving attacks and a slipping contact voice. [Notes](docs/STRANGE_SOUNDS.md).

Headphones are useful. Phone portrait opens with a two-column overview of the whole patch. Use + or pinch to zoom in, and drag the background to pan. Landscape and desktop retain the saved rack layout. [Portrait overview and examples](docs/PORTRAIT_OVERVIEW.md).

FOUND explores browser-local samples with two controls; LEVEL brings quiet details forward. [Sample limits, storage and review notes](docs/FOUND_LEVEL.md).

## Run locally

Node.js 22.12+ or 24:

```sh
npm ci
npm run dev
```

Open the localhost URL Vite prints. Audio needs a tap and HTTPS or localhost.

## Share it

Push this folder to GitHub, then choose **Settings → Pages → Source → GitHub Actions**. The included workflow tests, builds and publishes the app on pushes to `main`. You can also run it manually from Actions.

```sh
npm test
npm run build
npm run verify:build
```

Pull requests run tests, build and AudioWorklet verification without deploying. The build is in `dist/`. [GitHub setup](docs/GITHUB.md) · [Full guide](docs/GUIDE.md) · [Verification](VERIFICATION.md)

MIT licensed. [Third-party notices](THIRD_PARTY_NOTICES.md)

## v0.27 — Shared pitch fields

QUANTIZE now offers two optional pitch-collection modes: **FIELD** (0, 2, 3, 5, 7, 9, 10) and **FRICTION** (0, 1, 4, 6, 7, 10). The existing SHIFT CV serves as a common tonal root when multiple QUANTIZE modules use either of these modes. PULSE, BRANCH, CHANCE, WEFT and other machines still decide what happens and when; pitch alignment does not generate a melody, impose a beat, or tame the sound.

Existing 12-TET, 19-TET and 13-TRIT modes, all original DSP source files and all 20 curated starting patches are preserved. [Phase 9 concept and example patches](docs/phase9/README.md). iPhone Safari real-device testing and subjective musical listening are still outstanding.

## v0.26.1 — English module HELP

Open the **Patch menu (gear) → Module help** to explore all 68 module descriptions in English. Search by module name, category, behavior, or parameter. Expand an item for its two controls, available modes and input/output signals. The panel does not add music rules, quantization, voice processing or a new DSP feature. Keyboard navigation, Escape and narrow layouts are supported; physical mobile browsers remain to be tested.

## Preset output balance

The twenty curated starting patches use individually calibrated fixed output gains based on the previous offline RMS/peak measurements. Quiet textures retain their relative character and transient headroom; no automatic gain control or DSP changes are introduced. The raw curated source JSON and historical references remain intact; the app and packaged standalone JSON both use the calibrated version. Saved user patches are not modified. See `src/state/presetLevels.ts` for the calibration table. Fresh listening and device-level validation remain necessary.

## Stem export and long recordings

SIGNAL MACHINES records its existing two-channel stereo master as **24-bit WAV / AIFF**, or as browser-compressed audio. Open the Patch menu and choose **Record target: MASTER · long** and **WAV · 24-bit** for a DAW-ready take. The long PCM recorder captures up to 10 minutes *subject to a fixed 128 MiB PCM budget*: at 48 kHz, the storage budget is reached after about 7 minutes 46 seconds. At higher sample rates the available time is shorter. A stalled consumer ends the take safely and saves captured audio; Safari/iPhone backgrounding can still interrupt audio and download behavior.

**Record target: STEMS · OUTPUT tracks** captures 2–4 OUTPUT modules *simultaneously in one live pass*, preserving their common origin, modulation timing and seeded stochastic decisions. Connect each desired audio chain to its own OUTPUT (you may add additional OUTPUT modules). The result is one **ZIP** with stereo 24-bit WAV files of equal length and a README. It is not a separate solo render and it does not split arbitrary effects inside one OUTPUT chain. Imported WAVs should all be placed at 0:00 in the DAW; do not time-stretch or auto-warp them unless intended.

Stem WAVs are tapped **before the final global soft-saturation stage**, but after each OUTPUT module and its effects; master volume and the startup fade are included. The stem sum may not null against the live saturated master. Use DAW gain staging when combining them. Stem recording is limited to **5 minutes and 384 MiB of total PCM across tracks**. All 2–4 tracks fit a full five minutes at 44.1/48 kHz; higher sample rates may reach the memory limit sooner. Four stereo 24-bit tracks at 48 kHz require about 330 MiB of PCM. WAV names use the patch name captured at the start of recording, e.g. `PIXEL-DUST-01.wav`, `PIXEL-DUST-02.wav`; the ZIP is `PIXEL-DUST-stems.zip`. The README maps each number to its OUTPUT ID. Uncompressed ZIP packaging avoids making an additional contiguous copy of all audio. On iPhone, RAM exhaustion remains possible with very long takes, particularly while saving or extracting a ZIP; begin with short recordings.

All existing master playback, patch JSON v1, LOOP imports/exports and the saved stable v0.27 archive remain unchanged. Stem files do not embed externally imported sample content or effects on routes not connected to an OUTPUT.

## v0.26 — REUSE: LOOP becomes another instrument

Inside a recorded or imported LOOP, use **→ FOUND** to copy the current take into an autonomous sample explorer, or **→ CUTS** to turn it into a short-event instrument. The original LOOP remains unchanged; the new sample module starts unconnected so that you choose its route and rhythm. No automatic quantization, leveling, or sound polishing is introduced.

LOOP-derived samples are stored as PCM16 WAV in the local browser's sample library when possible, using the same deterministic decoder on recall. Browsers without usable persistent storage keep the snapshot for the current session and show a warning. Patch JSON contains a sample reference, not the audio itself; save the LOOP audio WAV separately for transferring projects between devices.

The original 68 DSP modules, CLASSIC sound and 20 starting patches are unchanged. iPhone Safari real-device testing is not yet complete. [Concept, controls and limitations](docs/phase8/README.md).

## v0.25 — Audio integrity without losing character

This update preserves the **original sound** and all 20 curated presets. It does not include the alternate CLEAN/FOCUS/CLEAR timbral refinement modes proposed in the unmerged sonic-refinement branch.

- Exported WAV and AIFF recordings get a short (~3ms) fade at their file boundaries to avoid hard starts/ends. No processing is applied inside the take or to live synthesis; browser-compressed recordings are unchanged.
- Hover over the master level meter to inspect pre-saturation drive peak, the proportion of frames near the existing soft ceiling and the maximum one-sample difference. These **diagnostics do not change the sound** or mistake every deliberate digital step for a defect.
- The CI suite includes long offline patches with routing changes, 44.1/48kHz output verification and a separate six-hour sample-clock probe. No multi-hour physical iPhone test is claimed.

[Implementation and test methodology](docs/integrity/README.md).

## v0.24 — Audio import and output quality

FOUND/CUTS accept WAV, uncompressed PCM AIFF/AIFC, and browser-decodable formats such as MP3 and M4A (60 s / 32 MB). LOOP now accepts the same formats for clips up to 16 seconds / 32 MB; the export remains WAV. Uncompressed AIFF is decoded in JavaScript, independent of browser AIFF codec support. WAV/AIFF sample-rate conversion uses a band-limited sinc filter with linked stereo peak protection rather than linear interpolation.

OUTPUT has an optional CLEAN mode with sample-rate-invariant 5 Hz DC rejection. CLASSIC stays the default and the original DSP source and all 20 existing presets are preserved. Browser-supported compressed formats may vary by device; physical iPhone Safari listening is not independently tested.

## v0.23 — twenty starting worlds

Ten more patches explore phase modulation, noise resonance, spectral memory, fuzz, delayed events, swarms, digital fractures and signal consensus. The original ten stay unchanged. All68 sound machines keep their existing behavior.

[New worlds, useful controls and verification](docs/twenty/README.md). LOOP stays available for hands-on recording; every other module appears in a ready-to-play patch. [Earlier musical architecture and references](docs/phase6/README.md).
