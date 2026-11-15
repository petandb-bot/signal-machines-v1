import {writeFileSync} from 'node:fs';
import {studyApi,previous} from './lib/sympathy-study.mjs';
const {Sympathy,createModule}=await studyApi(process.argv.includes('--after')?undefined:previous),rows=[];
for(const rate of [24000,44100,48000])for(const kind of ['trigger','pulse2ms','pulse10ms','sine55','sine110','sine440','sine1000']){
 const state=createModule('SYMPATHY',0,0,71),m=new Sympathy(state,rate,31);let en=0,peak=0,early=0,late=0,input=0,maxEnergy=0,energyIntegral=0;
 for(let i=0;i<rate*3;i++){const t=i/rate,x=kind==='pulse2ms'?(t<.002?.4:0):kind==='pulse10ms'?(t<.01?.4:0):kind.startsWith('sine')&&t<1?.1*Math.sin(t*2*Math.PI*Number(kind.slice(4))):0;m.inputL[0]=m.inputR[0]=x;m.inputL[1]=kind==='trigger'&&i===0?1:0;m.process(i);const y=m.outputL[0];input+=x*x;en+=y*y;peak=Math.max(peak,Math.abs(y));if(t<.05)early+=y*y;if(t>=.1&&t<.3)late+=y*y;const e=m.energies[0]+m.energies[1]+m.energies[2];maxEnergy=Math.max(maxEnergy,e);energyIntegral+=e;}
 rows.push({rate,kind,inputRms:Math.sqrt(input/(rate*3)),rms:Math.sqrt(en/(rate*3)),peak,first50msRms:Math.sqrt(early/(rate*.05)),ms100to300Rms:Math.sqrt(late/(rate*.2)),maxBodyEnergy:maxEnergy,pickupPowerToStoredEnergy:energyIntegral?en/energyIntegral:null});
}
writeFileSync(process.argv.includes('--after')?'docs/sympathy-phase31/response.json':'docs/sympathy-phase31/audit.json',JSON.stringify({baseline:process.argv.includes('--after')?'Phase3.1 candidate':'PR15 dbde9d89, before Phase3.1 DSP changes',rows},null,2)+'\n');console.log(rows.filter(r=>r.rate===48000));
