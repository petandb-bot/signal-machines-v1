import { DSPModule } from '../DSPModule';
export class Output extends DSPModule {
  private readonly widePole=Math.exp(-Math.PI*2*.05/this.sampleRate);
  private pole=this.wide?this.widePole:.995;
  private oldL = 0; private oldR = 0; private dcL = 0; private dcR = 0;
  process() {
    const l = this.inputL[0], r = this.inputR[0];this.pole+=((this.wide?this.widePole:.995)-this.pole)*.001;
    this.dcL = l - this.oldL + this.pole * this.dcL; this.dcR = r - this.oldR + this.pole * this.dcR; this.oldL = l; this.oldR = r;
    this.outputL[0] = this.dcL * this.parameters[0]; this.outputR[0] = this.dcR * this.parameters[0];
    this.levelL = Math.max(Math.abs(this.outputL[0]), this.levelL * .9996);
    this.levelR = Math.max(Math.abs(this.outputR[0]), this.levelR * .9996);
    this.envelope = Math.max(this.levelL, this.levelR);
  }
}
