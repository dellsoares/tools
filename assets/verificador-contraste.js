(()=>{
'use strict';
const $=id=>document.getElementById(id);
if(!$('contrast-check'))return;
function normalize(v){
 let s=v.trim().replace(/^#/,'');
 if(/^[0-9a-f]{3}$/i.test(s))s=s.split('').map(c=>c+c).join('');
 return /^[0-9a-f]{6}$/i.test(s)?'#'+s.toUpperCase():null;
}
function rgb(hex){const s=hex.slice(1);return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16));}
function lum(hex){
 const c=rgb(hex).map(v=>v/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
 return .2126*c[0]+.7152*c[1]+.0722*c[2];
}
function ratio(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function verdict(id,pass){const el=$(id);el.textContent=pass?'Aprovado':'Não atende';el.className=pass?'pass':'fail';}
function bind(hexId,colorId){
 const hex=$(hexId),color=$(colorId);
 color.addEventListener('input',()=>{hex.value=color.value.toUpperCase();});
 hex.addEventListener('input',()=>{const v=normalize(hex.value);if(v)color.value=v.toLowerCase();});
}
bind('contrast-fg-hex','contrast-fg-color');bind('contrast-bg-hex','contrast-bg-color');
function checkContrast(consume=true){
 const fg=normalize($('contrast-fg-hex').value),bg=normalize($('contrast-bg-hex').value);
 if(!fg||!bg){$('contrast-status').textContent='Informe cores HEX válidas, como #FFFFFF ou #07162F.';$('contrast-status').className='ws-outcome error';return;}
 if(consume&&!window.WSUsage?.consume())return;
 const r=ratio(fg,bg),fmt=r.toFixed(2).replace('.',',')+':1';
 $('contrast-ratio').textContent=fmt;
 const sample=$('contrast-sample');sample.style.color=fg;sample.style.backgroundColor=bg;
 verdict('contrast-aa',r>=4.5);verdict('contrast-aa-large',r>=3);verdict('contrast-aaa',r>=7);verdict('contrast-aaa-large',r>=4.5);
 const black=ratio('#000000',bg),white=ratio('#FFFFFF',bg),best=black>white?'#000000':'#FFFFFF';
 $('contrast-better').textContent=`Para este fundo, a melhor entre preto e branco é ${best}, com contraste ${Math.max(black,white).toFixed(2).replace('.',',')}:1.`;
 $('contrast-status').textContent='Cálculo concluído com base na luminância relativa das cores.';$('contrast-status').className='ws-outcome success';
}
$('contrast-check').addEventListener('click',()=>checkContrast(true));
checkContrast(false);
})();