import axios from "axios";
import type { Bootstrap, Live } from "./types";

export const api = axios.create({ baseURL: "/api" });

export async function getBootstrap(): Promise<Bootstrap> {
  const { data } = await api.get<Bootstrap>("/bootstrap");
  return data;
}

export async function getLive(): Promise<Live> {
  const { data } = await api.get<Live>("/live");
  return data;
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
