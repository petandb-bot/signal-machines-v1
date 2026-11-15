"""Offline scientific analysis/figure; NumPy and Matplotlib are not app dependencies."""
import json,wave,os
os.environ.setdefault("MPLCONFIGDIR","/tmp/signal-machines-matplotlib")
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path('public/listening/audio/sympathy');data=json.loads((root/'report.json').read_text());rows=[]
for couple in [0,.55,1]:
 name=f'pulse-body0.42-couple{couple}-matched.wav'
 with wave.open(str(root/name)) as w:rate=w.getframerate();audio=np.frombuffer(w.readframes(rate*2),dtype='<i2').reshape(-1,2).astype(float).mean(axis=1)/32768
 power=np.abs(np.fft.rfft(audio))**2;freq=np.fft.rfftfreq(len(audio),1/rate);indices=np.flatnonzero((power[1:-1]>power[:-2])&(power[1:-1]>power[2:]))+1
 indices=[i for i in indices if 20<freq[i]<3000 and power[i]>power.max()*.01];peaks=[]
 for i in sorted(indices,key=lambda i:power[i],reverse=True):
  if all(abs(freq[i]-v)>3 for v in peaks):peaks.append(float(freq[i]))
  if len(peaks)>=3:break
 rows.append({'file':name,'couple':couple,'dominantPeaksHz':sorted(peaks),'analysisBands':[float(power[(freq>=lo)&(freq<hi)].sum()/max(power.sum(),1e-30)) for lo,hi in [(0,250),(250,2500),(2500,rate/2)]]})
fig,axes=plt.subplots(3,1,figsize=(8,7),sharex=True,sharey=True)
for ax,item in zip(axes,data['exchanges']):
 timeline=[v for v in item['timeline'] if v['seconds']<=.25]
 for body in range(3):ax.plot([v['seconds'] for v in timeline],[v['energy'][body] for v in timeline],label=f'Body {body+1}',lw=1.5)
 ax.set_title(f"COUPLE = {item['couple']}",loc='left');ax.set_ylabel('Energy (normalized)');ax.grid(alpha=.25)
axes[0].legend(ncol=3);axes[-1].set_xlabel('Seconds after a single internal strike');fig.suptitle('Actual body energy: no coupling versus coupled exchange\nBODY = 0.1; same excitation, no audio input');fig.tight_layout();out=Path('docs/sympathy');out.mkdir(exist_ok=True);fig.savefig(out/'energy-exchange.png',dpi=160);plt.close(fig)
report={'method':'Actual exported matched WAVs; 2 s rectangular FFT (0.5 Hz bins), local maxima above1% power, >3Hz separation. These are observed response peaks, not proof of alias-free operation. Matching uses constant gain only.','rows':rows,'exchangeSummary':[]}
for item in data['exchanges']:
 report['exchangeSummary'].append({'couple':item['couple'],'maxBodyEnergy':[max(p['energy'][j] for p in item['timeline']) for j in range(3)],'totalEnergyNeverIncreases':all(sum(b['energy'])<=sum(a['energy'])+1e-12 for a,b in zip(item['timeline'],item['timeline'][1:]))})
(out/'spectral-exchange.json').write_text(json.dumps(report,indent=2)+'\n')
summary={k:v for k,v in data.items() if k not in ['measurements','exchanges']};summary['measurements']=[{k:v for k,v in m.items() if k!='timeline'} for m in data['measurements']];summary['exchanges']=[{k:v for k,v in m.items() if k!='timeline'} for m in data['exchanges']];(out/'measurements.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(report,indent=2))
