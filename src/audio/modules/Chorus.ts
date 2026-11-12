import {DSPModule,TAU} from '../DSPModule';
export class Chorus extends DSPModule {
  private readonly left=new Float32Array(Math.ceil(this.sampleRate*.08));private readonly right=new Float32Array(this.left.length);private write=0;
  private read(buffer:Float32Array,delay:number){let p=this.write-delay;if(p<0)p+=buffer.length;p%=buffer.length;const i=Math.floor(p),f=p-i;return buffer[i]*(1-f)+buffer[(i+1)%buffer.length]*f;}
  process(){
    const depth=this.control(0,1),drift=this.control(1,2);this.phase=(this.phase+(.035+drift*drift*1.2)/this.sampleRate)%1;
    this.left[this.write]=this.inputL[0];this.right[this.write]=this.inputR[0];let l=0,r=0;
    for(let i=0;i<3;i++){const base=.012+i*.003;l+=this.read(this.left,this.sampleRate*(base+Math.sin(TAU*this.phase+i*2.1)*depth*.006));r+=this.read(this.right,this.sampleRate*(base+Math.sin(TAU*this.phase+i*2.1+.87)*depth*.006));}
    this.write=(this.write+1)%this.left.length;
    this.outputL[0]=this.inputL[0]*(1-depth*.3)+l/3*depth*.45;this.outputR[0]=this.inputR[0]*(1-depth*.3)+r/3*depth*.45;
    this.a=depth;this.b=drift;this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
