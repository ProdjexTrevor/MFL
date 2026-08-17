const NFL: Record<string, string> = {
  TBB: "TB",
  NEP: "NE",
  GBP: "GB",
  NOS: "NO",
  KCC: "KC",
  LVR: "LV",
  SFO: "SF",
  JAC: "JAX",
};

export function nflAbbr(team: string): string {
  if (!team || team === "FA") return "FA";
  return NFL[team] ?? team;
}

export function posClass(pos: string): string {
  switch (pos) {
    case "QB":
      return "pos-qb";
    case "RB":
      return "pos-rb";
    case "WR":
      return "pos-wr";
    case "TE":
      return "pos-te";
    default:
      return "pos-other";
  }
}

export const POSITIONS = ["QB", "RB", "WR", "TE"] as const;

export type Position = (typeof POSITIONS)[number];

const TEAM_LABEL: Record<string, string> = {
  "0001": "Weasels",
  "0002": "Vince",
  "0003": "Pink Pony",
  "0004": "AH",
  "0005": "El Jefe",
  "0006": "BC",
  "0007": "Canadians",
  "0008": "Hayseeds",
  "0009": "Paul's",
  "0010": "VAN",
};

const TEAM_CODE: Record<string, string> = {
  "0001": "WEA",
  "0002": "VIN",
  "0003": "PNK",
  "0004": "AH",
  "0005": "JEF",
  "0006": "BC",
  "0007": "CAN",
  "0008": "HAY",
  "0009": "PAU",
  "0010": "VAN",
};

export function teamLabel(id: string, fallback?: string): string {
  return TEAM_LABEL[id] ?? fallback ?? id;
}

export function teamCode(id: string, fallback?: string): string {
  return TEAM_CODE[id] ?? fallback ?? id;
}
