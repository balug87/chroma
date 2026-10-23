import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import {
  average,
  dialScore,
  digitsToHex,
  digitsToRgb,
  grade,
  hslToRgb,
  isDark,
  makeDial,
  makeGap,
  makeOdd,
  makePick,
  makePin,
  mulberry32,
  pinScore,
  rgbCss,
  rgbHex,
  sameRgb,
  type DialPuzzle,
  type GapPuzzle,
  type OddPuzzle,
  type PickPuzzle,
  type RGB,
} from "@/lib/chroma/engine";

type Props = {
  seed: number;
  practice: boolean;
  sealed: number | null;
  onSeal: (score: number) => void;
};

function Receipt({
  score,
  detail,
  onReplay,
}: {
  score: number;
  detail: string;
  onReplay: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="font-mono text-xs tracking-widest text-muted uppercase">Sealed today</p>
      <div className="flex items-end gap-3">
        <p className="font-display text-6xl leading-none text-ink">{score}</p>
        <p className="mb-1 font-mono text-sm text-muted">{grade(score)}</p>
      </div>
      <p className="max-w-md text-pretty text-muted">{detail}</p>
      <button
        type="button"
        onClick={onReplay}
        className="inline-flex h-11 items-center rounded-full border border-line bg-card px-5 text-sm font-medium text-ink"
      >
        Play again
      </button>
      <p className="text-sm text-muted">A replay will not change today’s score.</p>
    </div>
  );
}

function SealedGate({
  practice,
  sealed,
  detail,
  children,
}: {
  practice: boolean;
  sealed: number | null;
  detail: string;
  children: (canSeal: boolean) => ReactNode;
}) {
  const [openedSealed] = useState(sealed != null);
  const [replay, setReplay] = useState(false);
  if (!practice && openedSealed && !replay && sealed != null) {
    return <Receipt score={sealed} detail={detail} onReplay={() => setReplay(true)} />;
  }
  return children(!practice && sealed == null);
}

function Dots({ total, index }: { total: number; index: number }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`size-1.5 rounded-full ${i < index ? "bg-ink" : "bg-line"}`} />
      ))}
    </div>
  );
}

function Swatch({ color, className }: { color: RGB; className?: string }) {
  return <span className={className} style={{ background: rgbCss(color) }} />;
}

export function DialGame(props: Props) {
  return (
    <SealedGate
      practice={props.practice}
      sealed={props.sealed}
      detail="Three hex digits against a random field. Come back tomorrow for a new pigment."
    >
      {(canSeal) => <DialPlay {...props} canSeal={canSeal} />}
    </SealedGate>
  );
}

function DialPlay({ seed, canSeal, onSeal, practice }: Props & { canSeal: boolean }) {
  const puzzle: DialPuzzle = useMemo(() => makeDial(mulberry32(seed)), [seed]);
  const target = puzzle.digits;
  const targetRgb = digitsToRgb(target);
  const dark = isDark(targetRgb);
  const [guess, setGuess] = useState<[number, number, number]>([8, 8, 8]);
  const [expert, setExpert] = useState(false);
  const [rows, setRows] = useState<{ hex: string; score: number; color: RGB }[]>([]);
  const [done, setDone] = useState(false);
  const best = rows.reduce((m, r) => Math.max(m, r.score), 0);
  const ink = dark ? "var(--color-card)" : "var(--color-ink)";

  function commit(finalScore: number) {
    if (done) return;
    setDone(true);
    if (canSeal) onSeal(finalScore);
  }

  function submit() {
    if (done) return;
    const score = dialScore(target, guess);
    const next = [
      { hex: digitsToHex(guess), score, color: digitsToRgb(guess) },
      ...rows,
    ].slice(0, 8);
    setRows(next);
    const nextBest = Math.max(best, score);
    if (score === 100) commit(100);
    else if (next.length >= 6) commit(nextBest);
  }

  const channels = [
    ["R", 0],
    ["G", 1],
    ["B", 2],
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex min-h-52 flex-col justify-between rounded-xl p-5 sm:min-h-64"
        style={{ background: rgbCss(targetRgb), color: ink }}
      >
        <p className="font-mono text-xs tracking-widest uppercase opacity-80">Target field</p>
        <div>
          <p className="font-display text-3xl leading-none sm:text-4xl">Read this pigment</p>
          <p className="mt-2 max-w-sm text-sm opacity-80">
            Three hex digits, 0–F. The mix stays hidden until you submit.
          </p>
        </div>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex items-end justify-between gap-3">
          <p className="font-mono text-3xl tracking-wide text-ink">{digitsToHex(guess)}</p>
          <button
            type="button"
            onClick={() => setExpert((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm text-ink"
            aria-pressed={expert}
          >
            {expert ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {expert ? "Expert" : "Show match"}
          </button>
        </div>
        {channels.map(([label, index]) => (
          <label key={label} className="grid grid-cols-[1.25rem_1fr_1.5rem] items-center gap-3">
            <span className="font-mono text-sm text-muted">{label}</span>
            <input
              className="chroma-range"
              type="range"
              min={0}
              max={15}
              step={1}
              value={guess[index]}
              aria-label={`${label} hex digit`}
              onChange={(e) => {
                const n = Number(e.target.value);
                setGuess((prev) => {
                  const next: [number, number, number] = [prev[0], prev[1], prev[2]];
                  next[index] = n;
                  return next;
                });
              }}
            />
            <span className="text-right font-mono text-sm text-ink">
              {guess[index].toString(16).toUpperCase()}
            </span>
          </label>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={done}
            className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-medium text-card disabled:opacity-40"
          >
            Submit {digitsToHex(guess)}
          </button>
          <button
            type="button"
            disabled={done || rows.length === 0}
            onClick={() => commit(best)}
            className="inline-flex h-11 items-center rounded-full border border-line bg-card px-5 text-sm font-medium text-ink disabled:opacity-40"
          >
            Seal best {rows.length ? best : ""}
          </button>
        </div>
        <p className="text-sm text-muted">
          {practice
            ? "Practice does not touch the streak. Six reads, or a perfect match, ends the trial."
            : expert
              ? "Expert hides the percentage. Six reads, or a perfect match, seals the day."
              : "Six reads, or a perfect match, seals the day. 100 is splendid."}
        </p>
      </form>

      <ul className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <li
            key={`${row.hex}-${i}`}
            className="flex items-center gap-3 rounded-lg border border-line bg-paper px-3 py-2"
          >
            <Swatch color={row.color} className="size-10 shrink-0 rounded-md" />
            <span className="font-mono text-sm text-ink">{row.hex}</span>
            <span className="ml-auto font-mono text-sm text-muted">
              {row.score === 100 ? "Splendid" : expert ? "Try again" : `${row.score}%`}
            </span>
          </li>
        ))}
      </ul>
      {done ? (
        <p className="font-mono text-sm text-ink" aria-live="polite">
          Sealed at {best}. The field was {digitsToHex(target)} · {rgbHex(targetRgb)}.
        </p>
      ) : null}
    </div>
  );
}

export function PickGame(props: Props) {
  const [hard, setHard] = useState(true);
  return (
    <SealedGate
      practice={props.practice}
      sealed={props.sealed}
      detail="Five codes, six chips each. First-click hits score highest."
    >
      {(canSeal) => (
        <div className="flex flex-col gap-4">
          {props.practice ? (
            <div className="flex gap-2">
              {[
                [true, "Six chips"],
                [false, "Three chips"],
              ].map(([value, label]) => (
                <button
                  key={label as string}
                  type="button"
                  aria-pressed={hard === value}
                  onClick={() => setHard(value as boolean)}
                  className={`inline-flex h-11 items-center rounded-full px-4 text-sm ${
                    hard === value ? "bg-ink text-card" : "border border-line bg-card text-ink"
                  }`}
                >
                  {label as string}
                </button>
              ))}
            </div>
          ) : null}
          <PickPlay
            key={`${hard}`}
            {...props}
            hard={props.practice ? hard : true}
            canSeal={canSeal}
          />
        </div>
      )}
    </SealedGate>
  );
}

function PickPlay({
  seed,
  hard,
  canSeal,
  onSeal,
}: Props & { hard: boolean; canSeal: boolean }) {
  const tiles = hard ? 6 : 3;
  const puzzle: PickPuzzle = useMemo(
    () => makePick(mulberry32(seed + (hard ? 11 : 29)), tiles),
    [seed, hard, tiles],
  );
  const [round, setRound] = useState(0);
  const [gone, setGone] = useState<number[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [phase, setPhase] = useState<"play" | "hit" | "done">("play");
  const timer = useRef<number | null>(null);
  const current = puzzle.rounds[round]!;

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function choose(index: number) {
    if (phase !== "play" || gone.includes(index)) return;
    const picked = current.options[index]!;
    if (!sameRgb(picked, current.target)) {
      setGone((g) => [...g, index]);
      return;
    }
    const misses = gone.length;
    const score = misses === 0 ? 100 : misses === 1 ? 70 : misses === 2 ? 45 : 25;
    const nextScores = [...scores, score];
    setScores(nextScores);
    if (round + 1 >= puzzle.rounds.length) {
      setPhase("done");
      if (canSeal) onSeal(average(nextScores));
      return;
    }
    setPhase("hit");
    timer.current = window.setTimeout(() => {
      setRound((r) => r + 1);
      setGone([]);
      setPhase("play");
    }, 700);
  }

  const show = phase === "hit" || phase === "done" ? current.target : null;
  const headerDark = show ? isDark(show) : false;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-xl border border-line px-5 py-5 transition-colors duration-300"
        style={{
          background: show ? rgbCss(show) : "var(--color-card)",
          color: show ? (headerDark ? "var(--color-card)" : "var(--color-ink)") : "var(--color-ink)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs tracking-widest uppercase opacity-70">
            {phase === "done" ? "Read" : `Code ${round + 1} of ${puzzle.rounds.length}`}
          </p>
          <Dots total={puzzle.rounds.length} index={scores.length} />
        </div>
        <p className="mt-3 flex flex-wrap gap-x-3 font-mono text-3xl tracking-tight tabular-nums sm:text-4xl">
          <span>{current.target.r}</span>
          <span>{current.target.g}</span>
          <span>{current.target.b}</span>
        </p>
        <p className="mt-1 font-mono text-sm opacity-70">{rgbHex(current.target)}</p>
      </div>
      <div className={`grid gap-3 ${tiles === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3"}`}>
        {current.options.map((color, i) => {
          const dead = gone.includes(i);
          return (
            <button
              key={`${round}-${i}`}
              type="button"
              disabled={dead || phase !== "play"}
              aria-label={`Chip ${i + 1}`}
              onClick={() => choose(i)}
              className={`aspect-square rounded-xl border border-line transition duration-200 ${
                dead ? "scale-95 opacity-0" : ""
              }`}
              style={{ background: rgbCss(color) }}
            />
          );
        })}
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {phase === "hit"
          ? "That’s the one."
          : phase === "done"
            ? `Sealed at ${average(scores)}. A first try is 100; later tries step down.`
            : "Tap the chip that matches the code. Wrong chips leave the bench."}
      </p>
    </div>
  );
}

export function PinGame(props: Props) {
  return (
    <SealedGate
      practice={props.practice}
      sealed={props.sealed}
      detail="One pin on the spectrum. Hue across, lightness down, saturation on the rail."
    >
      {(canSeal) => <PinPlay {...props} canSeal={canSeal} />}
    </SealedGate>
  );
}

function PinPlay({ seed, canSeal, onSeal }: Props & { canSeal: boolean }) {
  const puzzle = useMemo(() => makePin(mulberry32(seed)), [seed]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sat, setSat] = useState(100);
  const [hue, setHue] = useState(200);
  const [light, setLight] = useState(0.55);
  const [placed, setPlaced] = useState<RGB | null>(null);
  const aiming = hslToRgb(hue, sat / 100, light);
  const score = placed ? pinScore(puzzle.target, placed) : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(2, Math.floor(rect.width * dpr));
      const h = Math.max(2, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const img = ctx.createImageData(w, h);
      const data = img.data;
      const s = sat / 100;
      for (let y = 0; y < h; y++) {
        const l = 1 - y / (h - 1);
        for (let x = 0; x < w; x++) {
          const hh = (x / (w - 1)) * 360;
          const c = hslToRgb(hh, s, l);
          const i = (y * w + x) * 4;
          data[i] = c.r;
          data[i + 1] = c.g;
          data[i + 2] = c.b;
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [sat]);

  function aimFrom(e: React.PointerEvent<HTMLCanvasElement>) {
    if (placed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    setHue(x * 360);
    setLight(1 - y);
  }

  function drop() {
    if (placed) return;
    setPlaced(aiming);
    if (canSeal) onSeal(pinScore(puzzle.target, aiming));
  }

  function nudge(dh: number, dl: number) {
    if (placed) return;
    setHue((h) => (h + dh + 360) % 360);
    setLight((l) => Math.min(1, Math.max(0, l + dl)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-stretch gap-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
        <div className="flex flex-col justify-between gap-3">
          <div>
            <p className="font-mono text-xs tracking-widest text-muted uppercase">RGB</p>
            <p className="mt-2 font-mono text-xl leading-none tracking-tight text-ink sm:text-3xl">
              {puzzle.target.r}
            </p>
            <p className="mt-1 font-mono text-xl leading-none tracking-tight text-ink sm:text-3xl">
              {puzzle.target.g}
            </p>
            <p className="mt-1 font-mono text-xl leading-none tracking-tight text-ink sm:text-3xl">
              {puzzle.target.b}
            </p>
            <p className="mt-2 hidden font-mono text-xs text-muted sm:block">{rgbHex(puzzle.target)}</p>
          </div>
        </div>
        <div className="relative min-w-0">
          <canvas
            ref={canvasRef}
            tabIndex={0}
            role="application"
            aria-label="Color spectrum. Hue left to right, lightness top to bottom. Arrow keys nudge the pin."
            className="block h-64 w-full touch-none rounded-xl sm:h-96"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              aimFrom(e);
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) aimFrom(e);
            }}
            onKeyDown={(e) => {
              const stepH = e.shiftKey ? 8 : 2;
              const stepL = e.shiftKey ? 0.04 : 0.01;
              if (e.key === "ArrowLeft") nudge(-stepH, 0);
              else if (e.key === "ArrowRight") nudge(stepH, 0);
              else if (e.key === "ArrowUp") nudge(0, stepL);
              else if (e.key === "ArrowDown") nudge(0, -stepL);
              else if (e.key === "Enter") drop();
              else return;
              e.preventDefault();
            }}
          />
          <span
            className="pin-mark pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card"
            style={{
              left: `${(hue / 360) * 100}%`,
              top: `${(1 - light) * 100}%`,
              background: rgbCss(aiming),
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Swatch color={aiming} className="size-12 rounded-lg border border-line" />
        <p className="font-mono text-xs leading-5 text-muted">
          H {Math.round(hue)} · S {sat} · L {Math.round(light * 100)}
        </p>
        <button
          type="button"
          onClick={drop}
          disabled={!!placed}
          className="ml-auto inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-card disabled:opacity-40"
        >
          {placed ? "Pin dropped" : "Drop pin"}
        </button>
      </div>

      <label className="flex flex-col gap-2">
        <span className="flex items-center justify-between font-mono text-xs tracking-widest text-muted uppercase">
          Saturation <span>{sat}</span>
        </span>
        <input
          className="chroma-range"
          type="range"
          min={0}
          max={100}
          value={sat}
          disabled={!!placed}
          aria-label="Saturation"
          onChange={(e) => setSat(Number(e.target.value))}
        />
      </label>

      {placed && score != null ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          <p className="font-display text-4xl leading-none text-ink">
            {score} <span className="font-mono text-sm text-muted">{grade(score)}</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Swatch color={placed} className="block h-16 rounded-lg border border-line" />
              <p className="mt-1 font-mono text-xs text-muted">Your pin · {rgbHex(placed)}</p>
            </div>
            <div>
              <Swatch color={puzzle.target} className="block h-16 rounded-lg border border-line" />
              <p className="mt-1 font-mono text-xs text-muted">Actual · {rgbHex(puzzle.target)}</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-pretty text-muted">
          Hue runs left to right, lightness from top to bottom. Set saturation, then drop one pin.
        </p>
      )}
    </div>
  );
}

export function OddGame(props: Props) {
  return (
    <SealedGate
      practice={props.practice}
      sealed={props.sealed}
      detail="Three grids. The shift gets quieter each round."
    >
      {(canSeal) => <OddPlay {...props} canSeal={canSeal} />}
    </SealedGate>
  );
}

function OddPlay({ seed, canSeal, onSeal }: Props & { canSeal: boolean }) {
  const puzzle: OddPuzzle = useMemo(() => makeOdd(mulberry32(seed)), [seed]);
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const timer = useRef<number | null>(null);
  const current = puzzle.rounds[round]!;

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function choose(index: number) {
    if (picked != null || done) return;
    const hit = index === current.index;
    const score = hit ? 100 : 0;
    const next = [...scores, score];
    setPicked(index);
    setScores(next);
    const last = round + 1 >= puzzle.rounds.length;
    timer.current = window.setTimeout(() => {
      if (last) {
        setDone(true);
        if (canSeal) onSeal(average(next));
      } else {
        setRound((r) => r + 1);
        setPicked(null);
      }
    }, 780);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs tracking-widest text-muted uppercase">
          {done ? "Sealed" : `Grid ${round + 1} of ${puzzle.rounds.length}`}
        </p>
        <Dots total={puzzle.rounds.length} index={scores.length} />
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 16 }, (_, i) => {
          const color = i === current.index ? current.odd : current.base;
          const revealed = picked != null;
          const isOdd = i === current.index;
          const isPick = i === picked;
          return (
            <button
              key={`${round}-${i}`}
              type="button"
              aria-label={`Chip ${i + 1}`}
              disabled={picked != null || done}
              onClick={() => choose(i)}
              className={`aspect-square rounded-lg border ${
                revealed && isOdd ? "border-ink" : "border-transparent"
              } ${revealed && isPick && !isOdd ? "opacity-40" : ""}`}
              style={{ background: rgbCss(color) }}
            />
          );
        })}
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {done ? (
          <>
            <Check className="mr-1 inline size-4" />
            Sealed at {average(scores)}. The odd chip picks up a dark edge when the grid opens.
          </>
        ) : picked != null ? (
          picked === current.index ? "Caught it." : "That one matched the field."
        ) : (
          "One chip is shifted. The rest are identical."
        )}
      </p>
    </div>
  );
}

export function GapGame(props: Props) {
  return (
    <SealedGate
      practice={props.practice}
      sealed={props.sealed}
      detail="Four ramps. Pick the stop that was lifted out of the middle."
    >
      {(canSeal) => <GapPlay {...props} canSeal={canSeal} />}
    </SealedGate>
  );
}

function GapPlay({ seed, canSeal, onSeal }: Props & { canSeal: boolean }) {
  const puzzle: GapPuzzle = useMemo(() => makeGap(mulberry32(seed)), [seed]);
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const timer = useRef<number | null>(null);
  const current = puzzle.rounds[round]!;

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function choose(index: number) {
    if (picked != null || done) return;
    const hit = index === current.answer;
    const next = [...scores, hit ? 100 : 0];
    setPicked(index);
    setScores(next);
    const last = round + 1 >= puzzle.rounds.length;
    timer.current = window.setTimeout(() => {
      if (last) {
        setDone(true);
        if (canSeal) onSeal(average(next));
      } else {
        setRound((r) => r + 1);
        setPicked(null);
      }
    }, 800);
  }

  const hole =
    picked == null ? null : picked === current.answer ? current.options[picked]! : current.stops[current.hidden]!;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs tracking-widest text-muted uppercase">
          {done ? "Sealed" : `Ramp ${round + 1} of ${puzzle.rounds.length}`}
        </p>
        <Dots total={puzzle.rounds.length} index={scores.length} />
      </div>
      <div className="flex h-24 overflow-hidden rounded-xl sm:h-28">
        {current.stops.map((color, i) => {
          if (i === current.hidden) {
            return (
              <div
                key={i}
                className="flex flex-1 items-center justify-center border border-dashed border-ink/30 bg-tray"
                style={hole ? { background: rgbCss(hole), borderStyle: "solid", borderColor: "transparent" } : undefined}
              />
            );
          }
          return <div key={i} className="flex-1" style={{ background: rgbCss(color) }} />;
        })}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {current.options.map((color, i) => {
          const show = picked != null;
          const correct = i === current.answer;
          const chosen = i === picked;
          return (
            <button
              key={`${round}-${i}`}
              type="button"
              aria-label={`Candidate ${i + 1}`}
              disabled={picked != null || done}
              onClick={() => choose(i)}
              className={`h-16 rounded-xl border-2 sm:h-20 ${
                show && correct ? "border-ink" : show && chosen ? "border-signal" : "border-transparent"
              }`}
              style={{ background: rgbCss(color) }}
            />
          );
        })}
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {done
          ? `Sealed at ${average(scores)}.`
          : picked == null
            ? "Choose the color that completes the ramp."
            : picked === current.answer
              ? "It sits cleanly."
              : "The hole shows the true stop."}
      </p>
    </div>
  );
}
