(()=>{
'use strict';
const tools={'gerador-link-whatsapp':{url:'./gerador-link-whatsapp/?embed=1',title:'Gerador de link WhatsApp'}};
const modal=document.getElementById('tool-modal');
const frame=document.getElementById('tool-iframe');
const title=document.getElementById('modal-title');
const closeButton=document.getElementById('modal-close');
let previousFocus=null;
function openTool(id,updateHistory=true){
 const tool=tools[id];if(!tool)return;
 previousFocus=document.activeElement;
 title.textContent=tool.title;modal.hidden=false;document.body.classList.add('modal-open');
 frame.src=tool.url;
 if(updateHistory&&location.hash!=='#'+id)history.pushState({wsTool:id},'', '#'+id);
 closeButton.focus();
}
function closeTool(updateHistory=true){
 if(modal.hidden)return;
 modal.hidden=true;document.body.classList.remove('modal-open');frame.removeAttribute('src');
 if(updateHistory&&location.hash.startsWith('#gerador-link-whatsapp'))history.replaceState(null,'',location.pathname+location.search);
 if(previousFocus&&previousFocus.isConnected)previousFocus.focus();
}
document.querySelectorAll('[data-tool]').forEach(link=>link.addEventListener('click',ev=>{if(ev.metaKey||ev.ctrlKey||ev.shiftKey||ev.altKey||ev.button!==0)return;ev.preventDefault();openTool(link.dataset.tool)}));
closeButton.addEventListener('click',()=>closeTool());
modal.addEventListener('click',e=>{if(e.target.dataset.close==='true')closeTool()});
document.addEventListener('keydown',e=>{if(modal.hidden)return;if(e.key==='Escape'){e.preventDefault();closeTool()}else if(e.key==='Tab'){const focusable=[closeButton,frame];const ix=focusable.indexOf(document.activeElement);if(e.shiftKey&&ix<=0){e.preventDefault();frame.focus()}else if(!e.shiftKey&&ix===focusable.length-1){e.preventDefault();closeButton.focus()}}});
window.addEventListener('popstate',()=>{const id=location.hash.slice(1);if(tools[id]){if(modal.hidden)openTool(id,false)}else closeTool(false)});
if(tools[location.hash.slice(1)])openTool(location.hash.slice(1),false);
})();
