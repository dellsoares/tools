(()=>{
'use strict';
const $=id=>document.getElementById(id);
const run=$('compare-run');if(!run)return;
function diffLines(a,b){
 const n=a.length,m=b.length,width=m+1;
 if(n*m>2500000)throw new Error('O texto possui linhas demais para uma comparação segura. Divida o conteúdo em partes menores.');
 const dp=new Uint32Array((n+1)*(m+1));
 for(let i=n-1;i>=0;i--){
  for(let j=m-1;j>=0;j--){
   dp[i*width+j]=a[i]===b[j]?1+dp[(i+1)*width+j+1]:Math.max(dp[(i+1)*width+j],dp[i*width+j+1]);
  }
 }
 const out=[];let i=0,j=0,added=0,removed=0,same=0;
 while(i<n||j<m){
  if(i<n&&j<m&&a[i]===b[j]){out.push({type:'same',text:a[i]});i++;j++;same++;}
  else if(i<n&&(j>=m||dp[(i+1)*width+j]>=dp[i*width+j+1])){out.push({type:'removed',text:a[i++]});removed++;}
  else{out.push({type:'added',text:b[j++]});added++;}
 }
 return {out,added,removed,same};
}
run.addEventListener('click',()=>{
 const a=$('compare-a').value.replace(/\r\n?/g,'\n').split('\n');
 const b=$('compare-b').value.replace(/\r\n?/g,'\n').split('\n');
 const status=$('compare-status');
 if(!$('compare-a').value&&!$('compare-b').value){status.textContent='Cole os textos que deseja comparar.';status.className='ws-outcome error';return;}
 if(!window.WSUsage?.consume())return;
 try{
  const result=diffLines(a,b),box=$('compare-output');box.replaceChildren();
  result.out.forEach((item,index)=>{
   const row=document.createElement('div');row.className='diff-line diff-'+item.type;
   const mark=document.createElement('span');mark.className='diff-mark';mark.textContent=item.type==='added'?'+':item.type==='removed'?'−':'·';
   const line=document.createElement('span');line.className='diff-number';line.textContent=String(index+1);
   const text=document.createElement('code');text.textContent=item.text||' ';
   row.append(mark,line,text);box.appendChild(row);
  });
  $('compare-added').textContent=`+ ${result.added} ${result.added===1?'linha':'linhas'}`;
  $('compare-removed').textContent=`− ${result.removed} ${result.removed===1?'linha':'linhas'}`;
  $('compare-same').textContent=`${result.same} ${result.same===1?'linha mantida':'linhas mantidas'}`;
  $('compare-result').hidden=false;
  status.textContent=result.added||result.removed?'Comparação concluída. Linhas adicionadas e removidas estão destacadas.':'Os textos são idênticos linha por linha.';
  status.className='ws-outcome success';
 }catch(err){status.textContent=err.message;status.className='ws-outcome error';}
});
$('compare-clear').addEventListener('click',()=>{$('compare-a').value='';$('compare-b').value='';$('compare-output').replaceChildren();$('compare-result').hidden=true;$('compare-status').textContent='Textos limpos.';});
})();