import { DEFINITIONS } from './definitions';
import { validateConnection } from './GraphValidator';
import type { Connection, ModuleState, ModuleType, Patch } from './types';
export const uniqueId = () => crypto.randomUUID();
export function createModule(type: ModuleType, x: number, y: number, seed: number, id: string = uniqueId()): ModuleState {
  return { id, type, x, y, seed: seed >>> 0, character: 'METAL', params: Object.fromEntries(DEFINITIONS[type].parameters.map(p => [p.id, p.default])),...(type==='FOUND'?{sample:'builtin:room'}:{}) };
}
export function connect(patch: Patch, from: Connection['from'], to: Connection['to']) {
  const edge: Connection = { id: uniqueId(), from, to };
  const error = validateConnection(patch, edge);
  if (error) throw new Error(error);
  patch.connections.push(edge);
}
export function removeModule(patch: Patch, id: string) {
  patch.modules = patch.modules.filter(m => m.id !== id);
  patch.connections = patch.connections.filter(e => e.from.module !== id && e.to.module !== id);
}
