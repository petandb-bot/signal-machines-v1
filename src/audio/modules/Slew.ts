import {DSPModule,clamp} from '../DSPModule';
import {slewSeconds} from '../ControlMath';
export class Slew extends DSPModule {
  private value=0;private gate=false;private counter=0;private rise=0;private fall=0;private risePole=0;private fallPole=0;
  process(sample:number){
    if(this.counter++%16===0){this.rise=slewSeconds(this.control(0,1));this.fall=slewSeconds(this.control(1,2));this.risePole=this.rise?Math.exp(-1/(this.sampleRate*this.rise)):0;this.fallPole=this.fall?Math.exp(-1/(this.sampleRate*this.fall)):0;}
    const target=clamp(this.inputL[0]),reset=this.inputL[3]>.5;
    if(reset&&!this.gate){this.value=target;this.triggerSample=sample;}else{const up=target>this.value,time=up?this.rise:this.fall;if(!time)this.value=target;else if(this.selectedMode==='GLIDE'){const step=2/(this.sampleRate*time);this.value+=clamp(target-this.value,-step,step);}else this.value=target+(this.value-target)*(up?this.risePole:this.fallPole);}
    this.gate=reset;this.outputL[0]=this.outputR[0]=this.value;this.outputL[1]=this.outputR[1]=clamp(target-this.value);this.a=this.value;this.b=target;this.phase=(this.value+1)*.5;this.envelope=Math.min(1,Math.abs(target-this.value)*3);
  }
}
