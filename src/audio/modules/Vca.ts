import {DSPModule,clamp} from '../DSPModule';
export class Vca extends DSPModule {
  private gain=0;private readonly edge=1-Math.exp(-1/(this.sampleRate*.003));
  process(){
    const level=this.parameters[0]*(this.inputConnected[2]?clamp(this.inputL[2],0,1):1),blend=this.control(1,3);
    this.gain+=(level-this.gain)*this.edge;
    this.outputL[0]=(this.inputL[0]*Math.sqrt(1-blend)+this.inputL[1]*Math.sqrt(blend))*this.gain;
    this.outputR[0]=(this.inputR[0]*Math.sqrt(1-blend)+this.inputR[1]*Math.sqrt(blend))*this.gain;
    this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;
    this.a=this.gain;this.b=blend;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
