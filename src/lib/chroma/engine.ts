export type RGB = { r: number; g: number; b: number };

export type DialPuzzle = { digits: [number, number, number] };

export type PickRound = { target: RGB; options: RGB[] };
export type PickPuzzle = { rounds: PickRound[] };

export type PinPuzzle = { target: RGB };

export type OddRound = { base: RGB; odd: RGB; index: number };
export type OddPuzzle = { rounds: OddRound[] };

export type GapRound = { stops: RGB[]; hidden: number; options: RGB[]; answer: number };
export type GapPuzzle = { rounds: GapRound[] };

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function prettyDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function msUntilTomorrow(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

export function formatRemain(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function rgbCss(c: RGB): string {
  return `rgb(${c.r} ${c.g} ${c.b})`;
}

export function rgbHex(c: RGB): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`.toUpperCase();
}

export function digitsToRgb(d: [number, number, number]): RGB {
  return { r: d[0] * 17, g: d[1] * 17, b: d[2] * 17 };
}

export function digitsToHex(d: [number, number, number]): string {
  return `#${d.map((n) => n.toString(16)).join("")}`.toUpperCase();
}

export function sameRgb(a: RGB, b: RGB): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

/** Redmean distance. 0 is identical; black vs white is about 765. */
export function rgbDistance(a: RGB, b: RGB): number {
  const rmean = (a.r + b.r) / 2;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(
    (2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db,
  );
}

export function average(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export function grade(score: number): string {
  if (score >= 98) return "Splendid";
  if (score >= 90) return "Sharp";
  if (score >= 75) return "Close";
  if (score >= 60) return "Warm";
  return "Off";
}

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function isDark(c: RGB): boolean {
  const l = 0.2126 * srgbToLinear(c.r) + 0.7152 * srgbToLinear(c.g) + 0.0722 * srgbToLinear(c.b);
  return l < 0.42;
}

/** Match percentage on the 0–15 hex-digit cube, same shape as Guess My RGB. */
export function dialScore(target: [number, number, number], guess: [number, number, number]): number {
  const maxErr = target.map((n) => Math.max(n, 15 - n));
  const maxDist = Math.hypot(maxErr[0]!, maxErr[1]!, maxErr[2]!);
  const dist = Math.hypot(guess[0] - target[0], guess[1] - target[1], guess[2] - target[2]);
  if (maxDist === 0) return 100;
  return Math.max(0, Math.min(100, Math.floor(100 * (1 - dist / maxDist))));
}

/** Steeper than raw redmean so a vague click does not score like a hit. */
export function pinScore(target: RGB, guess: RGB): number {
  const dist = rgbDistance(target, guess);
  return Math.max(0, Math.min(100, Math.round(100 * (1 - dist / 180))));
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function randByte(rng: () => number): number {
  return Math.floor(rng() * 256);
}

function randColor(rng: () => number): RGB {
  return { r: randByte(rng), g: randByte(rng), b: randByte(rng) };
}

function shuffle<T>(rng: () => number, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

export function makeDial(rng: () => number): DialPuzzle {
  return {
    digits: [Math.floor(rng() * 16), Math.floor(rng() * 16), Math.floor(rng() * 16)],
  };
}

/** How far the decoys sit from the code. Round 0 is obvious; round 4 is a keen eye. */
const PICK_BANDS = [
  { want: 190, slack: 70, apart: 90 },
  { want: 120, slack: 40, apart: 55 },
  { want: 68, slack: 22, apart: 28 },
  { want: 36, slack: 12, apart: 14 },
  { want: 16, slack: 5, apart: 7 },
] as const;

function sampleDecoy(rng: () => number, target: RGB, want: number, slack: number): RGB | null {
  for (let attempt = 0; attempt < 48; attempt++) {
    let dr = rng() * 2 - 1;
    let dg = rng() * 2 - 1;
    let db = rng() * 2 - 1;
    const len = Math.hypot(dr, dg, db) || 1;
    dr /= len;
    dg /= len;
    db /= len;
    let lo = 0;
    let hi = 440;
    let best: RGB = target;
    for (let step = 0; step < 18; step++) {
      const mid = (lo + hi) / 2;
      const c = {
        r: clamp(Math.round(target.r + dr * mid), 0, 255),
        g: clamp(Math.round(target.g + dg * mid), 0, 255),
        b: clamp(Math.round(target.b + db * mid), 0, 255),
      };
      best = c;
      if (rgbDistance(target, c) < want) lo = mid;
      else hi = mid;
    }
    const dist = rgbDistance(target, best);
    if (!sameRgb(best, target) && Math.abs(dist - want) <= slack) return best;
  }
  return null;
}

function makeOptions(rng: () => number, target: RGB, count: number, round: number): RGB[] {
  const band = PICK_BANDS[Math.min(round, PICK_BANDS.length - 1)]!;
  const opts: RGB[] = [target];
  let guard = 0;
  let want: number = band.want;
  let slack: number = band.slack;
  let apart: number = band.apart;
  while (opts.length < count && guard < 240) {
    guard++;
    if (guard % 40 === 0) {
      want = Math.max(8, want - 4);
      slack += 4;
      apart = Math.max(4, apart - 2);
    }
    const c = sampleDecoy(rng, target, want, slack);
    if (!c) continue;
    if (opts.some((o) => sameRgb(o, c) || rgbDistance(o, c) < apart)) continue;
    opts.push(c);
  }
  const dirs: [number, number, number][] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 0],
    [1, 0, 1],
    [0, 1, -1],
    [-1, 1, 0],
    [1, -1, 1],
  ];
  let k = 0;
  while (opts.length < count && k < 80) {
    const d = dirs[k % dirs.length]!;
    const mag = Math.max(5, Math.round(want * (0.65 + (k % 4) * 0.12)));
    const c = {
      r: clamp(target.r + d[0] * mag, 0, 255),
      g: clamp(target.g + d[1] * mag, 0, 255),
      b: clamp(target.b + d[2] * mag, 0, 255),
    };
    k++;
    if (!sameRgb(c, target) && opts.every((o) => !sameRgb(o, c))) opts.push(c);
  }
  return shuffle(rng, opts);
}

export function makePick(rng: () => number, tiles: number): PickPuzzle {
  const rounds: PickRound[] = [];
  for (let i = 0; i < 5; i++) {
    const target = randColor(rng);
    rounds.push({ target, options: makeOptions(rng, target, tiles, i) });
  }
  return { rounds };
}

export function makePin(rng: () => number): PinPuzzle {
  return { target: randColor(rng) };
}

function shifted(base: RGB, delta: number, rng: () => number): RGB {
  const keys = ["r", "g", "b"] as const;
  const odd: RGB = { ...base };
  const count = rng() < 0.45 ? 1 : 2;
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    let idx = Math.floor(rng() * 3);
    while (used.has(idx)) idx = (idx + 1) % 3;
    used.add(idx);
    const key = keys[idx]!;
    const dir = rng() < 0.5 ? -1 : 1;
    odd[key] = clamp(base[key] + dir * delta, 0, 255);
  }
  if (sameRgb(base, odd)) {
    odd.r = base.r + delta <= 255 ? base.r + delta : base.r - delta;
  }
  return odd;
}

export function makeOdd(rng: () => number): OddPuzzle {
  const deltas = [42, 28, 18];
  const rounds: OddRound[] = deltas.map((delta) => {
    const base = {
      r: 48 + Math.floor(rng() * 160),
      g: 48 + Math.floor(rng() * 160),
      b: 48 + Math.floor(rng() * 160),
    };
    return { base, odd: shifted(base, delta, rng), index: Math.floor(rng() * 16) };
  });
  return { rounds };
}

function perturb(c: RGB, rng: () => number, amount: number): RGB {
  const j = () => Math.round((rng() * 2 - 1) * amount);
  return {
    r: clamp(c.r + j(), 0, 255),
    g: clamp(c.g + j(), 0, 255),
    b: clamp(c.b + j(), 0, 255),
  };
}

export function makeGap(rng: () => number): GapPuzzle {
  const rounds: GapRound[] = [];
  for (let n = 0; n < 4; n++) {
    const start = randColor(rng);
    let end = randColor(rng);
    let guard = 0;
    while (rgbDistance(start, end) < 160 && guard++ < 24) end = randColor(rng);
    const stops = Array.from({ length: 7 }, (_, i) => {
      const t = i / 6;
      return {
        r: Math.round(start.r + (end.r - start.r) * t),
        g: Math.round(start.g + (end.g - start.g) * t),
        b: Math.round(start.b + (end.b - start.b) * t),
      };
    });
    const hidden = 3;
    const correct = stops[hidden]!;
    const options: RGB[] = [correct];
    guard = 0;
    let amount = 48;
    while (options.length < 4 && guard < 80) {
      guard++;
      if (guard % 12 === 0) amount += 22;
      const c = perturb(correct, rng, amount);
      if (options.every((o) => rgbDistance(o, c) > 24)) options.push(c);
    }
    const shifts = [
      { r: 70, g: -40, b: 20 },
      { r: -55, g: 35, b: 60 },
      { r: 25, g: 60, b: -50 },
    ];
    for (const s of shifts) {
      if (options.length >= 4) break;
      options.push({
        r: clamp(correct.r + s.r, 0, 255),
        g: clamp(correct.g + s.g, 0, 255),
        b: clamp(correct.b + s.b, 0, 255),
      });
    }
    const ordered = shuffle(rng, options);
    rounds.push({
      stops,
      hidden,
      options: ordered,
      answer: ordered.findIndex((c) => sameRgb(c, correct)),
    });
  }
  return { rounds };
}
