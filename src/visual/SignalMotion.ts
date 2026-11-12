import type {ModuleTelemetry,ModuleType} from '../graph/types';
export const VISUAL_WIDTH=104;
export const VISUAL_HEIGHT=80;
const unit=(n:number)=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
export function signalMotion(type:ModuleType,t?:ModuleTelemetry,lively=true){
  if(!t)return{activity:0,rms:0,dx:0,dy:0,surge:0};
  let energy=0,count=0;
  for(const n of t.wave){if(Number.isFinite(n)){energy+=n*n;count++;}}
  const rms=Math.sqrt(energy/Math.max(1,count));
  let activity=Math.max(unit(t.envelope*1.8),unit(rms*8));
  if(type==='PULSE'||type==='BRANCH'||type==='SHAPE'||type==='CHANCE'||type==='WEFT')activity=unit(t.envelope);
  else if(type==='QUANTIZE'||type==='SLEW')activity=unit(t.envelope);
  else if(type==='UNSPENT')activity=Math.max(unit(t.envelope),unit(t.a));
  else if(type==='SIDEWAYS')activity=Math.max(unit(t.envelope),unit(Math.abs(t.a-t.b)));
  else if(type==='QUORUM')activity=Math.max(unit(t.envelope),unit(t.phase));
  else if(type==='FAULT LINE')activity=Math.max(activity,unit(t.a),unit(t.b));
  else if(type==='DUCK')activity=Math.max(activity,unit(1-t.a));
  else if(type==='TIDE')activity=unit(Math.max(Math.abs(t.a),Math.abs(t.b),Math.abs(t.phase*2-1)));
  else if(type==='BOUNCE')activity=Math.max(unit(t.envelope),unit(Math.hypot(t.velocity?.x??0,t.velocity?.y??0)/3));
  else if(type==='MAP')activity=Math.max(activity,unit(Math.abs(t.b)));
  else if(type==='FLOCK')activity=unit(Math.hypot(t.a,t.b)*.8);
  else if(type==='PARASITE')activity=unit(Math.max(t.a,Math.abs(t.b)));
  else if(type==='SNAP')activity=Math.max(activity,unit(1-t.a));
  else if(type==='OUTPUT')activity=unit(Math.max(t.levelL,t.levelR)*4);
  const scale=Math.max(.025,rms*2);
  const x=t.wave.length?t.wave[7%t.wave.length]/scale:0,y=t.wave.length?t.wave[29%t.wave.length]/scale:0;
  const signed=(n:number)=>Math.max(-1,Math.min(1,Number.isFinite(n)?n:0));
  return{activity,rms,dx:lively?Math.round(signed(x)*activity*2):0,dy:lively?Math.round(signed(y)*activity*2):0,surge:lively?activity:0};
}
export type VisualMode='lively'|'quiet';
const KEY='signal-machines.visuals.v1';
export function readVisualMode():VisualMode{try{return localStorage.getItem(KEY)==='quiet'?'quiet':'lively';}catch{return'lively';}}
export function saveVisualMode(mode:VisualMode){try{localStorage.setItem(KEY,mode);}catch{/* Appearance can remain session-local when storage is blocked. */}}
