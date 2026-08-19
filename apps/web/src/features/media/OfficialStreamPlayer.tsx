import { useEffect, useId, useRef, useState } from 'react';
import { ExternalLink, Maximize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from 'lucide-react';
import type { MediaStream } from './media.types';

interface TwitchPlayerInstance {
  addEventListener: (event: string, callback: () => void) => void;
  pause: () => void;
  play: () => void;
  seek: (seconds: number) => void;
  getCurrentTime: () => number;
  isPaused: () => boolean;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
}

interface TwitchPlayerConstructor {
  new (elementId: string, options: Record<string, unknown>): TwitchPlayerInstance;
  READY: string;
  PLAY: string;
  PAUSE: string;
  OFFLINE: string;
}

interface YouTubePlayerInstance {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  mute: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
}

declare global {
  interface Window {
    Twitch?: { Player: TwitchPlayerConstructor };
    YT?: { Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayerInstance; PlayerState: { PLAYING: number } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let twitchScriptPromise: Promise<void> | null = null;
let youtubeScriptPromise: Promise<void> | null = null;

function loadScript(id: string, source: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const loaded = document.getElementById(id) as HTMLScriptElement | null;
    if (loaded?.dataset.loaded === 'true') return resolve();
    const script = loaded ?? document.createElement('script');
    script.id = id;
    script.src = source;
    script.async = true;
    script.addEventListener('load', () => { script.dataset.loaded = 'true'; resolve(); }, { once: true });
    script.addEventListener('error', () => reject(new Error(`No se pudo cargar ${source}`)), { once: true });
    if (!loaded) document.head.appendChild(script);
  });
}

function loadTwitchApi() {
  if (window.Twitch?.Player) return Promise.resolve();
  twitchScriptPromise ??= loadScript('twitch-player-api', 'https://player.twitch.tv/js/embed/v1.js');
  return twitchScriptPromise;
}

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  youtubeScriptPromise ??= new Promise<void>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(); };
    loadScript('youtube-iframe-api', 'https://www.youtube.com/iframe_api').catch(reject);
  });
  return youtubeScriptPromise;
}

interface OfficialStreamPlayerProps {
  stream: MediaStream;
}

export function OfficialStreamPlayer({ stream }: OfficialStreamPlayerProps) {
  const generatedId = useId().replace(/:/g, '');
  const hostId = `official-player-${generatedId}`;
  const frameRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const twitchRef = useRef<TwitchPlayerInstance | null>(null);
  const youtubeRef = useRef<YouTubePlayerInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(55);
  const [message, setMessage] = useState('Conectando con el reproductor oficial…');
  const [showTwitchPreview, setShowTwitchPreview] = useState(false);

  useEffect(() => {
    let active = true;
    const isOfflineTwitchChannel = stream.platform === 'Twitch' && stream.mediaKind === 'channel' && !stream.live;
    setReady(false);
    setPlaying(false);
    setMuted(true);
    setShowTwitchPreview(isOfflineTwitchChannel);
    setMessage(isOfflineTwitchChannel ? 'Vista de referencia del canal de Twitch. Abre el canal para ver su señal actual.' : 'Conectando con el reproductor oficial…');
    const mount = mountRef.current;
    mount?.replaceChildren();
    if (isOfflineTwitchChannel) return () => { active = false; };
    const host = document.createElement('div');
    host.id = hostId;
    host.className = 'h-full w-full';
    mount?.appendChild(host);

    async function mountPlayer() {
      try {
        if (stream.platform === 'Twitch') {
          await loadTwitchApi();
          if (!active || !window.Twitch?.Player) return;
          const Constructor = window.Twitch.Player;
          const player = new Constructor(hostId, {
            width: '100%', height: '100%',
            ...(stream.mediaKind === 'video'
              ? { video: stream.embedId.startsWith('v') ? stream.embedId : `v${stream.embedId}` }
              : { channel: stream.embedId }),
            parent: [window.location.hostname], autoplay: false, muted: true,
          });
          twitchRef.current = player;
          player.addEventListener(Constructor.READY, () => {
            if (!active) return;
            player.setMuted(true);
            player.setVolume(volume / 100);
            setReady(true);
            setMessage(stream.mediaKind === 'channel'
              ? 'Canal oficial embebido · al configurar Twitch API se sustituirá por su último VOD cuando esté fuera de línea.'
              : stream.mediaKind === 'live' ? 'Directo oficial de Twitch' : 'Último video disponible de Twitch');
          });
          player.addEventListener(Constructor.PLAY, () => active && setPlaying(true));
          player.addEventListener(Constructor.PAUSE, () => active && setPlaying(false));
          player.addEventListener(Constructor.OFFLINE, () => {
            if (!active) return;
            setShowTwitchPreview(true);
            setMessage('El canal está fuera de línea. Se muestra una vista de referencia de Twitch.');
          });
        } else {
          await loadYouTubeApi();
          if (!active || !window.YT?.Player || !host) return;
          youtubeRef.current = new window.YT.Player(host, {
            videoId: stream.embedId,
            width: '100%', height: '100%',
            playerVars: { autoplay: 0, controls: 0, playsinline: 1, rel: 0, enablejsapi: 1 },
            events: {
              onReady: (event: { target: YouTubePlayerInstance }) => {
                if (!active) return;
                event.target.mute();
                event.target.setVolume(volume);
                setReady(true);
                setMessage(stream.live ? 'Directo oficial de YouTube' : 'Video oficial de YouTube');
              },
              onStateChange: (event: { data: number }) => {
                if (active) setPlaying(event.data === window.YT?.PlayerState.PLAYING);
              },
              onError: () => active && setMessage('Este video no admite reproducción embebida. Puedes abrirlo en la plataforma.'),
            },
          });
        }
      } catch {
        if (!active) return;
        if (stream.platform === 'Twitch') setShowTwitchPreview(true);
        setMessage('No se pudo cargar la API oficial. Revisa la conexión o abre la fuente original.');
      }
    }

    void mountPlayer();
    return () => {
      active = false;
      try { twitchRef.current?.pause(); } catch { /* El canal pudo desconectarse. */ }
      try { youtubeRef.current?.destroy(); } catch { /* El iframe pudo haberse desmontado. */ }
      twitchRef.current = null;
      youtubeRef.current = null;
      mount?.replaceChildren();
    };
  }, [hostId, stream.embedId, stream.live, stream.mediaKind, stream.platform]);

  function togglePlayback() {
    if (!ready) return;
    if (stream.platform === 'Twitch' && twitchRef.current) {
      if (twitchRef.current.isPaused()) twitchRef.current.play(); else twitchRef.current.pause();
    } else if (youtubeRef.current) {
      if (playing) youtubeRef.current.pauseVideo(); else youtubeRef.current.playVideo();
    }
  }

  function seek(delta: number) {
    if (!ready) return;
    if (stream.platform === 'Twitch') {
      if (stream.mediaKind !== 'video') {
        setMessage('El avance de 10 segundos está disponible cuando Twitch entrega un VOD.');
        return;
      }
      const player = twitchRef.current;
      if (player) player.seek(Math.max(0, player.getCurrentTime() + delta));
    } else {
      const player = youtubeRef.current;
      if (player) player.seekTo(Math.max(0, player.getCurrentTime() + delta), true);
    }
  }

  function toggleMute() {
    const next = !muted;
    twitchRef.current?.setMuted(next);
    if (youtubeRef.current) { if (next) youtubeRef.current.mute(); else youtubeRef.current.unMute(); }
    setMuted(next);
  }

  function changeVolume(next: number) {
    setVolume(next);
    twitchRef.current?.setVolume(next / 100);
    youtubeRef.current?.setVolume(next);
    if (next > 0 && muted) {
      twitchRef.current?.setMuted(false);
      youtubeRef.current?.unMute();
      setMuted(false);
    }
  }

  async function enterFullscreen() {
    if (!frameRef.current) return;
    try { await frameRef.current.requestFullscreen(); } catch { setMessage('El navegador bloqueó la pantalla completa.'); }
  }

  const controlClass = 'grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35';
  return (
    <div ref={frameRef} className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/40">
      <div className="relative aspect-video min-h-[220px] bg-black">
        <div ref={mountRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
        {showTwitchPreview ? (
          <div className="absolute inset-0 overflow-hidden bg-[#17131f]">
            <img src={stream.thumbnail} alt="" className="h-full w-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#120d1a] via-[#211532]/85 to-[#9146ff]/30" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <span className="rounded-full bg-[#9146ff] px-3 py-1 text-[10px] font-black tracking-[.16em] text-white">TWITCH</span>
              <h3 className="mt-4 text-xl font-black text-white sm:text-2xl">{stream.channel}</h3>
              <p className="mt-2 max-w-md text-sm text-slate-200">Canal oficial de {stream.game}. La señal no está disponible para reproducirse aquí en este momento.</p>
              <a href={stream.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#9146ff] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#a970ff]">
                Abrir canal en Twitch <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ) : !ready && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#0f0f12]">
            <div className="text-center"><span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-[#d6b15e]"/><p className="mt-3 text-xs text-slate-400">{message}</p></div>
          </div>
        )}
        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
          <span className={`rounded-md px-2 py-1 text-[10px] font-black tracking-wider text-white ${stream.live ? 'bg-red-500/90' : 'bg-[#5b4a86]/90'}`}>{stream.mediaKind === 'channel' ? 'CANAL EMBEBIDO' : stream.live ? 'EN VIVO' : stream.platform === 'Twitch' && stream.source === 'twitch' ? 'ÚLTIMO VIDEO' : 'VIDEO OFICIAL'}</span>
          <span className="rounded-md border border-white/10 bg-black/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">{stream.platform}</span>
        </div>
      </div>
      <div className="border-t border-white/10 bg-[#18181c]/95 px-3 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-1">
          <button type="button" onClick={togglePlayback} disabled={!ready} className={controlClass} aria-label={playing ? 'Pausar' : 'Reproducir'}>{playing ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4 fill-current"/>}</button>
          <button type="button" onClick={() => seek(-10)} disabled={!ready} className={controlClass} aria-label="Regresar 10 segundos"><RotateCcw className="h-4 w-4"/></button>
          <button type="button" onClick={() => seek(10)} disabled={!ready} className={controlClass} aria-label="Adelantar 10 segundos"><RotateCw className="h-4 w-4"/></button>
          <button type="button" onClick={toggleMute} disabled={!ready} className={controlClass} aria-label={muted ? 'Activar sonido' : 'Silenciar'}>{muted ? <VolumeX className="h-4 w-4"/> : <Volume2 className="h-4 w-4"/>}</button>
          <input type="range" min="0" max="100" value={volume} onChange={(event) => changeVolume(Number(event.target.value))} disabled={!ready} aria-label="Volumen" className="stream-volume mx-1 hidden w-24 sm:block" />
          <p className="ml-2 hidden min-w-0 flex-1 truncate text-[11px] text-slate-500 md:block" aria-live="polite">{message}</p>
          <button type="button" onClick={enterFullscreen} className={controlClass} aria-label="Pantalla completa"><Maximize className="h-4 w-4"/></button>
        </div>
        <p className="truncate px-2 pb-1 text-[11px] text-slate-500 md:hidden" aria-live="polite">{message}</p>
      </div>
    </div>
  );
}
