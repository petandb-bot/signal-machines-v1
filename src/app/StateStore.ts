import type { EngineTelemetry, Patch } from '../graph/types';
import { loadLocal, saveLocal } from '../state/PatchStorage';
import { metalDrift } from '../state/presets';
export type ChangeType = 'routing' | 'parameters' | 'layout' | 'replace';
export class StateStore {
  patch: Patch;
  telemetry?: EngineTelemetry;
  selectedModule: string | null = null;
  selectedCable: string | null = null;
  private persistTimer?: ReturnType<typeof setTimeout>;
  onChange: (type: ChangeType) => void = () => {};
  onStorageError: (message: string) => void = () => {};
  initialWarning = '';
  constructor() {
    try { this.patch = loadLocal() ?? metalDrift(); }
    catch (error) { this.patch = metalDrift(); this.initialWarning = `Local patch could not be restored: ${error instanceof Error ? error.message : 'storage unavailable'}`; }
  }
  changed(type: ChangeType) {
    this.onChange(type); clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(()=>{ try { saveLocal(this.patch); } catch { this.onStorageError('Browser storage is unavailable. Use SAVE to keep this patch as a file.'); } },400);
  }
  replace(patch: Patch) {
    this.patch = patch; this.telemetry = undefined;
    this.selectedModule = null;
    this.selectedCable = null; this.changed('replace');
  }
}
