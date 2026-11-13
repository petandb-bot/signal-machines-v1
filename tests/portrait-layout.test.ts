import {describe,it,expect} from 'vitest';
import {PRESETS} from '../src/state/presets';
import {isDelayedControl} from '../src/graph/GraphValidator';
import {DEFINITIONS,portPosition} from '../src/graph/definitions';
import {portraitPositions,portraitOrder,portraitCablePath} from '../src/ui/PortraitLayout';
import complex from './fixtures/portrait-complex.json';
import small from './fixtures/portrait-small.json';
import {parsePatch} from '../src/state/PatchStorage';
const cases=[...PRESETS,...[complex,small].map(p=>({name:p.name,create:()=>parsePatch(JSON.stringify(p))}))];

describe('signal-flow portrait layout for every saved preset',()=>{
 it.each(cases)('$name has deterministic nonoverlapping rows without changing saved data',preset=>{
  const patch=preset.create(),before=JSON.stringify(patch),points=portraitPositions(patch),order=portraitOrder(patch);
  expect(points.size).toBe(patch.modules.length);expect(new Set([...points.values()].map(p=>p.x)).size).toBeLessThanOrEqual(2);
  expect(new Set([...points.values()].map(p=>`${p.x},${p.y}`)).size).toBe(patch.modules.length);
  expect(points).toEqual(portraitPositions(patch));
  for(const edge of patch.connections){
   if(!isDelayedControl(patch,edge))expect(order.indexOf(edge.from.module)).toBeLessThan(order.indexOf(edge.to.module));
   const source=patch.modules.find(m=>m.id===edge.from.module)!,target=patch.modules.find(m=>m.id===edge.to.module)!;
   const a=portPosition(points.get(source.id)!,DEFINITIONS[source.type].outputs.find(p=>p.id===edge.from.port)!);
   const b=portPosition(points.get(target.id)!,DEFINITIONS[target.type].inputs.find(p=>p.id===edge.to.port)!);
   const path=portraitCablePath(a,b,points.get(source.id)!,points.get(target.id)!);
   expect(path.startsWith(`M ${a.x} ${a.y} `)).toBe(true);expect(path).not.toMatch(/NaN|Infinity/);
   expect(path.endsWith(`H ${b.x}`)||path.endsWith(`${b.x} ${b.y}`)).toBe(true);
  }
  expect(JSON.stringify(patch)).toBe(before);
 });
});
