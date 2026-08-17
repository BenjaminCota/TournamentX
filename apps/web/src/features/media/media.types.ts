export interface MediaStream {
  id: string;
  eventId: string | null;
  platform: 'Twitch' | 'YouTube';
  title: string;
  channel: string;
  embedId: string;
  mediaKind: 'live' | 'video';
  game: string;
  viewers: number;
  live: boolean;
  thumbnail: string;
  url: string;
  source: 'twitch' | 'youtube' | 'demo';
}

export interface LiveEvent {
  id: string;
  category: 'esports' | 'sports';
  sport: string;
  tournament: string;
  stage: string;
  participantA: { name: string; shortName: string; score: number };
  participantB: { name: string; shortName: string; score: number };
  clockLabel: string;
  elapsedSeconds: number;
  context: string;
  viewers: number;
  status: 'LIVE' | 'UPCOMING' | 'FINAL';
  dataMode: 'api' | 'simulated';
  stats: Array<{ label: string; a: string; b: string }>;
}
