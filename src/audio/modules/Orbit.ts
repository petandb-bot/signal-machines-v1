import {DSPModule,clamp,TAU} from '../DSPModule';
/** Orthogonal stereo rotation: equal-power motion for dual mono, no stereo fold-down. */
export class Orbit extends DSPModule {
  private position=0;private readonly slew=1-Math.exp(-1/(this.sampleRate*.015));
  process(){
    this.phase=(this.phase+.01*Math.pow(400,this.parameters[0])/this.sampleRate)%1;
    const target=(this.inputConnected[1]?clamp(this.inputL[1]):Math.sin(this.phase*TAU))*this.parameters[1];this.position+=(target-this.position)*this.slew;
    const angle=this.position*Math.PI/4,c=Math.cos(angle),s=Math.sin(angle),l=this.inputL[0],r=this.inputR[0];this.outputL[0]=l*c-r*s;this.outputR[0]=l*s+r*c;this.outputL[1]=this.outputR[1]=this.position;
    this.envelope+=((Math.abs(l)+Math.abs(r))*2-this.envelope)*.002;this.a=this.position;this.b=this.inputConnected[1]?1:0;
  }
}
