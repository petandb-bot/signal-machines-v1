import os,json,wave
os.environ.setdefault('MPLCONFIGDIR','/tmp/phase5-matplotlib')
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root='public/listening/audio/phase5/';r=json.load(open(root+'walls-report.json'));rate=r['rate'];rows=[]
def read(name):
 with wave.open(root+name,'rb')as f:b=np.frombuffer(f.readframes(f.getnframes()),np.uint8).reshape(-1,2,3).astype(np.int32)
 return (((b[:,:,0]|b[:,:,1]<<8|b[:,:,2]<<16)^(1<<23))-(1<<23))/8388608.
fig,axes=plt.subplots(1,3,figsize=(14,4.5),layout='constrained')
for entry in r['irs']:
 d=entry['distance'];x=read('walls-ir-distance'+str(d)+'.wav');wet=x.copy();wet[0]=0;ll=(wet[:,0]**2).sum();rr=(wet[:,1]**2).sum();lr=(wet[:,0]*wet[:,1]).sum();mid=((wet[:,0]+wet[:,1])**2*.25).sum();side=((wet[:,0]-wet[:,1])**2*.25).sum();surfaces=[]
 for i,t in enumerate(entry['geometry']):
  lo=max(1,int((t-.0003)*rate));hi=int((t+.0003)*rate)+1;y=wet[lo:hi,i//4];dc=abs(y.sum());response={str(f):float(20*np.log10(max(1e-12,abs(np.sum(y*np.exp(-2j*np.pi*f*np.arange(len(y))/rate)))/max(dc,1e-12))))for f in [250,1000,4000,8000]};surfaces.append({'path':i,'seconds':t,'energy':float((y*y).sum()),'relativeResponseDb':response})
 rows.append({'distance':d,'wetCorrelation':float(lr/np.sqrt(ll*rr))if ll*rr else None,'wetMidEnergy':float(mid),'wetSideEnergy':float(side),'wetMonoFoldPowerRatio':float(mid/((ll+rr)*.5))if ll+rr else None,'surfaceResponses':surfaces})
 axes[0].plot(np.arange(int(rate*.16))/rate*1000,x[:int(rate*.16),0],label=f'D={d}');axes[1].scatter([t*1000 for t in entry['geometry']],[d]*8,label=f'D={d}');axes[2].plot([250,1000,4000,8000],[surfaces[3]['relativeResponseDb'][str(f)]for f in [250,1000,4000,8000]],'-o',label=f'D={d}, path3')
axes[0].set(xlabel='ms',ylabel='RAW impulse amplitude, left',title='Immediate direct path + finite reflections');axes[1].set(xlabel='Reflection centre /ms',ylabel='DISTANCE',title='Bounded geometry snapshots');axes[2].set(xscale='log',xlabel='Hz',ylabel='dB relative to DC',title='A single surface FIR response')
for ax in axes:ax.grid(alpha=.2);ax.legend(fontsize=7)
fig.savefig('docs/phase5/walls-response.png',dpi=125)
geometry=json.load(open('docs/phase5/walls-geometry.json'));motion=[]
for g in geometry:
 points=np.array([p['times']for p in g['geometry']]);motion.append({'case':g['case'],'maxRangePerPathMs':((points.max(axis=0)-points.min(axis=0))*1000).tolist()})
json.dump({'rate':rate,'method':'PCM24 wet-only impulses exclude direct sample. Surface windows +/-0.3ms isolate each sparse path; complex DFT magnitude normalized to its own DC. This is an abstract FIR material response, not measured real walls. Finite extent and BIBO properties come from DSP/Float32 measurements, not plot thresholds.','rows':rows,'motionGeometry':motion},open('docs/phase5/walls-analysis.json','w'),indent=2)
