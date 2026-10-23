// Bounded line alignment. Repository contents are always rendered as inert text.
export async function readDiffText(url,signal){
 const response=await fetch(url,{signal});if(!response.ok)throw new Error(`File request failed (${response.status}).`);
 const reader=response.body.getReader(),decoder=new TextDecoder();let text='',bytes=0;
 while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>600000){await reader.cancel();throw new Error('File exceeds the 600 KB comparison limit.');}text+=decoder.decode(value,{stream:true});}
 text+=decoder.decode();if(text.includes('\0'))throw new Error('Binary files cannot be compared as code.');return text;
}
export function diffRows(oldText,newText){
 const split=text=>text.replace(/\r\n/g,'\n').split('\n');
 const allA=split(oldText),allB=split(newText),a=allA.slice(0,2000),b=allB.slice(0,2000);
 const n=a.length,m=b.length,table=new Uint16Array((n+1)*(m+1));
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)table[i*(m+1)+j]=a[i]===b[j]?1+table[(i+1)*(m+1)+j+1]:Math.max(table[(i+1)*(m+1)+j],table[i*(m+1)+j+1]);
 const rows=[];let i=0,j=0,removed=[],added=[];
 function flush(){for(let k=0;k<Math.max(removed.length,added.length);k++)rows.push({old:removed[k],next:added[k],changed:true});removed=[];added=[];}
 while(i<n||j<m){
  if(i<n&&j<m&&a[i]===b[j]){flush();rows.push({old:{line:i+1,text:a[i++]},next:{line:j+1,text:b[j++]},changed:false});}
  else if(i<n&&(j===m||table[(i+1)*(m+1)+j]>=table[i*(m+1)+j+1]))removed.push({line:i+1,text:a[i++]});
  else added.push({line:j+1,text:b[j++]});
 }
 flush();return {rows,truncated:allA.length>2000||allB.length>2000};
}
