import { DSPModule } from '../DSPModule';
const DIVISIONS = [.125, .25, .5, 1, 2, 4, 8];
export class Pulse extends DSPModule {
  private remaining = 0; private interval = 1; private first = true;
  process(sample: number, bpm: number) {
    this.outputL[0] = this.outputR[0] = 0;
    if (this.remaining <= 0) {
      const irregular = this.parameters[1];
      this.interval = this.sampleRate * 60 / bpm / DIVISIONS[Math.min(6, Math.round(this.parameters[0] * 6))] * (1 + (this.random.next() - .5) * irregular * .72);
      this.remaining += this.interval;
      if (this.first || this.random.next() > irregular * .27) { this.outputL[0] = this.outputR[0] = 1; this.envelope = 1; this.triggerSample = sample; }
      this.first = false;
    }
    this.remaining--; this.phase = 1 - this.remaining / this.interval;
    this.envelope *= 1 - 1 / (.09 * this.sampleRate); this.a = this.outputL[0];
  }
}
