(()=>{'use strict';
const file=document.getElementById('imgs-files'),drop=document.getElementById('imgs-drop'),list=document.getElementById('imgs-list'),result=document.getElementById('imgs-result'),btn=document.getElementById('imgs-submit'),download=document.getElementById('imgs-download'),margin=document.getElementById('imgs-margin');
let items=[],url=null,busy=false;
function say(t,fail=false){result.textContent=t;result.className='ws-outcome '+(fail?'error':'success');}
function render(){list.replaceChildren();items.forEach((it,i)=>{const row=document.createElement('div');row.className='ws-thumb-item';const im=document.createElement('img');im.src=it.url;im.alt='Miniatura da página '+(i+1);row.append(im);const info=document.createElement('span');info.className='info';const strong=document.createElement('strong');strong.textContent=(i+1)+'. '+it.file.name;info.append(strong,document.createTextNode((it.file.size/1048576).toFixed(2)+' MB'));row.append(info);[['↑',i>0,()=>move(i,-1)],['↓',i<items.length-1,()=>move(i,1)],['×',true,()=>remove(i)]].forEach(([v,enabled,act])=>{const b=document.createElement('button');b.textContent=v;b.type='button';b.disabled=!enabled;b.title=v==='×'?'Remover':'Reordenar página';b.addEventListener('click',act);row.append(b);});list.append(row);});btn.disabled=!items.length||busy;}
function move(i,d){[items[i],items[i+d]]=[items[i+d],items[i]];render();}
function remove(i){const [it]=items.splice(i,1);URL.revokeObjectURL(it.url);download.hidden=true;render();}
function add(files){if(!files||!files.length)return;const arr=[...files];if(items.length+arr.length>20){say('Máximo de 20 imagens por PDF.',true);return;}for(const f of arr){if(!f.type.startsWith('image/')||f.size>20*1048576){say('Use JPG, PNG ou WebP com até 20 MB por imagem.',true);continue;}items.push({file:f,url:URL.createObjectURL(f)});}download.hidden=true;render();say(items.length+' imagem(ns) adicionada(s). Organize a ordem antes de gerar.');}
file.addEventListener('change',()=>{add(file.files);file.value='';});
['dragenter','dragover'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add('dragover')}));['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove('dragover')}));drop.addEventListener('drop',e=>add(e.dataTransfer.files));
function jpg(canvas,q=.83){return new Promise(res=>canvas.toBlob(res,'image/jpeg',q));}
async function getImg(it){const img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(Error('Imagem inválida: '+it.file.name));img.src=it.url;});if(img.naturalWidth*img.naturalHeight>36e6)throw Error('Imagem muito grande: '+it.file.name);return img;}
btn.addEventListener('click',async()=>{
 if(busy||!items.length)return;if(!WSUsage.can())return;
 busy=true;btn.disabled=true;download.hidden=true;
 try{
  const pages=[];const border=Number(margin.value),pw=595.28,ph=841.89;
  for(let i=0;i<items.length;i++){
   say('Preparando página '+(i+1)+' de '+items.length+'…');await new Promise(r=>setTimeout(r,20));
   const im=await getImg(items[i]);
   const maxPix=1600,ratio=Math.min(1,maxPix/im.naturalWidth,maxPix/im.naturalHeight),w=Math.max(1,Math.round(im.naturalWidth*ratio)),h=Math.max(1,Math.round(im.naturalHeight*ratio));
   const c=document.createElement('canvas');c.width=w;c.height=h;const cx=c.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,w,h);cx.drawImage(im,0,0,w,h);
   const blob=await jpg(c);c.width=c.height=0;if(!blob)throw Error('Erro ao converter página '+(i+1));
   const fit=Math.min((pw-2*border)/w,(ph-2*border)/h),dw=w*fit,dh=h*fit;
   pages.push({blob,imageWidth:w,imageHeight:h,pageWidth:pw,pageHeight:ph,x:(pw-dw)/2,y:(ph-dh)/2,width:dw,height:dh});
  }
  const pdf=await WSPDF.assemble(pages);if(!WSUsage.consume())return;
  if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(pdf);download.href=url;download.hidden=false;download.download='imagens-ws-tools.pdf';
  say('PDF com '+pages.length+' página(s), '+(pdf.size/1048576).toFixed(2)+' MB, criado! Baixe no botão abaixo.');
 }catch(e){say(e.message||'Não foi possível criar o PDF.',true)}finally{busy=false;render()}
});
})();
