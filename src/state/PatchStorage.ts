import {validFoundRef,MAX_FOUND} from '../samples/FoundData';
import {MAX_LOOPS} from '../audio/LoopAudio';
import { DEFINITIONS,MODE_OPTIONS,WIDE_TYPES,BYPASS_TYPES } from '../graph/definitions';
import { validateConnection } from '../graph/GraphValidator';
import type { ModuleState, ModuleType, Patch } from '../graph/types';
const KEY = 'signal-machines.patch.v1';
const finite = (n: unknown, min: number, max: number): n is number => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
const validId = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(v);
export function parsePatch(text: string): Patch {
  if (text.length > 1_000_000) throw new Error('Patch files must be smaller than 1 MB.');
  let p: unknown;
  try { p = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  if (!p || typeof p !== 'object' || !('version' in p) || p.version !== 1) throw new Error('Unsupported patch version. Expected version 1.');
  const v = p as Patch;
  if(v.layout !== undefined && v.layout !== 2) throw new Error('Unsupported workspace layout.');
  if (typeof v.name !== 'string' || v.name.length > 80 || !finite(v.bpm, 20, 300) || !finite(v.master, 0, 1) || !finite(v.seed, 0, 0xffffffff) || !Number.isInteger(v.seed)) throw new Error('Invalid patch name, tempo, volume or seed.');
  if (!Array.isArray(v.modules) || v.modules.length > 48 || !Array.isArray(v.connections) || v.connections.length > 256) throw new Error('Patch exceeds the 48 module / 256 cable limit.');
  const ids = new Set<string>();
  const modules: ModuleState[] = v.modules.map(m => {
    if (!m || !validId(m.id) || ids.has(m.id) || !Object.hasOwn(DEFINITIONS, m.type) || !finite(m.x, -20000, 20000) || !finite(m.y, -20000, 20000) || !finite(m.seed, 0, 0xffffffff) || !Number.isInteger(m.seed) || !['SOFT', 'METAL', 'ROUGH'].includes(m.character)) throw new Error('Invalid or duplicate module.');
    const type = m.type as ModuleType;
    const params: Record<string, number> = {};
    for (const parameter of DEFINITIONS[type].parameters) {
      const value = m.params?.[parameter.id];
      if (!finite(value, 0, 1)) throw new Error(`Invalid ${type} ${parameter.label} value.`);
      params[parameter.id] = value;
    }
    if(m.mode!==undefined&&(typeof m.mode!=='string'||!MODE_OPTIONS[type]?.includes(m.mode)))throw new Error(`Invalid ${type} mode.`);
    if(m.wide!==undefined&&(typeof m.wide!=='boolean'||!WIDE_TYPES.includes(type)))throw new Error(`Invalid ${type} frequency range.`);
    if(m.bypass!==undefined&&(typeof m.bypass!=='boolean'||!BYPASS_TYPES.includes(type)))throw new Error(`Invalid ${type} bypass.`);
    if(m.sample!==undefined&&(type!=='FOUND'||!validFoundRef(m.sample)))throw new Error('Invalid FOUND sample reference.');
    let gesture:ModuleState['gesture'];
    if(m.gesture!==undefined){
      const g=m.gesture;if(type!=='TOUCH'||!g||!finite(g.duration,.05,12)||!Array.isArray(g.points)||g.points.length<2||g.points.length>256)throw new Error('Invalid TOUCH gesture.');
      let previous=-1;const points=g.points.map(p=>{if(!p||!finite(p.x,-1,1)||!finite(p.y,-1,1)||!finite(p.t,0,g.duration)||p.t<=previous)throw new Error('Invalid TOUCH gesture point.');previous=p.t;return{x:p.x,y:p.y,t:p.t};});
      if(points[0].t!==0||points.at(-1)!.t!==g.duration)throw new Error('TOUCH gesture timing must cover its duration.');gesture={duration:g.duration,points};
    }
    ids.add(m.id);
    return { id: m.id, type, x: v.layout === 2 ? m.x : Math.round(m.x / 16) * 8, y: v.layout === 2 ? m.y : Math.round(m.y / 16) * 8, seed: m.seed, character: m.character, params,...(m.mode===undefined?{}:{mode:m.mode}),...(m.wide===undefined?{}:{wide:m.wide}),...(m.bypass===undefined?{}:{bypass:m.bypass}),...(gesture?{gesture}:{}),...(m.sample===undefined?{}:{sample:m.sample}) };
  });
  if(modules.filter(m=>m.type==='FOUND').length>MAX_FOUND)throw new Error('A patch can contain at most 2 FOUND modules.');
  if(modules.filter(m=>m.type==='LOOP').length>MAX_LOOPS)throw new Error('A patch can contain at most 4 LOOP modules.');
  const patch: Patch = { version: 1, layout: 2, name: v.name, bpm: v.bpm, master: v.master, seed: v.seed, modules, connections: [] };
  const edgeIds = new Set<string>();
  for (const e of v.connections) {
    if (!e || !validId(e.id) || edgeIds.has(e.id) || !e.from || !e.to) throw new Error('Invalid or duplicate cable.');
    const error = validateConnection(patch, e); if (error) throw new Error(error);
    edgeIds.add(e.id);
    patch.connections.push({ id: e.id, from: {module:e.from.module,port:e.from.port}, to:{module:e.to.module,port:e.to.port} });
  }
  return patch;
}
export function saveLocal(patch: Patch) { localStorage.setItem(KEY, JSON.stringify(patch)); }
export function loadLocal(): Patch | null { const text = localStorage.getItem(KEY); return text ? parsePatch(text) : null; }
export function downloadPatch(patch: Patch) {
  const blob = new Blob([JSON.stringify(patch, null, 2)], {type:'application/json'});
  download(blob, `${patch.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'patch'}.json`);
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
