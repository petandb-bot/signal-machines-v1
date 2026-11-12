import {DSPModule,TAU} from '../DSPModule';
export class Tape extends DSPModule {
  private readonly left=new Float32Array(Math.ceil(this.sampleRate*2));
  private readonly right=new Float32Array(this.left.length);
  private write=0;private flutter=0;private drift=0;private driftTarget=0;private untilDrift=0;private delay=0;
  private lowL=0;private lowR=0;private dcL=0;private dcR=0;private oldL=0;private oldR=0;
  private read(buffer:Float32Array,delay:number){let p=this.write-delay;if(p<0)p+=buffer.length;p%=buffer.length;const i=Math.floor(p),fraction=p-i;return buffer[i]*(1-fraction)+buffer[(i+1)%buffer.length]*fraction;}
  process(){
    const wear=this.control(0,1),echo=this.control(1,2);
    if(--this.untilDrift<=0){this.driftTarget=this.random.next()*2-1;this.untilDrift=this.sampleRate*(.4+this.random.next()*1.7);}
    this.drift+=(this.driftTarget-this.drift)/(this.sampleRate*.09);
    this.phase=(this.phase+.31/this.sampleRate)%1;this.flutter=(this.flutter+(5.3+wear*1.7)/this.sampleRate)%1;
    const wobble=(Math.sin(TAU*this.phase)*.002+Math.sin(TAU*this.flutter)*.00022+this.drift*.0013)*wear*wear*this.sampleRate;
    const target=this.sampleRate*(.045+echo*echo*.78);if(!this.delay)this.delay=target;this.delay+=(target-this.delay)*.00004;
    const headL=this.read(this.left,this.delay+wobble),headR=this.read(this.right,this.delay*1.17-wobble*.83);
    const pathL=this.read(this.left,this.sampleRate*.012+wobble),pathR=this.read(this.right,this.sampleRate*.013-wobble*.7);
    const feedback=.08+echo*.72,drive=1+wear*3;
    const l=Math.tanh((this.inputL[0]+headR*feedback)*drive)/drive,r=Math.tanh((this.inputR[0]+headL*feedback)*drive)/drive;
    const coefficient=.64-wear*.54;this.lowL+=(l-this.lowL)*coefficient;this.lowR+=(r-this.lowR)*coefficient;
    this.dcL=this.lowL-this.oldL+.998*this.dcL;this.oldL=this.lowL;this.dcR=this.lowR-this.oldR+.998*this.dcR;this.oldR=this.lowR;
    this.left[this.write]=Number.isFinite(this.dcL)?this.dcL:0;this.right[this.write]=Number.isFinite(this.dcR)?this.dcR:0;this.write=(this.write+1)%this.left.length;
    this.outputL[0]=pathL*(1-echo*.32)+headL*echo*.62;this.outputR[0]=pathR*(1-echo*.32)+headR*echo*.62;
    this.envelope+=((Math.abs(headL)+Math.abs(headR))*2-this.envelope)*.001;
    this.a=wear;this.b=echo;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
