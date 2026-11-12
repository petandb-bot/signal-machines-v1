import { DEFINITIONS } from './definitions';
import type { Connection, Patch } from './types';
export function isDelayedControl(patch:Patch,edge:Connection):boolean {
  const source=patch.modules.find(m=>m.id===edge.from.module);
  return !!source && DEFINITIONS[source.type].outputs.some(p=>p.id===edge.from.port&&p.signal==='control'&&p.delayed===true);
}
export function validateConnection(patch: Patch, edge: Connection): string | null {
  const source = patch.modules.find(m => m.id === edge.from.module);
  const target = patch.modules.find(m => m.id === edge.to.module);
  if (!source || !target) return 'Both modules must exist.';
  if (source.id === target.id) return 'Self connections are not supported.';
  const out = DEFINITIONS[source.type].outputs.find(p => p.id === edge.from.port);
  const into = DEFINITIONS[target.type].inputs.find(p => p.id === edge.to.port);
  if (!out || !into) return 'Connect an output to an input.';
  if (out.signal !== into.signal) return `A ${out.signal.toUpperCase()} output needs a ${out.signal.toUpperCase()} input.`;
  if (patch.connections.some(e => e.from.module === edge.from.module && e.from.port === edge.from.port && e.to.module === edge.to.module && e.to.port === edge.to.port)) return 'These ports are already connected.';
  const stack = [target.id]; const seen = new Set<string>();
  while (!isDelayedControl(patch,edge) && stack.length) {
    const id = stack.pop()!;
    if (id === source.id) return 'Feedback needs a delayed PARASITE control output.';
    if (seen.has(id)) continue;
    seen.add(id);
    for (const connection of patch.connections) if (connection.from.module === id && !isDelayedControl(patch,connection)) stack.push(connection.to.module);
  }
  if (patch.connections.length >= 256) return 'This patch has reached the 256 cable limit.';
  return null;
}
export function topologicalOrder(patch: Patch): string[] {
  const degree = new Map(patch.modules.map(m => [m.id, 0]));
  for (const e of patch.connections.filter(e=>!isDelayedControl(patch,e))) degree.set(e.to.module, degree.get(e.to.module)! + 1);
  const queue = patch.modules.filter(m => degree.get(m.id) === 0).map(m => m.id);
  for (let i = 0; i < queue.length; i++) for (const e of patch.connections) {
    if (e.from.module === queue[i] && !isDelayedControl(patch,e)) { const n = degree.get(e.to.module)! - 1; degree.set(e.to.module, n); if (n === 0) queue.push(e.to.module); }
  }
  if (queue.length !== patch.modules.length) throw new Error('The patch contains a cycle.');
  return queue;
}
