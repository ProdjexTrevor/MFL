import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBootstrap, getLive } from "../api";
import type { Bootstrap, Live, Player } from "../types";

const MY_TEAM_KEY = "obl-my-franchise";
const DEFAULT_MY_TEAM = "0001"; // The Shove Weasels

export function useDraftData() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [myTeam, setMyTeamState] = useState(() => {
    const id = localStorage.getItem(MY_TEAM_KEY) || DEFAULT_MY_TEAM;
    localStorage.setItem(MY_TEAM_KEY, id);
    return id;
  });
  const lastPicksMade = useRef(0);
  const [justPickedId, setJustPickedId] = useState<string | null>(null);

  const setMyTeam = useCallback((id: string) => {
    setMyTeamState(id);
    if (id) localStorage.setItem(MY_TEAM_KEY, id);
    else localStorage.removeItem(MY_TEAM_KEY);
  }, []);

  const refreshLive = useCallback(async () => {
    const next = await getLive();
    if (next.picksMade > lastPicksMade.current) {
      const newest = [...next.picks].reverse().find((p) => p.playerId);
      setJustPickedId(newest?.playerId ?? null);
      window.setTimeout(() => setJustPickedId(null), 2500);
    }
    lastPicksMade.current = next.picksMade;
    setLive(next);
    setError(null);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const boot = await getBootstrap();
        if (cancelled) return;
        setBootstrap(boot);
        const liveData = await refreshLive();
        if (cancelled) return;
        lastPicksMade.current = liveData.picksMade;
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load MFL data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshLive]);

  useEffect(() => {
    const id = window.setInterval(() => {
      refreshLive().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Live update failed");
      });
    }, 5000);
    return () => window.clearInterval(id);
  }, [refreshLive]);

  const playerById = useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of bootstrap?.players ?? []) map.set(p.id, p);
    return map;
  }, [bootstrap]);

  const ownedIds = useMemo(() => {
    const set = new Set<string>();
    if (!live) return set;
    for (const roster of Object.values(live.rosters)) {
      for (const p of roster) set.add(p.id);
    }
    for (const pick of live.picks) {
      if (pick.playerId) set.add(pick.playerId);
    }
    return set;
  }, [live]);

  const available = useMemo(() => {
    return (bootstrap?.players ?? [])
      .filter((p) => !ownedIds.has(p.id))
      .sort((a, b) => (a.adpRank ?? 9999) - (b.adpRank ?? 9999));
  }, [bootstrap, ownedIds]);

  return {
    bootstrap,
    live,
    loading,
    error,
    myTeam,
    setMyTeam,
    available,
    playerById,
    justPickedId,
    refreshLive,
  };
}
