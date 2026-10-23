import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { Copy, Flame, RotateCcw } from "lucide-react";
import {
  formatRemain,
  grade,
  hashString,
  msUntilTomorrow,
  prettyDate,
  todayKey,
} from "@/lib/chroma/engine";
import {
  liveStreak,
  loadSave,
  MODE_IDS,
  scoreFor,
  sealMode,
  type LabSave,
  type ModeId,
} from "@/lib/chroma/storage";
import { DialGame, GapGame, OddGame, PickGame, PinGame } from "./games";

const MODES: { id: ModeId; label: string; line: string }[] = [
  {
    id: "dial",
    label: "Dial",
    line: "A random field. Guess its three hex digits — the same read as Guess My RGB, without the bare page.",
  },
  {
    id: "pick",
    label: "Pick",
    line: "The code is on the card. Six chips start far apart. By the fifth code they sit almost on top of each other.",
  },
  {
    id: "pin",
    label: "Pin",
    line: "You get the RGB numbers. The spectrum sits to the right — hue across, lightness down. Drop the pin.",
  },
  {
    id: "odd",
    label: "Odd",
    line: "A discrimination trial. Fifteen chips agree. One has been nudged.",
  },
  {
    id: "gap",
    label: "Gap",
    line: "A ramp with the middle stop lifted out. Put the right pigment back.",
  },
];

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ChromaApp() {
  const client = useIsClient();
  if (!client) return <ChromaFrame dateLabel="Today" streakLabel="Streak" sealedLabel="Daily set" />;
  return <ChromaReady />;
}

function ChromaReady() {
  const [dateKey, setDateKey] = useState(() => todayKey());
  const [remain, setRemain] = useState(() => formatRemain(msUntilTomorrow()));
  const [mode, setMode] = useState<ModeId>("dial");
  const [practice, setPractice] = useState(false);
  const [nonce, setNonce] = useState(1);
  const [save, setSave] = useState<LabSave>(() => loadSave());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const tick = () => {
      setDateKey(todayKey());
      setRemain(formatRemain(msUntilTomorrow()));
    };
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const fromHash = window.location.hash.replace("#", "") as ModeId;
    if (MODE_IDS.includes(fromHash)) setMode(fromHash);
  }, []);

  const meta = MODES.find((m) => m.id === mode)!;
  const streak = liveStreak(save, mode, dateKey);
  const sealed = scoreFor(save, mode, dateKey);
  const sealedCount = MODE_IDS.filter((id) => scoreFor(save, id, dateKey) != null).length;
  const seed = practice
    ? hashString(`practice:${mode}:${nonce}`)
    : hashString(`${dateKey}:${mode}`);

  const share = useMemo(() => {
    const lines = MODES.map((m) => {
      const s = scoreFor(save, m.id, dateKey);
      return `${m.label} ${s == null ? "·" : s}`;
    });
    return [`Chroma · ${prettyDate()}`, ...lines].join("\n");
  }, [save, dateKey]);

  function select(id: ModeId) {
    setMode(id);
    window.history.replaceState(null, "", `#${id}`);
  }

  function onSeal(score: number) {
    if (practice) return;
    setSave((prev) => sealMode(prev, mode, dateKey, score));
  }

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(share);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const gameProps = { seed, practice, sealed, onSeal };

  return (
    <ChromaFrame
      dateLabel={prettyDate()}
      streakLabel={streak === 0 ? "No streak" : `${streak}-day ${meta.label}`}
      sealedLabel={`${sealedCount} / 5 sealed`}
    >
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
          <div className="flex w-max gap-1" role="tablist" aria-label="Puzzles">
            {MODES.map((m) => {
              const active = m.id === mode;
              const mark = scoreFor(save, m.id, dateKey);
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => select(m.id)}
                  className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium ${
                    active ? "bg-ink text-card" : "text-muted"
                  }`}
                >
                  {m.label}
                  {!practice && mark != null ? (
                    <span className={`font-mono text-xs ${active ? "text-card" : "text-ink"}`}>{mark}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex shrink-0 rounded-full border border-line bg-card p-1">
          <button
            type="button"
            aria-pressed={!practice}
            onClick={() => setPractice(false)}
            className={`h-9 rounded-full px-4 text-sm ${practice ? "text-muted" : "bg-ink text-card"}`}
          >
            Daily
          </button>
          <button
            type="button"
            aria-pressed={practice}
            onClick={() => setPractice(true)}
            className={`h-9 rounded-full px-4 text-sm ${practice ? "bg-ink text-card" : "text-muted"}`}
          >
            Practice
          </button>
        </div>
      </div>

      <p className="mt-4 max-w-xl text-pretty text-muted">{meta.line}</p>

      <section className="mt-4 rounded-2xl bg-tray p-3 sm:p-4" aria-label={meta.label}>
        <div className="rounded-xl bg-card p-4 sm:p-6">
          {mode === "dial" ? <DialGame key={seed} {...gameProps} /> : null}
          {mode === "pick" ? <PickGame key={seed} {...gameProps} /> : null}
          {mode === "pin" ? <PinGame key={seed} {...gameProps} /> : null}
          {mode === "odd" ? <OddGame key={seed} {...gameProps} /> : null}
          {mode === "gap" ? <GapGame key={seed} {...gameProps} /> : null}
        </div>
      </section>

      <footer className="mt-6 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl text-sm text-pretty text-muted">
          {practice ? (
            <p>Practice deals a fresh random color and does not touch the streak.</p>
          ) : sealed != null ? (
            <p>
              {meta.label} is sealed at {sealed} · {grade(sealed)}. Next set in {remain}.
            </p>
          ) : (
            <p>Today’s five stay put until midnight. Next set in {remain}.</p>
          )}
          <p className="mt-2">
            Also worth a bench: rebuild a color from memory after it vanishes, pick its complement on a
            wheel, sort a shuffled lightness ramp, or name the pigment.
          </p>
        </div>
        <div className="flex gap-2">
          {practice ? (
            <button
              type="button"
              onClick={() => setNonce((n) => n + 1)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-card"
            >
              <RotateCcw className="size-4" />
              New color
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void copyShare()}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-medium text-ink"
            >
              <Copy className="size-4" />
              {copied ? "Copied" : "Copy day"}
            </button>
          )}
        </div>
      </footer>
    </ChromaFrame>
  );
}

function ChromaFrame({
  dateLabel,
  streakLabel,
  sealedLabel,
  children,
}: {
  dateLabel: string;
  streakLabel: string;
  sealedLabel: string;
  children?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-4 py-6 sm:px-8 sm:py-10">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-widest text-muted uppercase">Daily color lab</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="relative size-8 shrink-0" aria-hidden="true">
                <span className="absolute inset-0 rounded-md bg-ink" />
                <span className="absolute right-0 bottom-0 size-3 rounded-sm bg-signal" />
              </span>
              <h1 className="font-display text-4xl leading-none font-medium tracking-tight sm:text-5xl">Chroma</h1>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs text-muted">{dateLabel}</p>
            <p className="mt-1 inline-flex items-center gap-1 font-mono text-sm text-ink">
              <Flame className="size-4 text-signal" aria-hidden="true" />
              {streakLabel}
            </p>
            <p className="font-mono text-xs text-muted">{sealedLabel}</p>
          </div>
        </header>
        {children ?? (
          <p className="mt-10 text-muted">Setting today’s pigments.</p>
        )}
      </div>
    </main>
  );
}
