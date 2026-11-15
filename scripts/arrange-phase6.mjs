// Offline preset data curation; every shipping DSP file stays unchanged.
import {readFileSync,writeFileSync} from 'node:fs';import {api} from './lib/phase5-audio.mjs';
const a=await api(),changes=[];
const base=id=>JSON.parse(readFileSync('docs/phase6/baseline/presets/'+id+'.json','utf8'));
const get=(p,id)=>p.modules.find(m=>m.id===id);
function set(p,id,params,extra={}){Object.assign(get(p,id).params,params);Object.assign(get(p,id),extra);}
function remove(p,...ids){p.modules=p.modules.filter(m=>!ids.includes(m.id));p.connections=p.connections.filter(c=>!ids.includes(c.from.module)&&!ids.includes(c.to.module));}
function unplug(p,id,port){p.connections=p.connections.filter(c=>c.to.module!==id||c.to.port!==port);}
function wire(p,from,port,to,input){a.connect(p,{module:from,port},{module:to,port:input});p.connections.at(-1).id=`p6-${from}-${port}-${to}-${input}`;}
function add(p,type,id,params,extra={}){const i=p.modules.length,m=a.createModule(type,16+i%4*176,16+Math.floor(i/4)*168,p.seed+i*7919,id);Object.assign(m.params,params);Object.assign(m,extra);p.modules.push(m);return m;}
function save(id,p,principle,tradeoff){const b=base(id);a.parsePatch(JSON.stringify(p));changes.push({id,name:p.name,principle,tradeoff,beforeModules:b.modules.length,afterModules:p.modules.length,before:b,after:p});writeFileSync('presets/curated/'+id+'.json',JSON.stringify(p,null,2)+'\n');}
{
 const id='still-almost-moving-ii',p=base(id);remove(p,'branch-1','pulse-1');unplug(p,'partial-1','pitch');wire(p,'tide-1','tide','slew-1','cv');wire(p,'slew-1','cv','partial-1','warp');set(p,'slew-1',{rise:.9,fall:.95});set(p,'vca-1',{level:.18});set(p,'partial-1',{warp:.5});save(id,p,'A fixed110/220Hz harmonic relationship changes partial overlap and density, without foreground note sequencing.','Two fewer modules. The upper source is quieter and nearer harmonic partials; drift/mass and slowly smoothed WARP around its harmonic center create internal development rather than a melody.');
}
{
 const id='pixel-dust',p=base(id);save(id,p,'The collection\'s intentionally familiar, dry eight-note pentatonic melody.','Preserved byte-for-byte: existing rare gate omissions, later BRANCH memory changes and PENDULUM colour already supply modest variation.');
}
{
 const id='room-air',p=base(id);add(p,'LEVEL','level-1',{boost:2/3,comp:0});unplug(p,'output-1','audio');wire(p,'chamber-1','audio','level-1','audio');wire(p,'level-1','audio','output-1','audio');save(id,p,'Original nonmetrical room presence, with a minimal +12dB LEVEL proposal.','One gain-only module; no low-cut, compression or source/timing/spatial edits. Low-frequency room weight remains. Review at matched playback levels before accepting this gain choice.');
}
{
 const id='small-hours',p=base(id);remove(p,'weft-1');set(p,'cuts-1',{sparse:.88,change:.24});save(id,p,'Irregular autonomous fragments, sample-feature recency and returning MIRAGE memory, with no explicit beat.','One fewer module. CUTS now controls event spacing; intervals are bounded but seeded, and MIRAGE/NERVE/LOSS retain contextual memory. No fixed phrase is promised.');
}
{
 const id='exchanging-bodies',p=base(id);remove(p,'chance-1');add(p,'LOGIC','logic-1',{ratio:1/6,shift:.72},{mode:'OR'});add(p,'SYMPATHY','reply-1',{body:.25,couple:.32});wire(p,'pulse-1','trigger','logic-1','a');wire(p,'logic-1','a','sympathy-1','trigger');wire(p,'logic-1','b','reply-1','trigger');wire(p,'sympathy-1','audio','reply-1','audio');wire(p,'reply-1','audio','level-1','audio');wire(p,'tide-1','age','reply-1','couple');save(id,p,'A longer ringing body and a shorter responding body interact under3:2 companion timing; the first physically excites the second.','One net additional module. No bell melody; two materials share a nominal110Hz root with slowly changing coupling. The reply is also excited by the first body between its own strikes.');
}
{
 const id='dissolving-metal',p=base(id);remove(p,'chance-1');const duration=7.3,points=[{t:0,x:.5,y:0},{t:1.45,x:.5,y:0},{t:1.5,x:.79,y:0},{t:3.55,x:.79,y:0},{t:3.6,x:.53,y:0},{t:4.35,x:.53,y:0},{t:4.4,x:.79,y:0},{t:6.05,x:.79,y:0},{t:6.1,x:.5,y:0},{t:duration,x:.5,y:0}];add(p,'TOUCH','touch-1',{speed:.5,smooth:.04},{gesture:{duration,points}});wire(p,'pulse-1','trigger','alloy-1','trigger');wire(p,'touch-1','x','alloy-1','pitch');set(p,'pulse-1',{irregular:.18});save(id,p,'Unequal7.3s three-plateau motion and an independent strike clock produce imperfect near-unisons/fifth-like intervals.','Same module count. Approximate held targets220/329/229Hz are not a conventional scale. TOUCH transitions and existing ALLOY continuous-pitch tracking also retune overlapping tails; interference is intentional, listening still required.');
}
{
 const id='binary-fever',p=base(id);remove(p,'branch-1');set(p,'weft-1',{}, {mode:'12'});wire(p,'weft-1','a','shape-1','trigger');wire(p,'weft-1','b','count-1','reset');save(id,p,'Seven-in-twelve articulation interacts with a three-times-longer reset pattern and an audio-rate binary divider.','One fewer module; OSC/FERAL pitch is fixed. Counter resets can change the waveform at an accent; existing MAP/filtering and bounded levels remain. Rhythm replaces melodic variety.');
}
{
 const id='tape-garden',p=base(id);remove(p,'branch-1');add(p,'COUNT','count-1',{step:.5,rate:.3},{mode:'CLOCK'});add(p,'QUANTIZE','quantize-1',{span:0,pull:1},{mode:'12-TET'});add(p,'LPG','lpg-1',{bite:.42,decay:.78});wire(p,'pulse-1','trigger','count-1','clock');wire(p,'count-1','value','quantize-1','cv');wire(p,'quantize-1','cv','drone-1','pitch');unplug(p,'sieve-1','audio');wire(p,'drone-1','audio','lpg-1','audio');wire(p,'pulse-1','trigger','lpg-1','strike');wire(p,'lpg-1','audio','sieve-1','audio');save(id,p,'A two-tone tritone family becomes finite gestures; worn delayed memory supplies the returns.','Two net additional modules. Continuous upper melody is replaced by155.6/220Hz gestures, separated from approximately.484s echoes; original tape/space colour remains.');
}
{
 const id='late-light',p=base(id);remove(p,'branch-1');add(p,'COUNT','count-1',{step:3/14,rate:.3},{mode:'CLOCK'});add(p,'QUANTIZE','quantize-1',{span:0,pull:1},{mode:'12-TET'});wire(p,'pulse-1','trigger','count-1','clock');wire(p,'count-1','value','quantize-1','cv');wire(p,'quantize-1','cv','chip-1','pitch');wire(p,'pulse-1','trigger','chip-1','trigger');set(p,'pulse-1',{rate:.16,irregular:.32});save(id,p,'Four held interval positions become related through PLATE overlap, with slower uneven arrivals and missing events.','One net additional module. The arithmetic cycle is four states, not eight notes; longer gaps retain openness. The four pitches are approximately370/440/554/311Hz, with no root-to-root phrase closure.');
}
{
 const id='off-grid',p=base(id);remove(p,'branch-1');add(p,'BOUNCE','bounce-1',{tilt:.25,elastic:.82});wire(p,'weft-1','b','bounce-1','kick');wire(p,'bounce-1','x','quantize-1','cv');wire(p,'weft-1','a','quantize-1','clock');wire(p,'weft-1','a','shape-1','trigger');set(p,'quantize-1',{span:.1});save(id,p,'Asymmetric12-step time samples moving physical coordinates onto19-TET; the second clock stream disturbs the motion.','Same module count. Held physical pitch replaces the pentatonic source. Every WEFT A event now articulates directly instead of BRANCH probabilistically omitting some; narrower span and existing long fall preserve space.');
}
writeFileSync('docs/phase6/changes.json',JSON.stringify({scope:'Preset-only curation, no DSP/mode/UI/storage changes.',changes},null,2)+'\n');console.log('Validated10 revised presets; no DSP edits.');
