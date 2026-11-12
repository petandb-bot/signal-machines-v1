import {DSPModule,clamp} from '../DSPModule';
import {recoverySeconds} from '../ControlMath';
export class Duck extends DSPModule {
  private detector=0;private impulse=0;private gain=1;private gate=false;private counter=0;private release=.999;private readonly attack=Math.exp(-1/(this.sampleRate*.003));
  process(sample:number){
    const depth=this.control(0,3);if(this.counter++%16===0)this.release=Math.exp(-1/(this.sampleRate*recoverySeconds(this.parameters[1])));
    const key=this.inputConnected[1]?Math.max(Math.abs(this.inputL[1]),Math.abs(this.inputR[1])):this.inputConnected[2]?0:Math.max(Math.abs(this.inputL[0]),Math.abs(this.inputR[0]));
    this.detector=key+(this.detector-key)*(key>this.detector?this.attack:this.release);
    const trigger=this.inputL[2]>.5;if(trigger&&!this.gate){this.impulse=1;this.triggerSample=sample;}this.gate=trigger;
    const pressure=Math.max(clamp(this.detector*8,0,1),this.impulse),target=1/(1+depth*pressure*24);this.gain=target+(this.gain-target)*(target<this.gain?this.attack:this.release);this.impulse*=this.release;
    this.outputL[0]=this.inputL[0]*this.gain;this.outputR[0]=this.inputR[0]*this.gain;this.outputL[1]=this.outputR[1]=this.gain;
    this.a=this.gain;this.b=pressure;this.phase=pressure;this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;
  }
}
