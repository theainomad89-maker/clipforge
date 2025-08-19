import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

// ENV
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const TRANSCRIBE_PROVIDER = process.env.TRANSCRIBE_PROVIDER || 'openai'; // 'openai' | 'assemblyai'

const supa = createClient(SUPABASE_URL, SUPABASE_KEY);

// Simple loop
async function loop() {
  try {
    const { data: job } = await supa
      .from('jobs')
      .select('*, projects(*)')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!job) { await sleep(1500); return loop(); }

    await supa.from('jobs').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', job.id);

    const sourcePath = job.projects.source_path; // videos bucket path
    // signed download URL for source
    const { data: signed } = await supa.storage.from('videos').createSignedUrl(sourcePath, 60*15);
    const downloadUrl = signed.signedUrl;

    // download to temp
    const srcFile = path.join(os.tmpdir(), `${job.id}-src.mp4`);
    await downloadFile(downloadUrl, srcFile);

    // transcribe → segments with start/end
    const segments = await transcribeSegments(srcFile);

    // choose 3 windows (20-60s) — keep simple evenly spaced for v1
    const targetDurations = [30, 30, 30];
    const probe = await ffprobe(srcFile);
    const total = probe.format.duration || 180;
    const anchors = [0.12, 0.45, 0.75];

    // make output dir (temp)
    const outDir = path.join(os.tmpdir(), `clips-${job.id}`);
    fs.mkdirSync(outDir, { recursive: true });

    // For each window → build SRT (windowed) → ffmpeg cut + burn + progress
    const clips = [];
    for (let i=0;i<3;i++) {
      const len = targetDurations[i];
      let start = Math.max(0, Math.min(anchors[i]*total - len/2, Math.max(0, total - len)));
      const end = Math.min(total, start + len);

      const srtPath = path.join(outDir, `clip${i+1}.srt`);
      buildWindowedSRT(segments, start, end, srtPath);

      const mp4Path = path.join(outDir, `clip${i+1}.mp4`);
      const pngPath = path.join(outDir, `clip${i+1}.png`);

      await renderClip(srcFile, srtPath, mp4Path, { start, end, aspect: job.projects.platform==='x' ? '1:1' : '9:16' });
      await extractThumb(mp4Path, pngPath, 0.2 * (end-start));

      // upload to 'clips' bucket (public for Phase 2)
      const base = `userless/${job.project_id}/clip${i+1}`;
      const mp4Key = `${base}.mp4`;
      const srtKey = `${base}.srt`;
      const pngKey = `${base}.png`;

      await supa.storage.from('clips').upload(mp4Key, fs.readFileSync(mp4Path), { contentType: 'video/mp4', upsert: true });
      await supa.storage.from('clips').upload(srtKey, fs.readFileSync(srtPath), { contentType: 'text/plain', upsert: true });
      await supa.storage.from('clips').upload(pngKey, fs.readFileSync(pngPath), { contentType: 'image/png', upsert: true });

      clips.push({ idx: i+1, duration_sec: Math.round(end-start), mp4_path: `clips/${mp4Key}`, srt_path: `clips/${srtKey}`, thumb_path: `clips/${pngKey}` });
    }

    // insert clips
    for (const c of clips) {
      await supa.from('clips').insert({ project_id: job.project_id, idx: c.idx, duration_sec: c.duration_sec, mp4_path: c.mp4_path, srt_path: c.srt_path, thumb_path: c.thumb_path });
    }

    await supa.from('jobs').update({ status: 'done', finished_at: new Date().toISOString() }).eq('id', job.id);
    await supa.from('projects').update({ status: 'done' }).eq('id', job.project_id);

  } catch (e) {
    console.error(e);
  } finally {
    await sleep(1000);
    return loop();
  }
}

loop();

// --- helpers ---

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function downloadFile(url, dest) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('download failed');
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

async function ffprobe(file) {
  return await new Promise((res, rej) => {
    ffmpeg.ffprobe(file, (err, data) => err ? rej(err) : res(data));
  });
}

async function transcribeSegments(file) {
  if (TRANSCRIBE_PROVIDER === 'assemblyai' && ASSEMBLYAI_API_KEY) {
    // Upload
    const up = await fetch('https://api.assemblyai.com/v2/upload', { method:'POST', headers:{ 'authorization': ASSEMBLYAI_API_KEY }, body: fs.createReadStream(file) });
    const uploadUrl = await up.text();

    // Request transcript with words + timestamps
    const tr = await fetch('https://api.assemblyai.com/v2/transcript', {
      method:'POST',
      headers:{ 'authorization': ASSEMBLYAI_API_KEY, 'content-type':'application/json' },
      body: JSON.stringify({ audio_url: uploadUrl, punctuate: true, format_text: true, word_boost: [], speaker_labels: false, sentiment_analysis: false })
    });
    const tj = await tr.json();
    // Poll
    let id = tj.id;
    for(;;){
      const s = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, { headers:{ 'authorization': ASSEMBLYAI_API_KEY }});
      const sj = await s.json();
      if (sj.status === 'completed') {
        return (sj.words||[]).map(w => ({ start: w.start/1000, end: w.end/1000, text: w.text }));
      }
      if (sj.status === 'error') throw new Error(sj.error);
      await sleep(1500);
    }
  }

  // OpenAI Whisper (verbose JSON → segments with start/end)
  const form = new FormData();
  form.append('file', fs.createReadStream(file));
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');

  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method:'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: form
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'transcribe failed');

  // flatten words if provided; else use segments
  if (j.segments?.length) {
    // segments: { start, end, text }
    return j.segments.map(s => ({ start: s.start, end: s.end, text: s.text }));
  }
  // fallback: no timings → fake single segment
  return [{ start: 0, end: (await ffprobe(file)).format.duration || 60, text: j.text || '' }];
}

function buildWindowedSRT(segments, start, end, outPath) {
  // collect entries overlapping [start, end]
  let idx = 1;
  const lines = [];
  for (const s of segments) {
    if (s.end < start || s.start > end) continue;
    const a = Math.max(0, s.start - start);
    const b = Math.min(end - start, s.end - start);
    lines.push(`${idx++}
${toTS(a)} --> ${toTS(b)}
${(s.text||'').trim()}

`);
  }
  fs.writeFileSync(outPath, lines.join(''), 'utf8');
}

function toTS(sec) {
  const ms = Math.max(0, Math.floor(sec*1000));
  const h = Math.floor(ms/3600000);
  const m = Math.floor((ms%3600000)/60000);
  const s = Math.floor((ms%60000)/1000);
  const mm = String(m).padStart(2,'0');
  const ss = String(s).padStart(2,'0');
  const mmm = String(ms%1000).padStart(3,'0');
  return `00:${mm}:${ss},${mmm}`;
}

async function renderClip(src, srt, out, { start, end, aspect }) {
  const dur = end - start;
  const scale = aspect === '1:1' ? 'scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2' :
                                   'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2';

  const drawBar = `drawbox=x=0:y=ih-10:w=iw*t/${dur}:h=8:color=#F08640@0.85:t=fill`;
  const vf = `subtitles='${srt.replace(/\\/g,'/')}':force_style='Fontsize=28,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BorderStyle=3,Outline=2,Shadow=0',${scale},${drawBar}`;

  await new Promise((res, rej) => {
    ffmpeg(src)
      .setStartTime(start)
      .setDuration(dur)
      .videoFilters(vf)
      .audioFilters('dynaudnorm')
      .outputOptions(['-r 30','-pix_fmt yuv420p','-c:v libx264','-preset veryfast','-crf 19'])
      .on('end', res)
      .on('error', rej)
      .save(out);
  });
}

async function extractThumb(src, outPng, atSec) {
  await new Promise((res, rej) => {
    ffmpeg(src)
      .seekInput(Math.max(0, atSec))
      .frames(1)
      .outputOptions(['-q:v 2'])
      .on('end', res)
      .on('error', rej)
      .save(outPng);
  });
}
