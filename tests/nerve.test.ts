import {describe,it,expect} from 'vitest';
import {Nerve} from '../src/audio/modules/Nerve';
import {createModule} from '../src/graph/PatchGraph';
function make(sense=.6,fatigue=.55,rate=48000,seed=7){const s=createModule('NERVE',0,0,seed);s.params={sense,fatigue};return new Nerve(s,rate,91);}
function spikes(sense:number,fatigue:number,rate=48000){const m=make(sense,fatigue,rate),events:number[]=[];for(let i=0;i<rate*6;i++){m.inputL[0]=i<rate*4?.75:0;m.inputL[1]=i%Math.round(rate*.137)===0?1:0;m.process(i);if(m.outputL[0])events.push(i);if(!Number.isFinite(m.outputL[1])||m.outputL[1]>1||m.outputL[1]<0)throw Error('bad charge');}return {m,events};}
describe('NERVE excitable state and recovery',()=>{
  it.each([44100,48000])('accumulates input and respects refractory periods at %i Hz',rate=>{
    const {events}=spikes(.6,.55,rate);expect(events.length).toBeGreaterThan(3);for(let i=1;i<events.length;i++)expect((events[i]-events[i-1])/rate).toBeGreaterThanOrEqual(.008+.55**2*.19);
    expect(new Set(events.slice(1).map((n,i)=>n-events[i])).size).toBeGreaterThan(3);
  });
  it('is deterministic, has no unprovoked firing and RESET holds all state at rest',()=>{
    expect(spikes(.6,.55).events).toEqual(spikes(.6,.55).events);const m=make();for(let i=0;i<48000;i++){m.process(i);expect(m.outputL[0]).toBe(0);}m.inputL[0]=2;for(let i=0;i<48000;i++)m.process(i);expect(m.b).toBeGreaterThan(0);m.inputL[2]=1;for(let i=0;i<100;i++)m.process(i);expect(m.a).toBe(0);expect(m.b).toBe(0);expect(m.outputL[0]).toBe(0);expect(m.triggerSample).toBe(-1);m.inputL[2]=0;for(let i=0;i<48000;i++)m.process(i);expect(m.triggerSample).toBeGreaterThan(0);
  });
  it('SENSE and FATIGUE change different parts of the event history',()=>{expect(spikes(.9,.2).events.length).toBeGreaterThan(spikes(.2,.2).events.length);expect(spikes(.9,0).events.length).toBeGreaterThan(spikes(.9,1).events.length*2);});
  it('recovers after rest and stays bounded under high-frequency or invalid stimulation',()=>{const m=make(1,0);let count=0,last=-Infinity;for(let i=0;i<96000;i++){m.inputL[0]=i%997===0?NaN:8;m.inputL[1]=i%2;m.process(i);if(m.outputL[0]){expect(i-last).toBeGreaterThanOrEqual(384);last=i;count++;}}expect(count).toBeLessThan(251);m.inputL.fill(0);for(let i=0;i<48000*10;i++)m.process(i);expect(m.a).toBeLessThan(1e-8);expect(m.b).toBeLessThan(1e-8);});
});
