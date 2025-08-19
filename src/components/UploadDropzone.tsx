'use client';

import { useRef } from 'react';

type Props = {
  onFile: (file: File) => void;
};

export default function UploadDropzone({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center hover:bg-slate-50 cursor-pointer"
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <div className="text-slate-600">
        <div className="font-semibold">Drop a video here</div>
        <div className="text-sm">or click to browse (MP4/MOV/WebM)</div>
      </div>
    </div>
  );
}


