'use client';

import { useState, useCallback } from 'react';

export interface UserProfile {
  nickname: string;
  city: string;
}

export const DEFAULT_CITY = 'Oskemen';

export const CITIES = [
  'Oskemen',
  'Almaty',
  'Astana',
  'Shymkent',
  'Karaganda',
  'Aktobe',
  'Taraz',
  'Pavlodar',
  'Semey',
  'Atyrau',
  'Kostanay',
  'Oral',
  'Aktau',
  'Petropavl',
  'Temirtau',
  'Kyzylorda',
  'Ekibastuz',
  'Rudny',
  'Zhezkazgan',
  'Balqash',
];

const PROFILE_KEY = 'mahjong_flow_profile';

const DEFAULT_PROFILE: UserProfile = { nickname: '', city: DEFAULT_CITY };

function loadProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
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
