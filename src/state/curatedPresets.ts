import {parsePatch} from './PatchStorage';
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
export interface CuratedPreset {id:string;name:string;description:string;create:()=>Patch}
function preset(id:string,data:{name:string},description:string):CuratedPreset{return{id,name:data.name,description,create:()=>parsePatch(JSON.stringify(data))};}
/** The visible collection. Legacy generators and their registry stay in presets.ts. */
export const CURATED_PRESETS:readonly CuratedPreset[]=[
  preset('still-almost-moving-ii',still,'A slow pentatonic phrase floats above a quiet harmonic pedal.'),
  preset('pixel-dust',pixel,'A small repeating melody with a clear dry pulse.'),
  preset('room-air',room,'Small changes in an apparently empty room.'),
  preset('small-hours',hours,'A restrained rain rhythm leaves room between its returns.'),
  preset('exchanging-bodies',bodies,'A remembered bell phrase passes between connected materials.'),
  preset('dissolving-metal',metal,'A pitched metal motif softens into changing traces.'),
  preset('binary-fever',binary,'A syncopated digital bass phrase bends a binary circuit.'),
  preset('tape-garden',tape,'A slow melody grows uneven, gently timed tape memories.'),
  preset('late-light',light,'A bright returning melody leaves overlapping harmonic tails.'),
  preset('off-grid',grid,'A recurring vowel phrase crosses an asymmetric nineteen-step grid.')
];
export const DEFAULT_PRESET_ID='pixel-dust';
export function startupPatch(){return CURATED_PRESETS.find(p=>p.id===DEFAULT_PRESET_ID)!.create();}
