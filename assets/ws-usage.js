/* WS Tools — limite cotidiano por navegador, sem servidor. */
(()=>{'use strict';
const MAX=10;
const path=location.pathname.replace(/\/+$/,'').split('/').pop()||'inicio';
const nowDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const key=(id)=>'ws-tools-daily-v1:'+id+':'+nowDay();
function used(id=path){try{const n=Number(localStorage.getItem(key(id))||0);return Number.isFinite(n)?Math.min(MAX,Math.max(0,n)):0;}catch{return 0;}}
function update(){const tag=document.getElementById('ws-usage-count');if(tag)tag.textContent=String(used());const rem=document.getElementById('ws-usage-remaining');if(rem)rem.textContent=String(MAX-used());const note=document.getElementById('ws-usage-alert');if(note&&used()>=MAX){note.hidden=false;note.textContent='Você chegou aos 10 usos de hoje nesta ferramenta. Novos usos ficam disponíveis amanhã, pelo horário de Brasília.'}}
function warn(){const note=document.getElementById('ws-usage-alert');if(note){note.hidden=false;note.textContent='Limite diário atingido: 10 usos por ferramenta neste navegador. Volte amanhã.';note.scrollIntoView({behavior:'smooth',block:'nearest'});}return false;}
function can(id=path){if(used(id)>=MAX){warn();return false;}return true;}
function consume(id=path){if(!can(id))return false;try{localStorage.setItem(key(id),String(used(id)+1));}catch{}update();return true;}
window.WSUsage={can,consume,used,update,MAX,slug:path};
function init(){const nav=document.querySelector('.site-nav');if(nav&&!nav.querySelector('a[href*="categorias/"]')){const a=document.createElement('a');a.href='../categorias/';a.textContent='Categorias';nav.insertBefore(a,nav.children[1]||null)}const section=document.querySelector('.tool-hero .container');if(!section||document.getElementById('ws-usage-banner'))return;
const box=document.createElement('div');box.id='ws-usage-banner';box.className='ws-usage-banner';box.innerHTML='<span aria-hidden="true">✦</span><strong>Grátis · limite de 10 usos por dia</strong><span>Hoje: <b id="ws-usage-count">0</b>/10 · Restantes: <b id="ws-usage-remaining">10</b></span><p id="ws-usage-alert" class="ws-usage-alert" role="status" hidden></p>';
section.appendChild(box);update();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.addEventListener('storage',update);
})();
