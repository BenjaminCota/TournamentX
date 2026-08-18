const test = require('node:test');
const assert = require('node:assert/strict');

test('Twitch conserva el directo y usa el video más reciente de cada canal fuera de línea', async (t) => {
  const originalFetch = global.fetch;
  const originalClientId = process.env.TWITCH_CLIENT_ID;
  const originalClientSecret = process.env.TWITCH_CLIENT_SECRET;
  const originalChannels = process.env.TWITCH_CHANNELS;
  t.after(() => {
    global.fetch = originalFetch;
    if (originalClientId === undefined) delete process.env.TWITCH_CLIENT_ID; else process.env.TWITCH_CLIENT_ID = originalClientId;
    if (originalClientSecret === undefined) delete process.env.TWITCH_CLIENT_SECRET; else process.env.TWITCH_CLIENT_SECRET = originalClientSecret;
    if (originalChannels === undefined) delete process.env.TWITCH_CHANNELS; else process.env.TWITCH_CHANNELS = originalChannels;
  });

  process.env.TWITCH_CLIENT_ID = 'client-id';
  process.env.TWITCH_CLIENT_SECRET = 'client-secret';
  process.env.TWITCH_CHANNELS = 'lcs,lolesportsla,cblol';
  global.fetch = async (input) => {
    const url = String(input);
    if (url.startsWith('https://id.twitch.tv/oauth2/token')) {
      return new Response(JSON.stringify({ access_token: 'app-token' }), { status: 200 });
    }
    if (url.startsWith('https://api.twitch.tv/helix/streams')) {
      return new Response(JSON.stringify({ data: [{
        id: 'live-1', user_login: 'lcs', user_name: 'LCS', game_name: 'League of Legends',
        title: 'LCS en directo', viewer_count: 2500, type: 'live', thumbnail_url: 'https://img/{width}/{height}.jpg',
      }] }), { status: 200 });
    }
    if (url.startsWith('https://api.twitch.tv/helix/users')) {
      return new Response(JSON.stringify({ data: [
        { id: 'user-latam', login: 'lolesportsla', display_name: 'LoL Esports LATAM' },
        { id: 'user-cblol', login: 'cblol', display_name: 'CBLOL' },
      ] }), { status: 200 });
    }
    if (url.includes('user_id=user-latam')) {
      return new Response(JSON.stringify({ data: [{ id: 'vod-latam', title: 'Última jornada LATAM', view_count: 900, thumbnail_url: 'https://img/%{width}/%{height}.jpg', url: 'https://www.twitch.tv/videos/vod-latam' }] }), { status: 200 });
    }
    if (url.includes('user_id=user-cblol')) throw new Error('Canal temporalmente no disponible');
    throw new Error(`Solicitud inesperada: ${url}`);
  };

  delete require.cache[require.resolve('../src/modules/media/media.providers')];
  const { externalStreams } = require('../src/modules/media/media.providers');
  const result = await externalStreams([]);

  assert.equal(result.integration.twitch, 'configured');
  assert.equal(result.streams.find((stream) => stream.channelHandle === 'lcs').mediaKind, 'live');
  const vod = result.streams.find((stream) => stream.channelHandle === 'lolesportsla');
  assert.equal(vod.mediaKind, 'video');
  assert.equal(vod.embedId, 'vvod-latam');
  assert.equal(vod.live, false);
});
