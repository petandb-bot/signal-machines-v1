import type {ModuleType} from './types';
export const MODULE_GROUPS:ReadonlyArray<{name:string;types:readonly ModuleType[]}>= [
  {name:'Sources',types:['OSC','OPERATOR','CHIP','NOISE','VENOM','ALLOY','RESON','COMB','DRONE','PARTIAL','FORMANT','PRISM','FERAL','FRICTION','SWARM']},
  {name:'Clocks & patterns',types:['PULSE','EDGE','WEFT','LOGIC','CHANCE','BRANCH','COUNT','UNSPENT']},
  {name:'Motion & control',types:['FLOCK','TIDE','BOUNCE','PENDULUM','TOUCH','SHAPE','QUANTIZE','SLEW','SIDEWAYS','QUORUM','PARASITE','MAP']},
  {name:'Tone & damage',types:['MESH','CLIP','FUZZ','CRUSH','CAUSTIC','SNAP','FAULT LINE','FILTER','SIEVE','RING','SHIFT']},
  {name:'Space & memory',types:['ORBIT','TAPE','CHAMBER','CHORUS','SMEAR','CLOUD','FRACTURE','LOOP']},
  {name:'Routing & output',types:['VCA','LPG','DUCK','SWITCH','OUTPUT']}
];
