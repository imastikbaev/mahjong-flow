'use client';

import { useState } from 'react';
import Modal from './Modal';
import FocusStats from './FocusStats';
import { useMahjongStore } from '@/store/mahjongStore';
import type { GameRecord } from '@/lib/hooks/useGameHistory';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameHistory?: GameRecord[];
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

export default function ProModal({ isOpen, onClose, gameHistory = [] }: ProModalProps) {
  const [loading, setLoading] = useState(false);
  const isPro        = useMahjongStore((s) => s.isPro);
  const activatePro  = useMahjongStore((s) => s.activatePro);
  const deactivatePro = useMahjongStore((s) => s.deactivatePro);

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
      await new Promise((r) => setTimeout(r, 1100)); // simulate network
      activatePro();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      {isPro ? (
        /* ── Pro active screen ─────────────────────────────────────── */
        <>
          <div className="relative px-6 pt-7 pb-5 border-b border-white/[0.06] bg-[#111111]">
            <button
              onClick={onClose}
              className="absolute top-4 right-5 text-neutral-600 hover:text-neutral-300
                         transition-colors duration-150 text-base leading-none"
              aria-label="Close"
            >
              ✕
            </button>
            <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-600 font-normal mb-2">
              Flow Pro
            </p>
            <h2 className="text-xl font-light tracking-tight text-neutral-100">
              You are in flow.
            </h2>
            <p className="mt-1 text-sm font-light text-neutral-500 tracking-tight">
              All Pro features are active.
            </p>
          </div>

          <div className="px-6 py-5 space-y-5 bg-[#0e0e0e]">
            {/* Unlocked FocusStats */}
            <div className="rounded-lg border border-white/[0.06] p-4 bg-white/[0.02]">
              <FocusStats locked={false} gameHistory={gameHistory} />
            </div>

            {/* Benefits — checkmarked */}
            <ul className="space-y-3">
              {BENEFITS.map((b) => (
                <li key={b.title} className="flex items-center gap-3">
                  <span className="text-xs text-neutral-400 shrink-0">✓</span>
                  <p className="text-sm font-normal tracking-tight text-neutral-400">{b.title}</p>
                </li>
              ))}
            </ul>

            <button
              onClick={onClose}
              className="
                w-full py-2.5 rounded-lg text-sm font-normal tracking-tight
                bg-white hover:bg-neutral-100 active:bg-neutral-200
                text-[#0a0a0a] transition-colors duration-150
              "
            >
              Continue playing
            </button>

            {/* Dev-only reset — intentionally unobtrusive */}
            <button
              onClick={deactivatePro}
              className="mx-auto block text-[10px] text-neutral-800 hover:text-neutral-600
                         transition-colors duration-150 tracking-tight"
            >
              reset demo
            </button>
          </div>
        </>
      ) : (
        /* ── Upsell screen ─────────────────────────────────────────── */
        <>
          <div className="relative px-6 pt-7 pb-5 border-b border-white/[0.06] bg-[#111111]">
            <button
              onClick={onClose}
              className="absolute top-4 right-5 text-neutral-600 hover:text-neutral-300
                         transition-colors duration-150 text-base leading-none"
              aria-label="Close"
            >
              ✕
            </button>

            <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-600 font-normal mb-2">
              Flow Pro
            </p>
            <h2 className="text-xl font-light tracking-tight text-neutral-100">
              Enter deeper flow.
            </h2>
            <p className="mt-1 text-sm font-light text-neutral-500 tracking-tight">
              Unlock the full Mahjong Flow experience.
            </p>

            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-2xl font-normal tracking-tight text-neutral-100">$4</span>
              <span className="text-neutral-600 text-xs font-light">/ month</span>
              <span className="ml-2 text-[10px] border border-white/[0.1] text-neutral-400
                               px-2 py-0.5 rounded font-normal tracking-tight">
                7-day free trial
              </span>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5 bg-[#0e0e0e]">
            <ul className="space-y-3.5">
              {BENEFITS.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <span className="mt-0.5 text-base shrink-0 text-neutral-500">{b.icon}</span>
                  <div>
                    <p className="text-sm font-normal tracking-tight text-neutral-300">{b.title}</p>
                    <p className="text-xs font-light text-neutral-600 mt-0.5 tracking-tight">{b.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Focus Stats — locked teaser */}
            <div className="rounded-lg border border-white/[0.06] p-4 relative bg-white/[0.02]">
              <FocusStats locked />
              <div className="absolute inset-0 flex items-center justify-center rounded-lg backdrop-blur-[2px]">
                <span className="text-[11px] font-normal tracking-tight text-neutral-400
                                 bg-[#0e0e0e]/95 px-3 py-1.5 rounded border border-white/[0.1]">
                  Unlock with Pro
                </span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="
                w-full py-2.5 rounded-lg text-sm font-normal tracking-tight
                bg-white hover:bg-neutral-100 active:bg-neutral-200
                text-[#0a0a0a]
                transition-colors duration-150 active:scale-[0.99]
                disabled:opacity-50 disabled:cursor-wait
                flex items-center justify-center gap-2
              "
            >
              {loading ? (
                <>
                  <span className="animate-spin text-sm">◌</span>
                  Preparing checkout…
                </>
              ) : (
                'Start Free Trial'
              )}
            </button>

            <p className="text-center text-[11px] font-light text-neutral-700 tracking-tight">
              Cancel anytime.
            </p>
          </div>
        </>
      )}
    </Modal>
  );
}
