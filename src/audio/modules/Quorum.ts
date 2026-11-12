import {DSPModule,clamp} from '../DSPModule';
export class Quorum extends DSPModule {
  private readonly values=new Float64Array(3);private held=0;private value=0;private gate=false;private agree=false;private counter=0;private wait=0;
  process(sample:number){
    const clock=this.inputL[3]>.5,decision=this.inputConnected[3]?clock&&!this.gate:this.counter++%32===0;this.gate=clock;this.outputL[1]=this.outputR[1]=this.outputL[2]=this.outputR[2]=0;
    if(this.wait>0)this.wait--;
    if(decision&&this.wait<=0){
      this.values.fill(0);let n=0;for(let i=0;i<3;i++)if(this.inputConnected[i])this.values[n++]=this.inputL[i];
      let closest=3,pair=0,spread=0,candidate=n?this.values[0]:0,far=-1;
      for(let i=0;i<n;i++){const d=Math.abs(this.values[i]-this.value);if(d>far){far=d;candidate=this.values[i];}for(let j=i+1;j<n;j++){const distance=Math.abs(this.values[i]-this.values[j]);spread=Math.max(spread,distance);if(distance<closest){closest=distance;pair=(this.values[i]+this.values[j])*.5;}}}
      const agree=n>=2&&closest<.02+(1-this.parameters[0])*.75;if(agree)candidate=pair;
      if(agree!==this.agree){this.outputL[agree?1:2]=this.outputR[agree?1:2]=1;this.triggerSample=sample;this.envelope=1;}this.agree=agree;this.held=clamp(candidate);this.wait=Math.round(this.sampleRate*(.005+this.parameters[1]**2*3));this.phase=spread*.5;
    }
    this.value+=(this.held-this.value)*Math.min(1,1/(this.sampleRate*.004));this.outputL[0]=this.outputR[0]=this.value;this.outputL[3]=this.outputR[3]=this.phase;this.a=this.value;this.b=this.agree?1:0;this.envelope*=1-1/(this.sampleRate*.1);
  }
  override telemetry(){return{...super.telemetry(),particles:Array.from(this.values,(x)=>({x,y:0,activity:this.agree?1:.2}))};}
}
