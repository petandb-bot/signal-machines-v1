import {analyzeCuts} from './CutsAnalysis';
import type {CutEvent} from './CutsAnalysis';
export const FOUND_RATE=24000,FOUND_SECONDS=60,FOUND_BYTES=32_000_000;
export const MAX_FOUND=2,MAX_CUTS=2,MAX_SAMPLE_ASSETS=MAX_FOUND+MAX_CUTS;
/** One shared capacity check for patch import, graph compile, editor and LOOP copies. */
export function sampleModuleLimitError(modules:readonly {type:string}[]):string|null{
  let found=0,cuts=0;
  for(const module of modules){
    if(module.type==='FOUND'&&++found>MAX_FOUND)return 'A patch can contain at most 2 FOUND modules.';
    if(module.type==='CUTS'&&++cuts>MAX_CUTS)return 'A patch can contain at most 2 CUTS modules.';
  }
  return null;
}
export const BUILTINS=['room','rain','machine','wire','glass','tape'] as const;
export type Builtin=typeof BUILTINS[number];
export interface FoundRegion{start:number;energy:number;change:number}
export interface FoundAudio{id:string;name:string;sampleRate:number;left:Float32Array;right:Float32Array;regions:FoundRegion[];peaks:number[];cuts?:CutEvent[]}
export const foundRef=(sample?:string)=>sample??'builtin:room';
export const validFoundRef=(v:unknown):v is string=>typeof v==='string'&&(BUILTINS.some(kind=>v==='builtin:'+kind)||/^local:[a-zA-Z0-9_-]{1,80}$/.test(v));
export function validateFoundAudio(value:unknown):FoundAudio{
  const a=value as FoundAudio,typed=(n:unknown)=>Object.prototype.toString.call(n)==='[object Float32Array]';
  if(!a||!validFoundRef(a.id)||typeof a.name!=='string'||a.name.length>160||a.sampleRate!==FOUND_RATE||!typed(a.left)||!typed(a.right)||a.left.length!==a.right.length||a.left.length<240||a.left.length>FOUND_RATE*FOUND_SECONDS||!Array.isArray(a.regions)||!a.regions.length||a.regions.length>32||!a.regions.every(r=>Number.isInteger(r.start)&&r.start>=0&&r.start<a.left.length&&Number.isFinite(r.energy)&&r.energy>=0&&r.energy<=1&&Number.isFinite(r.change)&&r.change>=0&&r.change<=2)||!Array.isArray(a.peaks)||a.peaks.length!==104||!a.peaks.every(p=>Number.isFinite(p)&&p>=0&&p<=1))throw Error('Invalid FOUND audio.');
  if(a.cuts!==undefined&&(!Array.isArray(a.cuts)||a.cuts.length>63||!a.cuts.every(c=>Number.isInteger(c.start)&&Number.isInteger(c.end)&&c.start>=0&&c.end<=a.left.length&&c.end>c.start&&['attack','texture','tail'].includes(c.kind)&&Number.isFinite(c.weight)&&c.weight>=0&&c.weight<=2)))throw Error('Invalid sample event metadata.');
  return a;
}
/** Run on the main thread/offline, never in the render callback. Quiet anchors stay eligible. */
export function analyzeFound(id:string,name:string,left:Float32Array,right:Float32Array):FoundAudio{
  if(left.length!==right.length||left.length<240||left.length>FOUND_RATE*FOUND_SECONDS)throw Error('Use audio between 0.01 and 60 seconds.');
  const hop=1200,features:FoundRegion[]=[],peaks=Array(104).fill(0);let previous=0;
  for(let start=0;start<left.length;start+=hop){let energy=0,flux=0,last=0,count=0;
    for(let i=start;i<Math.min(left.length,start+hop);i++){let l=left[i],r=right[i];if(!Number.isFinite(l)||!Number.isFinite(r))throw Error('Audio contains invalid samples.');l=left[i]=Math.max(-1,Math.min(1,l));r=right[i]=Math.max(-1,Math.min(1,r));const x=(Math.abs(l)+Math.abs(r))*.5;energy+=(l*l+r*r)*.5;flux+=Math.abs(x-last);last=x;count++;const b=Math.min(103,Math.floor(i/left.length*104));peaks[b]=Math.max(peaks[b],Math.abs(l),Math.abs(r));}
    energy=Math.sqrt(energy/count);features.push({start,energy,change:Math.min(2,Math.abs(energy-previous)*4+flux/count*2)});previous=energy;
  }
  const chosen=new Map<number,FoundRegion>();
  // Half the budget is spread uniformly, including low-energy passages and tails.
  for(let i=0;i<16;i++){const j=Math.round(i*(features.length-1)/15);chosen.set(j,features[j]);}
  const ranked=features.map((r,i)=>({i,score:r.change+(i>0&&i<features.length-1&&r.energy<features[i-1].energy&&r.energy<features[i+1].energy?.03:0)})).sort((a,b)=>b.score-a.score);
  for(const {i} of ranked){if(chosen.size>=32)break;if([...chosen.keys()].every(j=>Math.abs(i-j)>1))chosen.set(i,features[i]);}
  return validateFoundAudio({id,name,sampleRate:FOUND_RATE,left,right,regions:[...chosen.values()].sort((a,b)=>a.start-b.start),peaks,cuts:analyzeCuts(left,right,FOUND_RATE)});
}
export function builtinFound(kind:Builtin):FoundAudio{
  const n=FOUND_RATE*12,left=new Float32Array(n),right=new Float32Array(n);let seed=901+BUILTINS.indexOf(kind),low=0,lowR=0,drop=0;
  for(let i=0;i<n;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296*2-1,t=i/FOUND_RATE;low+=(noise-low)*.006;lowR+=(noise-lowR)*.009;
    if(kind==='room'){const breath=.7+.3*Math.sin(t*.73);left[i]=low*.12+Math.sin(t*2*Math.PI*57)*.012*breath+Math.sin(t*2*Math.PI*113)*.003;right[i]=lowR*.11+Math.sin(t*2*Math.PI*57+.12)*.012*breath;}
    else if(kind==='rain'){if(seed%1031<2)drop=.03+(seed%11)*.004;drop*=.993;const shade=.4+.6*Math.sin(t*.63)**2;left[i]=noise*.018*shade+drop*Math.sin(t*2*Math.PI*(1700+seed%7*39));right[i]=noise*.014*shade+drop*Math.sin(t*2*Math.PI*1931);}
    else if(kind==='machine'){const cycle=t%2.7,env=Math.exp(-cycle*18),motor=.014*(.5+.5*Math.sin(t*.31));left[i]=Math.sin(t*2*Math.PI*93)*motor+env*.09*(Math.sin(t*2*Math.PI*431)+noise*.2);right[i]=Math.sin(t*2*Math.PI*94)*motor+env*.07*Math.sin(t*2*Math.PI*739);}
    // WIRE: a dry electrical filament, recurring contact sparks and a wandering carrier.
    else if(kind==='wire'){
      const phase=t%1.37,env=Math.exp(-phase*23),wander=138+9*Math.sin(t*.37)+2*Math.sin(t*1.31);
      const line=Math.sin(2*Math.PI*t*wander),spark=env*(Math.sin(2*Math.PI*t*1987)+noise*.7);
      const gate=.48+.52*Math.sin(2*Math.PI*t*.19)**2;
      left[i]=line*.026*gate+spark*.095+low*.035;
      right[i]=Math.sin(2*Math.PI*t*(wander+1.3))*.024*gate+env*(Math.sin(2*Math.PI*t*2401)*.08+noise*.034)+lowR*.028;
    }
    // GLASS: sparse detuned resonances with two different decay envelopes per side.
    else if(kind==='glass'){
      const phase=t%1.83,env=Math.exp(-phase*4.7),second=Math.exp(-((t+.79)%2.71)*6);
      const bell=Math.sin(2*Math.PI*t*623)*.064+Math.sin(2*Math.PI*t*1017)*.042+Math.sin(2*Math.PI*t*1564)*.027;
      const trem=Math.sin(2*Math.PI*t*619)*.055+Math.sin(2*Math.PI*t*1249)*.036+Math.sin(2*Math.PI*t*2079)*.02;
      left[i]=bell*env+second*.035*Math.sin(2*Math.PI*t*2961)+noise*env*.006;
      right[i]=trem*env+second*.03*Math.sin(2*Math.PI*t*3017)+noise*env*.004;
    }
    // TAPE: a low, phase-worn harmonic loop with flutter, holes and narrowband hiss.
    else {
      const drift=t+.008*Math.sin(2*Math.PI*t*1.79)+.003*Math.sin(2*Math.PI*t*.31);
      const hole=.55+.45*Math.sin(t*.63)**8,flutter=2*Math.PI*drift;
      const base=Math.sin(flutter*108)*.075+Math.sin(flutter*163)*.041+Math.sin(flutter*219)*.019;
      const other=Math.sin(flutter*107.8)*.07+Math.sin(flutter*162.7)*.039+Math.sin(flutter*247)*.015;
      left[i]=base*hole+low*.11+noise*.004;
      right[i]=other*hole+lowR*.1+noise*.003;
    }
    const fade=Math.min(1,i/(FOUND_RATE*.04),(n-1-i)/(FOUND_RATE*.04));left[i]*=fade;right[i]*=fade;
  }
  return analyzeFound('builtin:'+kind,kind.toUpperCase()+' · synthetic',left,right);
}

export const isSampleType=(type:string)=>type==='FOUND'||type==='CUTS';
