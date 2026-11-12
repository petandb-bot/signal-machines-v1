import {DSPModule,clamp} from '../DSPModule';
export class Filter extends DSPModule {
  private readonly ic1=new Float64Array(2);private readonly ic2=new Float64Array(2);private readonly weights=new Float64Array([1,0,0]);
  private readonly slew=1-Math.exp(-1/(this.sampleRate*.006));private counter=0;private g=0;private k=2;private a1=1;private a2=0;private a3=0;
  process(){
    const cutoff=this.control(0,1),resonance=this.control(1,2);
    if(this.counter++%8===0){this.g=Math.tan(Math.PI*Math.min(this.sampleRate*.42,20*Math.pow(1000,cutoff))/this.sampleRate);this.k=2-resonance*1.94;this.a1=1/(1+this.g*(this.g+this.k));this.a2=this.g*this.a1;this.a3=this.g*this.a2;}
    const selected=this.selectedMode==='BAND'?1:this.selectedMode==='HIGH'?2:0;for(let i=0;i<3;i++)this.weights[i]+=((i===selected?1:0)-this.weights[i])*this.slew;
    for(let c=0;c<2;c++){
      const input=Math.tanh(c===0?this.inputL[0]:this.inputR[0]),v3=input-this.ic2[c],band=this.a1*this.ic1[c]+this.a2*v3,low=this.ic2[c]+this.a2*this.ic1[c]+this.a3*v3;
      this.ic1[c]=clamp(2*band-this.ic1[c],-8,8);this.ic2[c]=clamp(2*low-this.ic2[c],-8,8);
      const high=input-this.k*band-low,signal=.8*Math.tanh((low*this.weights[0]+band*this.weights[1]+high*this.weights[2])/.8);
      if(c===0)this.outputL[0]=signal;else this.outputR[0]=signal;
    }
    this.a=cutoff;this.b=resonance;this.phase=selected/2;this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
