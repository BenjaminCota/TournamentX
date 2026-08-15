export type UserRole = 'Admin' | 'Organizador' | 'Árbitro' | 'Capitán' | 'Jugador' | 'Espectador';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  avatar: string;
  teamId?: string;
  teamName?: string;
  status: 'ACTIVE' | 'OFFLINE' | 'SUSPENDED';
  lastActivity: string;
  ratingOVR?: number;
  position?: string;
}

export interface PlayerProfile {
  id: string;
  name: string;
  lastname: string;
  nickname: string;
  avatar: string;
  sport: string;
  position: string;
  nationality: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
  currentTeamId?: string | null;
  currentTeamName?: string | null;
  currentRole?: string | null;
  history?: Array<{
    id: string;
    teamId: string;
    teamName: string;
    role: string;
    status: 'Actual' | 'Finalizado';
    joinedAt: string;
    leftAt?: string | null;
  }>;
}

export interface TeamMember {
  id: string;
  playerId: string;
  name: string;
  nickname: string;
  role: string;
  ovr: number;
  avatar: string;
  kda: string;
  status: 'active' | 'inactive';
}

export type TournamentStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'UPCOMING';
export type TournamentFormat = 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'GROUP_STAGE_PLAYOFFS' | 'ROUND_ROBIN' | 'SWISS';

export interface Tournament {
  id: string;
  name: string;
  description: string;
  game: string;
  gameCategory: 'FPS' | 'MOBA' | 'SPORTS' | 'FIGHTING' | 'BATTLE_ROYALE' | 'TRADITIONAL';
  banner: string;
  prizePool: string;
  prizeAmountUSD: number;
  status: TournamentStatus;
  format: TournamentFormat;
  dates: string;
  registeredTeams: number;
  maxTeams: number;
  privacy: 'PUBLIC' | 'PRIVATE';
  organizer: string;
  tier: 'PRO CIRCUIT' | 'CHALLENGER' | 'OPEN' | 'COMMUNITY';
  venue?: string;
  location?: { lat: number; lng: number; city: string; country: string };
  rounds?: BracketRound[];
}

export interface BracketMatch {
  id: string;
  roundId: number;
  matchNumber: number;
  team1: {
    id: string;
    name: string;
    score: number;
    seed?: number;
    winner?: boolean;
  };
  team2: {
    id: string;
    name: string;
    score: number;
    seed?: number;
    winner?: boolean;
  };
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
  scheduledTime?: string;
  bestOf?: number;
  streamUrl?: string;
  nextMatchId?: string;
}

export interface BracketRound {
  id: number;
  name: string;
  matches: BracketMatch[];
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  abbreviation?: string;
  logo: string;
  tier: string;
  globalRank: number;
  winRate: number;
  matchesPlayed: number;
  record: { wins: number; losses: number; ties: number };
  points: number;
  trend: 'UP' | 'DOWN' | 'EQUAL';
  region: string;
  bio: string;
  description?: string;
  sport?: string;
  competitionType?: string;
  status?: 'active' | 'inactive' | 'draft';
  createdAt?: string;
  updatedAt?: string;
  roster: TeamMember[];
}

export interface MatchScoreboard {
  id: string;
  tournamentName: string;
  stage: string;
  map: string;
  bestOf: string;
  team1: {
    name: string;
    seed: number;
    score: number;
    logo?: string;
    players: { name: string; kda: string; kills: number; deaths: number; assists: number }[];
  };
  team2: {
    name: string;
    seed: number;
    score: number;
    logo?: string;
    players: { name: string; kda: string; kills: number; deaths: number; assists: number }[];
  };
  timeElapsed: string;
  viewers: string;
  killFeed: {
    id: string;
    killer: string;
    weapon: string;
    iconType: 'sword' | 'crosshair' | 'gear' | 'skull';
    victim: string;
    time: string;
  }[];
}

export interface ServerLobby {
  id: string;
  game: string;
  server: string;
  map: string;
  teams: string;
  status: 'In Game' | 'Waiting' | 'Paused';
  ping: number;
  playersCount: string;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  country: string;
  address: string;
  coordinates: [number, number];
  capacity: number;
  image: string;
  activeEventsCount: number;
  features: string[];
}

export interface EscrowTransaction {
  id: string;
  uuid: string;
  tournamentId: string;
  tournamentName: string;
  amountUSD: number;
  gateway: 'STRIPE' | 'BINANCE_PAY';
  status: 'LOCKED' | 'RELEASED' | 'PENDING';
  date: string;
  payer: string;
  recipientTeam?: string;
  txHash?: string;
}

export interface DevModuleSpec {
  devNumber: number;
  title: string;
  scope: string;
  techStack: string[];
  endpoints: { method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; path: string; description: string; zodSchema?: string }[];
  completed: boolean;
}
