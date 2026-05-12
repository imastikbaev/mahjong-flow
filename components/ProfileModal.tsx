'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { UserProfile, CITIES } from '@/lib/hooks/useProfile';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave: (updates: Partial<UserProfile>) => void;
}

export default function ProfileModal({ isOpen, onClose, profile, onSave }: ProfileModalProps) {
  const [nickname, setNickname] = useState(profile.nickname);
  const [city, setCity]         = useState(profile.city);

  // Sync local state each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setNickname(profile.nickname);
      setCity(profile.city);
    }
  }, [isOpen, profile.nickname, profile.city]);

  function handleSave() {
    onSave({ nickname: nickname.trim(), city });
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      {/* Header */}
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
          Profile
        </p>
        <h2 className="text-xl font-light tracking-tight text-neutral-100">
          Your identity.
        </h2>
        <p className="mt-1 text-sm font-light text-neutral-500 tracking-tight">
          Shows on the leaderboard.
        </p>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-4 bg-[#0e0e0e]">
        {/* Nickname */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-600 font-normal">
            Nickname
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            maxLength={24}
            placeholder="anonymous"
            className="
              w-full px-3 py-2.5 rounded-lg
              bg-white/[0.04] border border-white/[0.08]
              text-sm font-normal text-neutral-200 placeholder:text-neutral-700
              tracking-tight
              focus:outline-none focus:border-white/[0.2] focus:bg-white/[0.06]
              transition-colors duration-150
            "
          />
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-600 font-normal">
            Region
          </label>
          <div className="relative">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="
                w-full px-3 py-2.5 rounded-lg appearance-none
                bg-white/[0.04] border border-white/[0.08]
                text-sm font-normal text-neutral-200
                tracking-tight
                focus:outline-none focus:border-white/[0.2] focus:bg-white/[0.06]
                transition-colors duration-150
                cursor-pointer
              "
            >
              {CITIES.map((c) => (
                <option key={c} value={c} className="bg-[#111111] text-neutral-200">
                  {c}
                </option>
              ))}
            </select>
            {/* Chevron */}
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2
                             text-neutral-600 text-xs">
              ▾
            </span>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="
            w-full py-2.5 rounded-lg text-sm font-normal tracking-tight
            bg-white hover:bg-neutral-100 active:bg-neutral-200
            text-[#0a0a0a] transition-colors duration-150
          "
        >
          Save
        </button>
      </div>
    </Modal>
  );
}
