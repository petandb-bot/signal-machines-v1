import {DSPModule,clamp} from '../DSPModule';
const WOOD=[1,2.03,3.87,5.41,7.93,10.37],METAL=[1,2.756,5.404,8.933,13.37,17.91],STRING=[1,2,3,4.01,5.02,6.04];
/** TPT modal states remain valid when smoothly moving their tuning. */
export class Reson extends DSPModule {
  private readonly ic1=new Float64Array(6);private readonly ic2=new Float64Array(6);private readonly g=new Float64Array(6);private readonly k=new Float64Array(6);private readonly a1=new Float64Array(6);private readonly gains=new Float64Array(6);
  private readonly burstRelease=Math.exp(-1/(this.sampleRate*.0017));
  private material=this.parameters[0];private pitch=0;private gate=false;private excitation=0;private counter=0;private readonly slew=1-Math.exp(-1/(this.sampleRate*.03));
  process(sample:number){
    this.material+=(this.control(0,3)-this.material)*this.slew;this.pitch+=(clamp(this.inputL[1])-this.pitch)*this.slew;const material=this.material,decay=this.parameters[1];
    if(this.counter++%16===0){const fundamental=110*Math.pow(2,this.pitch*(this.wide?8:2)),region=material<.5?material*2:(material-.5)*2;
      for(let i=0;i<6;i++){const ratio=material<.5?WOOD[i]+(METAL[i]-WOOD[i])*region:METAL[i]+(STRING[i]-METAL[i])*region,frequency=Math.min(this.sampleRate*.43,fundamental*ratio),seconds=(.12+decay*decay*6)/(1+i*(.28-.2*material)),g=Math.tan(Math.PI*frequency/this.sampleRate),k=clamp(6.9/(Math.PI*frequency*seconds),.0005,2);this.g[i]=g;this.k[i]=k;this.a1[i]=1/(1+g*(g+k));this.gains[i]=.08*Math.sqrt(110/Math.max(30,frequency))/(1+i*.22);}
    }
    const trigger=this.inputL[0]>.5;if(trigger&&!this.gate){this.excitation=1;this.triggerSample=sample;}this.gate=trigger;const noise=(this.random.next()*2-1)*this.excitation;this.excitation*=this.burstRelease;const input=Math.tanh(noise+(this.inputL[2]+this.inputR[2])*.25);let left=0,right=0;
    for(let i=0;i<6;i++){const g=this.g[i],v3=input-this.ic2[i],band=this.a1[i]*(this.ic1[i]+g*v3),low=this.ic2[i]+g*band;this.ic1[i]=clamp(2*band-this.ic1[i],-8,8);this.ic2[i]=clamp(2*low-this.ic2[i],-8,8);const y=band*this.gains[i];left+=y*(i%2?.8:1);right+=y*(i%2?1:.8);}
    this.outputL[0]=.6*Math.tanh(left/.6);this.outputR[0]=.6*Math.tanh(right/.6);this.envelope+=((Math.abs(left)+Math.abs(right))*2-this.envelope)*.002;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);this.a=material;this.b=decay;
  }
}
