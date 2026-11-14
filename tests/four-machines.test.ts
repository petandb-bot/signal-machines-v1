import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {Mirage} from '../src/audio/modules/Mirage';
import {Loss} from '../src/audio/modules/Loss';
import {Cuts} from '../src/audio/modules/Cuts';
import {Nerve} from '../src/audio/modules/Nerve';
import {createModule,connect} from '../src/graph/PatchGraph';
import {parsePatch} from '../src/state/PatchStorage';
import {DSPGraph} from '../src/audio/DSPGraph';
import {builtinFound} from '../src/samples/FoundData';
import {mirageReflections,lossTransmission,cutsSmallEvents,nerveRecovery,uncertainEcosystem} from '../src/state/presets';
const asset=builtinFound('machine');
describe('four machines integration and guard rails',()=>{
  it('handles every macro corner, moving targets, seeds and invalid wires at both output rates',()=>{
    for(const rate of [44100,48000])for(const [type,Class] of [['MIRAGE',Mirage],['LOSS',Loss],['CUTS',Cuts],['NERVE',Nerve]] as const)for(const seed of [1,71,0xffffffff])for(const a of [0,.5,1])for(const b of [0,.5,1]){
      const state=createModule(type,0,0,seed);Object.keys(state.params).forEach((k,i)=>state.params[k]=i?b:a);const m=new Class(state,rate,91);if(m instanceof Cuts)m.attach(asset);
      for(let i=0;i<rate*.07;i++){
        for(let p=0;p<m.inputL.length;p++){m.inputL[p]=i===3?NaN:i===4?Infinity:Math.sin(i*(p+1)*.031)*8;m.inputR[p]=-m.inputL[p];}
        m.targets[0]=Math.min(1,i/rate*10);m.smooth();m.process(i);
        for(const x of m.outputL)if(!Number.isFinite(x)||Math.abs(x)>16)throw Error(type+' unsafe value');
        for(const x of m.outputR)if(!Number.isFinite(x)||Math.abs(x)>16)throw Error(type+' unsafe value');
      }
    }
  });
  it.each([['mirage-afterimages',mirageReflections],['loss-uncertain',lossTransmission],['cuts-small-hours',cutsSmallEvents],['nerve-recovery',nerveRecovery],['uncertain-ecosystem',uncertainEcosystem]] as const)('%s persists and renders an audible protected graph',(slug,create)=>{
    const p=create(),canonical=structuredClone(p);canonical.connections.forEach((c,i)=>c.id='preset-cable-'+(i+1));expect(JSON.parse(readFileSync(new URL('../presets/'+slug+'.json',import.meta.url),'utf8'))).toEqual(canonical);expect(parsePatch(JSON.stringify(p))).toEqual(p);
    const g=new DSPGraph(48000);g.setFoundAssets([asset,builtinFound('rain')]);g.setPatch(p);let energy=0;
    for(let i=0;i<48000*3;i+=128){const l=new Float32Array(128),r=new Float32Array(128);g.process(l,r);for(const v of [...l,...r]){if(!Number.isFinite(v)||Math.abs(v)>.630001)throw Error('Master protection');energy+=v*v;}}
    expect(energy).toBeGreaterThan(.0001);expect(g.faults).toBe(0);
    const removed=p.modules.find(m=>m.type==='OUTPUT')!;p.connections=p.connections.filter(c=>c.to.module!==removed.id);g.setPatch(p);for(let i=0;i<30;i++)g.process(new Float32Array(128),new Float32Array(128));expect(g.faults).toBe(0);
  });
  it('preserves audio cycle restrictions and distinct state for multiple instances',()=>{
    const p=mirageReflections();p.modules.push(createModule('MIRAGE',0,320,901,'mirage-two'));connect(p,{module:'mirage-1',port:'audio'},{module:'mirage-two',port:'audio'});expect(()=>connect(p,{module:'mirage-two',port:'audio'},{module:'mirage-1',port:'audio'})).toThrow();const g=new DSPGraph(44100);g.setPatch(p);expect(g.modules.get('mirage-1')).not.toBe(g.modules.get('mirage-two'));
  });
});
