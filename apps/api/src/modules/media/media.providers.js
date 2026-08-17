let cache = { expiresAt: 0, streams: null, integration: null };

async function twitchStreams() {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) return { status: 'demo', data: [] };
  const tokenResponse = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(process.env.TWITCH_CLIENT_ID)}&client_secret=${encodeURIComponent(process.env.TWITCH_CLIENT_SECRET)}&grant_type=client_credentials`, { method: 'POST' });
  if (!tokenResponse.ok) throw new Error(`Twitch OAuth respondió ${tokenResponse.status}`);
  const token = await tokenResponse.json();
  const response = await fetch('https://api.twitch.tv/helix/streams?first=12', { headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, Authorization: `Bearer ${token.access_token}` } });
  if (!response.ok) throw new Error(`Twitch respondió ${response.status}`);
  const body = await response.json();
  return { status: 'configured', data: body.data.map((item) => ({ id: `twitch-${item.id}`, platform: 'Twitch', title: item.title, channel: item.user_name, game: item.game_name || 'Esports', viewers: Number(item.viewer_count || 0), live: item.type === 'live', thumbnail: item.thumbnail_url.replace('{width}', '1000').replace('{height}', '560'), url: `https://www.twitch.tv/${item.user_login}`, source: 'twitch' })) };
}

async function youtubeStreams() {
  if (!process.env.YOUTUBE_API_KEY) return { status: 'demo', data: [] };
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  Object.entries({ part: 'snippet', type: 'video', eventType: 'live', q: 'esports tournament', maxResults: '12', key: process.env.YOUTUBE_API_KEY }).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`YouTube respondió ${response.status}`);
  const body = await response.json();
  return { status: 'configured', data: (body.items || []).map((item) => ({ id: `youtube-${item.id.videoId}`, platform: 'YouTube', title: item.snippet.title, channel: item.snippet.channelTitle, game: 'Esports', viewers: 0, live: true, thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '', url: `https://www.youtube.com/watch?v=${item.id.videoId}`, source: 'youtube' })) };
}

async function externalStreams(fallback) {
  if (cache.streams && Date.now() < cache.expiresAt) return cache;
  const results = await Promise.allSettled([twitchStreams(), youtubeStreams()]);
  const twitch = results[0].status === 'fulfilled' ? results[0].value : { status: 'error', data: [] };
  const youtube = results[1].status === 'fulfilled' ? results[1].value : { status: 'error', data: [] };
  const live = [...twitch.data, ...youtube.data];
  cache = { expiresAt: Date.now() + 60000, streams: live.length ? live : fallback, integration: { twitch: twitch.status, youtube: youtube.status } };
  return cache;
}

module.exports = { externalStreams };
