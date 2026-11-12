import {MAX_LOOPS} from './LoopAudio';
import { DEFINITIONS } from '../graph/definitions';
import { topologicalOrder, isDelayedControl } from '../graph/GraphValidator';
import type { Patch, SignalType } from '../graph/types';
import { DSPModule } from './DSPModule';
import { Pulse } from './modules/Pulse';
import { Flock } from './modules/Flock';
import { Alloy } from './modules/Alloy';
import { Chamber } from './modules/Chamber';
import { Output } from './modules/Output';
import { Branch } from './modules/Branch';
import { Reson } from './modules/Reson';
import { Fracture } from './modules/Fracture';
import { Venom } from './modules/Venom';
import { Snap } from './modules/Snap';
import { Caustic } from './modules/Caustic';
import { Tape } from './modules/Tape';
import { Drone } from './modules/Drone';
import { Sieve } from './modules/Sieve';
import { Parasite } from './modules/Parasite';
import {Vca} from './modules/Vca';
import {Shape} from './modules/Shape';
import {Switch} from './modules/Switch';
import {Loop} from './modules/Loop';
import {Chorus} from './modules/Chorus';
import {Cloud} from './modules/Cloud';
import {Osc} from './modules/Osc';
import {Noise} from './modules/Noise';
import {Filter} from './modules/Filter';
import {Ring} from './modules/Ring';
import {Comb} from './modules/Comb';
import {Shift} from './modules/Shift';
import {Chance} from './modules/Chance';
import {Prism} from './modules/Prism';
import {Partial} from './modules/Partial';
import {Weft} from './modules/Weft';
import {Tide} from './modules/Tide';
import {Bounce} from './modules/Bounce';
import {Feral} from './modules/Feral';
import {Count} from './modules/Count';
import {ByteMap} from './modules/Map';
import {Quantize} from './modules/Quantize';
import {Slew} from './modules/Slew';
import {Formant} from './modules/Formant';
import {Logic} from './modules/Logic';
import {Duck} from './modules/Duck';
import {Swarm} from './modules/Swarm';
import {Unspent} from './modules/Unspent';
import {Sideways} from './modules/Sideways';
import {Quorum} from './modules/Quorum';
import {FaultLine} from './modules/FaultLine';
const CLASSES = { PULSE: Pulse, BRANCH: Branch, FLOCK: Flock, ALLOY: Alloy, RESON: Reson, FRACTURE: Fracture, VENOM: Venom, SNAP: Snap, CAUSTIC: Caustic, TAPE:Tape, DRONE:Drone, SIEVE:Sieve, PARASITE:Parasite, VCA:Vca, SHAPE:Shape, SWITCH:Switch, LOOP:Loop, CHORUS:Chorus, CLOUD:Cloud, OSC:Osc, NOISE:Noise, FILTER:Filter, RING:Ring, COMB:Comb, SHIFT:Shift, CHANCE:Chance, PRISM:Prism, PARTIAL:Partial, WEFT:Weft, TIDE:Tide, BOUNCE:Bounce, FERAL:Feral, COUNT:Count, MAP:ByteMap, QUANTIZE:Quantize, SLEW:Slew, FORMANT:Formant, LOGIC:Logic, DUCK:Duck, SWARM:Swarm,UNSPENT:Unspent,SIDEWAYS:Sideways,QUORUM:Quorum,'FAULT LINE':FaultLine,CHAMBER: Chamber, OUTPUT: Output };
export interface Route { source: DSPModule; output: number; input: number; signal: SignalType; delayed:boolean }
export interface CompiledModule { dsp: DSPModule; incoming: Route[] }
export function compilePatch(patch: Patch, sampleRate: number, existing = new Map<string, DSPModule>()) {
  if(patch.modules.filter(m=>m.type==='LOOP').length>MAX_LOOPS)throw new Error('A patch can contain at most 4 LOOP modules.');
  const modules = new Map<string, DSPModule>();
  for (const state of patch.modules) {
    const old = existing.get(state.id);
    const dsp = old && old.state.type === state.type && old.state.seed === state.seed ? old : new CLASSES[state.type](state, sampleRate, patch.seed);
    dsp.update(state); modules.set(state.id, dsp);
  }
  const ordered: CompiledModule[] = topologicalOrder(patch).map(id => {
    const dsp = modules.get(id)!;
    const incoming: Route[] = patch.connections.filter(e => e.to.module === id).map(e => {
      const source = modules.get(e.from.module)!;
      return { source, delayed:isDelayedControl(patch,e), output: DEFINITIONS[source.state.type].outputs.findIndex(p => p.id === e.from.port), input: DEFINITIONS[dsp.state.type].inputs.findIndex(p => p.id === e.to.port), signal: DEFINITIONS[source.state.type].outputs.find(p => p.id === e.from.port)!.signal };
    });
    dsp.inputConnected.fill(0);for(const route of incoming)dsp.inputConnected[route.input]=1;
    return { dsp, incoming };
  });
  return { modules, ordered, outputs: Array.from(modules.values()).filter(dsp => dsp.state.type === 'OUTPUT') };
}
