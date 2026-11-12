import {DSPModule,TAU} from '../DSPModule';
import {shiftedHz} from '../ToneMath';
// Two second-order allpass cascades form an approximate quadrature pair.
// Squared pole coefficients; the A branch has an additional one-sample delay.
const A=[.6923878,.93606543,.98822952,.99874885].map(n=>n*n);
const B=[.40219212,.85617109,.97229095,.99528848].map(n=>n*n);
export class Shift extends DSPModule {
  private readonly memory=new Float64Array(64);private readonly delay=new Float64Array(2);private parity=0;
  private allpass(input:number,channel:number,branch:number){let value=input;const coefficients=branch===0?A:B;for(let i=0;i<4;i++){const index=((channel*2+branch)*4+i)*4+this.parity*2,next=coefficients[i]*(value+this.memory[index+1])-this.memory[index];this.memory[index]=value;this.memory[index+1]=next;value=next;}return value;}
  process(){
    const shift=this.control(0,1),mix=this.control(1,2),frequency=shiftedHz(shift);this.phase=(this.phase+frequency/this.sampleRate+1)%1;
    const cosine=Math.cos(TAU*this.phase),sine=Math.sin(TAU*this.phase);
    for(let c=0;c<2;c++){const input=c===0?this.inputL[0]:this.inputR[0],a=this.allpass(input,c,0),real=this.allpass(input,c,1),imaginary=this.delay[c];this.delay[c]=a;const output=input*(1-mix)+(real*cosine-imaginary*sine)*mix;if(c===0)this.outputL[0]=output;else this.outputR[0]=output;}
    this.parity^=1;this.a=shift;this.b=mix;this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
