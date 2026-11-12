import {DSPModule,TAU} from '../DSPModule';
/** Voss-style octave rows for pink, leaky integration for brown, independent stereo seeds. */
export class Noise extends DSPModule {
  private readonly rows=new Float64Array(24);private readonly sums=new Float64Array(2);private readonly brown=new Float64Array(2);private counter=0;
  private readonly weights=new Float64Array([1,0,0]);private readonly slew=1-Math.exp(-1/(this.sampleRate*.006));
  private readonly pole=Math.exp(-TAU*8/this.sampleRate);private readonly excitation=Math.sqrt(1-this.pole*this.pole);
  constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);for(let c=0;c<2;c++)for(let i=0;i<12;i++){const n=this.random.next()*2-1;this.rows[c*12+i]=n;this.sums[c]+=n;}}
  process(){
    const selected=this.selectedMode==='PINK'?1:this.selectedMode==='BROWN'?2:0;for(let i=0;i<3;i++)this.weights[i]+=((i===selected?1:0)-this.weights[i])*this.slew;
    this.counter=(this.counter+1)&4095;let bits=this.counter,row=0;while(row<11&&(bits&1)===0){row++;bits>>=1;}
    const level=this.control(0,0);
    for(let c=0;c<2;c++){
      const white=this.random.next()*2-1,index=c*12+row,next=this.random.next()*2-1;this.sums[c]+=next-this.rows[index];this.rows[index]=next;
      const pink=(this.sums[c]+white)/Math.sqrt(13);this.brown[c]=this.brown[c]*this.pole+white*this.excitation;
      const signal=(white*this.weights[0]+pink*this.weights[1]+2*Math.tanh(this.brown[c]*.5)*this.weights[2])*.18*level;
      if(c===0)this.outputL[0]=signal;else this.outputR[0]=signal;
    }
    this.phase=this.counter/4096;this.a=selected/2;this.b=level;this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
