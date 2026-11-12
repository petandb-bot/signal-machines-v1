import {DSPModule} from '../DSPModule';
export class Shape extends DSPModule {
  private gate=false;private stage=0;private value=0;private counter=0;private rise=.01;private fall=.999;
  process(sample:number){
    const attack=this.control(0,1),decay=this.control(1,2);
    if(this.counter++%16===0){this.rise=1/(this.sampleRate*.002*Math.pow(1500,attack));this.fall=Math.exp(-6.9/(this.sampleRate*.012*Math.pow(1500,decay)));}
    const trigger=this.inputL[0]>.5;if(trigger&&!this.gate){this.stage=1;this.triggerSample=sample;}this.gate=trigger;
    if(this.stage===1){this.value=Math.min(1,this.value+this.rise);if(this.value>=1)this.stage=2;}
    else if(this.stage===2){this.value*=this.fall;if(this.value<.00001){this.value=0;this.stage=0;}}
    this.outputL[0]=this.outputR[0]=this.value;this.outputL[1]=this.outputR[1]=1-this.value;
    this.a=this.value;this.b=this.stage;this.envelope=this.value;this.phase=this.value;
  }
}
