import { useEffect, useState } from "react";
import type { DepthSpot, NewsItem, Player, PlayerCard } from "../types";
import { getPlayerCard } from "../api";
import { nflAbbr, playerNewsLinks, formatPts, posClass, posRank } from "../lib/format";

type Props = {
  player: Player;
  onClose: () => void;
};

function RankRow({ label, overall, pos, playerPos }: { label: string; overall?: number; pos?: number; playerPos: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded bg-panel-2 px-3 py-2 text-sm">
      <span className="text-mute">{label}</span>
      <span className="tabular-nums">
        {posRank(playerPos, pos) || "—"}
        {overall ? <span className="text-mute"> · OVR {overall}</span> : null}
      </span>
    </div>
  );
}

function NewsList({
  title,
  items,
  href,
  loading,
}: {
  title: string;
  items: NewsItem[];
  href: string;
  loading: boolean;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-mute">{title}</h3>
        <a href={href} target="_blank" rel="noreferrer" className="text-[11px] text-gold hover:underline">
          Open search
        </a>
      </div>
      {loading ? (
        <p className="text-[12px] text-mute">Loading headlines…</p>
      ) : items.length === 0 ? (
        <p className="text-[12px] text-mute">No headlines loaded. Use Open search.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.url}>
              <a href={item.url} target="_blank" rel="noreferrer" className="block text-[13px] hover:text-gold">
                {item.title}
              </a>
              {item.source && <p className="text-[11px] text-mute">{item.source}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DepthBlock({ depth }: { depth: DepthSpot | null }) {
  if (!depth) {
    return <p className="text-[12px] text-mute">No depth-chart slot found for this player.</p>;
  }
  const source = depth.source || depth.chart;
  return (
    <div>
      <p className="text-sm font-semibold">{depth.label}</p>
      <p className="text-[12px] text-mute">
        {source}
        {depth.chart && depth.chart !== source ? ` · ${depth.chart}` : ""}
        {depth.ahead.length ? ` · Behind ${depth.ahead.join(", ")}` : " · Top of this group"}
      </p>
      <ol className="mt-2 space-y-1 text-[12px]">
        {depth.unit.map((row) => (
          <li key={`${row.rank}-${row.name}`} className={row.self ? "text-gold" : "text-mute"}>
            {row.rank}. {row.name}
            {row.self ? " ←" : ""}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PlayerSheet({ player, onClose }: Props) {
  const [card, setCard] = useState<PlayerCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCard(null);
    setError(null);
    getPlayerCard(player.id)
      .then((data) => {
        if (!cancelled) setCard(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load player card");
      });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
    };
  }, [player.id, onClose]);

  const shown = card?.player ?? player;
  const team = nflAbbr(shown.nflTeam);
  const links = card?.links ?? playerNewsLinks(shown);
  const errorText =
    error && error !== "[object Object]" ? error : error ? "Could not load ESPN extras" : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 min-[800px]:items-center">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close player" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg border border-line bg-panel p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{shown.name}</p>
            <p className="text-sm text-mute">
              <span className={`${posClass(shown.position)} mr-1 rounded px-1 text-[10px] font-semibold`}>
                {shown.position}
              </span>
              {team}
              {shown.jersey ? ` · #${shown.jersey}` : ""}
              {shown.college ? ` · ${shown.college}` : ""}
              {shown.isRookie ? " · Rookie" : ""}
              {shown.draftYear ? ` · Draft ${shown.draftYear}` : ""}
              {shown.lastYearPts != null ? ` · ${formatPts(shown.lastYearPts)} pts last year` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-mute hover:text-ink">
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <RankRow label="MFL ADP (keep/10)" overall={shown.adpRank} pos={shown.adpPosRank} playerPos={shown.position} />
          <RankRow label="FantasySharks" overall={shown.sharksRank} pos={shown.sharksPosRank} playerPos={shown.position} />
          {shown.isRookie ? (
            <RankRow label="2026 rookies" pos={shown.rookiePosRank} playerPos={shown.position} />
          ) : (
            <div className="flex items-center justify-between gap-3 rounded bg-panel-2 px-3 py-2 text-sm">
              <span className="text-mute">Rookie</span>
              <span className="text-mute">No</span>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-6 min-[800px]:grid-cols-2">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-mute">Depth chart</h3>
            {card ? (
              <DepthBlock depth={card.depth} />
            ) : errorText ? (
              <p className="text-[12px] text-gold">{errorText}</p>
            ) : (
              <p className="text-[12px] text-mute">Loading depth chart…</p>
            )}
          </section>
          <div className="space-y-5">
            <NewsList
              title="Google News"
              items={card?.news.google ?? []}
              href={links.googleNews}
              loading={!card && !errorText}
            />
            <NewsList
              title="ESPN News"
              items={card?.news.espn ?? []}
              href={links.espnNews}
              loading={!card && !errorText}
            />
            <a href={links.espnPlayer} target="_blank" rel="noreferrer" className="inline-block text-[12px] text-gold hover:underline">
              ESPN player page
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
