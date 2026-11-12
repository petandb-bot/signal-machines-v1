import {DSPModule} from '../DSPModule';
export class Cloud extends DSPModule {
  private readonly left=new Float32Array(Math.ceil(this.sampleRate*2.2));private readonly right=new Float32Array(this.left.length);
  private readonly ages=new Float64Array([1,1.25,1.5,1.75]);private readonly positions=new Float64Array(4);private readonly durations=new Float64Array(4);private readonly speeds=new Float64Array(4);private write=0;
  private read(buffer:Float32Array,p:number){const i=Math.floor(p),f=p-i;return buffer[i]*(1-f)+buffer[(i+1)%buffer.length]*f;}
  process(){
    const grain=this.control(0,1),spread=this.control(1,2),size=this.left.length;
    this.left[this.write]=this.inputL[0];this.right[this.write]=this.inputR[0];this.write=(this.write+1)%size;let left=0,right=0;
    for(let i=0;i<4;i++){
      if(this.ages[i]>=1){this.ages[i]%=1;this.durations[i]=this.sampleRate*(.03+grain*grain*.45);this.positions[i]=(this.write-this.sampleRate*(.08+this.random.next()*spread*1.3)+size)%size;this.speeds[i]=(.55+this.random.next()*.65)*(this.random.next()<spread*.25?-1:1);}
      const window=Math.sin(this.ages[i]*Math.PI)**2,pan=(i-1.5)*.2;
      left+=this.read(this.left,this.positions[i])*window*(1-pan);right+=this.read(this.right,this.positions[i])*window*(1+pan);
      this.positions[i]=(this.positions[i]+this.speeds[i]+size)%size;this.ages[i]+=1/this.durations[i];
    }
    this.outputL[0]=this.inputL[0]*.28+Math.tanh(left*.5)*.72;this.outputR[0]=this.inputR[0]*.28+Math.tanh(right*.5)*.72;
    this.phase=this.ages[0];this.a=grain;this.b=spread;this.envelope+=((Math.abs(left)+Math.abs(right))*1.5-this.envelope)*.001;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
