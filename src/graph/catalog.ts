import type {ModuleType} from './types';
export const MODULE_GROUPS:ReadonlyArray<{name:string;types:readonly ModuleType[]}>= [
  {name:'Sources',types:['OSC','OPERATOR','CHIP','NOISE','VENOM','ALLOY','RESON','COMB','DRONE','PARTIAL','FORMANT','PRISM','FERAL','SWARM']},
  {name:'Clocks & patterns',types:['PULSE','WEFT','LOGIC','CHANCE','BRANCH','COUNT','UNSPENT']},
  {name:'Motion & control',types:['FLOCK','TIDE','BOUNCE','PENDULUM','TOUCH','SHAPE','QUANTIZE','SLEW','SIDEWAYS','QUORUM','PARASITE','MAP']},
  {name:'Tone & damage',types:['CLIP','FUZZ','CRUSH','CAUSTIC','SNAP','FAULT LINE','FILTER','SIEVE','RING','SHIFT']},
  {name:'Space & memory',types:['TAPE','CHAMBER','CHORUS','CLOUD','FRACTURE','LOOP']},
  {name:'Routing & output',types:['VCA','LPG','DUCK','SWITCH','OUTPUT']}
];
