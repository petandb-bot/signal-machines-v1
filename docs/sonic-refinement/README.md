# Sonic Refinement — A/B review (v0.25 candidate)

**Baseline:** v0.24.0, with 20 curated presets and archived user patches unchanged.
**Policy:** These are optional, backward-compatible modes. Do not apply them automatically to any saved preset. Human comparison is required before adopting them in curated patches.

## Modes

| Module | Legacy options | Opt-in quality mode | Purpose |
|---|---|---|---|
| CHIP | PULSE / TRIANGLE / NOISE | PULSE CLEAN / TRIANGLE CLEAN | Retain timer-stepped pitch and 7-bit quantization; reduce edge-related aliasing or remove 32-step triangle stairs |
| RESON | CLASSIC / unset | FOCUS | Attenuate a little energy in the ~100–500 Hz area while preserving modal resonance and decay |
| CHAMBER | ROOM / WEAVE | CLEAR ROOM / CLEAR WEAVE | Remove sub/low buildup and excessive top-end from the **wet** echoes only |
| PLATE | CLASSIC / unset | CLEAR | Conservatively condition the **wet** reverb tail; retain the dense original tank |

All old states and source files remain exactly unchanged. No patch format change, new sliders, UI panels, source modules, or effects added. A two-signal equal-power interpolation would alter levels even when targets agree; instead the quality modes use a short, linear 20 ms crossfade and preserve exact classic output when inactive.

### Audition

The CI artifact `sonic-refinement-ab` includes `index.html`, `metrics.json`, and 12 stereo 48 kHz WAV files. Each of four subjects has a classic RAW recording, refined RAW recording (the **same gain**), and refined RMS-matched recording. Source signals, seeds and timing are identical within each pair.

Metrics do not establish musical or perceptual superiority. The optional modes should be judged at matched listening loudness and within real patches, including high-frequency CHIP PWM, metallic RESON excitation, sustained CHAMBER echoes and PLATE decays.

### Acceptance

- 20 curated and 42 archived presets unchanged, both JSON and legacy DSP source hash tests pass
- 44.1 and 48 kHz finite outputs, no unexpected sudden jumps on mode changes
- alias energy in CHIP's predictable folded partial declines at equal loudness
- RESON modal energy and tail remain audible, with reduced low-mid masking
- CHAMBER and PLATE wet-tail energy is better controlled without changing direct sound or their feedback-tank source
- Sample-accurate old output whenever new mode is absent; 20-sample audio tests and AudioWorklet backward compatibility
- No new allocation in per-sample process methods; verify physical iPhone CPU cost separately

Known limitations: A browser instrument at 44.1/48 kHz and its anti-aliased waveforms cannot eliminate all folded harmonics from deliberate 7-bit quantization. CLEAN/FOCUS/CLEAR modes are choices, not automatic upgrades. They do not replace a true-peak meter, nor do they automatically master recordings.
