(()=>{
'use strict';
const $=id=>document.getElementById(id);
const form=$('meta-form');if(!form)return;
const title=$('meta-title'),description=$('meta-description'),url=$('meta-url'),image=$('meta-image');
const result=$('meta-result'),output=$('meta-output'),status=$('meta-status');
const esc=value=>String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function validUrl(value,required=false){
 if(!value)return !required;
 try{const u=new URL(value);return u.protocol==='https:'||u.protocol==='http:';}catch{return false;}
}
function preview(){
 const t=title.value.trim()||'Título da sua página';
 const d=description.value.trim()||'A descrição da página aparecerá aqui depois que você preencher os campos.';
 $('meta-preview-title').textContent=t;
 $('meta-preview-description').textContent=d;
 const raw=url.value.trim();
 try{const u=new URL(raw);$('meta-preview-url').textContent=u.hostname+u.pathname;}catch{$('meta-preview-url').textContent='seusite.com.br';}
 $('meta-social-title').textContent=$('meta-og-title').value.trim()||t;
 $('meta-social-description').textContent=$('meta-og-description').value.trim()||d;
 const imageUrl=image.value.trim();
 $('meta-social-image').style.backgroundImage=validUrl(imageUrl)?`url("${imageUrl.replace(/["\\]/g,'')}")`:'none';
 $('meta-title-count').textContent=`${title.value.length} / 70`;
 $('meta-description-count').textContent=`${description.value.length} / 200`;
}
[title,description,url,image,$('meta-og-title'),$('meta-og-description')].forEach(el=>el.addEventListener('input',preview));
preview();
form.addEventListener('submit',event=>{
 event.preventDefault();
 const t=title.value.trim(),d=description.value.trim(),u=url.value.trim(),img=image.value.trim();
 if(!t||!d){status.textContent='Preencha título e meta description.';status.className='ws-outcome error';return;}
 if(!validUrl(u,true)){status.textContent='Informe uma URL canônica válida.';status.className='ws-outcome error';url.focus();return;}
 if(img&&!validUrl(img,true)){status.textContent='A URL da imagem social precisa ser válida.';status.className='ws-outcome error';image.focus();return;}
 if(!window.WSUsage?.consume())return;
 const ogt=$('meta-og-title').value.trim()||t;
 const ogd=$('meta-og-description').value.trim()||d;
 const robots=$('meta-robots').value;
 const type=$('meta-type').value;
 const lines=[
  `<title>${esc(t)}</title>`,
  `<meta name="description" content="${esc(d)}">`,
  `<link rel="canonical" href="${esc(u)}">`,
  `<meta name="robots" content="${esc(robots)}">`,
  `<meta property="og:type" content="${esc(type)}">`,
  `<meta property="og:title" content="${esc(ogt)}">`,
  `<meta property="og:description" content="${esc(ogd)}">`,
  `<meta property="og:url" content="${esc(u)}">`,
  ...(img?[`<meta property="og:image" content="${esc(img)}">`]:[]),
  `<meta name="twitter:card" content="${img?'summary_large_image':'summary'}">`,
  `<meta name="twitter:title" content="${esc(ogt)}">`,
  `<meta name="twitter:description" content="${esc(ogd)}">`,
  ...(img?[`<meta name="twitter:image" content="${esc(img)}">`]:[])
 ];
 output.value=lines.join('\n');result.hidden=false;
 status.textContent='Código gerado. Revise possíveis tags duplicadas antes de inserir no site.';status.className='ws-outcome success';
 preview();
});
$('meta-copy').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(output.value);$('meta-copy-status').textContent='Código copiado.';}
 catch{$('meta-copy-status').textContent='Não foi possível copiar automaticamente. Selecione o código e copie.';output.focus();output.select();}
});
$('meta-download').addEventListener('click',()=>{
 const full=`<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n${output.value}\n</head>\n<body>\n<h1>${esc(title.value.trim())}</h1>\n<p>Substitua este conteúdo de referência pelo conteúdo real da sua página.</p>\n</body>\n</html>`;
 const blob=new Blob([full],{type:'text/html;charset=utf-8'}),a=document.createElement('a');
 const href=URL.createObjectURL(blob);a.href=href;a.download='referencia-meta-tags.html';a.click();URL.revokeObjectURL(href);
 $('meta-copy-status').textContent='Arquivo de referência preparado.';
});
})();