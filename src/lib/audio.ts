import { createParser } from "eventsource-parser";

const TARGET_RATE = 16000;
const SEGMENT_SECONDS = 10 * 60; // ~19 MB per WAV segment at 16 kHz

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const tag = (o: number, v: string) => { for (let i = 0; i < v.length; i++) view.setUint8(o + i, v.charCodeAt(i)); };
  tag(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); tag(8, "WAVE"); tag(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); tag(36, "data"); view.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (const v of samples) { const s = Math.max(-1, Math.min(1, v)); view.setInt16(o, s * (s < 0 ? 32768 : 32767), true); o += 2; }
  return new Blob([bytes], { type: "audio/wav" });
}

function concat(chunks: Float32Array[]) {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/** Records PCM via Web Audio with pause/resume; returns a complete WAV. */
export async function startRecorder() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new AudioContext();
  await ctx.resume();
  const source = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  let paused = false;
  node.onaudioprocess = (e) => { if (!paused) chunks.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
  source.connect(node); node.connect(ctx.destination);
  const cleanup = async () => {
    stream.getTracks().forEach((t) => t.stop());
    node.onaudioprocess = null; node.disconnect(); source.disconnect();
    if (ctx.state !== "closed") await ctx.close();
  };
  return {
    pause: () => { paused = true; },
    resume: () => { paused = false; },
    cancel: cleanup,
    async stop(): Promise<File> {
      await cleanup();
      const blob = encodeWav(concat(chunks), ctx.sampleRate);
      if (blob.size < 8192) throw new Error("The recording was empty. Please record again.");
      return new File([blob], `meeting-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.wav`, { type: "audio/wav" });
    },
  };
}

/** Decodes any browser-playable audio, converts to 16 kHz mono and splits into WAV segments under the upload limit. */
export async function toSegments(file: Blob): Promise<File[]> {
  const buf = await file.arrayBuffer();
  const ctx = new AudioContext();
  let decoded: AudioBuffer;
  try { decoded = await ctx.decodeAudioData(buf); }
  catch { throw new Error("This audio format couldn't be read. Try an MP3, WAV, M4A or WebM file."); }
  finally { await ctx.close(); }
  if (decoded.duration < 0.5) throw new Error("The audio is too short to transcribe.");
  const len = Math.ceil(decoded.duration * TARGET_RATE);
  const off = new OfflineAudioContext(1, len, TARGET_RATE);
  const src = off.createBufferSource(); src.buffer = decoded; src.connect(off.destination); src.start();
  const mono = (await off.startRendering()).getChannelData(0);
  const step = SEGMENT_SECONDS * TARGET_RATE;
  const files: File[] = [];
  for (let i = 0; i < mono.length; i += step) {
    files.push(new File([encodeWav(mono.slice(i, i + step), TARGET_RATE)], `part-${files.length + 1}.wav`, { type: "audio/wav" }));
  }
  return files;
}

async function transcribeOne(file: File, onDelta: (t: string) => void, signal?: AbortSignal): Promise<string> {
  const form = new FormData(); form.append("file", file, file.name);
  const res = await fetch("/api/transcribe", { method: "POST", body: form, signal });
  if (!res.ok || !res.body) {
    let msg = `Transcription failed (${res.status}).`;
    try { const j = await res.json(); msg = j.error?.message ?? j.error ?? j.message ?? msg; } catch { /* keep */ }
    if (res.status === 429) msg = "Too many requests right now. Please wait a moment and try again.";
    if (res.status === 402) msg = "AI credits are used up. Please add credits to keep transcribing.";
    throw new Error(String(msg));
  }
  let text = ""; let final: string | null = null; let err: string | null = null;
  const parser = createParser({
    onEvent(ev) {
      if (ev.data === "[DONE]") return;
      try {
        const d = JSON.parse(ev.data);
        if (d.type === "transcript.text.delta") { text += d.delta ?? ""; onDelta(text); }
        else if (d.type === "transcript.text.done") final = String(d.text ?? text);
        else if (d.type === "error" || d.error) err = d.error?.message ?? d.message ?? "Transcription failed.";
      } catch { /* ignore */ }
    },
  });
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) { const { done, value } = await reader.read(); if (done) break; parser.feed(value); }
  if (err) throw new Error(err);
  if (final === null && !text) throw new Error("The transcription ended unexpectedly. Please try again.");
  return final ?? text;
}

export async function transcribeAudio(file: Blob, onProgress: (text: string, part: number, total: number) => void, signal?: AbortSignal) {
  const parts = await toSegments(file);
  const done: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const t = await transcribeOne(parts[i]!, (partial) => onProgress([...done, partial].join("\n\n"), i + 1, parts.length), signal);
    done.push(t.trim());
    onProgress(done.join("\n\n"), i + 1, parts.length);
  }
  const out = done.join("\n\n").trim();
  if (!out) throw new Error("No speech was detected in the recording.");
  return out;
}

export const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
