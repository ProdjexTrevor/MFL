import { useState } from "react";
import type { Player } from "./types";
import { Header } from "./components/Header";
import { DraftBoard } from "./components/DraftBoard";
import { AvailablePlayers } from "./components/AvailablePlayers";
import { TeamPanel } from "./components/TeamPanel";
import { MyRosterBar } from "./components/MyRosterBar";
import { PlayerSheet } from "./components/PlayerSheet";
import { useDraftData } from "./hooks/useDraftData";

const ROSTER_DOCK_KEY = "obl-roster-dock";

export default function App() {
  const { bootstrap, live, loading, error, myTeam, setMyTeam, available, playerById, justPickedId } =
    useDraftData();
  const [selected, setSelected] = useState<Player | null>(null);
  const [rosterDock, setRosterDock] = useState<"side" | "bottom">(() =>
    localStorage.getItem(ROSTER_DOCK_KEY) === "bottom" ? "bottom" : "side",
  );

  function onRosterDock(dock: "side" | "bottom") {
    setRosterDock(dock);
    localStorage.setItem(ROSTER_DOCK_KEY, dock);
  }

  const openPlayer = (id: string) => {
    const next = playerById.get(id);
    if (next) setSelected(next);
  };

  if (loading && !bootstrap) {
    return (
      <div className="grid h-full place-items-center text-mute">
        Loading Old Bar League from MFL…
      </div>
    );
  }

  if (error && !bootstrap) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">Could not reach the draft API</p>
          <p className="mt-2 text-sm text-mute">{error}</p>
          {(error.includes("Network Error") || error.includes("ECONNREFUSED")) && (
            <p className="mt-4 text-sm text-mute">
              Start both apps from the repo root with <code className="text-gold">pnpm dev</code>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!bootstrap) return null;

  const current = live?.currentPick ?? null;
  const upcoming = live?.picks.filter((p) => !p.playerId) ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header
        league={bootstrap.league}
        myTeam={myTeam}
        onMyTeam={setMyTeam}
        rosterDock={rosterDock}
        onRosterDock={onRosterDock}
        current={current}
        picksMade={live?.picksMade ?? 0}
        picksTotal={live?.picksTotal ?? 40}
        fetchedAt={live?.fetchedAt}
      />
      {error && (
        <div className="border-b border-[#5a3210] bg-[#2a1c0e] px-5 py-1.5 text-xs text-gold">
          Live update issue: {error}
        </div>
      )}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-3 min-[800px]:grid-cols-[260px_minmax(0,1fr)_280px] min-[800px]:overflow-hidden">
        <AvailablePlayers players={available} onSelect={setSelected} />
        <DraftBoard
          picks={live?.picks ?? []}
          franchises={bootstrap.league.franchises}
          myTeam={myTeam}
          currentOverall={current?.overall ?? null}
          justPickedId={justPickedId}
          onSelect={setSelected}
        />
        <TeamPanel
          franchises={bootstrap.league.franchises}
          rosters={live?.rosters ?? {}}
          myTeam={myTeam}
          current={current}
          upcoming={upcoming}
          hideMyRoster={rosterDock === "bottom"}
          onExpandRoster={() => onRosterDock("bottom")}
          onSelectPlayer={openPlayer}
        />
      </main>
      {rosterDock === "bottom" && myTeam && (
        <MyRosterBar
          franchise={bootstrap.league.franchises.find((team) => team.id === myTeam)}
          roster={live?.rosters[myTeam] ?? []}
          onSelectPlayer={openPlayer}
          onDockSide={() => onRosterDock("side")}
        />
      )}
      {selected && <PlayerSheet player={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
