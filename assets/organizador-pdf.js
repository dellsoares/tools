(()=>{
'use strict';
const $=id=>document.getElementById(id);
const input=$('pdf-files');if(!input)return;
const pagesEl=$('pdf-pages'),status=$('pdf-status'),exportBtn=$('pdf-export');
const docs=[];let pages=[];let busy=false;
if(window.pdfjsLib)pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
function say(text,type=''){status.textContent=text;status.className='ws-outcome'+(type?' '+type:'');}
function refresh(){
 $('pdf-page-count').textContent=pages.length+' '+(pages.length===1?'página':'páginas');
 exportBtn.disabled=!pages.length||busy;$('pdf-clear').disabled=!pages.length||busy;
 pagesEl.replaceChildren();
 pages.forEach((p,index)=>{
  const card=document.createElement('article');card.className='pdf-page-card';
  const thumb=document.createElement('div');thumb.className='pdf-page-thumb';
  if(p.thumbnail){const img=document.createElement('img');img.src=p.thumbnail;img.alt=`Prévia da página ${p.pageIndex+1}`;thumb.appendChild(img);}
  else{const wait=document.createElement('span');wait.textContent='Carregando prévia…';thumb.appendChild(wait);}
  const info=document.createElement('div');info.className='pdf-page-info';
  const name=document.createElement('strong');name.textContent=p.fileName;
  const meta=document.createElement('small');meta.textContent=`Página ${p.pageIndex+1} · ${p.rotation}°`;
  info.append(name,meta);
  const actions=document.createElement('div');actions.className='pdf-page-actions';
  const buttons=[['up','↑','Mover para cima'],['down','↓','Mover para baixo'],['rotate','↻','Girar 90 graus'],['remove','×','Remover página']];
  buttons.forEach(([action,label,title])=>{
   const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);
   b.dataset.action=action;b.dataset.index=String(index);
   if((action==='up'&&index===0)||(action==='down'&&index===pages.length-1))b.disabled=true;
   actions.appendChild(b);
  });
  card.append(thumb,info,actions);pagesEl.appendChild(card);
 });
}
async function addFile(file){
 if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf'))throw new Error(`${file.name}: selecione um arquivo PDF.`);
 const bytes=new Uint8Array(await file.arrayBuffer());
 const libDoc=await PDFLib.PDFDocument.load(bytes.slice());
 const previewDoc=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
 const docIndex=docs.length;docs.push({name:file.name,libDoc,previewDoc});
 const start=pages.length;
 for(let i=0;i<libDoc.getPageCount();i++){
  const page=libDoc.getPage(i);
  pages.push({docIndex,pageIndex:i,fileName:file.name,rotation:0,baseRotation:page.getRotation().angle||0,thumbnail:null});
 }
 for(let i=start;i<pages.length;i++){
  const item=pages[i];
  try{
   const p=await previewDoc.getPage(item.pageIndex+1);
   const base=p.getViewport({scale:1}),scale=Math.min(.32,160/base.width);
   const viewport=p.getViewport({scale});
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   await p.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   item.thumbnail=canvas.toDataURL('image/jpeg',.72);
  }catch{item.thumbnail=null;}
 }
}
input.addEventListener('change',async()=>{
 const files=Array.from(input.files||[]);if(!files.length)return;
 if(!window.PDFLib||!window.pdfjsLib){say('As bibliotecas de PDF não foram carregadas. Verifique sua conexão e atualize a página.','error');return;}
 busy=true;refresh();say('Lendo documentos e preparando as miniaturas…');
 let added=0,errors=[];
 for(const file of files){
  try{await addFile(file);added++;}
  catch(err){errors.push(`${file.name}: ${err?.message||'não foi possível ler'}`);}
 }
 busy=false;refresh();
 if(added&&errors.length)say(`${added} arquivo(s) carregado(s). Alguns foram ignorados: ${errors.join(' | ')}`,'error');
 else if(added)say(`${added} arquivo(s) adicionado(s). Use as setas para reorganizar, gire ou remova páginas.`,'success');
 else say(errors.join(' | ')||'Nenhum PDF foi carregado.','error');
 input.value='';
});
pagesEl.addEventListener('click',event=>{
 const b=event.target.closest('button[data-action]');if(!b||busy)return;
 const i=Number(b.dataset.index),action=b.dataset.action;
 if(!Number.isInteger(i)||!pages[i])return;
 if(action==='up'&&i>0){[pages[i-1],pages[i]]=[pages[i],pages[i-1]];}
 if(action==='down'&&i<pages.length-1){[pages[i+1],pages[i]]=[pages[i],pages[i+1]];}
 if(action==='rotate')pages[i].rotation=(pages[i].rotation+90)%360;
 if(action==='remove')pages.splice(i,1);
 refresh();
});
$('pdf-clear').addEventListener('click',()=>{
 pages=[];docs.length=0;refresh();say('Lista de documentos limpa.');
});
exportBtn.addEventListener('click',async()=>{
 if(!pages.length||busy)return;
 if(!window.WSUsage?.consume())return;
 busy=true;refresh();say('Montando o PDF final…');
 try{
  const out=await PDFLib.PDFDocument.create();
  for(const item of pages){
   const source=docs[item.docIndex].libDoc;
   const [copied]=await out.copyPages(source,[item.pageIndex]);
   const base=copied.getRotation().angle||item.baseRotation||0;
   copied.setRotation(PDFLib.degrees(((base+item.rotation)%360+360)%360));
   out.addPage(copied);
  }
  const bytes=await out.save();
  const blob=new Blob([bytes],{type:'application/pdf'}),href=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=href;a.download='pdf-organizado.pdf';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(href),1500);
  say(`PDF exportado com ${pages.length} página(s). O arquivo foi montado no seu navegador.`,'success');
 }catch(err){say('Não foi possível exportar o PDF: '+(err?.message||'erro inesperado'),'error');}
 finally{busy=false;refresh();}
});
})();