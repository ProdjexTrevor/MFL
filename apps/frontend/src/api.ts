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
