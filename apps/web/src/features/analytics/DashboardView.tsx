import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  Flame, 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  Radio, 
  Activity,
  Calendar,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { TabId } from '../shell/Sidebar';
import { Team, Tournament, TournamentMatch } from '../../types';
import { tournamentXApi } from '../../services/apiClient';

interface DashboardViewProps {
  onNavigate: (tab: TabId, targetId?: string) => void;
  onOpenMatch: (matchId: string) => void;
  onOpenCreateWizard: () => void;
  teams: Team[];
  tournaments: Tournament[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate, onOpenMatch,
  onOpenCreateWizard, teams, tournaments
}) => {
  const [rankingFilter, setRankingFilter] = useState<'REGIONAL' | 'GLOBAL'>('REGIONAL');

  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [matchesError, setMatchesError] = useState('');
  const [matchesLoading, setMatchesLoading] = useState(false);
  const loadMatches = useCallback(async () => {
    try {
      setMatchesLoading(true);
      setMatchesError('');
      const result = await tournamentXApi.matches();
      setMatches(Array.isArray(result) ? result : []);
    } catch (error) {
      setMatchesError(error instanceof Error ? error.message : 'No fue posible consultar la agenda.');
    } finally {
      setMatchesLoading(false);
    }
  }, []);
  useEffect(() => { void loadMatches(); }, [loadMatches]);
  const topTeams = useMemo(() => teams
    .filter((team) => rankingFilter === 'GLOBAL' || /latam|méxico|mexico|brasil|chile|colombia|argentina|perú|peru/i.test(team.region))
    .sort((a, b) => b.points - a.points)
    .slice(0, 5), [rankingFilter, teams]);
  const activeTournaments = tournaments.filter((item) => ['OPEN', 'IN_PROGRESS', 'UPCOMING'].includes(item.status));
  const featuredMatch = matches.find((match) => match.status === 'live')
    || matches.find((match) => ['scheduled', 'postponed'].includes(match.status))
    || matches[0];
  const featuredIsLive = featuredMatch?.status === 'live';
  const featuredStatus = !featuredMatch ? 'SIN PARTIDOS' : featuredIsLive ? 'EN VIVO' : featuredMatch.status === 'completed' ? 'FINALIZADO' : featuredMatch.status === 'postponed' ? 'POSPUESTO' : 'PRÓXIMO PARTIDO';
  const featuredTime = !featuredMatch ? 'Crea o programa un encuentro' : featuredIsLive ? 'Marcador activo' : new Date(featuredMatch.scheduledAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  const completedMatches = matches.filter((match) => match.status === 'completed').length;
  const completionRate = matches.length ? Math.round(completedMatches / matches.length * 100) : 0;
  const teamName = (id?: string) => teams.find((team) => team.id === id)?.name || id || 'Por definir';
  const teamTag = (id?: string) => teams.find((team) => team.id === id)?.tag || teamName(id).slice(0, 3).toUpperCase();

  const upcomingMatches = matches.filter((match) => ['scheduled', 'postponed'].includes(match.status)).slice(0, 4).map((match) => ({ id: match.id, group: `${match.roundId || 'Ronda'} • ${match.mode.replaceAll('_', ' ').toUpperCase()}`, team1: teamName(match.team1Id), team2: teamName(match.team2Id), time: new Date(match.scheduledAt).toLocaleString(), game: tournaments.find((item) => item.id === match.tournamentId)?.game || 'Competencia' }));

  return (
    <div id="dashboard-view-main" className="relative p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="mb-2 h-1 w-24 rounded-full bg-gradient-to-r from-[#ff2e83] via-[#8b5cf6] to-[#22d3ee] shadow-[0_0_18px_rgba(139,92,246,.35)]" />
          <h1 className="font-brand font-black text-4xl text-white uppercase tracking-[.025em] italic">
            CENTRO DE MANDO PRO
          </h1>
          <p className="text-xs text-slate-400 font-tech">
            Monitoreo en tiempo real de torneos, enfrentamientos y clasificaciones
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('tournaments')}
            className="px-4 py-2 rounded-xl bg-[#141724] border border-[#1e2230] text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-all cursor-pointer font-tech"
          >
            Ver Cuadros & Brackets
          </button>
          <button
            onClick={onOpenCreateWizard}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff2e83] to-[#e11d48] text-white text-xs font-bold tracking-wide shadow-md shadow-[#ff2e83]/20 hover:scale-105 transition-all cursor-pointer font-tech"
          >
            ＋ CREAR TORNEO
          </button>
        </div>
      </div>

      {matchesError && <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[.07] p-4 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0"/> La agenda no pudo actualizarse: {matchesError}</span><button type="button" onClick={() => void loadMatches()} disabled={matchesLoading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/25 px-3 py-2 text-xs font-bold disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${matchesLoading ? 'animate-spin' : ''}`}/> Reintentar</button></div>}

      <section aria-label="Indicadores operativos" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Torneos activos', value: tournaments.filter((item) => ['OPEN', 'IN_PROGRESS', 'UPCOMING'].includes(item.status)).length, detail: `${tournaments.length} en total`, icon: Trophy, tone: 'pink' },
          { label: 'Partidos en vivo', value: matches.filter((match) => match.status === 'live').length, detail: `${matches.length} registrados`, icon: Radio, tone: 'red' },
          { label: 'Avance de jornada', value: `${completionRate}%`, detail: `${completedMatches} finalizados`, icon: Activity, tone: 'cyan' },
        ].map(({ label, value, detail, icon: Icon, tone }) => <article key={label} data-tone={tone} className="tx-dashboard-metric surface rounded-2xl p-4 flex items-center gap-4">
          <span className="tx-metric-icon grid h-11 w-11 place-items-center rounded-xl"><Icon className="w-5 h-5" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><strong className="block mt-0.5 text-2xl text-white">{value}</strong><small className="text-[11px] text-slate-500">{detail}</small></div>
        </article>)}
      </section>

      {/* HERO MATCH STATUS CARD (Image 5) */}
      <div 
        id="hero-live-match-card"
        className="relative rounded-2xl overflow-hidden bg-[radial-gradient(circle_at_15%_0,rgba(79,124,255,.17),transparent_32%),radial-gradient(circle_at_90%_100%,rgba(255,46,131,.18),transparent_35%),linear-gradient(110deg,#151827,#11131e_48%,#201426)] border border-[#ff2e83]/40 p-6 sm:p-8 shadow-[0_28px_80px_rgba(0,0,0,.35)]"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff2e83]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-mono-code font-bold text-xs flex items-center gap-1.5 animate-pulse">
                <Radio className="w-3.5 h-3.5" />
                {featuredStatus}
              </span>
              <span className="text-xs text-slate-400 font-mono-code">
                {featuredIsLive ? 'ESTADO' : 'FECHA'}: <strong className="text-white">{featuredTime}</strong>
              </span>
            </div>

            {/* Matchup Header */}
            <div className="flex items-center gap-6 sm:gap-10">
              {/* Team 1 */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#202438] border border-[#2e344e] flex items-center justify-center font-brand font-black text-3xl text-white shadow-inner">
                  {teamTag(featuredMatch?.team1Id)}
                </div>
                <div>
                  <div className="text-[11px] font-tech text-[#ff2e83] font-bold">#1 SEED</div>
                  <h3 className="font-brand font-black text-2xl xl:text-3xl text-white uppercase tracking-tight max-w-56 leading-none">
                    {teamName(featuredMatch?.team1Id)}
                  </h3>
                </div>
              </div>

              {/* Score Display */}
              <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#0b0c12] border border-[#23273b] shadow-inner">
                <span className="font-brand font-black text-4xl sm:text-5xl text-white">{featuredMatch?.score.team1 ?? 0}</span>
                <span className="text-slate-600 font-bold text-2xl">:</span>
                <span className="font-brand font-black text-4xl sm:text-5xl text-[#ff2e83]">{featuredMatch?.score.team2 ?? 0}</span>
              </div>

              {/* Team 2 */}
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-[11px] font-tech text-slate-400 font-bold text-right">#4 SEED</div>
                  <h3 className="font-brand font-black text-2xl xl:text-3xl text-white uppercase tracking-tight max-w-56 text-right leading-none">
                    {teamName(featuredMatch?.team2Id)}
                  </h3>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-[#202438] border border-[#2e344e] flex items-center justify-center font-brand font-black text-3xl text-white shadow-inner">
                  {teamTag(featuredMatch?.team2Id)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
            <button
              id="btn-dashboard-watch-stream"
              onClick={() => featuredMatch && onOpenMatch(featuredMatch.id)}
              disabled={!featuredMatch}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#ff2e83] to-[#e11d48] text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-[#ff2e83]/30 hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer font-tech"
            >
              <Flame className="w-4 h-4" />
              <span>{featuredIsLive ? 'VER TRANSMISIÓN' : 'ABRIR PARTIDOS'}</span>
            </button>
            <button
              onClick={() => onNavigate('tournaments')}
              className="px-6 py-3.5 rounded-xl bg-[#181b28] hover:bg-[#202435] text-slate-300 hover:text-white border border-[#282d42] font-semibold text-xs tracking-wide transition-all text-center cursor-pointer font-tech"
            >
              Estadísticas del Bracket
            </button>
          </div>
        </div>
      </div>

      {/* 2-COLUMN MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Torneos Activos & Próximos Partidos */}
        <div className="lg:col-span-2 space-y-8">
          {/* SECTION: TORNEOS ACTIVOS (Image 5) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                <Trophy className="w-5 h-5 text-[#ff2e83]" />
                TORNEOS ACTIVOS
              </h2>
              <button
                onClick={() => onNavigate('tournaments')}
                className="text-xs font-bold text-[#ff2e83] hover:underline flex items-center gap-1 cursor-pointer"
              >
                VER TODOS →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeTournaments.slice(0, 2).map((tournament, index) => <div key={tournament.id} data-accent={index % 2 ? 'blue' : 'violet'} onClick={() => onNavigate('tournaments')} className="tx-dashboard-card p-5 rounded-2xl bg-[#10121a] border border-[#1e2230] hover:border-[#ff2e83]/60 transition-all cursor-pointer group flex flex-col justify-between"><div className="space-y-2"><div className="flex items-center justify-between"><span className="px-2 py-0.5 rounded bg-[#ff2e83]/15 text-[#ff69a8] font-bold text-[10px]">{tournament.tier}</span><span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">{tournament.status}</span></div><h3 className="text-lg font-semibold leading-snug text-white group-hover:text-[#ff2e83]">{tournament.name}</h3><p className="text-xs leading-relaxed text-slate-400">{tournament.registeredTeams}/{tournament.maxTeams} inscritos · {tournament.format.replaceAll('_', ' ')}</p></div><div className="mt-4 pt-3 border-t border-[#1e2230] flex items-center justify-between text-xs"><span className="text-slate-400">Premio:</span><span className="font-bold text-emerald-400">{tournament.prizePool || `$${tournament.prizeAmountUSD.toLocaleString()} USD`}</span></div></div>)}
              {activeTournaments.length === 0 && <div className="sm:col-span-2 p-8 rounded-2xl border border-dashed border-white/10 text-center text-sm text-slate-500">No hay torneos activos. Crea uno nuevo o consulta el historial completo.</div>}
            </div>
          </div>

          {/* SECTION: PRÓXIMOS PARTIDOS (Image 5) */}
          <div className="space-y-4">
            <h2 className="font-display font-bold text-xl uppercase tracking-wider text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              PRÓXIMOS PARTIDOS
            </h2>

            <div className="space-y-3">
              {upcomingMatches.map((m) => (
                <div
                  key={m.id}
                  data-accent="blue" className="tx-dashboard-card p-4 rounded-xl bg-[#10121a] border border-[#1e2230] hover:border-[#4f7cff]/55 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-[#161926] text-[11px] font-mono-code text-slate-300 font-bold">
                      {m.group}
                    </span>
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <span>{m.team1}</span>
                      <span className="text-slate-500 font-mono-code text-xs">vs</span>
                      <span>{m.team2}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="text-xs font-mono-code text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {m.time}
                    </span>
                    <button 
                      onClick={() => onOpenMatch(m.id)}
                      className="px-3 py-1 rounded-lg bg-[#181b28] hover:bg-[#ff2e83] text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Ver detalle
                    </button>
                  </div>
                </div>
              ))}
              {upcomingMatches.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No hay próximos partidos programados.</div>}
            </div>
          </div>
        </div>

        {/* Right Column: Leaderboard & Métricas */}
        <div className="space-y-8">
          {/* SECTION: TOP 5 EQUIPOS (Image 5) */}
          <div data-accent="gold" className="tx-dashboard-card p-6 rounded-2xl bg-[#10121a] border border-[#1e2230] space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg uppercase tracking-wider text-white">
                TOP 5 EQUIPOS
              </h2>
              {/* Regional vs Global Toggle (Image 5) */}
              <div className="flex items-center p-0.5 rounded-lg bg-[#181b28] border border-[#232738] text-[10px] font-bold">
                <button
                  onClick={() => setRankingFilter('GLOBAL')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    rankingFilter === 'GLOBAL'
                      ? 'bg-[#ff2e83] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  GLOBAL
                </button>
                <button
                  onClick={() => setRankingFilter('REGIONAL')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    rankingFilter === 'REGIONAL'
                      ? 'bg-[#ff2e83] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  REGIONAL (LATAM)
                </button>
              </div>
            </div>

            {/* Top 5 Table List (Image 5) */}
            <div className="space-y-2.5">
              {topTeams.map((team, idx) => {
                const rankNumber = idx + 1;
                return (
                  <div
                    key={team.id}
                    onClick={() => onNavigate('team_detail', team.id)}
                    className="p-3 rounded-xl bg-[#141724] hover:bg-[#1c2033] border border-[#1e2230] hover:border-[#ff2e83]/40 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 text-center font-display font-black text-base ${
                        rankNumber === 1 ? 'text-amber-400' : rankNumber === 2 ? 'text-slate-300' : rankNumber === 3 ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {rankNumber}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white hover:text-[#ff2e83] transition-colors">
                          {team.name}
                        </h4>
                        <div className="text-[10px] font-mono-code text-slate-400">
                          {team.record.wins}-{team.record.losses} • {team.points} pts
                        </div>
                      </div>
                    </div>

                    <div>
                      {team.trend === 'UP' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                      {team.trend === 'DOWN' && <TrendingDown className="w-4 h-4 text-red-400" />}
                      {team.trend === 'EQUAL' && <Minus className="w-4 h-4 text-slate-500" />}
                    </div>
                  </div>
                );
              })}
              {topTeams.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">No hay equipos para este alcance.</p>}
            </div>

            <button
              onClick={() => onNavigate('teams')}
              className="w-full py-2 rounded-xl bg-[#181b28] hover:bg-[#202435] text-slate-300 text-xs font-semibold tracking-wide transition-colors text-center block cursor-pointer"
            >
              Ver Clasificación Completa →
            </button>
          </div>

          {/* SECTION: MÉTRICAS (Image 5) */}
          <div data-accent="teal" className="tx-dashboard-card p-6 rounded-2xl bg-[#10121a] border border-[#1e2230] space-y-6">
            <h2 className="font-display font-bold text-lg uppercase tracking-wider text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#ff2e83]" />
              MÉTRICAS GENERALES
            </h2>

            {/* Metric 1: Inscripciones Activas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Inscripciones Activas</span>
                <span className="text-xs text-emerald-400 font-bold">Datos actuales</span>
              </div>
              <div className="font-display font-black text-3xl text-white">
                {tournaments.reduce((sum, item) => sum + item.registeredTeams, 0)}
              </div>

              {/* Sparkline Weekly Bars */}
              <div className="flex items-end gap-1.5 h-12 pt-2">
                {[35, 45, 60, 50, 75, 90, 100].map((val, i) => (
                  <div
                    key={i}
                    style={{ height: `${val}%` }}
                    className={`flex-1 rounded-t transition-all ${
                      i === 6 ? 'bg-[#ff2e83]' : 'bg-[#232738] hover:bg-[#343a52]'
                    }`}
                  ></div>
                ))}
              </div>
              <div className="flex justify-between text-[9px] font-mono-code text-slate-500">
                <span>LUN</span>
                <span>MIE</span>
                <span>VIE</span>
                <span>DOM</span>
              </div>
            </div>

            {/* Metric 2: Partidos Jugados */}
            <div className="pt-4 border-t border-[#1e2230] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Partidos Jugados</span>
                <span className="text-xs text-slate-400 font-mono-code">Temp. Actual</span>
              </div>
              <div className="font-display font-black text-3xl text-white">
                {completedMatches}
              </div>
              <div className="w-full bg-[#1e2230] rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-[#ff2e83] h-full rounded-full" style={{ width: `${completionRate}%` }}></div>
              </div>
              <div className="text-[10px] text-slate-500 font-mono-code text-right">
                {completionRate}% del calendario completado
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
