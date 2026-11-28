import {parsePatch} from './PatchStorage';
import {calibratePreset} from './presetLevels';
import type {Patch} from '../graph/types';
import still from '../../presets/curated/still-almost-moving-ii.json';
import pixel from '../../presets/curated/pixel-dust.json';
import room from '../../presets/curated/room-air.json';
import hours from '../../presets/curated/small-hours.json';
import bodies from '../../presets/curated/exchanging-bodies.json';
import metal from '../../presets/curated/dissolving-metal.json';
import binary from '../../presets/curated/binary-fever.json';
import tape from '../../presets/curated/tape-garden.json';
import light from '../../presets/curated/late-light.json';
import grid from '../../presets/curated/off-grid.json';
import extra0 from '../../presets/curated/soft-circuit.json';
import extra1 from '../../presets/curated/paper-windows.json';
import extra2 from '../../presets/curated/borrowed-light.json';
import extra3 from '../../presets/curated/velvet-engine.json';
import extra4 from '../../presets/curated/deferred-signal.json';
import extra5 from '../../presets/curated/threads-cross.json';
import extra6 from '../../presets/curated/shattered-clock.json';
import extra7 from '../../presets/curated/dissent-in-glass.json';
import extra8 from '../../presets/curated/broken-radio.json';
import extra9 from '../../presets/curated/passing-shadows.json';
export interface CuratedPreset {id:string;name:string;description:string;create:()=>Patch}
function preset(id:string,data:{name:string},description:string):CuratedPreset{return{id,name:data.name,description,create:()=>calibratePreset(id,parsePatch(JSON.stringify(data)))};}
/** The visible collection. Legacy generators and their registry stay in presets.ts. */
export const CURATED_PRESETS:readonly CuratedPreset[]=[
  preset('still-almost-moving-ii',still,'Fixed harmonic layers slowly change their inner relationships.'),
  preset('pixel-dust',pixel,'A small repeating melody with a clear dry pulse.'),
  preset('room-air',room,'Small changes in an apparently empty room, brought gently forward.'),
  preset('small-hours',hours,'Irregular rain fragments return through long quiet spaces.'),
  preset('exchanging-bodies',bodies,'A ringing body excites a shorter answering material.'),
  preset('dissolving-metal',metal,'Imperfect intervals meet an independent striking clock.'),
  preset('binary-fever',binary,'Interlocking counters construct a displaced digital rhythm.'),
  preset('tape-garden',tape,'Two tonal fragments leave worn, delayed memories.'),
  preset('late-light',light,'Four open pitch relationships meet through overlapping tails.'),
  preset('off-grid',grid,'Moving coordinates settle briefly onto an asymmetric nineteen-step grid.'),
  preset('soft-circuit',extra0,"A softly coupled pair of phase-modulated tones."),
  preset('paper-windows',extra1,"Paper-like noise taps find a small resonant space."),
  preset('borrowed-light',extra2,"A rubbing surface lends its spectrum to a held harmonic voice."),
  preset('velvet-engine',extra3,"A fuzzy pulse rhythm loses its expected accents."),
  preset('deferred-signal',extra4,"Remembered chances arrive late as small ringing objects."),
  preset('threads-cross',extra5,"A small moving swarm changes another voice from within."),
  preset('shattered-clock',extra6,"A simple chip tone trips its own small digital failures."),
  preset('dissent-in-glass',extra7,"Three motions disagree about which glass tone should remain."),
  preset('broken-radio',extra8,"A tuned band of electrical noise briefly loses contact."),
  preset('passing-shadows',extra9,"A little machine passes between the present and a granular shadow.")
];
export const DEFAULT_PRESET_ID='pixel-dust';
export function startupPatch(){return CURATED_PRESETS.find(p=>p.id===DEFAULT_PRESET_ID)!.create();}
