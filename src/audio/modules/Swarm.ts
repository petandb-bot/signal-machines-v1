import {DSPModule,TAU,clamp} from '../DSPModule';
import {pitchHz} from '../ToneMath';
export class Swarm extends DSPModule {
  private readonly x=new Float64Array(4);private readonly y=new Float64Array(4);private readonly vx=new Float64Array(4);private readonly vy=new Float64Array(4);private readonly phases=new Float64Array(4);private readonly cycles=new Float64Array(4);private readonly levels=new Float64Array(4);private readonly frequencies=new Float64Array(4);private counter=0;private gate=false;
  constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);for(let i=0;i<4;i++){this.x[i]=this.random.next()*1.6-.8;this.y[i]=this.random.next()*1.6-.8;this.phases[i]=this.random.next();this.cycles[i]=this.random.next();}}
  process(sample:number){
    const energy=this.control(0,1),sympathy=this.control(1,2),kick=this.inputL[3]>.5;
    if(kick&&!this.gate)for(let i=0;i<4;i++){this.vx[i]+=(this.random.next()-.5)*2;this.vy[i]+=(this.random.next()-.5)*2;}this.gate=kick;
    if(this.counter++%32===0){
      const dt=32/this.sampleRate;
      for(let i=0;i<4;i++){
        let ax=-this.x[i]*.3,ay=-this.y[i]*.3;
        for(let j=0;j<4;j++)if(i!==j){const dx=this.x[j]-this.x[i],dy=this.y[j]-this.y[i],d=dx*dx+dy*dy+.06,f=(sympathy*2-1)*.8-.035/d;ax+=dx*f;ay+=dy*f;}
        ax+=Math.sin(TAU*this.cycles[i]+i)*energy*.7;ay+=Math.cos(TAU*this.cycles[(i+1)%4]+i)*energy*.7;
        this.vx[i]=clamp(this.vx[i]+(ax-this.vx[i]*.6)*dt,-2,2);this.vy[i]=clamp(this.vy[i]+(ay-this.vy[i]*.6)*dt,-2,2);
        this.x[i]+=this.vx[i]*dt*(.2+energy*2);this.y[i]+=this.vy[i]*dt*(.2+energy*2);
        if(Math.abs(this.x[i])>1){this.x[i]=clamp(this.x[i]);this.vx[i]*=-.65;}if(Math.abs(this.y[i])>1){this.y[i]=clamp(this.y[i]);this.vy[i]*=-.65;}
        const neighbour=this.x[(i+1)%4]*sympathy*.3;
        this.frequencies[i]=Math.min(this.sampleRate*.45,pitchHz(110,this.inputL[0],this.wide)*Math.pow(2,this.x[i]*1.7+this.y[i]*.41+neighbour));
      }
    }
    let left=0,right=0,event=false,centre=0;
    for(let i=0;i<4;i++){
      this.cycles[i]+=(.08+energy*energy*5)*(1+this.y[i]*.6)/this.sampleRate;if(this.cycles[i]>=1){this.cycles[i]%=1;event=true;}
      const target=energy*Math.pow(.5+.5*Math.cos(TAU*this.cycles[i]),3);this.levels[i]+=(target-this.levels[i])*.002;
      this.phases[i]=(this.phases[i]+this.frequencies[i]/this.sampleRate)%1;
      const signal=Math.sin(TAU*this.phases[i]+sympathy*Math.sin(TAU*this.phases[(i+1)%4])*.8)*this.levels[i]*.085;
      left+=signal*(1-this.x[i]*.5);right+=signal*(1+this.x[i]*.5);centre+=this.x[i]*.25;
    }
    this.outputL[0]=left;this.outputR[0]=right;this.outputL[1]=this.outputR[1]=centre;this.outputL[2]=this.outputR[2]=event&&energy>.001?1:0;
    if(this.outputL[2])this.triggerSample=sample;this.a=energy;this.b=sympathy;this.phase=this.cycles[0];this.envelope+=((Math.abs(left)+Math.abs(right))*2-this.envelope)*.002;
  }
  override telemetry(){return{...super.telemetry(),particles:Array.from(this.x,(x,i)=>({x,y:this.y[i],activity:this.levels[i]}))};}
}
