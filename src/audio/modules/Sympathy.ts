import {DSPModule} from '../DSPModule';
import {finiteAudio,finiteUnit,machineControl} from './MachineSafety';

/** Three damped bodies, connected by norm-preserving momentum exchanges. */
export class Sympathy extends DSPModule {
  private readonly q=new Float64Array(6);private readonly p=new Float64Array(6);
  private readonly cosine=new Float64Array(3);private readonly sine=new Float64Array(3);private readonly damping=new Float64Array(3);
  readonly energies=new Float64Array(3);readonly frequencies=new Float64Array(3);readonly flow=new Float64Array(2);
  private readonly contact=new Float64Array(2);
  private readonly contactSlew=1-Math.exp(-1/(this.sampleRate*.012));
  private body=finiteUnit(this.parameters[0],.42);private couple=finiteUnit(this.parameters[1],.55);private pitch=0;private counter=0;
  private couplingCos=1;private couplingSin=0;private halfCos=1;private halfSin=0;private drive=0;private contactDrive=0;private incidentWork=0;
  private gate=false;private recovery=0;private oldL=0;private oldR=0;private dcL=0;private dcR=0;
  private readonly slew=1-Math.exp(-1/(this.sampleRate*.025));private readonly meter=1-Math.exp(-1/(this.sampleRate*.015));
  private readonly dcPole=Math.exp(-2*Math.PI*3/this.sampleRate);private readonly strikeDirection=this.random.next()<.5?-1:1;

  process(sample:number){
    this.body+=(finiteUnit(this.parameters[0],.42)-this.body)*this.slew;
    this.couple+=(machineControl(this,1,3,.55)-this.couple)*this.slew;
    this.pitch+=(Math.max(-1,Math.min(1,finiteAudio(this.inputL[2])))-this.pitch)*this.slew;
    if(this.counter++%16===0)this.coefficients();
    const trigger=finiteAudio(this.inputL[1])>.5,rise=trigger&&!this.gate;this.gate=trigger;
    this.recovery=Math.max(0,this.recovery-1);
    if(rise&&!this.recovery){this.strike(0);this.strike(3);this.recovery=Math.round(this.sampleRate*.02);this.triggerSample=sample;}
    const l=finiteAudio(this.inputL[0]),r=finiteAudio(this.inputR[0]);let left=0,right=0,f01=0,f12=0;
    for(let channel=0;channel<2;channel++){
      const offset=channel*3,x=channel?r:l;
      this.contact[channel]+=(Math.abs(x)-this.contact[channel])*this.contactSlew;
      const displacement=Math.max(0,Math.abs(x)-this.contact[channel])*this.contactDrive*.5*this.strikeDirection;
      const force=x*this.drive*.5,budget=this.incidentWork*x*x;
      this.excite(offset,displacement,force,budget);
      this.rotate(offset);
      f01+=this.exchange(offset,0,1,this.halfCos,this.halfSin);
      f12+=this.exchange(offset,1,2,this.couplingCos,this.couplingSin);
      f01+=this.exchange(offset,0,1,this.halfCos,this.halfSin);
      this.rotate(offset);this.excite(offset,displacement,force,budget);
      const pickup=(this.p[offset]*.78+this.p[offset+1]*(channel?.40:.48)+this.p[offset+2]*(channel?.48:.40))*.27;
      if(channel)right=pickup;else left=pickup;
      const norm=this.q[offset]**2+this.q[offset+1]**2+this.q[offset+2]**2+this.p[offset]**2+this.p[offset+1]**2+this.p[offset+2]**2;
      if(norm<1e-24)for(let i=0;i<3;i++)this.q[offset+i]=this.p[offset+i]=0;
    }
    this.dcL=left-this.oldL+this.dcPole*this.dcL;this.dcR=right-this.oldR+this.dcPole*this.dcR;this.oldL=left;this.oldR=right;
    if(left===0&&Math.abs(this.dcL)<1e-24)this.dcL=0;if(right===0&&Math.abs(this.dcR)<1e-24)this.dcR=0;
    this.outputL[0]=this.dcL;this.outputR[0]=this.dcR;
    let energy=0;for(let i=0;i<3;i++){this.energies[i]=(this.q[i]**2+this.p[i]**2+this.q[i+3]**2+this.p[i+3]**2)*.25;energy+=this.energies[i];}
    this.flow[0]+=(f01*.25-this.flow[0])*this.meter;this.flow[1]+=(f12*.25-this.flow[1])*this.meter;
    const activity=Math.min(1,Math.sqrt(energy)*3);this.envelope+=(activity-this.envelope)*this.meter;
    if(activity===0&&this.envelope<1e-12)this.envelope=0;
    for(let i=0;i<2;i++)if(Math.abs(this.flow[i])<1e-24)this.flow[i]=0;
    this.outputL[1]=this.outputR[1]=this.envelope;this.a=activity;this.b=this.couple;this.phase=this.body;
  }
  private coefficients(){
    const base=110*Math.pow(2,this.pitch*2),material=this.body*this.body,gamma=Math.log(1000)/(.45+4.3*material);
    const d=Math.exp(-gamma/this.sampleRate),retention=d*d;
    this.drive=(1-d)*1.8;this.contactDrive=(1-d)*6;
    // Incident work, not stored-state limiting: E' <= d² E + (1+d²)B.
    this.incidentWork=1.62*(1-retention)/(1+retention);
    for(let i=0;i<3;i++){
      const ratio=i===0?1:i===1?1.006+material*1.84:1.017+material*3.6;
      const f=Math.min(this.sampleRate*.22,base*ratio),angle=Math.PI*f/this.sampleRate;
      this.frequencies[i]=f;this.cosine[i]=Math.cos(angle);this.sine[i]=Math.sin(angle);this.damping[i]=Math.exp(-gamma*(1+i*.12)/(this.sampleRate*2));
    }
    const angle=2*Math.PI*base*.58*this.couple*this.couple/this.sampleRate;
    this.couplingCos=Math.cos(angle);this.couplingSin=Math.sin(angle);this.halfCos=Math.cos(angle*.5);this.halfSin=Math.sin(angle*.5);
  }
  /** A waveform-derived boundary displacement plus signed pressure, each half-step.
   * Admit at most the incident sample's work; never clamp existing vibration.
   * Scaling input/history by positive k scales states by k, preserving quiet/loud differences.
   */
  private excite(offset:number,dq:number,dp:number,budget:number){
    const norm=dq*dq+dp*dp;if(norm===0)return;
    const dot=this.q[offset]*dq+this.p[offset]*dp;
    let scale=1;
    if(dot+norm*.5>budget){
      const root=Math.sqrt(dot*dot+2*norm*budget);
      scale=Math.min(1,dot>=0?2*budget/(dot+root):(root-dot)/norm);
    }
    this.q[offset]+=dq*scale;this.p[offset]+=dp*scale;
  }
  private rotate(offset:number){
    for(let i=0;i<3;i++){const j=offset+i,q=this.q[j],p=this.p[j],c=this.cosine[i],s=this.sine[i],d=this.damping[i];this.q[j]=(q*c+p*s)*d;this.p[j]=(p*c-q*s)*d;}
  }
  /** Signed kinetic energy delivered to the destination, before damping. */
  private exchange(offset:number,a:number,b:number,c:number,s:number){
    const i=offset+a,j=offset+b,p=this.p[i],v=this.p[j];this.p[i]=p*c-v*s;this.p[j]=p*s+v*c;return this.p[j]**2-v*v;
  }
  private strike(offset:number){
    let norm=0;for(let i=0;i<3;i++)norm+=this.q[offset+i]**2+this.p[offset+i]**2;
    const budget=.36-norm;if(budget<=0)return;
    const aligned=this.p[offset]*this.strikeDirection,impulse=Math.min(.36,Math.max(0,Math.sqrt(aligned*aligned+budget)-aligned));
    this.p[offset]+=this.strikeDirection*impulse;
  }
  override telemetry(){
    return {...super.telemetry(),bands:[...this.energies,...this.flow],curve:Array.from(this.frequencies),particles:Array.from({length:3},(_,i)=>({x:(this.q[i]+this.q[i+3])*.5,y:this.energies[i],activity:Math.min(1,Math.sqrt(this.energies[i])*4)}))};
  }
}
