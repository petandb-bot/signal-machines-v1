export const TRITAVE_STEP=Math.log2(3)/13;
export const gridStep=(mode?:string)=>mode==='19-TET'?1/19:mode==='13-TRIT'?TRITAVE_STEP:1/12;
export const slewSeconds=(value:number)=>value<=.001?0:.002*Math.pow(10000,value);
export const recoverySeconds=(value:number)=>.03*Math.pow(100,value);
export const LOGIC_RATIOS=[1,3/2,4/3,5/3,7/4,11/8,Math.SQRT2] as const;
export const LOGIC_RATIO_LABELS=['1 : 1','3 : 2','4 : 3','5 : 3','7 : 4','11 : 8','√2'] as const;
export const VOWELS=[[800,1150,2900],[400,1600,2700],[300,2200,3000],[450,800,2830],[325,700,2530]] as const;
export const VOWEL_WIDTHS=[[80,90,120],[70,100,120],[60,100,120],[70,80,120],[50,70,110]] as const;
