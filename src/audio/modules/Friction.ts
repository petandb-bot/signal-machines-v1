import {DSPModule,clamp,TAU} from '../DSPModule';
import {sineAt} from '../SineTable';

/** A moving surface pulls a spring until static contact breaks; slip excites three body modes. */
export class Friction extends DSPModule {
  private position=0;private velocity=0;private stuck=true;private previousForce=0;
  private pressure=this.parameters[0];private speed=this.parameters[1];private pitch=0;
  private surfaceB=0;private readonly surfaceOffset=this.random.next();
  private readonly ic1=new Float64Array(3);private readonly ic2=new Float64Array(3);
  private readonly g=new Float64Array(3);private readonly a1=new Float64Array(3);private readonly k=new Float64Array(3);private readonly levels=new Float64Array(3);
  private counter=0;private oldL=0;private oldR=0;private dcL=0;private dcR=0;
  private readonly pole=Math.exp(-TAU*8/this.sampleRate);
  private readonly slew=1-Math.exp(-1/(this.sampleRate*.012));
  private readonly meter=1-Math.exp(-1/(this.sampleRate*.015));
  process(sample:number){
    this.pressure+=(this.control(0,1)-this.pressure)*this.slew;this.speed+=(this.control(1,2)-this.speed)*this.slew;this.pitch+=(clamp(this.inputL[0])-this.pitch)*this.slew;
    const p=this.pressure,belt=this.speed*this.speed*.18*Math.min(1,p*100),frequency=Math.min(this.sampleRate*.05,320*Math.pow(2,this.pitch*3)),h=TAU*frequency/(this.sampleRate*4);
    // Surface texture follows distance travelled, not a free-running random modulator.
    this.phase=(this.phase+belt*frequency*.045/this.sampleRate)%1;this.surfaceB=(this.surfaceB+belt*frequency*.045*Math.SQRT2/this.sampleRate)%1;
    const texture=1+.08*sineAt((this.phase+this.surfaceOffset)%1)+.05*sineAt((this.surfaceB+this.surfaceOffset*.7)%1),limit=(.025+p*.65)*texture,damping=.1+p*.09;
    let body=0,slip=false,force=0;
    for(let sub=0;sub<4;sub++){
      if(this.stuck){this.velocity=belt;this.position+=belt*h;force=this.position+damping*belt;if(force>limit&&belt>0){this.stuck=false;slip=true;}}
      else{
        const oldVelocity=this.velocity,relative=belt-this.velocity;
        force=limit*(.32+.12*p)*Math.tanh(relative/.012);
        this.velocity=clamp(this.velocity+(force-this.position-damping*this.velocity)*h,-3,3);
        this.position=clamp(this.position+this.velocity*h,-2,2);
        if(this.velocity>oldVelocity&&Math.abs(this.velocity-belt)<.006&&Math.abs(this.position+damping*belt)<limit*.92){this.stuck=true;this.velocity=belt;}
      }
      body+=this.position/Math.max(.025,limit)*.25;
    }
    if(this.counter++%16===0)for(let i=0;i<3;i++){
      const ratio=i===0?1:i===1?2.71+p*.31:5.43-p*.23,f=Math.min(this.sampleRate*.42,frequency*ratio),g=Math.tan(Math.PI*f/this.sampleRate),k=clamp(6.9/(Math.PI*f*(.035+p*.16)),.001,2);
      this.g[i]=g;this.k[i]=k;this.a1[i]=1/(1+g*(g+k));
    }
    const excitation=clamp((force-this.previousForce)*5,-1,1);this.previousForce=force;
    let left=body*.65,right=body*.65;
    for(let i=0;i<3;i++){
      const g=this.g[i],band=this.a1[i]*(this.ic1[i]+g*(excitation-this.ic2[i])),low=this.ic2[i]+g*band;
      this.ic1[i]=clamp(2*band-this.ic1[i],-4,4);this.ic2[i]=clamp(2*low-this.ic2[i],-4,4);
      this.levels[i]+=(Math.abs(band)-this.levels[i])*this.meter;
      left+=band*(i===1?.7:1);right+=band*(i===2?.7:1);
    }
    const gain=.24*Math.sqrt(p)*Math.min(1,belt*30),l=Math.tanh(left)*gain,r=Math.tanh(right)*gain;
    this.dcL=l-this.oldL+this.pole*this.dcL;this.dcR=r-this.oldR+this.pole*this.dcR;this.oldL=l;this.oldR=r;
    this.outputL[0]=this.dcL;this.outputR[0]=this.dcR;
    this.envelope+=((Math.abs(this.dcL)+Math.abs(this.dcR))*2-this.envelope)*this.meter;
    this.outputL[1]=this.outputR[1]=clamp(this.envelope,0,1);this.outputL[2]=this.outputR[2]=slip?1:0;
    this.a=clamp(this.position/limit);this.b=this.stuck?1:0;if(slip)this.triggerSample=sample;
  }
  override telemetry(){return{...super.telemetry(),velocity:{x:this.velocity,y:this.pressure},bands:Array.from(this.levels)};}
}
