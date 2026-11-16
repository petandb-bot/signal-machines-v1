import {Output} from './Output';

/**
 * Opt-in 5 Hz DC rejection that preserves the historical Output module source
 * and PCM stream exactly when CLASSIC is selected or no mode is saved.
 */
export class CleanOutput extends Output {
  private readonly cleanPole=Math.exp(-2*Math.PI*5/this.sampleRate);
  private cleanOldL=0;private cleanOldR=0;private filteredL=0;private filteredR=0;
  private blend=0;
  private readonly slew=1-Math.exp(-1/(this.sampleRate*.02));
  override process(){
    // Always maintain the original classic filter state for seamless fallback.
    super.process();
    const clean=this.selectedMode==='CLEAN';
    if(!clean&&this.blend===0)return;
    const l=this.inputL[0],r=this.inputR[0];
    this.filteredL=l-this.cleanOldL+this.cleanPole*this.filteredL;
    this.filteredR=r-this.cleanOldR+this.cleanPole*this.filteredR;
    this.cleanOldL=l;this.cleanOldR=r;
    this.blend+=(Number(clean)-this.blend)*this.slew;
    if(this.blend<1e-9)this.blend=0;
    const classicL=this.outputL[0],classicR=this.outputR[0],mix=this.blend;
    this.outputL[0]=classicL*(1-mix)+this.filteredL*this.parameters[0]*mix;
    this.outputR[0]=classicR*(1-mix)+this.filteredR*this.parameters[0]*mix;
    this.levelL=Math.max(Math.abs(this.outputL[0]),this.levelL*.9996);
    this.levelR=Math.max(Math.abs(this.outputR[0]),this.levelR*.9996);
    this.envelope=Math.max(this.levelL,this.levelR);
  }
}
