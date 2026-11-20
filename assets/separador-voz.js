const MODEL_CACHE = "ws-tools-htdemucs-v1";
const MODEL_URL = "https://huggingface.co/StemSplitio/htdemucs-onnx/resolve/d54ed9eb60e258ea82131c6ee14578628816456a/htdemucs_fp16weights.onnx";
const MAX_BYTES = 80 * 1024 * 1024;
const MAX_SECONDS = 240;
const RATE = 44100;
const $ = id => document.getElementById(id);

let worker = null;
let file = null;
let busy = false;
let urls = {};

function status(message, kind="") {
  const el = $("stem-status");
  el.textContent = message;
  el.className = "ws-outcome" + (kind ? " " + kind : "");
}
function progress(percent, label) {
  const n = Math.max(0,Math.min(100,Number(percent)||0));
  $("stem-progress").value = n;
  $("stem-progress-percent").textContent = Math.round(n) + "%";
  if (label) $("stem-progress-label").textContent = label;
}
function setBusy(value) {
  busy = value;
  $("stem-run").disabled = value || !file;
  $("stem-file").disabled = value;
  $("stem-cancel").hidden = !value;
  $("stem-clear-model").disabled = value;
}
function cleanupUrls() {
  Object.values(urls).forEach(url => URL.revokeObjectURL(url));
  urls = {};
  document.querySelectorAll("#stem-results audio").forEach(audio => audio.removeAttribute("src"));
  document.querySelectorAll("[data-stem-download]").forEach(button => button.disabled = true);
}
function clearResults() {
  cleanupUrls();
  $("stem-results").hidden = true;
  $("stem-empty").hidden = false;
}
function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./separador-voz-worker.js", import.meta.url), {type:"module"});
  worker.addEventListener("message", onWorkerMessage);
  worker.addEventListener("error", event => {
    status("Não foi possível iniciar o motor de IA. Atualize a página e tente novamente. " + (event.message || ""), "error");
    setBusy(false);
    progress(0,"Falha ao iniciar");
    worker?.terminate();
    worker = null;
  });
  return worker;
}
function onWorkerMessage(event) {
  const m = event.data || {};
  if (m.type === "stage") {
    $("stem-progress-label").textContent = m.label || "Processando…";
    status(m.label || "Processando…");
  } else if (m.type === "model-progress") {
    const mb = (m.loaded/1048576).toFixed(1);
    const total = (m.total/1048576).toFixed(1);
    const label = m.fromCache ? "Lendo modelo salvo" : "Baixando modelo de IA";
    progress(m.percent, `${label}: ${mb} / ${total} MB`);
  } else if (m.type === "model-ready") {
    $("stem-cache-status").textContent = "Modelo carregado · " + (m.provider || "processamento local");
  } else if (m.type === "cache-status") {
    $("stem-cache-status").textContent = m.saved
      ? "Modelo salvo neste navegador para os próximos usos."
      : "Não foi possível guardar o modelo; talvez seja necessário baixá-lo novamente.";
  } else if (m.type === "chunk-progress") {
    progress(m.percent, `Separando música: bloco ${m.current} de ${m.total}`);
    status(`A IA está separando a música. Bloco ${m.current} de ${m.total}. Isso pode levar alguns minutos.`);
  } else if (m.type === "stem-ready") {
    const blob = new Blob([m.buffer], {type:"audio/wav"});
    if (urls[m.key]) URL.revokeObjectURL(urls[m.key]);
    urls[m.key] = URL.createObjectURL(blob);
    const audio = $("stem-audio-" + m.key);
    audio.src = urls[m.key];
    const button = document.querySelector(`[data-stem-download="${m.key}"]`);
    button.disabled = false;
    $("stem-results").hidden = false;
    $("stem-empty").hidden = true;
  } else if (m.type === "done") {
    if (window.WSUsage?.consume) window.WSUsage.consume();
    progress(100,"Separação concluída");
    status(`Concluído! As cinco faixas estão prontas. Processamento: ${m.provider || "local"}.`, "success");
    setBusy(false);
  } else if (m.type === "error") {
    status("Não foi possível concluir a separação: " + (m.message || "erro desconhecido") + " Tente um arquivo menor ou outro navegador.", "error");
    setBusy(false);
    progress(0,"Processamento interrompido");
  } else if (m.type === "model-cleared") {
    $("stem-cache-status").textContent = m.deleted
      ? "Modelo removido do armazenamento deste site."
      : "Não havia modelo salvo ou o navegador não permitiu apagar o cache.";
    status("Modelo em memória liberado e cache solicitado para remoção.", "success");
  }
}

async function decodeAndResample(selectedFile) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx || !window.OfflineAudioContext) throw new Error("Este navegador não oferece os recursos de áudio necessários. Use Chrome ou Edge atualizado.");
  const context = new AudioCtx();
  let decoded;
  try {
    decoded = await context.decodeAudioData(await selectedFile.arrayBuffer());
  } finally {
    await context.close().catch(()=>{});
  }
  if (decoded.duration > MAX_SECONDS) throw new Error("O arquivo tem " + Math.ceil(decoded.duration/60) + " minutos. O limite desta versão é de 4 minutos.");
  const frames = Math.ceil(decoded.duration * RATE);
  const offline = new OfflineAudioContext(2, frames, RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.channelCount = 2;
  source.channelCountMode = "explicit";
  source.channelInterpretation = "speakers";
  source.connect(offline.destination);
  source.start(0);
  const normalized = await offline.startRendering();
  const left = normalized.getChannelData(0).slice();
  const right = normalized.getChannelData(1).slice();
  return {left,right,duration:normalized.duration};
}

$("stem-file").addEventListener("change", event => {
  file = event.target.files?.[0] || null;
  clearResults();
  progress(0,"Aguardando processamento");
  if (!file) {
    $("stem-file-info").textContent = "Nenhum arquivo selecionado. Limite: 80 MB e 4 minutos.";
    $("stem-run").disabled = true;
    status("Selecione uma música para começar.");
    return;
  }
  $("stem-file-info").textContent = `${file.name} · ${(file.size/1048576).toFixed(1)} MB`;
  if (file.size > MAX_BYTES) {
    status("O arquivo ultrapassa o limite de 80 MB. Use um arquivo menor.", "error");
    $("stem-run").disabled = true;
    return;
  }
  $("stem-run").disabled = false;
  status("Arquivo selecionado. Clique em “Separar com inteligência artificial”.");
});

$("stem-run").addEventListener("click", async () => {
  if (!file || busy || (window.WSUsage?.can && !window.WSUsage.can())) return;
  clearResults();
  setBusy(true);
  progress(0,"Preparando áudio");
  status("Lendo e convertendo o áudio para o formato de processamento…");
  try {
    const prepared = await decodeAndResample(file);
    const w = getWorker();
    progress(0,"Preparando modelo de IA");
    status("Áudio preparado. Inicializando o modelo de separação…");
    w.postMessage(
      {type:"separate",left:prepared.left.buffer,right:prepared.right.buffer},
      [prepared.left.buffer,prepared.right.buffer]
    );
  } catch (error) {
    status(error?.message || "Não foi possível ler este arquivo de áudio.", "error");
    setBusy(false);
    progress(0,"Falha ao preparar áudio");
  }
});

$("stem-cancel").addEventListener("click", () => {
  if (worker) worker.terminate();
  worker = null;
  setBusy(false);
  progress(0,"Processamento cancelado");
  status("Processamento cancelado. O modelo que já foi baixado pode continuar no cache do navegador.");
});

$("stem-clear-model").addEventListener("click", async () => {
  if (busy) return;
  if (worker) {
    worker.postMessage({type:"clear-model-cache"});
    return;
  }
  try {
    const deleted = "caches" in window ? await caches.delete(MODEL_CACHE) : false;
    $("stem-cache-status").textContent = deleted ? "Modelo removido do armazenamento deste site." : "Não havia modelo salvo ou o navegador não permitiu apagar o cache.";
    status("Solicitação de limpeza do modelo concluída.", "success");
  } catch (_) {
    status("O navegador não permitiu apagar o modelo salvo.", "error");
  }
});

document.querySelectorAll("[data-stem-download]").forEach(button => {
  button.addEventListener("click", () => {
    const key = button.dataset.stemDownload;
    const url = urls[key];
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `ws-tools-${key}.wav`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
});

async function checkCachedModel() {
  try {
    if (!("caches" in window)) return;
    const cache = await caches.open(MODEL_CACHE);
    const cached = await cache.match(MODEL_URL);
    if (cached) $("stem-cache-status").textContent = "Modelo de IA já salvo neste navegador.";
  } catch (_) {}
}
checkCachedModel();
window.addEventListener("beforeunload", cleanupUrls);
