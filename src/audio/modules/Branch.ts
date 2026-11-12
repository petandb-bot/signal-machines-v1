import { DSPModule, clamp } from '../DSPModule';
const SCALE = [-12,-9,-7,-5,-2,0,3,5,7,10,12,15,17,19,22];
export class Branch extends DSPModule {
  private readonly phrase = new Int8Array(8);
  private readonly memory = new Int8Array(8);
  private readonly previous = new Int8Array(8);
  private step = -1; private laps = -1; private gate = false; private pitch = 0;
  constructor(...args: ConstructorParameters<typeof DSPModule>) {
    super(...args);
    for (let i=0;i<8;i++) this.phrase[i] = 3 + Math.floor(this.random.next()*7);
    this.memory.set(this.phrase);
  }
  process(sample:number) {
    this.outputL[1] = this.outputR[1] = 0;
    const trigger = this.inputL[0] > .5, change = this.control(0,1), memory = this.parameters[1];
    if (trigger && !this.gate) {
      this.step = (this.step+1)%8;
      if(this.step===0) {
        this.laps++;
        // A phrase survives at least two passes. High MEMORY waits longer.
        const wait = 2 + Math.floor(memory*4);
        if(this.laps>=wait && this.random.next()<change*.85) {
          this.laps=0;
          if(this.random.next()<memory*.38) { this.previous.set(this.phrase); this.phrase.set(this.memory); this.memory.set(this.previous); }
          else { this.memory.set(this.phrase); const index=Math.floor(this.random.next()*8); this.phrase[index]=clamp(this.phrase[index]+(this.random.next()<.5?-1:1)*(1+Math.floor(change*3)),0,SCALE.length-1); }
        }
      }
      const note = SCALE[this.phrase[this.step]];
      this.pitch=note/24;this.phase=this.step/8;this.a=this.pitch;this.b=memory;
      if(this.random.next()>change*.19){this.outputL[1]=this.outputR[1]=1;this.envelope=1;this.triggerSample=sample;}
      for(let i=0;i<8;i++)this.wave[i]=SCALE[this.phrase[i]]/24;
    }
    this.gate=trigger; this.envelope*=1-1/(this.sampleRate*.1);
    this.outputL[0]=this.outputR[0]=this.pitch;
  }
  override capture() {} // The display uses the actual retained phrase, not an audio waveform.
  override telemetry() { const t=super.telemetry();t.wave=Array.from(this.wave.subarray(0,8));return t; }
}
