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
      {/* Gradient header */}
      <div className="
        relative px-6 pt-8 pb-6
        bg-gradient-to-br from-amber-50 to-orange-50
        dark:from-slate-800 dark:to-slate-900
        border-b border-amber-100 dark:border-slate-700
      ">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600
                     dark:hover:text-slate-200 transition-colors text-lg leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-amber-500 text-xl">✦</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-500">
            Flow Pro
          </span>
        </div>
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
          Enter deeper flow.
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Unlock the full Mahjong Flow experience.
        </p>

        {/* Price */}
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold text-slate-800 dark:text-slate-100">
            $4
          </span>
          <span className="text-slate-400 text-sm">/ month</span>
          <span className="ml-2 text-[11px] bg-amber-100 dark:bg-amber-900/40
                           text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
            7-day free trial
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-5">
        {/* Benefits */}
        <ul className="space-y-3">
          {BENEFITS.map((b) => (
            <li key={b.title} className="flex items-start gap-3">
              <span className="mt-0.5 text-lg text-amber-400 shrink-0">{b.icon}</span>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {b.title}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {b.desc}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Focus Stats preview (locked / teaser) */}
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-4 relative">
          <FocusStats locked />
          {/* "Upgrade to unlock" overlay */}
          <div className="absolute inset-0 flex items-center justify-center rounded-xl">
            <span className="text-xs font-medium text-amber-500 bg-white/90 dark:bg-slate-900/90
                             px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800 shadow">
              ✦ Unlock with Pro
            </span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="
            w-full py-3 rounded-xl font-medium text-sm
            bg-amber-400 hover:bg-amber-500 active:bg-amber-600
            dark:bg-amber-500 dark:hover:bg-amber-400
            text-white
            shadow-lg shadow-amber-400/30 dark:shadow-amber-500/20
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

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          Cancel anytime. No lock-in.
        </p>
      </div>
    </Modal>
  );
}
