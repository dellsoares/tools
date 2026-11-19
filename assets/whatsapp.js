(()=>{
'use strict';
const form=document.getElementById('link-form');
const ddi=document.getElementById('ddi'),telefone=document.getElementById('telefone'),mensagem=document.getElementById('mensagem');
const counter=document.getElementById('contador'),erro=document.getElementById('erro');
const vazio=document.getElementById('resultado-vazio'),resultado=document.getElementById('resultado');
const link=document.getElementById('link-gerado'),testar=document.getElementById('testar'),toast=document.getElementById('aviso-copia');
const qrPanel=document.getElementById('qr-panel'),qrCanvas=document.getElementById('qr-canvas');
let url='';
function fail(text){erro.textContent=text;erro.hidden=false;telefone.focus()}
function invalidate(){erro.hidden=true;qrPanel.hidden=true;toast.hidden=true;resultado.hidden=true;vazio.hidden=false;url=''}
function phoneDigits(){let s=telefone.value.replace(/\D/g,'');const code=ddi.value;if(s.startsWith(code)&&(s.length>(code==='55'?11:12)))s=s.slice(code.length);return s}
function buildLink(){const number=phoneDigits();if(ddi.value==='55'){if(!/^[1-9][0-9]{9,10}$/.test(number)){fail('Informe um número brasileiro válido com DDD (10 ou 11 dígitos).');return null}}else if(!/^[0-9]{6,14}$/.test(number)){fail('Informe o telefone com código de área e sem o DDI, usando apenas números.');return null}
 const msg=mensagem.value.trim();return 'https://wa.me/'+ddi.value+number+(msg?'?text='+encodeURIComponent(msg):'')}
form.addEventListener('submit',e=>{e.preventDefault();erro.hidden=true;const built=buildLink();if(!built)return;url=built;link.textContent=url;link.href=url;testar.href=url;vazio.hidden=true;resultado.hidden=false;qrPanel.hidden=true;toast.hidden=true});
[ddi,telefone,mensagem].forEach(el=>el.addEventListener('input',()=>{invalidate();counter.textContent=mensagem.value.length+' / 280'}));
async function copyText(text){if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return}
 const tmp=document.createElement('textarea');tmp.value=text;tmp.setAttribute('readonly','');tmp.style.position='fixed';tmp.style.opacity='0';document.body.appendChild(tmp);tmp.select();const ok=document.execCommand('copy');tmp.remove();if(!ok)throw Error('Cópia indisponível')}
document.getElementById('copiar').addEventListener('click',async()=>{if(!url)return;try{await copyText(url);toast.textContent='Link copiado!';toast.hidden=false}catch(_){toast.textContent='Não foi possível copiar automaticamente. Selecione o link acima.';toast.hidden=false}});
document.getElementById('gerar-qr').addEventListener('click',()=>{if(!url)return;try{const qr=new window.WSQR(-1,1);qr.addData(url);qr.make();const count=qr.getModuleCount(),size=512,quiet=4,moduleSize=size/(count+quiet*2),ctx=qrCanvas.getContext('2d');ctx.clearRect(0,0,size,size);ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);ctx.fillStyle='#000';for(let r=0;r<count;r++)for(let c=0;c<count;c++)if(qr.isDark(r,c)){const x=(c+quiet)*moduleSize,y=(r+quiet)*moduleSize;ctx.fillRect(Math.floor(x),Math.floor(y),Math.ceil((c+quiet+1)*moduleSize)-Math.floor(x),Math.ceil((r+quiet+1)*moduleSize)-Math.floor(y))}qrPanel.hidden=false;toast.hidden=true}catch(e){toast.textContent='Não foi possível criar o QR Code. Tente reduzir o tamanho da mensagem.';toast.hidden=false}});
document.getElementById('baixar-qr').addEventListener('click',()=>{if(qrPanel.hidden)return;const anchor=document.createElement('a');anchor.download='qr-whatsapp.png';anchor.href=qrCanvas.toDataURL('image/png');document.body.appendChild(anchor);anchor.click();anchor.remove()});
})();
