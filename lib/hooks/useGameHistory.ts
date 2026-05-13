'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

export interface GameRecord {
  id: string;
  date: string;           // YYYY-MM-DD
  seconds: number;
  score: number;
  difficulty: 'easy' | 'medium' | 'hard';
  mode: 'daily' | 'practice' | 'sprint';
  completed: boolean;     // false = sprint timeout
  pairsMatched: number;   // 0-72
}

const HISTORY_KEY = 'mahjong_flow_history';
const MAX_RECORDS  = 90;

export function useGameHistory() {
  const [history, setHistory] = useState<GameRecord[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  const addRecord = useCallback((record: Omit<GameRecord, 'id'>): GameRecord => {
    const entry: GameRecord = { ...record, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, MAX_RECORDS);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    return entry;
  }, []);

  /** Last 7 days ordered oldest → newest, one entry per day (best completed run). */
  const last7Days = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = dayNames[d.getDay()];
      // Pick best (lowest time) completed run for that day
      const dayRuns = history.filter((r) => r.date === dateStr && r.completed);
      dayRuns.sort((a, b) => a.seconds - b.seconds);
      return { day: dayName, seconds: dayRuns[0]?.seconds ?? null };
    });
  }, [history]);

  const completedRuns = useMemo(
    () => history.filter((r) => r.completed),
    [history],
  );

  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      if (history.some((r) => r.date === dateStr && r.completed)) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [history]);

  return { history, addRecord, last7Days, completedRuns, streak };
}
