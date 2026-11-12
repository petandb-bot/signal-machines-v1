const SIZE=4096;
const TABLE=Float64Array.from({length:SIZE+1},(_,i)=>Math.sin(i*Math.PI*2/SIZE));
/** Input phase is always in [0, 1); interpolation avoids per-partial trigonometry. */
export function sineAt(phase:number){const p=phase*SIZE,index=Math.floor(p),f=p-index;return TABLE[index]*(1-f)+TABLE[index+1]*f;}
