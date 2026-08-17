import { useCallback, useEffect, useState } from "react";
import { getStars, replaceStars, setStar } from "../api";

const STORAGE_KEY = "obl-starred-players";

function loadLocal(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as unknown;
    if (!Array.isArray(ids)) return new Set();
    return new Set(ids.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function saveLocal(next: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
}

export function useStarredPlayers() {
  const [starred, setStarred] = useState<Set<string>>(loadLocal);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await getStars();
      if (cancelled || remote == null) return;
      const local = loadLocal();
      if (remote.length === 0 && local.size > 0) {
        const synced = await replaceStars([...local]);
        if (!cancelled && synced) setStarred(new Set(synced));
        return;
      }
      const next = new Set(remote);
      saveLocal(next);
      if (!cancelled) setStarred(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setStarred(next);
    saveLocal(next);
  }, []);

  const toggleStar = useCallback(
    async (id: string) => {
      const starredNext = !starred.has(id);
      const next = new Set(
        starredNext ? [...starred, id] : [...starred].filter((playerId) => playerId !== id),
      );
      persist(next);
      const remote = await setStar(id, starredNext);
      if (remote) persist(new Set(remote));
    },
    [persist, starred],
  );

  return { starred, toggleStar };
}
