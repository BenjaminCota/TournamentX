import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarClock, CheckCircle2, ChevronRight, Gamepad2, Globe2, Plus, Radio, Server, Signal, Sparkles, Trophy, Users, X } from 'lucide-react';
import { UserRole } from '../../types';
import { tournamentXApi } from '../../services/apiClient';
import { supabase } from '../../services/supabaseClient';
import { OfficialStreamPlayer } from './OfficialStreamPlayer';
import type { LiveEvent, MediaStream } from './media.types';

interface EsportsArenaViewProps { currentUserRole: UserRole }
type Lobby = Awaited<ReturnType<typeof tournamentXApi.lobbies>>['data'][number];
type Metric = Awaited<ReturnType<typeof tournamentXApi.mediaMetrics>>['data'][number];

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function compactNumber(value: number) {
  return new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export const EsportsArenaView: React.FC<EsportsArenaViewProps> = ({ currentUserRole }) => {
  const [streams, setStreams] = useState<MediaStream[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [integration, setIntegration] = useState({ twitch: 'direct', youtube: 'direct' });
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventFilter, setEventFilter] = useState<'all' | 'esports' | 'sports'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: 'Sala competitiva', game: 'Valorant', server: 'LATAM Norte', map: 'Ascent', team1: 'Luminex', team2: 'Titans', status: 'Waiting' as const, ping: 30, maxPlayers: 10 });
  const canManage = ['Admin', 'Organizador', 'Capitán'].includes(currentUserRole);

  const load = async () => {
    try {
      const [streamBody, eventBody, lobbyBody, metricBody] = await Promise.all([
        tournamentXApi.streams(), tournamentXApi.mediaEvents(), tournamentXApi.lobbies(), tournamentXApi.mediaMetrics(),
      ]);
      setStreams(streamBody.data);
      setEvents(eventBody.data);
      setIntegration(streamBody.integration);
      setLobbies(lobbyBody.data);
      setMetrics(metricBody.data);
      setSelectedStreamId((current) => current || streamBody.data[0]?.id || '');
      setSelectedEventId((current) => current || streamBody.data[0]?.eventId || eventBody.data[0]?.id || '');
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo conectar con el módulo media');
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    const channel = supabase
      ?.channel('tournamentx-media-lobbies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media_lobbies' }, () => void load())
      .subscribe();
    return () => {
      window.clearInterval(timer);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, []);

  const selectedStream = streams.find((stream) => stream.id === selectedStreamId) ?? streams[0];
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? events[0];
  const filteredEvents = useMemo(() => events.filter((event) => eventFilter === 'all' || event.category === eventFilter), [eventFilter, events]);
  const displayedViewers = selectedStream?.viewers || selectedEvent?.viewers || 0;
  const totalAudience = streams.reduce((sum, stream) => sum + stream.viewers, 0);

  function selectStream(stream: MediaStream) {
    setSelectedStreamId(stream.id);
    if (stream.eventId && events.some((event) => event.id === stream.eventId)) setSelectedEventId(stream.eventId);
  }

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    try { await tournamentXApi.createLobby(form); setShowCreate(false); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo crear el lobby'); }
  };

  return (
    <div className="tx-module-shell min-h-screen bg-[#0f0f12] px-4 py-6 text-[#f7f7f8] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px] space-y-6">
        <header className="flex flex-col gap-5 border-b border-white/[.08] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.22em] text-[#d6b15e]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500"/> Broadcast center</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Centro de transmisión</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Señales oficiales de Twitch y YouTube, marcador contextual y operación de salas en una sola vista.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`media-status ${integration.twitch === 'configured' ? 'text-emerald-300' : 'text-amber-200'}`}><span className="h-1.5 w-1.5 rounded-full bg-[#9146ff]"/> Twitch · {integration.twitch === 'configured' ? 'Live + último VOD' : 'canal embebido'}</span>
            <span className={`media-status ${integration.youtube === 'configured' ? 'text-emerald-300' : 'text-amber-200'}`}><span className="h-1.5 w-1.5 rounded-full bg-[#d95656]"/> YouTube · {integration.youtube === 'configured' ? 'API real' : 'video embebido'}</span>
            {canManage && <button type="button" onClick={() => setShowCreate(true)} className="ml-0 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-black hover:-translate-y-0.5 hover:bg-[#d6b15e] sm:ml-2"><Plus className="h-4 w-4"/> Nueva sala</button>}
          </div>
        </header>

        {error && <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,.72fr)]">
          <div className="min-w-0 space-y-4">
            {selectedStream ? <OfficialStreamPlayer stream={selectedStream}/> : <div className="grid aspect-video place-items-center rounded-2xl border border-white/10 bg-[#18181c] text-sm text-slate-500">Cargando fuentes oficiales…</div>}

            <div className="rounded-2xl border border-white/[.08] bg-[#18181c] p-3">
              <div className="flex flex-col items-start gap-2 px-1 pb-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-4">
                <div><p className="text-xs font-semibold text-white">Cambiar señal</p><p className="mt-0.5 text-[11px] text-slate-500">El reproductor cambia sin recargar la página.</p></div>
                <span className="text-[11px] tabular-nums text-slate-500">{compactNumber(totalAudience)} audiencia</span>
              </div>
              <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {streams.map((stream) => {
                  const active = stream.id === selectedStream?.id;
                  return <button type="button" key={stream.id} onClick={() => selectStream(stream)} className={`group flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-all ${active ? 'border-[#d6b15e]/50 bg-[#d6b15e]/[.08]' : 'border-white/[.07] bg-black/20 hover:border-white/20 hover:bg-white/[.04]'}`}>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${stream.platform === 'Twitch' ? 'bg-[#9146ff]/15 text-[#b892ff]' : 'bg-[#d95656]/15 text-[#ef7777]'}`}><Radio className="h-4 w-4"/></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-white">{stream.title}</span><span className="mt-1 block truncate text-[10px] text-slate-500">{stream.platform} · {stream.channel} · {stream.live ? `${compactNumber(stream.viewers)} viendo` : stream.mediaKind === 'video' ? 'grabación' : 'canal oficial'}</span></span>
                    {active ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[#d6b15e]"/> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-700 group-hover:text-slate-400"/>}
                  </button>;
                })}
              </div>
            </div>
          </div>

          <aside className="overflow-hidden rounded-2xl border border-white/[.08] bg-[#18181c] shadow-2xl shadow-black/20">
            {selectedEvent ? <>
              <div className="border-b border-white/[.07] p-5">
                <div className="flex items-center justify-between gap-3"><span className={`rounded-md px-2 py-1 text-[10px] font-black tracking-wider ${selectedStream?.live ? 'bg-red-500/15 text-red-300' : 'bg-[#d6b15e]/15 text-[#e6ca83]'}`}>{selectedStream?.live ? '● EN VIVO' : selectedStream?.mediaKind === 'video' ? '▶ GRABACIÓN' : 'CANAL OFICIAL'}</span><span className="rounded-md border border-white/[.08] px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500">{selectedEvent.category === 'esports' ? 'Esports' : 'Deportes'}</span></div>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[.16em] text-[#d6b15e]">{selectedEvent.sport}</p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-.02em] text-white">{selectedEvent.tournament}</h2>
                <p className="mt-1 text-xs text-slate-500">{selectedEvent.stage}</p>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
                  <div className="min-w-0 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-xs font-black">{selectedEvent.participantA.shortName}</span><p className="mt-3 truncate text-sm font-semibold">{selectedEvent.participantA.name}</p></div>
                  <div className="flex items-center gap-2 text-3xl font-semibold tabular-nums tracking-[-.06em] sm:gap-3 sm:text-4xl"><span>{selectedEvent.participantA.score}</span><span className="text-xl font-light text-slate-700">:</span><span>{selectedEvent.participantB.score}</span></div>
                  <div className="min-w-0 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[#d6b15e]/20 bg-[#d6b15e]/[.06] text-xs font-black text-[#e6ca83]">{selectedEvent.participantB.shortName}</span><p className="mt-3 truncate text-sm font-semibold">{selectedEvent.participantB.name}</p></div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/[.06] bg-black/20 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-600">{selectedEvent.clockLabel}</p><p className="mt-1 font-mono text-lg font-semibold tabular-nums">{selectedEvent.elapsedSeconds > 0 ? formatClock(selectedEvent.elapsedSeconds) : '—'}</p></div>
                  <div className="rounded-xl border border-white/[.06] bg-black/20 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-600">{selectedStream?.live ? 'Audiencia' : 'Vistas de referencia'}</p><p className="mt-1 text-lg font-semibold tabular-nums">{compactNumber(displayedViewers)}</p></div>
                </div>
                <p className="mt-3 text-center text-[11px] text-slate-500">{selectedEvent.context}</p>
                <div className="mt-5 border-t border-white/[.07] pt-4">
                  <div className="grid grid-cols-[1fr_1.15fr_1fr] pb-2 text-[9px] uppercase tracking-wider text-slate-600"><span>{selectedEvent.participantA.shortName}</span><span className="text-center">Estadísticas</span><span className="text-right">{selectedEvent.participantB.shortName}</span></div>
                  <div className="space-y-1">{selectedEvent.stats.map((stat) => <div key={stat.label} className="grid grid-cols-[1fr_1.15fr_1fr] rounded-lg px-2 py-2 text-xs hover:bg-white/[.03]"><b>{stat.a}</b><span className="text-center text-[10px] text-slate-500">{stat.label}</span><b className="text-right">{stat.b}</b></div>)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-white/[.07] bg-black/20 px-5 py-3 text-[10px] text-slate-500"><Sparkles className="h-3.5 w-3.5 text-[#d6b15e]"/> {selectedStream?.eventId === selectedEvent.id ? 'Transmisión vinculada al partido' : 'Señal multimedia y registro competitivo independientes'} · {selectedEvent.source || 'fuente oficial'}</div>
            </> : <div className="grid min-h-[430px] place-items-center text-sm text-slate-500">Cargando evento…</div>}
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.65fr)]">
          <div className="overflow-hidden rounded-2xl border border-white/[.08] bg-[#18181c]">
            <div className="flex flex-col gap-4 border-b border-white/[.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div><h2 className="flex items-center gap-2 text-base font-semibold"><CalendarClock className="h-4 w-4 text-[#d6b15e]"/> Eventos destacados</h2><p className="mt-1 text-xs text-slate-500">Partidos registrados en TournamentX y señales oficiales disponibles.</p></div>
              <div className="grid w-full grid-cols-3 rounded-xl border border-white/[.07] bg-black/20 p-1 sm:w-auto">{([['all', 'Todos'], ['esports', 'Esports'], ['sports', 'Deportes']] as const).map(([id, label]) => <button type="button" key={id} onClick={() => setEventFilter(id)} className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold sm:px-3 ${eventFilter === id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>{label}</button>)}</div>
            </div>
            <div className="grid gap-2 p-3 sm:grid-cols-2">{filteredEvents.map((event) => {
              const active = event.id === selectedEvent?.id;
              return <button type="button" key={event.id} onClick={() => setSelectedEventId(event.id)} className={`flex items-center gap-3 rounded-xl border p-4 text-left ${active ? 'border-[#d6b15e]/35 bg-[#d6b15e]/[.06]' : 'border-transparent hover:border-white/[.08] hover:bg-white/[.025]'}`}>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${event.category === 'esports' ? 'bg-[#9146ff]/10 text-[#b892ff]' : 'bg-[#d6b15e]/10 text-[#d6b15e]'}`}>{event.category === 'esports' ? <Gamepad2 className="h-4 w-4"/> : <Trophy className="h-4 w-4"/>}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{event.tournament}</span><span className="mt-1 block truncate text-[10px] text-slate-500">{event.participantA.shortName} {event.participantA.score} — {event.participantB.score} {event.participantB.shortName} · {event.clockLabel}</span></span>
                <ChevronRight className={`h-4 w-4 shrink-0 ${active ? 'text-[#d6b15e]' : 'text-slate-700'}`}/>
              </button>;
            })}</div>
          </div>

          <div className="rounded-2xl border border-white/[.08] bg-[#18181c] p-5">
            <div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-base font-semibold"><BarChart3 className="h-4 w-4 text-[#d6b15e]"/> Actividad</h2><p className="mt-1 text-xs text-slate-500">Resumen por videojuego</p></div><Globe2 className="h-5 w-5 text-slate-700"/></div>
            <div className="mt-5 space-y-3">{metrics.map((metric) => <div key={metric.game} className="rounded-xl border border-white/[.06] bg-black/20 p-4"><div className="flex items-center justify-between"><strong className="text-xs">{metric.game}</strong><span className="text-[10px] text-slate-500">{compactNumber(metric.viewers)} views</span></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[.06]"><span className="block h-full rounded-full bg-gradient-to-r from-[#9146ff] to-[#d6b15e]" style={{ width: `${Math.min(100, 18 + metric.activePlayers * 6)}%` }}/></div><div className="mt-3 flex gap-4 text-[10px] text-slate-500"><span>{metric.lobbies} salas</span><span>{metric.activePlayers} jugadores</span></div></div>)}</div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/[.08] bg-[#18181c]">
          <div className="flex items-center justify-between border-b border-white/[.07] p-5"><div><h2 className="flex items-center gap-2 text-base font-semibold"><Server className="h-4 w-4 text-[#d6b15e]"/> Lobbies y salas virtuales</h2><p className="mt-1 text-xs text-slate-500">Estado persistente administrado por la API de TournamentX.</p></div><span className="hidden text-[10px] uppercase tracking-wider text-slate-600 sm:block">Actualización cada 30 s</span></div>
          <div className="divide-y divide-white/[.06]">{lobbies.map((lobby) => <div key={lobby.id} className="grid gap-4 p-5 hover:bg-white/[.02] sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{lobby.name}</strong><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${lobby.status === 'In Game' ? 'bg-red-500/15 text-red-300' : lobby.status === 'Paused' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{lobby.status}</span></div><p className="mt-1 text-xs text-slate-500">{lobby.game} · {lobby.team1} vs {lobby.team2} · {lobby.map}</p></div><div className="text-xs text-slate-400"><Users className="mr-1 inline h-3.5 w-3.5"/>{lobby.players}/{lobby.maxPlayers}</div><div className="text-xs text-slate-400"><Signal className="mr-1 inline h-3.5 w-3.5 text-emerald-400"/>{lobby.ping} ms</div></div>)}</div>
        </section>
      </div>

      {showCreate && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm"><form onSubmit={create} className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#18181c] p-6 shadow-2xl"><div className="flex justify-between"><div><h2 className="text-xl font-semibold">Crear lobby</h2><p className="mt-1 text-xs text-slate-500">La sala quedará registrada en el servicio de TournamentX.</p></div><button type="button" onClick={() => setShowCreate(false)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10" aria-label="Cerrar"><X className="h-4 w-4"/></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2">{([['name','Nombre'],['game','Videojuego'],['server','Servidor'],['map','Mapa'],['team1','Equipo 1'],['team2','Equipo 2']] as const).map(([key,label]) => <label key={key} className="text-xs text-slate-400">{label}<input required value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="field mt-1 px-3"/></label>)}</div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button><button className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black hover:bg-[#d6b15e]">Guardar sala</button></div></form></div>}
    </div>
  );
};
