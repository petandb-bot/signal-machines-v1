import {readdirSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,relative} from 'node:path';
import {zipSync} from 'fflate';
const root=fileURLToPath(new URL('../',import.meta.url));
const version=JSON.parse(readFileSync(join(root,'package.json'),'utf8')).version;
const files={};
function walk(directory){
  for(const entry of readdirSync(directory,{withFileTypes:true})){
    const path=join(directory,entry.name),name=relative(root,path).replaceAll('\\','/');
    if(['node_modules','dist','.git','.openai','coverage'].includes(entry.name)||name==='public/downloads'||name==='public/listening/audio'||entry.name.startsWith('.env')||entry.name.endsWith('.log'))continue;
    if(entry.isDirectory())walk(path);else if(entry.isFile())files[`signal-machines/${name}`]=new Uint8Array(readFileSync(path));
  }
}
const roots=['src','public','presets','tests','scripts','docs','.github'];
for(const directory of roots)walk(join(root,directory));
for(const name of ['README.md','THIRD_PARTY_NOTICES.md','LICENSE','VERIFICATION.md','RESEARCH.md','ROADMAP.md','package.json','package-lock.json','index.html','vite.config.ts','tsconfig.json','.gitignore','.gitattributes']){
  files[`signal-machines/${name}`]=new Uint8Array(readFileSync(join(root,name)));
}
mkdirSync(join(root,'public/downloads'),{recursive:true});
const archive=zipSync(files,{level:6});writeFileSync(join(root,`public/downloads/signal-machines-v${version}.zip`),archive);
console.log(`Packaged ${Object.keys(files).length} source files (${archive.length} bytes).`);
