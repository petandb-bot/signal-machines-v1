import {DSPModule,clamp} from '../DSPModule';
export class Switch extends DSPModule {
  private gate=false;private selected=0;private mix=0;
  process(sample:number){
    const trigger=this.inputL[2]>.5;
    if(trigger&&!this.gate){this.selected=this.random.next()<this.parameters[0]?1:0;this.triggerSample=sample;}
    this.gate=trigger;
    const target=this.inputConnected[3]?(this.inputL[3]>.5?1:0):this.selected;
    const step=1/(this.sampleRate*.001*Math.pow(3000,this.parameters[1]));
    this.mix+=clamp(target-this.mix,-step,step);
    this.outputL[0]=this.inputL[0]*Math.sqrt(1-this.mix)+this.inputL[1]*Math.sqrt(this.mix);
    this.outputR[0]=this.inputR[0]*Math.sqrt(1-this.mix)+this.inputR[1]*Math.sqrt(this.mix);
    this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;
    this.a=this.mix;this.b=target;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
