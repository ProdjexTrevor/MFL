import { useMemo, useState } from "react";
import type { Player } from "../types";
import { POSITIONS, nflAbbr, posClass, type Position } from "../lib/format";
import { useStarredPlayers } from "../hooks/useStarredPlayers";

type Props = {
  players: Player[];
};

type Filter = Position | "ALL" | "STARRED";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5"
      aria-hidden="true"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M10 2.4 12.2 7l5 .4-3.8 3.2 1.2 4.8L10 13.2 5.4 15.4l1.2-4.8L2.8 7.4 7.8 7 10 2.4Z" />
    </svg>
  );
}

export function AvailablePlayers({ players }: Props) {
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<Filter>("ALL");
  const { starred, toggleStar } = useStarredPlayers();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = players.filter((p) => {
      if (pos === "STARRED" && !starred.has(p.id)) return false;
      if (pos !== "ALL" && pos !== "STARRED" && p.position !== pos) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.nflTeam.toLowerCase().includes(q) ||
        nflAbbr(p.nflTeam).toLowerCase().includes(q)
      );
    });
    return rows.sort((a, b) => {
      const starDiff = Number(starred.has(b.id)) - Number(starred.has(a.id));
      if (starDiff !== 0) return starDiff;
      return (a.adpRank ?? 9999) - (b.adpRank ?? 9999);
    });
  }, [players, pos, query, starred]);

  const showAllMatches = query.trim().length >= 2 || pos === "STARRED";
  const shown = showAllMatches ? filtered : filtered.slice(0, 180);
  const starredCount = players.filter((p) => starred.has(p.id)).length;

  return (
    <section className="flex min-h-[280px] min-w-0 flex-col rounded-lg border border-line bg-panel min-[800px]:min-h-0">
      <div className="border-b border-line px-4 py-2">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-mute">
          Available
        </h2>
        <p className="text-[11px] text-mute">
          {filtered.length} undrafted · {starredCount} starred · ADP keep/10-team
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
          {(["ALL", "STARRED", ...POSITIONS] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPos(item)}
              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                pos === item ? "bg-gold text-bg" : "bg-panel-2 text-mute"
              }`}
            >
              {item === "STARRED" ? "Starred" : item}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="sticky top-0 bg-panel-2 text-[10px] uppercase tracking-wider text-mute">
            <tr>
              <th className="w-8 px-1 py-1.5 font-medium"> </th>
              <th className="px-2 py-1.5 font-medium">ADP</th>
              <th className="px-2 py-1.5 font-medium">Pos</th>
              <th className="px-2 py-1.5 font-medium">Player</th>
              <th className="px-2 py-1.5 font-medium">NFL</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => {
              const isStarred = starred.has(p.id);
              return (
                <tr key={p.id} className="border-t border-line/70 hover:bg-[#1b2722]">
                  <td className="px-1 py-1">
                    <button
                      type="button"
                      onClick={() => toggleStar(p.id)}
                      aria-pressed={isStarred}
                      aria-label={isStarred ? `Unstar ${p.name}` : `Star ${p.name}`}
                      className={`rounded p-1 ${isStarred ? "text-gold" : "text-mute hover:text-ink"}`}
                    >
                      <StarIcon filled={isStarred} />
                    </button>
                  </td>
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
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 && (
          <p className="px-3 py-3 text-[12px] text-mute">
            {pos === "STARRED"
              ? "No starred players still available. Star names in the list to build a queue."
              : "No matching available players."}
          </p>
        )}
        {shown.length < filtered.length && (
          <p className="px-3 py-2 text-[11px] text-mute">
            Showing top {shown.length}. Type two letters to search the rest.
          </p>
        )}
      </div>
    </section>
  );
}
