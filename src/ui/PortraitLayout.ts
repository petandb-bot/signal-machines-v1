import {isDelayedControl} from '../graph/GraphValidator';
import {DEFINITIONS} from '../graph/definitions';
import type {Patch} from '../graph/types';

export interface DisplayPoint {x:number;y:number}
export const PORTRAIT_COLUMN=160, PORTRAIT_ROW=168;

/** Folded rows use the gaps beside/between chips, rather than cutting across their displays. */
export function portraitCablePath(from:DisplayPoint,to:DisplayPoint,source:DisplayPoint,target:DisplayPoint,lane=0){
  if(source.y===target.y&&from.x<to.x){const bend=Math.min(30,(to.x-from.x)*.5);return`M ${from.x} ${from.y} C ${from.x+bend} ${from.y}, ${to.x-bend} ${to.y}, ${to.x} ${to.y}`;}
  const offset=(lane%5-2)*2,exit=from.x+12+offset,entry=to.x-12+offset,channel=target.y-18+offset;
  return`M ${from.x} ${from.y} H ${exit} V ${channel} H ${entry} V ${to.y} H ${to.x}`;
}

/** UI-only signal-flow order. Never writes patch modules, ports or connections. */
export function portraitOrder(patch:Patch):string[]{
  const edges=patch.connections.filter(e=>!isDelayedControl(patch,e));
  const indegree=new Map(patch.modules.map(m=>[m.id,0]));
  for(const e of edges)indegree.set(e.to.module,(indegree.get(e.to.module)??0)+1);
  const remaining=new Set(patch.modules.map(m=>m.id)),order:string[]=[];
  while(remaining.size){
    const ready=patch.modules.filter(m=>remaining.has(m.id)&&indegree.get(m.id)===0);
    // Valid graphs are acyclic apart from held controls; retain all chips on malformed input too.
    const next=(ready.length?ready:patch.modules.filter(m=>remaining.has(m.id))).sort((a,b)=>{
      const score=(id:string)=>edges.reduce((s,e)=>s+(e.to.module===id&&order.slice(-2).includes(e.from.module)?3:0),0);
      return score(b.id)-score(a.id)||a.y-b.y||a.x-b.x||a.id.localeCompare(b.id);
    })[0];
    order.push(next.id);remaining.delete(next.id);
    for(const e of edges)if(e.from.module===next.id)indegree.set(e.to.module,(indegree.get(e.to.module)??1)-1);
  }
  return order;
}

export function portraitPositions(patch:Patch):Map<string,DisplayPoint>{
  const order=portraitOrder(patch),points=new Map<string,DisplayPoint>();
  for(let i=0;i<order.length;i+=2){
    const pair=order.slice(i,i+2),row=Math.floor(i/2);
    // Choose the pair's columns using already placed neighbours; direct pairs read left-to-right.
    const cost=(reverse:boolean)=>pair.reduce((sum,id,index)=>{
      const x=(reverse?1-index:index)*PORTRAIT_COLUMN;
      return sum+patch.connections.reduce((s,e)=>{
        if(e.to.module!==id)return s;const source=points.get(e.from.module);if(!source)return s;
        const module=patch.modules.find(m=>m.id===e.from.module)!;
        const weight=DEFINITIONS[module.type].outputs.find(p=>p.id===e.from.port)?.signal==='audio'?3:1;
        return s+weight*Math.abs(source.x-x);
      },0);
    },0);
    const direct=patch.connections.some(e=>e.from.module===pair[0]&&e.to.module===pair[1]);
    const reverse=pair.length===2&&!direct&&cost(true)<cost(false);
    pair.forEach((id,j)=>points.set(id,{x:(reverse?1-j:j)*PORTRAIT_COLUMN,y:row*PORTRAIT_ROW}));
  }
  return points;
}
