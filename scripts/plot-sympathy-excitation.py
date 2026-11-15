"""Measured event/energy evidence, not a perceptual quality score."""
import json, os
os.environ.setdefault('MPLCONFIGDIR','/tmp/sympathy-matplotlib')
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
r=json.load(open('public/listening/audio/sympathy-phase31/report.json'))
def row(source,version):
 return next(x for x in r['rows'] if x['input']==source and x['version']==version and x['body']==.42 and x['couple']==.55)
fig,axes=plt.subplots(2,2,figsize=(12,8),layout='constrained')
colors=['#396388','#bd6039','#477c58']
ax=axes[0,0]
for v,ls in [('before','--'),('after','-')]:
 data=row('pulse',v)['timeline'];t=np.array([x['t'] for x in data]);e=np.array([x['energy'] for x in data])
 for b in range(3):ax.semilogy(t,e[:,b],ls,color=colors[b],label=f'{v} / body {b+1}')
ax.set(xlim=(0,.6),ylim=(1e-10,1e-3),xlabel='Seconds after 2 ms input',ylabel='Normalized body energy',title='A. Stored response, unchanged passive core');ax.legend(fontsize=7,ncol=2)
ax=axes[0,1];a=row('cuts','before');b=row('cuts','after');x=np.arange(len(a['events']));w=.35
for i,v in enumerate([a,b]):ax.bar(x+(i-.5)*w,[e['first50ms']['rms'] for e in v['events']],w,label=v['version'])
ax.set_xticks(x,[f"{e['t']:.2f}s" for e in a['events']]);ax.set(xlabel='Actual CUTS source EVENT',ylabel='Raw stereo RMS, first 50 ms',title='B. Quiet events respond differently');ax.legend()
ax=axes[1,0]
for v,ls in [('before','--'),('after','-')]:
 d=row('pulse',v)['release'];ax.semilogy([x['secondsAfterInput'] for x in d],[max(x['rms'],1e-20) for x in d],ls+'o',label=v)
ax.set(xlabel='Seconds after input stops',ylabel='Raw stereo RMS / 50 ms window',title='C. No sustained excitation after silence');ax.legend()
ax=axes[1,1]
for v,ls in [('before','--'),('after','-')]:
 d=next(x for x in r['demos'] if x['slug']=='living-material' and x['version']==v);ax.plot([x['t'] for x in d['timeline']],[sum(x['energy']) for x in d['timeline']],ls,label=v)
ax.set(xlabel='Demo seconds',ylabel='Total normalized energy',title='D. LIVING MATERIAL includes unchanged TRIG');ax.legend()
for ax in axes.flat:ax.grid(alpha=.2)
fig.suptitle('SYMPATHY Phase 3.1 / measured response at 24 kHz',fontsize=15)
fig.savefig('docs/sympathy-phase31/response.png',dpi=140)
