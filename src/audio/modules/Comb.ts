import {DSPModule,clamp} from '../DSPModule';
import {tunedHz} from '../ToneMath';
export class Comb extends DSPModule {
  private readonly left=new Float32Array(Math.ceil(this.sampleRate/13.75)+8);private readonly right=new Float32Array(this.left.length);
  private write=0;private delay=this.sampleRate/220-.5;private previousL=0;private previousR=0;private gate=false;private burst=0;private readonly burstRelease=Math.exp(-1/(this.sampleRate*.003));
  process(sample:number){
    const tune=this.parameters[0],decay=this.control(1,2),frequency=Math.min(this.sampleRate*.18,tunedHz(tune,this.inputL[1]));
    this.delay+=(clamp(this.sampleRate/frequency-.5,2,this.left.length-2)-this.delay)*.0015;
    const trigger=this.inputL[3]>.5;if(trigger&&!this.gate){this.burst=1;this.triggerSample=sample;}this.gate=trigger;
    let read=(this.write-this.delay+this.left.length)%this.left.length;if(read<0)read+=this.left.length;read%=this.left.length;
    const index=Math.floor(read),next=(index+1)%this.left.length,f=read-index,l=this.left[index]*(1-f)+this.left[next]*f,r=this.right[index]*(1-f)+this.right[next]*f;
    const feedback=Math.min(.996,Math.pow(.001,this.delay/(this.sampleRate*(.08*Math.pow(150,decay))))),noise=(this.random.next()*2-1)*this.burst*.22;this.burst*=this.burstRelease;
    this.left[this.write]=Math.tanh(this.inputL[0]*.35+noise+feedback*(l+this.previousL)*.5);this.right[this.write]=Math.tanh(this.inputR[0]*.35+noise+feedback*(r+this.previousR)*.5);this.previousL=l;this.previousR=r;
    this.write=(this.write+1)%this.left.length;this.outputL[0]=l*.9+this.inputL[0]*.2;this.outputR[0]=r*.9+this.inputR[0]*.2;
    this.phase=read/this.left.length;this.a=tune;this.b=decay;this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
