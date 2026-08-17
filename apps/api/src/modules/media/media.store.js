const crypto = require('node:crypto');
const localStore = require('../../config/local-store');

const lobbySeed = [
  { id: 'lobby-valorant-01', name: 'Final LATAM', game: 'Valorant', server: 'LATAM Norte', map: 'Ascent', team1: 'Luminex', team2: 'Titans', status: 'In Game', ping: 32, maxPlayers: 10, players: 10, createdAt: '2026-08-16T00:00:00.000Z' },
  { id: 'lobby-rocket-01', name: 'Copa Comunidad', game: 'Rocket League', server: 'US East', map: 'DFH Stadium', team1: 'Nova', team2: 'Raven', status: 'Waiting', ping: 48, maxPlayers: 6, players: 4, createdAt: '2026-08-16T00:00:00.000Z' },
];
const streamSeed = [
  { id: 'stream-twitch-demo', platform: 'Twitch', title: 'TournamentX Masters — Semifinal', channel: 'tournamentx_esports', game: 'Valorant', viewers: 18420, live: true, thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1000&auto=format&fit=crop&q=80', url: 'https://www.twitch.tv/directory/category/valorant', source: 'demo' },
  { id: 'stream-youtube-demo', platform: 'YouTube', title: 'Community Cup — Jornada 4', channel: 'TournamentX LATAM', game: 'Rocket League', viewers: 6830, live: true, thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1000&auto=format&fit=crop&q=80', url: 'https://www.youtube.com/gaming', source: 'demo' },
];

function lobbies() { return localStore.collection('mediaLobbies', lobbySeed); }
function streams() { return localStore.collection('mediaStreams', streamSeed); }
function listLobbies(filters = {}) { return lobbies().filter((item) => !filters.game || item.game.toLowerCase() === filters.game.toLowerCase()).filter((item) => !filters.status || item.status === filters.status); }
function createLobby(input) { const list = lobbies(); const lobby = { id: crypto.randomUUID(), ...input, players: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; list.push(lobby); localStore.saveCollection('mediaLobbies', list); return lobby; }
function updateLobby(id, updates) { const list = lobbies(); const lobby = list.find((item) => item.id === id); if (!lobby) return null; Object.assign(lobby, updates, { updatedAt: new Date().toISOString() }); localStore.saveCollection('mediaLobbies', list); return lobby; }
function removeLobby(id) { const list = lobbies(); const index = list.findIndex((item) => item.id === id); if (index < 0) return false; list.splice(index, 1); localStore.saveCollection('mediaLobbies', list); return true; }
function listStreams() { return streams(); }
function metrics() {
  const lobbyList = lobbies(); const streamList = streams();
  const games = [...new Set([...lobbyList.map((item) => item.game), ...streamList.map((item) => item.game)])];
  return games.map((game) => ({ game, lobbies: lobbyList.filter((item) => item.game === game).length, activePlayers: lobbyList.filter((item) => item.game === game).reduce((sum, item) => sum + Number(item.players || 0), 0), viewers: streamList.filter((item) => item.game === game && item.live).reduce((sum, item) => sum + Number(item.viewers || 0), 0) }));
}
module.exports = { listLobbies, createLobby, updateLobby, removeLobby, listStreams, metrics };
