import {SeededRandom} from '../DSPModule';
/** Bounded, energy-coupled relaxation. No audio noise and no free-running LFO bank. */
export class LivingField{
 readonly value:Float64Array;readonly energy:Float64Array;private readonly target:Float64Array;private readonly remaining:Float64Array;
 constructor(readonly count:number,private readonly random:SeededRandom){this.value=new Float64Array(count);this.energy=new Float64Array(count);this.target=new Float64Array(count);this.remaining=new Float64Array(count);for(let i=0;i<count;i++){this.target[i]=random.next()*2-1;this.remaining[i]=1+random.next()*7;}}
 step(dt:number){for(let i=0;i<this.count;i++){const adjacent=(i+1)%this.count;this.remaining[i]-=dt;if(this.remaining[i]<=0){this.target[i]=this.random.next()*2-1;this.remaining[i]=2+this.random.next()*13+Math.min(3,this.energy[i]*5);}const load=Math.min(1,this.energy[adjacent]*6),goal=this.target[i]*.76+this.value[adjacent]*.16+(load-.5)*.12;this.value[i]+=(goal-this.value[i])*Math.min(1,dt/(1.5+i%5+load*3));}}
}
export const unit=(x:number,fallback=0)=>Number.isFinite(x)?Math.max(0,Math.min(1,x)):fallback;
export const bipolar=(x:number)=>Number.isFinite(x)?Math.max(-1,Math.min(1,x)):0;
