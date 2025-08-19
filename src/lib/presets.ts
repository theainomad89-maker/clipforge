export type PlatformKey = 'tiktok' | 'ytshorts' | 'instagram' | 'x';

export type Preset = {
  label: string;
  aspect: '9:16' | '1:1' | '16:9';
  lengths: number[]; // seconds per clip
  fps: number;
  safeTopPct: number; // UI only (caption safe zone hint)
};

export const PRESETS: Record<PlatformKey, Preset> = {
  tiktok:   { label: 'TikTok',    aspect: '9:16', lengths: [30,30,30], fps: 30, safeTopPct: 15 },
  ytshorts: { label: 'YT Shorts', aspect: '9:16', lengths: [30,45,60], fps: 30, safeTopPct: 12 },
  instagram:{ label: 'Instagram', aspect: '9:16', lengths: [20,30,45], fps: 30, safeTopPct: 15 },
  x:        { label: 'X (Twitter)', aspect: '1:1', lengths: [20,30,30], fps: 30, safeTopPct: 10 },
};


