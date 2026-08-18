const crypto = require('node:crypto');
const localStore = require('../../config/local-store');

const lobbySeed = [
  { id: 'lobby-valorant-01', name: 'Final LATAM', game: 'Valorant', server: 'LATAM Norte', map: 'Ascent', team1: 'Luminex', team2: 'Titans', status: 'In Game', ping: 32, maxPlayers: 10, players: 10, createdAt: '2026-08-16T00:00:00.000Z' },
  { id: 'lobby-rocket-01', name: 'Copa Comunidad', game: 'Rocket League', server: 'US East', map: 'DFH Stadium', team1: 'Nova', team2: 'Raven', status: 'Waiting', ping: 48, maxPlayers: 6, players: 4, createdAt: '2026-08-16T00:00:00.000Z' },
];
const twitchChannelCatalog = {
  lolesportsla: { title: 'LoL Esports Latinoamérica', game: 'League of Legends', region: 'LATAM', eventId: 'event-lol' },
  cblol: { title: 'CBLOL', game: 'League of Legends', region: 'Brasil', eventId: null },
  valorant_la: { title: 'VALORANT LATAM', game: 'Valorant', region: 'LATAM', eventId: null },
  lcs: { title: 'LCS', game: 'League of Legends', region: 'Norteamérica', eventId: null },
  valorant_americas: { title: 'VALORANT Americas', game: 'Valorant', region: 'Américas', eventId: null },
  lec: { title: 'LEC', game: 'League of Legends', region: 'Europa', eventId: null },
  valorant: { title: 'VALORANT', game: 'Valorant', region: 'Global', eventId: null },
  rocketleague: { title: 'Rocket League Esports', game: 'Rocket League', region: 'Global', eventId: null },
  eslcs: { title: 'ESL Counter-Strike', game: 'Counter-Strike 2', region: 'Europa/Global', eventId: null },
};
const twitchChannels = String(process.env.TWITCH_CHANNELS || process.env.TWITCH_DEMO_CHANNEL || 'lolesportsla,cblol,valorant_la,lcs,valorant_americas,lec,valorant,rocketleague,eslcs').split(',').map((channel) => channel.trim().toLowerCase()).filter(Boolean);
const youtubeVideoId = String(process.env.YOUTUBE_VIDEO_IDS || process.env.YOUTUBE_DEMO_VIDEO_ID || '6VOfpE_HGpw').split(',')[0].trim();
const streamSeed = [
  ...twitchChannels.map((channel) => { const metadata = twitchChannelCatalog[channel] || { title: channel, game: 'Esports', region: 'Internacional', eventId: null }; return { id: `stream-twitch-${channel}`, eventId: metadata.eventId, platform: 'Twitch', title: `${metadata.title} — canal oficial`, channel, embedId: channel, mediaKind: 'live', game: metadata.game, region: metadata.region, viewers: 0, live: false, thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1000&auto=format&fit=crop&q=80', url: `https://www.twitch.tv/${channel}`, source: 'curated' }; }),
  { id: 'stream-youtube-demo', eventId: 'event-lol', platform: 'YouTube', title: 'LYON vs SEN | LCS x LOL ESPORTS LATAM | Bo3', channel: 'LoL Esports Latinoamérica', embedId: youtubeVideoId, mediaKind: 'live', game: 'League of Legends', region: 'LATAM', viewers: 26830, live: true, thumbnail: `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`, url: `https://www.youtube.com/watch?v=${youtubeVideoId}`, source: 'curated' },
];

const eventSeed = [
  { id: 'event-valorant', category: 'esports', sport: 'Valorant', tournament: 'Valorant Champions', stage: 'Final · Mejor de 5', participantA: { name: 'Sentinels', shortName: 'SEN', score: 2 }, participantB: { name: 'Fnatic', shortName: 'FNC', score: 1 }, clockLabel: 'Mapa 4', elapsedSeconds: 1984, context: 'Ascent · Ronda 19', viewers: 18420, status: 'LIVE', dataMode: 'simulated', stats: [{ label: 'Rondas', a: '10', b: '8' }, { label: 'Primera sangre', a: '11', b: '7' }, { label: 'Economía', a: '54.2K', b: '49.8K' }] },
  { id: 'event-lol', category: 'esports', sport: 'League of Legends', tournament: 'LCS x LoL Esports LATAM', stage: 'LYON vs SEN · Mejor de 3', participantA: { name: 'LYON', shortName: 'LYON', score: 0 }, participantB: { name: 'SEN', shortName: 'SEN', score: 0 }, clockLabel: 'En directo', elapsedSeconds: 0, context: 'Señal oficial enlazada · marcador de demostración', viewers: 26830, status: 'LIVE', dataMode: 'simulated', stats: [{ label: 'Kills', a: '—', b: '—' }, { label: 'Torres', a: '—', b: '—' }, { label: 'Oro', a: '—', b: '—' }] },
  { id: 'event-dota', category: 'esports', sport: 'Dota 2', tournament: 'The International', stage: 'Upper bracket · Final', participantA: { name: 'Team Spirit', shortName: 'TS', score: 1 }, participantB: { name: 'Team Liquid', shortName: 'TL', score: 1 }, clockLabel: 'Partida 3', elapsedSeconds: 2541, context: 'Radiant vs Dire', viewers: 14205, status: 'LIVE', dataMode: 'simulated', stats: [{ label: 'Kills', a: '28', b: '31' }, { label: 'Torres', a: '6', b: '7' }, { label: 'Net worth', a: '82K', b: '86K' }] },
  { id: 'event-ucl', category: 'sports', sport: 'Fútbol', tournament: 'UEFA Champions League', stage: 'Cuartos de final · Vuelta', participantA: { name: 'Real Madrid', shortName: 'RMA', score: 2 }, participantB: { name: 'Manchester City', shortName: 'MCI', score: 1 }, clockLabel: '2º tiempo', elapsedSeconds: 4380, context: 'Santiago Bernabéu', viewers: 95240, status: 'LIVE', dataMode: 'simulated', stats: [{ label: 'Posesión', a: '47%', b: '53%' }, { label: 'Tiros', a: '12', b: '10' }, { label: 'Córners', a: '4', b: '5' }] },
  { id: 'event-nba', category: 'sports', sport: 'Baloncesto', tournament: 'NBA Finals', stage: 'Juego 6', participantA: { name: 'Boston Celtics', shortName: 'BOS', score: 94 }, participantB: { name: 'Los Angeles Lakers', shortName: 'LAL', score: 91 }, clockLabel: '4º cuarto', elapsedSeconds: 2580, context: '03:00 en el reloj', viewers: 71280, status: 'LIVE', dataMode: 'simulated', stats: [{ label: 'FG', a: '48%', b: '46%' }, { label: 'Triples', a: '13', b: '11' }, { label: 'Rebotes', a: '39', b: '36' }] },
  { id: 'event-ufc', category: 'sports', sport: 'MMA', tournament: 'UFC Main Event', stage: 'Peso ligero · 5 asaltos', participantA: { name: 'Mateo Silva', shortName: 'SIL', score: 2 }, participantB: { name: 'Alex Carter', shortName: 'CAR', score: 1 }, clockLabel: 'Asalto 4', elapsedSeconds: 1082, context: '02:58 restantes', viewers: 48610, status: 'LIVE', dataMode: 'simulated', stats: [{ label: 'Golpes sig.', a: '84', b: '71' }, { label: 'Derribos', a: '3', b: '1' }, { label: 'Control', a: '4:18', b: '1:46' }] },
];

function lobbies() { return localStore.collection('mediaLobbies', lobbySeed); }
function streams() { return localStore.collection('mediaStreams', streamSeed); }
function listLobbies(filters = {}) { return lobbies().filter((item) => !filters.game || item.game.toLowerCase() === filters.game.toLowerCase()).filter((item) => !filters.status || item.status === filters.status); }
function createLobby(input) { const list = lobbies(); const lobby = { id: crypto.randomUUID(), ...input, players: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; list.push(lobby); localStore.saveCollection('mediaLobbies', list); return lobby; }
function updateLobby(id, updates) { const list = lobbies(); const lobby = list.find((item) => item.id === id); if (!lobby) return null; Object.assign(lobby, updates, { updatedAt: new Date().toISOString() }); localStore.saveCollection('mediaLobbies', list); return lobby; }
function removeLobby(id) { const list = lobbies(); const index = list.findIndex((item) => item.id === id); if (index < 0) return false; list.splice(index, 1); localStore.saveCollection('mediaLobbies', list); return true; }
function listStreams() {
  const defaults = new Map(streamSeed.map((stream) => [stream.id, stream]));
  const saved = streams().filter((stream) => defaults.has(stream.id)).map((stream) => ({ ...stream, ...defaults.get(stream.id) }));
  return [...saved, ...streamSeed.filter((seed) => !saved.some((stream) => stream.id === seed.id))];
}
function listEvents() { return structuredClone(eventSeed); }
function metrics() {
  const lobbyList = lobbies(); const streamList = listStreams();
  const games = [...new Set([...lobbyList.map((item) => item.game), ...streamList.map((item) => item.game)])];
  return games.map((game) => ({ game, lobbies: lobbyList.filter((item) => item.game === game).length, activePlayers: lobbyList.filter((item) => item.game === game).reduce((sum, item) => sum + Number(item.players || 0), 0), viewers: streamList.filter((item) => item.game === game && item.live).reduce((sum, item) => sum + Number(item.viewers || 0), 0) }));
}
module.exports = { listLobbies, createLobby, updateLobby, removeLobby, listStreams, listEvents, metrics };
