import axios from "axios";
import type { Bootstrap, Live, PlayerCard } from "./types";

export const api = axios.create({ baseURL: "/api" });

function unwrap(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: string } | undefined;
    throw new Error(body?.error || err.message);
  }
  throw err;
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
    const { data } = await api.get<PlayerCard>(`/player/${playerId}`);
    return data;
  } catch (err) {
    unwrap(err);
  }
}
