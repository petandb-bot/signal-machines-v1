import { DSPModule, clamp } from '../DSPModule';
export class Fracture extends DSPModule {
  private readonly ringL=new Float32Array(Math.ceil(this.sampleRate*2));
  private readonly ringR=new Float32Array(this.ringL.length);
  private readonly heldL=new Float32Array(Math.ceil(this.sampleRate*.35));
  private readonly heldR=new Float32Array(this.heldL.length);
  private write=0;private read=0;private length=0;private direction=1;private nextDirection=1;
  private captureRemaining=0;private captureWrite=0;private captureSource=0;private nextLength=0;
  private untilCapture=this.sampleRate*.18;private gate=false;private wet=0;private fade=0;private activity=0;
  process(sample:number) {
    const amount=this.control(0,1),hold=this.parameters[1],size=this.ringL.length;
    const left=this.inputL[0],right=this.inputR[0];this.ringL[this.write]=left;this.ringR[this.write]=right;this.write=(this.write+1)%size;
    const trigger=this.inputL[2]>.5,requested=trigger&&!this.gate;this.gate=trigger;
    if(this.captureRemaining===0&&(requested||(--this.untilCapture<=0&&(hold<.985||!this.length)))){
      this.captureWrite=0;this.nextLength=Math.min(this.heldL.length,Math.floor(this.sampleRate*(.018+Math.pow(1-amount,2)*.25)));
      this.captureRemaining=this.nextLength;
      const displacement=Math.floor(this.random.next()*amount*this.sampleRate*.18);
      this.captureSource=(this.write-this.nextLength-displacement+size)%size;
      this.untilCapture=this.sampleRate*(.12+hold*hold*3.6)*(.8+this.random.next()*.4);
      this.nextDirection=this.random.next()<amount*.55?-1:1;this.triggerSample=sample;
    }
    let copying=false;
    if(this.captureRemaining>0){
      this.wet+=(0-this.wet)*.006;
      // The old fragment keeps playing during fade-out. Copy one sample per frame only once muted.
      if(this.wet<.0001){
        copying=true;this.fade=0;
        const source=(this.captureSource+this.captureWrite)%size;
        this.heldL[this.captureWrite]=this.ringL[source];this.heldR[this.captureWrite]=this.ringR[source];
        this.captureWrite++;this.captureRemaining--;
        if(this.captureRemaining===0){this.length=this.nextLength;this.direction=this.nextDirection;this.read=this.direction===1?0:this.length-1;}
      }
    }else if(this.length>1){this.wet+=(amount-this.wet)*.002;this.fade=Math.min(1,this.fade+1/(this.sampleRate*.006));}
    let wetL=0,wetR=0;
    if(this.length>1&&!copying){
      const index=Math.floor(this.read),fraction=this.read-index,next=(index+1)%this.length;
      const edge=Math.min(1,this.read/Math.min(96,this.length*.22),(this.length-1-this.read)/Math.min(96,this.length*.22));
      const window=clamp(edge,0,1);wetL=(this.heldL[index]*(1-fraction)+this.heldL[next]*fraction)*window;wetR=(this.heldR[index]*(1-fraction)+this.heldR[next]*fraction)*window;
      this.read=(this.read+this.direction+this.length)%this.length;
    }
    const mix=this.wet*this.fade;
    this.outputL[0]=left*(1-mix*.8)+wetL*mix;this.outputR[0]=right*(1-mix*.8)+wetR*mix;
    this.activity+=(Math.abs(wetL)+Math.abs(wetR)-this.activity)*.001;
    this.envelope=Math.min(1,this.activity*3);this.a=this.length?this.read/this.length:0;this.b=mix;this.phase=this.a;
    this.outputL[1]=this.outputR[1]=this.envelope;
  }
}
