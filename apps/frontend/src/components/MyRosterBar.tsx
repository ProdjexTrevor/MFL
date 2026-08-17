import type { Franchise, RosterPlayer } from "../types";
import { POSITIONS, formatPts, posClass } from "../lib/format";

const STARTER_FLOOR: Record<string, number> = { QB: 1, RB: 2, WR: 3, TE: 1 };

type Props = {
  franchise?: Franchise;
  roster: RosterPlayer[];
  onSelectPlayer: (id: string) => void;
  onDockSide: () => void;
};

function counts(roster: RosterPlayer[] = []) {
  const map: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const player of roster) {
    if (player.position in map) map[player.position] += 1;
  }
  return map;
}

export function MyRosterBar({ franchise, roster, onSelectPlayer, onDockSide }: Props) {
  const tally = counts(roster);
  const byPos = POSITIONS.map((pos) => ({
    pos,
    players: roster
      .filter((player) => player.position === pos)
      .sort((a, b) => (b.lastYearPts ?? -1) - (a.lastYearPts ?? -1) || a.name.localeCompare(b.name)),
  }));

  return (
    <section className="shrink-0 border-t border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-mute">My roster</h2>
          {franchise && <p className="text-[13px]">{franchise.name}</p>}
          <p className="text-[11px] text-mute">{roster.length} players</p>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
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
        <button type="button" onClick={onDockSide} className="rounded px-2 py-1 text-[11px] text-gold hover:underline">
          Move to side
        </button>
      </div>
      <div className="grid max-h-44 grid-cols-2 gap-2 overflow-auto px-3 pb-2 min-[800px]:grid-cols-4">
        {byPos.map(({ pos, players }) => (
          <div key={pos} className="min-w-0 rounded bg-panel-2 px-2 py-1.5">
            <p className="mb-1 text-[10px] font-semibold tracking-wider text-mute uppercase">
              {pos} · {players.length}
            </p>
            {players.length === 0 ? (
              <p className="text-[11px] text-mute">—</p>
            ) : (
              <ul className="space-y-0.5">
                {players.map((player) => (
                  <li key={player.id}>
                    <button
                      type="button"
                      onClick={() => onSelectPlayer(player.id)}
                      className="flex w-full min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-[#1b2722]"
                    >
                      <span className={`${posClass(player.position)} w-7 shrink-0 rounded text-center text-[10px] font-semibold`}>
                        {player.position}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12px]">
                        {player.name}
                        {player.isRookie ? <span className="ml-1 text-[9px] font-semibold text-gold">RK</span> : null}
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-mute" title="Last year's league points">
                        {player.lastYearPts == null ? "—" : formatPts(player.lastYearPts)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
