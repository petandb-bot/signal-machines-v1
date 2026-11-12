import { describe, expect, it } from 'vitest';
import { createModule, connect, removeModule } from '../src/graph/PatchGraph';
import { topologicalOrder, validateConnection } from '../src/graph/GraphValidator';
import { parsePatch } from '../src/state/PatchStorage';
import { metalDrift } from '../src/state/presets';
describe('validated patch graph and persistence',()=>{
  it('round trips the preset, including seeds, modes and positions',()=>{
    const patch=metalDrift();expect(parsePatch(JSON.stringify(patch))).toEqual(patch);
    expect(topologicalOrder(patch).indexOf('alloy-1')).toBeLessThan(topologicalOrder(patch).indexOf('chamber-1'));
  });
  it('accepts several control sources and several audio inputs',()=>{
    const patch=metalDrift();const flock=createModule('FLOCK',0,0,22);patch.modules.push(flock);
    expect(()=>connect(patch,{module:flock.id,port:'controlB'},{module:'alloy-1',port:'tension'})).not.toThrow();
    expect(()=>connect(patch,{module:'alloy-1',port:'audio'},{module:'output-1',port:'audio'})).not.toThrow();
  });
  it('rejects types, directions, duplicates, self connections and mixed cycles',()=>{
    const patch=metalDrift();
    const draft=(module:string,port:string,toModule:string,toPort:string)=>({id:'test',from:{module,port},to:{module:toModule,port:toPort}});
    expect(validateConnection(patch,draft('pulse-1','trigger','output-1','audio'))).toContain('TRIGGER');
    expect(validateConnection(patch,draft('alloy-1','pitch','flock-1','controlA'))).toContain('output');
    expect(validateConnection(patch,patch.connections[0])).toContain('already');
    expect(validateConnection(patch,draft('chamber-1','audio','chamber-1','audio'))).toContain('Self');
    expect(validateConnection(patch,draft('chamber-1','activity','alloy-1','tension'))).toContain('Feedback');
  });
  it('removes all related connections when a module is deleted',()=>{const patch=metalDrift();removeModule(patch,'alloy-1');expect(patch.connections).toHaveLength(1);expect(()=>parsePatch(JSON.stringify(patch))).not.toThrow();});
  it.each(['{','null','{"version":0}','{"version":99}'])('rejects invalid files without replacing state: %s',text=>{expect(()=>parsePatch(text)).toThrow();});
  it('rejects nonfinite/out-of-range values and duplicate identifiers',()=>{
    const patch=metalDrift();patch.modules[0].params.rate=1.1;expect(()=>parsePatch(JSON.stringify(patch))).toThrow('Invalid PULSE');
    patch.modules[0].params.rate=.5;patch.modules[1].id=patch.modules[0].id;expect(()=>parsePatch(JSON.stringify(patch))).toThrow('duplicate');
  });
  it('rejects a cyclic imported patch, rather than only checking newly dragged cables',()=>{
    const patch=metalDrift();patch.connections.push({id:'cycle',from:{module:'chamber-1',port:'activity'},to:{module:'alloy-1',port:'tension'}});expect(()=>parsePatch(JSON.stringify(patch))).toThrow('Feedback');
  });
});
