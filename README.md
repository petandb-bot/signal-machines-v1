<img src="public/icons/icon-192.png" width="96" height="96" alt="Signal Machines icon">

# SIGNAL MACHINES

A tiny modular playground for sound, chance and happy accidents.

Connect little machines. Make strange sounds. See what happens.

52 modules, 32 starting patches, snapshots and stereo WAV / AIFF recording. Runs in your browser. No account or backend needed.

## Play

- Pick a preset and press **▶**.
- Tap a chip to edit. **+** adds another, grouped by kind.
- Tap an output, then an input to connect them.
- Draw a motion path in TOUCH, or let PENDULUM swing.
- Try a few changes. Save a snapshot. Keep wandering.

Headphones are useful. Phone screens work best in landscape.

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

The build is in `dist/`. [GitHub setup](docs/GITHUB.md) · [Full guide](docs/GUIDE.md) · [Verification](VERIFICATION.md)

MIT licensed. [Third-party notices](THIRD_PARTY_NOTICES.md)
