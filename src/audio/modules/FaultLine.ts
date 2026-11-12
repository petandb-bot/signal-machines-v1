import {DSPModule,clamp} from '../DSPModule';
/** Stress from energy/onsets opens a short displaced/reversed read path, then heals. */
export class FaultLine extends DSPModule {
  private readonly left=new Float32Array(Math.ceil(this.sampleRate*.6));private readonly right=new Float32Array(this.left.length);private write=0;private filled=0;private stress=0;private previous=0;private remaining=0;private duration=1;private read=0;private speed=1;private wet=0;private gate=false;
  process(sample:number){
    const pressure=this.control(0,1),heal=this.control(1,2),l=this.inputL[0],r=this.inputR[0],energy=(Math.abs(l)+Math.abs(r))*.5,change=Math.abs(energy-this.previous);this.previous=energy;
    this.left[this.write]=l;this.right[this.write]=r;this.filled=Math.min(this.left.length,this.filled+1);
    const healing=.12+(1-heal)**2*5;this.stress=clamp(this.stress+(energy*pressure*pressure*13+change*pressure*10-this.stress/healing)/this.sampleRate,0,1);
    const strike=this.inputL[3]>.5;let event=false;
    if(this.remaining<=0&&pressure>.001&&this.filled>16&&(this.stress>.55||(strike&&!this.gate))){
      event=true;this.duration=Math.max(16,Math.round(this.sampleRate*(.018+pressure*.22)*(1-heal*.6)));this.remaining=this.duration;this.stress*=.35;
      const lookback=Math.min(this.filled-2,Math.round(this.sampleRate*(.008+this.random.next()*.24)));this.read=(this.write-lookback+this.left.length)%this.left.length;this.speed=this.random.next()<.5?-.5-this.random.next():.4+this.random.next()*1.5;
    }
    this.gate=strike;const active=this.remaining>0&&pressure>.001;this.wet+=((active?1:0)-this.wet)*Math.min(1,1/(this.sampleRate*(active?.002:.012)));
    const index=Math.floor(this.read),next=(index+1)%this.left.length,f=this.read-index,fragmentL=this.left[index]*(1-f)+this.left[next]*f,fragmentR=this.right[index]*(1-f)+this.right[next]*f;
    const window=active?Math.min(1,(this.duration-this.remaining)/Math.max(1,this.sampleRate*.002),this.remaining/Math.max(1,this.sampleRate*.006)):1,drive=1+pressure*10;
    const crackL=Math.round(Math.tanh(fragmentL*drive)*64)/64*.35,crackR=Math.round(Math.tanh(fragmentR*drive)*64)/64*.35,mix=pressure>.001?this.wet*window:0;
    this.outputL[0]=l*(1-mix)+crackL*mix;this.outputR[0]=r*(1-mix)+crackR*mix;this.outputL[1]=this.outputR[1]=this.stress;this.outputL[2]=this.outputR[2]=event?1:0;
    if(active){this.read=(this.read+this.speed+this.left.length)%this.left.length;this.remaining--;}else this.remaining=0;
    this.write=(this.write+1)%this.left.length;this.a=this.stress;this.b=this.wet;this.phase=this.remaining/this.duration;this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;if(event)this.triggerSample=sample;
  }
}
