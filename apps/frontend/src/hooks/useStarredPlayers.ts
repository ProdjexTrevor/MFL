import { useCallback, useState } from "react";

const STORAGE_KEY = "obl-starred-players";

function loadStars(): Set<string> {
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

export function useStarredPlayers() {
  const [starred, setStarred] = useState<Set<string>>(loadStars);

  const persist = useCallback((next: Set<string>) => {
    setStarred(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  }, []);

  const toggleStar = useCallback(
    (id: string) => {
      persist(
        new Set(
          starred.has(id)
            ? [...starred].filter((playerId) => playerId !== id)
            : [...starred, id],
        ),
      );
    },
    [persist, starred],
  );

  return { starred, toggleStar };
}
