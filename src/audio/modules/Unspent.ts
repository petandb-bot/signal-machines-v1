import {DSPModule} from '../DSPModule';
export class Unspent extends DSPModule {
  private readonly fade=Math.exp(-1/(this.sampleRate*.1));
  private count=0;private gate=false;private reset=false;private releasePhase=0;
  process(sample:number){
    const hold=this.control(0,1),release=this.control(1,2),gate=this.inputL[0]>.5,reset=this.inputL[3]>.5;let event=false;
    if(reset&&!this.reset){this.count=0;this.releasePhase=0;}
    if(gate&&!this.gate){if(this.random.next()<hold&&this.count<64)this.count++;else event=true;}
    if(this.count&&release>.001){const interval=.04*Math.pow(200,1-release)/(1+Math.sqrt(this.count)*.2);this.releasePhase+=1/(this.sampleRate*interval);if(this.releasePhase>=1&&!event){this.releasePhase%=1;this.count--;event=true;}}
    else if(!this.count)this.releasePhase=0;
    this.gate=gate;this.reset=reset;this.outputL[0]=this.outputR[0]=event?1:0;this.outputL[1]=this.outputR[1]=this.count/64;
    if(event){this.envelope=1;this.triggerSample=sample;}else this.envelope*=this.fade;this.a=this.count/64;this.b=hold;this.phase=this.releasePhase%1;
  }
}
