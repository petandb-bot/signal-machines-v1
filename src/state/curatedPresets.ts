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
  preset('still-almost-moving-ii',still,'Fixed harmonic layers slowly change their inner relationships.'),
  preset('pixel-dust',pixel,'A small repeating melody with a clear dry pulse.'),
  preset('room-air',room,'Small changes in an apparently empty room, brought gently forward.'),
  preset('small-hours',hours,'Irregular rain fragments return through long quiet spaces.'),
  preset('exchanging-bodies',bodies,'A ringing body excites a shorter answering material.'),
  preset('dissolving-metal',metal,'Imperfect intervals meet an independent striking clock.'),
  preset('binary-fever',binary,'Interlocking counters construct a displaced digital rhythm.'),
  preset('tape-garden',tape,'Two tonal fragments leave worn, delayed memories.'),
  preset('late-light',light,'Four open pitch relationships meet through overlapping tails.'),
  preset('off-grid',grid,'Moving coordinates settle briefly onto an asymmetric nineteen-step grid.')
];
export const DEFAULT_PRESET_ID='pixel-dust';
export function startupPatch(){return CURATED_PRESETS.find(p=>p.id===DEFAULT_PRESET_ID)!.create();}
