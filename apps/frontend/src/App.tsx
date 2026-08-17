import { Header } from "./components/Header";
import { DraftBoard } from "./components/DraftBoard";
import { AvailablePlayers } from "./components/AvailablePlayers";
import { TeamPanel } from "./components/TeamPanel";
import { useDraftData } from "./hooks/useDraftData";

export default function App() {
  const { bootstrap, live, loading, error, myTeam, setMyTeam, available, justPickedId } =
    useDraftData();

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
        <AvailablePlayers players={available} />
        <DraftBoard
          picks={live?.picks ?? []}
          franchises={bootstrap.league.franchises}
          myTeam={myTeam}
          currentOverall={current?.overall ?? null}
          justPickedId={justPickedId}
        />
        <TeamPanel
          franchises={bootstrap.league.franchises}
          rosters={live?.rosters ?? {}}
          myTeam={myTeam}
          current={current}
          upcoming={upcoming}
        />
      </main>
    </div>
  );
}
