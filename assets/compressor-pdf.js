(()=>{'use strict';
const input=document.getElementById('pdf-file'),btn=document.getElementById('pdf-submit'),form=document.getElementById('pdf-form'),quality=document.getElementById('pdf-quality'),level=document.getElementById('pdf-level'),download=document.getElementById('pdf-download'),feedback=document.getElementById('pdf-feedback'),progress=document.getElementById('pdf-progress'),progressBar=document.getElementById('pdf-bar'),size=document.getElementById('pdf-size');
let url=null,busy=false;
function say(t,bad=false){feedback.textContent=t;feedback.className='ws-outcome '+(bad?'error':'success')}
function fmt(n){return n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(2)+' MB'}
input.addEventListener('change',()=>{const f=input.files?.[0];size.textContent=f?f.name+' · '+fmt(f.size):'';download.hidden=true;});
level.addEventListener('change',()=>{quality.textContent={alta:'Alta qualidade · menor redução',media:'Equilibrada',forte:'Arquivo menor · menos detalhes'}[level.value]});
function jpg(canvas,q){return new Promise(res=>canvas.toBlob(res,'image/jpeg',q))}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;const file=input.files?.[0];if(!file){say('Selecione um PDF primeiro.',true);return;}if(file.size>35*1048576){say('Selecione um PDF de até 35 MB.',true);return;}if(!WSUsage.can())return;
 busy=true;btn.disabled=true;download.hidden=true;progress.hidden=false;
 try{
  const pdfjs=window.pdfjsLib || await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
  const bytes=new Uint8Array(await file.arrayBuffer());
  const task=pdfjs.getDocument({data:bytes,useSystemFonts:true,isEvalSupported:false});const pdf=await task.promise;
  if(pdf.numPages>35)throw Error('Máximo de 35 páginas por processamento. Divida PDFs maiores.');
  const settings={alta:{scale:1.65,q:.85},media:{scale:1.3,q:.68},forte:{scale:1.0,q:.48}}[level.value],pages=[];
  for(let n=1;n<=pdf.numPages;n++){
   say('Processando página '+n+' de '+pdf.numPages+'…');progressBar.style.width=Math.round(100*(n-1)/pdf.numPages)+'%';
   await new Promise(r=>setTimeout(r,15));const page=await pdf.getPage(n),base=page.getViewport({scale:1}),viewport=page.getViewport({scale:settings.scale});
   if(viewport.width*viewport.height>16e6)throw Error('Página muito grande para renderizar no navegador.');
   const c=document.createElement('canvas');c.width=Math.round(viewport.width);c.height=Math.round(viewport.height);const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
   await page.render({canvasContext:ctx,viewport}).promise;
   const blob=await jpg(c,settings.q);if(!blob)throw Error('Falha ao rasterizar a página '+n);
   pages.push({blob,imageWidth:c.width,imageHeight:c.height,pageWidth:base.width,pageHeight:base.height,x:0,y:0,width:base.width,height:base.height});c.width=c.height=0;page.cleanup();
  }
  const compressed=await WSPDF.assemble(pages);if(!WSUsage.consume())return;
  if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(compressed);download.href=url;download.download=(file.name.replace(/\.pdf$/i,'')||'documento')+'-compactado-ws-tools.pdf';download.hidden=false;
  progressBar.style.width='100%';const percent=(1-compressed.size/file.size)*100;
  say('PDF pronto. Original: '+fmt(file.size)+' · Resultado: '+fmt(compressed.size)+' · '+(percent>=0?percent.toFixed(1)+'% menor':Math.abs(percent).toFixed(1)+'% maior')+'. Confira o resultado antes de utilizar.');
  pdf.destroy();
 }catch(err){say((err?.message||'').includes('Failed to fetch dynamically imported module')?'Não foi possível carregar a biblioteca PDF.js. Verifique sua conexão à internet e tente novamente.':err?.name==='PasswordException'?'PDF protegido por senha. Desbloqueie-o no programa de origem antes de comprimir.':err.message||'Não foi possível comprimir este PDF.',true)}finally{busy=false;btn.disabled=false;setTimeout(()=>{progress.hidden=true;progressBar.style.width='0%'},700)}
});
})();
