import {DSPModule,clamp,TAU} from '../DSPModule';
const reverse=(n:number)=>{let r=0;for(let b=0;b<8;b++)r|=((n>>b)&1)<<(7-b);return r;};
export const BYTE_TABLES=Array.from({length:8},(_,bank)=>Uint8Array.from({length:256},(_,n)=>{
  if(n===128)return 128;const x=n/255;
  const value=bank===0?n:bank===1?127.5+127.5*Math.sin(TAU*x):bank===2?255*(1-Math.abs(4*x%2-1)):bank===3?(n^(n>>1)):bank===4?reverse(n):bank===5?((n&32)?224:32):bank===6?(n*3)&255:255*4*x*(1-x);
  return Math.max(0,Math.min(255,Math.round(value)));
}));
export class ByteMap extends DSPModule {
  private readonly weights=new Float64Array([1,0,0,0,0,0,0,0]);private readonly slew=1-Math.exp(-1/(this.sampleRate*.006));private gate=false;private held=0;private high=false;
  private map(value:number){const code=Math.round((clamp(value)+1)*127.5);let output=0;for(let i=0;i<8;i++)output+=((BYTE_TABLES[i][code]-128)/128)*this.weights[i];return clamp(output);}
  process(sample:number){
    const table=Math.min(7,Math.round(this.control(0,2)*7)),amount=this.parameters[1];for(let i=0;i<8;i++)this.weights[i]+=((i===table?1:0)-this.weights[i])*this.slew;
    const input=this.inputConnected[1]?this.inputL[1]:this.inputConnected[0]?this.inputL[0]:0,clock=this.inputL[3]>.5,mapped=input*(1-amount)+this.map(input)*amount;
    if(!this.inputConnected[3]||(clock&&!this.gate))this.held=clamp(mapped);this.gate=clock;
    this.outputL[0]=this.inputL[0]*(1-amount)+this.map(this.inputL[0])*.3*amount;this.outputR[0]=this.inputR[0]*(1-amount)+this.map(this.inputR[0])*.3*amount;
    this.outputL[1]=this.outputR[1]=this.held;const high=this.held>.1;this.outputL[2]=this.outputR[2]=high&&!this.high?1:0;if(high&&!this.high)this.triggerSample=sample;this.high=high;
    this.a=clamp(input);this.b=this.held;this.phase=table/7;this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;
  }
  override telemetry(){return{...super.telemetry(),curve:Array.from({length:64},(_,i)=>(BYTE_TABLES[Math.round(this.phase*7)][i*4]-128)/128)};}
}
