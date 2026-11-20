/* WS Tools v13 — ferramentas novas, processamento local salvo consultas explicitamente externas. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const slug=document.body.dataset.wsTool;
if(!slug)return;
const msg=(text,error=false)=>{const e=$('ws13-msg');if(e){e.textContent=text||'';e.classList.toggle('error',error)}};
const clean=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=(x,max=4)=>Number(x).toLocaleString('pt-BR',{maximumFractionDigits:max});
const num=id=>Number($(id)?.value);
const line=(key,value)=>`<div class="ws13-result-line"><span>${clean(key)}</span><strong>${clean(value)}</strong></div>`;
const note=s=>`<p class="ws13-result-note">${clean(s)}</p>`;
const warn=s=>`<p class="ws13-result-warning">${clean(s)}</p>`;
const escFlag=code=>(code||'').toUpperCase().split('').map(x=>String.fromCodePoint(0x1f1e6+x.charCodeAt(0)-65)).join('');
const output=(title,markup)=>{$('ws13-result-title').textContent=title;$('ws13-output').innerHTML=markup;msg('')};
const copy=async text=>{try{await navigator.clipboard.writeText(text);msg('Copiado para a área de transferência.');}catch{msg('Seu navegador bloqueou a cópia automática.',true)}};
const use=()=>{if(window.WSUsage){if(!window.WSUsage.can())return false;window.WSUsage.consume();}return true;};
function wrap(fn){return e=>{if(e)e.preventDefault();try{fn(e)}catch(err){msg(err.message||String(err),true)}}}
function addCopyEvents(){document.addEventListener('click',e=>{const b=e.target.closest('[data-copy]');if(b){copy(b.dataset.copy)}})}
addCopyEvents();
const btnCopy=t=>`<button type="button" class="ws13-copy" data-copy="${clean(t)}">Copiar</button>`;

// 1 — Conversor de medidas
function initMeasures(){
 const entries={
 comprimento:{m:['metro (m)',1],km:['quilômetro (km)',1000],cm:['centímetro (cm)',.01],mm:['milímetro (mm)',.001],um:['micrômetro (µm)',.000001],mi:['milha (mi)',1609.344],yd:['jarda (yd)',.9144],ft:['pé (ft)',.3048],inch:['polegada (in)',.0254],nmi:['milha náutica',1852]},
 area:{m2:['metro quadrado (m²)',1],km2:['quilômetro quadrado (km²)',1e6],cm2:['centímetro quadrado (cm²)',.0001],ha:['hectare (ha)',1e4],acre:['acre',4046.8564224],ft2:['pé quadrado (ft²)',.09290304]},
 volume:{L:['litro (L)',1],mL:['mililitro (mL)',.001],m3:['metro cúbico (m³)',1000],galus:['galão US',3.785411784],galuk:['galão imperial',4.54609],cup:['xícara métrica (250 mL)',.25],tbsp:['colher de sopa (15 mL)',.015],tsp:['colher de chá (5 mL)',.005],floz:['onça fluida US',.0295735295625]},
 massa:{kg:['quilograma (kg)',1],g:['grama (g)',.001],mg:['miligrama (mg)',.000001],t:['tonelada (t)',1000],lb:['libra (lb)',.45359237],oz:['onça (oz)',.028349523125],st:['stone (st)',6.35029318]},
 temperatura:{C:['Celsius (°C)',1],F:['Fahrenheit (°F)',1],K:['Kelvin (K)',1]},
 velocidade:{kmh:['km/h',1],ms:['m/s',3.6],mph:['milha por hora (mph)',1.609344],knot:['nó (kn)',1.852],fts:['pé por segundo',1.09728]},
 tempo:{s:['segundo (s)',1],min:['minuto',60],hour:['hora',3600],day:['dia (24 h)',86400],week:['semana',604800],year:['ano juliano (365,25 dias)',31557600]},
 pressao:{Pa:['pascal (Pa)',1],kPa:['quilopascal (kPa)',1000],bar:['bar',100000],atm:['atmosfera (atm)',101325],psi:['psi',6894.757293168],mmhg:['mmHg',133.322387415]},
 energia:{J:['joule (J)',1],kJ:['quilojoule (kJ)',1000],cal:['caloria (cal)',4.184],kcal:['quilocaloria (kcal)',4184],Wh:['watt-hora (Wh)',3600],kWh:['quilowatt-hora (kWh)',3.6e6],BTU:['BTU',1055.05585262]},
 potencia:{W:['watt (W)',1],kW:['quilowatt (kW)',1000],MW:['megawatt (MW)',1e6],hp:['horsepower mecânico',745.6998715822702],cv:['cavalo-vapor (cv)',735.49875]},
 dados:{b:['bit',.125],B:['byte',1],kb:['kilobit (kb)',125],kB:['kilobyte (kB)',1e3],KiB:['kibibyte (KiB)',1024],MB:['megabyte (MB)',1e6],MiB:['mebibyte (MiB)',1048576],GB:['gigabyte (GB)',1e9],GiB:['gibibyte (GiB)',1073741824],TB:['terabyte (TB)',1e12],TiB:['tebibyte (TiB)',1099511627776]},
 combustivel:{kml:['quilômetro por litro (km/L)',1],L100:['litros por 100 km (L/100 km)',1],mpgus:['milhas por galão (EUA)',1],mpguk:['milhas por galão (Reino Unido)',1]},
 culinaria:{water:['água / leite (g por mL)',1],flour:['farinha de trigo (g por xícara)',120],sugar:['açúcar refinado (g por xícara)',200],butter:['manteiga (g por xícara)',227],salt:['sal refinado (g por xícara)',288]}
 };
 const cat=$('m-cat'),from=$('m-from'),to=$('m-to');
 function fill(){let keys=Object.keys(entries[cat.value]);if(cat.value==='culinaria'){
  from.innerHTML='<option value="cup">Xícara de 240 mL</option><option value="tbsp">Colher de sopa (15 mL)</option><option value="tsp">Colher de chá (5 mL)</option><option value="g">Grama (g)</option><option value="kg">Quilograma (kg)</option>';
  to.innerHTML=keys.map(k=>`<option value="${k}">${clean(entries.culinaria[k][0])}</option>`).join('');return;
 }
 for(const s of [from,to])s.innerHTML=keys.map(k=>`<option value="${k}">${clean(entries[cat.value][k][0])}</option>`).join('');to.selectedIndex=1;
 }
 cat.addEventListener('change',fill);fill();
 $('m-swap').addEventListener('click',()=>{if(cat.value==='culinaria')return msg('Na conversão culinária, selecione o ingrediente e a medida.',true);const v=from.value;from.value=to.value;to.value=v;run()});
 function run(){const v=num('m-val');if(!Number.isFinite(v))throw Error('Digite um valor numérico válido.');if(!use())return;
 let r,unit=to.options[to.selectedIndex].text,label=from.options[from.selectedIndex].text;
 if(cat.value==='temperatura'){let C=from.value==='C'?v:from.value==='K'?v-273.15:(v-32)*5/9;r=to.value==='C'?C:to.value==='K'?C+273.15:C*9/5+32;if(C < -273.15-1e-9)throw Error('Temperatura abaixo do zero absoluto.');}
 else if(cat.value==='combustivel'){if(v<=0)throw Error('Consumo de combustível deve ser maior que zero.');const kml=from.value==='kml'?v:from.value==='L100'?100/v:from.value==='mpgus'?v*.425143707:v*.35400619;r=to.value==='kml'?kml:to.value==='L100'?100/kml:to.value==='mpgus'?kml/.425143707:kml/.35400619;}
 else if(cat.value==='culinaria'){const x={cup:1,tbsp:1/16,tsp:1/48,g:1/240,kg:1000/240}[from.value];const ingredientGrams=entries.culinaria[to.value][1];if(from.value==='g'||from.value==='kg'){const grams=from.value==='g'?v:v*1000;r=grams/ingredientGrams;unit='xícaras (240 mL)';}else{r=v*x*ingredientGrams;unit='gramas (g)';}label=from.options[from.selectedIndex].text;}
 else r=v*entries[cat.value][from.value][1]/entries[cat.value][to.value][1];
 if(!Number.isFinite(r))throw Error('Resultado fora dos limites numéricos.');
 output('Conversão concluída',`<div class="ws13-result-lead">${nf(r,8)} ${clean(unit.replace(/.*\((.*?)\).*/,'$1'))}</div>${line('Valor de origem',nf(v,8)+' · '+label)}${line('Resultado',nf(r,10)+' · '+unit)}${btnCopy(nf(r,10))}${cat.value==='culinaria'?note('Culinária: volumes e massas variam com o ingrediente; a xícara usada aqui tem 240 mL e os valores são estimativas.'):''}`);
 }
 $('ws13-form').addEventListener('submit',wrap(run));
}
// Utilitários de países (dados locais ~60 kB somente em páginas relevantes)
let countryCache;
async function getCountries(){if(countryCache)return countryCache;const r=await fetch('../assets/paises-ws.json',{cache:'force-cache'});if(!r.ok)throw Error('Não foi possível carregar a base de países.');countryCache=await r.json();return countryCache;}
function optionCountries(arr,selected){return arr.map(c=>`<option value="${clean(c.id)}" ${c.id===selected?'selected':''}>${clean(c.nome)}</option>`).join('')}
function countryFmt(country){return `<span class="ws13-country-flag" aria-label="Bandeira">${escFlag(country.id)}</span><strong>${clean(country.nome)}</strong>`+line('Nome original',country.original||'Não informado')+line('Capital',country.capital||'Não informada')+line('Idioma(s)',country.idiomas.length?country.idiomas.join(', '):'Não cadastrado')+line('Gentílico em português',country.gentilico||'Não revisado nesta base')+(country.gentilico?'':line('Gentílico em inglês',country.gentilicoOriginal||'Não informado'))+line('Continente',country.continente||'Não informado')+line('Moeda(s)',country.moedas.length?country.moedas.join(', '):'Não informada')+line('Prefixo telefônico',country.prefixo||'Não informado')+line('Código ISO',country.id+' / '+(country.iso3||'—'))+(country.area?line('Área',nf(country.area,0)+' km²'):'');}
function initCountries(){let countries=[];const country=$('country-select'),compare=$('country-compare');
 const search=$('country-search'),cont=$('country-continent');
 async function load(){try{countries=await getCountries();country.innerHTML=optionCountries(countries,'BR');compare.innerHTML=optionCountries(countries,'JP');
  const regions=[...new Set(countries.map(c=>c.continente).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));cont.innerHTML='<option value="todos">Todos os continentes</option>'+regions.map(x=>`<option>${clean(x)}</option>`).join('');msg(`${countries.length} países e territórios disponíveis. Selecione um para consultar.`);}
  catch(e){msg(e.message,true)} }
 function refresh(){const q=search.value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const reg=cont.value;const selected=country.value;
  const hits=countries.filter(c=>(reg==='todos'||c.continente===reg)&&[c.nome,c.capital,c.original,...c.idiomas,c.id].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q));
  country.innerHTML=optionCountries(hits,selected);msg(`${hits.length} países e territórios encontrados.`);
 }
 function view(){const c=countries.find(c=>c.id===country.value);if(!c)return msg('Selecione um país.',true);if(!use())return;const c2=$('country-compare').hidden?null:countries.find(x=>x.id===compare.value);
  if(c2)output('Comparação de países',`<div class="ws13-country-columns"><div>${countryFmt(c)}</div><div>${countryFmt(c2)}</div></div>`);
  else output('Informações de '+c.nome,countryFmt(c));}
 search.addEventListener('input',refresh);cont.addEventListener('change',refresh);$('country-view').addEventListener('click',view);$('country-compare-btn').addEventListener('click',()=>{compare.hidden=!compare.hidden;$('country-compare-btn').textContent=compare.hidden?'Comparar países':'Ocultar comparação';});
 load();
}

// 2 — Tomadas por país. Fonte IEC / world-plugs, com exemplos locais para conexão intermitente.
function plugSketch(type){
 const pin=(x,y,r=3)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="currentColor" stroke-width="2"/>`;
 const flat=(x,y,angle=0)=>`<rect x="${x-2}" y="${y-6}" width="4" height="12" rx=".5" transform="rotate(${angle} ${x} ${y})" fill="currentColor"/>`;
 const group={A:flat(25,24)+flat(47,24),B:flat(25,20)+flat(47,20)+pin(36,46),C:pin(24,30)+pin(48,30),D:pin(36,17)+pin(23,43)+pin(49,43),E:pin(25,30)+pin(47,30)+pin(36,12,4),F:pin(25,30)+pin(47,30)+'<path d="M12 22v16M60 22v16" stroke="currentColor" stroke-width="3"/>',G:flat(36,12,90)+flat(23,37)+flat(49,37),H:flat(36,16)+flat(24,38,35)+flat(48,38,-35),I:flat(26,28,-35)+flat(46,28,35)+flat(36,49),J:pin(25,30)+pin(47,30)+pin(36,47),K:pin(25,30)+pin(47,30)+pin(36,47,4),L:pin(18,31)+pin(36,31)+pin(54,31),M:pin(36,14,4)+pin(20,44,4)+pin(52,44,4),N:pin(36,15)+pin(25,40)+pin(47,40),O:pin(36,15)+pin(25,40)+pin(47,40)};
 return `<div class="ws13-plug-mini"><svg viewBox="0 0 72 62" width="70" height="62" aria-hidden="true"><rect x="5" y="4" width="62" height="54" rx="9" stroke="currentColor" fill="none" opacity=".24"/>${group[type]||''}</svg><strong>Tipo ${clean(type)}</strong></div>`;
}
function initPlugs(){let countries=[];
 const FALLBACK={BR:['C N','127 / 220','60'],US:['A B','120','60'],CA:['A B','120','60'],PT:['C F','230','50'],ES:['C F','230','50'],DE:['C F','230','50'],FR:['C E','230','50'],GB:['G','230','50'],IE:['G','230','50'],JP:['A B','100','50 / 60'],CN:['A C I','220','50'],AU:['I','230','50'],NZ:['I','230','50'],AR:['C I','220','50'],CL:['C L','220','50'],UY:['C F I L','230','50'],PY:['C','220','50'],BO:['A C','115 / 230','50'],CO:['A B','110','60'],PE:['A C','220','60'],MX:['A B','127','60'],CR:['A B','120','60'],CU:['A B C L','110 / 220','60'],IN:['C D M','230','50'],KR:['C F','220','60'],TH:['A B C O','220','50'],SG:['G','230','50'],MY:['G','240','50'],PH:['A B C','220','60'],ID:['C F','230','50'],VN:['A C','220','50'],TR:['C F','230','50'],EG:['C F','220','50'],ZA:['C M N','230','50'],RU:['C F','220','50'],UA:['C F','230','50'],CH:['C J','230','50'],IT:['C F L','230','50'],NL:['C F','230','50'],BE:['C E','230','50'],SE:['C F','230','50'],NO:['C F','230','50'],DK:['C E F K','230','50'],FI:['C F','230','50'],PL:['C E','230','50'],AT:['C F','230','50'],GR:['C F','230','50'],HU:['C F','230','50'],CZ:['C E','230','50'],IS:['C F','230','50'],IL:['C H','230','50'],AE:['G','230','50'],SA:['G','230','60'],MA:['C E','220','50'],KE:['G','240','50'],NG:['D G','230','50'],TZ:['D G','230','50'],ET:['C F','220','50'],PK:['C D','230','50'],BD:['C D G K','220','50'],NP:['C D M','230','50'],LK:['D G M','230','50'],KH:['A C G','230','50'],TW:['A B','110','60'],HK:['G','220','50'],MO:['D G','220','50'],LA:['A B C E F','230','50'],MM:['C D F G','230','50'],TN:['C E','230','50'],DZ:['C F','230','50'],BW:['D G M','230','50'],GE:['C F','220','50'],AZ:['C F','220','50'],AM:['C F','230','50'],BG:['C F','230','50'],RO:['C F','230','50'],HR:['C F','230','50'],SI:['C F','230','50'],SK:['C E','230','50'],RS:['C F','230','50'],EE:['C F','230','50'],LV:['C F','230','50'],LT:['C F','230','50'],GH:['D G','230','50'],QA:['G','240','50'],KW:['G','240','50'],OM:['G','240','50'],BH:['G','230','50'],GT:['A B','120','60'],HN:['A B','120','60'],SV:['A B','115','60'],PA:['A B','120','60'],EC:['A B','120','60'],VE:['A B','120','60']};
 const plugs={...FALLBACK};
 async function load(){try{countries=await getCountries();$('plug-country').innerHTML=optionCountries(countries,'BR');msg('Selecione um destino e clique em Calcular resultado.');
 // Data file is fetched only when this tool opens; it is not requested by the home page.
 // CSV source is a public derivative of IEC World Plugs. Entries are not a warranty of local conditions.
 try{const r=await fetch('https://raw.githubusercontent.com/benjiao/world-plugs/master/world-plugs.csv',{signal:AbortSignal.timeout?AbortSignal.timeout(9000):undefined});if(!r.ok)throw Error('Indisponível');const csv=await r.text();
 const data={};for(const row of csv.trim().split(/\r?\n/).slice(1)){
  const parts=row.match(/(?:"(?:[^"]|"")*"|[^,])+/g)||[];if(parts.length<6)continue;
  const code=parts[1].trim().toUpperCase();const freq=parts[2].replace(/[^\d/]/g,'');const typ=parts[4].replace('Type','').trim();const volts=parts[5].replace(/^"|"$/g,'').replace(/[^\d, /]/g,'').trim().replace(/, /g,' / ');
  if(!/^[A-Z]{2}$/.test(code)||!/^[A-O]$/.test(typ))continue;
  const rec=(data[code] ||= {types:new Set(),volts:new Set(),freq:new Set()});rec.types.add(typ);rec.volts.add(volts);rec.freq.add(freq);
 }
 for(const [code,d] of Object.entries(data))plugs[code]=[[...d.types].join(' '),[...d.volts].join(' / '),[...d.freq].join(' / ')];
 }catch(e){msg('Usando a base resumida de tomadas; a fonte internacional está indisponível neste momento.');}
 }catch(e){msg(e.message,true)}}
 function view(){const c=countries.find(x=>x.id===$('plug-country').value);if(!c)return;const p=plugs[c.id];if(!p)return output('Consulta de '+c.nome,`${warn('Padrões elétricos ainda não verificados para este destino nesta base. Confirme com uma fonte local atualizada.')}<p>Referência: <a href="https://www.iec.ch/world-plugs" target="_blank" rel="noopener noreferrer">IEC World Plugs</a>.</p>`);
 if(!use())return;
 const types=p[0].split(' ');const br=FALLBACK.BR[0].split(' ');const intersect=types.some(x=>br.includes(x));
 const label=`Tipos ${p[0]}`;$('plug-drawing').innerHTML=types.map(plugSketch).join('');
 output('Tomadas em '+c.nome,`<div class="ws13-result-lead">${clean(label)}</div>${line('Tensão nominal',p[1]+' V')}${line('Frequência',p[2]+' Hz')}${line('Plugue(s) usados',types.join(', '))}${warn(intersect?'Há tipos também usados no Brasil, mas isso não garante compatibilidade física ou elétrica.':'O padrão pode ser diferente do brasileiro; pode ser necessário um adaptador adequado.')}${note('Adaptadores não modificam a tensão. Alguns países têm diferentes padrões ou tensões conforme a região, e a instalação real pode variar. Confirme antes de conectar aparelhos.')}<p class="ws13-result-note"><a href="https://www.iec.ch/world-plugs" target="_blank" rel="noopener noreferrer">Referência IEC World Plugs ↗</a></p>`);
 }
 $('ws13-form').addEventListener('submit',wrap(view));load();
}

// 3 — Diferença entre datas e dias úteis. Datas UTC civis eliminam problemas de horário de verão.
const ONE=86400000;
function parseDate(id){const v=$(id).value;if(!/^\d{4}-\d\d-\d\d$/.test(v))throw Error('Informe uma data completa.');const [y,m,d]=v.split('-').map(Number);const dt=new Date(Date.UTC(y,m-1,d));if(dt.getUTCFullYear()!==y||dt.getUTCMonth()+1!==m||dt.getUTCDate()!==d)throw Error('Data inválida.');return dt;}
function dateISO(date){return date.toISOString().slice(0,10)}
function nationalHoliday(date){const key=date.toISOString().slice(5,10);return ['01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25'].includes(key)}
function dayBusiness(date,includeHolidays,extras){const day=date.getUTCDay();return day!==0&&day!==6&&!(includeHolidays&&nationalHoliday(date))&&!(extras&&extras.has(dateISO(date)));}
function extraDays(){const dates=($('days-custom')?.value||'').split(/[\n;,\s]+/).map(s=>s.trim()).filter(Boolean);if(dates.some(d=>!/^\d{4}-\d\d-\d\d$/.test(d)||Number.isNaN(Date.parse(d))))throw Error('Feriados adicionais: informe datas no formato AAAA-MM-DD.');return new Set(dates);}
function businessCount(a,b,inclusive,holidays,extras){let lo=Math.min(a.getTime(),b.getTime()),hi=Math.max(a.getTime(),b.getTime());const total=Math.floor((hi-lo)/ONE);if(total>36525)throw Error('Intervalo máximo para dias úteis: 100 anos.');let count=0;for(let i=inclusive?0:1;i<=total;i++){const d=new Date(lo+i*ONE);if(dayBusiness(d,holidays,extras))count++;}return count;}
function initDays(){const dt=new Date();$('days-start').value=dateISO(new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),1)));$('days-end').value=dateISO(new Date(Date.UTC(dt.getFullYear(),dt.getMonth()+1,0)));$('days-base').value=$('days-start').value;
 function run(){const a=parseDate('days-start'),b=parseDate('days-end');if(!use())return;const dif=Math.round((b-a)/ONE),inc=$('days-inclusive').checked,days=Math.abs(dif)+(inc?1:0),working=businessCount(a,b,inc,$('days-holidays').checked,extraDays());
 const m= Math.round(days/30.436875*100)/100;
 output('Diferença entre datas',`<div class="ws13-result-lead">${nf(days,0)} dias corridos</div>${line('Dias úteis',nf(working,0))}${line('Semanas completas',Math.floor(days/7))}${line('Dias restantes',days%7)}${line('Meses aproximados',nf(m,2))}${line('Ordem das datas',dif<0?'A data final é anterior à inicial':'Cronológica')}${note('Feriados nacionais fixos podem ser excluídos. Feriados móveis e locais só entram quando informados em Feriados adicionais.')}`);
 }
 function add(){const d=parseDate('days-base');const n=num('days-amount');if(!Number.isInteger(n)||Math.abs(n)>36525)throw Error('Use um número inteiro de até 36.525 dias.');if(!use())return;
 let target=new Date(d),direction=Math.sign(n);if($('days-kind').value==='uteis'){let steps=Math.abs(n);while(steps>0){target=new Date(target.getTime()+direction*ONE);if(dayBusiness(target,$('days-holidays').checked,extraDays()))steps--}}
 else target=new Date(target.getTime()+n*ONE);
 output('Data calculada',`<div class="ws13-result-lead">${target.toLocaleDateString('pt-BR',{timeZone:'UTC',day:'2-digit',month:'long',year:'numeric'})}</div>${line('Data ISO',dateISO(target))}${line('Deslocamento',`${nf(n,0)} dias ${$('days-kind').value==='uteis'?'úteis':'corridos'}`)}${note('A data de referência não conta como o primeiro dia do deslocamento.')}`);
 }
 $('ws13-form').addEventListener('submit',wrap(run));$('days-add').addEventListener('click',wrap(add));
}
// 5 — HEX / RGB(A) / HSL / HSV / CMYK.
function initColors(){
 const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
 const parseNums=(s,count)=>{const ns=s.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ||[];if(ns.length!==count||ns.some(n=>!Number.isFinite(n)))throw Error(`Informe ${count} valores numéricos válidos.`);return ns};
 function hslToRgb(h,s,l){h=((h%360)+360)%360;s=clamp(s);l=clamp(l);const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;const r=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return r.map(v=>Math.round((v+m)*255));}
 function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0,s=0,l=(max+min)/2;if(d){s=d/(1-Math.abs(2*l-1));switch(max){case r:h=((g-b)/d)%6;break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;}h=((h*60)+360)%360;}return [h,s*100,l*100]}
 function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h=(h*60+360)%360;}return [h,max?d/max*100:0,max*100]}
 function hsvToRgb(h,s,v){h=((h%360)+360)%360;s=clamp(s);v=clamp(v);const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return rgb.map(n=>Math.round((n+m)*255));}
 function parse(){let val=$('color-value').value.trim(),format=$('color-format').value,rgba;
  if(format==='hex'){
   val=val.replace(/^#/,'');if(!/^(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(val))throw Error('Use HEX de 3, 4, 6 ou 8 caracteres.');
   if(val.length<=4)val=val.split('').map(x=>x+x).join('');rgba=[0,2,4].map(i=>parseInt(val.slice(i,i+2),16));rgba.push(val.length===8?parseInt(val.slice(6,8),16)/255:1);
  }else if(format==='rgb'){
   const parts=val.replace(/rgba?\s*\(/i,'').replace(/\)/g,'').split(/\s*[,;]\s*/).map(x=>x.trim());if(![3,4].includes(parts.length))throw Error('Informe RGB ou RGBA com 3 ou 4 valores.');
   rgba=parts.map((x,i)=>{let n=Number(x.replace('%',''));if(!Number.isFinite(n))throw Error('RGB inválido.');return x.endsWith('%')&&i<3?n*2.55:n});if(rgba.length===3)rgba.push(1);
  }else if(format==='hsl'){
   const [h,s,l]=parseNums(val,3);if(s<0||s>100||l<0||l>100)throw Error('Saturação e luminosidade devem estar entre 0 e 100.');rgba=[...hslToRgb(h,s/100,l/100),1];
  }else if(format==='hsv'){
   const [h,s,v]=parseNums(val,3);if(s<0||s>100||v<0||v>100)throw Error('Saturação e brilho devem estar entre 0 e 100.');rgba=[...hsvToRgb(h,s/100,v/100),1];
  }else{
   const [c,m,y,k]=parseNums(val,4);if([c,m,y,k].some(n=>n<0||n>100))throw Error('CMYK deve usar valores entre 0 e 100.');rgba=[c,m,y].map(n=>Math.round(255*(1-n/100)*(1-k/100)));rgba.push(1);
  }
  if(rgba.some((n,i)=>n<0||n>(i===3?1:255)))throw Error('Valor da cor fora da faixa permitida.');return rgba;
 }
 function conv(){const [r,g,b,a]=parse();if(!use())return;const hex='#'+[r,g,b].map(n=>Math.round(n).toString(16).padStart(2,'0')).join('');const hexa=hex+(a<1?Math.round(a*255).toString(16).padStart(2,'0'):'');const hsl=rgbToHsl(r,g,b),hsv=rgbToHsv(r,g,b);const k=1-Math.max(r,g,b)/255;const cmyk=k===1?[0,0,0,100]:[(1-r/255-k)/(1-k)*100,(1-g/255-k)/(1-k)*100,(1-b/255-k)/(1-k)*100,k*100];
  $('color-preview').style.backgroundColor=`rgba(${r},${g},${b},${a})`;
  $('color-picker').value=hex;
  const pairs={HEX:hexa.toUpperCase(),RGB:`rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`,RGBA:`rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${nf(a,3)})`,HSL:`hsl(${nf(hsl[0],1)}, ${nf(hsl[1],1)}%, ${nf(hsl[2],1)}%)`,HSV:`hsv(${nf(hsv[0],1)}, ${nf(hsv[1],1)}%, ${nf(hsv[2],1)}%)`,CMYK:`cmyk(${cmyk.map(x=>nf(x,1)).join('%, ')}%)`};
  output('Cor convertida',`<div class="ws13-result-swatch" style="background-color:rgba(${r},${g},${b},${a})"></div>`+Object.entries(pairs).map(([k,v])=>`<div class="ws13-result-line"><span>${k}</span><strong>${clean(v)} ${btnCopy(v)}</strong></div>`).join('')+note('CMYK é uma conversão aproximada; perfis de cor de impressão podem produzir resultados diferentes.'));
 }
 $('ws13-form').addEventListener('submit',wrap(conv));$('color-picker').addEventListener('input',()=>{$('color-format').value='hex';$('color-value').value=$('color-picker').value;conv()});
}

// 6 — Dispositivo: somente dados expostos pelo navegador, sem fingerprint remoto.
function initDevice(){let report='';
 function inspect(){if(!use())return;
  const ua=navigator.userAgent||'';const os=/Windows NT/i.test(ua)?'Windows':/iPhone|iPad|iPod/i.test(ua)?'iOS / iPadOS':/Android/i.test(ua)?'Android':/Mac OS X/i.test(ua)?'macOS':/Linux/i.test(ua)?'Linux':'Não identificado';
  const br=/Edg\//.test(ua)?'Microsoft Edge':/OPR\//.test(ua)?'Opera':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Google Chrome':/Safari\//.test(ua)?'Safari':'Não identificado';
  const device=/Mobi|Android.*Mobile|iPhone/i.test(ua)?'Celular':/Tablet|iPad/i.test(ua)?'Tablet':'Computador / não identificado';
  const values={
   'Tipo de dispositivo':device,'Sistema operacional':os,'Navegador':br,'Idioma preferencial':navigator.language||'Não exposto',
   'Idiomas aceitos':navigator.languages?.join(', ')||'Não exposto','Fuso horário':Intl.DateTimeFormat().resolvedOptions().timeZone||'Não exposto',
   'Resolução da tela':`${screen.width} × ${screen.height} pixels CSS`,'Área útil da janela':`${innerWidth} × ${innerHeight} pixels CSS`,
   'Densidade de pixels':String(devicePixelRatio||1),'Profundidade de cor':(screen.colorDepth||'?')+' bits',
   'Toque (pontos máximos)':String(navigator.maxTouchPoints??'Não exposto'),
   'Processadores lógicos (informados)':String(navigator.hardwareConcurrency||'Não exposto'),
   'Memória aproximada (informada)':navigator.deviceMemory?navigator.deviceMemory+' GB':'Não exposta',
   'Tipo de conexão informado':navigator.connection?.effectiveType||'Não exposto',
   'Página em HTTPS':location.protocol==='https:'?'Sim':'Não',
   'Armazenamento local':'localStorage' in window?'API disponível':'Não disponível',
   'Modo de cor preferido':matchMedia('(prefers-color-scheme: dark)').matches?'Escuro':'Claro',
   'Orientação':screen.orientation?.type||'Não exposta'
  };
  report=Object.entries(values).map(([k,v])=>k+': '+v).join('\n');
  output('Seu dispositivo',Object.entries(values).map(([k,v])=>line(k,v)).join('')+note('Dados técnicos fornecidos ou estimados pelo navegador. Não incluem endereço IP, localização exata, número de série ou dados privados.'));
 }
 $('device-refresh').addEventListener('click',inspect);$('device-copy').addEventListener('click',()=>copy(report));inspect();
}

// 7 — Sorteador: uniforme, sem viés de módulo (rejection sampling) e sem Math.random.
function randInt(min,max){if(!globalThis.crypto?.getRandomValues)throw Error('Seu navegador não oferece aleatoriedade segura neste contexto HTTPS.');const range=max-min+1;if(range<=0||range>4294967296)throw Error('Intervalo permitido: no máximo 4,29 bilhões de possibilidades.');const lim=Math.floor(4294967296/range)*range;const buf=new Uint32Array(1);let n;do{crypto.getRandomValues(buf);n=buf[0]}while(n>=lim);return min+(n%range);}
function shuffle(list){const arr=list.slice();for(let i=arr.length-1;i>0;i--){const j=randInt(0,i);[arr[i],arr[j]]=[arr[j],arr[i]];}return arr}
function initSort(){let last='';let history=[];
 const mode=()=>document.querySelector('input[name="sort-mode"]:checked').value;
 document.querySelectorAll('input[name="sort-mode"]').forEach(r=>r.addEventListener('change',()=>{$('sort-numbers').hidden=mode()!=='numeros';$('sort-names').hidden=mode()!=='nomes'}));
 function sort(){const unique=$('sort-unique').checked;let picks=[];
  if(mode()==='numeros'){
   const min=num('sort-min'),max=num('sort-max'),count=num('sort-count');if(![min,max,count].every(Number.isSafeInteger)||min>max||count<1||count>500)throw Error('Defina números inteiros válidos e quantidade entre 1 e 500.');const range=max-min+1;if(!Number.isSafeInteger(range)||range>4294967296)throw Error('O intervalo não pode exceder 4,29 bilhões.');if(unique&&count>range)throw Error('Quantidade maior que os números disponíveis sem repetição.');
   if(unique){const found=new Set();while(picks.length<count){const n=randInt(min,max);if(!found.has(n)){found.add(n);picks.push(String(n));}}}else for(let i=0;i<count;i++)picks.push(String(randInt(min,max)));
  }else{
   const names=$('sort-list').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(!names.length)throw Error('Insira nomes ou itens, um por linha.');if(names.length>10000)throw Error('Limite de 10 mil itens por sorteio.');const count=Math.max(1,Math.min(500,Math.floor(num('sort-count')||1)));
   if(unique&&count>new Set(names).size)throw Error('Não há itens distintos suficientes para um sorteio sem repetição.');const pool=unique?[...new Set(names)]:names;
   if(unique)picks=shuffle(pool).slice(0,count);else for(let i=0;i<count;i++)picks.push(pool[randInt(0,pool.length-1)]);
  }
  if(!use())return;
  last=picks.join(', ');history.unshift(last);history=history.slice(0,5);
  output('Resultado do sorteio',`<div class="ws13-result-lead">${clean(last)}</div>${line('Itens sorteados',picks.length)}${line('Sem repetição',unique?'Sim':'Não')}<p>${btnCopy(last)}</p>`);
  $('sort-history').textContent='Histórico nesta sessão: '+history.join(' • ');
 }
 $('sort-run').addEventListener('click',wrap(sort));$('sort-copy').addEventListener('click',()=>{if(last)copy(last);else msg('Faça um sorteio primeiro.',true)});
}

// 8 — IMC e TMB para adultos: Mifflin-St Jeor, estimativa e faixas OMS para adultos.
function initHealth(){function calc(){
 const w=num('health-weight'),h=num('health-height'),age=num('health-age'),sex=$('health-sex').value,activity=num('health-activity');
 if(![w,h,age,activity].every(Number.isFinite)||w<=0||w>500||h<50||h>250||age<18||age>110)throw Error('Preencha valores dentro dos limites indicados (adultos de 18 a 110 anos).');
 if(!use())return;
 const bmi=w/(h/100)**2;
 const kind=bmi<18.5?'Baixo peso':bmi<25?'Faixa considerada adequada':bmi<30?'Sobrepeso':bmi<35?'Obesidade — classe I':bmi<40?'Obesidade — classe II':'Obesidade — classe III';
 const bmr=10*w+6.25*h-5*age+(sex==='m'?5:-161),tdee=bmr*activity;
 output('Estimativas calculadas',`<div class="ws13-result-lead">IMC ${nf(bmi,1)}</div>${line('Faixa de IMC (adultos)',kind)}${line('TMB estimada',nf(bmr,0)+' kcal/dia')}${line('Gasto energético diário estimado',nf(tdee,0)+' kcal/dia')}${line('Equação','Mifflin–St Jeor')}${note('IMC é uma triagem, não diagnóstico. TMB e gasto energético são estimativas populacionais, não prescrições de ingestão calórica.')}${warn('Não aplicar as faixas de IMC a menores de 18 anos nem durante a gestação. Procure orientação profissional para interpretação clínica.')}`);
 }
 $('ws13-form').addEventListener('submit',wrap(calc));
}

// 9 — CEP com ViaCEP: consultas exclusivamente sob demanda.
function initCep(){const state=$('cep-state');state.value='MG';
 async function query(url){if(!use())return;msg('Consultando o ViaCEP...');$('ws13-result-title').textContent='Pesquisando';$('ws13-output').innerHTML='<p class="ws13-muted">Consultando serviço externo. Verifique sua conexão com a internet.</p>';
  try{const res=await fetch(url,{headers:{'Accept':'application/json'}});if(!res.ok)throw Error('O serviço de CEP não respondeu. Tente novamente.');const data=await res.json();if(data.erro)throw Error('CEP não encontrado. Confira os dados.');const items=Array.isArray(data)?data:[data];if(!items.length)throw Error('Nenhum resultado encontrado. Tente outro logradouro ou cidade.');
   output(`${items.length} resultado${items.length===1?'':'s'}`,items.slice(0,50).map(d=>`<div class="ws13-cep-entry"><div class="ws13-result-lead" style="font-size:1.2rem">${clean(d.cep||'Sem CEP')}</div>${line('Logradouro',d.logradouro||'Não informado')}${line('Bairro',d.bairro||'Não informado')}${line('Cidade / UF',(d.localidade||'')+' / '+(d.uf||''))}${line('Complemento',d.complemento||'Não informado')}${line('Código IBGE',d.ibge||'Não informado')}<p>${btnCopy(d.cep||'')}</p></div>`).join('<hr class="ws13-line">')+(items.length>50?note('Exibindo os primeiros 50 resultados. Refine a rua para reduzir a lista.'):'')+note('Consulta realizada via ViaCEP. Confirme os dados com o destinatário antes de enviar correspondências.'));
  }catch(e){msg(e.message+' A consulta depende de internet e do ViaCEP.',true);$('ws13-result-title').textContent='Consulta indisponível';$('ws13-output').textContent=e.message}
 }
 $('ws13-form').addEventListener('submit',wrap(()=>{const cep=$('cep-number').value.replace(/\D/g,'');if(!/^\d{8}$/.test(cep))throw Error('Digite exatamente 8 números de CEP.');query(`https://viacep.com.br/ws/${cep}/json/`)}));
 $('cep-address-form').addEventListener('submit',wrap(()=>{const uf=state.value,city=$('cep-city').value.trim(),street=$('cep-street').value.trim();if(city.length<3||street.length<3)throw Error('Cidade e logradouro devem ter pelo menos 3 caracteres.');query(`https://viacep.com.br/ws/${uf}/${encodeURIComponent(city)}/${encodeURIComponent(street)}/json/`)}));
}

// 10 — Aspect ratio, tamanho proporcional e prévia.
function gcd(a,b){while(b){[a,b]=[b,a%b]}return a}
function initAspect(){
 function calc(){const w=num('aspect-width'),h=num('aspect-height');if(![w,h].every(Number.isSafeInteger)||w<=0||h<=0||w>1e8||h>1e8)throw Error('Informe dimensões inteiras e positivas (até 100 milhões de pixels por lado).');
  const g=gcd(w,h),ar=w/h;let targetw=num('aspect-targetw'),targeth=num('aspect-targeth');
  if($('aspect-from-height').checked){targeth=Number($('aspect-targeth').value);if(!Number.isFinite(targeth)||targeth<=0)throw Error('Informe a nova altura.');targetw=Math.max(1,Math.round(targeth*ar));$('aspect-targetw').value=targetw;}
  else{if(!Number.isFinite(targetw)||targetw<=0)throw Error('Informe a nova largura.');targeth=Math.max(1,Math.round(targetw/ar));$('aspect-targeth').value=targeth;}
  if(!use())return;
  $('aspect-preview').firstElementChild.style.aspectRatio=`${w}/${h}`;
  output('Proporção calculada',`<div class="ws13-result-lead">${w/g}:${h/g}</div>${line('Resolução original',`${nf(w,0)} × ${nf(h,0)} px`)}${line('Relação decimal',nf(ar,6))}${line('Orientação',ar>1?'Horizontal':ar<1?'Vertical':'Quadrada')}${line('Nova resolução proporcional',`${nf(targetw,0)} × ${nf(targeth,0)} px`)}${line('Total de pixels',nf(w*h,0))}${note('Arredondamento para pixels inteiros pode produzir diferença muito pequena na proporção final. O arquivo de imagem não é alterado.')}<p><a href="../redimensionador-redes-sociais/" class="btn btn-outline">Redimensionar arquivo de imagem ↗</a></p>`);
 }
 $('ws13-form').addEventListener('submit',wrap(calc));
 document.querySelectorAll('[data-aspect]').forEach(btn=>btn.addEventListener('click',()=>{const [a,b]=btn.dataset.aspect.split(':').map(Number);const h=num('aspect-height');$('aspect-width').value=Math.round(h*a/b);calc()}));
 $('aspect-targetw').addEventListener('input',()=>{$('aspect-from-height').checked=false});$('aspect-from-height').addEventListener('change',()=>{if($('aspect-from-height').checked){$('aspect-targeth').readOnly=false;$('aspect-targetw').readOnly=true;}else{$('aspect-targeth').readOnly=true;$('aspect-targetw').readOnly=false;}});
 // initial render is free; avoid silently consuming the first of 10 use slots
 $('aspect-preview').firstElementChild.style.aspectRatio='16/9';
}

const handlers={'conversor-medidas':initMeasures,'tomadas-pelo-mundo':initPlugs,'contador-dias':initDays,'paises-do-mundo':initCountries,'conversor-cores':initColors,'informacoes-dispositivo':initDevice,'sorteador-numeros':initSort,'calculadora-imc-tmb':initHealth,'consulta-cep':initCep,'calculadora-proporcao-imagem':initAspect};
try{handlers[slug]?.()}catch(e){msg('Falha na inicialização: '+e.message,true)}
})();
