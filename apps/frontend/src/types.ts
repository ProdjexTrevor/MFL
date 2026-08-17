export type Player = {
  id: string;
  name: string;
  lastName: string;
  firstName: string;
  position: string;
  nflTeam: string;
  adpRank?: number;
  adp?: number;
};

export type Franchise = {
  id: string;
  name: string;
  abbrev: string;
  division?: string;
};

export type League = {
  id: string;
  name: string;
  year: string;
  host: string;
  rosterSize: number;
  draftKind: string;
  draftType: string;
  franchises: Franchise[];
};

export type DraftPick = {
  round: number;
  pick: number;
  overall: number;
  franchiseId: string;
  playerId: string | null;
  comments: string;
  timestamp: string;
  player: Player | null;
};

export type RosterPlayer = Player & { status: string };

export type Bootstrap = {
  league: League;
  players: Player[];
};

export type Live = {
  fetchedAt: string;
  draftType: string;
  round1Order: string[];
  picks: DraftPick[];
  currentPick: DraftPick | null;
  picksMade: number;
  picksTotal: number;
  rosters: Record<string, RosterPlayer[]>;
};
