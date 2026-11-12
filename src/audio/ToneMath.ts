import {clamp} from './DSPModule';
export const pitchHz=(base:number,pitch:number,wide=false)=>base*Math.pow(2,(wide?8:2)*clamp(pitch));
export const tunedHz=(tune:number,pitch=0,wide=false)=>wide?pitchHz(.05*Math.pow(480000,tune),pitch,true):55*Math.pow(2,4*tune+2*clamp(pitch));
export const shiftedHz=(value:number)=>{const n=value*2-1;return Math.sign(n)*n*n*500;};
export function polyBlep(t:number,step:number){
  if(t<step){const x=t/step;return x+x-x*x-1;}
  if(t>1-step){const x=(t-1)/step;return x*x+x+x+1;}
  return 0;
}
