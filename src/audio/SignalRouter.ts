import { clamp } from './DSPModule';
import type { CompiledModule } from './PatchCompiler';
import { DEFINITIONS } from '../graph/definitions';
export function processModule(module: CompiledModule, sample: number, bpm: number) {
  const dsp = module.dsp; dsp.inputL.fill(0); dsp.inputR.fill(0);
  for (let i = 0; i < module.incoming.length; i++) {
    const route = module.incoming[i];
    const l = (route.delayed?route.source.delayedL:route.source.outputL)[route.output], r = (route.delayed?route.source.delayedR:route.source.outputR)[route.output];
    if (route.signal === 'trigger') { dsp.inputL[route.input] = Math.max(dsp.inputL[route.input], l); dsp.inputR[route.input] = dsp.inputL[route.input]; }
    else { dsp.inputL[route.input] += l; dsp.inputR[route.input] += r; }
  }
  const inputs = DEFINITIONS[dsp.state.type].inputs;
  for (let i = 0; i < inputs.length; i++) if (inputs[i].signal === 'control') dsp.inputL[i] = dsp.inputR[i] = clamp(dsp.inputL[i]);
  dsp.smooth(); dsp.process(sample, bpm);
}
