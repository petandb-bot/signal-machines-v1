import { DSPModule, TAU, clamp } from '../DSPModule';
export class Flock extends DSPModule {
  private walk = 0; private destination = 0; private untilChange = 0;
  process() {
    const spread = this.parameters[0], drift = this.parameters[1];
    if (--this.untilChange <= 0) { this.destination = clamp(this.walk + (this.random.next() - .5) * .7); this.untilChange = this.sampleRate * (1.3 + this.random.next() * 3); }
    this.walk += (this.destination - this.walk) / (this.sampleRate * (3.2 - drift * 2.8));
    this.phase = (this.phase + (.018 + drift * drift * .85) / this.sampleRate) % 1;
    this.a = clamp(Math.sin(TAU * this.phase + this.walk * 1.4) * .76 + this.walk * .24);
    this.b = clamp(Math.sin(TAU * this.phase + spread * 2.6 + this.walk * .8) * (.76 - spread * .18) + Math.sin(TAU * this.phase * 1.503) * spread * .2 + this.walk * .24);
    this.outputL[0] = this.outputR[0] = this.a; this.outputL[1] = this.outputR[1] = this.b;
  }
}
