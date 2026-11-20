import * as ort from "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/ort.min.mjs";

const MODEL_URL = "https://huggingface.co/StemSplitio/htdemucs-onnx/resolve/d54ed9eb60e258ea82131c6ee14578628816456a/htdemucs_fp16weights.onnx";
const MODEL_BYTES = 165612636;
const CACHE_NAME = "ws-tools-htdemucs-v1";
const SAMPLE_RATE = 44100;
const SEGMENT = 343980;
const OVERLAP = Math.floor(SEGMENT / 4);
const STRIDE = SEGMENT - OVERLAP;

ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(4, navigator.hardwareConcurrency || 4)) : 1;
ort.env.logLevel = "error";

let session = null;
let providerLabel = "WASM · CPU";
let busy = false;

function send(type, payload={}, transfer=[]) { self.postMessage({type, ...payload}, transfer); }

async function readResponseWithProgress(response, fromCache=false) {
  const total = Number(response.headers.get("content-length")) || MODEL_BYTES;
  const reader = response.body?.getReader?.();
  if (!reader) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    send("model-progress", {loaded:buffer.byteLength,total:buffer.byteLength,percent:100,fromCache});
    return buffer;
  }
  let target = new Uint8Array(total);
  const overflow = [];
  let loaded = 0, lastReport = 0;
  while (true) {
    const {done,value} = await reader.read();
    if (done) break;
    if (loaded + value.length <= target.length) target.set(value, loaded);
    else overflow.push(value);
    loaded += value.length;
    if (loaded - lastReport >= 2*1024*1024 || loaded === total) {
      send("model-progress", {loaded,total,percent:Math.min(100,Math.round(loaded/total*100)),fromCache});
      lastReport = loaded;
    }
  }
  if (overflow.length) {
    const combined = new Uint8Array(loaded);
    combined.set(target.subarray(0, Math.min(target.length, loaded)), 0);
    let offset = Math.min(target.length, loaded);
    for (const part of overflow) { combined.set(part, offset); offset += part.length; }
    target = combined;
  } else if (loaded !== target.length) {
    target = target.slice(0, loaded);
  }
  send("model-progress", {loaded,total:loaded,percent:100,fromCache});
  return target;
}

async function fetchModelBytes() {
  let cache = null;
  try {
    if ("caches" in self) {
      cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(MODEL_URL);
      if (cached) {
        send("stage", {label:"Carregando modelo salvo no navegador…"});
        return await readResponseWithProgress(cached, true);
      }
    }
  } catch (_) { cache = null; }

  send("stage", {label:"Baixando modelo de IA (aprox. 166 MB)…"});
  const response = await fetch(MODEL_URL, {mode:"cors", credentials:"omit", cache:"no-store"});
  if (!response.ok) throw new Error("O servidor do modelo respondeu com erro HTTP " + response.status + ".");
  if (cache) {
    cache.put(MODEL_URL, response.clone())
      .then(() => send("cache-status", {saved:true}))
      .catch(() => send("cache-status", {saved:false}));
  }
  return await readResponseWithProgress(response, false);
}

async function createSession(forceWasm=false) {
  send("stage", {label:"Preparando o motor de inteligência artificial…"});
  const model = await fetchModelBytes();
  const hasGpu = !forceWasm && typeof navigator !== "undefined" && !!navigator.gpu;
  const providers = hasGpu ? ["webgpu","wasm"] : ["wasm"];
  try {
    session = await ort.InferenceSession.create(model, {
      executionProviders: providers,
      graphOptimizationLevel: "all"
    });
    providerLabel = hasGpu ? "WebGPU com fallback WASM" : "WASM · CPU";
  } catch (error) {
    if (!hasGpu) throw error;
    send("stage", {label:"GPU incompatível. Alternando para processamento pela CPU…"});
    session = await ort.InferenceSession.create(model, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all"
    });
    providerLabel = "WASM · CPU";
  }
  send("model-ready", {provider:providerLabel});
}

function makeWindow(chunkIndex, chunkCount) {
  const win = new Float32Array(SEGMENT).fill(1);
  if (chunkIndex > 0) {
    for (let i=0; i<OVERLAP; i++) win[i] = (i+1)/(OVERLAP+1);
  }
  if (chunkIndex < chunkCount-1) {
    for (let i=0; i<OVERLAP; i++) win[SEGMENT-1-i] = (i+1)/(OVERLAP+1);
  }
  return win;
}

async function runChunks(left, right) {
  const total = left.length;
  const chunkCount = Math.ceil(total / STRIDE);
  const outputs = Array.from({length:4}, () => [new Float32Array(total), new Float32Array(total)]);
  const weights = new Float32Array(total);
  const chunk = new Float32Array(2 * SEGMENT);

  for (let index=0; index<chunkCount; index++) {
    const start = index * STRIDE;
    const end = Math.min(start + SEGMENT, total);
    const length = end - start;
    chunk.fill(0);
    chunk.set(left.subarray(start,end), 0);
    chunk.set(right.subarray(start,end), SEGMENT);
    const result = await session.run({
      mix: new ort.Tensor("float32", chunk, [1,2,SEGMENT])
    });
    const data = result.stems.data;
    const window = makeWindow(index, chunkCount);

    for (let stem=0; stem<4; stem++) {
      const base = stem * 2 * SEGMENT;
      const outL = outputs[stem][0], outR = outputs[stem][1];
      for (let i=0; i<length; i++) {
        const w = window[i];
        outL[start+i] += data[base+i] * w;
        outR[start+i] += data[base+SEGMENT+i] * w;
      }
    }
    for (let i=0; i<length; i++) weights[start+i] += window[i];
    send("chunk-progress", {current:index+1,total:chunkCount,percent:Math.round((index+1)/chunkCount*100)});
  }

  for (let stem=0; stem<4; stem++) {
    const [leftOut,rightOut] = outputs[stem];
    for (let i=0; i<total; i++) {
      const w = Math.max(weights[i], 1e-8);
      leftOut[i] /= w;
      rightOut[i] /= w;
    }
  }
  return outputs;
}

function findSafeScale(outputs) {
  let peak = 0;
  const [drums,bass,other] = outputs;
  const length = drums[0].length;
  for (let i=0; i<length; i++) {
    for (let s=0; s<4; s++) {
      const pL = Math.abs(outputs[s][0][i]);
      const pR = Math.abs(outputs[s][1][i]);
      if (pL > peak) peak = pL;
      if (pR > peak) peak = pR;
    }
    const mixL = drums[0][i] + bass[0][i] + other[0][i];
    const mixR = drums[1][i] + bass[1][i] + other[1][i];
    if (Math.abs(mixL) > peak) peak = Math.abs(mixL);
    if (Math.abs(mixR) > peak) peak = Math.abs(mixR);
  }
  return peak > 0.999 ? 0.999 / peak : 1;
}

function wavFromSources(sources, scale) {
  const length = sources[0][0].length;
  const channels = 2;
  const dataBytes = length * channels * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const write = (offset, value) => { for (let i=0; i<value.length; i++) view.setUint8(offset+i, value.charCodeAt(i)); };
  write(0,"RIFF"); view.setUint32(4,36+dataBytes,true); write(8,"WAVE");
  write(12,"fmt "); view.setUint32(16,16,true); view.setUint16(20,1,true);
  view.setUint16(22,channels,true); view.setUint32(24,SAMPLE_RATE,true);
  view.setUint32(28,SAMPLE_RATE*channels*2,true); view.setUint16(32,channels*2,true);
  view.setUint16(34,16,true); write(36,"data"); view.setUint32(40,dataBytes,true);
  let offset=44;
  for (let i=0; i<length; i++) {
    for (let channel=0; channel<2; channel++) {
      let sample=0;
      for (const source of sources) sample += source[channel][i];
      sample *= scale;
      sample = Math.max(-1,Math.min(1,sample));
      view.setInt16(offset, sample < 0 ? sample*32768 : sample*32767, true);
      offset += 2;
    }
  }
  return buffer;
}

async function separate(left, right) {
  if (!session) await createSession(false);
  let outputs;
  try {
    outputs = await runChunks(left,right);
  } catch (error) {
    if (providerLabel.startsWith("WebGPU")) {
      try { await session.release(); } catch (_) {}
      session = null;
      send("stage", {label:"A GPU não concluiu este modelo. Tentando novamente pela CPU…"});
      await createSession(true);
      outputs = await runChunks(left,right);
    } else {
      throw error;
    }
  }

  send("stage", {label:"Montando os arquivos WAV…"});
  const scale = findSafeScale(outputs);
  const ordered = [
    {key:"vocals",label:"Voz",sources:[outputs[3]]},
    {key:"instrumental",label:"Instrumental completo",sources:[outputs[0],outputs[1],outputs[2]]},
    {key:"drums",label:"Bateria",sources:[outputs[0]]},
    {key:"bass",label:"Baixo",sources:[outputs[1]]},
    {key:"other",label:"Outros instrumentos",sources:[outputs[2]]}
  ];
  for (const item of ordered) {
    const buffer = wavFromSources(item.sources,scale);
    send("stem-ready", {key:item.key,label:item.label,buffer}, [buffer]);
  }
  send("done", {provider:providerLabel,duration:left.length/SAMPLE_RATE});
}

self.addEventListener("message", async (event) => {
  const message = event.data || {};
  if (message.type === "clear-model-cache") {
    if (busy) return;
    if (session) { try { await session.release(); } catch (_) {} session=null; }
    let deleted=false;
    try { deleted = await caches.delete(CACHE_NAME); } catch (_) {}
    send("model-cleared", {deleted});
    return;
  }
  if (message.type !== "separate" || busy) return;
  busy = true;
  try {
    const left = new Float32Array(message.left);
    const right = new Float32Array(message.right);
    if (left.length !== right.length || !left.length) throw new Error("Áudio estéreo inválido.");
    await separate(left,right);
  } catch (error) {
    send("error", {message:error?.message || "Falha ao separar o áudio."});
  } finally {
    busy = false;
  }
});
