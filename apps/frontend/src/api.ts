import axios from "axios";
import type { Bootstrap, Live, PlayerCard } from "./types";

export const api = axios.create({ baseURL: "/api" });

function errorText(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: unknown } | string | undefined;
    if (typeof body === "string" && body.trim()) return body.slice(0, 180);
    const raw = body && typeof body === "object" ? body.error : undefined;
    if (typeof raw === "string" && raw !== "[object Object]") return raw;
    if (raw && typeof raw === "object") {
      const message = (raw as { message?: unknown; $t?: unknown }).message ?? (raw as { $t?: unknown }).$t;
      if (typeof message === "string") return message;
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Request failed";
}

function unwrap(err: unknown): never {
  throw new Error(errorText(err));
}

export async function getBootstrap(): Promise<Bootstrap> {
  try {
    const { data } = await api.get<Bootstrap>("/bootstrap");
    return data;
  } catch (err) {
    unwrap(err);
  }
}

export async function getLive(): Promise<Live> {
  try {
    const { data } = await api.get<Live>("/live");
    return data;
  } catch (err) {
    unwrap(err);
  }
}

export async function getStars(): Promise<string[] | null> {
  try {
    const { data } = await api.get<{ playerIds: string[] }>("/stars");
    return data.playerIds ?? [];
  } catch {
    return null;
  }
}

export async function setStar(playerId: string, starred: boolean): Promise<string[] | null> {
  try {
    const { data } = await api.post<{ playerIds: string[] }>("/stars", { playerId, starred });
    return data.playerIds ?? [];
  } catch {
    return null;
  }
}

export async function replaceStars(playerIds: string[]): Promise<string[] | null> {
  try {
    const { data } = await api.put<{ playerIds: string[] }>("/stars", { playerIds });
    return data.playerIds ?? [];
  } catch {
    return null;
  }
}

export async function getSettings(): Promise<{ myFranchiseId: string } | null> {
  try {
    const { data } = await api.get<{ myFranchiseId: string }>("/settings");
    return data;
  } catch {
    return null;
  }
}

export async function saveSettings(myFranchiseId: string): Promise<void> {
  await api.put("/settings", { myFranchiseId });
}

export async function getPlayerCard(playerId: string): Promise<PlayerCard> {
  try {
    const { data } = await api.get<PlayerCard>(`/player`, { params: { id: playerId } });
    return data;
  } catch (err) {
    unwrap(err);
  }
}
