import {DSPModule} from '../DSPModule';
const FREQUENCIES=[85,210,520,1300,3300,7500];
export class Sieve extends DSPModule {
  private readonly g=new Float64Array(6);private readonly a1=new Float64Array(6);private readonly weights=new Float64Array(6);
  private readonly ic1=new Float64Array(12);private readonly ic2=new Float64Array(12);private counter=0;private normalizer=1;
  constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);for(let i=0;i<6;i++){this.g[i]=Math.tan(Math.PI*Math.min(this.sampleRate*.2,FREQUENCIES[i])/this.sampleRate);this.a1[i]=1/(1+this.g[i]*(this.g[i]+.65));}}
  process(){
    const focus=this.control(0,1),width=this.control(1,2);
    if(this.counter++%16===0){let sum=0;for(let i=0;i<6;i++){const distance=(i-focus*5)/(.28+width*2.4);this.weights[i]=Math.exp(-.5*distance*distance);sum+=this.weights[i];}this.normalizer=Math.sqrt(Math.max(1,sum));}
    let left=0,right=0;
    for(let channel=0;channel<2;channel++){
      const input=Math.tanh(channel===0?this.inputL[0]:this.inputR[0]);let output=0;
      for(let i=0;i<6;i++){
        const index=channel*6+i,g=this.g[i],v3=input-this.ic2[index],v1=this.a1[i]*this.ic1[index]+g*this.a1[i]*v3,v2=this.ic2[index]+g*v1;
        this.ic1[index]=2*v1-this.ic1[index];this.ic2[index]=2*v2-this.ic2[index];output+=v1*this.weights[i];
      }
      if(channel===0)left=output;else right=output;
    }
    this.outputL[0]=.65*Math.tanh(left*1.8/this.normalizer);this.outputR[0]=.65*Math.tanh(right*1.8/this.normalizer);
    this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;
    this.a=focus;this.b=width;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
