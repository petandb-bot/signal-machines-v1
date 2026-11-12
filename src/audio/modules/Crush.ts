import {clamp} from '../DSPModule';
import {Effect} from './Effect';
export const crushBits=(value:number)=>2+Math.round(value*22);
export const crushRate=(value:number,rate:number)=>20*Math.pow(rate/20,value);
export class Crush extends Effect {
  private clock=1;private heldL=0;private heldR=0;private counter=0;private step=1;private quantizer=128;private bits=8;
  private quantize(x:number){return this.bits===24?x:clamp(Math.round(clamp(x)*this.quantizer),-this.quantizer,this.quantizer-1)/this.quantizer;}
  process(){
    if(this.counter++%16===0){this.bits=crushBits(this.control(0,1));this.quantizer=Math.pow(2,this.bits-1);this.step=crushRate(this.control(1,2),this.sampleRate)/this.sampleRate;}
    if(this.clock>=1-1e-10){this.clock=Math.max(0,this.clock-1);this.heldL=this.quantize(this.inputL[0]);this.heldR=this.quantize(this.inputR[0]);}
    this.clock+=this.step;this.finish(this.heldL,this.heldR);this.a=this.bits/24;this.b=this.step;this.phase=this.clock%1;
  }
}
