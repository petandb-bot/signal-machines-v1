import {copyFileSync,mkdirSync,writeFileSync} from 'node:fs';import {api} from './lib/phase4-audio.mjs';
const {PRESETS}=await api(),dir='public/presets/curated/';mkdirSync(dir,{recursive:true});
for(const p of PRESETS)copyFileSync('presets/curated/'+p.id+'.json',dir+p.id+'.json');
writeFileSync(dir+'index.json',JSON.stringify(PRESETS.map(p=>({id:p.id,name:p.name,description:p.description,file:p.id+'.json'})),null,2)+'\n');console.log('Packaged '+PRESETS.length+' standalone curated patches.');
