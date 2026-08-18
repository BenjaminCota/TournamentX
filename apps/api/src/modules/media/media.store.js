const crypto = require('node:crypto');
const localStore = require('../../config/local-store');
const env = require('../../config/env');

const lobbySeed = [
  { id: 'lobby-valorant-01', name: 'Final LATAM', game: 'Valorant', server: 'LATAM Norte', map: 'Ascent', team1: 'Luminex', team2: 'Titans', matchId: 'match-201', status: 'In Game', ping: 32, maxPlayers: 10, players: 10, createdAt: '2026-08-16T00:00:00.000Z' },
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
const twitchChannels = String(process.env.TWITCH_CHANNELS || process.env.TWITCH_DEMO_CHANNEL || 'lolesportsla,cblol,valorant_la,lcs,lec').split(',').map((channel) => channel.trim().toLowerCase()).filter(Boolean).slice(0, 5);
const configuredTwitchVideos = String(process.env.TWITCH_VIDEO_IDS || '').split(',').map((id) => id.trim().replace(/^v/, '')).filter(Boolean);
const youtubeCatalog = [
  { handle: 'lolesportsla', videoId: '6VOfpE_HGpw', title: 'LoL Esports LATAM — archivo oficial', game: 'League of Legends', region: 'LATAM', eventId: 'event-lol' },
  { handle: 'lolesports', videoId: 'hF9DtDcsR_A', title: 'Worlds 2025 — resumen oficial', game: 'League of Legends', region: 'Global', eventId: 'event-lol' },
  { handle: 'ValorantEsports', videoId: 'OgvvgXwo3Pg', title: 'VALORANT Champions Tour — VOD oficial', game: 'Valorant', region: 'Global', eventId: 'event-valorant' },
  { handle: 'ESLCS', videoId: 'UaVW2ag4Y5A', title: 'ESL Pro League — show completo', game: 'Counter-Strike 2', region: 'Europa/Global', eventId: null },
  { handle: 'RocketLeagueEsports', videoId: 'BHILqCnQdGk', title: 'RLCS Major — Championship Sunday', game: 'Rocket League', region: 'Global', eventId: null },
];
const configuredYoutubeIds = String(process.env.YOUTUBE_VIDEO_IDS || '').split(',').map((id) => id.trim()).filter(Boolean);
const streamSeed = [
  ...twitchChannels.map((channel, index) => {
    const metadata = twitchChannelCatalog[channel] || { title: channel, game: 'Esports', region: 'Internacional', eventId: null };
    const recordingId = configuredTwitchVideos[index] || (channel === 'lec' ? '636325127' : channel === 'cblol' ? '8637062' : null);
    return { id: `stream-twitch-${channel}`, eventId: metadata.eventId, platform: 'Twitch', title: `${metadata.title} — ${recordingId ? 'archivo oficial' : 'canal oficial'}`, channel: metadata.title, channelHandle: channel, embedId: recordingId ? `v${recordingId}` : channel, mediaKind: recordingId ? 'video' : 'channel', game: metadata.game, region: metadata.region, viewers: 0, live: false, thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1000&auto=format&fit=crop&q=80', url: recordingId ? `https://www.twitch.tv/videos/${recordingId}` : `https://www.twitch.tv/${channel}`, source: 'curated' };
  }),
  ...youtubeCatalog.map((metadata, index) => {
    const videoId = configuredYoutubeIds[index] || metadata.videoId;
    return ({
    id: `stream-youtube-${metadata.handle.toLowerCase()}`, eventId: metadata.eventId, platform: 'YouTube',
    title: metadata.title, channel: metadata.handle, channelHandle: metadata.handle,
    embedId: videoId, mediaKind: 'video', game: metadata.game, region: metadata.region,
    viewers: 0, live: false, thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${videoId}`, source: 'curated',
  }); }),
];

function lobbies() {
  const list = localStore.collection('mediaLobbies', lobbySeed);
  let changed = false;
  for (const seed of lobbySeed) {
    const existing = list.find((item) => item.id === seed.id);
    if (existing && seed.matchId && !existing.matchId) { existing.matchId = seed.matchId; changed = true; }
  }
  if (changed) localStore.saveCollection('mediaLobbies', list);
  return list;
}
function streams() { return localStore.collection('mediaStreams', streamSeed); }
function encryptionKey() { return crypto.createHash('sha256').update(env.lobbyEncryptionKey).digest(); }
function encryptCredentials(credentials) {
  if (!credentials.roomName && !credentials.roomPassword) return null;
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(credentials), 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') };
}
function decryptCredentials(payload) {
  if (!payload) return null;
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]).toString('utf8'));
}
function publicLobby(item) { const { credentialsEncrypted, ...safe } = item; return { ...safe, hasCredentials: Boolean(credentialsEncrypted) }; }
function listLobbies(filters = {}) { return lobbies().filter((item) => !filters.game || item.game.toLowerCase() === filters.game.toLowerCase()).filter((item) => !filters.status || item.status === filters.status).map(publicLobby); }
function createLobby(input) { const list = lobbies(); const { roomName, roomPassword, ...safeInput } = input; const lobby = { id: crypto.randomUUID(), ...safeInput, credentialsEncrypted: encryptCredentials({ roomName, roomPassword }), players: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; list.push(lobby); localStore.saveCollection('mediaLobbies', list); return publicLobby(lobby); }
function updateLobby(id, updates) { const list = lobbies(); const lobby = list.find((item) => item.id === id); if (!lobby) return null; const { roomName, roomPassword, ...safeUpdates } = updates; Object.assign(lobby, safeUpdates, { updatedAt: new Date().toISOString() }); if (roomName !== undefined || roomPassword !== undefined) lobby.credentialsEncrypted = encryptCredentials({ roomName, roomPassword }); localStore.saveCollection('mediaLobbies', list); return publicLobby(lobby); }
function getLobby(id) { const lobby = lobbies().find((item) => item.id === id); return lobby ? publicLobby(lobby) : null; }
function getLobbyCredentials(id) { const lobby = lobbies().find((item) => item.id === id); return lobby ? decryptCredentials(lobby.credentialsEncrypted) : null; }
function removeLobby(id) { const list = lobbies(); const index = list.findIndex((item) => item.id === id); if (index < 0) return false; list.splice(index, 1); localStore.saveCollection('mediaLobbies', list); return true; }
function listStreams() {
  const defaults = new Map(streamSeed.map((stream) => [stream.id, stream]));
  const saved = streams().filter((stream) => defaults.has(stream.id)).map((stream) => ({ ...stream, ...defaults.get(stream.id) }));
  return [...saved, ...streamSeed.filter((seed) => !saved.some((stream) => stream.id === seed.id))];
}
function metrics() {
  const lobbyList = lobbies(); const streamList = listStreams();
  const games = [...new Set([...lobbyList.map((item) => item.game), ...streamList.map((item) => item.game)])];
  return games.map((game) => ({ game, lobbies: lobbyList.filter((item) => item.game === game).length, activePlayers: lobbyList.filter((item) => item.game === game).reduce((sum, item) => sum + Number(item.players || 0), 0), viewers: streamList.filter((item) => item.game === game && item.live).reduce((sum, item) => sum + Number(item.viewers || 0), 0) }));
}
module.exports = { listLobbies, createLobby, updateLobby, removeLobby, getLobby, getLobbyCredentials, listStreams, metrics };
