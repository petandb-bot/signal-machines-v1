"""Numerical evidence from wet-only IRs, not a listening verdict."""
import json,os,wave
os.environ.setdefault('MPLCONFIGDIR','/tmp/phase4-matplotlib')
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root='public/listening/audio/phase4/'
r=json.load(open(root+'plate-report.json'));rate=r['rate'];rows=[]
def read(path):
 with wave.open(path,'rb') as f:
  b=np.frombuffer(f.readframes(f.getnframes()),dtype=np.uint8).reshape(-1,2,3).astype(np.int32)
  x=b[:,:,0]|b[:,:,1]<<8|b[:,:,2]<<16;x=(x^(1<<23))-(1<<23);return x/8388608.
def decay(x):
 power=np.sum(x*x,axis=1) if x.ndim==2 else x*x
 edc=np.cumsum(power[::-1])[::-1];db=10*np.log10(np.maximum(edc,1e-100)/max(edc[0],1e-100));t=np.arange(len(x))/rate;mask=(db<=-5)&(db>=-25)
 if np.count_nonzero(mask)<100:return {'rt60':None,'r2':None},db
 fit=np.polyfit(t[mask],db[mask],1);pred=np.polyval(fit,t[mask]);res=np.sum((pred-db[mask])**2);tot=np.sum((db[mask]-db[mask].mean())**2)
 return {'rt60':float(-60/fit[0]),'r2':float(1-res/max(tot,1e-100)),'fitRangeDb':[-5,-25],'lastFitSecond':float(t[mask][-1])},db
fig,axes=plt.subplots(1,3,figsize=(15,4.5),layout='constrained')
for case in r['cases']:
 name=case['id'];x=read(root+'ir-'+name+'-wet.wav');summary,db=decay(x)
 density=[]
 for t in [.025,.05,.1,.2,.4,.8,1.6]:
  y=x[int(t*rate):int((t+.02)*rate),0];y=y-y.mean();std=np.sqrt(np.mean(y*y));density.append({'seconds':t,'normalizedEchoDensity':float(np.mean(np.abs(y)>std)/.3173105079) if std>1e-10 else 0,'nonzeroFraction':float(np.mean(np.abs(y)>1/8388608))})
 bins=[]
 for t in np.arange(0,.201,.01):
  y=x[round(t*rate):round((t+.01)*rate)];bins.append({'seconds':float(t),'energy':float(np.sum(y*y))})
 spectrum=np.fft.rfft(x,axis=0);f=np.fft.rfftfreq(len(x),1/rate);bands={}
 for band,lo,hi in [('low',80,500),('mid',500,3000),('high',3000,9000)]:
  bandSignal=np.fft.irfft(spectrum*((f>=lo)&(f<hi))[:,None],n=len(x),axis=0);bands[band]=decay(bandSignal)[0]
 rows.append({'id':name,'broadband':summary,'bands':bands,'echoDensity':density,'earlyEnergy10ms':bins})
 axes[0].plot(np.arange(len(db))/rate,db,label=name);axes[1].plot([d['seconds'] for d in density],[d['normalizedEchoDensity'] for d in density],'-o',label=name);axes[2].plot([80,900,6000],[bands[b]['rt60'] for b in ['low','mid','high']],'-o',label=name)
axes[0].set(xlim=(0,12),ylim=(-80,0),xlabel='Seconds',ylabel='Wet IR integrated energy / dB',title='Energy decay / dry removed')
axes[1].set(xscale='log',xlabel='Seconds / 20 ms window',ylabel='Normalized echo density',title='Temporal density growth')
axes[2].set(xscale='log',xlabel='Band reference / Hz',ylabel='T20-extrapolated RT60 / s',title='Frequency-dependent decay')
for ax in axes:ax.grid(alpha=.2)
axes[0].legend(fontsize=6);fig.savefig('docs/phase4/plate-response.png',dpi=130)
report={'rate':rate,'method':'Wet-only impulse; 20ms local Abel/Huang normalized echo density, Gaussian reference .31731. Schroeder reverse integrated energy, linear regression -5 to -25dB extrapolated to -60dB (T20), r2 retained. Broad FFT masks for band analysis are noncausal and can smear early boundaries: band results are decay estimates only, not exact filter calibration. PCM24 quantization and finite 24s IR bias very late tails. No listening/iPhone guarantee.','rows':rows}
json.dump(report,open('docs/phase4/plate-analysis.json','w'),indent=2)
print([(x['id'],round(x['broadband']['rt60'],2),[(d['seconds'],round(d['normalizedEchoDensity'],2)) for d in x['echoDensity'][:5]])for x in rows])
