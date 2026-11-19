(()=>{
'use strict';
const form=document.getElementById('qr-form'),content=document.getElementById('qr-content'),sizeEl=document.getElementById('qr-size'),colorEl=document.getElementById('qr-color'),colorValue=document.getElementById('qr-color-value');
const error=document.getElementById('qr-error'),placeholder=document.getElementById('qr-placeholder'),output=document.getElementById('qr-output'),canvas=document.getElementById('qr-preview'),meta=document.getElementById('qr-output-size'),success=document.getElementById('qr-success');
let ready=false;
function reset(){error.hidden=true;output.hidden=true;placeholder.hidden=false;ready=false;}
function showError(message){error.textContent=message;error.hidden=false;content.focus();}
function render(countUsage=false){
 error.hidden=true;
 const data=content.value;
 if(!data.trim()){reset();showError('Informe um link ou algum texto para gerar o QR Code.');return;}
 // Local encoder supports up to QR version 40, with limits that vary by Unicode bytes.
 try{
   // A biblioteca local recebe bytes: codificamos textos Unicode como UTF-8.
   const bytes=new TextEncoder().encode(data);
   if(bytes.length>2953)throw new Error('Capacidade excedida');
   let byteText='';
   for(let i=0;i<bytes.length;i+=1024)byteText+=String.fromCharCode(...bytes.subarray(i,i+1024));
   const qr=new window.WSQR(-1,1);
   qr.addData(byteText);qr.make();
   const n=qr.getModuleCount(),margin=4,sz=Number(sizeEl.value),cell=sz/(n+margin*2),ctx=canvas.getContext('2d');
   canvas.width=sz;canvas.height=sz;
   ctx.fillStyle='#ffffff';ctx.fillRect(0,0,sz,sz);
   ctx.fillStyle=colorEl.value;
   for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.isDark(y,x)){
      let sx=Math.floor((x+margin)*cell),sy=Math.floor((y+margin)*cell);
      let ex=Math.ceil((x+margin+1)*cell),ey=Math.ceil((y+margin+1)*cell);
      ctx.fillRect(sx,sy,ex-sx,ey-sy);
   }
   if(countUsage&&!WSUsage.consume())return;
   placeholder.hidden=true;output.hidden=false;meta.textContent=sz+' × '+sz+' px';success.textContent='QR Code gerado com sucesso.';ready=true;
 }catch(e){reset();showError('Não foi possível gerar: o conteúdo é grande demais para um único QR Code. Reduza o texto e tente novamente.');}
}
form.addEventListener('submit',e=>{e.preventDefault();if(!WSUsage.can())return;render(true);});
content.addEventListener('input',reset);
sizeEl.addEventListener('change',()=>{if(ready)render();});
colorEl.addEventListener('input',()=>{colorValue.textContent=colorEl.value.toUpperCase();if(ready)render();});
document.getElementById('qr-clear').addEventListener('click',()=>{content.value='';reset();content.focus()});
document.getElementById('qr-download').addEventListener('click',()=>{if(!ready)return;canvas.toBlob(blob=>{if(!blob){success.textContent='Não foi possível exportar a imagem.';return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='ws-tools-qr-code.png';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);},'image/png');});
})();
