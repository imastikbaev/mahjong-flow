'use client';

import { useState } from 'react';
import Modal from './Modal';
import FocusStats from './FocusStats';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BENEFITS = [
  {
    icon: '◈',
    title: 'Custom AI-generated tile skins',
    desc: 'A new minimalist skin every week, generated from a unique daily seed.',
  },
  {
    icon: '◎',
    title: 'Deep Focus Analytics',
    desc: 'Bar charts, streaks, and weekly focus reports — understand your flow state.',
  },
  {
    icon: '↺',
    title: 'Unlimited Undo',
    desc: 'Step back as many times as you need without breaking your streak.',
  },
  {
    icon: '◇',
    title: 'Geo Leaderboard',
    desc: 'Compete with players in your city, not just globally.',
  },
];

export default function ProModal({ isOpen, onClose }: ProModalProps) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      /**
       * TODO: Replace with real Stripe checkout session creation.
       *
       *   const res = await fetch('/api/stripe/create-checkout', {
       *     method: 'POST',
       *     headers: { 'Content-Type': 'application/json' },
       *     body: JSON.stringify({ priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID }),
       *   });
       *   const { url } = await res.json();
       *   window.location.href = url;
       */
      await new Promise((r) => setTimeout(r, 900)); // simulate network
      alert('Stripe checkout would open here — wire NEXT_PUBLIC_STRIPE_PRICE_ID to activate.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      {/* Header — dark glass with teal tint */}
      <div className="
        relative px-6 pt-8 pb-6
        bg-gradient-to-br from-slate-900 to-slate-950
        border-b border-slate-800
      ">
        {/* Subtle teal glow behind header */}
        <div aria-hidden className="
          absolute inset-0 pointer-events-none
          bg-gradient-to-br from-teal-500/5 to-transparent rounded-t-2xl
        " />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300
                     transition-colors text-lg leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-1 relative">
          <span className="text-teal-400 text-xl">✦</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-teal-400">
            Flow Pro
          </span>
        </div>
        <h2 className="text-2xl font-semibold text-slate-100 tracking-tight relative">
          Enter deeper flow.
        </h2>
        <p className="mt-1 text-sm text-slate-400 relative">
          Unlock the full Mahjong Flow experience.
        </p>

        {/* Price */}
        <div className="mt-4 flex items-baseline gap-1.5 relative">
          <span className="text-3xl font-semibold text-slate-100">$4</span>
          <span className="text-slate-500 text-sm">/ month</span>
          <span className="ml-2 text-[11px] bg-teal-500/10 text-teal-300
                           px-2 py-0.5 rounded-full font-medium border border-teal-500/20">
            7-day free trial
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-5 bg-slate-950">
        {/* Benefits */}
        <ul className="space-y-3">
          {BENEFITS.map((b, i) => {
            // Cycle accent colors: teal, rose, yellow, fuchsia
            const iconColors = ['text-teal-400', 'text-rose-400', 'text-yellow-300', 'text-fuchsia-400'];
            return (
              <li key={b.title} className="flex items-start gap-3">
                <span className={`mt-0.5 text-lg shrink-0 ${iconColors[i % iconColors.length]}`}>
                  {b.icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-200">{b.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{b.desc}</p>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Focus Stats preview (locked teaser) */}
        <div className="rounded-xl border border-slate-800 p-4 relative bg-slate-900/60">
          <FocusStats locked />
          <div className="absolute inset-0 flex items-center justify-center rounded-xl">
            <span className="text-xs font-medium text-teal-300
                             bg-slate-950/90 px-3 py-1.5 rounded-full
                             border border-teal-500/30">
              ✦ Unlock with Pro
            </span>
          </div>
        </div>

        {/* CTA — turquoise neon glow */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          style={{ boxShadow: '0 0 15px rgba(45,212,191,0.4), 0 0 30px rgba(45,212,191,0.15)' }}
          className="
            w-full py-3 rounded-xl font-semibold text-sm
            bg-teal-500 hover:bg-teal-400 active:bg-teal-600
            text-slate-950
            transition-all duration-150 active:scale-[0.98]
            disabled:opacity-60 disabled:cursor-wait
            flex items-center justify-center gap-2
          "
        >
          {loading ? (
            <>
              <span className="animate-spin text-base">◌</span>
              Preparing checkout…
            </>
          ) : (
            <>✦ Start Free Trial — Upgrade to Pro</>
          )}
        </button>

        <p className="text-center text-[11px] text-slate-600">
          Cancel anytime. No lock-in.
        </p>
      </div>
    </Modal>
  );
}
