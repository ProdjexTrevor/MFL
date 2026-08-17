import type { DraftPick, Franchise } from "../types";
import { nflAbbr, posClass, posRank, teamCode } from "../lib/format";

type Props = {
  picks: DraftPick[];
  franchises: Franchise[];
  myTeam: string;
  currentOverall: number | null;
  justPickedId: string | null;
};

export function DraftBoard({
  picks,
  franchises,
  myTeam,
  currentOverall,
  justPickedId,
}: Props) {
  const byId = new Map(franchises.map((f) => [f.id, f]));
  const rounds = Array.from(new Set(picks.map((p) => p.round))).sort((a, b) => a - b);

  return (
    <section className="min-w-0 rounded-lg border border-line bg-panel">
      <div className="border-b border-line px-4 py-2">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-mute">Draft board</h2>
      </div>
      <div className="space-y-4 overflow-auto p-3">
        {rounds.map((round) => {
          const row = picks.filter((p) => p.round === round).sort((a, b) => a.pick - b.pick);
          return (
            <div key={round}>
              <p className="mb-1.5 text-[11px] font-semibold tracking-[0.16em] text-mute">
                ROUND {String(round).padStart(2, "0")}
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {row.map((pick) => {
                  const team = byId.get(pick.franchiseId);
                  const isCurrent = currentOverall === pick.overall;
                  const isMine = myTeam !== "" && pick.franchiseId === myTeam;
                  const flash = pick.playerId && pick.playerId === justPickedId;
                  return (
                    <div
                      key={pick.overall}
                      className={`min-h-[76px] rounded border px-2 py-1.5 ${
                        isCurrent
                          ? "border-gold bg-[#2a240e]"
                          : isMine
                            ? "border-[#3d5346] bg-panel-2"
                            : "border-line bg-[#0f1613]"
                      } ${flash ? "cell-flash" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-1 text-[10px] text-mute">
                        <span>
                          {pick.round}.{String(pick.pick).padStart(2, "0")}
                        </span>
                        <span className="truncate">{teamCode(pick.franchiseId, team?.abbrev)}</span>
                      </div>
                      {pick.player ? (
                        <div className="mt-1">
                          <p className="truncate text-[13px] font-semibold leading-tight">
                            {pick.player.lastName || pick.player.name}
                          </p>
                          <p className="truncate text-[11px] text-mute">
                            {pick.player.firstName}
                          </p>
                          <span
                            className={`${posClass(pick.player.position)} mt-1 inline-block rounded px-1 py-px text-[10px] font-semibold`}
                          >
                            {posRank(pick.player.position, pick.player.adpPosRank) || pick.player.position}{" "}
                            {nflAbbr(pick.player.nflTeam)}
                            {pick.player.isRookie ? " RK" : ""}
                          </span>
                        </div>
                      ) : (
                        <p className={`mt-3 text-xs ${isCurrent ? "text-gold" : "text-mute"}`}>
                          {isCurrent ? "On the clock" : "—"}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
