(()=>{'use strict';
const file=document.getElementById('compress-img-file'),quality=document.getElementById('compress-img-quality'),qualityOut=document.getElementById('compress-img-qvalue'),resize=document.getElementById('compress-img-resize'),format=document.getElementById('compress-img-format'),form=document.getElementById('compress-img-form'),state=document.getElementById('compress-img-state'),preview=document.getElementById('compress-img-preview'),download=document.getElementById('compress-img-download'),stats=document.getElementById('compress-img-stats'),drop=document.getElementById('compress-img-drop');
let chosen=null,obj=null,origURL=null,busy=false;
function report(t,bad=false){state.textContent=t;state.className='ws-outcome '+(bad?'error':'success')}
function fmt(n){return n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`}
function select(f){if(origURL)URL.revokeObjectURL(origURL);origURL=null;chosen=null;download.hidden=true;stats.textContent='';preview.hidden=true;if(!f)return;if(!f.type.startsWith('image/')||f.size>30*1048576){report('Escolha JPG, PNG ou WebP de até 30 MB.',true);return;}chosen=f;origURL=URL.createObjectURL(f);preview.src=origURL;preview.hidden=false;report('Imagem selecionada: '+f.name+' ('+fmt(f.size)+').');}
file.addEventListener('change',()=>select(file.files?.[0]));['dragenter','dragover'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add('dragover')}));['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove('dragover')}));drop.addEventListener('drop',e=>select(e.dataTransfer?.files?.[0]));
quality.addEventListener('input',()=>qualityOut.textContent=quality.value+'%');
form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;if(!chosen){report('Selecione uma imagem para comprimir.',true);return;}if(!WSUsage.can())return;busy=true;const button=form.querySelector('button[type=submit]');button.disabled=true;download.hidden=true;
 try{
  const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Imagem inválida ou formato não suportado.'));img.src=origURL});
  if(img.naturalWidth*img.naturalHeight>36e6)throw Error('Imagem muito grande: máximo 36 megapixels.');
  const limit=Number(resize.value),ratio=limit?Math.min(1,limit/img.naturalWidth):1;
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*ratio));c.height=Math.max(1,Math.round(img.naturalHeight*ratio));const ctx=c.getContext('2d');let mime=format.value;
  if(mime==='image/jpeg'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height)}
  ctx.drawImage(img,0,0,c.width,c.height);
  const blob=await new Promise(resolve=>c.toBlob(resolve,mime,Number(quality.value)/100));c.width=c.height=0;
  if(!blob||blob.type!==mime)throw Error('Seu navegador não conseguiu comprimir neste formato.');
  if(!WSUsage.consume())return;
  if(obj)URL.revokeObjectURL(obj);obj=URL.createObjectURL(blob);preview.src=obj;
  const diff=(1-blob.size/chosen.size)*100;stats.textContent=`Original: ${fmt(chosen.size)} · Resultado: ${fmt(blob.size)} · ${diff>=0?diff.toFixed(1)+'% menor':Math.abs(diff).toFixed(1)+'% maior'} · ${Math.round(img.naturalWidth*ratio)} × ${Math.round(img.naturalHeight*ratio)} px`;
  download.href=obj;download.download=(chosen.name.replace(/\.[^/.]+$/,'')||'imagem')+'-compactada-ws-tools.'+(mime==='image/jpeg'?'jpg':'webp');download.hidden=false;
  report(blob.size<chosen.size?'Compressão concluída. Baixe a imagem otimizada.':'O resultado ficou maior que o original. Tente WebP, qualidade menor ou largura reduzida.');
 }catch(err){report(err.message||'Falha na compressão.',true)}finally{busy=false;button.disabled=false}
});
})();
