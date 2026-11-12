import {DSPModule,clamp} from '../DSPModule';
import {tunedHz} from '../ToneMath';
import {sineAt} from '../SineTable';
/** Fixed log-spaced analysis bands drive a new harmonic oscillator bank. No sample replay. */
export class Prism extends DSPModule {
  private readonly g=new Float64Array(16);private readonly a1=new Float64Array(16);private readonly ic1=new Float64Array(32);private readonly ic2=new Float64Array(32);
  private readonly levels=new Float64Array(16);private readonly held=new Float64Array(16);private readonly amplitudes=new Float64Array(16);private readonly phases=new Float64Array(16);
  private readonly steps=new Float64Array(16);private readonly bandLimit=new Float64Array(16);private counter=0;private hasHeld=false;private wasHold=false;private trigger=false;private pitch=0;
  private release=.999;private readonly attack=1-Math.exp(-1/(this.sampleRate*.008));private readonly pitchSlew=1-Math.exp(-1/(this.sampleRate*.02));
  constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);for(let i=0;i<16;i++){const frequency=Math.min(this.sampleRate*.4,90*Math.pow(2,i*6.5/15));this.g[i]=Math.tan(Math.PI*frequency/this.sampleRate);this.a1[i]=1/(1+this.g[i]*(this.g[i]+.22));this.phases[i]=this.random.next();}}
  process(sample:number){
    const tune=this.parameters[0],memory=this.control(1,3),hold=this.selectedMode==='HOLD',capture=this.inputL[2]>.5;this.pitch+=(clamp(this.inputL[1])-this.pitch)*this.pitchSlew;
    if(hold&&!this.wasHold)this.hasHeld=false;this.wasHold=hold;
    if(this.counter%16===0){this.release=1-Math.exp(-1/(this.sampleRate*(.035+memory*memory*6)));const base=Math.min(this.sampleRate*.43,tunedHz(tune,this.pitch,this.wide));for(let i=0;i<16;i++){const frequency=base*(i+1);this.steps[i]=Math.min(this.sampleRate*.47,frequency)/this.sampleRate;this.bandLimit[i]=clamp((this.sampleRate*.47-frequency)/(this.sampleRate*.04),0,1);}}
    let inputEnergy=0;
    for(let i=0;i<16;i++){
      let magnitude=0;const g=this.g[i],a1=this.a1[i];
      for(let c=0;c<2;c++){const index=c*16+i,input=Math.tanh(c===0?this.inputL[0]:this.inputR[0]),v3=input-this.ic2[index],band=a1*this.ic1[index]+g*a1*v3,low=this.ic2[index]+g*band;this.ic1[index]=clamp(2*band-this.ic1[index],-8,8);this.ic2[index]=clamp(2*low-this.ic2[index],-8,8);magnitude+=Math.abs(band)*.11;}
      this.levels[i]+=(magnitude-this.levels[i])*(magnitude>this.levels[i]?this.attack:this.release);inputEnergy+=this.levels[i];
    }
    // HOLD starts with one learned spectrum; CAPTURE refreshes it after the bank has listened.
    if(hold&&((!this.hasHeld&&this.counter>=this.sampleRate*.08&&inputEnergy>1e-5)||(capture&&!this.trigger&&this.counter>=this.sampleRate*.08))){this.held.set(this.levels);this.hasHeld=true;this.triggerSample=sample;}
    this.trigger=capture;let left=0,right=0;
    for(let i=0;i<16;i++){const level=hold?(this.hasHeld?this.held[i]:0):this.levels[i],target=Math.sqrt(Math.max(0,level))*.085*this.bandLimit[i];this.amplitudes[i]+=(target-this.amplitudes[i])*this.attack;this.phases[i]=(this.phases[i]+this.steps[i])%1;const signal=sineAt(this.phases[i])*this.amplitudes[i],pan=(i%4-1.5)*.12;left+=signal*(1-pan);right+=signal*(1+pan);}
    this.outputL[0]=.65*Math.tanh(left/.65);this.outputR[0]=.65*Math.tanh(right/.65);this.counter++;
    this.phase=this.phases[0];this.a=tune;this.b=hold&&this.hasHeld?1:0;this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
  override telemetry(){return{...super.telemetry(),bands:Array.from(this.amplitudes)};}
}
