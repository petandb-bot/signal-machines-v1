/** Conservative fixed filters for optional sound-quality modes.
 * Coefficients are sample-rate aware; no arrays or objects are allocated in process().
 */
export class StereoWetFocus {
  private readonly highpass:number;
  private readonly lowpass:number;
  private bassL=0;private bassR=0;private airL=0;private airR=0;
  left=0;right=0;
  constructor(sampleRate:number,highpassHz=130,lowpassHz=6400){
    this.highpass=1-Math.exp(-2*Math.PI*highpassHz/sampleRate);
    this.lowpass=1-Math.exp(-2*Math.PI*Math.min(lowpassHz,sampleRate*.35)/sampleRate);
  }
  process(left:number,right:number){
    this.bassL+=(left-this.bassL)*this.highpass;
    this.bassR+=(right-this.bassR)*this.highpass;
    this.airL+=(left-this.bassL-this.airL)*this.lowpass;
    this.airR+=(right-this.bassR-this.airR)*this.lowpass;
    this.left=this.airL;this.right=this.airR;
  }
}
export const refinementSlew=(sampleRate:number)=>1-Math.exp(-1/(sampleRate*.02));
export const approach=(old:number,target:number,coefficient:number)=>{
  const next=old+(target-old)*coefficient;
  return target===0&&next<1e-9?0:target===1&&next>1-1e-9?1:next;
};
