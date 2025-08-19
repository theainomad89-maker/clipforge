'use client';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function PaywallDialog({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[520px] max-w-[90vw]">
        <div className="text-xl font-bold mb-1">Unlimited generations</div>
        <div className="text-slate-600 mb-4">
          You’ve used your free regenerations. Get unlimited clip generations & future features.
        </div>
        <ul className="list-disc list-inside text-sm text-slate-600 mb-4">
          <li>Unlimited clip generations</li>
          <li>Platform presets (TikTok / YT Shorts / IG / X)</li>
          <li>Brand kit & captions (coming next)</li>
        </ul>
        <div className="flex items-center gap-2">
          <a
            href="#stripe-coming-soon"
            className="rounded-lg bg-orange-500 text-white px-4 py-2"
          >
            Get Pro — $19/mo
          </a>
          <button onClick={onClose} className="rounded-lg bg-slate-200 px-3 py-2">
            Not now
          </button>
        </div>
        <div className="text-xs text-slate-400 mt-3">Stripe checkout wired in v2.</div>
      </div>
    </div>
  );
}


