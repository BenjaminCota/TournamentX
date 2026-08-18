let cache = { expiresAt: 0, streams: null, integration: null };

function configuredList(name, fallback) {
  return String(process.env[name] || fallback)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

async function twitchStreams() {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) return { status: 'not_configured', data: [] };
  const tokenResponse = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(process.env.TWITCH_CLIENT_ID)}&client_secret=${encodeURIComponent(process.env.TWITCH_CLIENT_SECRET)}&grant_type=client_credentials`, { method: 'POST' });
  if (!tokenResponse.ok) throw new Error(`Twitch OAuth respondió ${tokenResponse.status}`);
  const token = await tokenResponse.json();
  const channels = configuredList('TWITCH_CHANNELS', 'lolesportsla,cblol,valorant_la,lcs,lec').slice(0, 5);
  const url = new URL('https://api.twitch.tv/helix/streams');
  url.searchParams.set('first', String(Math.max(1, channels.length)));
  channels.forEach((channel) => url.searchParams.append('user_login', channel));
  const response = await fetch(url, { headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, Authorization: `Bearer ${token.access_token}` } });
  if (!response.ok) throw new Error(`Twitch respondió ${response.status}`);
  const body = await response.json();
  const apiHeaders = { 'Client-ID': process.env.TWITCH_CLIENT_ID, Authorization: `Bearer ${token.access_token}` };
  const liveLogins = new Set((body.data || []).map((item) => item.user_login.toLowerCase()));
  const offlineChannels = channels.filter((channel) => !liveLogins.has(channel));
  let recordings = [];
  if (offlineChannels.length) {
    const usersUrl = new URL('https://api.twitch.tv/helix/users');
    offlineChannels.forEach((channel) => usersUrl.searchParams.append('login', channel));
    const usersResponse = await fetch(usersUrl, { headers: apiHeaders });
    if (usersResponse.ok) {
      const usersBody = await usersResponse.json();
      const recordingResults = await Promise.allSettled((usersBody.data || []).map(async (user) => {
        const videosUrl = new URL('https://api.twitch.tv/helix/videos');
        Object.entries({ user_id: user.id, first: '1' }).forEach(([key, value]) => videosUrl.searchParams.set(key, value));
        const videosResponse = await fetch(videosUrl, { headers: apiHeaders });
        if (!videosResponse.ok) return null;
        const video = (await videosResponse.json()).data?.[0];
        if (!video) return null;
        return {
          id: `twitch-vod-${video.id}`, eventId: /league|lol|lcs/i.test(video.title || '') ? 'event-lol' : null,
          platform: 'Twitch', title: video.title || `${user.display_name} — transmisión anterior`, channel: user.display_name,
          channelHandle: user.login, embedId: `v${video.id}`, mediaKind: 'video', game: 'Esports', viewers: Number(video.view_count || 0),
          live: false, thumbnail: String(video.thumbnail_url || '').replace('%{width}', '1000').replace('%{height}', '560'),
          url: video.url || `https://www.twitch.tv/videos/${video.id}`, source: 'twitch',
        };
      }));
      // Un canal que falle no debe ocultar los VOD válidos de los demás canales.
      recordings = recordingResults
        .filter((result) => result.status === 'fulfilled' && result.value)
        .map((result) => result.value);
    }
  }
  return {
    status: 'configured',
    data: [...body.data.map((item) => ({
      id: `twitch-${item.id}`, eventId: /league|lol|lcs/i.test(item.game_name || item.title) ? 'event-lol' : null,
      platform: 'Twitch', title: item.title, channel: item.user_name, channelHandle: item.user_login, embedId: item.user_login,
      mediaKind: 'live', game: item.game_name || 'Esports', viewers: Number(item.viewer_count || 0),
      live: item.type === 'live', thumbnail: item.thumbnail_url.replace('{width}', '1000').replace('{height}', '560'),
      url: `https://www.twitch.tv/${item.user_login}`, source: 'twitch',
    })), ...recordings],
  };
}

async function youtubeStreams() {
  if (!process.env.YOUTUBE_API_KEY) return { status: 'not_configured', data: [] };
  const handles = configuredList('YOUTUBE_CHANNEL_HANDLES', 'lolesports,ValorantEsports,ESLCS,RocketLeagueEsports,RainbowSixEsports').slice(0, 5);
  const curatedIds = configuredList('YOUTUBE_VIDEO_IDS', '').slice(0, 50);
  let discoveredIds = [];
  const handleByChannelId = new Map();
  await Promise.all(handles.map(async (handle) => {
    try {
      const channelUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
      Object.entries({ part: 'id,snippet', forHandle: handle, key: process.env.YOUTUBE_API_KEY }).forEach(([key, value]) => channelUrl.searchParams.set(key, value));
      const channelResponse = await fetch(channelUrl);
      if (!channelResponse.ok) return;
      const channelBody = await channelResponse.json();
      const channelId = channelBody.items?.[0]?.id;
      if (!channelId) return;
      handleByChannelId.set(channelId, handle);
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      Object.entries({ part: 'snippet', type: 'video', eventType: 'live', channelId, maxResults: '1', key: process.env.YOUTUBE_API_KEY }).forEach(([key, value]) => searchUrl.searchParams.set(key, value));
      const searchResponse = await fetch(searchUrl);
      if (!searchResponse.ok) return;
      const searchBody = await searchResponse.json();
      discoveredIds.push(...(searchBody.items || []).map((item) => item.id.videoId).filter(Boolean));
    } catch {
      // El canal curado seguirá visible aunque la cuota o la red fallen.
    }
  }));

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
        channelHandle: handleByChannelId.get(item.snippet?.channelId) || null,
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
  const knownSources = new Set(live.flatMap((stream) => [stream.embedId, stream.channelHandle].filter(Boolean).map((identity) => `${stream.platform}:${identity}`.toLowerCase())));
  for (const stream of fallback) if (!knownSources.has(`${stream.platform}:${stream.channelHandle || stream.embedId}`.toLowerCase())) live.push(stream);
  cache = { expiresAt: Date.now() + 60000, streams: live.length ? live : fallback, integration: { twitch: twitch.status, youtube: youtube.status } };
  return cache;
}

module.exports = { externalStreams };
