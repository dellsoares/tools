(()=>{
'use strict';
const byId=id=>document.getElementById(id);
const el=byId('pomo-widget');if(!el)return;
const staticPageTitle=document.title;
const time=byId('pomo-time'),label=byId('pomo-label'),progress=byId('pomo-progress'),start=byId('pomo-start'),status=byId('pomo-status');
const modes=Array.from(el.querySelectorAll('.pomo-mode'));
const inputs={focus:byId('pomo-focus-min'),short:byId('pomo-short-min'),long:byId('pomo-long-min')};
const sound=byId('pomo-sound'),auto=byId('pomo-auto'),task=byId('pomo-task');
const key='ws-tools-pomodoro-preferences-v1';
const ranges={focus:[1,180],short:[1,60],long:[1,90]};
const names={focus:'Hora de focar',short:'Pausa curta',long:'Pausa longa'};
const defaults={focus:25,short:5,long:15};
let durations={...defaults},phase='focus',remaining=25*60,running=false,endAt=0,focuses=0,ticker=null,audioContext=null;
const circumference=2*Math.PI*108;
progress.style.strokeDasharray=String(circumference);
function loadPrefs(){try{const data=JSON.parse(localStorage.getItem(key)||'null');if(data&&typeof data==='object'){
 for(const k of Object.keys(defaults)){const v=Number(data[k]);if(Number.isInteger(v)&&v>=ranges[k][0]&&v<=ranges[k][1])durations[k]=v;}
 sound.checked=data.sound!==false;auto.checked=data.auto===true;
}}catch(_){}}
function storePrefs(){try{localStorage.setItem(key,JSON.stringify({...durations,sound:sound.checked,auto:auto.checked}));}catch(_){}}
function announce(txt){status.textContent=txt}
function secsFor(p){return durations[p]*60}
function update(){
 const s=Math.max(0,Math.ceil(remaining));time.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
 const ratio=Math.max(0,Math.min(1,remaining/secsFor(phase)));
 progress.style.strokeDashoffset=String(circumference*(1-ratio));
 progress.style.stroke=phase==='focus'?'#e7bb55':'#7bc9ec';
 label.textContent=names[phase];
 modes.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.phase===phase)));
 start.textContent=running?'Ⅱ Pausar':'▶ Iniciar';
 byId('pomo-cycles').textContent=String(focuses);
 document.title=running?(time.textContent+' · '+names[phase]+' | WS Tools'):staticPageTitle;
}
function stop(){running=false;if(ticker!==null){clearInterval(ticker);ticker=null;}}
function setPhase(next,message){stop();phase=next;remaining=secsFor(next);update();if(message)announce(message)}
function unlockSound(){if(!sound.checked)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audioContext)audioContext=new AC();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});}catch(_){}}
function beep(){if(!sound.checked)return;try{unlockSound();if(!audioContext||audioContext.state!=='running')return;const now=audioContext.currentTime;for(let i=0;i<2;i++){
 const o=audioContext.createOscillator(),gain=audioContext.createGain(),at=now+i*.29;o.type='sine';o.frequency.value=i===0?785:1047;
 gain.gain.setValueAtTime(0.0001,at);gain.gain.exponentialRampToValueAtTime(.16,at+.025);gain.gain.exponentialRampToValueAtTime(.0001,at+.22);o.connect(gain);gain.connect(audioContext.destination);o.start(at);o.stop(at+.24);
}}catch(_){}}
function complete(){
 const was=phase;stop();beep();
 if(was==='focus'){focuses+=1;phase=focuses%4===0?'long':'short';}
 else phase='focus';
 remaining=secsFor(phase);update();
 announce(was==='focus'?'Foco concluído! Hora da '+(phase==='long'?'pausa longa.':'pausa curta.'):'Pausa encerrada! Volte ao foco.');
 if(auto.checked)begin(true);
}
function tick(){if(!running)return;remaining=Math.max(0,(endAt-Date.now())/1000);if(remaining<=0){complete();return;}update()}
function begin(isAutomatic=false){if(running)return;
 if(remaining>=secsFor(phase)-.5){if(!WSUsage.can()){announce('Limite de 10 períodos por dia atingido.');return;}WSUsage.consume();}
 unlockSound();running=true;endAt=Date.now()+remaining*1000;ticker=setInterval(tick,250);update();if(!isAutomatic)announce('Temporizador em andamento.');}
function pause(){if(!running)return;remaining=Math.max(0,(endAt-Date.now())/1000);stop();if(remaining<=0){complete();return;}update();announce('Pausado. Você pode retomar quando quiser.');}
start.addEventListener('click',()=>running?pause():begin());
byId('pomo-reset').addEventListener('click',()=>setPhase(phase,'Período reiniciado.'));
byId('pomo-skip').addEventListener('click',()=>setPhase(phase==='focus'?'short':'focus','Período pulado, sem contabilizar foco.'));
modes.forEach(btn=>btn.addEventListener('click',()=>setPhase(btn.dataset.phase,'Período selecionado.')));
byId('pomo-settings').addEventListener('submit',event=>{
 event.preventDefault();
 const next={};for(const k of Object.keys(defaults)){
  const raw=inputs[k].value.trim();const v=Number(raw);
  if(!raw||!Number.isInteger(v)||v<ranges[k][0]||v>ranges[k][1]){inputs[k].focus();announce('Informe minutos inteiros dentro do limite de cada campo.');return;}
  next[k]=v;
 }
 durations=next;storePrefs();setPhase(phase,'Tempos ajustados e período reiniciado.');
});
sound.addEventListener('change',storePrefs);auto.addEventListener('change',storePrefs);
loadPrefs();for(const k of Object.keys(defaults))inputs[k].value=String(durations[k]);remaining=secsFor(phase);update();
// A contagem usa o horário real, para reduzir desvios quando o navegador desacelera abas inativas.
window.addEventListener('pageshow',tick);
})();