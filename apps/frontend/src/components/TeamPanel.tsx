import type { DraftPick, Franchise, RosterPlayer } from "../types";
import { POSITIONS, nflAbbr, posClass, posRank, teamLabel } from "../lib/format";

const STARTER_FLOOR: Record<string, number> = { QB: 1, RB: 2, WR: 3, TE: 1 };

type Props = {
  franchises: Franchise[];
  rosters: Record<string, RosterPlayer[]>;
  myTeam: string;
  current: DraftPick | null;
  upcoming: DraftPick[];
  onSelectPlayer: (id: string) => void;
};

function counts(roster: RosterPlayer[] = []) {
  const map: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const p of roster) {
    if (p.position in map) map[p.position] += 1;
  }
  return map;
}

function TeamBlock({
  title,
  hint,
  franchise,
  roster,
  onSelectPlayer,
}: {
  title: string;
  hint?: string;
  franchise?: Franchise;
  roster: RosterPlayer[];
  onSelectPlayer: (id: string) => void;
}) {
  const tally = counts(roster);
  const ordered = [...roster].sort((a, b) => {
    const order = POSITIONS.indexOf(a.position as (typeof POSITIONS)[number]);
    const other = POSITIONS.indexOf(b.position as (typeof POSITIONS)[number]);
    return (order === -1 ? 9 : order) - (other === -1 ? 9 : other) || a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="sticky top-0 border-b border-line bg-panel px-4 py-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {franchise && <p className="text-[12px] text-mute">{franchise.name}</p>}
        {hint && <p className="text-[11px] text-mute">{hint}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
          {POSITIONS.map((pos) => {
            const n = tally[pos] ?? 0;
            const thin = n < (STARTER_FLOOR[pos] ?? 0);
            return (
              <span
                key={pos}
                className={`rounded px-1.5 py-0.5 ${posClass(pos)} ${thin ? "ring-1 ring-gold/70" : ""}`}
              >
                {pos} {n}
              </span>
            );
          })}
        </div>
      </div>
      <ul className="px-2 py-2">
        {ordered.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelectPlayer(p.id)}
              className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-[#1b2722]"
            >
            <span className={`${posClass(p.position)} w-8 rounded text-center text-[10px] font-semibold`}>
              {p.position}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px]">
              {p.name}
              {p.isRookie ? <span className="ml-1 text-[9px] font-semibold text-gold">RK</span> : null}
            </span>
            <span className="text-[11px] tabular-nums text-mute">
              {posRank(p.position, p.adpPosRank) || nflAbbr(p.nflTeam)}
            </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TeamPanel({ franchises, rosters, myTeam, current, upcoming, onSelectPlayer }: Props) {
  const byId = new Map(franchises.map((f) => [f.id, f]));
  const clockId = current?.franchiseId ?? "";
  const showMine = myTeam && myTeam !== clockId;

  return (
    <section className="flex min-h-[280px] min-w-0 flex-col rounded-lg border border-line bg-panel min-[800px]:min-h-0">
      <div className="border-b border-line px-4 py-2">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-mute">Room</h2>
        <ol className="mt-2 space-y-1 text-[12px]">
          {upcoming.slice(0, 5).map((p, i) => (
            <li key={p.overall} className="flex justify-between gap-2 text-mute">
              <span>
                {i === 0 ? "Now" : `+${i}`} {p.round}.{String(p.pick).padStart(2, "0")}
              </span>
              <span className="truncate text-ink">{teamLabel(p.franchiseId, byId.get(p.franchiseId)?.abbrev)}</span>
            </li>
          ))}
        </ol>
      </div>
      <TeamBlock
        title="On the clock"
        franchise={byId.get(clockId)}
        roster={rosters[clockId] ?? []}
        hint="Gold ring = below starter floor"
        onSelectPlayer={onSelectPlayer}
      />
      {showMine && (
        <>
          <div className="border-t border-line" />
          <TeamBlock
            title="My roster"
            franchise={byId.get(myTeam)}
            roster={rosters[myTeam] ?? []}
            onSelectPlayer={onSelectPlayer}
          />
        </>
      )}
    </section>
  );
}
