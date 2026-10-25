// Maps a song for the auto light show: download once, decode, downmix to ~11 kHz and analyse in a Worker so the
// page and the music never stutter. Nothing is stored or uploaded; only the small cue sheet leaves this function.
import { analyzeCues } from "./cues";

const MAX_BYTES = 30e6, MAX_SECONDS = 15 * 60;
const workerSource = () => `const analyze=${analyzeCues.toString()};onmessage=e=>{let r=null;try{r=analyze(e.data.x,e.data.sr)}catch(_){}postMessage(r)}`;

export const canMapSongs = () => {
  if (typeof window === "undefined" || typeof Worker === "undefined" || !(window.OfflineAudioContext || window.webkitOfflineAudioContext)) return false;
  if (navigator.connection?.saveData) return false;
  if (navigator.deviceMemory && navigator.deviceMemory < 2) return false;
  return true;
};

export async function mapSong(trackId, { signal } = {}) {
  const res = await fetch("https://api.audius.co/v1/tracks/" + encodeURIComponent(trackId) + "/stream", { signal });
  if (!res.ok || Number(res.headers.get("content-length")) > MAX_BYTES) return null;
  const buf = await res.arrayBuffer();
  if (signal?.aborted || buf.byteLength > MAX_BYTES) return null;
  const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const audio = await new Ctx(1, 1, 44100).decodeAudioData(buf);
  if (signal?.aborted || audio.duration > MAX_SECONDS) return null;
  // downmix + box-filter decimation; envelope analysis only needs a few kHz
  const step = Math.max(1, Math.round(audio.sampleRate / 11025)), n = Math.floor(audio.length / step), x = new Float32Array(n);
  const ch = Array.from({ length: audio.numberOfChannels }, (_, c) => audio.getChannelData(c)), k = 1 / (step * ch.length);
  for (let i = 0, j = 0; i < n; i++, j += step) { let s = 0; for (const d of ch) for (let q = 0; q < step; q++) s += d[j + q]; x[i] = s * k; }
  const url = URL.createObjectURL(new Blob([workerSource()], { type: "text/javascript" }));
  const worker = new Worker(url);
  try {
    const result = await new Promise((resolve, reject) => {
      worker.onmessage = (e) => resolve(e.data);
      worker.onerror = reject;
      signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      worker.postMessage({ x, sr: audio.sampleRate / step }, [x.buffer]);
    });
    return result ? { ...result, id: trackId } : null;
  } finally { worker.terminate(); URL.revokeObjectURL(url); }
}
