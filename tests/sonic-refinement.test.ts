import {describe,expect,it} from 'vitest';
import {createModule,connect} from '../src/graph/PatchGraph';
import {parsePatch} from '../src/state/PatchStorage';
import {emptyPatch} from '../src/state/presets';
import {DSPGraph} from '../src/audio/DSPGraph';
import {DSPModule} from '../src/audio/DSPModule';
import {Chip} from '../src/audio/modules/Chip';
import {RefinedChip} from '../src/audio/modules/RefinedChip';
import {Reson} from '../src/audio/modules/Reson';
import {RefinedReson} from '../src/audio/modules/RefinedReson';
import {Chamber} from '../src/audio/modules/Chamber';
import {RefinedChamber} from '../src/audio/modules/RefinedChamber';
import {Plate} from '../src/audio/modules/Plate';
import {RefinedPlate} from '../src/audio/modules/RefinedPlate';
import {tunedHz} from '../src/audio/ToneMath';

const RATE=48000;

describe('Phase 7 opt-in sonic refinement',()=>{
  it.each([24000,44100,48000])('preserves legacy DSP samples exactly at %i Hz',rate=>{
    for(const [type,Old,New] of [
      ['CHIP',Chip,RefinedChip],['RESON',Reson,RefinedReson],
      ['CHAMBER',Chamber,RefinedChamber],['PLATE',Plate,RefinedPlate]
    ] as const){
      const s=createModule(type,0,0,17,'voice');
      const a:DSPModule=new Old(s,rate,31),b:DSPModule=new New(s,rate,31);
      if(type==='CHIP'){a.inputConnected[1]=b.inputConnected[1]=1;}
      for(let i=0;i<rate*.6;i++){
        const x=.1*Math.sin(2*Math.PI*173*i/rate),y=.04*Math.sin(2*Math.PI*571*i/rate+.23);
        a.inputL[0]=b.inputL[0]=type==='CHIP'?0:type==='RESON'?i===0?1:0:x;
        a.inputR[0]=b.inputR[0]=type==='CHIP'?0:x;
        if(type==='CHIP'){a.inputL[1]=b.inputL[1]=i%Math.floor(rate*.17)===0?1:0;}
        if(type==='RESON'){a.inputL[2]=b.inputL[2]=x;a.inputR[2]=b.inputR[2]=y;}
        a.smooth();b.smooth();a.process(i,120);b.process(i,120);
        for(let p=0;p<a.outputL.length;p++){
          expect(b.outputL[p]).toBe(a.outputL[p]);
          expect(b.outputR[p]).toBe(a.outputR[p]);
        }
      }
    }
  },25000);

  it('reduces a known folded third harmonic without suppressing CHIP quantization',()=>{
    const states=['PULSE','PULSE CLEAN'].map(mode=>{
      const s=createModule('CHIP',0,0,99);s.wide=true;s.mode=mode;
      s.params.tune=.92;s.params.character=.3;
      return s;
    });
    const raw=new Chip(states[0],RATE,31),clean=new RefinedChip(states[1],RATE,31);
    const requested=tunedHz(.92,0,true),freq=111860/Math.round(111860/requested);
    const folded=Math.abs(RATE-3*freq),results:number[]=[];
    for(const module of [raw,clean]){
      let cosine=0,sine=0,energy=0;
      for(let i=0;i<RATE*2;i++){
        module.process(i);
        if(i>=RATE){
          const v=module.outputL[0],angle=2*Math.PI*folded*i/RATE;
          cosine+=v*Math.cos(angle);sine+=v*Math.sin(angle);energy+=v*v;
        }
        expect(Number.isFinite(module.outputL[0])).toBe(true);
      }
      expect(energy).toBeGreaterThan(1);results.push(Math.hypot(cosine,sine));
    }
    expect(results[1]).toBeLessThan(results[0]*.65);
  },18000);

  it.each(['PULSE CLEAN','TRIANGLE CLEAN'])('%s remains bounded and transitions without output discontinuities',mode=>{
    const s=createModule('CHIP',0,0,77);s.mode='PULSE';
    s.params.character=.28;s.params.tune=.6;
    const module=new RefinedChip(s,RATE,19);
    let maxStep=0,previous=0,max=0;
    for(let i=0;i<RATE*1.2;i++){
      if(i===RATE*.25)module.selectedMode=mode;
      if(i===RATE*.7)module.selectedMode='PULSE';
      module.process(i);
      const v=module.outputL[0];
      if(i>1)maxStep=Math.max(maxStep,Math.abs(v-previous));
      max=Math.max(max,Math.abs(v));previous=v;
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(max).toBeLessThan(.4);expect(maxStep).toBeLessThan(.32);
  },15000);

  it('reduces a sustained resonator low-mid buildup without deleting the note',()=>{
    const s=createModule('RESON',0,0,12);s.params.material=.22;s.params.decay=.95;
    const basic=new Reson(s,RATE,13),focused=new RefinedReson(s,RATE,13);
    focused.selectedMode='FOCUS';
    let a=0,b=0;
    for(let i=0;i<RATE;i++){
      const input=.11*Math.sin(2*Math.PI*110*i/RATE);
      basic.inputL[2]=focused.inputL[2]=input;
      basic.inputR[2]=focused.inputR[2]=input;
      basic.process(i);focused.process(i);
      if(i>RATE*.25){a+=basic.outputL[0]**2;b+=focused.outputL[0]**2;}
    }
    expect(a).toBeGreaterThan(1e-6);
    expect(b).toBeLessThan(a*.97);
    expect(b).toBeGreaterThan(a*.35);
  },15000);

  it.each([
    {name:'CHAMBER',Legacy:Chamber,Revised:RefinedChamber,cleanMode:'CLEAR ROOM',dryFactor:(density:number):number=>1-(.26+density*.48)*.45},
    {name:'PLATE',Legacy:Plate,Revised:RefinedPlate,cleanMode:'CLEAR',dryFactor:(_density:number):number=>.72},
  ])('$name removes low-frequency energy from the wet tail without touching the dry path',({name,Legacy,Revised,cleanMode,dryFactor})=>{
    const s=createModule(name as 'CHAMBER'|'PLATE',0,0,67);
    const old=new Legacy(s,RATE,9),now=new Revised(s,RATE,9);
    now.selectedMode=cleanMode;
    let wetA=0,wetB=0,early=0;
    const factor=dryFactor(name==='CHAMBER'?s.params.density:.5);
    for(let i=0;i<RATE*2;i++){
      const source=i<RATE*1.7?.15*Math.sin(2*Math.PI*115*i/RATE):0;
      old.inputL[0]=now.inputL[0]=source;old.inputR[0]=now.inputR[0]=source*.7;
      old.process();now.process();
      expect(Number.isFinite(now.outputL[0])).toBe(true);
      if(i>RATE*.6&&i<RATE*1.7){
        wetA+=(old.outputL[0]-source*factor)**2;
        wetB+=(now.outputL[0]-source*factor)**2;
      }
      if(i===0)early=Math.abs(old.outputL[0]-now.outputL[0]);
    }
    expect(early).toBeLessThan(1e-12);
    expect(wetA).toBeGreaterThan(1e-7);
    expect(wetB).toBeLessThan(wetA*.95);
    expect(wetB).toBeGreaterThan(wetA*.05);
  },18000);

  it('serializes opt-in modes, bounds stereo at the master and preserves the two-slider interface',()=>{
    const patch=emptyPatch();
    const src=createModule('CHIP',0,0,99,'source');src.mode='PULSE CLEAN';
    const res=createModule('RESON',160,0,98,'res');res.mode='FOCUS';
    const plate=createModule('PLATE',320,0,97,'reverb');plate.mode='CLEAR';
    const out=createModule('OUTPUT',480,0,96,'out');
    patch.modules=[src,res,plate,out];
    connect(patch,{module:'source',port:'audio'},{module:'res',port:'excite'});
    connect(patch,{module:'res',port:'audio'},{module:'reverb',port:'audio'});
    connect(patch,{module:'reverb',port:'audio'},{module:'out',port:'audio'});
    expect(parsePatch(JSON.stringify(patch))).toEqual(patch);
    const graph=new DSPGraph(RATE);graph.setPatch(patch);
    for(let block=0;block<350;block++){
      const l=new Float32Array(128),r=new Float32Array(128);
      graph.process(l,r);
      for(let i=0;i<l.length;i++){
        expect(Number.isFinite(l[i])&&Number.isFinite(r[i])).toBe(true);
        expect(Math.abs(l[i])).toBeLessThanOrEqual(.630001);
        expect(Math.abs(r[i])).toBeLessThanOrEqual(.630001);
      }
    }
    expect(graph.faults).toBe(0);
  });
});
