import type { DraftPick, Franchise, League } from "../types";

type Props = {
  league: League;
  myTeam: string;
  onMyTeam: (id: string) => void;
  rosterDock: "side" | "bottom";
  onRosterDock: (dock: "side" | "bottom") => void;
  current: DraftPick | null;
  picksMade: number;
  picksTotal: number;
  fetchedAt?: string;
};

export function Header({
  league,
  myTeam,
  onMyTeam,
  rosterDock,
  onRosterDock,
  current,
  picksMade,
  picksTotal,
  fetchedAt,
}: Props) {
  const franchiseName = (id: string) =>
    league.franchises.find((f) => f.id === id)?.name ?? id;

  return (
    <header className="border-b border-line bg-panel px-5 py-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-gold uppercase">
            {league.year} live draft
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{league.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-mute">
            My team
            <select
              className="select-dark ml-2 rounded px-2 py-1.5 text-sm"
              value={myTeam}
              onChange={(e) => onMyTeam(e.target.value)}
            >
              <option value="">Spectator</option>
              {league.franchises.map((f: Franchise) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-mute">
            Roster
            <select
              className="select-dark ml-2 rounded px-2 py-1.5 text-sm"
              value={rosterDock}
              disabled={!myTeam}
              onChange={(e) => onRosterDock(e.target.value === "bottom" ? "bottom" : "side")}
            >
              <option value="side">Side panel</option>
              <option value="bottom">Across bottom</option>
            </select>
          </label>
          <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-live" />
            Polling MFL
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
        <p>
          <span className="text-mute">On the clock </span>
          <span className="text-lg font-semibold text-gold">
            {current
              ? `${franchiseName(current.franchiseId)} · ${current.round}.${String(current.pick).padStart(2, "0")}`
              : picksMade >= picksTotal
                ? "Draft complete"
                : "Board loading"}
          </span>
        </p>
        <p className="text-mute">
          {picksMade}/{picksTotal} picks
        </p>
        {fetchedAt && (
          <p className="text-mute">Updated {new Date(fetchedAt).toLocaleTimeString()}</p>
        )}
      </div>
    </header>
  );
}
