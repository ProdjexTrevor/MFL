import { useMemo, useState } from "react";
import type { Player } from "../types";
import { POSITIONS, nflAbbr, posClass, type Position } from "../lib/format";

type Props = {
  players: Player[];
};

export function AvailablePlayers({ players }: Props) {
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<Position | "ALL">("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter((p) => {
      if (pos !== "ALL" && p.position !== pos) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.nflTeam.toLowerCase().includes(q) ||
        nflAbbr(p.nflTeam).toLowerCase().includes(q)
      );
    });
  }, [players, pos, query]);

  const shown = query.trim().length >= 2 ? filtered : filtered.slice(0, 180);

  return (
    <section className="flex min-h-[280px] min-w-0 flex-col rounded-lg border border-line bg-panel min-[800px]:min-h-0">
      <div className="border-b border-line px-4 py-2">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-mute">
          Available
        </h2>
        <p className="text-[11px] text-mute">
          {filtered.length} undrafted skill players · ADP keep/10-team
        </p>
      </div>
      <div className="space-y-2 border-b border-line px-3 py-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or NFL team"
          className="w-full rounded border border-line bg-[#0f1613] px-2 py-1.5 text-sm outline-none focus:border-gold"
        />
        <div className="flex flex-wrap gap-1">
          {(["ALL", ...POSITIONS] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPos(item)}
              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                pos === item ? "bg-gold text-bg" : "bg-panel-2 text-mute"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="sticky top-0 bg-panel-2 text-[10px] uppercase tracking-wider text-mute">
            <tr>
              <th className="px-2 py-1.5 font-medium">ADP</th>
              <th className="px-2 py-1.5 font-medium">Pos</th>
              <th className="px-2 py-1.5 font-medium">Player</th>
              <th className="px-2 py-1.5 font-medium">NFL</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className="border-t border-line/70 hover:bg-[#1b2722]">
                <td className="px-2 py-1.5 tabular-nums text-mute">
                  {p.adpRank ?? "—"}
                </td>
                <td className="px-2 py-1.5">
                  <span className={`${posClass(p.position)} rounded px-1 text-[10px] font-semibold`}>
                    {p.position}
                  </span>
                </td>
                <td className="px-2 py-1.5 font-medium">{p.name}</td>
                <td className="px-2 py-1.5 text-mute">{nflAbbr(p.nflTeam)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length < filtered.length && (
          <p className="px-3 py-2 text-[11px] text-mute">
            Showing top {shown.length}. Type two letters to search the rest.
          </p>
        )}
      </div>
    </section>
  );
}
