let cache = { expiresAt: 0, streams: null, integration: null };

function configuredList(name, fallback) {
  return String(process.env[name] || fallback)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

async function twitchStreams() {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) return { status: 'demo', data: [] };
  const tokenResponse = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(process.env.TWITCH_CLIENT_ID)}&client_secret=${encodeURIComponent(process.env.TWITCH_CLIENT_SECRET)}&grant_type=client_credentials`, { method: 'POST' });
  if (!tokenResponse.ok) throw new Error(`Twitch OAuth respondió ${tokenResponse.status}`);
  const token = await tokenResponse.json();
  const channels = configuredList('TWITCH_CHANNELS', 'lolesportsla,cblol,valorant_la,lcs,valorant_americas,lec,valorant,rocketleague,eslcs').slice(0, 100);
  const url = new URL('https://api.twitch.tv/helix/streams');
  url.searchParams.set('first', String(Math.max(1, channels.length)));
  channels.forEach((channel) => url.searchParams.append('user_login', channel));
  const response = await fetch(url, { headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, Authorization: `Bearer ${token.access_token}` } });
  if (!response.ok) throw new Error(`Twitch respondió ${response.status}`);
  const body = await response.json();
  return {
    status: 'configured',
    data: body.data.map((item) => ({
      id: `twitch-${item.id}`, eventId: /league|lol|lcs/i.test(item.game_name || item.title) ? 'event-lol' : null,
      platform: 'Twitch', title: item.title, channel: item.user_name, embedId: item.user_login,
      mediaKind: 'live', game: item.game_name || 'Esports', viewers: Number(item.viewer_count || 0),
      live: item.type === 'live', thumbnail: item.thumbnail_url.replace('{width}', '1000').replace('{height}', '560'),
      url: `https://www.twitch.tv/${item.user_login}`, source: 'twitch',
    })),
  };
}

async function youtubeStreams() {
  if (!process.env.YOUTUBE_API_KEY) return { status: 'demo', data: [] };
  const curatedIds = configuredList('YOUTUBE_VIDEO_IDS', '6VOfpE_HGpw').slice(0, 50);
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  Object.entries({ part: 'snippet', type: 'video', eventType: 'live', q: process.env.YOUTUBE_SEARCH_QUERY || 'esports tournament gaming', maxResults: '10', key: process.env.YOUTUBE_API_KEY }).forEach(([key, value]) => searchUrl.searchParams.set(key, value));
  let discoveredIds = [];
  try {
    const searchResponse = await fetch(searchUrl);
    if (searchResponse.ok) {
      const searchBody = await searchResponse.json();
      discoveredIds = (searchBody.items || []).map((item) => item.id.videoId).filter(Boolean);
    }
  } catch {
    // Las fuentes curadas continúan disponibles aunque falle la búsqueda general.
  }

  const ids = [...new Set([...curatedIds, ...discoveredIds])].slice(0, 50);
  if (!ids.length) return { status: 'configured', data: [] };
  const detailUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  Object.entries({ part: 'snippet,liveStreamingDetails,status', id: ids.join(','), key: process.env.YOUTUBE_API_KEY }).forEach(([key, value]) => detailUrl.searchParams.set(key, value));
  const response = await fetch(detailUrl);
  if (!response.ok) throw new Error(`YouTube respondió ${response.status}`);
  const body = await response.json();
  return {
    status: 'configured',
    data: (body.items || []).filter((item) => item.status?.embeddable !== false).map((item) => {
      const details = item.liveStreamingDetails || {};
      const live = item.snippet?.liveBroadcastContent === 'live' || Boolean(details.actualStartTime && !details.actualEndTime);
      const league = /league of legends|\blol\b|\blcs\b/i.test(item.snippet?.title || '');
      return {
        id: `youtube-${item.id}`, eventId: league ? 'event-lol' : null, platform: 'YouTube',
        title: item.snippet?.title || 'Transmisión de esports', channel: item.snippet?.channelTitle || 'YouTube Gaming',
        embedId: item.id, mediaKind: live ? 'live' : 'video', game: league ? 'League of Legends' : 'Esports',
        viewers: Number(details.concurrentViewers || 0), live,
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
        url: `https://www.youtube.com/watch?v=${item.id}`, source: 'youtube',
      };
    }),
  };
}

async function externalStreams(fallback) {
  if (cache.streams && Date.now() < cache.expiresAt) return cache;
  const results = await Promise.allSettled([twitchStreams(), youtubeStreams()]);
  const twitch = results[0].status === 'fulfilled' ? results[0].value : { status: 'error', data: [] };
  const youtube = results[1].status === 'fulfilled' ? results[1].value : { status: 'error', data: [] };
  const live = [...twitch.data, ...youtube.data];
  const knownSources = new Set(live.map((stream) => `${stream.platform}:${stream.embedId}`.toLowerCase()));
  for (const stream of fallback) if (!knownSources.has(`${stream.platform}:${stream.embedId}`.toLowerCase())) live.push(stream);
  cache = { expiresAt: Date.now() + 60000, streams: live.length ? live : fallback, integration: { twitch: twitch.status, youtube: youtube.status } };
  return cache;
}

module.exports = { externalStreams };
