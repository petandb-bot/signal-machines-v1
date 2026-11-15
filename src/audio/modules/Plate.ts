import {DSPModule} from '../DSPModule';
import {finiteAudio,finiteUnit,machineControl} from './MachineSafety';

const DELAYS=[.0233,.0297,.0371,.0437,.0533,.0611,.0719,.0839];
const DIFFUSERS=[.0047,.0069,.0097,.0131];
const LOOP_DIFFUSERS=[.0031,.0043,.0053,.0067,.0079,.0091,.0113,.0127];
const INV_SQRT8=1/Math.sqrt(8),LOG1000=Math.log(1000);

/** Independent dense tank: normalized lattice diffusion and eight-path scattering. */
export class Plate extends DSPModule {
  private readonly inputBuffers=Array.from({length:8},(_,i)=>new Float32Array(Math.max(2,Math.round(this.sampleRate*(DIFFUSERS[i%4]+(i>=4?.0006+(i%4)*.0002:0))))));
  private readonly delays=DELAYS.map(t=>new Float32Array(Math.max(2,Math.round(this.sampleRate*t))));
  private readonly diffusers=LOOP_DIFFUSERS.map(t=>new Float32Array(Math.max(2,Math.round(this.sampleRate*t))));
  private readonly inputHeads=new Uint32Array(8);private readonly heads=new Uint32Array(8);private readonly diffusionHeads=new Uint32Array(8);
  private readonly taps=new Float64Array(8);private readonly low=new Float64Array(8);private readonly high=new Float64Array(8);
  private readonly gains=new Float64Array(8);private readonly lowCuts=new Float64Array(8);private readonly highRetention=new Float64Array(8);private readonly drives=new Float64Array(8);
  private readonly levels=new Float64Array(8);
  private body=finiteUnit(this.parameters[0],.5);private decay=finiteUnit(this.parameters[1],.5);private counter=0;
  private inputG=0;private inputS=1;private loopG=0;private loopS=1;private highCoefficient=0;
  private readonly lowCoefficient=1-Math.exp(-2*Math.PI*180/this.sampleRate);
  private readonly slew=1-Math.exp(-1/(this.sampleRate*.03));private readonly meter=1-Math.exp(-1/(this.sampleRate*.025));
  private readonly inputPole=Math.exp(-2*Math.PI*12/this.sampleRate);
  private previousL=0;private previousR=0;private dcL=0;private dcR=0;

  process(){
    this.body+=(machineControl(this,0,1,.5)-this.body)*this.slew;
    this.decay+=(machineControl(this,1,2,.5)-this.decay)*this.slew;
    if(this.counter++%16===0)this.coefficients();
    const dryL=finiteAudio(this.inputL[0]),dryR=finiteAudio(this.inputR[0]);
    this.dcL=dryL-this.previousL+this.inputPole*this.dcL;this.dcR=dryR-this.previousR+this.inputPole*this.dcR;this.previousL=dryL;this.previousR=dryR;
    let left=this.dcL,right=this.dcR;
    for(let c=0;c<2;c++){
      let x=c?right:left;
      for(let k=0;k<4;k++){
        const i=c*4+k,buffer=this.inputBuffers[i],head=this.inputHeads[i],v=buffer[head];
        const y=this.inputG*x+this.inputS*v,next=this.inputS*x-this.inputG*v;
        buffer[head]=Math.abs(next)<1e-25?0:next;this.inputHeads[i]=head+1===buffer.length?0:head+1;x=y;
      }
      if(c)right=x;else left=x;
    }
    let sum=0,wetL=0,wetR=0,energy=0;
    for(let i=0;i<8;i++){
      const buffer=this.diffusers[i],head=this.diffusionHeads[i],v=buffer[head],tap=this.delays[i][this.heads[i]];
      const scattered=this.loopG*tap+this.loopS*v,next=this.loopS*tap-this.loopG*v;
      buffer[head]=Math.abs(next)<1e-25?0:next;this.diffusionHeads[i]=head+1===buffer.length?0:head+1;
      // Low shelf then high shelf; both have magnitude <= 1 at fixed controls.
      this.low[i]+=(scattered-this.low[i])*this.lowCoefficient;
      const shaped=scattered-this.lowCuts[i]*this.low[i];this.high[i]+=(shaped-this.high[i])*this.highCoefficient;
      const filtered=(this.highRetention[i]*shaped+(1-this.highRetention[i])*this.high[i])*this.gains[i];
      this.taps[i]=filtered;sum+=filtered;
      wetL+=scattered*(i&1?-INV_SQRT8:INV_SQRT8);wetR+=scattered*(i&2?-INV_SQRT8:INV_SQRT8);
      this.levels[i]+=(scattered*scattered-this.levels[i])*this.meter;energy+=this.levels[i];
    }
    for(let i=0;i<8;i++){
      const injection=(left*(i&1?-INV_SQRT8:INV_SQRT8)+right*(i&2?-INV_SQRT8:INV_SQRT8))*this.drives[i];
      const next=this.taps[i]-sum*.25+injection,buffer=this.delays[i],head=this.heads[i];
      buffer[head]=Math.abs(next)<1e-25?0:next;this.heads[i]=head+1===buffer.length?0:head+1;
    }
    this.outputL[0]=dryL*.72+wetL*.85;this.outputR[0]=dryR*.72+wetR*.85;
    const level=Math.sqrt(energy*.125);
    this.envelope+=(Math.min(1,level*6)-this.envelope)*this.meter;
    if(this.envelope<1e-14)this.envelope=0;
    this.outputL[1]=this.outputR[1]=this.envelope;this.a=this.body;this.b=this.decay;this.phase=Math.min(1,level*12);
  }
  private coefficients(){
    const seconds=.25+this.decay*this.decay*9.75;
    this.inputG=.18+this.body*.52;this.inputS=Math.sqrt(1-this.inputG*this.inputG);
    this.loopG=.12+this.body*.5;this.loopS=Math.sqrt(1-this.loopG*this.loopG);
    this.highCoefficient=1-Math.exp(-2*Math.PI*(7000-this.body*4800)/this.sampleRate);
    for(let i=0;i<8;i++){
      const time=(this.delays[i].length+this.diffusers[i].length)/this.sampleRate;
      const g=Math.exp(-LOG1000*time/seconds);this.gains[i]=g;this.drives[i]=.65*Math.sqrt(1-g*g);
      this.lowCuts[i]=1-Math.exp(-LOG1000*time*(1/(seconds*(.72-.22*this.body))-1/seconds));
      this.highRetention[i]=Math.exp(-LOG1000*time*(1/(seconds*(.68-.38*this.body))-1/seconds));
    }
  }
  override telemetry(){return{...super.telemetry(),bands:Array.from(this.levels,energy=>Math.sqrt(Math.max(0,energy)))};}
}
