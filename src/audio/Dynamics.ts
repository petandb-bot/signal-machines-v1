/** Allocation-free RK4 step for a Lorenz flow; independent state triplets share one array. */
export function stepLorenz(s:Float64Array,i:number,h:number){
  const x=s[i],y=s[i+1],z=s[i+2],a=10*(y-x),b=x*(28-z)-y,c=x*y-z*8/3;
  const x2=x+a*h*.5,y2=y+b*h*.5,z2=z+c*h*.5,a2=10*(y2-x2),b2=x2*(28-z2)-y2,c2=x2*y2-z2*8/3;
  const x3=x+a2*h*.5,y3=y+b2*h*.5,z3=z+c2*h*.5,a3=10*(y3-x3),b3=x3*(28-z3)-y3,c3=x3*y3-z3*8/3;
  const x4=x+a3*h,y4=y+b3*h,z4=z+c3*h,a4=10*(y4-x4),b4=x4*(28-z4)-y4,c4=x4*y4-z4*8/3;
  s[i]=x+h*(a+2*a2+2*a3+a4)/6;s[i+1]=y+h*(b+2*b2+2*b3+b4)/6;s[i+2]=z+h*(c+2*c2+2*c3+c4)/6;
}
export const CHAOS_RATES=[.1,.018,.00075] as const;
export const CLOCK_RATIOS=[.125,.25,.5,1,2,4,8] as const;
export function euclideanHit(step:number,hits:number,length:number){return hits>0&&(step*hits)%length<hits;}
