(()=>{
'use strict';
const tools={"mega-conversor-pdf":{"url":"./mega-conversor-pdf/?embed=1","title":"Mega Conversor PDF WS"},"compressor-video":{"url":"./compressor-video/?embed=1","title":"Compressor de Vídeo WS"},"compressor-audio":{"url":"./compressor-audio/?embed=1","title":"Compressor de Áudio WS"},"extrair-audio-video":{"url":"./extrair-audio-video/?embed=1","title":"Extrair Áudio de Vídeo WS"},"gerador-link-whatsapp":{"url":"./gerador-link-whatsapp/?embed=1","title":"Gerador de link WhatsApp"},"contador-caracteres-palavras":{"url":"./contador-caracteres-palavras/?embed=1","title":"Contador de palavras e caracteres"},"gerador-qr-code":{"url":"./gerador-qr-code/?embed=1","title":"Gerador de QR Code"},"timer-pomodoro":{"url":"./timer-pomodoro/?embed=1","title":"Timer Pomodoro"},"conversor-imagens":{"url":"./conversor-imagens/?embed=1","title":"Conversor de imagens JPG, PNG e WebP"},"extrator-paleta-imagem":{"url":"./extrator-paleta-imagem/?embed=1","title":"Extrator de cores de imagem"},"compressor-imagem":{"url":"./compressor-imagem/?embed=1","title":"Compressor de imagens"},"compressor-pdf":{"url":"./compressor-pdf/?embed=1","title":"Compressor de PDF"},"imagens-para-pdf":{"url":"./imagens-para-pdf/?embed=1","title":"Imagens para PDF"},"gerador-utm":{"url":"./gerador-utm/?embed=1","title":"Gerador de links UTM"},"gerador-meta-tags":{"url":"./gerador-meta-tags/?embed=1","title":"Gerador de Meta Tags e SEO"},"redimensionador-redes-sociais":{"url":"./redimensionador-redes-sociais/?embed=1","title":"Redimensionador para redes sociais"},"verificador-contraste":{"url":"./verificador-contraste/?embed=1","title":"Verificador de contraste WCAG"},"organizador-pdf":{"url":"./organizador-pdf/?embed=1","title":"Organizador de PDF"},"limpador-textos":{"url":"./limpador-textos/?embed=1","title":"Limpador e formatador de textos"},"comparador-textos":{"url":"./comparador-textos/?embed=1","title":"Comparador de textos"},"estudio-audio":{"url":"./estudio-audio/?embed=1","title":"Estúdio de Áudio WS"},"gerenciador-metadados":{"url":"./gerenciador-metadados/?embed=1","title":"Metadados WS"},"legendas":{"url":"./legendas/?embed=1","title":"Legendas WS"},"ocr-pdf":{"url":"./ocr-pdf/?embed=1","title":"OCR PDF WS"},"favicon-pwa":{"url":"./favicon-pwa/?embed=1","title":"Favicon & PWA WS"},"svg-studio":{"url":"./svg-studio/?embed=1","title":"SVG Studio WS"},"seo-tecnico":{"url":"./seo-tecnico/?embed=1","title":"SEO Técnico WS"},"separador-voz":{"url":"./separador-voz/?embed=1","title":"Separador de Faixas WS"},"conversor-medidas":{"url":"./conversor-medidas/?embed=1","title":"Conversor de Medidas WS"},"tomadas-pelo-mundo":{"url":"./tomadas-pelo-mundo/?embed=1","title":"Tomadas pelo Mundo WS"},"contador-dias":{"url":"./contador-dias/?embed=1","title":"Contador de Dias WS"},"paises-do-mundo":{"url":"./paises-do-mundo/?embed=1","title":"Países do Mundo WS"},"conversor-cores":{"url":"./conversor-cores/?embed=1","title":"Conversor de Cores WS"},"informacoes-dispositivo":{"url":"./informacoes-dispositivo/?embed=1","title":"Informações do Dispositivo WS"},"sorteador-numeros":{"url":"./sorteador-numeros/?embed=1","title":"Sorteador de Números WS"},"calculadora-imc-tmb":{"url":"./calculadora-imc-tmb/?embed=1","title":"Calculadora de IMC e TMB WS"},"consulta-cep":{"url":"./consulta-cep/?embed=1","title":"Consulta CEP Brasil WS"},"calculadora-proporcao-imagem":{"url":"./calculadora-proporcao-imagem/?embed=1","title":"Calculadora de Proporção de Imagem WS"}};
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

const heroSearch=document.querySelector('.ws13-hero-search');
const heroInput=document.getElementById('ws13-global-search');
function selectFilter(cat){const button=filters.find(b=>b.dataset.category===cat);if(!button)return;button.click();}
if(heroSearch)heroSearch.addEventListener('submit',e=>{e.preventDefault();search.value=heroInput.value;filterTools();document.getElementById('catalogo').scrollIntoView({behavior:'smooth'});});
document.querySelectorAll('[data-search-term]').forEach(a=>a.addEventListener('click',()=>{search.value=a.dataset.searchTerm;filterTools();}));
const requested=new URLSearchParams(location.search).get('categoria');if(requested)selectFilter(requested);
})();
