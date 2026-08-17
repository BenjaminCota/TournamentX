import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Gamepad2, MapPin, Radio, Search } from 'lucide-react';
import { CompetitiveEvent, Team, TournamentMatch } from '../../types';
import { tournamentXApi } from '../../services/apiClient';

interface CalendarViewProps {
  onOpenMatch: (matchId: string) => void;
}

function matchType(match: TournamentMatch) {
  const location = `${match.venue || ''} ${match.streamUrl || ''}`.toLowerCase();
  return location.includes('lobby') || location.includes('server') || Boolean(match.streamUrl) ? 'ESPORTS' : 'PRESENCIAL';
}

function statusLabel(status: TournamentMatch['status']) {
  return { scheduled: 'PROGRAMADO', live: 'EN VIVO', completed: 'FINALIZADO', postponed: 'POSPUESTO', cancelled: 'CANCELADO' }[status];
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onOpenMatch }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'TODOS' | 'ESPORTS' | 'PRESENCIAL'>('TODOS');
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [feedEvents, setFeedEvents] = useState<CompetitiveEvent[]>([]);
  const [integration, setIntegration] = useState({ esports: 'demo', football: 'demo' });
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadMatches = async () => {
      try {
        setIsLoading(true);
        setError('');
        const [nextMatches, nextTeams, competitive] = await Promise.all([tournamentXApi.matches(), tournamentXApi.teams(), tournamentXApi.competitiveOverview()]);
        if (!active) return;
        setMatches(Array.isArray(nextMatches) ? nextMatches as TournamentMatch[] : []);
        setTeams(Array.isArray(nextTeams) ? nextTeams as Team[] : []);
        setFeedEvents(competitive.events);
        setIntegration(competitive.integration);
      } catch {
        if (active) setError('No fue posible cargar los partidos. Verifica que la API esté disponible.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadMatches();
    return () => { active = false; };
  }, []);

  const teamName = (teamId: string) => teams.find((team) => team.id === teamId)?.name || teamId;
  const visible = useMemo(() => matches.filter((match) => {
    const searchText = `${match.tournamentId} ${teamName(match.team1Id)} ${teamName(match.team2Id)} ${match.venue || ''}`.toLowerCase();
    return searchText.includes(query.toLowerCase()) && (filter === 'TODOS' || matchType(match) === filter);
  }), [filter, matches, query, teams]);
  const visibleFeed = useMemo(() => feedEvents.filter((event) => {
    const searchText = `${event.competition} ${event.teamA.name} ${event.teamB.name} ${event.region} ${event.sport}`.toLowerCase();
    const type = event.category === 'esports' ? 'ESPORTS' : 'PRESENCIAL';
    return searchText.includes(query.toLowerCase()) && (filter === 'TODOS' || type === filter);
  }), [feedEvents, filter, query]);

  return (
    <div id="calendar-view" className="p-6 lg:p-8 max-w-7xl mx-auto space-y-7">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-brand font-black text-4xl text-white uppercase italic flex items-center gap-3"><CalendarDays className="w-8 h-8 text-[#ff2e83]" /> Calendario de partidos</h1>
          <p className="text-sm text-slate-400 mt-2">Agenda unificada de encuentros locales y feeds regionales de esports y deportes.</p>
          <div className="mt-3 flex flex-wrap gap-2"><span className="status-chip text-slate-400">Esports: {integration.esports === 'configured' ? 'PandaScore' : 'demo regional'}</span><span className="status-chip text-slate-400">Fútbol: {integration.football === 'configured' ? 'football-data.org' : 'demo regional'}</span></div>
        </div>
        <div className="relative w-full lg:w-80"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar torneo, equipo o sede" className="w-full bg-[#141724] border border-[#252a3d] rounded-xl py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#ff2e83]" /></div>
      </div>

      <div className="flex gap-2">{(['TODOS', 'ESPORTS', 'PRESENCIAL'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`px-4 py-2 rounded-xl text-xs font-bold ${filter === item ? 'bg-[#ff2e83] text-white' : 'bg-[#141724] text-slate-400 border border-[#252a3d]'}`}>{item}</button>)}</div>

      {isLoading && <p className="rounded-xl border border-[#252a3d] bg-[#11131c] p-5 text-sm text-slate-400">Cargando calendario…</p>}
      {error && <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-300">{error}</p>}
      {!isLoading && !error && visible.length === 0 && visibleFeed.length === 0 && <p className="rounded-xl border border-[#252a3d] bg-[#11131c] p-5 text-sm text-slate-400">No hay partidos que coincidan con los filtros.</p>}

      <div className="grid gap-3">
        {visibleFeed.map((event) => {
          const date = new Date(event.startsAt);
          const isLive = event.status === 'live';
          return <article key={event.id} className="grid grid-cols-[88px_1fr] lg:grid-cols-[88px_120px_1fr_220px_120px] items-center gap-4 bg-[#11131c] border border-[#222638] rounded-2xl p-4 hover:border-[#d6b15e]/50 transition-colors">
            <div className="text-center border-r border-[#292e42] pr-4"><div className="text-xs text-[#d6b15e] font-bold">{date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).toUpperCase()}</div><div className="text-xl font-black text-white">{date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}</div></div>
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">{event.category === 'esports' ? <Gamepad2 className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}{event.sport}</div>
            <div><div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>{event.competition} · {event.region}</span><span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${event.dataMode === 'api' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{event.dataMode === 'api' ? 'API' : 'DEMO'}</span></div><div className="font-bold text-white mt-1">{event.teamA.name} <span className="text-slate-500">{event.teamA.score} — {event.teamB.score}</span> {event.teamB.name}</div></div>
            <div className="hidden lg:flex items-center gap-2 text-sm text-slate-300"><MapPin className="w-4 h-4 text-slate-500" />{event.venue || event.round}</div>
            <span className={`rounded-xl px-3 py-2 text-center text-xs font-bold ${isLive ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-[#1a1d2a] text-slate-300'}`}>{isLive ? '● EN VIVO' : statusLabel(event.status)}</span>
          </article>;
        })}
        {visible.map((match) => {
          const date = new Date(match.scheduledAt);
          const type = matchType(match);
          const isLive = match.status === 'live';
          return <article key={match.id} className="grid grid-cols-[88px_1fr] lg:grid-cols-[88px_120px_1fr_220px_120px] items-center gap-4 bg-[#11131c] border border-[#222638] rounded-2xl p-4 hover:border-[#ff2e83]/50 transition-colors">
            <div className="text-center border-r border-[#292e42] pr-4"><div className="text-xs text-[#ff2e83] font-bold">{date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).toUpperCase()}</div><div className="text-xl font-black text-white">{date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}</div></div>
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">{type === 'ESPORTS' ? <Gamepad2 className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}{type === 'ESPORTS' ? 'Esports' : 'Presencial'}</div>
            <div><div className="text-xs text-slate-500">{match.tournamentId}</div><div className="font-bold text-white mt-1">{teamName(match.team1Id)} <span className="text-slate-500">{match.score.team1} — {match.score.team2}</span> {teamName(match.team2Id)}</div></div>
            <div className="hidden lg:flex items-center gap-2 text-sm text-slate-300"><MapPin className="w-4 h-4 text-slate-500" />{match.venue || 'Sede por definir'}</div>
            <button onClick={() => onOpenMatch(match.id)} className={`rounded-xl px-3 py-2 text-xs font-bold ${isLive ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-[#1a1d2a] text-slate-300'}`}>{isLive ? <span className="flex items-center justify-center gap-1"><Radio className="w-3 h-3" /> VER</span> : <span className="flex items-center justify-center gap-1"><Clock3 className="w-3 h-3" /> {statusLabel(match.status)}</span>}</button>
          </article>;
        })}
      </div>
    </div>
  );
};
