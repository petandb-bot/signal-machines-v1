# FOUND — recorded sound as a small autonomous instrument

FOUND explores lightweight feature anchors (energy changes, onsets and quiet passages). Half of its candidate budget covers the whole file, so tails and silence remain eligible. Selection uses MOVE, features, a short recent-history list and the saved seed. MOVE is sampled into selection tendency; it never scrubs a read head each frame.

WANDER zero / ALTER zero plays at normal rate, with short overlaps at file loops. WANDER opens shorter, more distant regions. ALTER changes speed, sometimes reverses, and shortens repetition; minimum region lengths and raised-cosine overlaps avoid deliberate hard glitch cuts. TRIG requests a new region; requests during a fade wait until the fade finishes. EVENT fires only when the actual region bounds change. The display shows the sample envelope, region bounds and current reader.

ROOM, RAIN and MACHINE are original **synthetic** environmental textures, generated and analyzed outside AudioWorklet. They are not field recordings. ROOM is selected when adding FOUND. Selecting/importing does not start audio: the existing RUN gesture is still required.

Local file limits: 32 MB, 60 seconds, mono/stereo, browser-supported WAV/MP3/M4A and other audio codecs. A media metadata preflight rejects overlong files before PCM decoding. OfflineAudioContext decodes/resamples to **24kHz**; analysis and sample scanning run outside the render thread. Unsupported or indeterminate durations fail with an explanation, preserving the previous reference. No streaming or trim editor.

Two FOUND modules per patch. Each 60-second stereo PCM asset is 11.52 MB (decimal); two unique active assets are 23.04 MB per side of the message bridge, about 46.08 MB for host plus worklet PCM. Imports and crossfades can temporarily retain an old asset and decoder buffers. File decodes are serialized to reduce transient memory. Only changed PCM is copied/transferred; unchanged readers are retained when another sample changes. Session-only encoded fallback is capped at 64 MB. Native decoder peak memory is browser-specific and unverified.

IndexedDB stores the original encoded Blob, name and a reference ID. Patch JSON and snapshots carry **only the reference**, never audio samples. Local audio does **not** follow a JSON file to another device/browser/origin. Missing references warn and remain silent; there is no silent fallback to ROOM. A failed storage write keeps the sample usable in this session where memory allows, with a warning. Clearing browser data removes persisted samples. Samples are not automatically deleted when removing a module because snapshots may still refer to them. There is no audio ZIP export.

RUN/STOP, rewiring and parameter edits retain material through a graph-owned, bounded cache. Snapshot reset resolves the saved reference again. FOUND has its own data/store/player; LOOP recording and its PCM16 WAV bridge are unchanged.

Demos: **FOUND / QUIET** (ROOM with a slow MOVE tendency and stereo motion), **FOUND / STRANGE** (MACHINE events excite RESON while CLOUD and MESH transform its audio).

Automated tests exercise deterministic play, feature anchors, quiet passages, TRIG/MOVE, crossfades, multiple rates, reference-only validation, asset replacement, persistence with a simulated IndexedDB, quota/decoder failure, metadata preflight, transport/rewiring and UI selection. These do not constitute listening, native codec, iPhone file-picker, Safari storage/privacy or real-time memory/thermal verification.
