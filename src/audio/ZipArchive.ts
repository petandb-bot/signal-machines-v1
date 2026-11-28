/** Uncompressed ZIP builder: Blob parts avoid a second full-size copy of multi-stem PCM.
 * Local and central directory CRCs are calculated from the actual exported byte sequence. */
export interface ZipEntry {name:string; blob:Blob; checksum:number}
const table=(()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?(0xedb88320^(c>>>1)):(c>>>1);t[i]=c>>>0;}return t;})();
export function crc32Parts(parts:readonly Uint8Array[]):number{
  let crc=0xffffffff;
  for(const bytes of parts)for(let i=0;i<bytes.length;i++)crc=table[(crc^bytes[i])&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
function header(length:number){return new Uint8Array(length);}
const u16=(v:DataView,p:number,n:number)=>v.setUint16(p,n,true);
const u32=(v:DataView,p:number,n:number)=>v.setUint32(p,n>>>0,true);
const encode=(value:string)=>{
  const bytes=new TextEncoder().encode(value);
  if(!value||/[\x00-\x1f\x7f/\\]/.test(value)||value==='.'||value==='..'||bytes.length>240)throw Error('Invalid ZIP filename.');
  return bytes;
};
/** Stored ZIP; supports common DAWs and iOS Files, no giant zipSync allocation. */
export function zipBlobs(entries:readonly ZipEntry[]):Blob{
  if(entries.length<1||entries.length>16)throw Error('Invalid ZIP entry count.');
  const parts:BlobPart[]=[],central:BlobPart[]=[];
  let offset=0,centralLength=0;
  const used=new Set<string>();
  for(const entry of entries){
    if(used.has(entry.name))throw Error('Duplicate ZIP filename.');
    used.add(entry.name);
    const name=encode(entry.name),size=entry.blob.size;
    if(!Number.isSafeInteger(size)||size>0xffffffff)throw Error('ZIP entry exceeds 4 GB.');
    if(offset+30+name.length+size>0xffffffff)throw Error('ZIP archive exceeds 4 GB.');
    const local=header(30+name.length),v=new DataView(local.buffer);
    u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x0800);u16(v,8,0);u32(v,14,entry.checksum);u32(v,18,size);u32(v,22,size);u16(v,26,name.length);
    local.set(name,30);parts.push(local,entry.blob);
    const cd=header(46+name.length),d=new DataView(cd.buffer);
    u32(d,0,0x02014b50);u16(d,4,20);u16(d,6,20);u16(d,8,0x0800);u32(d,16,entry.checksum);u32(d,20,size);u32(d,24,size);u16(d,28,name.length);u32(d,42,offset);cd.set(name,46);
    central.push(cd);centralLength+=cd.length;offset+=local.length+size;
  }
  if(offset+centralLength+22>0xffffffff)throw Error('ZIP archive exceeds 4 GB.');
  const end=header(22),v=new DataView(end.buffer);
  u32(v,0,0x06054b50);u16(v,8,entries.length);u16(v,10,entries.length);u32(v,12,centralLength);u32(v,16,offset);
  return new Blob([...parts,...central,end],{type:'application/zip'});
}
