import os,json
os.environ.setdefault('MPLCONFIGDIR','/tmp/phase6-matplotlib')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
root='docs/phase6/'
b=json.load(open(root+'v021-measurements.json'));a=json.load(open(root+'candidate-measurements.json'));before=[r for r in b['rows']if r['seconds']==60];after=[r for r in a['rows']if r['seconds']==60]
y=np.arange(10);fig,axs=plt.subplots(1,3,figsize=(15,7),layout='constrained');names=[r['name']for r in before]
for ax,title,values in [(axs[0],'Quiet 20ms windows (%)',lambda r:r['quietFraction']*100),(axs[1],'Observed voice / sample events per minute',lambda r:sum(s['count']for s in r['eventStructure'].values())),(axs[2],'Stereo power spectral centroid (Hz)',lambda r:r['spectrum']['centroidHz'])]:
 ax.barh(y-.18,[values(r)for r in before],.34,color='#70837c',label='v0.21');ax.barh(y+.18,[values(r)for r in after],.34,color='#388774',label='Phase6');ax.invert_yaxis();ax.set_yticks(y,names if ax==axs[0]else[]);ax.grid(axis='x',alpha=.2);ax.set_title(title,fontsize=11)
axs[0].legend();fig.suptitle('Different structural choices — measurements are not artistic scores');fig.savefig(root+'collection.png',dpi=125)
