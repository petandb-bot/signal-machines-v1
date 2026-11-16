<img src="public/icons/icon-192.png" width="96" height="96" alt="Signal Machines icon">

# SIGNAL MACHINES

A tiny modular playground for sound, chance and happy accidents.

Connect little machines. Make strange sounds. See what happens.

68 modules, 20 curated starting patches, snapshots and stereo WAV / AIFF recording. FOUND/CUTS and LOOP import WAV, PCM AIFF and browser-decodable audio including MP3 and M4A. OUTPUT offers an optional CLEAN 5 Hz DC filter; CLASSIC remains the unchanged default. Runs in your browser. No account or backend needed.

An old-computer face for a living sound circuit: green text, small pixel windows and a handful of signal colors.

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
