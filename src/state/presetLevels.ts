import type {Patch} from '../graph/types';
import {parsePatch} from './PatchStorage';

/** Fixed starting gains, from historical active-RMS/peak measurements (24 kHz).
 * Aim for roughly 0.025–0.035 active RMS where peak headroom permits, rather
 * than forcing sparse or quiet sound objects to the same average loudness.
 * No automatic normalization, compression, or changes to existing DSP.
 */
export const PRESET_GAINS:Readonly<Record<string,number>>={
  'still-almost-moving-ii':1.5,'pixel-dust':1.8,'room-air':2.5,'small-hours':4,
  'exchanging-bodies':3,'dissolving-metal':2.6,'binary-fever':3,'tape-garden':4,
  'late-light':3.3,'off-grid':3.1,'soft-circuit':1.5,'paper-windows':4.2,
  'borrowed-light':5,'velvet-engine':4,'deferred-signal':3.4,'threads-cross':1.5,
  'shattered-clock':3.3,'dissent-in-glass':2.8,'broken-radio':7,'passing-shadows':5.5
};

export function calibratePreset(id:string,patch:Patch):Patch{
  const gain=PRESET_GAINS[id]??1;
  if(gain===1)return patch;
  // Only called by curated preset creation; never applied on JSON import.
  for(const out of patch.modules.filter(m=>m.type==='OUTPUT')){
    const initial=out.params.level;
    if(initial<=0)continue;
    out.params.level=Math.min(1,initial*gain);
    let remaining=gain/(out.params.level/initial);
    if(remaining<=1.000001)continue;
    const wires=patch.connections.filter(c=>c.to.module===out.id&&c.to.port==='audio');
    if(!wires.length)continue;
    // Reuse an existing final uncompressed LEVEL when it serves only this output.
    if(wires.length===1){
      const source=patch.modules.find(m=>m.id===wires[0].from.module);
      if(source?.type==='LEVEL'&&source.params.comp===0&&
         patch.connections.filter(c=>c.from.module===source.id).length===1){
        const boost=Math.min(1,source.params.boost+20*Math.log10(remaining)/36);
        remaining/=10**((boost-source.params.boost)*36/20);
        source.params.boost=boost;
      }
    }
    if(remaining<=1.000001)continue;
    // Explicit, editable gain stage; leave all other parameters and routes intact.
    const moduleId='preset-gain-'+out.id;
    const candidates=[[out.x-176,out.y],[out.x+176,out.y],[out.x,out.y+168],[out.x,out.y-168]];
    const free=(x:number,y:number)=>x>=0&&y>=0&&patch.modules.every(m=>Math.abs(m.x-x)>=128||Math.abs(m.y-y)>=132);
    const [x,y]=candidates.find(([x,y])=>free(x,y))??[out.x,Math.max(...patch.modules.map(m=>m.y))+168];
    patch.modules.push({id:moduleId,type:'LEVEL',x,y,seed:(out.seed^0x51a1e)>>>0,character:'METAL',
      params:{boost:Math.min(1,(12+20*Math.log10(remaining))/36),comp:0}});
    for(const wire of wires)wire.to={module:moduleId,port:'audio'};
    patch.connections.push({id:'preset-gain-wire-'+out.id,from:{module:moduleId,port:'audio'},to:{module:out.id,port:'audio'}});
  }
  return parsePatch(JSON.stringify(patch));
}
