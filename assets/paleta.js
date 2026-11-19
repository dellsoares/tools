(()=>{'use strict';
const input=document.getElementById('pal-file'),drop=document.getElementById('pal-drop'),img=document.getElementById('pal-img'),palette=document.getElementById('pal-palette'),feedback=document.getElementById('pal-feedback'),name=document.getElementById('pal-name');
let obj=null;
function message(t,bad=false){feedback.textContent=t;feedback.className='ws-outcome '+(bad?'error':'success')}
function rgbHex(r,g,b){return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase()}
function process(file){
 if(!file)return;
 if(!WSUsage.can())return;
 if(!file.type.startsWith('image/')||file.size>15*1048576){message('Selecione JPG, PNG ou WebP com até 15 MB.',true);return;}
 const url=URL.createObjectURL(file),image=new Image();message('Analisando cores…');
 image.onload=()=>{
  try{
   if(image.naturalWidth*image.naturalHeight>36e6)throw Error('Imagem muito grande: máximo de 36 megapixels.');
   const c=document.createElement('canvas'),cx=c.getContext('2d',{willReadFrequently:true});const scale=Math.min(1,150/Math.max(image.naturalWidth,image.naturalHeight));c.width=Math.max(1,Math.round(image.naturalWidth*scale));c.height=Math.max(1,Math.round(image.naturalHeight*scale));cx.drawImage(image,0,0,c.width,c.height);
   const pix=cx.getImageData(0,0,c.width,c.height).data;const map=new Map();
   for(let i=0;i<pix.length;i+=4){if(pix[i+3]<125)continue;const r=Math.min(255,Math.round(pix[i]/24)*24),g=Math.min(255,Math.round(pix[i+1]/24)*24),b=Math.min(255,Math.round(pix[i+2]/24)*24);const key=(r<<16)|(g<<8)|b;map.set(key,(map.get(key)||0)+1);}
   const colors=[...map].sort((a,b)=>b[1]-a[1]).map(([key,weight])=>({r:key>>16&255,g:key>>8&255,b:key&255,weight}));
   const chosen=[];for(const x of colors){if(chosen.every(y=>Math.hypot(x.r-y.r,x.g-y.g,x.b-y.b)>60))chosen.push(x);if(chosen.length>=6)break;}
   if(!chosen.length)throw Error('Não foi possível extrair cores opacas dessa imagem.');
   if(!WSUsage.consume())return;
   if(obj)URL.revokeObjectURL(obj);obj=url;img.src=url;img.hidden=false;name.textContent=file.name;
   palette.replaceChildren();chosen.forEach((p,i)=>{const hex=rgbHex(p.r,p.g,p.b),button=document.createElement('button');button.className='ws-swatch';button.type='button';button.title='Copiar '+hex;button.innerHTML=`<span class="ws-swatch-color" style="background:${hex}"></span><code>${hex}</code><small>RGB ${p.r}, ${p.g}, ${p.b} · Copiar</small>`;button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(hex);message('Cor '+hex+' copiada!');}catch{message('Copie este código: '+hex);}});palette.append(button)});
   message('Extraídas '+chosen.length+' cores dominantes. Clique em uma delas para copiar o código HEX.');
  }catch(e){URL.revokeObjectURL(url);message(e.message||'Não foi possível analisar esta imagem.',true);}
 };
 image.onerror=()=>{URL.revokeObjectURL(url);message('Não foi possível ler esta imagem. Tente JPG, PNG ou WebP.',true)};image.src=url;
}
input.addEventListener('change',()=>process(input.files?.[0]));
['dragenter','dragover'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add('dragover')}));
['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove('dragover')}));
drop.addEventListener('drop',e=>process(e.dataTransfer?.files?.[0]));
})();
