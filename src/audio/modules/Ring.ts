import {DSPModule,TAU} from '../DSPModule';
export class Ring extends DSPModule {
  process(){
    const rate=this.control(0,2),mix=this.control(1,3),frequency=Math.min(this.sampleRate*.18,.5*Math.pow(10000,rate));
    this.phase=(this.phase+frequency/this.sampleRate)%1;const carrier=Math.sin(TAU*this.phase),external=this.inputConnected[1];
    this.outputL[0]=this.inputL[0]*(1-mix)+this.inputL[0]*(external?this.inputL[1]*4:carrier)*mix;
    this.outputR[0]=this.inputR[0]*(1-mix)+this.inputR[0]*(external?this.inputR[1]*4:carrier)*mix;
    this.a=rate;this.b=mix;this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
