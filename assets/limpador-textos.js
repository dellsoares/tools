(()=>{
'use strict';
const $=id=>document.getElementById(id);
const input=$('clean-input');if(!input)return;
const output=$('clean-output'),status=$('clean-status');
function transform(text,action){
 switch(action){
  case 'spaces':return text.replace(/[ \t]{2,}/g,' ').trim();
  case 'trim-lines':return text.replace(/\r\n?/g,'\n').split('\n').map(line=>line.trim()).join('\n');
  case 'blank-lines':return text.replace(/\r\n?/g,'\n').replace(/\n[ \t]*\n(?:[ \t]*\n)+/g,'\n\n');
  case 'join-lines':return text.replace(/\r\n?/g,'\n').split('\n').map(line=>line.trim()).filter(Boolean).join(' ');
  case 'upper':return text.toLocaleUpperCase('pt-BR');
  case 'lower':return text.toLocaleLowerCase('pt-BR');
  case 'sentence':{
   const lower=text.toLocaleLowerCase('pt-BR');
   return lower.replace(/(^|[.!?]\s+)([\p{L}])/gu,(m,prefix,letter)=>prefix+letter.toLocaleUpperCase('pt-BR'));
  }
  case 'title':return text.toLocaleLowerCase('pt-BR').replace(/(^|[\s-])([\p{L}\p{N}])/gu,(m,prefix,letter)=>prefix+letter.toLocaleUpperCase('pt-BR'));
  default:return text;
 }
}
function updateCounts(){
 $('clean-before').textContent=`Original: ${input.value.length.toLocaleString('pt-BR')} caracteres`;
 $('clean-after').textContent=`Resultado: ${output.value.length.toLocaleString('pt-BR')} caracteres`;
}
input.addEventListener('input',updateCounts);output.addEventListener('input',updateCounts);
document.querySelectorAll('[data-clean]').forEach(button=>button.addEventListener('click',()=>{
 if(!input.value){status.textContent='Digite ou cole um texto antes de aplicar uma ação.';status.className='ws-outcome error';input.focus();return;}
 if(!window.WSUsage?.consume())return;
 output.value=transform(input.value,button.dataset.clean);
 $('clean-copy').disabled=!output.value;$('clean-replace').disabled=!output.value;
 updateCounts();status.textContent='Transformação aplicada. Revise o resultado antes de copiar.';status.className='ws-outcome success';
}));
$('clean-copy').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(output.value);status.textContent='Resultado copiado.';}
 catch{output.focus();output.select();status.textContent='Selecione o resultado e copie manualmente.';}
});
$('clean-replace').addEventListener('click',()=>{input.value=output.value;updateCounts();status.textContent='O resultado foi colocado no campo original. O texto anterior foi substituído.';input.focus();});
updateCounts();
})();