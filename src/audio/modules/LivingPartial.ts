import {DSPModule,SeededRandom,clamp} from '../DSPModule';import {sineAt} from '../SineTable';import {LivingField,unit,bipolar} from './LivingField';
export class LivingPartial extends DSPModule{
 private readonly phases=new Float64Array(32);private readonly amplitudes=new Float64Array(32);private readonly targetsA=new Float64Array(32);private readonly frequencies=new Float64Array(32);private readonly field=new LivingField(32,this.random);
 private mass=unit(this.parameters[0],.5);private warp=unit(this.parameters[1],.5);private pitch=0;private tick=0;private attack=0;private norm=1;private targetNorm=1;
 private readonly slew=1-Math.exp(-1/(this.sampleRate*.012));
 constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);const phases=new SeededRandom(args[0].seed^args[2]);for(let i=0;i<32;i++)this.phases[i]=phases.next();}
 process(){
  this.mass+=(unit(unit(this.parameters[0],.5)+bipolar(this.inputL[1])*.5)-this.mass)*this.slew;this.warp+=(unit(unit(this.parameters[1],.5)+bipolar(this.inputL[2])*.5)-this.warp)*this.slew;this.pitch+=(bipolar(this.inputL[0])-this.pitch)*this.slew;
  if(this.tick%64===0)this.field.step(64/this.sampleRate);
  if(this.tick++%16===0){
   const base=(this.selectedMode?.includes('110')?110:this.selectedMode?.includes('440')?440:220)*Math.pow(2,this.pitch*(this.wide?8:2));let energy=0;
   for(let i=0;i<32;i++){
    const life=this.field.value[i],ratio=Math.pow(i+1,1+(this.warp-.5)*Math.abs(this.warp-.5)*1.4),frequency=base*ratio*(1+(i?life*.00022:0)),edge=clamp(1+this.mass*31-i,0,1),active=edge*edge*(3-2*edge),nyquist=clamp((this.sampleRate*.47-frequency)/(this.sampleRate*.04),0,1);
    this.targetsA[i]=active*nyquist*(1+life*.085)/Math.pow(i+1,1.6-this.mass*.9);this.frequencies[i]=Math.min(this.sampleRate*.47,frequency)/this.sampleRate;energy+=this.targetsA[i]**2;
   }this.targetNorm=Math.sqrt(Math.max(1,energy));
  }
  let l=0,r=0;this.norm+=(this.targetNorm-this.norm)*this.slew;this.attack+=(1-this.attack)*this.slew;
  for(let i=0;i<32;i++){this.amplitudes[i]+=(this.targetsA[i]-this.amplitudes[i])*this.slew;const p=this.phases[i]=(this.phases[i]+this.frequencies[i])%1,x=sineAt(p)*this.amplitudes[i],pan=(i%5-2)*.085;this.field.energy[i]+=(x*x-this.field.energy[i])/(this.sampleRate*.12);l+=x*(1-pan);r+=x*(1+pan);}
  this.outputL[0]=l*.13*this.attack/this.norm;this.outputR[0]=r*.13*this.attack/this.norm;this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);this.a=this.mass;this.b=this.warp;this.phase=this.phases[0];
 }
 override telemetry(){return {...super.telemetry(),bands:Array.from(this.amplitudes)};}
}
