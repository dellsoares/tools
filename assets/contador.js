(()=>{
'use strict';
const field=document.getElementById('text-input');
const status=document.getElementById('editor-status');
const elements={chars:document.getElementById('stat-chars'),words:document.getElementById('stat-words'),noSpaces:document.getElementById('stat-no-spaces'),sentences:document.getElementById('stat-sentences'),paragraphs:document.getElementById('stat-paragraphs'),lines:document.getElementById('stat-lines'),time:document.getElementById('stat-time'),average:document.getElementById('stat-average')};
let graphemes=null,wordSegments=null,sentenceSegments=null;
if(typeof Intl.Segmenter==='function'){
 graphemes=new Intl.Segmenter('pt-BR',{granularity:'grapheme'});
 wordSegments=new Intl.Segmenter('pt-BR',{granularity:'word'});
 sentenceSegments=new Intl.Segmenter('pt-BR',{granularity:'sentence'});
}
function graphemeCount(value){return graphemes?Array.from(graphemes.segment(value)).length:Array.from(value).length}
function wordCount(value){
 if(!value.trim())return 0;
 if(wordSegments)return Array.from(wordSegments.segment(value)).filter(part=>part.isWordLike).length;
 return (value.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)||[]).length;
}
function sentenceCount(value){
 if(!value.trim())return 0;
 if(sentenceSegments)return Array.from(sentenceSegments.segment(value)).filter(part=>part.segment.trim()&&/[\p{L}\p{N}]/u.test(part.segment)).length;
 return value.split(/(?<=[.!?…])\s+/u).filter(part=>/[\p{L}\p{N}]/u.test(part)).length;
}
const number=new Intl.NumberFormat('pt-BR');
function count(){
 const value=field.value;
 const chars=graphemeCount(value);
 const noSpaces=graphemeCount(value.replace(/\s/gu,''));
 const words=wordCount(value);
 const sentences=sentenceCount(value);
 const paragraphs=value.trim()?value.trim().split(/(?:\r?\n)[\t ]*(?:\r?\n)+/).filter(p=>p.trim()).length:0;
 const lines=value.length?value.split(/\r\n|\n|\r/).length:0;
 const time=words===0?'0 min':words<200?'< 1 min':number.format(Math.ceil(words/200))+' min';
 const average=words?(noSpaces/words).toLocaleString('pt-BR',{maximumFractionDigits:1}):'0';
 Object.entries({chars,words,noSpaces,sentences,paragraphs,lines,time,average}).forEach(([key,val])=>elements[key].textContent=typeof val==='number'?number.format(val):val);
 document.querySelectorAll('[data-limit].limit-item').forEach(row=>{
  const max=Number(row.dataset.limit);
  row.querySelector('.current').textContent=number.format(chars);
  row.querySelector('.limit-track>span').style.width=Math.min(100,chars/max*100)+'%';
  row.classList.toggle('is-over',chars>max);
 });
}
field.addEventListener('input',()=>{status.textContent='';count()});
function sentenceCase(value){
 let capitalize=true;
 return Array.from(value.toLocaleLowerCase('pt-BR')).map(char=>{
  if(capitalize&&/\p{L}/u.test(char)){capitalize=false;return char.toLocaleUpperCase('pt-BR')}
  if(/[.!?…]/u.test(char))capitalize=true;
  return char;
 }).join('');
}
function titleCase(value){return value.toLocaleLowerCase('pt-BR').replace(/(^|[^\p{L}\p{N}])(\p{L})/gu,(_all,before,letter)=>before+letter.toLocaleUpperCase('pt-BR'))}
const transforms={
 upper:value=>value.toLocaleUpperCase('pt-BR'),
 lower:value=>value.toLocaleLowerCase('pt-BR'),
 sentence:sentenceCase,
 title:titleCase,
 spaces:value=>value.replace(/\r\n?/g,'\n').split('\n').map(line=>line.replace(/[^\S\n]+/g,' ').trim()).join('\n').replace(/\n{3,}/g,'\n\n').trim()
};
document.querySelectorAll('[data-transform]').forEach(button=>button.addEventListener('click',()=>{
 const before=field.value;
 field.value=transforms[button.dataset.transform](before);
 count();status.textContent=before===field.value?'Nenhuma alteração necessária.':'Texto atualizado.';field.focus();
}));
document.getElementById('clear-text').addEventListener('click',()=>{field.value='';count();status.textContent='Texto limpo.';field.focus()});
async function copyText(value){
 if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(value);return}
 const fake=document.createElement('textarea');fake.value=value;fake.readOnly=true;fake.style.position='fixed';fake.style.opacity='0';document.body.appendChild(fake);fake.select();const ok=document.execCommand('copy');fake.remove();if(!ok)throw Error('Cópia não autorizada');
}
document.getElementById('copy-text').addEventListener('click',async()=>{
 if(!field.value){status.textContent='Digite ou cole um texto para copiar.';field.focus();return}
 try{await copyText(field.value);status.textContent='Texto copiado para a área de transferência.'}
 catch(_){status.textContent='Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.'}
});
count();
})();
