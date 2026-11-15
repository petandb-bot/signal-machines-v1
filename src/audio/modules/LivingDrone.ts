import {DSPModule,clamp} from '../DSPModule';import {sineAt} from '../SineTable';import {LivingField,unit,bipolar} from './LivingField';
const ratios=[1,1.002,1.5,2,2.5,3];
export class LivingDrone extends DSPModule{
 private readonly phases=new Float64Array(6);private readonly field=new LivingField(6,this.random);private tick=0;private pitch=0;private attack=0;
 constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);for(let i=0;i<6;i++)this.phases[i]=this.random.next();}
 process(){
  const spread=unit(unit(this.parameters[0],.3)+bipolar(this.inputL[1])*.5),color=unit(unit(this.parameters[1],.4)+bipolar(this.inputL[2])*.5);
  this.pitch+=(bipolar(this.inputL[0])-this.pitch)*(1-Math.exp(-1/(this.sampleRate*.012)));this.attack+=(1-this.attack)/(this.sampleRate*.12);
  if(this.tick++%64===0)this.field.step(64/this.sampleRate);
  const base=this.selectedMode?.includes('220')?220:this.selectedMode?.includes('110')?110:55,fundamental=base*Math.pow(2,this.pitch*(this.wide?8:2));let l=0,r=0;
  for(let i=0;i<6;i++){
   const life=this.field.value[i],neighbor=this.field.value[(i+1)%6],f=Math.min(this.sampleRate*(this.wide?.45:.12),fundamental*(1+(ratios[i]-1)*spread*spread)*(1+(i-2.5)*spread*spread*.0018+life*spread*spread*.00035));
   const p=this.phases[i]=(this.phases[i]+f/this.sampleRate)%1;
   const h2=color*.5*(1+neighbor*.065)*clamp((this.sampleRate*.47-f*2)/(this.sampleRate*.04),0,1),h4=color*color*.24*(1-life*.08)*clamp((this.sampleRate*.47-f*4)/(this.sampleRate*.04),0,1);
   const voice=(sineAt(p)*(1+life*.025)+sineAt((p*2)%1)*h2+sineAt((p*4)%1)*h4)/(1+color*.3);
   this.field.energy[i]+=(voice*voice-this.field.energy[i])/(this.sampleRate*.09);const pan=(i-2.5)*.1;l+=voice*(1-pan)*.034;r+=voice*(1+pan)*.034;
  }
  this.outputL[0]=l*this.attack;this.outputR[0]=r*this.attack;this.envelope+=((Math.abs(l)+Math.abs(r))*2-this.envelope)*.001;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);this.a=spread;this.b=color;this.phase=this.phases[0];
 }
}
