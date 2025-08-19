'use client';

import { PRESETS, PlatformKey } from '@/lib/presets';

type Props = {
  value: PlatformKey | null;
  onChange: (v: PlatformKey) => void;
};

export default function PlatformPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Object.entries(PRESETS).map(([key, p]) => {
        const k = key as PlatformKey;
        const active = value === k;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={
              'rounded-xl border px-4 py-3 text-left transition ' +
              (active
                ? 'border-orange-400 bg-orange-50'
                : 'border-slate-300 hover:bg-slate-50')
            }
          >
            <div className="font-semibold">{p.label}</div>
            <div className="text-xs text-slate-500">
              Aspect {p.aspect} • Clips {p.lengths.join('/') }s
            </div>
          </button>
        );
      })}
    </div>
  );
}


