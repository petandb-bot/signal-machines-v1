import {analyzeCuts} from './CutsAnalysis';
import type {CutEvent} from './CutsAnalysis';
export const FOUND_RATE=24000,FOUND_SECONDS=60,FOUND_BYTES=32_000_000,MAX_FOUND=2;
export const BUILTINS=['room','rain','machine'] as const;
export type Builtin=typeof BUILTINS[number];
export interface FoundRegion{start:number;energy:number;change:number}
export interface FoundAudio{id:string;name:string;sampleRate:number;left:Float32Array;right:Float32Array;regions:FoundRegion[];peaks:number[];cuts?:CutEvent[]}
export const foundRef=(sample?:string)=>sample??'builtin:room';
export const validFoundRef=(v:unknown):v is string=>typeof v==='string'&&(/^(builtin:(room|rain|machine)|local:[a-zA-Z0-9_-]{1,80})$/).test(v);
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
  const n=FOUND_RATE*12,left=new Float32Array(n),right=new Float32Array(n);let seed=kind==='room'?901:kind==='rain'?902:903,low=0,lowR=0,drop=0;
  for(let i=0;i<n;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296*2-1,t=i/FOUND_RATE;low+=(noise-low)*.006;lowR+=(noise-lowR)*.009;
    if(kind==='room'){const breath=.7+.3*Math.sin(t*.73);left[i]=low*.12+Math.sin(t*2*Math.PI*57)*.012*breath+Math.sin(t*2*Math.PI*113)*.003;right[i]=lowR*.11+Math.sin(t*2*Math.PI*57+.12)*.012*breath;}
    else if(kind==='rain'){if(seed%1031<2)drop=.03+(seed%11)*.004;drop*=.993;const shade=.4+.6*Math.sin(t*.63)**2;left[i]=noise*.018*shade+drop*Math.sin(t*2*Math.PI*(1700+seed%7*39));right[i]=noise*.014*shade+drop*Math.sin(t*2*Math.PI*1931);}
    else{const cycle=t%2.7,env=Math.exp(-cycle*18),motor=.014*(.5+.5*Math.sin(t*.31));left[i]=Math.sin(t*2*Math.PI*93)*motor+env*.09*(Math.sin(t*2*Math.PI*431)+noise*.2);right[i]=Math.sin(t*2*Math.PI*94)*motor+env*.07*Math.sin(t*2*Math.PI*739);}
    const fade=Math.min(1,i/(FOUND_RATE*.04),(n-1-i)/(FOUND_RATE*.04));left[i]*=fade;right[i]*=fade;
  }
  return analyzeFound('builtin:'+kind,kind.toUpperCase()+' · synthetic',left,right);
}

export const isSampleType=(type:string)=>type==='FOUND'||type==='CUTS';
