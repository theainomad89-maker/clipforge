'use client';

import { useEffect, useRef, useState } from 'react';
import UploadDropzone from '@/components/UploadDropzone';
import PlatformPicker from '@/components/PlatformPicker';
import ClipsGrid, { Clip } from '@/components/ClipsGrid';
import PaywallDialog from '@/components/PaywallDialog';
import { PRESETS, PlatformKey } from '@/lib/presets';
import { nanoid } from 'nanoid';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [platform, setPlatform] = useState<PlatformKey | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const videoProbeRef = useRef<HTMLVideoElement>(null);

  const [clips, setClips] = useState<Clip[]>([]);
  const [busy, setBusy] = useState(false);
  const FREE_LIMIT = 2;
  const [runsUsed, setRunsUsed] = useState<number>(0);
  const [showPaywall, setShowPaywall] = useState(false);

  // Server pipeline state
  const [projectId, setProjectId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [serverClips, setServerClips] = useState<any[]>([]);
  const [jobStatus, setJobStatus] = useState<'idle'|'queued'|'processing'|'done'|'error'>('idle');

  // load free runs counter from localStorage
  useEffect(() => {
    const n = Number(localStorage.getItem('gen_used') || '0');
    setRunsUsed(isNaN(n) ? 0 : n);
  }, []);

  const bumpRunsUsed = () => {
    const next = runsUsed + 1;
    setRunsUsed(next);
    localStorage.setItem('gen_used', String(next));
  };

  // blob URL for preview
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canGenerate = !!file && !!platform && !!duration;

  // probe video duration once file is chosen
  const handleFile = async (f: File) => {
    setFile(f);
    setClips([]); // clear client-only previews
    setProjectId(null);
    setJobId(null);
    setServerClips([]);
    setDuration(null);
    setPlatform(null);
    setJobStatus('idle');

    // 1) get signed upload url
    const res = await fetch('/api/upload-url', { method: 'POST' });
    const js = await res.json();
    if (!res.ok) { alert(js.error || 'upload url error'); return; }

    setProjectId(js.projectId);

    // 2) PUT to signed URL (direct to Supabase)
    const putRes = await fetch(js.signedUrl, {
      method: 'PUT',
      headers: { 'x-upsert': 'true', 'content-type': f.type || 'video/mp4' },
      body: f
    });
    if (!putRes.ok) { alert('Upload failed'); return; }

    // local URL for probing duration
    const url = URL.createObjectURL(f);
    setFileUrl(url);
  };

  const onLoadedMetadata = () => {
    const v = videoProbeRef.current;
    if (v?.duration && isFinite(v.duration)) {
      setDuration(v.duration);
    }
  };

  // trigger server job
  const startServerProcess = async () => {
    if (!canGenerate || !platform || !duration || !projectId) return;

    if (runsUsed >= FREE_LIMIT) { setShowPaywall(true); return; }

    setBusy(true);
    const res = await fetch('/api/process', {
      method: 'POST',
      body: JSON.stringify({ projectId, platform }),
      headers: { 'content-type': 'application/json' }
    });
    const js = await res.json();
    if (!res.ok) { setBusy(false); alert(js.error || 'process error'); return; }

    setJobId(js.jobId);
    setJobStatus('queued');

    // poll status
    const poll = async () => {
      const r = await fetch(`/api/status/${js.jobId}`);
      const s = await r.json();
      if (s.job?.status === 'done') {
        setServerClips(s.clips || []);
        setJobStatus('done');
        setBusy(false);
        bumpRunsUsed();
      } else if (s.job?.status === 'error') {
        setJobStatus('error');
        setBusy(false);
        alert(s.job.error || 'Render failed');
      } else {
        setTimeout(poll, 1500);
      }
    };
    setTimeout(poll, 1200);
  };

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="font-bold">ClipForge (MVP)</div>
          <div className="text-sm text-slate-500">
            Free runs used: {runsUsed} / {FREE_LIMIT}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <section className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">1) Upload a video</h2>
            <UploadDropzone onFile={handleFile} />
            {file && (
              <div className="text-sm text-slate-600">
                {file.name} • {(file.size / (1024*1024)).toFixed(1)} MB
              </div>
            )}
            {/* hidden probe video for duration */}
            {fileUrl && (
              <video
                ref={videoProbeRef}
                src={fileUrl}
                className="hidden"
                onLoadedMetadata={onLoadedMetadata}
              />
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">2) Choose platform</h2>
            <PlatformPicker value={platform} onChange={setPlatform} />
            <div className="text-xs text-slate-500">
              We'll size clips and target lengths to match each platform's vibe.
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">3) Generate clips</h2>
          <div className="flex items-center gap-3">
            <button
              disabled={!canGenerate || busy}
              onClick={startServerProcess}
              className={
                'rounded-lg px-4 py-2 ' +
                (canGenerate && !busy
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed')
              }
            >
              {busy ? 'Processing…' : 'Generate 3 Clips'}
            </button>
            <button
              disabled={!canGenerate || busy || jobStatus !== 'done'}
              onClick={startServerProcess}
              className={
                'rounded-lg px-4 py-2 ' +
                (canGenerate && !busy && jobStatus === 'done'
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed')
              }
            >
              Regenerate (free x1)
            </button>
          </div>
          {!file && <div className="text-sm text-slate-500">Upload a video to enable.</div>}
          {file && !platform && <div className="text-sm text-slate-500">Pick a platform to enable.</div>}
          {jobStatus === 'queued' && <div className="text-sm text-orange-600">Job queued, processing...</div>}
          {jobStatus === 'processing' && <div className="text-sm text-orange-600">Rendering clips...</div>}
          {jobStatus === 'error' && <div className="text-sm text-red-600">Render failed. Try again.</div>}
        </section>

        {jobStatus === 'done' && serverClips.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">4) Your clips</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {serverClips.map((c:any, i:number)=>(
                <div key={c.id} className="rounded-xl border p-3">
                  <div className="text-sm font-semibold mb-2">Clip {i+1} • {c.duration_sec}s</div>
                  <video 
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${c.mp4_path}`} 
                    controls 
                    className="w-full rounded-lg bg-black" 
                  />
                  <div className="flex gap-2 mt-2">
                    <a 
                      className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm" 
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${c.mp4_path}`} 
                      download
                    >
                      Download MP4
                    </a>
                    <a 
                      className="rounded-lg bg-slate-200 px-3 py-2 text-sm" 
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${c.srt_path}`} 
                      download
                    >
                      Download SRT
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {clips.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">4) Review & play</h2>
            <ClipsGrid fileUrl={fileUrl} clips={clips} />
            <div className="text-xs text-slate-500">
              This MVP previews clip sections by looping the source video between start/end. MP4 downloads arrive in v2.
            </div>
          </section>
        )}
      </div>

      <PaywallDialog open={showPaywall} onClose={() => setShowPaywall(false)} />
    </main>
  );
}
