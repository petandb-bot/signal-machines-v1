import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import type p5 from 'p5';
import {PALETTE,DISPLAY_INKS,SIGNAL_INKS} from '../src/visual/Palette';
import {signalMotion,VISUAL_WIDTH,VISUAL_HEIGHT} from '../src/visual/SignalMotion';
import {drawModule} from '../src/visual/ModuleVisuals';
import {MODULE_TYPES,DEFINITIONS} from '../src/graph/definitions';
import type {ModuleTelemetry} from '../src/graph/types';
const frame=(overrides:Partial<ModuleTelemetry>={}):ModuleTelemetry=>({a:.7,b:.35,phase:.3,envelope:.65,levelL:.15,levelR:.12,triggerSample:200,wave:Array.from({length:64},(_,i)=>Math.sin(i*.37)*.12),...overrides});
class GraphicsRecorder {
  rects:number[][]=[];fills:string[]=[];private x=0;private y=0;
  background(_color:string){}noStroke(){}fill(color:string){this.fills.push(color);}push(){}pop(){this.x=this.y=0;}translate(x:number,y:number){this.x=x;this.y=y;}rect(x:number,y:number,w:number,h:number){this.rects.push([x+this.x,y+this.y,w,h]);}
}
describe('larger signal-driven chip visuals',()=>{
  it('uses a 104 × 80 logical display with more than twice the previous pixel area',()=>{expect(VISUAL_WIDTH).toBe(104);expect(VISUAL_HEIGHT).toBe(80);expect(VISUAL_WIDTH*VISUAL_HEIGHT/(96*32)).toBeGreaterThan(2.5);});
  it('rests without telemetry and responds to actual audio energy',()=>{expect(signalMotion('ALLOY')).toEqual({activity:0,rms:0,dx:0,dy:0,surge:0});const quiet=signalMotion('ALLOY',frame({wave:Array(64).fill(0),envelope:0})),active=signalMotion('ALLOY',frame());expect(quiet.activity).toBe(0);expect(active.activity).toBeGreaterThan(.5);expect(active.rms).toBeGreaterThan(0);});
  it('shows clock, modulation, faults and pressure from their actual state',()=>{expect(signalMotion('PULSE',frame({envelope:0})).activity).toBe(0);expect(signalMotion('PULSE',frame({envelope:1})).activity).toBe(1);expect(signalMotion('FLOCK',frame({envelope:0,a:.9,b:-.7})).activity).toBeGreaterThan(.8);expect(signalMotion('SNAP',frame({a:0,envelope:0,wave:[]})).activity).toBe(1);expect(signalMotion('PARASITE',frame({a:.8,b:.1})).activity).toBe(.8);});
  it('bounds internal jitter at two logical pixels and removes it in quiet mode',()=>{for(const type of MODULE_TYPES){const lively=signalMotion(type,frame()),quiet=signalMotion(type,frame(),false);expect(Math.abs(lively.dx)).toBeLessThanOrEqual(2);expect(Math.abs(lively.dy)).toBeLessThanOrEqual(2);expect(quiet.dx).toBe(0);expect(quiet.dy).toBe(0);expect(quiet.activity).toBe(lively.activity);}});
  it.each(MODULE_TYPES)('%s draws finite pixel geometry and changes with its DSP state',type=>{const first=new GraphicsRecorder(),second=new GraphicsRecorder();drawModule(first as unknown as p5.Graphics,type,frame());drawModule(second as unknown as p5.Graphics,type,frame({a:.15,b:-.7,phase:.8,envelope:.05,levelL:.01,levelR:.03,wave:Array.from({length:64},(_,i)=>Math.cos(i*.2)*.03)}));expect(first.rects.length).toBeGreaterThan(100);expect(first.rects.every(rect=>rect.every(Number.isFinite))).toBe(true);expect(first.rects).not.toEqual(second.rects);});
  it('draws deterministic state-driven patterns without consulting random or wall time',()=>{const a=new GraphicsRecorder(),b=new GraphicsRecorder(),t=frame();drawModule(a as unknown as p5.Graphics,'VENOM',t);drawModule(b as unknown as p5.Graphics,'VENOM',t);expect(a.rects).toEqual(b.rects);expect(a.fills).toEqual(b.fills);});
  it('carries each chip accent into active and resting pixels in the computer palette',()=>{const accents=new Set<string>();for(const type of MODULE_TYPES){const active=new GraphicsRecorder(),rest=new GraphicsRecorder();drawModule(active as unknown as p5.Graphics,type,frame());drawModule(rest as unknown as p5.Graphics,type);const color=DEFINITIONS[type].color;accents.add(color);expect(active.fills).toContain(color);expect(rest.fills).toContain(color);expect(/^#[0-9a-f]{6}$/.test(color)).toBe(true);}expect(accents.size).toBeGreaterThan(20);});
  it('preserves v0.14 pixel geometry for all 57 modules, including resting and quiet frames',()=>{
    const baseline=JSON.parse(readFileSync(new URL('./fixtures/v014-visual-geometry.json',import.meta.url),'utf8')).geometry;
    const cases:[ModuleTelemetry|undefined,boolean][]=[[undefined,true],[frame(),true],[frame({a:.15,b:-.7,phase:.8,envelope:.05,levelL:.01,levelR:.03,wave:Array.from({length:64},(_,i)=>Math.cos(i*.2)*.03)}),true],[frame(),false]];
    expect(Object.keys(baseline)).toHaveLength(57);
    for(const type of MODULE_TYPES.filter(type=>type in baseline))for(const [index,[state,lively]] of cases.entries()){
      const g=new GraphicsRecorder();drawModule(g as unknown as p5.Graphics,type,state,lively);
      expect(createHash('sha256').update(JSON.stringify(g.rects)).digest('hex'),`${type}, frame ${index}`).toBe(baseline[type][index]);
    }
  });
  it('uses shared inks throughout and keeps normal text and signal accents legible on dark surfaces',()=>{
    const allowed=new Set<string>([...Object.values(PALETTE),...Object.values(DISPLAY_INKS)]);
    for(const type of MODULE_TYPES){const g=new GraphicsRecorder();drawModule(g as unknown as p5.Graphics,type,frame());expect(g.fills.every(ink=>allowed.has(ink)),type).toBe(true);}
    const luminance=(hex:string)=>{const rgb=hex.slice(1).match(/../g)!.map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
    const contrast=(a:string,b:string)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
    for(const text of [PALETTE.ink,PALETTE.muted])for(const background of [PALETTE.background,PALETTE.surface,PALETTE.raised])expect(contrast(text,background)).toBeGreaterThanOrEqual(4.5);
    for(const color of new Set(Object.values(DEFINITIONS).map(d=>d.color)))expect(contrast(color,PALETTE.display)).toBeGreaterThanOrEqual(4.5);
    expect(new Set(Object.values(SIGNAL_INKS)).size).toBe(3);
  });
});
