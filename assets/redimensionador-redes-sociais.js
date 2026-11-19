(()=>{
'use strict';
const $=id=>document.getElementById(id);
const fileInput=$('resize-file');if(!fileInput)return;
const preset=$('resize-preset'),custom=$('resize-custom'),run=$('resize-run'),status=$('resize-status');
let sourceFile=null,sourceUrl=null,resultUrl=null;
const quality=$('resize-quality');
function say(text,type=''){status.textContent=text;status.className='ws-outcome'+(type?' '+type:'');}
function dimensions(){
 if(preset.value==='custom')return {w:Number($('resize-width').value),h:Number($('resize-height').value)};
 const [w,h]=preset.value.split('x').map(Number);return {w,h};
}
function clearResult(){
 if(resultUrl){URL.revokeObjectURL(resultUrl);resultUrl=null;}
 $('resize-preview').replaceChildren(Object.assign(document.createElement('span'),{textContent:'A imagem redimensionada aparecerá aqui.'}));
 $('resize-facts').hidden=true;$('resize-download').hidden=true;
}
preset.addEventListener('change',()=>{custom.hidden=preset.value!=='custom';});
quality.addEventListener('input',()=>{$('resize-quality-value').textContent=quality.value+'%';});
$('resize-format').addEventListener('change',()=>{$('resize-quality-wrap').hidden=$('resize-format').value==='image/png';});
fileInput.addEventListener('change',()=>{
 sourceFile=fileInput.files?.[0]||null;run.disabled=!sourceFile;clearResult();
 if(!sourceFile){say('Selecione uma imagem para começar.');return;}
 if(!/^image\/(jpeg|png|webp)$/.test(sourceFile.type)){sourceFile=null;run.disabled=true;say('Formato não suportado. Escolha JPG, PNG ou WebP.','error');return;}
 if(sourceFile.size>25*1024*1024){sourceFile=null;run.disabled=true;say('O arquivo ultrapassa o limite recomendado de 25 MB.','error');return;}
 if(sourceUrl)URL.revokeObjectURL(sourceUrl);
 sourceUrl=URL.createObjectURL(sourceFile);
 const img=new Image();img.onload=()=>say(`Imagem carregada: ${img.naturalWidth} × ${img.naturalHeight} px.`);img.onerror=()=>say('Não foi possível abrir esta imagem.','error');img.src=sourceUrl;
});
run.addEventListener('click',async()=>{
 if(!sourceFile)return;
 const {w,h}=dimensions();
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>4000||h>4000){say('Informe largura e altura entre 1 e 4.000 pixels.','error');return;}
 if(!window.WSUsage?.consume())return;
 run.disabled=true;say('Redimensionando imagem…');
 let bitmap;
 try{
  if('createImageBitmap' in window)bitmap=await createImageBitmap(sourceFile);
  else bitmap=await new Promise((resolve,reject)=>{const im=new Image();const tempUrl=URL.createObjectURL(sourceFile);im.onload=()=>{URL.revokeObjectURL(tempUrl);resolve(im);};im.onerror=()=>{URL.revokeObjectURL(tempUrl);reject(new Error('Não foi possível abrir a imagem.'));};im.src=tempUrl;});
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{alpha:true});
  const format=$('resize-format').value,mode=$('resize-mode').value;
  if(format==='image/jpeg'||mode==='contain'){ctx.fillStyle=$('resize-background').value;ctx.fillRect(0,0,w,h);}
  const iw=bitmap.width||bitmap.naturalWidth,ih=bitmap.height||bitmap.naturalHeight;
  if(mode==='cover'){
   const scale=Math.max(w/iw,h/ih),sw=w/scale,sh=h/scale,sx=(iw-sw)/2,sy=(ih-sh)/2;
   ctx.drawImage(bitmap,sx,sy,sw,sh,0,0,w,h);
  }else{
   const scale=Math.min(w/iw,h/ih),dw=iw*scale,dh=ih*scale;
   ctx.drawImage(bitmap,(w-dw)/2,(h-dh)/2,dw,dh);
  }
  const q=Number(quality.value)/100;
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Falha ao gerar a imagem.')),format,format==='image/png'?undefined:q));
  if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl=URL.createObjectURL(blob);
  const img=document.createElement('img');img.src=resultUrl;img.alt=`Imagem redimensionada para ${w} por ${h} pixels`;
  $('resize-preview').replaceChildren(img);
  const facts=$('resize-facts');facts.replaceChildren();
  [`${w} × ${h} px`,format.replace('image/','').toUpperCase(),`${(sourceFile.size/1024).toFixed(1)} KB original`,`${(blob.size/1024).toFixed(1)} KB final`].forEach(t=>{const s=document.createElement('span');s.textContent=t;facts.appendChild(s);});
  facts.hidden=false;
  const a=$('resize-download');a.href=resultUrl;a.download=`imagem-${w}x${h}.${format==='image/jpeg'?'jpg':format==='image/png'?'png':'webp'}`;a.hidden=false;
  say('Imagem redimensionada. Confira a prévia e baixe o arquivo.','success');
 }catch(err){say('Não foi possível redimensionar a imagem: '+(err?.message||'erro inesperado'),'error');}
 finally{if(bitmap&&bitmap.close)bitmap.close();run.disabled=false;}
});
window.addEventListener('beforeunload',()=>{if(sourceUrl)URL.revokeObjectURL(sourceUrl);if(resultUrl)URL.revokeObjectURL(resultUrl);});
})();