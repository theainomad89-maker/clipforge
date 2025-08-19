'use client';

import { useEffect, useRef, useState } from 'react';

export type Clip = {
  id: string;
  start: number; // seconds
  end: number;   // seconds
  length: number;
  note?: string;
};

type Props = {
  fileUrl: string;
  clips: Clip[];
};

export default function ClipsGrid({ fileUrl, clips }: Props) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {clips.map((c, i) => (
        <ClipCard key={c.id} idx={i+1} fileUrl={fileUrl} clip={c} />
      ))}
    </div>
  );
}

function ClipCard({ fileUrl, clip, idx }: { fileUrl: string; clip: Clip; idx: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const v = videoRef.current;
      if (v) {
        if (v.currentTime >= clip.end) {
          v.pause();
          setPlaying(false);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clip.end]);

  const handlePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = clip.start;
    await v.play();
    setPlaying(true);
  };

  const handlePause = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    setPlaying(false);
  };

  return (
    <div className="rounded-xl border p-3">
      <div className="text-sm font-semibold mb-2">Clip {idx} • {clip.length}s</div>
      <video
        ref={videoRef}
        src={fileUrl}
        className="w-full rounded-lg bg-black"
        controls
        onLoadedMetadata={() => { /* ensures duration loads */ }}
      />
      <div className="flex items-center gap-2 mt-3">
        {!playing ? (
          <button onClick={handlePlay} className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm">
            Play from {formatTime(clip.start)} → {formatTime(clip.end)}
          </button>
        ) : (
          <button onClick={handlePause} className="rounded-lg bg-slate-200 px-3 py-2 text-sm">
            Pause
          </button>
        )}
        <button
          disabled
          title="Rendering downloads in v2 (server worker)."
          className="rounded-lg bg-slate-100 text-slate-400 px-3 py-2 text-sm cursor-not-allowed"
        >
          Download MP4 (v2)
        </button>
      </div>
      {clip.note && <div className="text-xs text-slate-500 mt-2">{clip.note}</div>}
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
}


