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
  preset('still-almost-moving-ii',still,'A quiet mass of harmonics slowly changes from within.'),
  preset('pixel-dust',pixel,'Two swings scatter dry, stepped notes.'),
  preset('room-air',room,'Small changes in an apparently empty room.'),
  preset('small-hours',hours,'Uncertain rain gestures return between long pauses.'),
  preset('exchanging-bodies',bodies,'A strike travels through three connected materials.'),
  preset('dissolving-metal',metal,'Metal outlines lose their edges and listen to their own traces.'),
  preset('binary-fever',binary,'Rough numbers collide in a restless digital circuit.'),
  preset('tape-garden',tape,'A steady tone grows uneven memories.'),
  preset('late-light',light,'Sparse bright notes dissolve into a dark, dense tail.'),
  preset('off-grid',grid,'Uneven syllables move through an unfamiliar scale.')
];
export const DEFAULT_PRESET_ID='pixel-dust';
export function startupPatch(){return CURATED_PRESETS.find(p=>p.id===DEFAULT_PRESET_ID)!.create();}
