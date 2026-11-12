import {crushBits} from '../audio/modules/Crush';
import {slewSeconds,recoverySeconds,LOGIC_RATIO_LABELS} from '../audio/ControlMath';
import {tunedHz,shiftedHz} from '../audio/ToneMath';
import { DEFINITIONS } from '../graph/definitions';
import type { ModuleState } from '../graph/types';
export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') {
  const el = document.createElement(tag); el.className = className; el.textContent = text; return el;
}
export function button(text: string, title: string, action: () => void, className = '') {
  const el = element('button', className, text); el.type = 'button'; el.title = title; el.setAttribute('aria-label',title); el.addEventListener('click',action); return el;
}
export function formatParameter(module: ModuleState, id: string, value: number) {
  if((module.type==='OPERATOR'||module.type==='CHIP'||module.type==='OSC'||module.type==='COMB'||module.type==='PRISM'||module.type==='FERAL'||module.type==='FORMANT')&&id==='tune')return `${(module.wide?tunedHz(value,0,true).toFixed(tunedHz(value,0,true)<10?2:0):Math.round(tunedHz(value)))} Hz`;
  if(module.type==='TOUCH'&&id==='speed')return `${(.125*Math.pow(64,value)).toFixed(2)}×`;
  if(module.type==='CRUSH'&&id==='bits')return `${crushBits(value)} bit`;
  if(module.type==='SHIFT'&&id==='shift')return `${shiftedHz(value)>0?'+':''}${shiftedHz(value).toFixed(1)} Hz`;
  if(module.type==='RING'&&id==='rate')return `${(.5*Math.pow(10000,value)).toFixed(1)} Hz`;
  if(module.type==='TIDE'&&id==='flow')return `${Math.pow(10,value*2-1).toFixed(2)}×`;
  if(module.type==='COUNT'&&id==='step')return `+ ${1+Math.min(14,Math.round(value*14))}`;
  if(module.type==='COUNT'&&id==='rate'&&module.mode==='AUDIO')return `${Math.round(30*Math.pow(2,value*8))} Hz`;
  if(module.type==='MAP'&&id==='table')return ['CLEAN','SINE','FOLD','GRAY','BIT REV','GATE','TRIPLE','CURVE'][Math.min(7,Math.round(value*7))];
  if(module.type==='QUANTIZE'&&id==='span')return `${(.25+value*1.75).toFixed(2)}×`;
  if(module.type==='SLEW'){const seconds=slewSeconds(value);return seconds<1?`${Math.round(seconds*1000)} ms`:`${seconds.toFixed(1)} s`;}
  if(module.type==='DUCK'&&id==='recover'){const seconds=recoverySeconds(value);return seconds<1?`${Math.round(seconds*1000)} ms`:`${seconds.toFixed(1)} s`;}
  if(module.type==='FORMANT'&&id==='vowel')return ['A','E','I','O','U'][Math.min(4,Math.round(value*4))];
  if(module.type==='LOGIC'&&id==='ratio')return LOGIC_RATIO_LABELS[Math.min(6,Math.round(value*6))];
  if(module.type==='LOGIC'&&id==='shift')return `${Math.round((value-.5)*1000)} ms`;
  if(module.type==='LOOP'&&id==='speed')return `${((value-.5)*4).toFixed(2)}×`;
  if ((module.type === 'PULSE'||module.type==='WEFT'||module.type==='COUNT') && id === 'rate') return ['÷ 8','÷ 4','÷ 2','× 1','× 2','× 4','× 8'][Math.min(6,Math.round(value*6))];
  return `${Math.round(value * 100).toString().padStart(2,'0')}`;
}
export function parameterControl(module: ModuleState, index: number, change: (id: string,value: number) => void, large = false) {
  const definition = DEFINITIONS[module.type].parameters[index];
  const group = element('label',`parameter ${large?'large':''}`);
  const top = element('span','parameter-heading'); const name = element('span','',definition.label); const value = element('output','parameter-value',formatParameter(module,definition.id,module.params[definition.id]));
  top.append(name,value);
  const range = element('input'); range.type = 'range'; range.min = '0'; range.max = '1'; range.step = '.001'; range.value = String(module.params[definition.id]); range.dataset.parameter = definition.id; range.dataset.module = module.id;
  range.setAttribute('aria-label',`${module.type} ${definition.label}`); range.title = definition.description;
  range.style.setProperty('--value',`${module.params[definition.id]*100}%`);
  range.addEventListener('input',()=>{ const n = Number(range.value); value.value = formatParameter(module,definition.id,n); range.style.setProperty('--value',`${n*100}%`); change(definition.id,n); });
  group.append(top,range); if (large) group.append(element('p','parameter-description',definition.description));
  return group;
}
export function refreshParameters(root: HTMLElement, module: ModuleState) {
  root.querySelectorAll<HTMLInputElement>('input[data-parameter]').forEach(input=>{
    if (input.dataset.module !== module.id || document.activeElement === input) return;
    const id = input.dataset.parameter!, value = module.params[id]; input.value = String(value); input.style.setProperty('--value',`${value*100}%`);
    const output = input.parentElement?.querySelector('output'); if (output) output.value = formatParameter(module,id,value);
  });
}
