export const LOOP_SECONDS=16;
export const MAX_LOOPS=4;
export interface LoopStatus {mode:'empty'|'recording'|'playing'|'paused'|'overdub';frames:number;sampleRate:number}
export interface LoopAudio {kind:'loopAudio';sampleRate:number;left:Float32Array;right:Float32Array}
export function validateLoopAudio(value:unknown,sampleRate:number):LoopAudio{
  const v=value as LoopAudio;
  const valid=(a:unknown)=>ArrayBuffer.isView(a)&&Object.prototype.toString.call(a)==='[object Float32Array]';
  if(!v||v.kind!=='loopAudio'||v.sampleRate!==sampleRate||!valid(v.left)||!valid(v.right)||v.left.length!==v.right.length||v.left.length<2||v.left.length>Math.ceil(sampleRate*LOOP_SECONDS))throw new Error('Invalid loop audio. Use stereo/mono audio up to 16 seconds at the engine sample rate.');
  for(let i=0;i<v.left.length;i++)if(!Number.isFinite(v.left[i])||!Number.isFinite(v.right[i])||Math.abs(v.left[i])>1||Math.abs(v.right[i])>1)throw new Error('Loop audio contains invalid samples.');
  return v;
}
