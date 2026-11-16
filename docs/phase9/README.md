# Phase 9 — Shared Pitch Fields (listening candidate)

## Decision

**Do not add a conventional up/down arpeggiator.** A clock followed by fixed step traversal duplicates PULSE / BRANCH / CHANCE / WEFT / LOGIC and would make these machines behave more predictably than intended.

**Borrow one principle from [Henrik Schwarz's Schwarzonator II](https://www.ableton.com/en/packs/schwarzonator/):** independently generated notes can be guided by one harmonic context. This is not a port of its patch, custom scale editor, MIDI workflow, chord progressions or 'Little Brother'. SIGNAL MACHINES routes its own bipolar pitch CV, and its existing modules remain responsible for time and memory.

## Small opt-in QUANTIZE extension

QUANTIZE now has **two additional modes**, leaving the original **12-TET / 19-TET / 13-TRIT** modes unchanged:

| Mode | 12-note octave pitch classes | Character |
| --- | --- | --- |
| FIELD | 0, 2, 3, 5, 7, 9, 10 | Familiar modal foothold; capable of recognisable motives without automatic triads |
| FRICTION | 0, 1, 4, 6, 7, 10 | Narrow intervals and gaps; recognisable relationships with more tension |

Both modes quantize the incoming CV to the nearest member of a pitch collection, repeated every octave. They use the **existing two knobs**:
- **SPAN** stretches the incoming pitch range, just as before.
- **PULL** moves continuously from uncorrected pitch (0) toward the collection (1).

In these two modes only, the **SHIFT input becomes a shared root pitch**: the nearest semitone to the incoming bipolar CV (where 1/24 = one semitone). Connect one TIDE/COUNT/TOUCH control to the SHIFT inputs of multiple QUANTIZE modules to let otherwise independent voices recognize the same center. With no SHIFT cable, root = zero.

With **CLOCK** connected, pitches are only sampled on rising edges; without a clock, the field follows the incoming CV. The existing CHANGE trigger fires only when the nearest field note changes. The new modes do not produce a clock, generate notes autonomously, harmonize audio, insert chords, impose rests or suppress DSP roughness.

Changes to the root are also sampled on the clock when CLOCK is connected. PITCH can still jump by design; add SLEW outside this module if a gliding transition is wanted.

## Two runnable studies

The following are deliberately **not added to the 20 main presets**. They are optional studies, not new default musical behavior.

- [COMMON GROUND — FIELD](patches/common-ground-field.json): a small BRANCH melody driving CHIP, plus a second independently moving OPERATOR voice; two QUANTIZE modules share the same slowly shifting TIDE root.
- [COMMON GROUND — FRICTION](patches/common-ground-friction.json): the same patch with only the second voice's QUANTIZE changed to FRICTION. Compare the relationship between both voices; the time and sound engines are identical.

Download either raw JSON file, open SIGNAL MACHINES, choose **gear → Load JSON**, and connect or disconnect cables freely. The studies are a way to hear the new pitch constraint in a musical context, not an A/B mastering claim.

## Simple A/B audition

On the pull request, open the successful GitHub Actions verification run and download the `pitch-field-audition` ZIP. Extract it and open `index.html`. There are exactly two 30-second WAVs, at the same playback gain, with identical patch structure and only the partner voice's pitch field changed. Listen for relationships and continuity rather than an obvious new melody. The `metrics.json` file is only a technical check.

The live website runs the stable release and **does not include the new field modes until release**. Loading these example JSONs into the stable version is not a valid A/B test.

## Acceptance and limitations

- All original module types, default modes, audio cores and existing 20 presets remain untouched.
- Legacy QUANTIZE modes must be sample-for-sample identical with the prior class.
- Shared root, scale mapping (including negative pitches), partially pulled notes, clock hold and change events have direct regression tests.
- Test sketches must validate and produce finite audio without DSP faults.
- Automated measurements cannot prove the interval sets are musically better. Review by ear before a release.
- The extra mode adds CPU work only to QUANTIZE instances that explicitly select FIELD or FRICTION; no memory allocation should occur in their sample callback.
- No UI overhaul and no new module palette entry. The English Module HELP reflects the two modes automatically.

Physical iPhone Safari performance and human listening have not been independently verified. Do not deploy this candidate until the two sketches have been auditioned.
