(()=>{
'use strict';
const $=id=>document.getElementById(id);
const form=$('utm-form'),status=$('utm-status'),result=$('utm-result'),output=$('utm-output');
if(!form)return;
function message(text,type=''){status.textContent=text;status.className='ws-outcome'+(type?' '+type:'');}
form.addEventListener('submit',event=>{
 event.preventDefault();
 const raw=$('utm-url').value.trim();
 let url;
 try{url=new URL(raw);if(!['http:','https:'].includes(url.protocol))throw new Error();}
 catch{message('Informe uma URL válida iniciada por http:// ou https://.','error');$('utm-url').focus();return;}
 const fields=[['utm_source','utm-source'],['utm_medium','utm-medium'],['utm_campaign','utm-campaign'],['utm_term','utm-term'],['utm_content','utm-content'],['utm_id','utm-id']];
 for(const [key,id] of fields){
  const value=$(id).value.trim();
  if(['utm_source','utm_medium','utm_campaign'].includes(key)&&!value){message('Preencha source, medium e campaign para identificar a campanha.','error');$(id).focus();return;}
  if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);
 }
 if(!window.WSUsage?.consume())return;
 output.value=url.toString();$('utm-open').href=url.toString();result.hidden=false;
 $('utm-copy-status').textContent='Link gerado. Os parâmetros foram adicionados sem remover outros parâmetros existentes.';
 message('Link UTM criado com sucesso.','success');
});
$('utm-copy').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(output.value);$('utm-copy-status').textContent='Link copiado.';}
 catch{$('utm-copy-status').textContent='Não foi possível copiar automaticamente. Selecione o endereço e copie.';output.focus();output.select();}
});
$('utm-clear').addEventListener('click',()=>{form.reset();result.hidden=true;message('Campos limpos.');$('utm-url').focus();});
})();