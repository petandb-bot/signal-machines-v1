import {DSPModule,clamp} from '../DSPModule';
const SCALE=[-12,-9,-7,-5,-2,0,3,5,7,10,12,15,17,19,22];
export class Chance extends DSPModule {
  private readonly choices=new Float64Array(8);private readonly notes=new Float64Array(8);private step=-1;private clock=false;private reset=false;private pitch=0;
  constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);for(let i=0;i<8;i++){this.choices[i]=this.random.next();this.notes[i]=this.random.next();}}
  process(sample:number){
    this.outputL[0]=this.outputR[0]=this.outputL[1]=this.outputR[1]=0;
    const density=this.control(0,1),recall=this.parameters[1],clock=this.inputL[0]>.5,reset=this.inputL[3]>.5;
    if(reset&&!this.reset)this.step=-1;this.reset=reset;
    if(clock&&!this.clock){
      this.step=(this.step+1)%8;if(this.random.next()>recall){this.choices[this.step]=this.random.next();this.notes[this.step]=this.random.next();}
      const u=this.choices[this.step],a=u<density,b=u>=1-density;
      this.outputL[0]=this.outputR[0]=a?1:0;this.outputL[1]=this.outputR[1]=b?1:0;
      const bias=clamp((this.selectedMode==='LOW'?-.55:this.selectedMode==='HIGH'?.55:0)+this.inputL[2]),raw=this.notes[this.step],shaped=bias<0?Math.pow(raw,1-bias*3):bias>0?1-Math.pow(1-raw,1+bias*3):raw;
      this.pitch=SCALE[Math.min(SCALE.length-1,Math.floor(shaped*SCALE.length))]/24;this.wave[this.step]=this.pitch;
      this.phase=this.step/8;this.a=density;this.b=recall;if(a||b){this.envelope=1;this.triggerSample=sample;}
    }
    this.clock=clock;this.envelope*=1-1/(this.sampleRate*.1);this.outputL[2]=this.outputR[2]=this.pitch;
  }
  override capture(){}
  override telemetry(){const t=super.telemetry();t.wave=Array.from(this.wave.subarray(0,8));return t;}
}
