import type {CurveData,CurveLane,PhraseData,HarmonyData,ChordQuality} from './types';
export const CHORD_INTERVALS:Record<ChordQuality,readonly [number,number,number,number]>={
  maj:[0,4,7,12],min:[0,3,7,12],sus2:[0,2,7,12],sus4:[0,5,7,12],
  dim:[0,3,6,9],maj7:[0,4,7,11],dom7:[0,4,7,10],min7:[0,3,7,10],
};
export const CHORD_QUALITIES=Object.keys(CHORD_INTERVALS) as ChordQuality[];
export const ROOT_NAMES=['A','A#','B','C','C#','D','D#','E','F','F#','G','G#'] as const;
export const defaultCurve=():CurveData=>({lanes:[
  {points:[{t:0,v:-.6},{t:.25,v:.35},{t:.5,v:.55},{t:.75,v:-.2},{t:1,v:-.6}]},
  {points:[{t:0,v:.2},{t:.33,v:-.5},{t:.67,v:.7},{t:1,v:.2}]},
]});
export const defaultPhrase=():PhraseData=>({steps:Array.from({length:16},(_,i)=>({
  pitch:[0,3,7,10,7,3,5,2,0,-2,3,7,5,3,2,-2][i],
  length:i%4===3?.95:.73,velocity:i%4===0?.95:.72,rest:i===6||i===14,
}))});
export const defaultHarmony=():HarmonyData=>({chords:[
  {root:0,quality:'min'},{root:-4,quality:'maj'},{root:3,quality:'maj7'},{root:-2,quality:'dom7'},
  {root:0,quality:'min7'},{root:5,quality:'min'},{root:3,quality:'maj7'},{root:-2,quality:'sus4'},
]});
const bounded=(n:unknown,a:number,b:number):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
export function parseCurve(value:unknown):CurveData{
  const lanes=(value as CurveData|undefined)?.lanes;
  if(!Array.isArray(lanes)||lanes.length!==2)throw Error('CURVE needs two lanes.');
  const result=lanes.map((lane:CurveLane)=>{
    if(!lane||!Array.isArray(lane.points)||lane.points.length<2||lane.points.length>64)throw Error('Invalid CURVE point count.');
    let previous=-1;
    const points=lane.points.map(p=>{
      if(!p||!bounded(p.t,0,1)||!bounded(p.v,-1,1)||p.t<=previous)throw Error('Invalid CURVE point.');
      previous=p.t;return{t:p.t,v:p.v};
    });
    if(points[0].t!==0||points.at(-1)!.t!==1)throw Error('CURVE endpoints must be 0 and 1.');
    return{points};
  });
  return{lanes:result as [CurveLane,CurveLane]};
}
export function parsePhrase(value:unknown):PhraseData{
  const steps=(value as PhraseData|undefined)?.steps;
  if(!Array.isArray(steps)||steps.length!==16)throw Error('PHRASE must contain 16 steps.');
  return{steps:steps.map(s=>{
    if(!s||!Number.isInteger(s.pitch)||!bounded(s.pitch,-24,24)||!bounded(s.length,.05,1)||!bounded(s.velocity,0,1)||typeof s.rest!=='boolean')throw Error('Invalid PHRASE step.');
    return{pitch:s.pitch,length:s.length,velocity:s.velocity,rest:s.rest};
  })};
}
export function parseHarmony(value:unknown):HarmonyData{
  const chords=(value as HarmonyData|undefined)?.chords;
  if(!Array.isArray(chords)||chords.length!==8)throw Error('HARMONY must contain eight chords.');
  return{chords:chords.map(c=>{
    if(!c||!Number.isInteger(c.root)||!bounded(c.root,-12,12)||!Object.hasOwn(CHORD_INTERVALS,c.quality))throw Error('Invalid HARMONY chord.');
    return{root:c.root,quality:c.quality};
  })};
}