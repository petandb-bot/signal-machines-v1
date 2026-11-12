import { DSPModule } from '../DSPModule';

/** A failing contact, rather than a buffer effect: faults actually interrupt the signal path. */
export class Snap extends DSPModule {
  private gate=false;private open=1;private remaining=0;private untilFault=0;
  private contact=0;private energy=0;
  private readonly edge=1-Math.exp(-1/(this.sampleRate*.0007));
  process(sample:number){
    const fault=this.control(0,1),recover=this.parameters[1],trigger=this.inputL[2]>.5;
    if(trigger&&!this.gate)this.breakContact(sample,recover);
    this.gate=trigger;
    if(this.remaining>0)this.remaining--;
    else if(--this.untilFault<=0){
      this.untilFault=this.sampleRate/(.4+fault*fault*30)*(.45+this.random.next());
      if(fault>0&&this.random.next()<fault)this.breakContact(sample,recover);
    }
    const target=this.remaining>0?0:1;
    // A sub-millisecond edge preserves the contact's sharpness without a full-scale jump.
    this.open+=(target-this.open)*this.edge;
    this.energy+=((Math.abs(this.inputL[0])+Math.abs(this.inputR[0]))*.5-this.energy)*.003;
    const crackle=(this.random.next()*2-1)*this.contact*this.energy*.055;
    this.contact*=1-1/(this.sampleRate*.003);
    this.outputL[0]=this.inputL[0]*this.open+crackle;
    this.outputR[0]=this.inputR[0]*this.open-crackle;
    this.a=this.open;this.b=fault;this.phase=this.open;
    this.envelope+=(Math.min(1,(Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2)-this.envelope)*.005;
    this.outputL[1]=this.outputR[1]=this.envelope;
  }
  private breakContact(sample:number,recover:number){
    this.remaining=Math.max(1,Math.floor(this.sampleRate*(.004+recover*recover*1.4)*(.35+this.random.next()*.65)));
    this.contact=1;this.triggerSample=sample;
  }
}
