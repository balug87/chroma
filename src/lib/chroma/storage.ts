import { todayKey } from "./engine";

export const MODE_IDS = ["dial", "pick", "pin", "odd", "gap"] as const;
export type ModeId = (typeof MODE_IDS)[number];

const KEY = "chroma-lab-v1";

export type ModeSave = {
  streak: number;
  lastSealed: string | null;
  today: string | null;
  score: number | null;
};

export const HEARTS = 7;

export type LabSave = {
  version: 1;
  hearts: number;
  heartsDate: string | null;
  modes: Record<ModeId, ModeSave>;
};

function blankMode(): ModeSave {
  return { streak: 0, lastSealed: null, today: null, score: null };
}

export function emptySave(): LabSave {
  return {
    version: 1,
    hearts: HEARTS,
    heartsDate: null,
    modes: {
      dial: blankMode(),
      pick: blankMode(),
      pin: blankMode(),
      odd: blankMode(),
      gap: blankMode(),
    },
  };
}

export function loadSave(): LabSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw) as Partial<LabSave>;
    if (parsed.version !== 1 || !parsed.modes) return emptySave();
    const base = emptySave();
    if (typeof parsed.hearts === "number") base.hearts = parsed.hearts;
    if (typeof parsed.heartsDate === "string") base.heartsDate = parsed.heartsDate;
    for (const id of MODE_IDS) {
      const m = parsed.modes[id];
      if (!m) continue;
      base.modes[id] = {
        streak: typeof m.streak === "number" ? m.streak : 0,
        lastSealed: typeof m.lastSealed === "string" ? m.lastSealed : null,
        today: typeof m.today === "string" ? m.today : null,
        score: typeof m.score === "number" ? m.score : null,
      };
    }
    return base;
  } catch {
    return emptySave();
  }
}

function yesterday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() - 1);
  return todayKey(dt);
}

export function heartsFor(save: LabSave, date: string): number {
  if (save.heartsDate !== date) return HEARTS;
  return Math.max(0, Math.min(HEARTS, save.hearts));
}

export function spendHeart(save: LabSave, date: string): LabSave {
  const current = heartsFor(save, date);
  if (current <= 0) return save;
  const next: LabSave = { ...save, hearts: current - 1, heartsDate: date };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function scoreFor(save: LabSave, id: ModeId, date: string): number | null {
  const m = save.modes[id];
  return m.today === date ? m.score : null;
}

export function liveStreak(save: LabSave, id: ModeId, date: string): number {
  const m = save.modes[id];
  if (m.lastSealed === date || m.lastSealed === yesterday(date)) return m.streak;
  return 0;
}

export function sealMode(save: LabSave, id: ModeId, date: string, score: number): LabSave {
  const m = save.modes[id];
  if (m.today === date && m.score != null) return save;
  const next: LabSave = {
    ...save,
    modes: {
      ...save.modes,
      [id]: {
        streak: m.lastSealed === yesterday(date) ? m.streak + 1 : 1,
        lastSealed: date,
        today: date,
        score,
      },
    },
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
