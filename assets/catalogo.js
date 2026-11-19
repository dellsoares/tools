(()=>{
'use strict';
const tools={
 'gerador-link-whatsapp':{url:'./gerador-link-whatsapp/?embed=1',title:'Gerador de link do WhatsApp'},
 'contador-caracteres-palavras':{url:'./contador-caracteres-palavras/?embed=1',title:'Contador de palavras e caracteres'},
 'gerador-qr-code':{url:'./gerador-qr-code/?embed=1',title:'Gerador de QR Code'}
};
const modal=document.getElementById('tool-modal');
const frame=document.getElementById('tool-iframe');
const title=document.getElementById('modal-title');
const closeButton=document.getElementById('modal-close');
let previousFocus=null;
function openTool(id,updateHistory=true){
 const tool=tools[id];if(!tool)return;
 if(modal.hidden)previousFocus=document.activeElement;
 title.textContent=tool.title;frame.title=tool.title;modal.hidden=false;
 document.body.classList.add('modal-open');
 if(frame.getAttribute('src')!==tool.url)frame.src=tool.url;
 if(updateHistory&&location.hash!=='#'+id)history.pushState({wsTool:id},'','#'+id);
 closeButton.focus();
}
function closeTool(updateHistory=true){
 if(modal.hidden)return;
 modal.hidden=true;document.body.classList.remove('modal-open');frame.removeAttribute('src');
 if(updateHistory&&tools[decodeURIComponent(location.hash.slice(1))])history.replaceState(null,'',location.pathname+location.search);
 if(previousFocus&&previousFocus.isConnected)previousFocus.focus();
}
document.querySelectorAll('[data-tool]').forEach(link=>link.addEventListener('click',ev=>{
 if(ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.altKey||ev.button!==0)return;
 ev.preventDefault();openTool(link.dataset.tool);
}));
closeButton.addEventListener('click',()=>closeTool());
modal.addEventListener('click',e=>{if(e.target.closest('[data-close="true"]'))closeTool()});
document.addEventListener('keydown',e=>{
 if(modal.hidden)return;
 if(e.key==='Escape'){e.preventDefault();closeTool()}
 else if(e.key==='Tab'){
  const focusable=[closeButton,frame];const ix=focusable.indexOf(document.activeElement);
  if(e.shiftKey&&ix<=0){e.preventDefault();frame.focus()}
  else if(!e.shiftKey&&ix===focusable.length-1){e.preventDefault();closeButton.focus()}
 }
});
window.addEventListener('popstate',()=>{const id=decodeURIComponent(location.hash.slice(1));if(tools[id])openTool(id,false);else closeTool(false)});
if(tools[decodeURIComponent(location.hash.slice(1))])openTool(decodeURIComponent(location.hash.slice(1)),false);
const search=document.getElementById('tool-search');
const filters=Array.from(document.querySelectorAll('[data-category].category-filter'));
const cards=Array.from(document.querySelectorAll('.tool-card[data-tool]'));
const empty=document.getElementById('search-empty');
const future=document.querySelector('.future-panel');
let currentCategory='todas';
function filterTools(){
 const query=search.value.trim().toLocaleLowerCase('pt-BR');let visible=0;
 cards.forEach(card=>{
  const matchesCategory=currentCategory==='todas'||card.dataset.category===currentCategory;
  const matchesText=card.textContent.toLocaleLowerCase('pt-BR').includes(query);
  card.hidden=!(matchesCategory&&matchesText);if(!card.hidden)visible++;
 });
 if(future)future.hidden=!!query||currentCategory!=='todas';
 empty.hidden=visible!==0;
}
search.addEventListener('input',filterTools);
filters.forEach(button=>button.addEventListener('click',()=>{
 currentCategory=button.dataset.category;
 filters.forEach(x=>{const selected=x===button;x.classList.toggle('is-selected',selected);x.setAttribute('aria-pressed',String(selected))});
 filterTools();
}));
})();
