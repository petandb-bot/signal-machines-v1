import { DSPModule, TAU } from '../DSPModule';
const TIMES = [.0731, .0973, .1319, .1733];
export class Chamber extends DSPModule {
  private readonly buffers = Array.from({length:4}, () => new Float32Array(Math.ceil(this.sampleRate * 1.2)));
  private readonly taps = new Float64Array(4);
  private readonly lowpass = new Float64Array(4);
  private readonly dcInput = new Float64Array(4);
  private readonly dcOutput = new Float64Array(4);
  private readonly lengths = new Float64Array(4);
  private write = 0;private readonly woven=new Float64Array(4);private weaveMix=0;private readonly weaveSlew=1-Math.exp(-1/(this.sampleRate*.008));
  process() {
    const size = this.control(0,1), density = this.control(1,2);
    const length = this.buffers[0].length;
    this.phase = (this.phase + .037 / this.sampleRate) % 1;
    for (let i = 0; i < 4; i++) {
      const target = this.sampleRate * TIMES[i] * (.28 + size * size * 4.6) + Math.sin(TAU * this.phase + i * 1.8) * (2 + density * 5);
      if (this.lengths[i] === 0) this.lengths[i] = target;
      this.lengths[i] += (target - this.lengths[i]) * .00004;
      let read = this.write - this.lengths[i]; if (read < 0) read += length; if(read>=length)read=0;
      const index = Math.floor(read), fraction = read - index;
      const tap = this.buffers[i][index] * (1 - fraction) + this.buffers[i][(index + 1) % length] * fraction;
      this.lowpass[i] += (tap - this.lowpass[i]) * (.72 - density * .28);
      const dc = this.lowpass[i] - this.dcInput[i] + .997 * this.dcOutput[i];
      this.dcInput[i] = this.lowpass[i]; this.dcOutput[i] = dc; this.taps[i] = dc;
    }
    const a = this.taps[0], b = this.taps[1], c = this.taps[2], d = this.taps[3];
    const feedback = .22 + density * .68; // Orthogonal feedback matrix; loop gain is strictly below one.
    const left = this.inputL[0], right = this.inputR[0];
    this.weaveMix+=((this.selectedMode==='WEAVE'?1:0)-this.weaveMix)*this.weaveSlew;
    if(this.weaveMix>1e-8){
      this.woven.set(this.taps);const angle=density*Math.PI*.25,c=Math.cos(angle),s=Math.sin(angle);
      // Four Givens rotations retain unit norm at every intermediate setting.
      for(let pair=0;pair<4;pair++){const x=pair===0?0:pair===1?2:pair===2?0:1,y=pair===0?1:pair===1?3:pair===2?2:3,u=this.woven[x],v=this.woven[y];this.woven[x]=c*u-s*v;this.woven[y]=s*u+c*v;}
    }
    for (let i = 0; i < 4; i++) {
      const mixed = i === 0 ? a+b+c+d : i === 1 ? a-b+c-d : i === 2 ? a+b-c-d : a-b-c+d;
      const excitation = (i % 2 ? right : left) * .32;
      const room=mixed*.5,next=excitation+(room+(this.woven[i]-room)*this.weaveMix)*feedback;
      this.buffers[i][this.write] = Number.isFinite(next) ? Math.tanh(next) : 0;
    }
    this.write = (this.write + 1) % length;
    const wetL = (a + c - d * .45) * .65, wetR = (b + d - c * .45) * .65;
    const wet = .26 + density * .48;
    this.outputL[0] = left * (1 - wet * .45) + wetL * wet;
    this.outputR[0] = right * (1 - wet * .45) + wetR * wet;
    this.envelope += ((Math.abs(wetL) + Math.abs(wetR)) * .5 - this.envelope) * .001;
    this.a = size; this.b = density; this.outputL[1] = this.outputR[1] = Math.min(1, this.envelope * 5);
  }
}
