/* WS Tools — Estúdio de Áudio. Arquivos permanecem no navegador. */
let audio = null;
let denoiseTools = null;

(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = {
    project: null, fileName: 'audio', fileType: '', originalUrl: null, previewUrl: null,
    recorder: null, stream: null, micContext: null, micAnalyser: null, micSource: null,
    micFrame: 0, clockTimer: 0, startedAt: 0, elapsedBeforePause: 0, isPaused: false,
    engineReady: false, plugins: new Set()
  };
  const MIME = { wav:'audio/wav', mp3:'audio/mpeg', flac:'audio/flac' };

  function status(id, message, kind='') {
    const node = $(id);
    if (!node) return;
    node.textContent = message;
    node.classList.remove('success','error');
    if (kind) node.classList.add(kind);
  }
  function setBusy(on, message='') {
    $('audio-progress').hidden = !on;
    $('audio-progress-fill').style.width = on ? '12%' : '0%';
    if (message) status('audio-edit-status', message);
    $('audio-preview').disabled = on || !state.project;
    $('audio-export').disabled = on || !state.project;
  }
  function fmtTime(seconds) {
    if (!Number.isFinite(seconds)) return '—';
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return h ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
  }
  function fmtBytes(bytes) {
    if (!Number.isFinite(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1048576).toFixed(2)} MB`;
  }
  function safeName(name) {
    return (name || 'audio').replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60) || 'audio';
  }
  function setMetric(id, value) { $(id).textContent = value; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  async function ensurePlugins(names) {
    for (const name of names) {
      if (state.plugins.has(name)) continue;
      try { await audio.use(name); state.plugins.add(name); }
      catch (err) { console.warn('WS Tools plugin indisponível:', name, err); }
    }
  }

  async function initEngine() {
    try {
      const [audioModule, denoiseModule] = await Promise.all([
        import('https://esm.sh/audio@2.15.1'),
        import('https://esm.sh/@audio/denoise@0.12.0')
      ]);
      audio = audioModule.default || audioModule.audio || audioModule;
      denoiseTools = denoiseModule;
      audio.op('wsSaturate', {
        params:['drive'],
        process:(input,output,ctx)=>{
          const drive=Math.max(1,Number(ctx.drive)||1);
          const norm=Math.tanh(drive);
          for(let c=0;c<input.length;c++){
            const src=input[c],dst=output[c];
            for(let i=0;i<src.length;i++)dst[i]=Math.tanh(src[i]*drive)/norm;
          }
        }
      });
      state.engineReady = true;
      $('audio-engine-status').textContent = 'Motor pronto';
      $('audio-engine-status').classList.add('is-ready');
      $('audio-file').disabled = false;
      $('mic-start').disabled = false;
      status('audio-edit-status','Motor pronto. Carregue um arquivo ou faça uma gravação.');
    } catch (err) {
      $('audio-engine-status').textContent = 'Falha ao carregar';
      status('audio-edit-status','Não foi possível carregar o motor de áudio. Verifique sua conexão e atualize a página.','error');
      console.error(err);
    }
  }

  async function loadAudio(source, name='gravacao') {
    if (!state.engineReady) throw new Error('O motor de áudio ainda está carregando.');
    status('audio-edit-status','Abrindo e decodificando o áudio…');
    const next = audio(source, { storage:'auto' });
    await next.ready;
    if (!Number.isFinite(next.duration) || next.duration <= 0) throw new Error('Não foi possível identificar a duração deste arquivo.');
    if (state.project && typeof state.project.dispose === 'function') state.project.dispose();
    state.project = next;
    state.fileName = name || 'audio';
    state.fileType = source.type || '';
    if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
    state.originalUrl = URL.createObjectURL(source);
    $('audio-original-player').src = state.originalUrl;
    $('audio-processed-player').removeAttribute('src');
    if (state.previewUrl) { URL.revokeObjectURL(state.previewUrl); state.previewUrl = null; }
    $('audio-file-name').textContent = state.fileName;
    $('audio-file-details').textContent = `${fmtTime(next.duration)} · ${fmtBytes(source.size)} · ${next.channels} canal(is)`;
    $('audio-file-summary').hidden = false;
    $('audio-players').hidden = false;
    $('audio-wave-wrap').hidden = false;
    $('audio-analysis-empty').hidden = true;
    $('audio-metrics').hidden = false;
    $('spectrum-wrap').hidden = false;
    $('audio-export').disabled = false;
    $('audio-preview').disabled = false;
    $('trim-start').value = '0';
    $('trim-end').value = next.duration.toFixed(2);
    $('audio-wave-duration').textContent = fmtTime(next.duration);
    await analyzeAudio(next);
    status('audio-edit-status','Áudio carregado. Ajuste as opções e gere uma prévia antes de exportar.','success');
  }

  function drawWave(mins, maxs) {
    const canvas = $('audio-waveform');
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height, mid = h/2;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#07182c'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = 'rgba(125,164,204,.18)'; ctx.lineWidth = 1;
    for (let i=1;i<4;i++){const y=h*i/4;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    ctx.strokeStyle = '#e7bb55'; ctx.lineWidth = 1.35;
    const n = Math.min(mins.length, maxs.length);
    for (let i=0;i<n;i++){
      const x = i*w/n;
      const top = mid - clamp(maxs[i],-1,1)*mid*.88;
      const bottom = mid - clamp(mins[i],-1,1)*mid*.88;
      ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,Math.max(top+1,bottom));ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(75,155,232,.75)';ctx.beginPath();ctx.moveTo(0,mid);ctx.lineTo(w,mid);ctx.stroke();
  }
  function drawSpectrum(values) {
    const canvas = $('audio-spectrum'), ctx = canvas.getContext('2d');
    const w=canvas.width,h=canvas.height;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#07182c';ctx.fillRect(0,0,w,h);
    if (!values || !values.length) return;
    const vals = Array.from(values, v => Number.isFinite(v) ? v : -90);
    const min = Math.min(-80, ...vals), max = Math.max(-8, ...vals);
    const gap=3, barW=(w-gap*(vals.length-1))/vals.length;
    vals.forEach((v,i)=>{
      const pct=clamp((v-min)/(max-min||1),0,1), bh=Math.max(2,pct*(h-28));
      ctx.fillStyle = pct>.78 ? '#e7bb55' : '#4b9be8';
      ctx.fillRect(i*(barW+gap),h-bh-18,barW,bh);
    });
    ctx.fillStyle='#9fb8d3';ctx.font='13px Arial';
    ctx.fillText('Graves',8,h-3);ctx.fillText('Médios',w/2-24,h-3);ctx.fillText('Agudos',w-58,h-3);
  }

  async function statSafe(instance, name, opts) {
    try { return await instance.stat(name, opts); } catch (err) { console.warn('Métrica indisponível:',name,err); return null; }
  }
  async function analyzeAudio(instance) {
    try {
      const [minsMaxs, peak, rms, loudness, clipping, spectrum] = await Promise.all([
        instance.stat(['min','max'],{bins:900}).catch(()=>null),
        statSafe(instance,'db'),
        statSafe(instance,'rms'),
        statSafe(instance,'loudness'),
        statSafe(instance,'clipping'),
        statSafe(instance,'spectrum',{bins:72})
      ]);
      if (minsMaxs && minsMaxs.length===2) drawWave(minsMaxs[0],minsMaxs[1]);
      if (spectrum) drawSpectrum(spectrum);
      setMetric('metric-duration',fmtTime(instance.duration));
      setMetric('metric-format',(state.fileType.split('/').pop() || 'áudio').toUpperCase()+' / '+instance.channels+' ch');
      setMetric('metric-rate',`${(instance.sampleRate/1000).toFixed(1)} kHz`);
      setMetric('metric-peak',Number.isFinite(peak)?`${peak.toFixed(1)} dBFS`:'Não disponível');
      const rmsDb = Number.isFinite(rms) && rms>0 ? 20*Math.log10(rms) : null;
      setMetric('metric-rms',Number.isFinite(rmsDb)?`${rmsDb.toFixed(1)} dBFS`:'Não disponível');
      setMetric('metric-lufs',Number.isFinite(loudness)?`${loudness.toFixed(1)} LUFS`:'Não disponível');
      let clipCount = 'Não disponível';
      if (typeof clipping === 'number') clipCount = String(Math.round(clipping));
      else if (clipping && typeof clipping.length === 'number') clipCount = String(clipping.length);
      setMetric('metric-clipping',clipCount);
      setMetric('metric-depth',instance.bitDepth?`${instance.bitDepth} bits`:'Não informado');
    } catch (err) {
      console.warn('Análise parcial:',err);
      status('audio-edit-status','O áudio foi carregado, mas algumas métricas não puderam ser calculadas.');
    }
  }

  function applyVinylTexture(instance) {
    if (instance.duration > 120) return false;
    const sr = instance.sampleRate, length = Math.ceil(instance.duration*sr);
    const noise = new Float32Array(length);
    let seed = 271828183;
    const rand = () => { seed = (seed*1664525+1013904223)>>>0; return seed/4294967296; };
    for(let i=0;i<length;i++) noise[i]=(rand()*2-1)*0.0012;
    const pops = Math.min(160,Math.round(instance.duration*1.25));
    for(let p=0;p<pops;p++){
      const at=Math.floor(rand()*length), amp=(rand()*.012+.003), span=Math.min(length-at,Math.floor(sr*.002));
      for(let j=0;j<span;j++) noise[at+j]+=amp*(1-j/(span||1));
    }
    try {
      const texture = audio.from([noise],{sampleRate:sr});
      texture.lowpass(9000).gain(-29);
      instance.mix(texture,{at:0});
      return true;
    } catch (err) { console.warn('Textura de vinil indisponível:',err); return false; }
  }

  async function applyNoiseReduction(instance, mode) {
    if (mode==='off') return instance;
    const pcm = await instance.read();
    const fs = instance.sampleRate;
    let fn, opts={fs};
    if (mode==='auto') fn = denoiseTools.denoise;
    if (mode==='profile') {
      fn = denoiseTools.omlsa;
      const start = Number($('noise-start').value);
      const duration = Number($('noise-duration').value);
      if (!Number.isFinite(start)||!Number.isFinite(duration)||start<0||duration<=0||start+duration>instance.duration) throw new Error('O trecho do perfil de ruído precisa estar dentro do áudio.');
      opts.profileFrom = Math.floor(start*fs);
      opts.profileTo = Math.floor((start+duration)*fs);
      opts.gMin = -Number($('noise-reduction').value);
    }
    if (mode==='hum') fn = denoiseTools.dehum;
    if (mode==='dereverb') { fn = denoiseTools.dereverb; opts.strength = 0.65; }
    let neuralModel = null;
    if (mode==='rnnoise' || mode==='deepfilter') {
      status('audio-edit-status',mode==='deepfilter'?'Baixando/carregando o modelo neural avançado (primeira vez: cerca de 8 MB)…':'Carregando o redutor neural RNNoise para voz…');
      const mod = await import('https://esm.sh/@audio/neural-denoise@0.8.1');
      fn = mod.default || mod.denoise;
      if (mode==='deepfilter' && typeof mod.load==='function') neuralModel = await mod.load('deepfilternet3');
    }
    if (typeof fn!=='function') throw new Error('O método de redução de ruído não ficou disponível.');
    const cleaned = [];
    try {
      for (let c=0;c<pcm.length;c++) {
        status('audio-edit-status',`Limpando ruído: canal ${c+1} de ${pcm.length}…`);
        const input = pcm[c];
        let output;
        if (mode==='rnnoise') output = await fn(input,{sampleRate:fs});
        else if (mode==='deepfilter') output = await fn(input,{sampleRate:fs,model:neuralModel || 'deepfilternet3'});
        else output = await fn(input,opts);
        cleaned.push(output?.out || output);
      }
      return audio.from(cleaned,{sampleRate:fs});
    } finally {
      if (neuralModel && typeof neuralModel.free==='function') neuralModel.free();
    }
  }

  async function applyProcessing() {
    if (!state.project) throw new Error('Carregue um áudio primeiro.');
    let work = state.project.clone();
    const mode = $('noise-mode').value;
    if (mode!=='off') {
      const cleaned = await applyNoiseReduction(work,mode);
      if (work.dispose) work.dispose();
      work = cleaned;
    }
    if ($('remove-clicks').checked) {
      status('audio-edit-status','Detectando e reconstruindo cliques e estalos…');
      const pcm = await work.read(), fs=work.sampleRate;
      const cleaned = pcm.map(channel => denoiseTools.decrackle(denoiseTools.declick(channel,{fs}),{fs}));
      const next = audio.from(cleaned,{sampleRate:fs});
      if (work.dispose) work.dispose(); work=next;
    }
    const start = Number($('trim-start').value||0);
    const endRaw = $('trim-end').value.trim();
    const end = endRaw==='' ? work.duration : Number(endRaw);
    if (!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>work.duration||end<=start) throw new Error('Confira os pontos de início e fim do corte.');
    if (start>0 || end<work.duration) work.crop({at:start,duration:end-start});
    if ($('remove-silence').checked) {
      status('audio-edit-status','Identificando pausas e encurtando silêncios…');
      const gap=Number($('silence-gap').value), threshold=Number($('silence-threshold').value);
      work.shrink(gap,threshold);
    }
    if ($('highpass-audio').checked) work.highpass(80);
    const bass=Number($('eq-bass').value), mid=Number($('eq-mid').value), treble=Number($('eq-treble').value);
    if (bass) work.lowshelf(150,bass);
    if (mid) work.eq(2800,mid,1.1);
    if (treble) work.highshelf(8500,treble);
    if ($('compress-audio').checked) {
      await ensurePlugins(['compressor']);
      if (typeof work.compressor==='function') work.compressor({threshold:-20,ratio:3,knee:6,attack:8,release:120});
    }
    const intensity=Number($('effect-intensity').value)/100;
    const effect=$('voice-effect').value;
    await applyEffect(work,effect,intensity);
    const gain=Number($('gain-db').value);
    if (gain) work.gain(gain);
    const fadeIn=Number($('fade-in').value||0), fadeOut=Number($('fade-out').value||0);
    if (fadeIn<0||fadeOut<0||fadeIn>20||fadeOut>20||fadeIn+fadeOut>work.duration) throw new Error('Os fades devem ficar entre 0 e 20 segundos e não podem ultrapassar a duração do áudio.');
    if (fadeIn || fadeOut) work.fade(fadeIn,-fadeOut);
    if ($('normalize-audio').checked) work.normalize(-1);
    return work;
  }

  async function applyEffect(work,effect,intensity) {
    if (!effect || effect==='none') return;
    if (effect==='radio') {
      await ensurePlugins(['compressor']);
      work.highpass(260).lowpass(3600).compressor({threshold:-22,ratio:4,knee:8});
      if (typeof work.wsSaturate==='function') work.wsSaturate(1+intensity*1.2);
    } else if (effect==='studio') {
      await ensurePlugins(['compressor','deesser']);
      work.highpass(75).lowshelf(140,-1.5).eq(3200,1.5+intensity*2,1.1).highshelf(9500,1+intensity);
      if (typeof work.deesser==='function') work.deesser();
      work.compressor({threshold:-20,ratio:2.5,knee:8});
    } else if (effect==='megaphone') {
      
      work.highpass(480).lowpass(2800).remix(1);
      if (typeof work.wsSaturate==='function') work.wsSaturate(1.8+intensity*2.8);
    } else if (effect==='vinyl') {
      
      work.highpass(65).lowpass(9000).remix(1);
      if (typeof work.wsSaturate==='function') work.wsSaturate(1.05+intensity*.7);
      const added=applyVinylTexture(work);
      if (!added) status('audio-edit-status','Efeito vinil aplicado. A textura de chiado foi omitida em arquivos acima de 2 minutos.');
    } else if (effect==='telephone') {
      await ensurePlugins(['compressor']);
      work.highpass(300).lowpass(3400).remix(1).compressor({threshold:-24,ratio:3.5});
    } else if (effect==='walkie') {
      
      work.highpass(500).lowpass(2600).remix(1);
      if (typeof work.wsSaturate==='function') work.wsSaturate(1.6+intensity*2.5);
    } else if (effect==='echo') {
      await ensurePlugins(['delay']);
      if (typeof work.delay==='function') work.delay({time:.22,feedback:.18+intensity*.28,mix:.12+intensity*.2});
    } else if (effect==='auditorium') {
      await ensurePlugins(['freeverb']);
      if (typeof work.freeverb==='function') work.freeverb({room:.45+intensity*.45,mix:.12+intensity*.25});
    }
  }

  async function renderAudio(download=false) {
    if (!state.project) return;
    if (download && window.WSUsage && !WSUsage.can()) return;
    setBusy(true,download?'Preparando processamento e exportação…':'Gerando prévia com os ajustes selecionados…');
    let processed=null;
    try {
      processed=await applyProcessing();
      $('audio-progress-fill').style.width='55%';
      const format=download?$('audio-format').value:'wav';
      const opts=format==='mp3'?{bitrate:192}:format==='wav'?{bitDepth:16}:{};
      const bytes=await processed.encode(format,opts);
      $('audio-progress-fill').style.width='90%';
      const blob=new Blob([bytes],{type:MIME[format]||'application/octet-stream'});
      if (download) {
        if (window.WSUsage && !WSUsage.consume()) return;
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download=`${safeName(state.fileName)}-ws-tools.${format}`;
        document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),30000);
        status('audio-edit-status',`Áudio exportado em ${format.toUpperCase()} · ${fmtBytes(blob.size)}. Seus ajustes foram aplicados.`,'success');
      } else {
        if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
        state.previewUrl=URL.createObjectURL(blob);
        $('audio-processed-player').src=state.previewUrl;
        $('audio-processed-player').load();
        status('audio-edit-status','Prévia pronta. Compare com o original e exporte quando estiver satisfeito.','success');
      }
      $('audio-progress-fill').style.width='100%';
    } catch(err) {
      console.error(err);
      status('audio-edit-status',err?.message||'Não foi possível processar este áudio. Tente um arquivo menor ou outro formato.','error');
    } finally {
      if(processed && processed.dispose) processed.dispose();
      setTimeout(()=>{ $('audio-progress').hidden=true; $('audio-progress-fill').style.width='0%'; },350);
      $('audio-preview').disabled=!state.project;
      $('audio-export').disabled=!state.project;
    }
  }

  async function populateMicrophones() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices=await navigator.mediaDevices.enumerateDevices();
      const inputs=devices.filter(d=>d.kind==='audioinput');
      const select=$('mic-device'), selected=select.value;
      select.innerHTML='<option value="">Microfone padrão</option>';
      inputs.forEach((d,i)=>{
        const opt=document.createElement('option');opt.value=d.deviceId;opt.textContent=d.label||`Microfone ${i+1}`;select.appendChild(opt);
      });
      if(selected) select.value=selected;
    } catch(err) { console.warn('Não foi possível listar microfones:',err); }
  }

  function updateMicMeter() {
    if (!state.micAnalyser) return;
    const data=new Uint8Array(state.micAnalyser.fftSize);
    state.micAnalyser.getByteTimeDomainData(data);
    let sum=0;
    for(let i=0;i<data.length;i++){const v=(data[i]-128)/128;sum+=v*v;}
    const rms=Math.sqrt(sum/data.length);
    $('mic-meter-fill').style.width=`${clamp(rms*240,0,100)}%`;
    state.micFrame=requestAnimationFrame(updateMicMeter);
  }
  function updateMicClock() {
    const elapsed=state.elapsedBeforePause+(state.isPaused?0:(Date.now()-state.startedAt)/1000);
    $('mic-clock').textContent=fmtTime(elapsed);
  }
  async function startRecording() {
    if (!state.engineReady) throw new Error('Aguarde o motor de áudio terminar de carregar.');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Este navegador não oferece gravação de áudio compatível.');
    const device=$('mic-device').value;
    const constraints={audio:device?{deviceId:{exact:device}}:true};
    state.stream=await navigator.mediaDevices.getUserMedia(constraints);
    await populateMicrophones();
    const candidates=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'];
    const mime=candidates.find(t=>MediaRecorder.isTypeSupported?.(t));
    state.recorder=new MediaRecorder(state.stream,mime?{mimeType:mime}:undefined);
    const chunks=[];
    state.recorder.addEventListener('dataavailable',ev=>{if(ev.data&&ev.data.size)chunks.push(ev.data);});
    state.recorder.addEventListener('stop',async()=>{
      try {
        const type=state.recorder.mimeType||chunks[0]?.type||'audio/webm';
        const blob=new Blob(chunks,{type});
        await loadAudio(blob,`gravacao-ws-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}`);
        status('mic-status','Gravação finalizada e carregada no editor. Você já pode limpar, editar e exportar.','success');
      } catch(err) { status('mic-status',err.message||'Não foi possível abrir a gravação.','error'); }
      cleanupMic();
    });
    state.recorder.start(500);
    state.startedAt=Date.now();state.elapsedBeforePause=0;state.isPaused=false;
    state.micContext=new (window.AudioContext||window.webkitAudioContext)();
    state.micAnalyser=state.micContext.createAnalyser();state.micAnalyser.fftSize=1024;
    state.micSource=state.micContext.createMediaStreamSource(state.stream);state.micSource.connect(state.micAnalyser);
    updateMicMeter();
    state.clockTimer=setInterval(updateMicClock,250);
    $('mic-live-dot').classList.add('is-live');
    $('mic-state').textContent='Gravando…';
    $('mic-start').disabled=true;$('mic-pause').disabled=false;$('mic-stop').disabled=false;
    $('mic-pause').textContent='Pausar';
    status('mic-status','Gravação em andamento. Você pode pausar e continuar antes de finalizar.');
  }
  function pauseRecording() {
    if (!state.recorder) return;
    if (state.recorder.state==='recording') {
      state.elapsedBeforePause+=(Date.now()-state.startedAt)/1000;
      state.recorder.pause();state.isPaused=true;
      $('mic-pause').textContent='Continuar';$('mic-state').textContent='Pausado';
      $('mic-live-dot').classList.remove('is-live');
      if(state.micFrame)cancelAnimationFrame(state.micFrame);
      $('mic-meter-fill').style.width='0%';
      status('mic-status','Gravação pausada. Clique em Continuar para retomar.');
    } else if (state.recorder.state==='paused') {
      state.recorder.resume();state.startedAt=Date.now();state.isPaused=false;
      $('mic-pause').textContent='Pausar';$('mic-state').textContent='Gravando…';
      $('mic-live-dot').classList.add('is-live');updateMicMeter();
      status('mic-status','Gravação retomada.');
    }
  }
  function stopRecording() {
    if (state.recorder && state.recorder.state!=='inactive') {
      if(state.isPaused) state.isPaused=false;
      state.recorder.stop();
      $('mic-state').textContent='Finalizando…';
      $('mic-start').disabled=true;$('mic-pause').disabled=true;$('mic-stop').disabled=true;
      status('mic-status','Finalizando gravação e preparando o arquivo…');
    }
  }
  function cleanupMic() {
    if(state.clockTimer)clearInterval(state.clockTimer);
    if(state.micFrame)cancelAnimationFrame(state.micFrame);
    if(state.stream)state.stream.getTracks().forEach(t=>t.stop());
    if(state.micSource)try{state.micSource.disconnect();}catch{}
    if(state.micContext)state.micContext.close().catch(()=>{});
    state.recorder=null;state.stream=null;state.micContext=null;state.micAnalyser=null;state.micSource=null;
    state.clockTimer=0;state.micFrame=0;state.isPaused=false;
    $('mic-live-dot').classList.remove('is-live');$('mic-meter-fill').style.width='0%';
    $('mic-state').textContent='Pronto para gravar';$('mic-clock').textContent='00:00';
    $('mic-start').disabled=!state.engineReady;$('mic-pause').disabled=true;$('mic-stop').disabled=true;
    $('mic-pause').textContent='Pausar';
  }

  function bindRange(inputId, outputId, suffix, decimals=0) {
    const input=$(inputId), output=$(outputId);
    const update=()=>{const n=Number(input.value);output.textContent=(decimals?n.toFixed(decimals).replace('.',','):String(n))+suffix;};
    input.addEventListener('input',update);update();
  }
  function bindUI() {
    $('audio-file').addEventListener('change',async ev=>{
      const file=ev.target.files?.[0];if(!file)return;
      try{await loadAudio(file,file.name);}catch(err){console.error(err);status('audio-edit-status',err.message||'Não foi possível abrir este arquivo.','error');}
      ev.target.value='';
    });
    $('audio-remove').addEventListener('click',()=>{
      if(state.project&&state.project.dispose)state.project.dispose();
      state.project=null;
      if(state.originalUrl)URL.revokeObjectURL(state.originalUrl);
      if(state.previewUrl)URL.revokeObjectURL(state.previewUrl);
      state.originalUrl=null;state.previewUrl=null;
      $('audio-file-summary').hidden=true;$('audio-wave-wrap').hidden=true;$('audio-players').hidden=true;
      $('audio-analysis-empty').hidden=false;$('audio-metrics').hidden=true;$('spectrum-wrap').hidden=true;
      $('audio-original-player').removeAttribute('src');$('audio-processed-player').removeAttribute('src');
      $('audio-preview').disabled=true;$('audio-export').disabled=true;
      status('audio-edit-status','Arquivo removido. Carregue outro áudio para continuar.');
    });
    $('audio-preview').addEventListener('click',()=>renderAudio(false));
    $('audio-export').addEventListener('click',()=>renderAudio(true));
    $('mic-start').addEventListener('click',()=>startRecording().catch(err=>{cleanupMic();status('mic-status',err.message||'Não foi possível iniciar a gravação.','error');}));
    $('mic-pause').addEventListener('click',pauseRecording);
    $('mic-stop').addEventListener('click',stopRecording);
    $('noise-mode').addEventListener('change',()=>{
      $('noise-profile-fields').hidden=$('noise-mode').value!=='profile';
      const notes={
        off:'Nenhuma redução será aplicada.',
        auto:'O classificador identifica ruído, zumbido, vento, cliques e outros defeitos quando encontra evidência suficiente.',
        profile:'Use um trecho sem fala para ensinar ao filtro o ruído constante. Mais intensidade pode afetar a voz ou a música.',
        hum:'Detecta e reduz a frequência da rede elétrica (50 ou 60 Hz) e seus harmônicos.',
        rnnoise:'RNNoise reduz ruído variável em gravações de voz. Pode atenuar sons suaves; compare sempre com o original.',
        deepfilter:'DeepFilterNet3 é a opção neural avançada para fala em ruído variável. Baixa cerca de 8 MB na primeira utilização e mantém música detectada como música.',
        dereverb:'Reduz a cauda de reverberação de gravações de voz feitas em ambientes com eco. Compare para evitar deixar a voz artificial.'
      };
      $('noise-mode-note').textContent=notes[$('noise-mode').value]||'';
    });
    $('voice-effect').addEventListener('change',()=>{
      const desc={
        none:'Sem efeito: mantém a característica original da gravação.',
        radio:'Faixa de frequência típica de rádio, compressão e saturação moderada.',
        studio:'Realce de presença, graves controlados e compressão suave para locução.',
        megaphone:'Som estreito, mono e mais agressivo, como um alto-falante portátil.',
        vinyl:'Som mono com faixa reduzida, saturação leve e textura de chiado/estalos.',
        telephone:'Faixa de voz telefônica, com médios destacados.',
        walkie:'Som estreito, comprimido e distorcido, inspirado em rádio comunicador.',
        echo:'Repetições discretas da voz, com controle de intensidade.',
        auditorium:'Reverberação que simula um espaço amplo.'
      };
      $('effect-description').textContent=desc[$('voice-effect').value]||'';
    });
    bindRange('noise-reduction','noise-reduction-value',' dB');
    bindRange('silence-gap','silence-gap-value',' s',2);
    bindRange('silence-threshold','silence-threshold-value',' dB');
    bindRange('gain-db','gain-db-value',' dB',1);
    bindRange('eq-bass','eq-bass-value',' dB');
    bindRange('eq-mid','eq-mid-value',' dB');
    bindRange('eq-treble','eq-treble-value',' dB');
    bindRange('effect-intensity','effect-intensity-value','%');
    $('noise-reduction').addEventListener('input',()=>{ $('noise-reduction-value').textContent=`${$('noise-reduction').value} dB`; });
    populateMicrophones();
    navigator.mediaDevices?.addEventListener?.('devicechange',populateMicrophones);
  }

  bindUI();
  initEngine();
  window.addEventListener('beforeunload',()=>{
    cleanupMic();
    if(state.originalUrl)URL.revokeObjectURL(state.originalUrl);
    if(state.previewUrl)URL.revokeObjectURL(state.previewUrl);
    if(state.project?.dispose)state.project.dispose();
  });
})();
