(()=>{
'use strict';
const $=s=>document.getElementById(s);
const input=$('converter-file'),drop=$('converter-dropzone'),format=$('converter-format'),quality=$('converter-quality'),qvalue=$('converter-quality-value'),form=$('convert-form');
const error=$('converter-error'),source=$('converter-source-info'),sourceName=$('converter-source-name'),sourceDetails=$('converter-source-details');
const placeholder=$('converter-placeholder'),block=$('converter-preview-block'),origImg=$('converter-original-img'),outImg=$('converter-converted-img');
const origSize=$('converter-original-size'),outSize=$('converter-converted-size'),comp=$('converter-comparison'),download=$('converter-download'),missing=$('converter-no-result'),submit=$('converter-submit');
const sizes={ 'image/webp':'webp','image/jpeg':'jpg','image/png':'png' };
let selected=null, originalURL=null, resultURL=null, originalName='imagem', imageWidth=0,imageHeight=0, revision=0;
const formatBytes=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`;
function message(txt){error.textContent=txt;error.hidden=!txt}
function forgetResult(){if(resultURL)URL.revokeObjectURL(resultURL);resultURL=null;outImg.removeAttribute('src');outImg.hidden=true;missing.hidden=false;download.hidden=true;download.removeAttribute('href');outSize.textContent='—';comp.textContent='';}
function resetPreview(){forgetResult();if(originalURL)URL.revokeObjectURL(originalURL);originalURL=null;origImg.removeAttribute('src');block.hidden=true;placeholder.hidden=false;source.hidden=true;selected=null;imageWidth=0;imageHeight=0}
function updateQuality(){const isPng=format.value==='image/png';quality.disabled=isPng;qvalue.textContent=isPng?'Não se aplica':quality.value+'%';forgetResult();}
quality.addEventListener('input',()=>{qvalue.textContent=quality.value+'%';forgetResult()});format.addEventListener('change',updateQuality);
function loadSelection(file){
 ++revision;resetPreview();message('');
 if(!file)return;
 if(file.size>30*1024*1024){message('Selecione uma imagem de até 30 MB.');return}
 if(!file.type.startsWith('image/')&&!/\.(svg|avif|bmp|gif|png|jpe?g|webp)$/i.test(file.name)){message('Selecione um arquivo de imagem compatível.');return}
 const ticket=revision, url=URL.createObjectURL(file),image=new Image();
 image.onload=()=>{
  if(ticket!==revision){URL.revokeObjectURL(url);return}
  imageWidth=image.naturalWidth;imageHeight=image.naturalHeight;
  if(!imageWidth||!imageHeight||imageWidth*imageHeight>36000000||imageWidth>12000||imageHeight>12000){URL.revokeObjectURL(url);message('A imagem excede os limites de segurança de processamento (36 megapixels).');return}
  selected=file;originalURL=url;origImg.src=url;originalName=file.name.replace(/\.[^.]+$/,'')||'imagem';
  sourceName.textContent=file.name;sourceDetails.textContent=`${imageWidth} × ${imageHeight} px · ${formatBytes(file.size)}`;source.hidden=false;
  origSize.textContent=formatBytes(file.size);placeholder.hidden=true;block.hidden=false;
 };
 image.onerror=()=>{URL.revokeObjectURL(url);if(ticket===revision)message('Não foi possível abrir este formato de imagem neste navegador. Tente JPG, PNG ou WebP.')};
 image.src=url;
}
input.addEventListener('change',()=>loadSelection(input.files?.[0]));
['dragenter','dragover'].forEach(name=>drop.addEventListener(name,e=>{e.preventDefault();e.stopPropagation();drop.classList.add('is-dragging')}));
['dragleave','drop'].forEach(name=>drop.addEventListener(name,e=>{e.preventDefault();e.stopPropagation();drop.classList.remove('is-dragging')}));
drop.addEventListener('drop',e=>{const file=e.dataTransfer?.files?.[0];if(file){input.value='';loadSelection(file)}});
function toBlob(canvas,type,q){return new Promise(resolve=>canvas.toBlob(resolve,type,q))}
form.addEventListener('submit',async e=>{
 e.preventDefault();message('');
 if(!selected||!originalURL){message('Selecione uma imagem primeiro.');return}
 if(!WSUsage.can())return;
 const ticket=revision;
 submit.disabled=true;submit.textContent='Convertendo…';forgetResult();
 try{
  const bitmap=new Image();
  await new Promise((resolve,reject)=>{bitmap.onload=resolve;bitmap.onerror=()=>reject(Error('Não foi possível decodificar a imagem.'));bitmap.src=originalURL});
  if(ticket!==revision)return;
  const canvas=document.createElement('canvas');canvas.width=imageWidth;canvas.height=imageHeight;
  const ctx=canvas.getContext('2d',{alpha:format.value!=='image/jpeg'});
  if(!ctx)throw Error('O navegador não conseguiu criar a área de conversão.');
  if(format.value==='image/jpeg'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height)}
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const mime=format.value,blob=await toBlob(canvas,mime,Number(quality.value)/100);
  canvas.width=canvas.height=0;
  if(ticket!==revision)return;
  if(!blob)throw Error('A conversão falhou. Experimente uma imagem menor.');
  if(blob.type!==mime)throw Error('Este navegador não oferece exportação para '+sizes[mime].toUpperCase()+'. Tente outro formato ou navegador.');
  if(!WSUsage.consume())return;
  resultURL=URL.createObjectURL(blob);outImg.src=resultURL;outImg.hidden=false;missing.hidden=true;
  const delta=Math.abs((1-blob.size/selected.size)*100);
  comp.textContent=blob.size<selected.size?`Arquivo ${delta.toFixed(1)}% menor que o original.`:blob.size>selected.size?`Arquivo ${delta.toFixed(1)}% maior que o original.`:'O arquivo ficou do mesmo tamanho.';
  outSize.textContent=formatBytes(blob.size);
  download.href=resultURL;download.download=`${originalName}-ws-tools.${sizes[mime]}`;download.hidden=false;
 }catch(err){if(ticket===revision)message(err.message||'Não foi possível converter esta imagem.')}finally{submit.disabled=false;submit.innerHTML='Converter imagem <span aria-hidden="true">↗</span>'}
});
updateQuality();
})();
