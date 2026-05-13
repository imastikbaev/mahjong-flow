'use client';

import { useState, useCallback } from 'react';

export interface UserProfile {
  userId:   string; // persistent UUID — generated once, stored in localStorage
  nickname: string;
  city:     string;
}

export const DEFAULT_CITY = 'Oskemen';

export const CITIES = [
  'Oskemen', 'Almaty', 'Astana', 'Shymkent', 'Karaganda',
  'Aktobe', 'Taraz', 'Pavlodar', 'Semey', 'Atyrau',
  'Kostanay', 'Oral', 'Aktau', 'Petropavl', 'Temirtau',
  'Kyzylorda', 'Ekibastuz', 'Rudny', 'Zhezkazgan', 'Balqash',
];

const PROFILE_KEY = 'mahjong_flow_profile';

function generateUserId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const DEFAULT_PROFILE: UserProfile = { userId: '', nickname: '', city: DEFAULT_CITY };

function loadProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw   = localStorage.getItem(PROFILE_KEY);
    const saved = raw ? JSON.parse(raw) : {};

    // Always ensure a stable userId — generate once if missing
    const userId = saved.userId || generateUserId();
    const profile: UserProfile = { ...DEFAULT_PROFILE, ...saved, userId };

    if (!saved.userId) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    }

    return profile;
  } catch {
    return { ...DEFAULT_PROFILE, userId: generateUserId() };
  }
}

export function useProfile() {
  const [profile, setProfileState] = useState<UserProfile>(loadProfile);

  const saveProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfileState((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { profile, saveProfile };
}
