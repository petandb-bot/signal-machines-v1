import { DSPModule, TAU } from '../DSPModule';

/** A seeded noise source: colored hiss, unstable held grains and contact impulses. */
export class Venom extends DSPModule {
  private gate=false;
  private burst=0;
  private lowL=0;private lowR=0;
  private grainL=0;private grainR=0;private grainRemaining=0;
  private contactL=0;private contactR=0;
  private dcL=0;private dcR=0;private previousL=0;private previousR=0;
  process(sample:number){
    const dose=this.control(0,1),strain=this.parameters[1];
    const trigger=this.inputL[0]>.5;
    if(trigger&&!this.gate){this.burst=1;this.triggerSample=sample;}
    this.gate=trigger;this.burst*=1-1/(this.sampleRate*(.035+(1-strain)*.32));
    const noiseL=this.random.next()*2-1,noiseR=this.random.next()*2-1;
    const cutoff=.008+strain*strain*.52;
    this.lowL+=(noiseL-this.lowL)*cutoff;this.lowR+=(noiseR-this.lowR)*cutoff;
    if(--this.grainRemaining<=0){
      this.grainL=noiseL;this.grainR=noiseR;
      this.grainRemaining=Math.max(1,Math.floor(this.sampleRate*(.00008+Math.pow(1-strain,3)*.012)*(.5+this.random.next())));
    }
    if(this.random.next()<(.4+strain*strain*65)/this.sampleRate){this.contactL=noiseL;this.contactR=noiseR;}
    this.contactL*=.972;this.contactR*=.972;
    this.phase=(this.phase+(31+strain*strain*2400+this.grainL*strain*900)/this.sampleRate+1)%1;
    const ring=1-strain*.55+Math.sin(this.phase*TAU)*strain*.55;
    const level=dose*dose*(.11+this.burst*.2);
    const l=(this.lowL*(1-strain*.6)+this.grainL*strain*.48+noiseL*strain*strain*.35+this.contactL*.55)*ring*level;
    const r=(this.lowR*(1-strain*.6)+this.grainR*strain*.48+noiseR*strain*strain*.35+this.contactR*.55)*ring*level;
    this.dcL=l-this.previousL+.997*this.dcL;this.previousL=l;this.dcR=r-this.previousR+.997*this.dcR;this.previousR=r;
    this.outputL[0]=this.dcL;this.outputR[0]=this.dcR;
    this.envelope+=((Math.abs(this.dcL)+Math.abs(this.dcR))*3-this.envelope)*.002;
    this.a=dose;this.b=strain;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
