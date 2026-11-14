import {Effect} from './Effect';
import {finiteAudio, finiteUnit, machineControl} from './MachineSafety';

/** Whole echo packets exchange banks. No moving delay heads or diffusion network. */
export class Mirage extends Effect {
  private readonly capacity=Math.ceil(this.sampleRate*1.4);
  private readonly left=[new Float32Array(this.capacity),new Float32Array(this.capacity)];
  private readonly right=[new Float32Array(this.capacity),new Float32Array(this.capacity)];
  private bank=0; private cursor=0; private length=0; private previousLength=0;
  private generation=0; private energy=0; private previousEnergy=0;
  private modulation=0; private frequency=23; private lastL=0; private lastR=0;
  private seamL=0; private seamR=0; private distance=finiteUnit(this.parameters[0],.42); private mutate=finiteUnit(this.parameters[1],.48);
  private readonly follow=1-Math.exp(-1/(this.sampleRate*.008));

  process(){
    const l=this.inputL[0]=finiteAudio(this.inputL[0]),r=this.inputR[0]=finiteAudio(this.inputR[0]);
    this.distance+=(machineControl(this,0,1,.42)-this.distance)*this.follow;
    this.mutate+=(machineControl(this,1,2,.48)-this.mutate)*this.follow;
    if(!this.length)this.length=this.packetLength();
    const p=this.cursor/this.length,m=this.mutate,old=1-this.bank;
    let wl=0,wr=0;
    if(this.previousLength){
      const at=p*(this.previousLength-1),shift=(.0015+.009*m)*this.sampleRate;
      const coreL=this.read(this.left[old],at),coreR=this.read(this.right[old],at);
      // A generation-dependent sparse kernel changes transients; coherent sidebands
      // preserve stereo relationships. Total recirculation gain stays below unity.
      const side=Math.sin(this.modulation)*m*.32;
      wl=coreL*(1-m*.38+side)+m*.16*(this.read(this.left[old],at-shift)+this.read(this.left[old],at+shift));
      wr=coreR*(1-m*.38+side)+m*.16*(this.read(this.right[old],at-shift)+this.read(this.right[old],at+shift));
    }
    this.modulation+=Math.PI*2*this.frequency/this.sampleRate;
    if(this.modulation>Math.PI*2)this.modulation-=Math.PI*2;
    const seam=Math.min(1,this.cursor/(this.sampleRate*.007));
    wl=this.seamL*(1-seam)+wl*seam;wr=this.seamR*(1-seam)+wr*seam;
    this.lastL=wl;this.lastR=wr;
    // Soft bound only the memory write. Ordinary small signals retain their detail.
    this.left[this.bank][this.cursor]=2*Math.tanh((l+wl*.64)/2);
    this.right[this.bank][this.cursor]=2*Math.tanh((r+wr*.64)/2);
    this.energy+=(wl*wl+wr*wr)*.5;
    this.finish(l*.72+wl*.62,r*.72+wr*.62);
    this.a=Math.min(1,Math.sqrt(this.previousEnergy)*4);this.b=m;this.phase=p;
    if(++this.cursor>=this.length){
      this.previousEnergy=this.energy/this.length;this.energy=0;this.previousLength=this.length;
      this.bank=old;this.cursor=0;this.generation++;this.length=this.packetLength();
      this.seamL=this.lastL;this.seamR=this.lastR;
      this.frequency=11+(this.generation*17%67)+Math.min(29,Math.sqrt(this.previousEnergy)*47);
    }
  }
  private packetLength(){return Math.min(this.capacity,Math.max(64,Math.round(this.sampleRate*(.12+this.distance*this.distance*1.05))));}
  private read(buffer:Float32Array,at:number){
    if(at<0||at>=this.previousLength-1)return 0;
    const i=Math.floor(at),f=at-i,edge=Math.min(1,at/(this.sampleRate*.003),(this.previousLength-1-at)/(this.sampleRate*.003));
    return (buffer[i]+(buffer[i+1]-buffer[i])*f)*edge;
  }
  override telemetry(){return {...super.telemetry(),bands:[this.generation%8,this.previousEnergy,this.frequency]};}
}
