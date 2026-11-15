// Offline curation only. Existing BRANCH/CHANCE seeds encode the phrases; no new DSP/editor.
import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';import {api} from './lib/phase5-audio.mjs';
const a=await api(),notes=[-12,-9,-7,-5,-2,0,3,5,7,10,12,15,17,19,22],plans=[],changes=[];
function base(id){return JSON.parse(readFileSync('docs/phase5/baseline/presets/'+id+'.json','utf8'));}
function get(p,id){const m=p.modules.find(m=>m.id===id);assert(m,id);return m;}
function set(p,id,params,extra={}){Object.assign(get(p,id).params,params);Object.assign(get(p,id),extra);}
function add(p,type,params={},extra={}){const id=extra.id??type.toLowerCase()+'-1';assert(!p.modules.some(m=>m.id===id));const i=p.modules.length,m=a.createModule(type,16+(i%4)*176,16+Math.floor(i/4)*168,p.seed+i*7919,id);m.params={...m.params,...params};Object.assign(m,extra);p.modules.push(m);return m;}
function wire(p,from,port,to,input){a.connect(p,{module:from,port},{module:to,port:input});p.connections.at(-1).id=`music-${from}-${port}-${to}-${input}`;}
function unplugInput(p,module,port){p.connections=p.connections.filter(c=>c.to.module!==module||c.to.port!==port);}
function motif(p,type,target,root=0){
 const m=add(p,type,type==='BRANCH'?{change:.08,memory:.95}:{density:1,recall:1},type==='CHANCE'?{mode:'HIGH'}:{});let best,score=Infinity;
 for(let seed=10000;seed<210000;seed++){
  const random=new a.SeededRandom(seed^p.seed),phrase=[];
  for(let i=0;i<8;i++){let index;if(type==='BRANCH')index=3+Math.floor(random.next()*7);else{random.next();const raw=random.next(),shaped=1-Math.pow(1-raw,2.65);index=Math.min(14,Math.floor(shaped*15));}phrase.push(notes[index]);}
  if(phrase[0]!==root||phrase[7]!==root||new Set(phrase).size<4||phrase.some((n,i)=>i&&Math.abs(n-phrase[i-1])>9))continue;
  const next=phrase.reduce((s,n,i)=>s+Math.abs(n-target[i]),0);if(next<score){score=next;best={seed,phrase};if(!score)break;}
 }
 assert(best,'No suitable seed');m.seed=best.seed;
 // Verify with the actual shipping sequencer, not only the seed search arithmetic.
 const compiled=new a.DSPGraph(24000),probe={...p,modules:[m],connections:[]};compiled.setPatch(probe);const voice=compiled.modules.get(m.id),observed=[];for(let i=0;i<16;i++){voice.inputL[0]=i%2===0?1:0;voice.process(i,p.bpm);if(i%2===0)observed.push(Math.round(voice.outputL[type==='BRANCH'?0:2]*24));}assert.deepEqual(observed,best.phrase);
 plans.push({id:p.name,type,module:m.id,seed:best.seed,semitones:best.phrase,rootHz:type==='CHANCE'?110:null,meaning:'A minor pentatonic relative intervals; high-register CHANCE root12 is one octave above its base. Fixed initial seed, no custom pattern data or DSP changes.'});return m.id;
}
function save(id,p,reason,tradeoff){a.parsePatch(JSON.stringify(p));assert(!p.modules.some(m=>m.type==='WALLS'));
 const before=base(id),beforeById=new Map(before.modules.map(m=>[m.id,m])),parameterChanges=[];
 for(const m of p.modules){const old=beforeById.get(m.id);if(old){for(const key of Object.keys(m.params))if(old.params[key]!==m.params[key])parameterChanges.push({module:m.id,parameter:key,old:old.params[key],new:m.params[key]});if(old.mode!==m.mode)parameterChanges.push({module:m.id,parameter:'mode',old:old.mode??null,new:m.mode??null});}}
 changes.push({id,name:p.name,reason,tradeoff,humanListeningRequired:true,parameterChanges,addedModules:p.modules.filter(m=>!beforeById.has(m.id)).map(m=>({id:m.id,type:m.type})),removedModules:before.modules.filter(m=>!p.modules.some(n=>n.id===m.id)).map(m=>m.id),oldConnections:before.connections,newConnections:p.connections});writeFileSync('presets/curated/'+id+'.json',JSON.stringify(p,null,2)+'\n');
}
{
 const id='still-almost-moving-ii',p=base(id),b=motif(p,'BRANCH',[0,3,7,5,3,0,-2,0]);add(p,'PULSE',{rate:.16,irregular:0});wire(p,'pulse-1','trigger',b,'clock');unplugInput(p,'slew-1','cv');wire(p,b,'pitch','slew-1','cv');set(p,'slew-1',{rise:.6,fall:.65},{mode:'GLIDE'});set(p,'vca-1',{level:.38});set(p,'drone-1',{color:.38});save(id,p,'A slow repeated upper phrase moves above the A pedal instead of continuously wandering pitch.','The harmonic contour is more defined and the upper layer more present; free wandering is reduced.');
}
{
 const id='pixel-dust',p=base(id),b=motif(p,'BRANCH',[0,3,7,5,0,-2,-5,0]);add(p,'PULSE',{rate:2/3,irregular:0});wire(p,'pulse-1','trigger',b,'clock');unplugInput(p,'chip-1','pitch');unplugInput(p,'chip-1','trigger');wire(p,b,'pitch','chip-1','pitch');wire(p,b,'gate','chip-1','trigger');set(p,'chip-1',{tune:.5,character:.34});set(p,'output-1',{level:.4});save(id,p,'A recurring eighth-note pentatonic phrase gives the dry CHIP an immediate musical anchor. Pendulum still shapes its colour.','Five modules replace the original three-module configuration; physical motion no longer directly sweeps pitch/timing. CHIP DSP stays unchanged.');
}
// Explicit user decision: ROOM AIR composition, levels and data are left byte-identical.
{
 const id='small-hours',p=base(id);add(p,'WEFT',{rate:1/3,fill:.42},{mode:'16'});wire(p,'weft-1','a','cuts-1','trigger');set(p,'cuts-1',{change:.3});save(id,p,'A restrained seven-in-sixteen trigger pattern gives sample gestures a repeatable temporal shape without filling every gap.','External clock takes over CUTS timing; silence remains central and the SPARSE knob becomes a cooldown control.');
}
{
 const id='exchanging-bodies',p=base(id),c=motif(p,'CHANCE',[12,15,19,17,15,7,10,12],12);unplugInput(p,'sympathy-1','trigger');wire(p,'pulse-1','trigger',c,'clock');wire(p,c,'a','sympathy-1','trigger');wire(p,c,'pitch','sympathy-1','pitch');set(p,'pulse-1',{irregular:.08});set(p,'sympathy-1',{couple:.6});save(id,p,'A remembered upper-register bell phrase exposes both notes and body-to-body exchange.','The original single low strike becomes a pitch motif; zero-random-recall mode is stable until the user lowers RECALL.');
}
{
 const id='dissolving-metal',p=base(id),c=motif(p,'CHANCE',[12,19,15,17,12,10,7,12],12);unplugInput(p,'alloy-1','trigger');wire(p,'pulse-1','trigger',c,'clock');wire(p,c,'a','alloy-1','trigger');wire(p,c,'pitch','alloy-1','pitch');set(p,'pulse-1',{irregular:.12});set(p,'alloy-1',{body:.32,tension:.36});set(p,'smear-1',{smear:.45,memory:.58});set(p,'flock-1',{spread:.2});save(id,p,'Repeatable pitched metal attacks remain identifiable before dissolving into their traces.','Less timing disorder and less attack smearing; the parasitic timbral feedback and metal source remain.');
}
{
 const id='binary-fever',p=base(id),b=motif(p,'BRANCH',[0,0,7,3,0,-2,-5,0]);add(p,'WEFT',{rate:2/3,fill:.58},{mode:'16'});add(p,'OSC',{tune:.75,level:0},{mode:'PULSE'});add(p,'SHAPE',{rise:.02,fall:.55});wire(p,'weft-1','a',b,'clock');wire(p,b,'gate','shape-1','trigger');wire(p,'shape-1','control','osc-1','level');wire(p,b,'pitch','osc-1','pitch');wire(p,b,'pitch','feral-1','pitch');wire(p,'osc-1','audio','count-1','audioClock');set(p,'count-1',{step:.5});set(p,'feral-1',{tune:.65,chaos:.28});set(p,'filter-1',{cutoff:.82});set(p,'tide-1',{range:.16});save(id,p,'An enveloped oscillator clocks the binary circuit into a syncopated pitched line. The driven FERAL setting avoids a continuously dominant low chaotic attractor.','Ten modules, more metrical structure and less autonomous chaos; COUNT RATE is overridden by its patched audio clock. Digital mapping and nonlinear filtering remain.');
}
{
 const id='tape-garden',p=base(id),b=motif(p,'BRANCH',[0,7,5,3,0,-2,3,0]);add(p,'PULSE',{rate:.16,irregular:.03});wire(p,'pulse-1','trigger',b,'clock');wire(p,b,'pitch','drone-1','pitch');set(p,'drone-1',{}, {mode:'220 Hz'});set(p,'sieve-1',{focus:.5,width:.56});set(p,'flock-1',{spread:.18});set(p,'tape-1',{wear:.42,echo:.75});save(id,p,'A slow upper-register phrase and approximately eighth-note tape returns make the memory audible as a musical relationship.','Less sub-register weight and gentler wear; the delay is near the tempo subdivision but retains flutter and is not hard-synced.');
}
{
 const id='late-light',p=base(id),b=motif(p,'BRANCH',[0,7,10,7,5,3,-2,0]);unplugInput(p,'chip-1','pitch');unplugInput(p,'chip-1','trigger');wire(p,'pulse-1','trigger',b,'clock');wire(p,b,'pitch','chip-1','pitch');wire(p,b,'gate','chip-1','trigger');set(p,'chip-1',{tune:.75});set(p,'pulse-1',{rate:1/3,irregular:.06});set(p,'plate-1',{body:.52,decay:.72});save(id,p,'A bright repeating note contour remains clear while its harmonically related PLATE tails overlap.','Higher CHIP register, more frequent notes and a shorter/brighter tail; still the only curated PLATE environment.');
}
{
 const id='off-grid',p=base(id);set(p,'branch-1',{change:.12,memory:.9});set(p,'quantize-1',{span:.35});set(p,'formant-1',{tune:.5});set(p,'shape-1',{fall:.52});save(id,p,'Longer vowel notes and a retained narrower phrase make the asymmetric19-TET rhythm easier to follow; lower CHANGE also omits fewer gates.','The12-step clock rate and19-TET character stay intact, but lower BRANCH CHANGE also reduces random gate omissions:53 ->62 rendered note triggers per60s. Longer articulation and fewer omissions jointly reduce quiet time; this is not solely a level adjustment.');
}
assert.equal(readFileSync('presets/curated/room-air.json','utf8'),readFileSync('docs/phase5/baseline/presets/room-air.json','utf8'));
writeFileSync('docs/phase5/musical-plan.json',JSON.stringify({scope:'Later user instruction asks for musical form beyond minor balancing; only existing modules/data are arranged. ROOM AIR explicitly remains unchanged. All original DSP and both reference collections are protected.',plans,changes},null,2)+'\n');console.log(plans.map(p=>({id:p.id,phrase:p.semitones,seed:p.seed})));
