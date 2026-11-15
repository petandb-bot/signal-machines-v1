"""Review-only spectrum/level summary. No app processing or perceived-quality claim."""
import os, json, wave
os.environ.setdefault('MPLCONFIGDIR', '/tmp/phase5-matplotlib')
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root = 'docs/phase5/'
def read(path):
    with open(root + path) as f: return json.load(f)
before = read('baseline/spectra.json')['rows']
after = read('candidate-spectra.json')['rows']
raw_before = read('baseline/measurements.json')['rows']
raw_after = read('candidate-measurements.json')['rows']
rows = []
for a, b in zip(before, after):
    assert a['id'] == b['id']
    x = next(r for r in raw_before if r['id'] == a['id'] and r['seconds'] == 60)
    y = next(r for r in raw_after if r['id'] == a['id'] and r['seconds'] == 60)
    rows.append(dict(id=a['id'], before=a, after=b, quietBefore=x['quietFraction'], quietAfter=y['quietFraction'],
                     rmsBefore=x['rms'], rmsAfter=y['rms'], activeRmsBefore=x['activeWindowRms'], activeRmsAfter=y['activeWindowRms'],
                     peakBefore=x['peak'], peakAfter=y['peak'], sourceTriggersBefore=x['sourceTriggers'], sourceTriggersAfter=y['sourceTriggers']))

with wave.open('public/listening/audio/phase5/room-proposal-60s-raw.wav', 'rb') as f:
    rate=f.getframerate(); b=np.frombuffer(f.readframes(f.getnframes()),np.uint8).reshape(-1,2,3).astype(np.int32)
x=(((b[:,:,0]|b[:,:,1]<<8|b[:,:,2]<<16)^(1<<23))-(1<<23))/8388608.
size=4096; freq=np.fft.rfftfreq(size,1/rate); power=np.zeros(len(freq))
for at in range(0,len(x)-size,size*2):
    power += np.mean(abs(np.fft.rfft(x[at:at+size]*np.hanning(size)[:,None],axis=0))**2,axis=1)
proposal=dict(sub80Fraction=float(power[freq<80].sum()/power.sum()), centroidHz=float((power*freq).sum()/power.sum()),
              referenceSub80Fraction=next(r['bandPowerFraction']['sub80'] for r in before if r['id']=='room-air'))
report=dict(method='60s stereo-summed spectra and A-weighted RMS proxies from the independent reference and candidate renders. These are not LUFS, listening scores or phone-speaker certification. The separate ROOM study is not substituted in the collection.', rows=rows, roomProposal=proposal)
with open(root+'balance-summary.json','w') as f: json.dump(report,f,indent=2)

fig, axs=plt.subplots(1,2,figsize=(13,6),layout='constrained')
names=[r['id'].upper().replace('-',' ') for r in rows]; pos=np.arange(len(rows))
for ax, key, title, scale in [(axs[0],'sub80','Power below 80 Hz (%)',100),(axs[1],'a','A-weighted RMS proxy (dBFS)',1)]:
    def value(r,label):
        v=r[label]['bandPowerFraction']['sub80']*scale if key=='sub80' else 20*np.log10(max(r[label]['aWeightedRms'],1e-12))
        return v
    if key=='sub80':
        ax.barh(pos-.18,[value(r,'before') for r in rows],.34,label='v0.20 reference',color='#637a76')
        ax.barh(pos+.18,[value(r,'after') for r in rows],.34,label='Candidate',color='#328777')
    else:
        for i,r in enumerate(rows): ax.plot([value(r,'before'),value(r,'after')],[i,i],color='#adc3bd')
        ax.scatter([value(r,'before') for r in rows],pos,label='v0.20 reference',color='#637a76',marker='s')
        ax.scatter([value(r,'after') for r in rows],pos,label='Candidate',color='#328777',marker='o')
    ax.set_yticks(pos,names if key=='sub80' else []); ax.invert_yaxis(); ax.set_title(title); ax.grid(axis='x',alpha=.2)
    if key=='a': ax.set_xlim(-75,-30)
axs[0].legend(loc='lower right');fig.suptitle('Musical preset revision — measured balance, not a listening verdict')
fig.savefig(root+'preset-balance.png',dpi=130)
print('ROOM separate proposal:',proposal)
