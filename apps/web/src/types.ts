export type UserRole = 'Admin' | 'Organizador' | 'Capitán' | 'Jugador';

export interface User {
  id: string;
  authUserId?: string | null;
  gameProfiles?: Record<string, string>;
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
  lastname?: string;
  nickname?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'admin' | 'organizer' | 'captain' | 'player';
  roleLabel: UserRole;
  status: 'ACTIVE' | 'OFFLINE' | 'SUSPENDED';
}

export interface OrganizerRequest {
  id: string;
  userId: string;
  organizationName: string;
  description: string;
  logoUrl: string | null;
  socialLinks: Record<string, string>;
  credentialReference: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
  createdAt: string;
  applicant: AuthUser;
}

export interface AnalyticsOverview {
  generatedAt: string;
  metrics: { tournaments: number; activeTournaments: number; teams: number; matches: number; completedMatches: number; liveMatches: number; completionRate: number; totalPrizeUSD: number };
  ranking: Array<{ id: string; team: string; region: string; played: number; wins: number; losses: number; draws: number; rate: number; points: number }>;
  playerRanking: Array<{ id: string; player: string; teamId: string | null; team: string; role: string; played: number; wins: number; losses: number; winRate: number; rating: number }>;
  recentMatches: TournamentMatch[];
}

export interface CompetitiveEvent {
  id: string;
  category: 'esports' | 'sports';
  sport: string;
  competition: string;
  region: string;
  status: MatchStatus;
  startsAt: string;
  teamA: { id: string; name: string; shortName: string; score: number };
  teamB: { id: string; name: string; shortName: string; score: number };
  round: string;
  venue: string;
  source: string;
  dataMode: 'api' | 'platform';
}

export interface CompetitiveStanding {
  id: string;
  competition: string;
  category: 'esports' | 'sports';
  sport: string;
  region: string;
  source: string;
  dataMode: 'api' | 'platform';
  table: Array<{ position: number; teamId: string; team: string; played: number; wins: number; draws: number; losses: number; points: number; form: string[] }>;
}

export interface CompetitiveTeam {
  id: string;
  name: string;
  shortName: string;
  category: 'esports' | 'sports';
  sport: string;
  region: string;
  country: string;
  logo: string;
  rank: number;
  form: string[];
  players: Array<{ id: string; name: string; nickname: string; role: string; nationality: string; image: string }>;
  source: string;
  dataMode: 'api' | 'platform';
}

export interface CompetitiveOverview {
  generatedAt: string;
  integration: { esports: string; football: string };
  events: CompetitiveEvent[];
  standings: CompetitiveStanding[];
  teams: CompetitiveTeam[];
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
  authUserId?: string | null;
  gameProfiles?: Record<string, string>;
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

export type TournamentStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'UPCOMING';
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
  entryFee?: number;
  entryCurrency?: string;
  status: TournamentStatus;
  format: TournamentFormat;
  dates: string;
  registeredTeams: number;
  maxTeams: number;
  privacy: 'PUBLIC' | 'PRIVATE';
  organizer: string;
  createdBy?: string | null;
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
  captainUserId?: string | null;
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

export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled';

export interface TournamentMatch {
  id: string;
  scheduleId: string | null;
  tournamentId: string;
  roundId: string | null;
  team1Id: string;
  team2Id: string;
  scheduledAt: string;
  venue: string | null;
  mode: 'best_of_1' | 'best_of_3' | 'best_of_5';
  status: MatchStatus;
  score: { team1: number; team2: number };
  streamUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatchWorkflow {
  matchId: string;
  match: TournamentMatch;
  checkIns: Array<{ id: string; teamId: string; captainUserId: string; status: 'CONFIRMED'; checkedInAt: string }>;
  reports: Array<{ id: string; submittedBy: string; submittedForTeamId: string; team1Score: number; team2Score: number; evidenceUrl: string; comparisonStatus?: 'WAITING_OPPONENT' | 'MATCHED' | 'CONFLICT'; status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'; reviewNote?: string | null; createdAt: string }>;
  disputes: Array<{ id: string; openedBy: string; teamId: string | null; reason: string; evidenceUrl?: string | null; status: 'OPEN' | 'RESOLVED'; resolution?: string | null; createdAt: string }>;
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
  name?: string;
  team1?: string;
  team2?: string;
  players?: number;
  maxPlayers?: number;
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
  gateway: 'STRIPE';
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
