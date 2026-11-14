import { createModule, connect } from '../graph/PatchGraph';
import type { ModuleType, Patch } from '../graph/types';
const patch=(name:string,bpm:number,seed:number):Patch=>({version:1,layout:2,name,bpm,master:.65,seed,modules:[],connections:[]});
function add(p:Patch,type:ModuleType,x:number,y:number,seed:number){const id=type.toLowerCase().replaceAll(' ','-')+'-1';p.modules.push(createModule(type,x,y,seed,id));return id;}
function wire(p:Patch,a:string,ap:string,b:string,bp:string){connect(p,{module:a,port:ap},{module:b,port:bp});}
export function metalDrift():Patch{
  const p=patch('METAL DRIFT',76,60421);
  add(p,'PULSE',16,16,701);add(p,'FLOCK',16,176,702);add(p,'ALLOY',192,96,703);add(p,'CHAMBER',368,96,704);add(p,'OUTPUT',544,96,705);
  wire(p,'pulse-1','trigger','alloy-1','trigger');wire(p,'flock-1','controlA','alloy-1','tension');wire(p,'alloy-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');return p;
}
export function unevenMemory():Patch{
  const p=patch('UNEVEN MEMORY',102,45017);
  add(p,'PULSE',16,16,801);add(p,'BRANCH',192,16,802);add(p,'ALLOY',368,16,803);add(p,'FRACTURE',368,184,804);add(p,'OUTPUT',544,184,805);
  p.modules[0].params.rate=.67;p.modules[0].params.irregular=.35;p.modules[2].params.body=.36;p.modules[2].params.tension=.52;
  wire(p,'pulse-1','trigger','branch-1','clock');wire(p,'branch-1','pitch','alloy-1','pitch');wire(p,'branch-1','gate','alloy-1','trigger');wire(p,'alloy-1','audio','fracture-1','audio');wire(p,'fracture-1','audio','output-1','audio');return p;
}
export function emptyChamber():Patch{
  const p=patch('EMPTY CHAMBER',54,93214);
  add(p,'PULSE',16,32,901);add(p,'RESON',192,32,902);add(p,'CHAMBER',368,32,903);add(p,'OUTPUT',544,32,904);
  p.modules[0].params.rate=.17;p.modules[0].params.irregular=.34;p.modules[1].params.decay=.79;p.modules[2].params.size=.9;p.modules[2].params.density=.84;
  wire(p,'pulse-1','trigger','reson-1','trigger');wire(p,'reson-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');return p;
}
export function badContact():Patch{
  const p=patch('BAD CONTACT',88,29811);
  add(p,'PULSE',16,16,1001);add(p,'VENOM',192,16,1002);add(p,'CAUSTIC',368,16,1003);add(p,'SNAP',544,16,1004);add(p,'FLOCK',368,184,1005);add(p,'CHAMBER',544,184,1006);add(p,'OUTPUT',720,184,1007);
  p.modules[0].params.irregular=.55;p.modules[1].params.dose=.78;p.modules[1].params.strain=.74;p.modules[2].params.burn=.72;p.modules[2].params.starve=.6;p.modules[3].params.fault=.58;p.modules[5].params.size=.34;p.modules[5].params.density=.28;
  wire(p,'pulse-1','trigger','venom-1','trigger');wire(p,'venom-1','audio','caustic-1','audio');wire(p,'caustic-1','audio','snap-1','audio');wire(p,'flock-1','controlA','snap-1','fault');wire(p,'snap-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');return p;
}
export function tapeGarden():Patch{
  const p=patch('TAPE GARDEN',64,50514);
  add(p,'DRONE',16,16,1101);add(p,'SIEVE',192,16,1102);add(p,'TAPE',368,16,1103);add(p,'CHAMBER',544,16,1104);add(p,'OUTPUT',720,16,1105);add(p,'FLOCK',192,184,1106);
  p.modules[0].params.color=.66;p.modules[1].params.width=.73;p.modules[2].params.wear=.62;p.modules[2].params.echo=.68;p.modules[3].params.density=.66;
  wire(p,'drone-1','audio','sieve-1','audio');wire(p,'sieve-1','audio','tape-1','audio');wire(p,'tape-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');wire(p,'flock-1','controlA','sieve-1','focus');wire(p,'flock-1','controlB','drone-1','spread');return p;
}
export function hostFever():Patch{
  const p=patch('HOST FEVER',72,80551);
  add(p,'DRONE',16,16,1201);add(p,'SIEVE',192,16,1202);add(p,'TAPE',368,16,1203);add(p,'SNAP',544,16,1204);add(p,'OUTPUT',720,16,1205);add(p,'PARASITE',368,184,1206);
  p.modules[0].params.color=.7;p.modules[1].params.width=.7;p.modules[3].params.fault=.21;p.modules[3].params.recover=.48;p.modules[5].params.feed=.78;p.modules[5].params.memory=.52;
  wire(p,'drone-1','audio','sieve-1','audio');wire(p,'sieve-1','audio','tape-1','audio');wire(p,'tape-1','audio','snap-1','audio');wire(p,'snap-1','audio','output-1','audio');wire(p,'snap-1','audio','parasite-1','audio');wire(p,'parasite-1','pressure','snap-1','fault');wire(p,'parasite-1','fever','drone-1','spread');wire(p,'parasite-1','fever','sieve-1','focus');return p;
}
export function unstableCircuit():Patch{
  const p=patch('UNSTABLE CIRCUIT',94,99971);
  add(p,'PULSE',16,16,1301);add(p,'BRANCH',192,16,1302);add(p,'ALLOY',368,16,1303);add(p,'FRACTURE',544,16,1304);add(p,'CHAMBER',544,184,1305);add(p,'OUTPUT',720,184,1306);add(p,'PARASITE',368,184,1307);add(p,'FLOCK',192,184,1308);
  p.modules[0].params.rate=.65;p.modules[1].params.change=.24;p.modules[1].params.memory=.4;
  wire(p,'pulse-1','trigger','branch-1','clock');wire(p,'branch-1','pitch','alloy-1','pitch');wire(p,'branch-1','gate','alloy-1','trigger');wire(p,'alloy-1','audio','fracture-1','audio');wire(p,'fracture-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');wire(p,'chamber-1','audio','parasite-1','audio');wire(p,'parasite-1','pressure','branch-1','change');wire(p,'parasite-1','fever','fracture-1','break');wire(p,'flock-1','controlA','alloy-1','tension');return p;
}
export function breathingCircuit():Patch{
  const p=patch('BREATHING CIRCUIT',76,15061);
  add(p,'PULSE',16,16,1401);add(p,'SHAPE',192,16,1402);add(p,'VCA',368,16,1403);add(p,'CHORUS',544,16,1404);add(p,'DRONE',16,184,1405);add(p,'FLOCK',192,184,1406);add(p,'CHAMBER',544,184,1407);add(p,'OUTPUT',720,184,1408);
  p.modules[0].params.rate=.33;p.modules[1].params.rise=.44;p.modules[1].params.fall=.6;p.modules[4].params.color=.7;
  wire(p,'pulse-1','trigger','shape-1','trigger');wire(p,'shape-1','control','vca-1','level');wire(p,'drone-1','audio','vca-1','a');wire(p,'vca-1','audio','chorus-1','audio');wire(p,'chorus-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');wire(p,'flock-1','controlA','drone-1','spread');wire(p,'flock-1','controlB','chorus-1','drift');return p;
}
export function forkedMemory():Patch{
  const p=patch('FORKED MEMORY',108,63051);
  add(p,'PULSE',16,16,1501);add(p,'BRANCH',192,16,1502);add(p,'ALLOY',368,16,1503);add(p,'CAUSTIC',544,16,1504);add(p,'SWITCH',720,16,1505);add(p,'RESON',368,184,1506);add(p,'CHORUS',544,184,1507);add(p,'TAPE',720,184,1508);add(p,'OUTPUT',896,184,1509);
  p.modules[0].params.rate=.66;p.modules[4].params.fade=.18;p.modules[2].params.body=.38;
  wire(p,'pulse-1','trigger','branch-1','clock');wire(p,'pulse-1','trigger','switch-1','trigger');wire(p,'branch-1','gate','alloy-1','trigger');wire(p,'branch-1','pitch','alloy-1','pitch');wire(p,'branch-1','gate','reson-1','trigger');wire(p,'branch-1','pitch','reson-1','pitch');wire(p,'alloy-1','audio','caustic-1','audio');wire(p,'caustic-1','audio','switch-1','a');wire(p,'reson-1','audio','chorus-1','audio');wire(p,'chorus-1','audio','switch-1','b');wire(p,'switch-1','audio','tape-1','audio');wire(p,'tape-1','audio','output-1','audio');return p;
}
export function loopWeather():Patch{
  const p=patch('LOOP WEATHER',88,39051);
  add(p,'DRONE',16,16,1601);add(p,'CLOUD',192,16,1602);add(p,'LOOP',368,16,1603);add(p,'CHORUS',544,16,1604);add(p,'OUTPUT',720,16,1605);add(p,'PULSE',192,184,1606);add(p,'FLOCK',16,184,1607);
  p.modules[5].params.rate=0;p.modules[5].params.irregular=0;p.modules[0].params.color=.74;p.modules[2].params.mix=.8;
  wire(p,'drone-1','audio','cloud-1','audio');wire(p,'cloud-1','audio','loop-1','audio');wire(p,'loop-1','audio','chorus-1','audio');wire(p,'chorus-1','audio','output-1','audio');wire(p,'pulse-1','trigger','loop-1','trigger');wire(p,'flock-1','controlA','cloud-1','spread');wire(p,'flock-1','controlB','drone-1','color');return p;
}
export const PRESETS=[{name:'METAL DRIFT',description:'Metal + slow movement',create:metalDrift},{name:'UNEVEN MEMORY',description:'Mutating notes + fragments',create:unevenMemory},{name:'EMPTY CHAMBER',description:'Resonance + open space',create:emptyChamber},{name:'BAD CONTACT',description:'Toxic noise + corrosion + failing wires',create:badContact},{name:'TAPE GARDEN',description:'Continuous drone + worn echo',create:tapeGarden},{name:'HOST FEVER',description:'Sound drives its own faults and spectrum',create:hostFever},{name:'UNSTABLE CIRCUIT',description:'Resonant energy infects future notes',create:unstableCircuit},{name:'BREATHING CIRCUIT',description:'Envelopes give the drone a rhythm',create:breathingCircuit},{name:'FORKED MEMORY',description:'Two voices take alternate effects paths',create:forkedMemory},{name:'LOOP WEATHER',description:'Granular layers capture and replay',create:loopWeather}];
export function clearSignal():Patch{
  const p=patch('CLEAR SIGNAL',94,71604);
  add(p,'PULSE',16,16,1701);add(p,'BRANCH',192,16,1702);add(p,'OSC',368,16,1703);add(p,'CAUSTIC',544,16,1704);add(p,'FILTER',720,16,1705);add(p,'SHAPE',192,184,1706);add(p,'VCA',720,184,1707);add(p,'OUTPUT',896,184,1708);
  p.modules[0].params.rate=.55;p.modules[2].mode='SAW';p.modules[2].params.tune=.68;p.modules[3].params.burn=.24;p.modules[4].params.cutoff=.43;p.modules[4].params.resonance=.48;p.modules[5].params.rise=.08;p.modules[5].params.fall=.42;
  wire(p,'pulse-1','trigger','branch-1','clock');wire(p,'branch-1','pitch','osc-1','pitch');wire(p,'branch-1','gate','shape-1','trigger');wire(p,'osc-1','audio','caustic-1','audio');wire(p,'caustic-1','audio','filter-1','audio');wire(p,'filter-1','audio','vca-1','a');wire(p,'shape-1','control','filter-1','cutoff');wire(p,'shape-1','control','vca-1','level');wire(p,'vca-1','audio','output-1','audio');return p;
}
export function wireStrings():Patch{
  const p=patch('WIRE STRINGS',106,71605);
  add(p,'NOISE',16,16,1801);add(p,'VCA',192,16,1802);add(p,'COMB',368,16,1803);add(p,'TAPE',544,16,1804);add(p,'OUTPUT',720,16,1805);add(p,'PULSE',16,184,1806);add(p,'SHAPE',192,184,1807);add(p,'BRANCH',368,184,1808);
  p.modules[0].mode='PINK';p.modules[0].params.level=.85;p.modules[2].params.tune=.65;p.modules[2].params.decay=.72;p.modules[3].params.echo=.45;p.modules[5].params.rate=.52;p.modules[6].params.rise=0;p.modules[6].params.fall=.22;
  wire(p,'noise-1','audio','vca-1','a');wire(p,'vca-1','audio','comb-1','audio');wire(p,'comb-1','audio','tape-1','audio');wire(p,'tape-1','audio','output-1','audio');wire(p,'pulse-1','trigger','shape-1','trigger');wire(p,'shape-1','control','vca-1','level');wire(p,'pulse-1','trigger','branch-1','clock');wire(p,'branch-1','pitch','comb-1','pitch');return p;
}
export function sidebandGarden():Patch{
  const p=patch('SIDEBAND GARDEN',76,71606);
  add(p,'DRONE',16,16,1901);add(p,'RING',192,16,1902);add(p,'SHIFT',368,16,1903);add(p,'CHAMBER',544,16,1904);add(p,'OUTPUT',720,16,1905);add(p,'OSC',16,184,1906);add(p,'FLOCK',192,184,1907);
  p.modules[0].mode='110 Hz';p.modules[0].params.color=.68;p.modules[1].params.mix=.86;p.modules[2].params.shift=.58;p.modules[2].params.mix=.72;p.modules[5].params.tune=.7;p.modules[5].params.level=.9;p.modules[6].params.drift=.18;
  wire(p,'drone-1','audio','ring-1','a');wire(p,'osc-1','audio','ring-1','b');wire(p,'ring-1','audio','shift-1','audio');wire(p,'shift-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');wire(p,'flock-1','controlA','osc-1','pitch');wire(p,'flock-1','controlB','shift-1','shift');return p;
}
PRESETS.push({name:'CLEAR SIGNAL',description:'Basic waveforms + shaped resonant filtering',create:clearSignal},{name:'WIRE STRINGS',description:'Pink noise plucks a resonant string',create:wireStrings},{name:'SIDEBAND GARDEN',description:'Two sources multiply and their harmonics drift',create:sidebandGarden});
export function chanceGarden():Patch{
  const p=patch('CHANCE GARDEN',104,81601);
  add(p,'PULSE',16,16,2001);add(p,'CHANCE',192,16,2002);add(p,'COMB',368,16,2003);add(p,'CHAMBER',544,16,2004);add(p,'OUTPUT',720,16,2005);add(p,'ALLOY',368,184,2006);add(p,'FLOCK',16,184,2007);
  p.modules[0].params.rate=.66;p.modules[0].params.irregular=.08;p.modules[1].params.density=.62;p.modules[1].params.recall=.72;p.modules[2].params.tune=.66;p.modules[3].mode='WEAVE';p.modules[5].params.body=.3;p.modules[5].params.tension=.25;
  wire(p,'pulse-1','trigger','chance-1','clock');wire(p,'chance-1','a','comb-1','trigger');wire(p,'chance-1','b','alloy-1','trigger');wire(p,'chance-1','pitch','comb-1','pitch');wire(p,'chance-1','pitch','alloy-1','pitch');wire(p,'comb-1','audio','chamber-1','audio');wire(p,'alloy-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');wire(p,'flock-1','controlA','chance-1','bias');return p;
}
export function spectralGhost():Patch{
  const p=patch('SPECTRAL GHOST',72,81602);
  add(p,'OSC',16,16,2101);add(p,'FILTER',192,16,2102);add(p,'PRISM',368,16,2103);add(p,'CHAMBER',544,16,2104);add(p,'OUTPUT',720,16,2105);add(p,'PULSE',192,184,2106);add(p,'FLOCK',16,184,2107);
  p.modules[0].mode='SAW';p.modules[0].params.tune=.72;p.modules[1].params.cutoff=.65;p.modules[2].mode='HOLD';p.modules[2].params.tune=.58;p.modules[2].params.memory=.25;p.modules[3].mode='WEAVE';p.modules[3].params.density=.78;p.modules[5].params.rate=.17;p.modules[5].params.irregular=0;
  wire(p,'osc-1','audio','filter-1','audio');wire(p,'filter-1','audio','prism-1','audio');wire(p,'prism-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');wire(p,'pulse-1','trigger','prism-1','capture');wire(p,'flock-1','controlA','filter-1','cutoff');wire(p,'flock-1','controlB','prism-1','pitch');return p;
}
export function harmonicWeather():Patch{
  const p=patch('HARMONIC WEATHER',76,81603);
  add(p,'PARTIAL',16,16,2201);add(p,'CHORUS',192,16,2202);add(p,'CHAMBER',368,16,2203);add(p,'OUTPUT',544,16,2204);add(p,'FLOCK',16,184,2205);add(p,'PARASITE',192,184,2206);
  p.modules[0].params.mass=.62;p.modules[0].params.warp=.5;p.modules[2].mode='WEAVE';p.modules[2].params.size=.72;p.modules[2].params.density=.8;p.modules[5].params.feed=.62;
  wire(p,'partial-1','audio','chorus-1','audio');wire(p,'chorus-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');wire(p,'chamber-1','audio','parasite-1','audio');wire(p,'parasite-1','pressure','partial-1','mass');wire(p,'flock-1','controlA','partial-1','warp');wire(p,'flock-1','controlB','partial-1','pitch');return p;
}
PRESETS.push({name:'CHANCE GARDEN',description:'Remembered probability chooses two rhythms',create:chanceGarden},{name:'SPECTRAL GHOST',description:'A source leaves its spectrum in a new voice',create:spectralGhost},{name:'HARMONIC WEATHER',description:'Partial clusters feed an entangled space',create:harmonicWeather});
export function clockworkGarden():Patch{
  const p=patch('CLOCKWORK GARDEN',104,91601);
  add(p,'WEFT',16,16,2301);add(p,'BRANCH',192,16,2302);add(p,'ALLOY',368,16,2303);add(p,'CHAMBER',544,16,2304);add(p,'OUTPUT',720,16,2305);add(p,'DRONE',16,184,2306);add(p,'VCA',192,184,2307);add(p,'COMB',368,184,2308);
  p.modules[0].params.rate=.67;p.modules[0].params.fill=.56;p.modules[2].params.body=.32;p.modules[3].mode='WEAVE';p.modules[5].mode='110 Hz';p.modules[7].params.tune=.65;p.modules[7].params.decay=.52;
  wire(p,'weft-1','a','branch-1','clock');wire(p,'branch-1','pitch','alloy-1','pitch');wire(p,'branch-1','gate','alloy-1','trigger');wire(p,'weft-1','b','comb-1','trigger');wire(p,'branch-1','pitch','comb-1','pitch');wire(p,'weft-1','envelope','vca-1','level');wire(p,'weft-1','wander','drone-1','spread');wire(p,'drone-1','audio','vca-1','a');wire(p,'vca-1','audio','chamber-1','audio');wire(p,'alloy-1','audio','chamber-1','audio');wire(p,'comb-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');return p;
}
export function slowWeather():Patch{
  const p=patch('SLOW WEATHER',76,91602);
  add(p,'TIDE',16,16,2401);add(p,'PARTIAL',192,16,2402);add(p,'FILTER',368,16,2403);add(p,'CHAMBER',544,16,2404);add(p,'OUTPUT',720,16,2405);
  p.modules[0].params.range=.9;p.modules[1].params.mass=.62;p.modules[2].params.cutoff=.67;p.modules[2].params.resonance=.36;p.modules[3].mode='WEAVE';p.modules[3].params.density=.75;
  wire(p,'tide-1','drift','partial-1','warp');wire(p,'tide-1','tide','filter-1','cutoff');wire(p,'tide-1','age','partial-1','mass');wire(p,'partial-1','audio','filter-1','audio');wire(p,'filter-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');return p;
}
export function marbleRoom():Patch{
  const p=patch('MARBLE ROOM',76,91603);
  add(p,'BOUNCE',16,16,2501);add(p,'RESON',192,16,2502);add(p,'CAUSTIC',368,16,2503);add(p,'CHAMBER',544,16,2504);add(p,'OUTPUT',720,16,2505);add(p,'WEFT',16,184,2506);add(p,'TIDE',192,184,2507);
  p.modules[0].params.tilt=.65;p.modules[0].params.elastic=.82;p.modules[1].params.decay=.75;p.modules[2].params.burn=.25;p.modules[3].mode='WEAVE';p.modules[3].params.size=.6;p.modules[5].params.rate=.17;p.modules[5].params.fill=.6;p.modules[6].params.range=.7;
  wire(p,'bounce-1','hit','reson-1','trigger');wire(p,'bounce-1','x','reson-1','pitch');wire(p,'bounce-1','speed','caustic-1','burn');wire(p,'reson-1','audio','caustic-1','audio');wire(p,'caustic-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');wire(p,'weft-1','b','bounce-1','kick');wire(p,'tide-1','drift','bounce-1','x');return p;
}
export function binaryFever():Patch{
  const p=patch('BINARY FEVER',112,91604);p.master=.5;
  add(p,'COUNT',16,16,2601);add(p,'MAP',192,16,2602);add(p,'FERAL',368,16,2603);add(p,'FILTER',544,16,2604);add(p,'OUTPUT',720,16,2605);add(p,'TIDE',192,184,2606);
  p.modules[0].mode='AUDIO';p.modules[0].params.rate=.82;p.modules[0].params.step=4/14;p.modules[1].params.table=4/7;p.modules[1].params.amount=.6;p.modules[2].params.chaos=.73;p.modules[2].params.tune=.48;p.modules[3].params.cutoff=.7;p.modules[4].params.level=.6;p.modules[5].params.flow=.7;
  wire(p,'count-1','audio','map-1','audio');wire(p,'count-1','value','map-1','cv');wire(p,'map-1','audio','feral-1','audio');wire(p,'feral-1','audio','filter-1','audio');wire(p,'filter-1','audio','output-1','audio');wire(p,'map-1','cv','filter-1','cutoff');wire(p,'tide-1','drift','map-1','table');wire(p,'tide-1','tide','feral-1','chaos');return p;
}
PRESETS.push({name:'CLOCKWORK GARDEN',description:'One timebase weaves rhythms and shaped controls',create:clockworkGarden},{name:'SLOW WEATHER',description:'Three time scales move a harmonic landscape',create:slowWeather},{name:'MARBLE ROOM',description:'A marble hits walls and strikes a resonant body',create:marbleRoom},{name:'BINARY FEVER',description:'Counting and lookup tables become a nonlinear voice',create:binaryFever});
export function bentVowels():Patch{
  const p=patch('BENT VOWELS',82,101601);
  add(p,'BOUNCE',16,16,2701);add(p,'QUANTIZE',192,16,2702);add(p,'SLEW',368,16,2703);add(p,'FORMANT',544,16,2704);add(p,'CHAMBER',720,16,2705);add(p,'OUTPUT',896,16,2706);add(p,'WEFT',16,184,2707);add(p,'DUCK',544,184,2708);
  p.modules[1].mode='19-TET';p.modules[1].params.pull=.72;p.modules[2].mode='GLIDE';p.modules[2].params.rise=.25;p.modules[2].params.fall=.45;p.modules[3].params.tune=.55;p.modules[4].mode='WEAVE';p.modules[6].params.fill=.65;p.modules[7].params.depth=.38;p.modules[7].params.recover=.23;
  wire(p,'bounce-1','x','quantize-1','cv');wire(p,'quantize-1','cv','slew-1','cv');wire(p,'slew-1','cv','formant-1','pitch');wire(p,'bounce-1','y','formant-1','vowel');wire(p,'bounce-1','speed','formant-1','breath');wire(p,'formant-1','audio','duck-1','audio');wire(p,'duck-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');wire(p,'weft-1','a','quantize-1','clock');wire(p,'weft-1','b','bounce-1','kick');wire(p,'quantize-1','change','duck-1','trigger');return p;
}
export function splitOrbits():Patch{
  const p=patch('SPLIT ORBITS',112,101602);
  add(p,'PULSE',16,16,2801);add(p,'LOGIC',192,16,2802);add(p,'ALLOY',368,16,2803);add(p,'COMB',368,184,2804);add(p,'DRONE',16,184,2805);add(p,'DUCK',192,184,2806);add(p,'CHAMBER',544,16,2807);add(p,'OUTPUT',720,16,2808);
  p.modules[0].params.rate=.5;p.modules[0].params.irregular=0;p.modules[1].mode='XOR';p.modules[1].params.ratio=.5;p.modules[2].params.body=.24;p.modules[3].params.tune=.65;p.modules[4].mode='220 Hz';p.modules[4].params.color=.66;p.modules[5].params.depth=.6;p.modules[5].params.recover=.18;p.modules[6].mode='WEAVE';p.modules[6].params.density=.58;
  wire(p,'pulse-1','trigger','logic-1','a');wire(p,'logic-1','a','alloy-1','trigger');wire(p,'logic-1','b','comb-1','trigger');wire(p,'logic-1','event','duck-1','trigger');wire(p,'drone-1','audio','duck-1','audio');wire(p,'alloy-1','audio','duck-1','key');wire(p,'duck-1','audio','chamber-1','audio');wire(p,'alloy-1','audio','chamber-1','audio');wire(p,'comb-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');return p;
}
export function tritaveField():Patch{
  const p=patch('TRITAVE FIELD',76,101603);
  add(p,'TIDE',16,16,2901);add(p,'QUANTIZE',192,16,2902);add(p,'SLEW',368,16,2903);add(p,'PARTIAL',544,16,2904);add(p,'CHAMBER',720,16,2905);add(p,'OUTPUT',896,16,2906);
  p.modules[0].params.flow=.85;p.modules[0].params.range=.95;p.modules[1].mode='13-TRIT';p.modules[1].params.span=.65;p.modules[2].mode='GLIDE';p.modules[2].params.rise=.32;p.modules[2].params.fall=.58;p.modules[3].params.mass=.65;p.modules[3].params.warp=.55;p.modules[4].mode='WEAVE';p.modules[4].params.density=.7;
  wire(p,'tide-1','drift','quantize-1','cv');wire(p,'quantize-1','cv','slew-1','cv');wire(p,'slew-1','cv','partial-1','pitch');wire(p,'tide-1','tide','partial-1','warp');wire(p,'tide-1','age','partial-1','mass');wire(p,'partial-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');return p;
}
export function offGrid():Patch{
  const p=patch('OFF GRID',74,101604);p.master=.6;
  add(p,'PULSE',16,16,3001);add(p,'LOGIC',192,16,3002);add(p,'BOUNCE',368,16,3003);add(p,'SLEW',544,16,3004);add(p,'FERAL',720,16,3005);add(p,'FORMANT',368,184,3006);add(p,'DUCK',544,184,3007);add(p,'CHAMBER',720,184,3008);add(p,'OUTPUT',896,184,3009);
  p.modules[0].params.rate=.33;p.modules[0].params.irregular=0;p.modules[1].mode='XOR';p.modules[1].params.ratio=1;p.modules[1].params.shift=.54;p.modules[3].mode='GLIDE';p.modules[3].params.rise=.18;p.modules[3].params.fall=.35;p.modules[4].params.tune=.62;p.modules[4].params.chaos=.62;p.modules[5].mode='WHISPER';p.modules[6].params.depth=.6;p.modules[6].params.recover=.5;p.modules[7].mode='WEAVE';
  wire(p,'pulse-1','trigger','logic-1','a');wire(p,'logic-1','a','bounce-1','kick');wire(p,'logic-1','b','feral-1','kick');wire(p,'logic-1','event','duck-1','trigger');wire(p,'bounce-1','x','slew-1','cv');wire(p,'slew-1','cv','feral-1','pitch');wire(p,'bounce-1','y','formant-1','vowel');wire(p,'bounce-1','speed','formant-1','breath');wire(p,'formant-1','audio','duck-1','audio');wire(p,'duck-1','audio','chamber-1','audio');wire(p,'feral-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');return p;
}
PRESETS.push({name:'BENT VOWELS',description:'A marble bends a 19-step vowel voice',create:bentVowels},{name:'SPLIT ORBITS',description:'Three-to-five clocks make space in a drone',create:splitOrbits},{name:'TRITAVE FIELD',description:'Thirteen steps across a tritave, with asymmetric glides',create:tritaveField},{name:'OFF GRID',description:'Irrational clocks and unquantized physical pitch',create:offGrid});
export function emptyPatch():Patch{return patch('UNTITLED CIRCUIT',76,crypto.getRandomValues(new Uint32Array(1))[0]);}

export function colonyCracks():Patch{
  const p=patch('COLONY CRACKS',86,111601);
  add(p,'SWARM',16,16,3101);add(p,'FAULT LINE',192,16,3102);add(p,'TAPE',368,16,3103);add(p,'OUTPUT',544,16,3104);add(p,'BOUNCE',16,184,3105);add(p,'SIDEWAYS',192,184,3106);add(p,'TIDE',368,184,3107);
  p.modules[1].params.pressure=.87;p.modules[1].params.heal=.25;p.modules[2].params.echo=.4;p.modules[5].params.attraction=.8;p.modules[5].params.inertia=.42;
  wire(p,'swarm-1','audio','fault-line-1','audio');wire(p,'fault-line-1','audio','tape-1','audio');wire(p,'tape-1','audio','output-1','audio');wire(p,'bounce-1','x','sideways-1','a');wire(p,'tide-1','drift','sideways-1','b');wire(p,'sideways-1','a','swarm-1','pitch');wire(p,'sideways-1','b','swarm-1','sympathy');return p;
}
export function storedRain():Patch{
  const p=patch('STORED RAIN',116,111602);
  add(p,'WEFT',16,16,3201);add(p,'UNSPENT',192,16,3202);add(p,'RESON',368,16,3203);add(p,'FAULT LINE',544,16,3204);add(p,'CHAMBER',720,16,3205);add(p,'OUTPUT',896,16,3206);add(p,'TIDE',16,184,3207);add(p,'BOUNCE',192,184,3208);add(p,'QUORUM',368,184,3209);
  p.modules[0].params.fill=.8;p.modules[1].params.hold=.8;p.modules[1].params.release=.4;p.modules[3].params.pressure=.82;p.modules[3].params.heal=.3;p.modules[4].mode='WEAVE';p.modules[8].params.stubborn=.2;
  wire(p,'weft-1','a','unspent-1','event');wire(p,'unspent-1','event','reson-1','trigger');wire(p,'reson-1','audio','fault-line-1','audio');wire(p,'fault-line-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');wire(p,'tide-1','drift','quorum-1','a');wire(p,'bounce-1','x','quorum-1','b');wire(p,'bounce-1','y','quorum-1','c');wire(p,'quorum-1','value','reson-1','pitch');wire(p,'quorum-1','spread','unspent-1','release');wire(p,'weft-1','b','bounce-1','kick');return p;
}
export function dissentingBodies():Patch{
  const p=patch('DISSENTING BODIES',78,111603);
  add(p,'TIDE',16,16,3301);add(p,'SIDEWAYS',192,16,3302);add(p,'QUORUM',368,16,3303);add(p,'SWARM',544,16,3304);add(p,'CHAMBER',720,16,3305);add(p,'OUTPUT',896,16,3306);add(p,'BOUNCE',192,184,3307);
  p.modules[1].params.attraction=.12;p.modules[1].params.inertia=.7;p.modules[2].params.agreement=.8;p.modules[2].params.stubborn=.4;p.modules[4].mode='WEAVE';p.modules[0].params.flow=.7;
  wire(p,'tide-1','drift','sideways-1','a');wire(p,'bounce-1','x','sideways-1','b');wire(p,'sideways-1','a','quorum-1','a');wire(p,'sideways-1','b','quorum-1','b');wire(p,'tide-1','tide','quorum-1','c');wire(p,'quorum-1','value','swarm-1','pitch');wire(p,'quorum-1','agree','swarm-1','kick');wire(p,'quorum-1','spread','swarm-1','energy');wire(p,'swarm-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');return p;
}
export function outerBand():Patch{
  const p=patch('OUTER BAND',76,111604);p.master=.45;
  add(p,'OSC',16,16,3401);p.modules[0].id='low-1';add(p,'OSC',16,184,3402);p.modules[1].id='high-1';add(p,'FAULT LINE',192,184,3403);add(p,'OUTPUT',368,16,3404);add(p,'TIDE',192,16,3405);
  p.modules[0].wide=p.modules[1].wide=p.modules[3].wide=true;p.modules[0].params.tune=Math.log(6/.05)/Math.log(480000);p.modules[1].params.tune=Math.log(12000/.05)/Math.log(480000);p.modules[1].params.level=.35;p.modules[2].params.pressure=.8;
  wire(p,'low-1','audio','output-1','audio');wire(p,'high-1','audio','fault-line-1','audio');wire(p,'fault-line-1','audio','output-1','audio');wire(p,'tide-1','drift','high-1','pitch');return p;
}
PRESETS.push({name:'COLONY CRACKS',description:'Four moving voices fracture a worn signal path',create:colonyCracks},{name:'STORED RAIN',description:'Saved events return to a cracked resonant body',create:storedRain},{name:'DISSENTING BODIES',description:'Attraction and dissent choose a colony pitch',create:dissentingBodies},{name:'OUTER BAND',description:'Six-hertz motion and a wandering high voice, with wide output',create:outerBand});

export function pixelDust():Patch{
  const p=patch('PIXEL DUST',108,121601);
  add(p,'CHIP',16,16,3501);add(p,'CRUSH',192,16,3502);add(p,'CLIP',368,16,3503);add(p,'OUTPUT',544,16,3504);add(p,'TOUCH',16,184,3505);add(p,'PENDULUM',192,184,3506);
  p.modules[0].params.character=.72;p.modules[1].params.bits=8/22;p.modules[1].params.rate=.77;p.modules[2].params.drive=.35;
  wire(p,'chip-1','audio','crush-1','audio');wire(p,'crush-1','audio','clip-1','audio');wire(p,'clip-1','audio','output-1','audio');wire(p,'touch-1','x','chip-1','pitch');wire(p,'pendulum-1','aCross','chip-1','trigger');wire(p,'pendulum-1','b','crush-1','rate');return p;
}
export function biasedOrbit():Patch{
  const p=patch('BIASED ORBIT',78,121602);
  add(p,'OSC',16,16,3601);add(p,'FUZZ',192,16,3602);add(p,'CHORUS',368,16,3603);add(p,'OUTPUT',544,16,3604);add(p,'PENDULUM',16,184,3605);p.modules[0].mode='TRIANGLE';p.modules[1].params.drive=.7;p.modules[1].params.bias=.65;
  wire(p,'osc-1','audio','fuzz-1','audio');wire(p,'fuzz-1','audio','chorus-1','audio');wire(p,'chorus-1','audio','output-1','audio');wire(p,'pendulum-1','a','osc-1','pitch');wire(p,'pendulum-1','b','fuzz-1','bias');return p;
}
export function drawnMetal():Patch{
  const p=patch('DRAWN METAL',100,121603);
  add(p,'TOUCH',16,16,3701);add(p,'PULSE',16,184,3702);add(p,'ALLOY',192,16,3703);add(p,'CLIP',368,16,3704);add(p,'CRUSH',544,16,3705);add(p,'CHAMBER',720,16,3706);add(p,'OUTPUT',896,16,3707);
  p.modules[0].gesture={duration:3,points:[{x:-.7,y:-.5,t:0},{x:.4,y:-.5,t:.6},{x:.4,y:.7,t:1.2},{x:-.4,y:.2,t:1.8},{x:.7,y:.5,t:2.3},{x:-.7,y:-.5,t:3}]};p.modules[4].params.bits=10/22;p.modules[4].params.rate=.8;p.modules[5].mode='WEAVE';
  wire(p,'touch-1','x','alloy-1','pitch');wire(p,'touch-1','y','crush-1','rate');wire(p,'pulse-1','trigger','alloy-1','trigger');wire(p,'alloy-1','audio','clip-1','audio');wire(p,'clip-1','audio','crush-1','audio');wire(p,'crush-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');return p;
}
export function twinSwings():Patch{
  const p=patch('TWIN SWINGS',76,121604);
  add(p,'PENDULUM',16,16,3801);add(p,'COMB',192,16,3802);add(p,'RESON',192,184,3803);add(p,'FUZZ',368,184,3804);add(p,'CHAMBER',544,16,3805);add(p,'OUTPUT',720,16,3806);
  p.modules[0].params.energy=.7;p.modules[0].params.coupling=.65;p.modules[3].params.drive=.4;p.modules[4].mode='WEAVE';
  wire(p,'pendulum-1','aCross','comb-1','trigger');wire(p,'pendulum-1','bCross','reson-1','trigger');wire(p,'pendulum-1','a','comb-1','pitch');wire(p,'pendulum-1','b','reson-1','pitch');wire(p,'reson-1','audio','fuzz-1','audio');wire(p,'fuzz-1','audio','chamber-1','audio');wire(p,'comb-1','audio','chamber-1','audio');wire(p,'chamber-1','audio','output-1','audio');return p;
}
PRESETS.push({name:'PIXEL DUST',description:'A stepped voice follows a gesture and two swings',create:pixelDust},{name:'BIASED ORBIT',description:'Two angles bend a gated fuzz voice',create:biasedOrbit},{name:'DRAWN METAL',description:'A saved drawing changes pitch and broken time',create:drawnMetal},{name:'TWIN SWINGS',description:'Two coupled bodies strike strings and metal',create:twinSwings});

export function dissolvingMetal():Patch{
  const p=patch('DISSOLVING METAL',72,161601);
  add(p,'PULSE',16,16,4101);add(p,'ALLOY',192,16,4102);add(p,'SMEAR',368,16,4103);add(p,'ORBIT',544,16,4104);add(p,'OUTPUT',720,16,4105);add(p,'FLOCK',192,184,4106);add(p,'PARASITE',368,184,4107);
  p.modules[0].params.rate=.34;p.modules[0].params.irregular=.6;p.modules[1].params.body=.18;p.modules[1].params.tension=.52;p.modules[2].params.smear=.76;p.modules[2].params.memory=.72;p.modules[3].params.rate=.3;p.modules[3].params.depth=.5;p.modules[5].params.drift=.15;p.modules[6].params.feed=.4;
  wire(p,'pulse-1','trigger','alloy-1','trigger');wire(p,'alloy-1','audio','smear-1','audio');wire(p,'smear-1','audio','orbit-1','audio');wire(p,'orbit-1','audio','output-1','audio');wire(p,'flock-1','controlA','smear-1','smear');wire(p,'smear-1','audio','parasite-1','audio');wire(p,'parasite-1','fever','alloy-1','tension');return p;
}
export function slidingGlass():Patch{
  const p=patch('SLIDING GLASS',70,161602);
  add(p,'FRICTION',16,16,4201);add(p,'RESON',192,184,4202);add(p,'SMEAR',368,16,4203);add(p,'PARASITE',192,16,4204);add(p,'OUTPUT',544,16,4205);
  p.modules[0].params.pressure=.64;p.modules[0].params.speed=.28;p.modules[1].params.material=.72;p.modules[1].params.decay=.38;p.modules[2].params.smear=.42;p.modules[2].params.memory=.58;p.modules[3].params.feed=.4;p.modules[3].params.memory=.6;
  wire(p,'friction-1','slip','reson-1','trigger');wire(p,'friction-1','activity','reson-1','material');wire(p,'friction-1','audio','smear-1','audio');wire(p,'reson-1','audio','smear-1','audio');wire(p,'smear-1','audio','output-1','audio');wire(p,'smear-1','audio','parasite-1','audio');wire(p,'parasite-1','fever','friction-1','speed');return p;
}
PRESETS.push({name:'DISSOLVING METAL',description:'Irregular metal attacks loosen into separate histories',create:dissolvingMetal},{name:'SLIDING GLASS',description:'A slipping surface excites a second body and listens to its own trace',create:slidingGlass});

export function foundQuiet():Patch{
  const p=patch('FOUND / QUIET',64,171701);add(p,'FOUND',16,16,5101);add(p,'TIDE',16,184,5102);add(p,'ORBIT',192,16,5103);add(p,'OUTPUT',368,16,5104);
  p.modules[0].sample='builtin:room';p.modules[0].params.wander=.25;p.modules[0].params.alter=.1;p.modules[2].params.rate=.2;p.modules[2].params.depth=.4;
  wire(p,'found-1','audio','orbit-1','audio');wire(p,'orbit-1','audio','output-1','audio');wire(p,'tide-1','drift','found-1','move');return p;
}
export function foundStrange():Patch{
  const p=patch('FOUND / STRANGE',80,171702);add(p,'FOUND',16,16,5201);add(p,'RESON',192,184,5202);add(p,'MESH',368,16,5203);add(p,'CLOUD',192,16,5204);add(p,'OUTPUT',544,16,5205);
  p.modules[0].sample='builtin:machine';p.modules[0].params.wander=.75;p.modules[0].params.alter=.65;p.modules[1].params.decay=.25;p.modules[3].params.grain=.25;
  wire(p,'found-1','audio','cloud-1','audio');wire(p,'found-1','event','reson-1','trigger');wire(p,'cloud-1','audio','mesh-1','a');wire(p,'reson-1','audio','mesh-1','b');wire(p,'mesh-1','audio','output-1','audio');return p;
}
PRESETS.push({name:'FOUND / QUIET',description:'Quiet synthetic room air follows a slow tide',create:foundQuiet},{name:'FOUND / STRANGE',description:'Discovered machine events excite another body',create:foundStrange});

export function levelRecovery():Patch{
  const p=patch('LEVEL / RECOVERY',76,171703);add(p,'DRONE',16,16,5301);add(p,'VCA',192,16,5302);add(p,'LEVEL',544,96,5303);add(p,'OUTPUT',720,96,5304);add(p,'PULSE',16,184,5305);add(p,'ALLOY',192,184,5306);p.modules.push(createModule('VCA',368,184,5307,'hit-gain'));
  p.modules[0].params.color=.7;p.modules[1].params.level=.035;p.modules[2].params.boost=.9;p.modules[2].params.comp=.6;p.modules[4].params.rate=.4;p.modules[4].params.irregular=0;p.modules[5].params.body=.22;p.modules[5].params.tension=.3;p.modules[5].character='SOFT';p.modules[6].params.level=.25;
  wire(p,'drone-1','audio','vca-1','a');wire(p,'vca-1','audio','level-1','audio');wire(p,'pulse-1','trigger','alloy-1','trigger');wire(p,'alloy-1','audio','hit-gain','a');wire(p,'hit-gain','audio','level-1','audio');wire(p,'level-1','audio','output-1','audio');return p;
}
PRESETS.push({name:'LEVEL / RECOVERY',description:'A small continuous source is brought forward without changing its stereo field',create:levelRecovery});

export function mirageReflections():Patch{
  const p=patch('MIRAGE / AFTERIMAGES',68,181801);
  add(p,'PULSE',16,16,6101);add(p,'RESON',192,16,6102);add(p,'MIRAGE',368,16,6103);add(p,'OUTPUT',544,16,6104);add(p,'FLOCK',192,184,6105);
  p.modules[0].params.rate=.19;p.modules[0].params.irregular=.36;p.modules[1].params.material=.74;p.modules[1].params.decay=.25;p.modules[2].params.distance=.52;p.modules[2].params.mutate=.62;add(p,'LEVEL',544,184,6106);p.modules[5].params.boost=.7;
  wire(p,'pulse-1','trigger','reson-1','trigger');wire(p,'reson-1','audio','mirage-1','audio');wire(p,'flock-1','controlA','mirage-1','mutate');wire(p,'mirage-1','audio','level-1','audio');wire(p,'level-1','audio','output-1','audio');return p;
}
export function lossTransmission():Patch{
  const p=patch('LOSS / UNCERTAIN',74,181802);
  add(p,'FOUND',16,16,6201);add(p,'LOSS',192,16,6202);add(p,'LEVEL',368,16,6203);add(p,'OUTPUT',544,16,6204);add(p,'TIDE',192,184,6205);
  p.modules[0].sample='builtin:machine';p.modules[0].params={wander:.15,alter:.08};p.modules[1].params={damage:.65,recover:.74};p.modules[2].params.boost=.65;
  wire(p,'found-1','audio','loss-1','audio');wire(p,'loss-1','audio','level-1','audio');wire(p,'level-1','audio','output-1','audio');wire(p,'tide-1','drift','loss-1','recover');return p;
}
export function cutsSmallEvents():Patch{
  const p=patch('CUTS / SMALL HOURS',82,181803);
  add(p,'CUTS',16,16,6301);add(p,'RESON',192,184,6302);add(p,'LEVEL',368,16,6303);add(p,'ORBIT',544,16,6304);add(p,'OUTPUT',720,16,6305);
  p.modules[0].sample='builtin:rain';p.modules[0].params={sparse:.44,change:.58};p.modules[1].params.material=.27;p.modules[1].params.decay=.22;p.modules[2].params.boost=.53;p.modules[3].params.rate=.22;
  wire(p,'cuts-1','audio','level-1','audio');wire(p,'cuts-1','event','reson-1','trigger');wire(p,'reson-1','audio','level-1','audio');wire(p,'level-1','audio','orbit-1','audio');wire(p,'orbit-1','audio','output-1','audio');return p;
}
export function nerveRecovery():Patch{
  const p=patch('NERVE / RECOVERY',92,181804);
  add(p,'PULSE',16,16,6401);add(p,'NERVE',192,16,6402);add(p,'ALLOY',368,16,6403);add(p,'OUTPUT',544,16,6404);add(p,'TIDE',16,184,6405);
  p.modules[0].params.rate=.6;p.modules[0].params.irregular=.2;p.modules[1].params={sense:.68,fatigue:.6};p.modules[2].params.body=.28;p.modules[2].params.tension=.32;p.modules[2].character='SOFT';
  wire(p,'pulse-1','trigger','nerve-1','trigger');wire(p,'tide-1','drift','nerve-1','stim');wire(p,'nerve-1','spike','alloy-1','trigger');wire(p,'nerve-1','charge','alloy-1','tension');wire(p,'alloy-1','audio','output-1','audio');return p;
}
export function uncertainEcosystem():Patch{
  const p=patch('UNCERTAIN ECOSYSTEM',76,181805);
  add(p,'CUTS',16,16,6501);add(p,'NERVE',192,184,6502);add(p,'RESON',368,184,6503);add(p,'LOSS',192,16,6504);add(p,'MIRAGE',368,16,6505);add(p,'LEVEL',544,16,6506);add(p,'ORBIT',720,16,6507);add(p,'OUTPUT',896,16,6508);add(p,'TIDE',16,184,6509);
  p.modules[0].sample='builtin:machine';p.modules[0].params={sparse:.51,change:.62};p.modules[1].params={sense:.7,fatigue:.68};p.modules[2].params={material:.62,decay:.37};p.modules[3].params={damage:.32,recover:.68};p.modules[4].params={distance:.54,mutate:.57};p.modules[5].params.boost=.53;p.modules[6].params.rate=.16;
  wire(p,'cuts-1','audio','loss-1','audio');wire(p,'cuts-1','event','nerve-1','trigger');wire(p,'tide-1','drift','nerve-1','stim');wire(p,'nerve-1','spike','reson-1','trigger');wire(p,'nerve-1','charge','loss-1','damage');wire(p,'loss-1','audio','mirage-1','audio');wire(p,'reson-1','audio','mirage-1','audio');wire(p,'tide-1','age','mirage-1','mutate');wire(p,'mirage-1','audio','level-1','audio');wire(p,'level-1','audio','orbit-1','audio');wire(p,'orbit-1','audio','output-1','audio');return p;
}
PRESETS.push({name:'MIRAGE / AFTERIMAGES',description:'Each reflection returns as a different metal outline',create:mirageReflections},{name:'LOSS / UNCERTAIN',description:'A small machine loses and repairs parts of its transmission',create:lossTransmission},{name:'CUTS / SMALL HOURS',description:'Rain gestures and a second body leave room for silence',create:cutsSmallEvents},{name:'NERVE / RECOVERY',description:'Stimulation, adaptation and rest choose the next strike',create:nerveRecovery},{name:'UNCERTAIN ECOSYSTEM',description:'Sample events stimulate a tired body inside a changing echo',create:uncertainEcosystem});
