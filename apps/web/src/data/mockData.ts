import { User, Tournament, Team, MatchScoreboard, ServerLobby, Venue, DevModuleSpec } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Alex Chen',
    username: '@xX_Slayer_Xx',
    email: 'alex.chen@luminex.gg',
    role: 'Capitán',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
    teamId: 'team-lnx',
    teamName: 'Neon Dragons',
    status: 'ACTIVE',
    lastActivity: '2 mins ago',
    ratingOVR: 94,
    position: 'Capitán / IGL'
  },
  {
    id: 'usr-2',
    name: 'Sarah Jenkins',
    username: '@sarahJ_pro',
    email: 'sarah.j@luminex.gg',
    role: 'Jugador',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    teamId: 'team-lnx',
    teamName: 'Neon Dragons',
    status: 'OFFLINE',
    lastActivity: '3 hours ago',
    ratingOVR: 91,
    position: 'Entry Fragger'
  },
  {
    id: 'usr-3',
    name: 'Michael Ross',
    username: '@mike_R_89',
    email: 'michael.ross@freeagent.io',
    role: 'Jugador',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'SUSPENDED',
    lastActivity: '2 days ago',
    ratingOVR: 78,
    position: 'Substitute'
  },
  {
    id: 'usr-4',
    name: 'Carlos Mendoza',
    username: '@cmendoza_org',
    email: 'carlos@tournamentx.gg',
    role: 'Organizador',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    lastActivity: '1 min ago',
    ratingOVR: 99
  },
  {
    id: 'usr-5',
    name: 'Elena Rostova',
    username: '@admin_elena',
    email: 'admin@tournamentx.gg',
    role: 'Admin',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    status: 'ACTIVE',
    lastActivity: 'Just now',
    ratingOVR: 99
  },
  {
    id: 'usr-6',
    name: 'David Silva',
    username: '@nova_zero',
    email: 'david@teamnova.gg',
    role: 'Capitán',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    teamId: 'team-nova',
    teamName: 'Team Nova',
    status: 'ACTIVE',
    lastActivity: 'In Match',
    ratingOVR: 96,
    position: 'Duelist / IGL'
  },
  {
    id: 'usr-7',
    name: 'Mateo Morales',
    username: '@raven_shadow',
    email: 'mateo@teamraven.gg',
    role: 'Capitán',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    teamId: 'team-raven',
    teamName: 'Team Raven',
    status: 'ACTIVE',
    lastActivity: 'In Match',
    ratingOVR: 93,
    position: 'Initiator'
  }
];

export const MOCK_TEAMS: Team[] = [
  {
    id: 'team-lnx',
    name: 'LUMINEX ESPORTS',
    tag: 'LNX',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    tier: 'PRO TIER',
    globalRank: 4,
    winRate: 68.5,
    matchesPlayed: 142,
    record: { wins: 97, losses: 40, ties: 5 },
    points: 2750,
    trend: 'UP',
    region: 'LATAM Sur',
    bio: 'Equipo profesional de competición centrado en tácticas de alta precisión. Actuales campeones de la liga regional de invierno.',
    roster: [
      {
        id: 'p-1',
        playerId: 'p-1',
        name: 'Alex Chen',
        nickname: 'Alex "Viper" Chen',
        role: 'CAPITÁN / IGL',
        ovr: 94,
        avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
        kda: '1.42 K/D',
        status: 'active'
      },
      {
        id: 'p-2',
        playerId: 'p-2',
        name: 'Sarah Jenkins',
        nickname: 'Sarah "Nova" K.',
        role: 'ENTRY FRAGGER',
        ovr: 91,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        kda: '1.28 K/D',
        status: 'active'
      },
      {
        id: 'p-3',
        playerId: 'p-3',
        name: 'Lucas Ferreira',
        nickname: 'Lucas "Phantom" F.',
        role: 'SNIPER / CONTROLLER',
        ovr: 89,
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
        kda: '1.15 K/D',
        status: 'active'
      },
      {
        id: 'p-4',
        playerId: 'p-4',
        name: 'Gabriel Rios',
        nickname: 'Gabriel "Striker" R.',
        role: 'RECON / SUPPORT',
        ovr: 88,
        avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
        kda: '1.09 K/D',
        status: 'active'
      }
    ]
  },
  {
    id: 'team-titans',
    name: 'Titans',
    tag: 'TTN',
    logo: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80',
    tier: 'PRO CIRCUIT',
    globalRank: 1,
    winRate: 92.3,
    matchesPlayed: 26,
    record: { wins: 24, losses: 2, ties: 0 },
    points: 3450,
    trend: 'UP',
    region: 'LATAM Norte',
    bio: 'Penta-campeones continentales. Líderes del ranking regional.',
    roster: []
  },
  {
    id: 'team-omega',
    name: 'Omega',
    tag: 'OMG',
    logo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80',
    tier: 'PRO CIRCUIT',
    globalRank: 2,
    winRate: 80.7,
    matchesPlayed: 26,
    record: { wins: 21, losses: 5, ties: 0 },
    points: 3120,
    trend: 'EQUAL',
    region: 'LATAM',
    bio: 'Especialistas en control de mapas y estrategias de late-game.',
    roster: []
  },
  {
    id: 'team-phoenix',
    name: 'Phoenix',
    tag: 'PHX',
    logo: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80',
    tier: 'PRO CIRCUIT',
    globalRank: 3,
    winRate: 73.0,
    matchesPlayed: 26,
    record: { wins: 19, losses: 7, ties: 0 },
    points: 2890,
    trend: 'UP',
    region: 'LATAM Sur',
    bio: 'Resurgimiento táctico y agresividad extrema en duelos.',
    roster: []
  },
  {
    id: 'team-vanguard',
    name: 'Vanguard',
    tag: 'VGD',
    logo: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80',
    tier: 'CHALLENGER',
    globalRank: 4,
    winRate: 69.2,
    matchesPlayed: 26,
    record: { wins: 18, losses: 8, ties: 0 },
    points: 2750,
    trend: 'DOWN',
    region: 'LATAM',
    bio: 'Escuadra fundada en 2022 con rápido ascenso a playoffs.',
    roster: []
  },
  {
    id: 'team-chimera',
    name: 'Chimera',
    tag: 'CHM',
    logo: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&auto=format&fit=crop&q=80',
    tier: 'CHALLENGER',
    globalRank: 5,
    winRate: 57.6,
    matchesPlayed: 26,
    record: { wins: 15, losses: 11, ties: 0 },
    points: 2100,
    trend: 'EQUAL',
    region: 'LATAM',
    bio: 'Juventud y reflejos mecánicos superiores.',
    roster: []
  },
  {
    id: 'team-nova',
    name: 'Team Nova',
    tag: 'NOVA',
    logo: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80',
    tier: 'PRO CIRCUIT',
    globalRank: 6,
    winRate: 75.0,
    matchesPlayed: 20,
    record: { wins: 15, losses: 5, ties: 0 },
    points: 2400,
    trend: 'UP',
    region: 'LATAM',
    bio: 'Grandes finalistas en Season 5.',
    roster: []
  },
  {
    id: 'team-raven',
    name: 'Team Raven',
    tag: 'RAVEN',
    logo: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200&auto=format&fit=crop&q=80',
    tier: 'PRO CIRCUIT',
    globalRank: 7,
    winRate: 71.0,
    matchesPlayed: 21,
    record: { wins: 15, losses: 6, ties: 0 },
    points: 2350,
    trend: 'DOWN',
    region: 'LATAM',
    bio: 'Titanes tácticos con alto índice de clutch.',
    roster: []
  }
];

export const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: 'tour-1',
    name: 'PRO LEAGUE SEASON 5',
    description: 'El torneo insignia de Valorant en Latinoamérica con los mejores 16 equipos compitiendo por $50,000 USD y pase a la Master Internacional.',
    game: 'Valorant',
    gameCategory: 'FPS',
    banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    prizePool: '$50,000',
    prizeAmountUSD: 50000,
    status: 'IN_PROGRESS',
    format: 'SINGLE_ELIMINATION',
    dates: 'OCT 15 - NOV 2',
    registeredTeams: 16,
    maxTeams: 16,
    privacy: 'PUBLIC',
    organizer: 'TournamentX Pro Staff',
    tier: 'PRO CIRCUIT',
    venue: 'Arena CDMX',
    location: { lat: 19.4978, lng: -99.1757, city: 'Ciudad de México', country: 'México' },
    rounds: [
      {
        id: 1,
        name: 'Cuartos de Final',
        matches: [
          {
            id: 'm-101',
            roundId: 1,
            matchNumber: 1,
            team1: { id: 't-1', name: 'Team Alpha', score: 2, seed: 1 },
            team2: { id: 't-2', name: 'Team Beta', score: 13, seed: 8, winner: true },
            status: 'FINISHED',
            bestOf: 1,
            nextMatchId: 'm-201'
          },
          {
            id: 'm-102',
            roundId: 1,
            matchNumber: 2,
            team1: { id: 't-3', name: 'Gamma Gaming', score: 7, seed: 4 },
            team2: { id: 't-4', name: 'Delta Force', score: 13, seed: 5, winner: true },
            status: 'FINISHED',
            bestOf: 1,
            nextMatchId: 'm-201'
          },
          {
            id: 'm-103',
            roundId: 1,
            matchNumber: 3,
            team1: { id: 't-5', name: 'Team Nova', score: 13, seed: 2, winner: true },
            team2: { id: 't-6', name: 'Kraken Esports', score: 10, seed: 7 },
            status: 'FINISHED',
            bestOf: 1,
            nextMatchId: 'm-202'
          },
          {
            id: 'm-104',
            roundId: 1,
            matchNumber: 4,
            team1: { id: 't-7', name: 'Team Raven', score: 13, seed: 3, winner: true },
            team2: { id: 't-8', name: 'ApeX Legion', score: 8, seed: 6 },
            status: 'FINISHED',
            bestOf: 1,
            nextMatchId: 'm-202'
          }
        ]
      },
      {
        id: 2,
        name: 'Semifinales',
        matches: [
          {
            id: 'm-201',
            roundId: 2,
            matchNumber: 1,
            team1: { id: 't-2', name: 'Team Beta', score: 13, seed: 8, winner: true },
            team2: { id: 't-4', name: 'Delta Force', score: 9, seed: 5 },
            status: 'FINISHED',
            bestOf: 3,
            nextMatchId: 'm-301'
          },
          {
            id: 'm-202',
            roundId: 2,
            matchNumber: 2,
            team1: { id: 't-5', name: 'Team Nova', score: 2, seed: 2, winner: true },
            team2: { id: 't-7', name: 'Team Raven', score: 1, seed: 3 },
            status: 'LIVE',
            bestOf: 3,
            nextMatchId: 'm-301'
          }
        ]
      },
      {
        id: 3,
        name: 'Gran Final',
        matches: [
          {
            id: 'm-301',
            roundId: 3,
            matchNumber: 1,
            team1: { id: 't-2', name: 'Team Beta', score: 0 },
            team2: { id: 't-5', name: 'Team Nova', score: 0 },
            status: 'SCHEDULED',
            scheduledTime: 'MAÑANA 18:00',
            bestOf: 5
          }
        ]
      }
    ]
  },
  {
    id: 'tour-2',
    name: 'Global Series: Latam Qualifiers',
    description: 'Clasificatorias abiertas de 64 escuadras con eliminación directa y bolsa en custodia garantizada.',
    game: 'Valorant',
    gameCategory: 'FPS',
    banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80',
    prizePool: '$50,000 USD',
    prizeAmountUSD: 50000,
    status: 'OPEN',
    format: 'SINGLE_ELIMINATION',
    dates: 'NOV 10 - NOV 25',
    registeredTeams: 48,
    maxTeams: 64,
    privacy: 'PUBLIC',
    organizer: 'TournamentX LATAM',
    tier: 'PRO CIRCUIT',
    venue: 'Movistar GameClub Santiago',
    location: { lat: -33.4372, lng: -70.6506, city: 'Santiago', country: 'Chile' }
  },
  {
    id: 'tour-3',
    name: 'Night City Brawl - Season 4',
    description: 'Torneo 1v1 y 2v2 competitivo con acumulación de puntos Challenger y ranking regional.',
    game: 'Street Fighter 6',
    gameCategory: 'FIGHTING',
    banner: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
    prizePool: '1,500 Pts + $10,000',
    prizeAmountUSD: 10000,
    status: 'IN_PROGRESS',
    format: 'DOUBLE_ELIMINATION',
    dates: 'OCT 20 - NOV 5',
    registeredTeams: 256,
    maxTeams: 256,
    privacy: 'PUBLIC',
    organizer: 'Fighting Game Community LATAM',
    tier: 'CHALLENGER',
    venue: 'Geek Lounge Arena',
    location: { lat: -34.6037, lng: -58.3816, city: 'Buenos Aires', country: 'Argentina' }
  },
  {
    id: 'tour-4',
    name: 'VALORANT MASTERS SERIES',
    description: 'Enfrentamientos de 5v5 con el más alto nivel técnico y transmisión multicanal.',
    game: 'Valorant',
    gameCategory: 'FPS',
    banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    prizePool: '$50,000',
    prizeAmountUSD: 50000,
    status: 'OPEN',
    format: 'SINGLE_ELIMINATION',
    dates: 'OCT 15 - NOV 2',
    registeredTeams: 12,
    maxTeams: 16,
    privacy: 'PUBLIC',
    organizer: 'Riot Games Partner Org',
    tier: 'PRO CIRCUIT'
  },
  {
    id: 'tour-5',
    name: 'CITY HOOPS PRO LEAGUE',
    description: 'Torneo de Baloncesto 3x3 y 5x5 urbano con sistema de sedes físicas y marcadores en tiempo real.',
    game: 'Baloncesto',
    gameCategory: 'TRADITIONAL',
    banner: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80',
    prizePool: 'Trofeo + $5,000',
    prizeAmountUSD: 5000,
    status: 'IN_PROGRESS',
    format: 'GROUP_STAGE_PLAYOFFS',
    dates: 'SEP 1 - DEC 15',
    registeredTeams: 20,
    maxTeams: 24,
    privacy: 'PUBLIC',
    organizer: 'Metropolitan Sports League',
    tier: 'COMMUNITY',
    venue: 'Coliseo Deportivo Central',
    location: { lat: 4.7110, lng: -74.0721, city: 'Bogotá', country: 'Colombia' }
  },
  {
    id: 'tour-6',
    name: 'ROCKET LEAGUE ARENA CLASH',
    description: '3v3 Supersonic acrobatic rocket-powered battle-cars tournament with instant replay highlights.',
    game: 'Rocket League',
    gameCategory: 'SPORTS',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    prizePool: '$15,000',
    prizeAmountUSD: 15000,
    status: 'UPCOMING',
    format: 'DOUBLE_ELIMINATION',
    dates: 'NOV 18 - NOV 30',
    registeredTeams: 32,
    maxTeams: 32,
    privacy: 'PUBLIC',
    organizer: 'Epic Esports LATAM',
    tier: 'CHALLENGER'
  }
];

export const MOCK_LIVE_MATCH: MatchScoreboard = {
  id: 'live-grand-finals-1',
  tournamentName: 'PRO LEAGUE SEASON 5',
  stage: 'Grand Finals',
  map: 'Map 3 - Neon Arcade: Sector 7',
  bestOf: 'BO5',
  team1: {
    name: 'TEAM NOVA',
    seed: 1,
    score: 2,
    logo: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=100&auto=format&fit=crop&q=80',
    players: [
      { name: 'Nova.Zero', kda: '15/4/8', kills: 15, deaths: 4, assists: 8 },
      { name: 'Nova.Apex', kda: '12/6/10', kills: 12, deaths: 6, assists: 10 },
      { name: 'Nova.Vortex', kda: '9/7/5', kills: 9, deaths: 7, assists: 5 },
      { name: 'Nova.Pulse', kda: '8/5/12', kills: 8, deaths: 5, assists: 12 },
      { name: 'Nova.Echo', kda: '7/8/6', kills: 7, deaths: 8, assists: 6 }
    ]
  },
  team2: {
    name: 'TEAM RAVEN',
    seed: 3,
    score: 1,
    logo: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=100&auto=format&fit=crop&q=80',
    players: [
      { name: 'Raven.Shadow', kda: '8/10/4', kills: 8, deaths: 10, assists: 4 },
      { name: 'Raven.Night', kda: '14/8/5', kills: 14, deaths: 8, assists: 5 },
      { name: 'Raven.Claw', kda: '6/12/3', kills: 6, deaths: 12, assists: 3 },
      { name: 'Raven.Viper', kda: '7/9/7', kills: 7, deaths: 9, assists: 7 },
      { name: 'Raven.Kage', kda: '5/11/4', kills: 5, deaths: 11, assists: 4 }
    ]
  },
  timeElapsed: '45:12',
  viewers: '145.8K',
  killFeed: [
    { id: 'kf-1', killer: 'Nova.Zero', weapon: 'Vandal', iconType: 'sword', victim: 'Raven.Shadow', time: '44:50' },
    { id: 'kf-2', killer: 'Nova.Apex', weapon: 'Operator', iconType: 'crosshair', victim: 'Raven.Claw', time: '44:58' },
    { id: 'kf-3', killer: 'Raven.Night', weapon: 'Phantom', iconType: 'gear', victim: 'Nova.Zero', time: '45:05' },
    { id: 'kf-4', killer: 'Nova.Apex', weapon: 'Sheriff', iconType: 'sword', victim: 'Raven.Viper', time: '45:10' }
  ]
};

export const MOCK_SERVER_LOBBIES: ServerLobby[] = [
  {
    id: '#VLR-892A',
    game: 'Valorant',
    server: 'US-East (Virginia)',
    map: 'Ascent',
    teams: 'Sentinels vs C9',
    status: 'In Game',
    ping: 24,
    playersCount: '10/10'
  },
  {
    id: '#LOL-441B',
    game: 'League of Legends',
    server: 'EU-West (Frankfurt)',
    map: "Summoner's Rift",
    teams: 'G2 vs FNC',
    status: 'Waiting',
    ping: 32,
    playersCount: '9/10'
  },
  {
    id: '#RL-990C',
    game: 'Rocket League',
    server: 'US-West (Oregon)',
    map: 'DFH Stadium',
    teams: 'NRG vs SSG',
    status: 'Paused',
    ping: 18,
    playersCount: '6/6'
  },
  {
    id: '#CS2-773D',
    game: 'Counter-Strike 2',
    server: 'SA-East (São Paulo)',
    map: 'de_inferno',
    teams: 'FURIA vs MIBR',
    status: 'In Game',
    ping: 12,
    playersCount: '10/10'
  },
  {
    id: '#SF6-112E',
    game: 'Street Fighter 6',
    server: 'LATAM-North (Mexico)',
    map: 'Metro City Downtown',
    teams: 'MenaRD vs EndingWalker',
    status: 'In Game',
    ping: 19,
    playersCount: '2/2'
  }
];

export const MOCK_VENUES: Venue[] = [
  {
    id: 'ven-1',
    name: 'Arena CDMX Esports Dome',
    city: 'Ciudad de México',
    country: 'México',
    address: 'Av. de las Granjas 800, Santa Barbara, Azcapotzalco',
    coordinates: [19.4978, -99.1757],
    capacity: 22000,
    image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&auto=format&fit=crop&q=80',
    activeEventsCount: 3,
    features: ['Fibra 10Gbps Simétrica', 'Stage 360° LED', '120 PCs High-End', 'Zona VIP Broadcast']
  },
  {
    id: 'ven-2',
    name: 'Movistar GameClub Santiago',
    city: 'Santiago',
    country: 'Chile',
    address: 'Mallplaza Vespucio, Av. Vicuña Mackenna 7110, La Florida',
    coordinates: [-33.5186, -70.5986],
    capacity: 850,
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
    activeEventsCount: 2,
    features: ['Cabinas acústicas Pro', 'Stream Pods 4K', 'Servidores LAN dedicados']
  },
  {
    id: 'ven-3',
    name: 'Geek Lounge & Arena BA',
    city: 'Buenos Aires',
    country: 'Argentina',
    address: 'Av. Corrientes 3247, Abasto, CABA',
    coordinates: [-34.6037, -58.4116],
    capacity: 1200,
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    activeEventsCount: 4,
    features: ['Stage Fighting Games', 'Tribunas Gaming', 'Pagos con Stripe']
  },
  {
    id: 'ven-4',
    name: 'Coliseo Medplus Gaming Arena',
    city: 'Bogotá',
    country: 'Colombia',
    address: 'Calle 80 Km 1.5 vía Cota, Cundinamarca',
    coordinates: [4.7350, -74.1200],
    capacity: 14000,
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    activeEventsCount: 1,
    features: ['Pantalla Central 4K', 'Estacionamiento 3000 veh.', 'Audio Inmersivo Dolby']
  },
  {
    id: 'ven-5',
    name: 'Espacio Gamer Lima',
    city: 'Lima',
    country: 'Perú',
    address: 'Av. Javier Prado Este 4200, Surco',
    coordinates: [-12.0864, -76.9748],
    capacity: 600,
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    activeEventsCount: 2,
    features: ['Lounge de Casters', 'Monitores 360Hz', 'Red Privada Baja Latencia']
  }
];

export const DEV_MODULES: DevModuleSpec[] = [
  {
    devNumber: 1,
    title: 'Core & Autenticación',
    scope: 'Gestión de Usuarios, Roles (Admin, Organizador, Árbitro, Capitán, Jugador y Espectador), DB Schema inicial y API Gateway/Router.',
    techStack: ['Node.js', 'Express', 'JWT (jsonwebtoken)', 'bcryptjs', 'Zod', 'MySQL (mysql2)'],
    completed: true,
    endpoints: [
      { method: 'POST', path: '/api/v1/auth/login', description: 'Autenticación con email/password y generación de JWT con claims de rol.', zodSchema: 'z.object({ email: z.string().email(), password: z.string().min(6) })' },
      { method: 'POST', path: '/api/v1/auth/register', description: 'Registro de usuario y asignación de rol inicial.', zodSchema: 'z.object({ name: z.string(), username: z.string(), email: z.string().email(), password: z.string(), role: z.enum(["Admin","Organizador","Árbitro","Capitán","Jugador","Espectador"]) })' },
      { method: 'GET', path: '/api/v1/users/me', description: 'Validación de token y extracción de perfil y permisos del usuario activo.' }
    ]
  },
  {
    devNumber: 2,
    title: 'Motor de Torneos & Brackets',
    scope: 'Lógica de creación de torneos, algoritmos de brackets (fase de grupos y eliminación directa) y avance de rondas.',
    techStack: ['Node.js', 'Express', 'Zod', 'Algoritmos de Siembra (Seeding)', 'Recursión de Brackets'],
    completed: true,
    endpoints: [
      { method: 'POST', path: '/api/v1/tournaments', description: 'Creación de torneo con formato y configuración de llaves.', zodSchema: 'z.object({ name: z.string(), game: z.string(), format: z.enum(["SINGLE_ELIMINATION","DOUBLE_ELIMINATION","GROUP_STAGE"]), maxTeams: z.number().int() })' },
      { method: 'GET', path: '/api/v1/tournaments/:id/bracket', description: 'Árbol completo de llaves y estado de emparejamientos calculados.' },
      { method: 'POST', path: '/api/v1/tournaments/:id/advance', description: 'Calcula el avance de ganador y actualiza la siguiente ronda automáticamente.' }
    ]
  },
  {
    devNumber: 3,
    title: 'Gestión de Equipos y Jugadores',
    scope: 'Registro de equipos, asignación de plantillas (rosters), perfiles de jugador e historial básico.',
    techStack: ['Express', 'MySQL Relations (1:N, N:M)', 'Zod', 'UUID v4'],
    completed: true,
    endpoints: [
      { method: 'POST', path: '/api/v1/teams', description: 'Registrar nueva escuadra y asignar capitán.', zodSchema: 'z.object({ name: z.string(), tag: z.string().max(5), captainId: z.string().uuid() })' },
      { method: 'POST', path: '/api/v1/teams/:id/roster', description: 'Añadir o remover jugadores del roster oficial.' },
      { method: 'GET', path: '/api/v1/players/:id/stats', description: 'Obtener historial de partidas, K/D y OVR rating.' }
    ]
  },
  {
    devNumber: 4,
    title: 'Calendario & Partidos en Vivo',
    scope: 'Programación automática de partidos, captura de resultados en tiempo real y actualización de marcadores.',
    techStack: ['Socket.IO Protocol', 'Express', 'Zod', 'Event Loop Scheduler'],
    completed: true,
    endpoints: [
      { method: 'GET', path: '/api/v1/matches/live', description: 'Listar partidas en curso con marcadores en vivo.' },
      { method: 'PUT', path: '/api/v1/matches/:id/score', description: 'Actualización en tiempo real de puntuaciones por mapa (BO3/BO5).' },
      { method: 'POST', path: '/api/v1/matches/:id/events', description: 'Emitir evento de kill feed o cambio de estado.' }
    ]
  },
  {
    devNumber: 5,
    title: 'Estadísticas & Dashboard Analítico',
    scope: 'Tablas de posiciones instantáneas, rankings, cálculo de métricas de rendimiento y panel analítico.',
    techStack: ['Express', 'MySQL Aggregate Queries', 'Performance Calculations', 'Zod'],
    completed: true,
    endpoints: [
      { method: 'GET', path: '/api/v1/analytics/dashboard', description: 'Métricas generales: inscripciones activas, partidas jugadas, win rates.' },
      { method: 'GET', path: '/api/v1/rankings/regional', description: 'Tabla de posiciones por región (LATAM Norte/Sur, Global).' }
    ]
  },
  {
    devNumber: 6,
    title: 'Esports & Integración Media',
    scope: 'Integración de streams (Twitch/YouTube API), gestión de lobbies/salas virtuales y métricas por videojuego.',
    techStack: ['Twitch Helix API', 'YouTube Data v3', 'Lobby State Machine', 'Express'],
    completed: true,
    endpoints: [
      { method: 'GET', path: '/api/v1/esports/streams', description: 'Streams en directo asociados al torneo vía Twitch/YouTube API.' },
      { method: 'POST', path: '/api/v1/esports/lobbies', description: 'Creación y monitoreo de servidor dedicado de partida.' }
    ]
  },
  {
    devNumber: 7,
    title: 'Geolocalización & Notificaciones',
    scope: 'Mapa interactivo de sedes (Leaflet/Mapbox API), búsqueda de torneos cercanos y sistema de alertas/notificaciones en tiempo real (WebSockets).',
    techStack: ['Leaflet / OpenStreetMap', 'Haversine Distance Formula', 'WebSocket Events', 'Express'],
    completed: true,
    endpoints: [
      { method: 'GET', path: '/api/v1/venues/nearby', description: 'Búsqueda geoespacial de arenas por radio en km (lat, lng, radius).' },
      { method: 'GET', path: '/api/v1/notifications', description: 'Bandeja de notificaciones en tiempo real para usuarios.' }
    ]
  },
  {
    devNumber: 8,
    title: 'Recompensas & Stripe',
    scope: 'Sistema de patrocinadores, bolsas de premios (Prize Pool), integración de Stripe, escrow lógico y generación de recibos.',
    techStack: ['Express', 'MySQL', 'Stripe Test', 'Zod', 'Swagger'],
    completed: true,
    endpoints: [
      { method: 'POST', path: '/api/prize-pools/:id/contributions', description: 'Crear una aportación con Stripe.', zodSchema: 'z.object({ sponsorId: z.string().uuid(), amount: z.number().positive(), provider: z.literal("stripe") })' },
      { method: 'PATCH', path: '/api/contributions/:id/status', description: 'Capturar, rechazar o reembolsar una aportación Stripe Test.' },
      { method: 'POST', path: '/api/prize-pools/:id/results', description: 'Importar ganadores y preparar sus transferencias.' },
      { method: 'GET', path: '/api/rewards', description: 'Consultar premios físicos, códigos y cupones.' }
    ]
  }
];
